from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.product import ProductCategory, ProductUnit


class ProductCreate(BaseModel):
    name: str
    category: ProductCategory
    unit: ProductUnit = ProductUnit.BOTTLE
    volume_ml: Optional[int] = None
    cost_price: float
    sale_price: float
    description: Optional[str] = None
    min_stock_threshold: float = 5.0
    current_stock: float = 0.0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[ProductCategory] = None
    unit: Optional[ProductUnit] = None
    volume_ml: Optional[int] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    description: Optional[str] = None
    min_stock_threshold: Optional[float] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    id: UUID
    bar_id: UUID
    name: str
    category: ProductCategory
    unit: ProductUnit
    volume_ml: Optional[int]
    cost_price: float
    sale_price: float
    image_url: Optional[str]
    description: Optional[str]
    current_stock: float
    min_stock_threshold: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
    total: int
