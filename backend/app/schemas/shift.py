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
    staff_name: Optional[str] = None
    opened_by: Optional[UUID] = None
    opened_by_name: Optional[str] = None
    closed_by: Optional[UUID] = None
    closed_by_name: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime]
    status: ShiftStatus
    notes: Optional[str]
    created_at: datetime
    duration_hours: Optional[float] = None
    stock_counts: list[ShiftStockCountResponse] = []

    class Config:
        from_attributes = True


class ShiftListResponse(BaseModel):
    shifts: list[ShiftResponse]
    total: int


class DailyShiftEntry(BaseModel):
    id: UUID
    staff_id: UUID
    staff_name: str
    opened_by: Optional[UUID] = None
    opened_by_name: Optional[str] = None
    closed_by: Optional[UUID] = None
    closed_by_name: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime]
    status: ShiftStatus
    notes: Optional[str]
    duration_hours: Optional[float] = None
    sales_count: int = 0

    class Config:
        from_attributes = True


class DailyShiftsResponse(BaseModel):
    date: str
    shifts: list[DailyShiftEntry]
    total_shifts: int
    total_hours_worked: float
    open_shifts_count: int
