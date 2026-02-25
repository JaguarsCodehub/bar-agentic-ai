from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    User, Product, Shift, ShiftStatus, LossReport,
    LossSeverity, SalesRecord, DailyReconciliation,
)
from app.middleware.auth import require_manager, require_role
from app.models.user import UserRole

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/manager")
async def manager_dashboard(
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Manager dashboard — aggregated daily summary."""
    bar_id = current_user.bar_id
    today = datetime.utcnow().date()
    week_ago = datetime.utcnow() - timedelta(days=7)
    month_ago = datetime.utcnow() - timedelta(days=30)

    # Live stock levels
    stock_result = await db.execute(
        select(Product).where(
            Product.bar_id == bar_id,
            Product.is_active == True,
        ).order_by(Product.current_stock)
    )
    all_products = stock_result.scalars().all()

    low_stock = [
        {"id": str(p.id), "name": p.name, "current_stock": float(p.current_stock),
         "min_threshold": float(p.min_stock_threshold), "category": p.category.value}
        for p in all_products if float(p.current_stock) <= float(p.min_stock_threshold)
    ]

    # Today's loss summary
    today_losses = await db.execute(
        select(LossReport).where(
            LossReport.bar_id == bar_id,
            func.date(LossReport.created_at) == today,
        )
    )
    today_loss_reports = today_losses.scalars().all()
    today_loss_value = sum(float(r.loss_value) for r in today_loss_reports)

    # Unresolved alerts
    unresolved_result = await db.execute(
        select(func.count()).where(
            LossReport.bar_id == bar_id,
            LossReport.reason_code.is_(None),
        )
    )
    unresolved_count = unresolved_result.scalar() or 0

    # Weekly loss trend
    weekly_losses = await db.execute(
        select(
            func.date(LossReport.created_at).label("date"),
            func.sum(LossReport.loss_value).label("total_loss"),
            func.count().label("incidents"),
        ).where(
            LossReport.bar_id == bar_id,
            LossReport.created_at >= week_ago,
        ).group_by(func.date(LossReport.created_at))
        .order_by(func.date(LossReport.created_at))
    )
    loss_trend = [
        {"date": str(row.date), "total_loss": float(row.total_loss), "incidents": row.incidents}
        for row in weekly_losses
    ]

    # Total products & stock value
    total_products = len(all_products)
    total_stock_value = sum(float(p.current_stock) * float(p.cost_price) for p in all_products)

    # Active shift count
    active_shifts_result = await db.execute(
        select(func.count()).where(
            Shift.bar_id == bar_id,
            Shift.status == ShiftStatus.OPEN,
        )
    )
    active_shifts = active_shifts_result.scalar() or 0

    # Monthly total sales
    monthly_sales = await db.execute(
        select(func.coalesce(func.sum(SalesRecord.sale_amount), 0)).where(
            SalesRecord.bar_id == bar_id,
            SalesRecord.created_at >= month_ago,
        )
    )
    monthly_revenue = float(monthly_sales.scalar() or 0)

    return {
        "summary": {
            "total_products": total_products,
            "total_stock_value": round(total_stock_value, 2),
            "active_shifts": active_shifts,
            "monthly_revenue": round(monthly_revenue, 2),
            "today_loss_value": round(today_loss_value, 2),
            "today_loss_incidents": len(today_loss_reports),
            "unresolved_alerts": unresolved_count,
        },
        "low_stock_alerts": low_stock,
        "loss_trend": loss_trend,
    }


@router.get("/owner")
async def owner_dashboard(
    current_user: User = Depends(require_role(UserRole.OWNER)),
    db: AsyncSession = Depends(get_db),
):
    """Owner dashboard — financial overview."""
    bar_id = current_user.bar_id
    month_ago = datetime.utcnow() - timedelta(days=30)
    prev_month_start = datetime.utcnow() - timedelta(days=60)

    # Current month losses
    current_losses = await db.execute(
        select(func.coalesce(func.sum(LossReport.loss_value), 0)).where(
            LossReport.bar_id == bar_id,
            LossReport.created_at >= month_ago,
        )
    )
    current_loss_total = float(current_losses.scalar() or 0)

    # Previous month losses
    prev_losses = await db.execute(
        select(func.coalesce(func.sum(LossReport.loss_value), 0)).where(
            LossReport.bar_id == bar_id,
            LossReport.created_at >= prev_month_start,
            LossReport.created_at < month_ago,
        )
    )
    prev_loss_total = float(prev_losses.scalar() or 0)

    # Loss improvement %
    if prev_loss_total > 0:
        loss_improvement = round(((prev_loss_total - current_loss_total) / prev_loss_total) * 100, 1)
    else:
        loss_improvement = 0

    # Revenue
    current_revenue_result = await db.execute(
        select(func.coalesce(func.sum(SalesRecord.sale_amount), 0)).where(
            SalesRecord.bar_id == bar_id,
            SalesRecord.created_at >= month_ago,
        )
    )
    current_revenue = float(current_revenue_result.scalar() or 0)

    # Stock value
    stock_result = await db.execute(
        select(Product).where(Product.bar_id == bar_id, Product.is_active == True)
    )
    all_products = stock_result.scalars().all()
    stock_value = sum(float(p.current_stock) * float(p.cost_price) for p in all_products)

    # Staff discrepancy rates
    from app.models import User as UserModel
    staff_result = await db.execute(
        select(UserModel).where(UserModel.bar_id == bar_id)
    )
    staff = staff_result.scalars().all()

    staff_performance = []
    for s in staff:
        staff_losses = await db.execute(
            select(func.count(), func.coalesce(func.sum(LossReport.loss_value), 0)).where(
                LossReport.bar_id == bar_id,
                LossReport.shift_id.in_(
                    select(Shift.id).where(Shift.staff_id == s.id)
                ),
                LossReport.created_at >= month_ago,
            )
        )
        row = staff_losses.one()
        staff_performance.append({
            "id": str(s.id),
            "name": s.full_name,
            "role": s.role.value,
            "loss_incidents": row[0],
            "total_loss_value": float(row[1]),
        })

    staff_performance.sort(key=lambda x: x["total_loss_value"], reverse=True)

    return {
        "financials": {
            "current_month_revenue": round(current_revenue, 2),
            "current_month_losses": round(current_loss_total, 2),
            "previous_month_losses": round(prev_loss_total, 2),
            "loss_improvement_pct": loss_improvement,
            "total_stock_value": round(stock_value, 2),
        },
        "staff_performance": staff_performance,
    }
