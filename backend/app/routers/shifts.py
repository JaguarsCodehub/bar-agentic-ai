import uuid
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.models import User, Shift, ShiftStockCount, ShiftStatus, Product
from app.models.sales_record import SalesRecord
from app.schemas.shift import (
    ShiftOpenRequest, ShiftCloseRequest, ShiftResponse, ShiftListResponse,
    DailyShiftEntry, DailyShiftsResponse,
)
from app.middleware.auth import get_current_user, require_manager
from app.services.reconciliation_engine import run_reconciliation

router = APIRouter(prefix="/shifts", tags=["Shifts"])


def _build_shift_response(shift: Shift, sales_count: int = 0) -> ShiftResponse:
    """Convert a Shift ORM object to ShiftResponse, computing derived fields."""
    duration_hours = None
    if shift.end_time and shift.start_time:
        delta = shift.end_time - shift.start_time
        duration_hours = round(delta.total_seconds() / 3600, 2)

    return ShiftResponse(
        id=shift.id,
        bar_id=shift.bar_id,
        staff_id=shift.staff_id,
        staff_name=shift.staff.full_name if shift.staff else None,
        opened_by=shift.opened_by,
        opened_by_name=shift.opener.full_name if shift.opener else None,
        closed_by=shift.closed_by,
        closed_by_name=shift.closer.full_name if shift.closer else None,
        start_time=shift.start_time,
        end_time=shift.end_time,
        status=shift.status,
        notes=shift.notes,
        created_at=shift.created_at,
        duration_hours=duration_hours,
        stock_counts=[
            {
                "id": sc.id,
                "product_id": sc.product_id,
                "opening_count": float(sc.opening_count),
                "closing_count": float(sc.closing_count) if sc.closing_count is not None else None,
            }
            for sc in (shift.stock_counts or [])
        ],
    )


SHIFT_LOAD_OPTIONS = [
    selectinload(Shift.stock_counts),
    selectinload(Shift.staff),
    selectinload(Shift.opener),
    selectinload(Shift.closer),
]


@router.get("/daily", response_model=DailyShiftsResponse)
async def get_daily_shifts(
    date_str: Optional[str] = Query(None, alias="date", description="Date in YYYY-MM-DD format (default: today)"),
    staff_id: Optional[uuid.UUID] = Query(None, description="Filter by staff member UUID"),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Get all shifts for a specific date with duration & audit info. Manager+ only."""
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else datetime.utcnow().date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    day_start = datetime.combine(target_date, datetime.min.time())
    day_end = datetime.combine(target_date, datetime.max.time())

    query = (
        select(Shift)
        .where(
            Shift.bar_id == current_user.bar_id,
            Shift.start_time >= day_start,
            Shift.start_time <= day_end,
        )
        .options(*SHIFT_LOAD_OPTIONS)
        .order_by(Shift.start_time)
    )

    if staff_id:
        query = query.where(Shift.staff_id == staff_id)

    result = await db.execute(query)
    shifts = result.scalars().all()

    # Get sales counts per shift
    shift_ids = [s.id for s in shifts]
    sales_counts: dict = {}
    if shift_ids:
        sales_q = await db.execute(
            select(SalesRecord.shift_id, func.count(SalesRecord.id).label("cnt"))
            .where(SalesRecord.shift_id.in_(shift_ids))
            .group_by(SalesRecord.shift_id)
        )
        for row in sales_q.all():
            sales_counts[row.shift_id] = row.cnt

    entries = []
    total_hours = 0.0
    open_count = 0
    for shift in shifts:
        duration_hours = None
        if shift.end_time and shift.start_time:
            delta = shift.end_time - shift.start_time
            duration_hours = round(delta.total_seconds() / 3600, 2)
            total_hours += duration_hours

        if shift.status == ShiftStatus.OPEN:
            open_count += 1

        entries.append(DailyShiftEntry(
            id=shift.id,
            staff_id=shift.staff_id,
            staff_name=shift.staff.full_name if shift.staff else "Unknown",
            opened_by=shift.opened_by,
            opened_by_name=shift.opener.full_name if shift.opener else None,
            closed_by=shift.closed_by,
            closed_by_name=shift.closer.full_name if shift.closer else None,
            start_time=shift.start_time,
            end_time=shift.end_time,
            status=shift.status,
            notes=shift.notes,
            duration_hours=duration_hours,
            sales_count=sales_counts.get(shift.id, 0),
        ))

    return DailyShiftsResponse(
        date=str(target_date),
        shifts=entries,
        total_shifts=len(entries),
        total_hours_worked=round(total_hours, 2),
        open_shifts_count=open_count,
    )


@router.get("", response_model=ShiftListResponse)
async def list_shifts(
    shift_status: Optional[ShiftStatus] = None,
    staff_id: Optional[uuid.UUID] = Query(None, description="Filter by staff member UUID"),
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List shifts for the bar."""
    query = select(Shift).where(Shift.bar_id == current_user.bar_id)

    if shift_status:
        query = query.where(Shift.status == shift_status)

    if staff_id:
        query = query.where(Shift.staff_id == staff_id)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = (
        query.options(*SHIFT_LOAD_OPTIONS)
        .order_by(Shift.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    result = await db.execute(query)
    shifts = result.scalars().all()

    return ShiftListResponse(
        shifts=[_build_shift_response(s) for s in shifts],
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
        opened_by=current_user.id,
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

    # Reload with relations
    result = await db.execute(
        select(Shift).where(Shift.id == shift.id).options(*SHIFT_LOAD_OPTIONS)
    )
    shift = result.scalar_one()
    return _build_shift_response(shift)


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
        .options(*SHIFT_LOAD_OPTIONS)
    )
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.status == ShiftStatus.CLOSED:
        raise HTTPException(status_code=400, detail="Shift already closed")

    # Update closing counts
    for stock_entry in data.stock_counts:
        for count in shift.stock_counts:
            if count.product_id == stock_entry.product_id:
                count.closing_count = stock_entry.count
                break
        else:
            count = ShiftStockCount(
                shift_id=shift.id,
                product_id=stock_entry.product_id,
                opening_count=0,
                closing_count=stock_entry.count,
            )
            db.add(count)

    shift.status = ShiftStatus.CLOSED
    shift.end_time = datetime.utcnow()
    shift.closed_by = current_user.id
    if data.notes:
        shift.notes = (shift.notes or "") + "\n" + data.notes

    await db.flush()

    # Run reconciliation synchronously
    await run_reconciliation(db, current_user.bar_id, shift.id)

    # Reload
    result = await db.execute(
        select(Shift).where(Shift.id == shift.id).options(*SHIFT_LOAD_OPTIONS)
    )
    shift = result.scalar_one()
    return _build_shift_response(shift)


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
        .options(*SHIFT_LOAD_OPTIONS)
    )
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return _build_shift_response(shift)
