"""File encrypt/decrypt API (binary download)."""
from __future__ import annotations

import io

from flask import Blueprint, jsonify, request, send_file

import crypto_core as ck

bp = Blueprint("file", __name__, url_prefix="/api")


@bp.route("/encrypt/file", methods=["POST"])
def encrypt_file():
    f = request.files.get("file")
    password = request.form.get("password", "")
    algorithm = request.form.get("algorithm", "aes-gcm")
    kdf = request.form.get("kdf", "pbkdf2")

    if f is None or not password:
        return jsonify({"error": "Berkas dan kata sandi wajib diisi."}), 400

    plaintext = f.read()
    result = ck.timed_encrypt(plaintext, password, algorithm, kdf)
    envelope = result.result

    buf = io.BytesIO(envelope)
    buf.seek(0)
    out_name = f.filename + ".krp"
    response = send_file(buf, as_attachment=True, download_name=out_name,
                         mimetype="application/octet-stream")
    response.headers["X-Elapsed-Ms"] = str(round(result.elapsed_seconds * 1000, 3))
    response.headers["Access-Control-Expose-Headers"] = "X-Elapsed-Ms"
    return response


@bp.route("/decrypt/file", methods=["POST"])
def decrypt_file():
    f = request.files.get("file")
    password = request.form.get("password", "")

    if f is None or not password:
        return jsonify({"error": "Berkas dan kata sandi wajib diisi."}), 400

    envelope = f.read()
    try:
        result = ck.timed_decrypt(envelope, password)
    except ck.DecryptionError as e:
        return jsonify({"error": str(e)}), 400

    buf = io.BytesIO(result.result)
    buf.seek(0)
    out_name = f.filename[:-4] if f.filename.endswith(".krp") else ("dekripsi_" + f.filename)
    response = send_file(buf, as_attachment=True, download_name=out_name,
                         mimetype="application/octet-stream")
    response.headers["X-Elapsed-Ms"] = str(round(result.elapsed_seconds * 1000, 3))
    response.headers["Access-Control-Expose-Headers"] = "X-Elapsed-Ms"
    return response
