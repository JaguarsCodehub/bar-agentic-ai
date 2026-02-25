import uuid
from datetime import datetime, date
from sqlalchemy import DateTime, Date, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class DailyReconciliation(Base):
    __tablename__ = "daily_reconciliations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bar_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bars.id"), nullable=False)
    shift_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("shifts.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    opening_stock: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    received: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    sold: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    expected_closing: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    actual_closing: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    discrepancy: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product")
    shift = relationship("Shift")

    def __repr__(self):
        return f"<DailyReconciliation {self.product_id} disc:{self.discrepancy}>"
