from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.shift import ShiftStatus


class StockCountEntry(BaseModel):
    product_id: UUID
    count: float


class ShiftOpenRequest(BaseModel):
    stock_counts: list[StockCountEntry]
    notes: Optional[str] = None


class ShiftCloseRequest(BaseModel):
    stock_counts: list[StockCountEntry]
    notes: Optional[str] = None


class ShiftStockCountResponse(BaseModel):
    id: UUID
    product_id: UUID
    opening_count: float
    closing_count: Optional[float]

    class Config:
        from_attributes = True


class ShiftResponse(BaseModel):
    id: UUID
    bar_id: UUID
    staff_id: UUID
    start_time: datetime
    end_time: Optional[datetime]
    status: ShiftStatus
    notes: Optional[str]
    created_at: datetime
    stock_counts: list[ShiftStockCountResponse] = []

    class Config:
        from_attributes = True


class ShiftListResponse(BaseModel):
    shifts: list[ShiftResponse]
    total: int
