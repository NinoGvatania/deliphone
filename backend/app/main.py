"""FastAPI application entry point.

- mounts `/api/v1` (client, partner, admin, public, webhooks — SPEC.md §3.3)
- exposes `GET /healthz` for infra checks
- wires up structlog and CORS
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1 import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger


@asynccontextmanager
async def lifespan(_: FastAPI) -> Any:
    configure_logging()
    log = get_logger("deliphone.startup")
    log.info("app.start", env=settings.ENV, version=__version__)
    yield
    log.info("app.stop")


app = FastAPI(
    title="Deliphone API",
    version=__version__,
    description="Rental-network backend — see docs/SPEC.md",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/healthz", tags=["meta"])
async def healthz() -> dict[str, str]:
    return {"status": "ok", "env": settings.ENV, "version": __version__}
