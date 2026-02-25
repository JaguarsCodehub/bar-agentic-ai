from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.purchase_order import PurchaseOrderStatus


class PurchaseOrderItemCreate(BaseModel):
    product_id: UUID
    quantity: float
    unit_cost: float


class PurchaseOrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: float
    unit_cost: float
    total_cost: float

    class Config:
        from_attributes = True


class PurchaseOrderCreate(BaseModel):
    supplier_id: UUID
    notes: Optional[str] = None
    items: list[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(BaseModel):
    status: Optional[PurchaseOrderStatus] = None
    notes: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    id: UUID
    bar_id: UUID
    supplier_id: UUID
    status: PurchaseOrderStatus
    total_cost: float
    notes: Optional[str]
    ordered_at: Optional[datetime]
    received_at: Optional[datetime]
    created_at: datetime
    items: list[PurchaseOrderItemResponse] = []

    class Config:
        from_attributes = True
