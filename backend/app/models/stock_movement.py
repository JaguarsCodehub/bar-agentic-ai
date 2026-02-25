import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class MovementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"


class MovementReason(str, enum.Enum):
    DELIVERY = "delivery"
    WASTAGE = "wastage"
    BREAKAGE = "breakage"
    THEFT = "theft"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    OTHER = "other"


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bar_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bars.id"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    staff_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type: Mapped[MovementType] = mapped_column(Enum(MovementType), nullable=False)
    reason: Mapped[MovementReason] = mapped_column(Enum(MovementReason), nullable=False, default=MovementReason.OTHER)
    quantity: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product")
    staff = relationship("User")

    def __repr__(self):
        return f"<StockMovement {self.type.value} {self.quantity} of {self.product_id}>"
