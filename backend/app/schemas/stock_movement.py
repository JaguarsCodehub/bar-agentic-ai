from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.stock_movement import MovementType, MovementReason


class StockMovementCreate(BaseModel):
    product_id: UUID
    type: MovementType
    reason: MovementReason = MovementReason.OTHER
    quantity: float
    notes: Optional[str] = None


class StockMovementResponse(BaseModel):
    id: UUID
    bar_id: UUID
    product_id: UUID
    staff_id: UUID
    type: MovementType
    reason: MovementReason
    quantity: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class StockMovementListResponse(BaseModel):
    movements: list[StockMovementResponse]
    total: int
