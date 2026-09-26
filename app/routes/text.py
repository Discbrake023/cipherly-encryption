"""Text encrypt/decrypt API."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

import crypto_core as ck

bp = Blueprint("text", __name__, url_prefix="/api")


@bp.route("/encrypt/text", methods=["POST"])
def encrypt_text():
    data = request.get_json(force=True)
    plaintext = data.get("plaintext", "")
    password = data.get("password", "")
    algorithm = data.get("algorithm", "aes-gcm")
    kdf = data.get("kdf", "pbkdf2")
    encoding = data.get("encoding", "base64")

    if not password:
        return jsonify({"error": "Kata sandi wajib diisi."}), 400
    if not plaintext:
        return jsonify({"error": "Teks tidak boleh kosong."}), 400

    result = ck.timed_encrypt(plaintext.encode("utf-8"), password, algorithm, kdf)
    envelope = result.result
    encoded = ck.to_hex(envelope) if encoding == "hex" else ck.to_base64(envelope)
    meta = ck.parse_envelope_meta(envelope)

    return jsonify({
        "envelope": encoded,
        "encoding": encoding,
        "elapsed_ms": round(result.elapsed_seconds * 1000, 3),
        "meta": meta,
    })


@bp.route("/decrypt/text", methods=["POST"])
def decrypt_text():
    data = request.get_json(force=True)
    envelope_str = data.get("envelope", "")
    password = data.get("password", "")
    encoding = data.get("encoding", "base64")

    try:
        envelope = ck.from_hex(envelope_str) if encoding == "hex" else ck.from_base64(envelope_str)
    except Exception:
        return jsonify({"error": "Format envelope tidak valid (base64/hex rusak)."}), 400

    try:
        result = ck.timed_decrypt(envelope, password)
        plaintext = result.result.decode("utf-8", errors="replace")
        return jsonify({"plaintext": plaintext, "elapsed_ms": round(result.elapsed_seconds * 1000, 3)})
    except ck.DecryptionError as e:
        return jsonify({"error": str(e)}), 400
