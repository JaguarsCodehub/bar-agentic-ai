import uuid
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import User, SalesRecord, Product, Shift
from app.schemas.sales_record import (
    SalesRecordCreate, SalesRecordBulkCreate, SalesRecordResponse, SalesRecordListResponse,
)
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/sales", tags=["Sales Records"])


@router.get("", response_model=SalesRecordListResponse)
async def list_sales(
    shift_id: Optional[uuid.UUID] = None,
    product_id: Optional[uuid.UUID] = None,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(SalesRecord).where(SalesRecord.bar_id == current_user.bar_id)
    if shift_id:
        query = query.where(SalesRecord.shift_id == shift_id)
    if product_id:
        query = query.where(SalesRecord.product_id == product_id)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(SalesRecord.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()

    return SalesRecordListResponse(
        records=[SalesRecordResponse.model_validate(r) for r in records],
        total=total,
    )


@router.post("", response_model=SalesRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_sales_record(
    data: SalesRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a single sales record."""
    record = SalesRecord(
        bar_id=current_user.bar_id,
        product_id=data.product_id,
        shift_id=data.shift_id,
        quantity_sold=data.quantity_sold,
        sale_amount=data.sale_amount,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return SalesRecordResponse.model_validate(record)


@router.post("/bulk", response_model=list[SalesRecordResponse], status_code=status.HTTP_201_CREATED)
async def create_bulk_sales(
    data: SalesRecordBulkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple sales records at once."""
    records = []
    for item in data.records:
        record = SalesRecord(
            bar_id=current_user.bar_id,
            product_id=item.product_id,
            shift_id=item.shift_id,
            quantity_sold=item.quantity_sold,
            sale_amount=item.sale_amount,
        )
        db.add(record)
        records.append(record)

    await db.flush()
    for r in records:
        await db.refresh(r)

    return [SalesRecordResponse.model_validate(r) for r in records]


@router.post("/import-csv", status_code=status.HTTP_201_CREATED)
async def import_sales_csv(
    shift_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import sales from CSV. Expected columns: product_name, quantity_sold, sale_amount"""
    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    created = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            product_name = row.get("product_name", "").strip()
            qty = float(row.get("quantity_sold", 0))
            amount = float(row.get("sale_amount", 0))

            # Find product by name
            result = await db.execute(
                select(Product).where(
                    Product.bar_id == current_user.bar_id,
                    Product.name.ilike(product_name),
                )
            )
            product = result.scalar_one_or_none()
            if not product:
                errors.append(f"Row {row_num}: Product '{product_name}' not found")
                continue

            record = SalesRecord(
                bar_id=current_user.bar_id,
                product_id=product.id,
                shift_id=shift_id,
                quantity_sold=qty,
                sale_amount=amount,
            )
            db.add(record)
            created += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    await db.flush()
    return {"created": created, "errors": errors}
