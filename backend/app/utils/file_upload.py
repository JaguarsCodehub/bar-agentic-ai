import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from PIL import Image
import io

from app.config import get_settings

settings = get_settings()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def get_upload_dir(subfolder: str = "products") -> Path:
    upload_path = Path(settings.UPLOAD_DIR) / subfolder
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


async def save_upload_file(file: UploadFile, subfolder: str = "products") -> str:
    """Save an uploaded image file and return the relative path."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read and validate file size
    content = await file.read()
    if len(content) > settings.MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {settings.MAX_IMAGE_SIZE // (1024*1024)}MB",
        )

    # Validate it's a real image
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file",
        )

    # Generate unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    upload_dir = get_upload_dir(subfolder)
    file_path = upload_dir / unique_name

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Return relative path for URL construction
    return f"/{settings.UPLOAD_DIR}/{subfolder}/{unique_name}"


def delete_upload_file(file_path: str) -> None:
    """Delete an uploaded file by its relative path."""
    if file_path:
        full_path = Path(file_path.lstrip("/"))
        if full_path.exists():
            full_path.unlink()
