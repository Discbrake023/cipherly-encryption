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

    from .routes import analysis_bp, demo_bp, file_bp, hybrid_bp, text_bp, views_bp

    app.register_blueprint(views_bp)
    app.register_blueprint(text_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(demo_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(hybrid_bp)

    return app
