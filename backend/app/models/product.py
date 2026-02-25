import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, Boolean, Enum, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ProductCategory(str, enum.Enum):
    SPIRITS = "spirits"
    RUM = "rum"
    BEER = "beer"
    WINE = "wine"
    MIXERS = "mixers"
    COCKTAILS = "cocktails"
    OTHER = "other"


class ProductUnit(str, enum.Enum):
    BOTTLE = "bottle"
    ML = "ml"
    PINT = "pint"
    CAN = "can"
    KEG = "keg"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bar_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bars.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[ProductCategory] = mapped_column(Enum(ProductCategory), nullable=False)
    unit: Mapped[ProductUnit] = mapped_column(Enum(ProductUnit), nullable=False, default=ProductUnit.BOTTLE)
    volume_ml: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    sale_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_stock: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    min_stock_threshold: Mapped[float] = mapped_column(Numeric(10, 2), default=5)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bar = relationship("Bar", back_populates="products")

    def __repr__(self):
        return f"<Product {self.name} ({self.category.value})>"
