"""Vercel serverless entrypoint for Flask.

Per Vercel Flask example (context7 /vercel/examples):
all routes rewrite to /api/index, and this module exposes `app`.
"""
from app import create_app

app = create_app()
