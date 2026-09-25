"""
app.py - Backend Flask untuk Aplikasi Enkripsi (Topik A)

Menjalankan:
    pip install -r requirements.txt
    python app.py
Lalu buka http://127.0.0.1:5000 di browser.
"""

import io
import os
import secrets as py_secrets

from flask import Flask, request, jsonify, send_file, render_template

import crypto_core as ck

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # batas upload 32 MB

# Menyimpan keypair RSA hasil generate sementara di memori (khusus demo hibrida).
# Pada aplikasi produksi, kunci privat WAJIB disimpan terenkripsi & tidak pernah
# dikirim balik ke klien tanpa proteksi tambahan.
_LAST_KEYPAIR = {"private_pem": None, "public_pem": None}


@app.route("/")
def index():
    return render_template("landing.html")


@app.route("/app")
def app_view():
    return render_template("app.html")


# ---------------------------------------------------------------------------
# Enkripsi / dekripsi TEKS
# ---------------------------------------------------------------------------

@app.route("/api/encrypt/text", methods=["POST"])
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


@app.route("/api/decrypt/text", methods=["POST"])
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


# ---------------------------------------------------------------------------
# Enkripsi / dekripsi BERKAS
# ---------------------------------------------------------------------------

@app.route("/api/encrypt/file", methods=["POST"])
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


@app.route("/api/decrypt/file", methods=["POST"])
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


# ---------------------------------------------------------------------------
# Demo skenario UTS: enkripsi -> tampilkan ciphertext -> dekripsi benar ->
# tolak kata sandi salah -> tolak ciphertext yang diubah 1 byte
# ---------------------------------------------------------------------------

@app.route("/api/demo/full", methods=["POST"])
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
    tamper_index = len(tampered) - 1  # byte terakhir (bagian dari tag/ciphertext)
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


# ---------------------------------------------------------------------------
# Perbandingan algoritma (avalanche effect + entropi) untuk sampel singkat,
# ditampilkan langsung di UI. Pengujian menyeluruh (1KB/1MB/10MB, histogram,
# banyak berkas) dijalankan lewat testing/benchmark.py -> menghasilkan XLSX.
# ---------------------------------------------------------------------------

@app.route("/api/analyze/avalanche", methods=["POST"])
def analyze_avalanche():
    data = request.get_json(force=True)
    plaintext = data.get("plaintext", "Contoh teks untuk uji avalanche effect.").encode("utf-8")
    password = data.get("password", "kata-sandi-uji")
    algorithm = data.get("algorithm", "aes-gcm")
    kdf = data.get("kdf", "pbkdf2")

    from testing.metrics import avalanche_effect_bit_flip, avalanche_effect_key_change, shannon_entropy

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


# ---------------------------------------------------------------------------
# Enkripsi hibrida (fitur pengayaan)
# ---------------------------------------------------------------------------

@app.route("/api/hybrid/generate-keys", methods=["POST"])
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


@app.route("/api/hybrid/encrypt", methods=["POST"])
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


@app.route("/api/hybrid/decrypt", methods=["POST"])
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


if __name__ == "__main__":
    app.run(debug=False, port=5000)
