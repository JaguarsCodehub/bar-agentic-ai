import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.models import User, Shift, ShiftStockCount, ShiftStatus, Product
from app.schemas.shift import (
    ShiftOpenRequest, ShiftCloseRequest, ShiftResponse, ShiftListResponse,
)
from app.middleware.auth import get_current_user, require_manager
from app.services.reconciliation_engine import run_reconciliation

router = APIRouter(prefix="/shifts", tags=["Shifts"])


@router.get("", response_model=ShiftListResponse)
async def list_shifts(
    shift_status: Optional[ShiftStatus] = None,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List shifts for the bar."""
    query = select(Shift).where(Shift.bar_id == current_user.bar_id)

    if shift_status:
        query = query.where(Shift.status == shift_status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = (
        query.options(selectinload(Shift.stock_counts))
        .order_by(Shift.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    shifts = result.scalars().all()

    return ShiftListResponse(
        shifts=[ShiftResponse.model_validate(s) for s in shifts],
        total=total,
    )


@router.post("/open", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
async def open_shift(
    data: ShiftOpenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Open a new shift with opening stock counts."""
    # Check no open shift exists for this user
    existing = await db.execute(
        select(Shift).where(
            Shift.bar_id == current_user.bar_id,
            Shift.staff_id == current_user.id,
            Shift.status == ShiftStatus.OPEN,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already have an open shift. Close it first.")

    shift = Shift(
        bar_id=current_user.bar_id,
        staff_id=current_user.id,
        notes=data.notes,
    )
    db.add(shift)
    await db.flush()

    # Create opening stock counts
    for stock in data.stock_counts:
        count = ShiftStockCount(
            shift_id=shift.id,
            product_id=stock.product_id,
            opening_count=stock.count,
        )
        db.add(count)

    await db.flush()

    # Reload with counts
    result = await db.execute(
        select(Shift).where(Shift.id == shift.id).options(selectinload(Shift.stock_counts))
    )
    shift = result.scalar_one()
    return ShiftResponse.model_validate(shift)


@router.post("/{shift_id}/close", response_model=ShiftResponse)
async def close_shift(
    shift_id: uuid.UUID,
    data: ShiftCloseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Close a shift with closing stock counts. Triggers reconciliation synchronously."""
    result = await db.execute(
        select(Shift)
        .where(
            Shift.id == shift_id,
            Shift.bar_id == current_user.bar_id,
        )
        .options(selectinload(Shift.stock_counts))
    )
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.status == ShiftStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Shift already closed")

    # Update closing counts
    for stock_entry in data.stock_counts:
        # Find matching stock count record
        for count in shift.stock_counts:
            if count.product_id == stock_entry.product_id:
                count.closing_count = stock_entry.count
                break
        else:
            # Product wasn't in opening counts — add it
            count = ShiftStockCount(
                shift_id=shift.id,
                product_id=stock_entry.product_id,
                opening_count=0,
                closing_count=stock_entry.count,
            )
            db.add(count)

    shift.status = ShiftStatus.CLOSED
    shift.end_time = datetime.utcnow()
    if data.notes:
        shift.notes = (shift.notes or "") + "\n" + data.notes

    await db.flush()

    # Run reconciliation synchronously
    await run_reconciliation(db, current_user.bar_id, shift.id)

    # Reload
    result = await db.execute(
        select(Shift).where(Shift.id == shift.id).options(selectinload(Shift.stock_counts))
    )
    shift = result.scalar_one()
    return ShiftResponse.model_validate(shift)


@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Shift)
        .where(
            Shift.id == shift_id,
            Shift.bar_id == current_user.bar_id,
        )
        .options(selectinload(Shift.stock_counts))
    )
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return ShiftResponse.model_validate(shift)
