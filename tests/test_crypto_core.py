"""
tests/test_crypto_core.py
==========================
Unit test untuk fungsi inti (crypto_core.py). Jalankan dengan:
    pytest -v
Memenuhi ketentuan "minimal lima unit test untuk fungsi inti".
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import crypto_core as ck


PASSWORD = "kata-sandi-uji-123!"


@pytest.mark.parametrize("algorithm", ["aes-gcm", "chacha20"])
@pytest.mark.parametrize("kdf", ["pbkdf2", "scrypt", "argon2"])
def test_roundtrip_encrypt_decrypt(algorithm, kdf):
    """Test 1: enkripsi lalu dekripsi harus mengembalikan plaintext identik,
    untuk setiap kombinasi algoritma x KDF."""
    plaintext = b"Pesan rahasia untuk pengujian roundtrip."
    envelope = ck.encrypt_bytes(plaintext, PASSWORD, algorithm, kdf)
    decrypted = ck.decrypt_bytes(envelope, PASSWORD)
    assert decrypted == plaintext


def test_wrong_password_is_rejected():
    """Test 2: dekripsi dengan kata sandi salah harus ditolak (DecryptionError)."""
    plaintext = b"Data sensitif."
    envelope = ck.encrypt_bytes(plaintext, PASSWORD, "aes-gcm", "pbkdf2")
    with pytest.raises(ck.DecryptionError):
        ck.decrypt_bytes(envelope, "kata-sandi-yang-salah")


def test_tampered_ciphertext_is_rejected():
    """Test 3: mengubah satu byte pada envelope harus membuat verifikasi tag gagal."""
    plaintext = b"Jangan diubah!"
    envelope = ck.encrypt_bytes(plaintext, PASSWORD, "aes-gcm", "pbkdf2")
    tampered = bytearray(envelope)
    tampered[-1] ^= 0x01  # ubah 1 bit pada byte terakhir (bagian ciphertext/tag)
    with pytest.raises(ck.DecryptionError):
        ck.decrypt_bytes(bytes(tampered), PASSWORD)


def test_salt_and_nonce_are_random_each_time():
    """Test 4: dua enkripsi dengan plaintext & kata sandi sama harus menghasilkan
    salt, nonce, dan ciphertext yang BERBEDA (karena acak), sesuai ketentuan."""
    plaintext = b"Plaintext yang sama"
    env1 = ck.encrypt_bytes(plaintext, PASSWORD, "aes-gcm", "pbkdf2")
    env2 = ck.encrypt_bytes(plaintext, PASSWORD, "aes-gcm", "pbkdf2")
    meta1 = ck.parse_envelope_meta(env1)
    meta2 = ck.parse_envelope_meta(env2)
    assert meta1["salt_hex"] != meta2["salt_hex"]
    assert meta1["nonce_hex"] != meta2["nonce_hex"]
    assert env1 != env2


def test_empty_and_binary_plaintext():
    """Test 5: kasus tepi -- plaintext kosong dan plaintext biner penuh (0..255)
    harus tetap berhasil dienkripsi dan didekripsi dengan benar."""
    for plaintext in (b"", bytes(range(256)), os.urandom(4096)):
        envelope = ck.encrypt_bytes(plaintext, PASSWORD, "chacha20", "pbkdf2")
        assert ck.decrypt_bytes(envelope, PASSWORD) == plaintext


def test_hybrid_rsa_encrypt_decrypt_roundtrip():
    """Test 6 (fitur pengayaan): enkripsi hibrida RSA-OAEP + AES-GCM harus
    roundtrip dengan benar, dan gagal dengan kunci privat yang salah."""
    private_pem, public_pem = ck.generate_rsa_keypair()
    plaintext = b"Pesan hibrida rahasia."
    envelope = ck.hybrid_encrypt(plaintext, public_pem, "aes-gcm")
    decrypted = ck.hybrid_decrypt(envelope, private_pem)
    assert decrypted == plaintext

    other_private_pem, _ = ck.generate_rsa_keypair()
    with pytest.raises(Exception):
        ck.hybrid_decrypt(envelope, other_private_pem)


def test_base64_and_hex_encoding_helpers_are_inverse():
    """Test 7: fungsi bantu encoding base64/hex harus saling invers."""
    data = os.urandom(128)
    assert ck.from_base64(ck.to_base64(data)) == data
    assert ck.from_hex(ck.to_hex(data)) == data


def test_unknown_envelope_format_raises():
    """Test 8: envelope dengan magic bytes salah harus ditolak dengan pesan jelas,
    bukan exception generik yang membocorkan detail internal."""
    garbage = b"BUKAN-ENVELOPE-VALID" + os.urandom(20)
    with pytest.raises(ck.DecryptionError):
        ck.decrypt_bytes(garbage, PASSWORD)
