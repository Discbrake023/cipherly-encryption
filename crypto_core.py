"""
crypto_core.py
================
Modul inti kriptografi untuk Tugas Proyek Aplikasi Kriptografi - Topik A
(Enkripsi Algoritma Modern).

Semua primitif kriptografi (AES-256-GCM, ChaCha20-Poly1305, RSA-OAEP,
PBKDF2, scrypt) menggunakan pustaka `cryptography` yang sudah teruji.
Argon2id menggunakan pustaka `argon2-cffi`.

Format "envelope" (amplop) hasil enkripsi dirancang sendiri (bukan bagian
dari pustaka) agar seluruh parameter keamanan (algoritma, KDF, salt, nonce)
ikut tersimpan dan dapat diverifikasi ulang saat dekripsi.

Struktur envelope (biner):
    magic       4 byte   b"KRP1"
    algo_id     1 byte   0 = AES-256-GCM, 1 = ChaCha20-Poly1305
    kdf_id      1 byte   0 = PBKDF2-HMAC-SHA256, 1 = scrypt, 2 = Argon2id
    kdf_param   4 byte   parameter KDF utama (iterasi PBKDF2 / N scrypt / t Argon2), big-endian
    salt_len    1 byte
    salt        n byte
    nonce_len   1 byte
    nonce       n byte
    ciphertext  sisanya  (termasuk authentication tag 16 byte di bagian akhir, sesuai AEAD)

Envelope ini kemudian bisa direpresentasikan sebagai base64 atau hex untuk
ditampilkan/disalin sebagai teks, atau ditulis langsung sebagai berkas biner
dengan ekstensi .krp.
"""

from __future__ import annotations

import os
import struct
import base64
import binascii
import time
from dataclasses import dataclass
from typing import Literal, Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding as asym_padding
from cryptography.exceptions import InvalidTag

try:
    from argon2.low_level import hash_secret_raw, Type as Argon2Type
    ARGON2_AVAILABLE = True
except ImportError:  # pragma: no cover
    ARGON2_AVAILABLE = False


MAGIC = b"KRP1"

ALGORITHMS = {"aes-gcm": 0, "chacha20": 1}
ALGORITHMS_REV = {v: k for k, v in ALGORITHMS.items()}

KDFS = {"pbkdf2": 0, "scrypt": 1, "argon2": 2}
KDFS_REV = {v: k for k, v in KDFS.items()}

KEY_LEN = 32          # 256-bit key untuk AES-256-GCM & ChaCha20-Poly1305
NONCE_LEN = 12         # 96-bit nonce, standar untuk kedua AEAD di atas
DEFAULT_SALT_LEN = 16

# Parameter KDF default (aman untuk tugas kuliah, silakan naikkan bila perangkat kuat)
PBKDF2_ITERATIONS_DEFAULT = 600_000     # rekomendasi OWASP 2023 untuk HMAC-SHA256
SCRYPT_N_DEFAULT = 2 ** 15              # 32768, cost parameter (harus pangkat 2)
SCRYPT_R_DEFAULT = 8
SCRYPT_P_DEFAULT = 1
ARGON2_TIME_DEFAULT = 3                 # iterasi
ARGON2_MEMORY_KIB_DEFAULT = 65536       # 64 MiB
ARGON2_PARALLELISM_DEFAULT = 4


class DecryptionError(Exception):
    """Dilempar saat dekripsi gagal: kata sandi salah atau data telah diubah."""
    pass


# ---------------------------------------------------------------------------
# Key derivation
# ---------------------------------------------------------------------------

def derive_key(password: str, salt: bytes, kdf: str, param: int) -> bytes:
    """Menurunkan kunci 256-bit dari kata sandi memakai KDF yang dipilih.

    `param` menyimpan parameter biaya utama tiap KDF sehingga proses dekripsi
    dapat mereproduksi kunci yang identik:
        - pbkdf2 -> jumlah iterasi
        - scrypt -> log2(N)  (disimpan sebagai eksponen agar muat 1 byte bila perlu)
        - argon2 -> jumlah iterasi (time_cost); memori & paralelisme memakai default tetap
    """
    pwd_bytes = password.encode("utf-8")

    if kdf == "pbkdf2":
        kdf_obj = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=KEY_LEN,
            salt=salt,
            iterations=param,
        )
        return kdf_obj.derive(pwd_bytes)

    if kdf == "scrypt":
        n = 2 ** param  # param disimpan sebagai log2(N)
        kdf_obj = Scrypt(salt=salt, length=KEY_LEN, n=n, r=SCRYPT_R_DEFAULT, p=SCRYPT_P_DEFAULT)
        return kdf_obj.derive(pwd_bytes)

    if kdf == "argon2":
        if not ARGON2_AVAILABLE:
            raise RuntimeError(
                "Paket argon2-cffi belum terpasang. Jalankan: pip install argon2-cffi"
            )
        return hash_secret_raw(
            secret=pwd_bytes,
            salt=salt,
            time_cost=param,
            memory_cost=ARGON2_MEMORY_KIB_DEFAULT,
            parallelism=ARGON2_PARALLELISM_DEFAULT,
            hash_len=KEY_LEN,
            type=Argon2Type.ID,
        )

    raise ValueError(f"KDF tidak dikenal: {kdf}")


