import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import User, LossReport, LossSeverity, ReasonCode, Product
from app.schemas.loss_report import (
    LossReportResponse, LossReportUpdate, LossReportListResponse, LossSummary,
)
from app.middleware.auth import require_manager

router = APIRouter(prefix="/loss-reports", tags=["Loss Reports"])


@router.get("", response_model=LossReportListResponse)
async def list_loss_reports(
    severity: Optional[LossSeverity] = None,
    reason_code: Optional[ReasonCode] = None,
    unresolved_only: bool = False,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    query = select(LossReport).where(LossReport.bar_id == current_user.bar_id)

    if severity:
        query = query.where(LossReport.severity == severity)
    if reason_code:
        query = query.where(LossReport.reason_code == reason_code)
    if unresolved_only:
        query = query.where(LossReport.reason_code.is_(None))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(LossReport.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    reports = result.scalars().all()

    return LossReportListResponse(
        reports=[LossReportResponse.model_validate(r) for r in reports],
        total=total,
    )


@router.patch("/{report_id}", response_model=LossReportResponse)
async def update_loss_report(
    report_id: uuid.UUID,
    data: LossReportUpdate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Assign a reason code to a loss report (Manager+ only)."""
    result = await db.execute(
        select(LossReport).where(
            LossReport.id == report_id,
            LossReport.bar_id == current_user.bar_id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Loss report not found")

    report.reason_code = data.reason_code
    report.notes = data.notes
    report.reviewed_by = current_user.id
    report.reviewed_at = datetime.utcnow()

    await db.flush()
    await db.refresh(report)
    return LossReportResponse.model_validate(report)


@router.get("/summary", response_model=LossSummary)
async def get_loss_summary(
    days: int = 30,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Get loss summary for the last N days."""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)

    base_query = select(LossReport).where(
        LossReport.bar_id == current_user.bar_id,
        LossReport.created_at >= cutoff,
    )

    result = await db.execute(base_query)
    reports = result.scalars().all()

    total_loss = sum(float(r.loss_value) for r in reports)
    critical = sum(1 for r in reports if r.severity == LossSeverity.CRITICAL)
    warning = sum(1 for r in reports if r.severity == LossSeverity.WARNING)
    info = sum(1 for r in reports if r.severity == LossSeverity.INFO)
    unresolved = sum(1 for r in reports if r.reason_code is None)

    # Top loss products
    product_losses: dict = {}
    for r in reports:
        pid = str(r.product_id)
        if pid not in product_losses:
            product_losses[pid] = {"product_id": pid, "total_loss": 0, "incidents": 0}
        product_losses[pid]["total_loss"] += float(r.loss_value)
        product_losses[pid]["incidents"] += 1

    top_products = sorted(product_losses.values(), key=lambda x: x["total_loss"], reverse=True)[:5]

    # Enrich with product names
    for tp in top_products:
        prod_result = await db.execute(select(Product).where(Product.id == uuid.UUID(tp["product_id"])))
        prod = prod_result.scalar_one_or_none()
        tp["product_name"] = prod.name if prod else "Unknown"

    return LossSummary(
        total_loss_value=total_loss,
        total_incidents=len(reports),
        critical_count=critical,
        warning_count=warning,
        info_count=info,
        unresolved_count=unresolved,
        top_loss_products=top_products,
    )
