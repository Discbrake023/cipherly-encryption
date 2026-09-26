"""Quick analysis API (avalanche + entropy)."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

import crypto_core as ck
from testing.metrics import avalanche_effect_bit_flip, avalanche_effect_key_change, shannon_entropy

bp = Blueprint("analysis", __name__, url_prefix="/api")


@bp.route("/analyze/avalanche", methods=["POST"])
def analyze_avalanche():
    data = request.get_json(force=True)
    plaintext = data.get("plaintext", "Contoh teks untuk uji avalanche effect.").encode("utf-8")
    password = data.get("password", "kata-sandi-uji")
    algorithm = data.get("algorithm", "aes-gcm")
    kdf = data.get("kdf", "pbkdf2")

    plain_bit = avalanche_effect_bit_flip(plaintext, password, algorithm, kdf)
    key_bit = avalanche_effect_key_change(plaintext, password, algorithm, kdf)
    envelope = ck.encrypt_bytes(plaintext, password, algorithm, kdf)
    entropy_plain = shannon_entropy(plaintext)
    entropy_cipher = shannon_entropy(envelope)

    return jsonify({
        "avalanche_plaintext_bit_change_percent": plain_bit,
        "avalanche_key_change_percent": key_bit,
        "entropy_plaintext_bits_per_byte": entropy_plain,
        "entropy_ciphertext_bits_per_byte": entropy_cipher,
    })
