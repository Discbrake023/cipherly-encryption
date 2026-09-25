"""
testing/metrics.py
===================
Fungsi-fungsi metrik pengujian yang dipakai bersama oleh:
  - app.py (untuk panel analisis singkat di UI)
  - testing/benchmark.py (untuk pengujian menyeluruh -> laporan.xlsx)

Metrik yang diimplementasikan mengikuti "Pengujian wajib" Topik A:
  - Avalanche effect (perubahan 1 bit plainteks / 1 bit kunci)
  - Entropi Shannon
  - Histogram byte (dikembalikan sebagai array frekuensi 0..255)
"""

from __future__ import annotations

import math
import os
from collections import Counter

import crypto_core as ck


def _bit_diff_percent(a: bytes, b: bytes) -> float:
    """Persentase bit yang berbeda antara dua urutan byte dengan panjang sama."""
    if len(a) != len(b):
        # Untuk AEAD, ciphertext punya panjang identik jika plaintext identik,
        # namun nonce/salt acak berbeda tiap enkripsi. Kita bandingkan hanya
        # bagian ciphertext (bukan header) di level pemanggil bila perlu.
        n = min(len(a), len(b))
        a, b = a[:n], b[:n]
    total_bits = len(a) * 8
    if total_bits == 0:
        return 0.0
    diff_bits = 0
    for x, y in zip(a, b):
        diff_bits += bin(x ^ y).count("1")
    return round(100.0 * diff_bits / total_bits, 3)


def _flip_one_bit(data: bytes, bit_index: int = 0) -> bytes:
    b = bytearray(data)
    byte_index = bit_index // 8
    bit_in_byte = bit_index % 8
    b[byte_index] ^= (1 << bit_in_byte)
    return bytes(b)


def avalanche_effect_bit_flip(plaintext: bytes, password: str, algorithm: str, kdf: str) -> float:
    """Avalanche effect saat SATU BIT PLAINTEXT diubah, dengan salt/nonce/kunci
    yang sama pada kedua enkripsi (agar perbedaan ciphertext murni berasal dari
    perbedaan plaintext, bukan dari nonce acak)."""
    if not plaintext:
        plaintext = b"\x00"

    salt = os.urandom(ck.DEFAULT_SALT_LEN)
    nonce = os.urandom(ck.NONCE_LEN)
    kdf_param = ck._default_kdf_param(kdf)
    key = ck.derive_key(password, salt, kdf, kdf_param)
    cipher1 = ck._aead_cipher(algorithm, key)
    ct1 = cipher1.encrypt(nonce, plaintext, None)

    flipped = _flip_one_bit(plaintext, 0)
    cipher2 = ck._aead_cipher(algorithm, key)
    ct2 = cipher2.encrypt(nonce, flipped, None)

    return _bit_diff_percent(ct1, ct2)


def avalanche_effect_key_change(plaintext: bytes, password: str, algorithm: str, kdf: str) -> float:
    """Avalanche effect saat SATU BIT KUNCI turunan diubah, nonce & plaintext sama."""
    if not plaintext:
        plaintext = b"\x00"

    salt = os.urandom(ck.DEFAULT_SALT_LEN)
    nonce = os.urandom(ck.NONCE_LEN)
    kdf_param = ck._default_kdf_param(kdf)
    key1 = ck.derive_key(password, salt, kdf, kdf_param)
    key2 = _flip_one_bit(key1, 0)

    cipher1 = ck._aead_cipher(algorithm, key1)
    ct1 = cipher1.encrypt(nonce, plaintext, None)
    cipher2 = ck._aead_cipher(algorithm, key2)
    ct2 = cipher2.encrypt(nonce, plaintext, None)

    return _bit_diff_percent(ct1, ct2)


def shannon_entropy(data: bytes) -> float:
    """Entropi Shannon dalam bit/byte (maksimum 8 untuk data acak sempurna)."""
    if not data:
        return 0.0
    counts = Counter(data)
    length = len(data)
    entropy = 0.0
    for count in counts.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def byte_histogram(data: bytes) -> list[int]:
    """Frekuensi kemunculan tiap nilai byte 0..255."""
    hist = [0] * 256
    for b in data:
        hist[b] += 1
    return hist
