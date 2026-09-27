"""Flask application factory (Vercel-compatible).

Per Context7 Flask docs: create_app() builds the app, blueprints are
registered inside the factory. Per Vercel Flask example: api/index.py
imports this factory and exposes `app`.
"""
from __future__ import annotations

import os

from flask import Flask

from .config import get_config
from .errors import register_error_handlers


def _register_dev_routes(app: Flask) -> None:
    """Dev-only (FLASK_DEBUG=1): hash mtime template+static untuk auto-refresh.

    Skrip polling di base.html memanggil endpoint ini tiap 2 detik dan me-
    reload browser saat hasilnya berubah. Tidak dirender/didaftarkan di produksi.
    """
    import hashlib

    from flask import Response

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    watched = {
        "templates": (".html",),
        "static": (".css", ".js", ".html"),
    }

    @app.get("/__dev/version")
    def dev_version() -> Response:
        h = hashlib.sha256()
        for sub, exts in watched.items():
            root = os.path.join(base_dir, sub)
            for dirpath, _, files in os.walk(root):
                for name in sorted(files):
                    if not name.endswith(exts):
                        continue
                    path = os.path.join(dirpath, name)
                    try:
                        st = os.stat(path)
                    except OSError:
                        continue
                    h.update(path.encode("utf-8", "replace"))
                    h.update(str(st.st_mtime_ns).encode("ascii"))
        return Response(h.hexdigest(), headers={"Cache-Control": "no-store"})


def create_app(test_config: dict | None = None):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app = Flask(
        __name__,
        template_folder=os.path.join(base_dir, "templates"),
        static_folder=os.path.join(base_dir, "static"),
    )

    cfg = get_config()
    app.config["MAX_CONTENT_LENGTH"] = cfg.MAX_CONTENT_LENGTH
    app.config["DEBUG"] = cfg.DEBUG
    if test_config:
        app.config.update(test_config)

    register_error_handlers(app)

    if app.config["DEBUG"]:
        _register_dev_routes(app)

    from .routes import analysis_bp, demo_bp, file_bp, hybrid_bp, text_bp, views_bp

    app.register_blueprint(views_bp)
    app.register_blueprint(text_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(demo_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(hybrid_bp)

    return app
