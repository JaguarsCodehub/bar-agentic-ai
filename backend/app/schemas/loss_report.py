from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.loss_report import LossSeverity, ReasonCode


class LossReportResponse(BaseModel):
    id: UUID
    bar_id: UUID
    reconciliation_id: UUID
    product_id: UUID
    shift_id: UUID
    discrepancy_quantity: float
    loss_value: float
    severity: LossSeverity
    reason_code: Optional[ReasonCode]
    reviewed_by: Optional[UUID]
    reviewed_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class LossReportUpdate(BaseModel):
    reason_code: ReasonCode
    notes: Optional[str] = None


class LossReportListResponse(BaseModel):
    reports: list[LossReportResponse]
    total: int


class LossSummary(BaseModel):
    total_loss_value: float
    total_incidents: int
    critical_count: int
    warning_count: int
    info_count: int
    unresolved_count: int
    top_loss_products: list[dict]