def _default_kdf_param(kdf: str) -> int:
    return {
        "pbkdf2": PBKDF2_ITERATIONS_DEFAULT,
        "scrypt": 15,  # log2(32768)
        "argon2": ARGON2_TIME_DEFAULT,
    }[kdf]


# ---------------------------------------------------------------------------
# AEAD encrypt / decrypt primitives
# ---------------------------------------------------------------------------

def _aead_cipher(algorithm: str, key: bytes):
    if algorithm == "aes-gcm":
        return AESGCM(key)
    if algorithm == "chacha20":
        return ChaCha20Poly1305(key)
    raise ValueError(f"Algoritma tidak dikenal: {algorithm}")


def encrypt_bytes(
    plaintext: bytes,
    password: str,
    algorithm: Literal["aes-gcm", "chacha20"] = "aes-gcm",
    kdf: Literal["pbkdf2", "scrypt", "argon2"] = "pbkdf2",
    kdf_param: int | None = None,
    aad: bytes | None = None,
) -> bytes:
    """Mengenkripsi bytes dan mengembalikan envelope biner lengkap (KRP1)."""
    if kdf_param is None:
        kdf_param = _default_kdf_param(kdf)

    salt = os.urandom(DEFAULT_SALT_LEN)
    nonce = os.urandom(NONCE_LEN)
    key = derive_key(password, salt, kdf, kdf_param)

    cipher = _aead_cipher(algorithm, key)
    ciphertext = cipher.encrypt(nonce, plaintext, aad)  # tag ikut menempel di akhir

    header = (
        MAGIC
        + bytes([ALGORITHMS[algorithm]])
        + bytes([KDFS[kdf]])
        + struct.pack(">I", kdf_param)
        + bytes([len(salt)]) + salt
        + bytes([len(nonce)]) + nonce
    )
    return header + ciphertext


def decrypt_bytes(envelope: bytes, password: str, aad: bytes | None = None) -> bytes:
    """Mendekripsi envelope KRP1. Melempar DecryptionError bila kata sandi
    salah ATAU ciphertext telah diubah (verifikasi tag AEAD gagal)."""
    try:
        if envelope[:4] != MAGIC:
            raise DecryptionError("Format berkas tidak dikenali (bukan envelope KRP1).")

        algo_id = envelope[4]
        kdf_id = envelope[5]
        kdf_param = struct.unpack(">I", envelope[6:10])[0]
        offset = 10

        salt_len = envelope[offset]; offset += 1
        salt = envelope[offset:offset + salt_len]; offset += salt_len

        nonce_len = envelope[offset]; offset += 1
        nonce = envelope[offset:offset + nonce_len]; offset += nonce_len

        ciphertext = envelope[offset:]

        algorithm = ALGORITHMS_REV[algo_id]
        kdf = KDFS_REV[kdf_id]

        key = derive_key(password, salt, kdf, kdf_param)
        cipher = _aead_cipher(algorithm, key)
        plaintext = cipher.decrypt(nonce, ciphertext, aad)
        return plaintext

    except InvalidTag:
        raise DecryptionError(
            "Dekripsi ditolak: kata sandi salah atau ciphertext telah diubah "
            "(verifikasi authentication tag gagal)."
        )
    except (IndexError, struct.error):
        raise DecryptionError("Envelope rusak atau tidak lengkap.")


