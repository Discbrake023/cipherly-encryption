"""
tests/test_vercel_entrypoint.py
================================
Guardrail entrypoint Vercel.

Vercel mendeteksi framework Flask dari requirements.txt, lalu builder
@vercel/python dijalankan dengan src '<detect>' (auto-detect). Urutan
kandidat auto-detect ada di packages/python/src/entrypoint.ts:
    PYTHON_ENTRYPOINT_DIRS   = ['', 'src', 'app', 'api']
    PYTHON_ENTRYPOINT_FILENAMES = ['app', 'index', 'server', 'main', 'wsgi', 'asgi']
dan berhenti di file pertama yang mengekspor variabel top-level
`app`/`application`/`handler`.

Jika shim dev bernama `app.py` ada di root, auto-detect memilihnya,
sementara di runtime `import app` jatuh ke package `app/` (package selalu
menang atas modul sejenis) sehingga variabel `app` tidak ditemukan dan
setiap request di Vercel berakhir 500 FUNCTION_INVOCATION_FAILED.
"""

import ast
import pathlib

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]

# Harus sinkron dengan packages/python/src/entrypoint.ts (Vercel).
ENTRYPOINT_DIRS = ["", "src", "app", "api"]
ENTRYPOINT_FILENAMES = ["app", "index", "server", "main", "wsgi", "asgi"]
ENTRY_VARS = ("app", "application", "handler")


def _exports_entry_var(path: pathlib.Path) -> bool:
    """Versi sederhana dari findAppOrHandler (AST) Vercel."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            if any(
                isinstance(t, ast.Name) and t.id in ENTRY_VARS for t in targets
            ):
                return True
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            names = []
            for alias in node.names:
                names.append(alias.asname or alias.name.split(".")[0])
            if any(name in ENTRY_VARS for name in names):
                return True
    return False


def detect_vercel_entrypoint() -> str | None:
    """Balik path file yang akan dipilih auto-detect Vercel (atau None)."""
    for entry_dir in ENTRYPOINT_DIRS:
        for filename in ENTRYPOINT_FILENAMES:
            rel = f"{entry_dir}/{filename}.py" if entry_dir else f"{filename}.py"
            candidate = ROOT / rel
            if candidate.is_file() and _exports_entry_var(candidate):
                return rel
    return None


def test_vercel_auto_detects_api_index():
    """Auto-detect Vercel harus memilih api/index.py, bukan shim dev."""
    assert detect_vercel_entrypoint() == "api/index.py"


def test_no_root_module_collides_with_app_package():
    """Root tidak boleh punya modul `app.py`: `import app` harus package app/."""
    assert not (ROOT / "app.py").exists()
    assert (ROOT / "app" / "__init__.py").is_file()


def test_api_index_exposes_app_object():
    """api/index.py tetap mengekspor objek WSGI `app` untuk Vercel."""
    import importlib

    module = importlib.import_module("api.index")
    assert hasattr(module, "app")


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
