from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date
from typing import Optional


class ReconciliationResponse(BaseModel):
    id: UUID
    bar_id: UUID
    shift_id: UUID
    product_id: UUID
    date: date
    opening_stock: float
    received: float
    sold: float
    expected_closing: float
    actual_closing: float
    discrepancy: float
    created_at: datetime

    class Config:
        from_attributes = True


class ReconciliationListResponse(BaseModel):
    reconciliations: list[ReconciliationResponse]
    total: int