def parse_envelope_meta(envelope: bytes) -> dict:
    """Mengembalikan metadata envelope tanpa mendekripsi (untuk ditampilkan di UI)."""
    if envelope[:4] != MAGIC:
        raise DecryptionError("Format berkas tidak dikenali (bukan envelope KRP1).")
    algo_id = envelope[4]
    kdf_id = envelope[5]
    kdf_param = struct.unpack(">I", envelope[6:10])[0]
    offset = 10
    salt_len = envelope[offset]; offset += 1
    salt = envelope[offset:offset + salt_len]; offset += salt_len
    nonce_len = envelope[offset]; offset += 1
    nonce = envelope[offset:offset + nonce_len]; offset += nonce_len
    return {
        "algorithm": ALGORITHMS_REV[algo_id],
        "kdf": KDFS_REV[kdf_id],
        "kdf_param": kdf_param,
        "salt_hex": salt.hex(),
        "nonce_hex": nonce.hex(),
        "ciphertext_len": len(envelope) - offset,
    }


# ---------------------------------------------------------------------------
# Encoding helpers (Base64 / Hex) - untuk mode teks
# ---------------------------------------------------------------------------

def to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def from_base64(s: str) -> bytes:
    return base64.b64decode(s)


def to_hex(data: bytes) -> str:
    return binascii.hexlify(data).decode("ascii")


def from_hex(s: str) -> bytes:
    return binascii.unhexlify(s)


# ---------------------------------------------------------------------------
# Fitur pengayaan: Enkripsi Hibrida (RSA-OAEP membungkus kunci sesi AES)
# ---------------------------------------------------------------------------

def generate_rsa_keypair(key_size: int = 2048) -> Tuple[bytes, bytes]:
    """Menghasilkan pasangan kunci RSA. Mengembalikan (private_pem, public_pem)."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


def _oaep_padding():
    return asym_padding.OAEP(
        mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None,
    )


def hybrid_encrypt(plaintext: bytes, public_pem: bytes, algorithm: str = "aes-gcm") -> bytes:
    """Enkripsi hibrida: kunci sesi acak dibungkus RSA-OAEP, data dienkripsi AEAD.

    Format keluaran:
        magic 4B b"KRPH"
        algo_id 1B
        rsa_wrapped_key_len 2B (big-endian)
        rsa_wrapped_key
        nonce_len 1B
        nonce
        ciphertext (termasuk tag)
    """
    public_key = serialization.load_pem_public_key(public_pem)
    session_key = os.urandom(KEY_LEN)
    nonce = os.urandom(NONCE_LEN)

    cipher = _aead_cipher(algorithm, session_key)
    ciphertext = cipher.encrypt(nonce, plaintext, None)

    wrapped_key = public_key.encrypt(session_key, _oaep_padding())

    header = (
        b"KRPH"
        + bytes([ALGORITHMS[algorithm]])
        + struct.pack(">H", len(wrapped_key))
        + wrapped_key
        + bytes([len(nonce)])
        + nonce
    )
    return header + ciphertext


def hybrid_decrypt(envelope: bytes, private_pem: bytes) -> bytes:
    try:
        if envelope[:4] != b"KRPH":
            raise DecryptionError("Format envelope hibrida tidak dikenali.")
        algo_id = envelope[4]
        offset = 5
        wrapped_len = struct.unpack(">H", envelope[offset:offset + 2])[0]; offset += 2
        wrapped_key = envelope[offset:offset + wrapped_len]; offset += wrapped_len
        nonce_len = envelope[offset]; offset += 1
        nonce = envelope[offset:offset + nonce_len]; offset += nonce_len
        ciphertext = envelope[offset:]

        private_key = serialization.load_pem_private_key(private_pem, password=None)
        session_key = private_key.decrypt(wrapped_key, _oaep_padding())

        algorithm = ALGORITHMS_REV[algo_id]
        cipher = _aead_cipher(algorithm, session_key)
        return cipher.decrypt(nonce, ciphertext, None)
    except InvalidTag:
        raise DecryptionError("Dekripsi hibrida gagal: data telah diubah.")
    except ValueError as e:
        raise DecryptionError(f"Dekripsi hibrida gagal: {e}")


# ---------------------------------------------------------------------------
# Utility: timing helper dipakai baik oleh app maupun skrip pengujian
# ---------------------------------------------------------------------------

@dataclass
class TimedResult:
    result: bytes
    elapsed_seconds: float


def timed_encrypt(plaintext: bytes, password: str, algorithm: str, kdf: str,
                   kdf_param: int | None = None) -> TimedResult:
    start = time.perf_counter()
    out = encrypt_bytes(plaintext, password, algorithm, kdf, kdf_param)
    return TimedResult(out, time.perf_counter() - start)


def timed_decrypt(envelope: bytes, password: str) -> TimedResult:
    start = time.perf_counter()
    out = decrypt_bytes(envelope, password)
    return TimedResult(out, time.perf_counter() - start)
