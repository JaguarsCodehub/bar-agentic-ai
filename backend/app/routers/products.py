import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import User, Product, ProductCategory, ProductUnit
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
from app.middleware.auth import get_current_user, require_manager
from app.utils.file_upload import save_upload_file, delete_upload_file

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    category: Optional[ProductCategory] = None,
    search: Optional[str] = None,
    active_only: bool = True,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all products for the bar with optional filters."""
    query = select(Product).where(Product.bar_id == current_user.bar_id)

    if active_only:
        query = query.where(Product.is_active == True)
    if category:
        query = query.where(Product.category == category)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(Product.name).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    products = result.scalars().all()

    return ProductListResponse(
        products=[ProductResponse.model_validate(p) for p in products],
        total=total,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Create a new product (Manager+ only)."""
    product = Product(
        bar_id=current_user.bar_id,
        name=data.name,
        category=data.category,
        unit=data.unit,
        volume_ml=data.volume_ml,
        cost_price=data.cost_price,
        sale_price=data.sale_price,
        description=data.description,
        min_stock_threshold=data.min_stock_threshold,
        current_stock=data.current_stock,
    )
    db.add(product)
    await db.flush()
    await db.refresh(product)

    return ProductResponse.model_validate(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific product."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.bar_id == current_user.bar_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse.model_validate(product)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Update a product (Manager+ only)."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.bar_id == current_user.bar_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    await db.flush()
    await db.refresh(product)
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a product (set is_active=False)."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.bar_id == current_user.bar_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.is_active = False
    await db.flush()


@router.post("/{product_id}/image", response_model=ProductResponse)
async def upload_product_image(
    product_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Upload or replace product image (Manager+ only)."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.bar_id == current_user.bar_id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Delete old image if exists
    if product.image_url:
        delete_upload_file(product.image_url)

    # Save new image
    image_url = await save_upload_file(file, "products")
    product.image_url = image_url

    await db.flush()
    await db.refresh(product)
    return ProductResponse.model_validate(product)


@router.get("/low-stock/alerts", response_model=list[ProductResponse])
async def get_low_stock_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all products below their minimum stock threshold."""
    result = await db.execute(
        select(Product).where(
            Product.bar_id == current_user.bar_id,
            Product.is_active == True,
            Product.current_stock <= Product.min_stock_threshold,
        ).order_by(Product.current_stock)
    )
    products = result.scalars().all()
    return [ProductResponse.model_validate(p) for p in products]
