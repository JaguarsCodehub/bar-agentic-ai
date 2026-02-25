import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ShiftStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bar_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bars.id"), nullable=False)
    staff_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[ShiftStatus] = mapped_column(Enum(ShiftStatus), default=ShiftStatus.OPEN)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    bar = relationship("Bar", back_populates="shifts")
    staff = relationship("User")
    stock_counts = relationship("ShiftStockCount", back_populates="shift", cascade="all, delete-orphan")
    sales_records = relationship("SalesRecord", back_populates="shift", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Shift {self.id} ({self.status.value})>"


class ShiftStockCount(Base):
    __tablename__ = "shift_stock_counts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shift_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("shifts.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    opening_count: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    closing_count: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)

    # Relationships
    shift = relationship("Shift", back_populates="stock_counts")
    product = relationship("Product")

    def __repr__(self):
        return f"<ShiftStockCount {self.product_id}: {self.opening_count} -> {self.closing_count}>"
