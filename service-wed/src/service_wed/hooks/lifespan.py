"""Async lifespan: build the shared AppContainer (bootstrap.py) once at
startup -- DB engine/session factory, Redis pool, email sender, arq queue,
every service -- attach it to app.state so dependencies.py can hand pieces
of it to route handlers, and release its connections on shutdown.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from service_wed.bootstrap import build_container


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.container = await build_container()
    try:
        yield
    finally:
        await app.state.container.close()
