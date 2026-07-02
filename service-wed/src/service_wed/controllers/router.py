# top-level API router
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")

# api_router.include_router(<>, prefix="/<>", tags=["<>"])
