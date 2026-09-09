"""ASGI entry + production server bootstrap.

Use on Render / any PaaS:
  python main.py

Uvicorn defaults to 127.0.0.1 — that fails Render's port scan.
This entrypoint always binds 0.0.0.0 and uses $PORT.
"""

from __future__ import annotations

import os

from app.main import app

__all__ = ["app"]


def run() -> None:
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )


if __name__ == "__main__":
    run()