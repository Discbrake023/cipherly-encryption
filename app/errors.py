"""Consistent JSON error handlers."""
from __future__ import annotations

from flask import jsonify
from werkzeug.exceptions import HTTPException


def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(e):
        msg = e.description if isinstance(e, HTTPException) else "Permintaan tidak valid."
        return jsonify({"error": msg}), 400

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": "Berkas terlalu besar."}), 413

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Kesalahan internal server."}), 500
