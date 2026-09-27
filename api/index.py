"""Vercel serverless entrypoint for Flask.

Per Vercel Flask example (context7 /vercel/examples):
all routes rewrite to /api/index, and this module exposes `app`.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app

app = create_app()