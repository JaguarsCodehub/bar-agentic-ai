from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class SalesRecordCreate(BaseModel):
    product_id: UUID
    shift_id: UUID
    quantity_sold: float
    sale_amount: float


class SalesRecordBulkCreate(BaseModel):
    records: list[SalesRecordCreate]


class SalesRecordResponse(BaseModel):
    id: UUID
    bar_id: UUID
    product_id: UUID
    shift_id: UUID
    quantity_sold: float
    sale_amount: float
    created_at: datetime

    class Config:
        from_attributes = True


class SalesRecordListResponse(BaseModel):
    records: list[SalesRecordResponse]
    total: int
