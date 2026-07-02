# login/session DTOs
import datetime as dt
from pydantic import BaseModel, EmailStr, Field


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class AdminSessionResponse(BaseModel):
    token: str  # The raw token (not the hash!) returned ONLY once upon login
    expires_at: dt.datetime
