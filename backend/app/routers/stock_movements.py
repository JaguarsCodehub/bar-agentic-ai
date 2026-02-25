import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import User, Product, StockMovement, MovementType
from app.schemas.stock_movement import (
    StockMovementCreate, StockMovementResponse, StockMovementListResponse,
)
from app.middleware.auth import get_current_user, require_manager

router = APIRouter(prefix="/stock-movements", tags=["Stock Movements"])


@router.get("", response_model=StockMovementListResponse)
async def list_stock_movements(
    product_id: Optional[uuid.UUID] = None,
    movement_type: Optional[MovementType] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """List stock movements with optional filters (Manager+ only)."""
    query = select(StockMovement).where(StockMovement.bar_id == current_user.bar_id)

    if product_id:
        query = query.where(StockMovement.product_id == product_id)
    if movement_type:
        query = query.where(StockMovement.type == movement_type)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(StockMovement.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    movements = result.scalars().all()

    return StockMovementListResponse(
        movements=[StockMovementResponse.model_validate(m) for m in movements],
        total=total,
    )


@router.post("", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
async def create_stock_movement(
    data: StockMovementCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log a stock IN or OUT event. Updates product current_stock."""
    # Verify product belongs to bar
    product_result = await db.execute(
        select(Product).where(
            Product.id == data.product_id,
            Product.bar_id == current_user.bar_id,
        )
    )
    product = product_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    movement = StockMovement(
        bar_id=current_user.bar_id,
        product_id=data.product_id,
        staff_id=current_user.id,
        type=data.type,
        reason=data.reason,
        quantity=data.quantity,
        notes=data.notes,
    )
    db.add(movement)

    # Update product stock
    if data.type == MovementType.IN:
        product.current_stock = float(product.current_stock or 0) + data.quantity
    else:
        product.current_stock = float(product.current_stock or 0) - data.quantity

    await db.flush()
    await db.refresh(movement)
    return StockMovementResponse.model_validate(movement)
