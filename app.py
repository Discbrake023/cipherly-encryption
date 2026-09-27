"""
app.py - Local dev shim (modular refactor).

Menjalankan:
    Windows : py -3.12 app.py
    Linux   : python3 app.py

Hot reload aktif secara default (FLASK_DEBUG=1):
    - file *.py berubah        -> server restart otomatis (Werkzeug reloader)
    - template/CSS/JS berubah  -> browser reload otomatis (skrip dev di base.html)
Matikan dengan:
    Windows : $env:FLASK_DEBUG="0"; py -3.12 app.py
    Linux   : FLASK_DEBUG=0 python3 app.py
"""
from __future__ import annotations

import glob
import os

# Konsisten dengan app.config["DEBUG"] (lihat app/config.py) sebelum create_app().
# Vercel (api/index.py) tidak pernah mengimpor shim ini, jadi produksi aman.
os.environ.setdefault("FLASK_DEBUG", "1")

from app import create_app  # noqa: E402

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"


def watch_files() -> list[str]:
    """Daftar file template/static yang dipantau reloader saat debug."""
    patterns = [
        os.path.join(BASE_DIR, "templates", "**", "*.html"),
        os.path.join(BASE_DIR, "static", "**", "*.css"),
        os.path.join(BASE_DIR, "static", "**", "*.js"),
        os.path.join(BASE_DIR, "static", "**", "*.html"),
    ]
    return sorted({f for p in patterns for f in glob.glob(p, recursive=True)})


app = create_app()


if __name__ == "__main__":
    app.run(
        debug=DEBUG,
        use_reloader=True,
        port=5000,
        extra_files=watch_files() if DEBUG else None,
    )
    # Ensure Jinja2 auto-reload for templates
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
