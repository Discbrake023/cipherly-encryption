"""Route package exports."""
from .views import bp as views_bp
from .text import bp as text_bp
from .file import bp as file_bp
from .demo import bp as demo_bp
from .analysis import bp as analysis_bp
from .hybrid import bp as hybrid_bp

__all__ = ["views_bp", "text_bp", "file_bp", "demo_bp", "analysis_bp", "hybrid_bp"]
