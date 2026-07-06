"""API entrypoint: builds the FastAPI app, mounts the router tree, registers
exception handlers, and wires the lifespan that boots/tears down shared
adapters (DB engine, Redis, email sender, arq queue -- see bootstrap.py).

Run locally with: uvicorn service_wed.main:app --reload
"""

from fastapi import FastAPI

from service_wed.controllers.router import api_router
from service_wed.exceptions import register_exception_handlers
from service_wed.hooks.lifespan import lifespan
from service_wed.middleware.request_context import RequestContextMiddleware


def create_app() -> FastAPI:
    app = FastAPI(title="Wedding Website API", lifespan=lifespan)

    app.add_middleware(RequestContextMiddleware)

    register_exception_handlers(app)
    app.include_router(api_router)

    return app


app = create_app()
