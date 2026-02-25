import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import engine, Base
from app.models import *  # noqa: F401,F403 — Import all models so they're registered with Base

from app.routers import (
    auth,
    products,
    suppliers,
    purchase_orders,
    stock_movements,
    shifts,
    sales_records,
    reconciliation,
    loss_reports,
    dashboard,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "products"), exist_ok=True)

    yield

    # Cleanup on shutdown
    await engine.dispose()


app = FastAPI(
    title="Bar Management System",
    description="Phase 1 — Core Inventory & Loss Detection Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists before mounting
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "products"), exist_ok=True)

# Static files for uploaded images
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API routes
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(products.router, prefix=API_PREFIX)
app.include_router(suppliers.router, prefix=API_PREFIX)
app.include_router(purchase_orders.router, prefix=API_PREFIX)
app.include_router(stock_movements.router, prefix=API_PREFIX)
app.include_router(shifts.router, prefix=API_PREFIX)
app.include_router(sales_records.router, prefix=API_PREFIX)
app.include_router(reconciliation.router, prefix=API_PREFIX)
app.include_router(loss_reports.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)


@app.get("/")
async def root():
    return {
        "name": "Bar Management System",
        "version": "1.0.0",
        "phase": "Phase 1 — Core Platform",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
