"""View routes: landing + workspace pages."""
from __future__ import annotations

from flask import Blueprint, render_template

bp = Blueprint("views", __name__)


@bp.route("/")
def index():
    return render_template("landing.html")


@bp.route("/app")
def app_view():
    return render_template("app.html")
