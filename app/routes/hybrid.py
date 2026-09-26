"""Hybrid RSA + AEAD API."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

import crypto_core as ck

bp = Blueprint("hybrid", __name__, url_prefix="/api")

# Menyimpan keypair RSA hasil generate sementara di memori (khusus demo hibrida).
_LAST_KEYPAIR = {"private_pem": None, "public_pem": None}


@bp.route("/hybrid/generate-keys", methods=["POST"])
def hybrid_generate_keys():
    private_pem, public_pem = ck.generate_rsa_keypair()
    _LAST_KEYPAIR["private_pem"] = private_pem
    _LAST_KEYPAIR["public_pem"] = public_pem
    return jsonify({
        "public_key": public_pem.decode("ascii"),
        "private_key": private_pem.decode("ascii"),
        "warning": (
            "DEMO SAJA: kunci privat ditampilkan agar mudah diuji. Pada implementasi "
            "nyata, kunci privat wajib disimpan terenkripsi di sisi klien/server dan "
            "tidak pernah dikirim melalui API tanpa proteksi tambahan."
        ),
    })


@bp.route("/hybrid/encrypt", methods=["POST"])
def hybrid_encrypt_route():
    data = request.get_json(force=True)
    plaintext = data.get("plaintext", "")
    public_key = data.get("public_key", "")
    algorithm = data.get("algorithm", "aes-gcm")

    if not plaintext or not public_key:
        return jsonify({"error": "Teks dan kunci publik wajib diisi."}), 400

    try:
        envelope = ck.hybrid_encrypt(plaintext.encode("utf-8"), public_key.encode("ascii"), algorithm)
    except Exception as e:
        return jsonify({"error": f"Gagal enkripsi hibrida: {e}"}), 400

    return jsonify({"envelope": ck.to_base64(envelope)})


@bp.route("/hybrid/decrypt", methods=["POST"])
def hybrid_decrypt_route():
    data = request.get_json(force=True)
    envelope_b64 = data.get("envelope", "")
    private_key = data.get("private_key", "")

    if not envelope_b64 or not private_key:
        return jsonify({"error": "Envelope dan kunci privat wajib diisi."}), 400

    try:
        envelope = ck.from_base64(envelope_b64)
        plaintext = ck.hybrid_decrypt(envelope, private_key.encode("ascii"))
        return jsonify({"plaintext": plaintext.decode("utf-8", errors="replace")})
    except ck.DecryptionError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Gagal dekripsi: {e}"}), 400
