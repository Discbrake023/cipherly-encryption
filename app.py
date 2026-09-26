"""
app.py - Local dev shim (modular refactor).

Perintah tetap sama:
    pip install -r requirements-dev.txt
    py -3.12 app.py
"""
from app import create_app

app = create_app()


if __name__ == "__main__":
    app.run(debug=False, port=5000)
