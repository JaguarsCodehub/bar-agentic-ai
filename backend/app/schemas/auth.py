from pydantic import BaseModel, EmailStr
from uuid import UUID
from app.models.user import UserRole


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    bar_name: str  # Creates bar + owner in one step


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    bar_id: UUID
    is_active: bool

    class Config:
        from_attributes = True


class CreateStaffRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole = UserRole.STAFF
