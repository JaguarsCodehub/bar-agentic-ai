import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class LossSeverity(str, enum.Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


class ReasonCode(str, enum.Enum):
    THEFT = "theft"
    OVER_POUR = "over_pour"
    WASTAGE = "wastage"
    ENTRY_ERROR = "entry_error"
    UNRESOLVED = "unresolved"


class LossReport(Base):
    __tablename__ = "loss_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bar_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bars.id"), nullable=False)
    reconciliation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("daily_reconciliations.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    shift_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("shifts.id"), nullable=False)
    discrepancy_quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    loss_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    severity: Mapped[LossSeverity] = mapped_column(Enum(LossSeverity), nullable=False)
    reason_code: Mapped[ReasonCode | None] = mapped_column(Enum(ReasonCode), nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product")
    shift = relationship("Shift")
    reconciliation = relationship("DailyReconciliation")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    def __repr__(self):
        return f"<LossReport {self.product_id} severity:{self.severity.value}>"
