from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class BarCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None


class BarUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class BarResponse(BaseModel):
    id: UUID
    name: str
    address: Optional[str]
    phone: Optional[str]
    logo_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
