"""Vercel serverless entrypoint for Flask.

Per Vercel Flask example (context7 /vercel/examples):
all routes rewrite to /api/index, and this module exposes `app`.
"""
from __future__ import annotations

from flask import jsonify, request

from app import create_app

app = create_app()


@app.route("/api/index", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def _diagnose_routing():
    """DIAGNOSTIK SEMENTARA — hapus setelah root cause 404 diketahui.

    Mengembalikan path yang benar-benar diterima runtime (PATH_INFO),
    header platform (kemungkinan memuat path asli), dan route terdaftar.
    """
    interesting = {
        k: v
        for k, v in request.headers.items()
        if k.lower().startswith(("x-", "host"))
    }
    return jsonify({
        "path": request.path,
        "path_info": request.environ.get("PATH_INFO"),
        "script_name": request.environ.get("SCRIPT_NAME"),
        "full_path": request.full_path,
        "headers": interesting,
        "routes": sorted(str(r) for r in app.url_map.iter_rules()),
    })
