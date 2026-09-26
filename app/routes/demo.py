"""UTS demo scenario API (behaviour unchanged; perf tuning deferred)."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

import crypto_core as ck

bp = Blueprint("demo", __name__, url_prefix="/api")


@bp.route("/demo/full", methods=["POST"])
def demo_full():
    f = request.files.get("file")
    password = request.form.get("password", "")
    algorithm = request.form.get("algorithm", "aes-gcm")
    kdf = request.form.get("kdf", "pbkdf2")

    if f is None or not password:
        return jsonify({"error": "Berkas dan kata sandi wajib diisi."}), 400

    plaintext = f.read()

    # 1) Enkripsi
    enc = ck.timed_encrypt(plaintext, password, algorithm, kdf)
    envelope = enc.result
    meta = ck.parse_envelope_meta(envelope)

    # 2) Dekripsi dengan kata sandi benar
    dec_ok = ck.timed_decrypt(envelope, password)
    correct_ok = dec_ok.result == plaintext

    # 3) Dekripsi dengan kata sandi SALAH
    wrong_password_error = None
    try:
        ck.decrypt_bytes(envelope, password + "_salah")
    except ck.DecryptionError as e:
        wrong_password_error = str(e)

    # 4) Tamper 1 byte pada ciphertext, dekripsi dengan kata sandi benar
    tampered = bytearray(envelope)
    tamper_index = len(tampered) - 1
    tampered[tamper_index] ^= 0x01
    tamper_error = None
    try:
        ck.decrypt_bytes(bytes(tampered), password)
    except ck.DecryptionError as e:
        tamper_error = str(e)

    return jsonify({
        "meta": meta,
        "ciphertext_preview_hex": ck.to_hex(envelope[:64]) + ("..." if len(envelope) > 64 else ""),
        "ciphertext_full_hex": ck.to_hex(envelope),
        "encrypt_ms": round(enc.elapsed_seconds * 1000, 3),
        "decrypt_correct_ms": round(dec_ok.elapsed_seconds * 1000, 3),
        "decrypt_correct_matches_original": correct_ok,
        "wrong_password_rejected": wrong_password_error is not None,
        "wrong_password_message": wrong_password_error,
        "tampered_rejected": tamper_error is not None,
        "tampered_message": tamper_error,
    })
