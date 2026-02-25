import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.database import get_db
from app.models import User, DailyReconciliation
from app.schemas.reconciliation import ReconciliationResponse, ReconciliationListResponse
from app.middleware.auth import require_manager

router = APIRouter(prefix="/reconciliation", tags=["Reconciliation"])


@router.get("", response_model=ReconciliationListResponse)
async def list_reconciliations(
    shift_id: Optional[uuid.UUID] = None,
    product_id: Optional[uuid.UUID] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    query = select(DailyReconciliation).where(
        DailyReconciliation.bar_id == current_user.bar_id
    )

    if shift_id:
        query = query.where(DailyReconciliation.shift_id == shift_id)
    if product_id:
        query = query.where(DailyReconciliation.product_id == product_id)
    if date_from:
        query = query.where(DailyReconciliation.date >= date_from)
    if date_to:
        query = query.where(DailyReconciliation.date <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(DailyReconciliation.date.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()

    return ReconciliationListResponse(
        reconciliations=[ReconciliationResponse.model_validate(r) for r in records],
        total=total,
    )
