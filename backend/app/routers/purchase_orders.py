import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    User, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus,
    Product, StockMovement, MovementType, MovementReason,
)
from app.schemas.purchase_order import (
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse,
)
from app.middleware.auth import require_manager

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])


@router.get("", response_model=list[PurchaseOrderResponse])
async def list_purchase_orders(
    status_filter: PurchaseOrderStatus | None = None,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(PurchaseOrder)
        .where(PurchaseOrder.bar_id == current_user.bar_id)
        .options(selectinload(PurchaseOrder.items))
        .order_by(PurchaseOrder.created_at.desc())
    )
    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)

    result = await db.execute(query)
    orders = result.scalars().all()
    return [PurchaseOrderResponse.model_validate(o) for o in orders]


@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Create a purchase order with line items."""
    total_cost = sum(item.quantity * item.unit_cost for item in data.items)

    po = PurchaseOrder(
        bar_id=current_user.bar_id,
        supplier_id=data.supplier_id,
        total_cost=total_cost,
        notes=data.notes,
    )
    db.add(po)
    await db.flush()

    for item_data in data.items:
        item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            unit_cost=item_data.unit_cost,
            total_cost=item_data.quantity * item_data.unit_cost,
        )
        db.add(item)

    await db.flush()

    # Reload with items
    result = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.id == po.id)
        .options(selectinload(PurchaseOrder.items))
    )
    po = result.scalar_one()
    return PurchaseOrderResponse.model_validate(po)


@router.post("/{order_id}/receive", response_model=PurchaseOrderResponse)
async def receive_purchase_order(
    order_id: uuid.UUID,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Mark a purchase order as received — auto-creates stock IN movements and updates product stock."""
    result = await db.execute(
        select(PurchaseOrder)
        .where(
            PurchaseOrder.id == order_id,
            PurchaseOrder.bar_id == current_user.bar_id,
        )
        .options(selectinload(PurchaseOrder.items))
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status == PurchaseOrderStatus.RECEIVED:
        raise HTTPException(status_code=400, detail="Order already received")

    if po.status == PurchaseOrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot receive a cancelled order")

    po.status = PurchaseOrderStatus.RECEIVED
    po.received_at = datetime.utcnow()

    # Create stock movements and update product stock for each item
    for item in po.items:
        # Create stock IN movement
        movement = StockMovement(
            bar_id=current_user.bar_id,
            product_id=item.product_id,
            staff_id=current_user.id,
            type=MovementType.IN,
            reason=MovementReason.DELIVERY,
            quantity=float(item.quantity),
            notes=f"PO #{str(po.id)[:8]} received",
        )
        db.add(movement)

        # Update product current_stock
        product_result = await db.execute(
            select(Product).where(Product.id == item.product_id)
        )
        product = product_result.scalar_one_or_none()
        if product:
            product.current_stock = float(product.current_stock or 0) + float(item.quantity)

    await db.flush()
    await db.refresh(po)
    return PurchaseOrderResponse.model_validate(po)


@router.patch("/{order_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    order_id: uuid.UUID,
    data: PurchaseOrderUpdate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PurchaseOrder)
        .where(
            PurchaseOrder.id == order_id,
            PurchaseOrder.bar_id == current_user.bar_id,
        )
        .options(selectinload(PurchaseOrder.items))
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(po, field, value)

    if data.status == PurchaseOrderStatus.ORDERED:
        po.ordered_at = datetime.utcnow()

    await db.flush()
    await db.refresh(po)
    return PurchaseOrderResponse.model_validate(po)
