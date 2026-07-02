# pagination, error envelope, shared types
import uuid
from pydantic import BaseModel


class SuccessResponse(BaseModel):
    success: bool = True
    message: str | None = None


class IdResponse(BaseModel):
    id: uuid.UUID
