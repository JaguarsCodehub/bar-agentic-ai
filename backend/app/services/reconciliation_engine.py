from datetime import datetime
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Product, Shift, ShiftStockCount, SalesRecord,
    StockMovement, MovementType, DailyReconciliation,
    LossReport, LossSeverity,
)


async def run_reconciliation(db: AsyncSession, bar_id, shift_id):
    """
    Run the reconciliation engine for a specific shift.
    Calculates expected vs actual closing stock for every product
    and generates loss reports for discrepancies above threshold.

    This runs SYNCHRONOUSLY on shift close. (Celery deferred to Phase 2)
    """
    # Get all stock counts for this shift
    counts_result = await db.execute(
        select(ShiftStockCount).where(ShiftStockCount.shift_id == shift_id)
    )
    stock_counts = counts_result.scalars().all()

    reconciliation_records = []
    loss_reports = []

    for count in stock_counts:
        if count.closing_count is None:
            continue  # Skip products without closing count

        product_result = await db.execute(
            select(Product).where(Product.id == count.product_id)
        )
        product = product_result.scalar_one_or_none()
        if not product:
            continue

        # Get stock received during shift (IN movements)
        received_result = await db.execute(
            select(func.coalesce(func.sum(StockMovement.quantity), 0)).where(
                StockMovement.product_id == count.product_id,
                StockMovement.bar_id == bar_id,
                StockMovement.type == MovementType.IN,
                StockMovement.created_at >= (
                    select(Shift.start_time).where(Shift.id == shift_id).scalar_subquery()
                ),
                StockMovement.created_at <= (
                    select(Shift.end_time).where(Shift.id == shift_id).scalar_subquery()
                ),
            )
        )
        received = float(received_result.scalar() or 0)

        # Get total sold during shift
        sold_result = await db.execute(
            select(func.coalesce(func.sum(SalesRecord.quantity_sold), 0)).where(
                SalesRecord.product_id == count.product_id,
                SalesRecord.shift_id == shift_id,
            )
        )
        sold = float(sold_result.scalar() or 0)

        opening = float(count.opening_count)
        actual_closing = float(count.closing_count)
        expected_closing = opening + received - sold
        discrepancy = expected_closing - actual_closing

        # Create reconciliation record
        recon = DailyReconciliation(
            bar_id=bar_id,
            shift_id=shift_id,
            product_id=count.product_id,
            date=datetime.utcnow().date(),
            opening_stock=opening,
            received=received,
            sold=sold,
            expected_closing=expected_closing,
            actual_closing=actual_closing,
            discrepancy=discrepancy,
        )
        db.add(recon)
        await db.flush()
        reconciliation_records.append(recon)

        # Check if discrepancy exceeds threshold
        threshold = float(product.min_stock_threshold) * 0.1  # 10% of min threshold as loss threshold
        if threshold < 0.5:
            threshold = 0.5  # Minimum threshold of 0.5

        if abs(discrepancy) > threshold:
            # Determine severity
            if abs(discrepancy) > threshold * 3:
                severity = LossSeverity.CRITICAL
            elif abs(discrepancy) > threshold * 1.5:
                severity = LossSeverity.WARNING
            else:
                severity = LossSeverity.INFO

            loss_value = abs(discrepancy) * float(product.cost_price)

            loss = LossReport(
                bar_id=bar_id,
                reconciliation_id=recon.id,
                product_id=count.product_id,
                shift_id=shift_id,
                discrepancy_quantity=abs(discrepancy),
                loss_value=loss_value,
                severity=severity,
            )
            db.add(loss)
            loss_reports.append(loss)

        # Update product current stock to actual closing count
        product.current_stock = actual_closing

    await db.flush()
    return reconciliation_records, loss_reports
