from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, UserRole, Bar
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse,
    UserResponse, CreateStaffRequest,
)
from app.middleware.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_manager,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new owner with their bar."""
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create bar
    bar = Bar(name=data.bar_name)
    db.add(bar)
    await db.flush()

    # Create owner user
    user = User(
        bar_id=bar.id,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.OWNER,
    )
    db.add(user)
    await db.flush()

    # Generate token
    token = create_access_token(str(user.id), str(bar.id), user.role.value)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Login with email and password."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = create_access_token(str(user.id), str(user.bar_id), user.role.value)

    # Set HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=8 * 3600,  # 8 hours
        samesite="lax",
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear auth cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse.model_validate(current_user)


@router.post("/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    data: CreateStaffRequest,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Create a new staff member for the current bar (Manager+ only)."""
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Only owners can create managers
    if data.role == UserRole.MANAGER and current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only owners can create managers")

    if data.role == UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Cannot create another owner")

    user = User(
        bar_id=current_user.bar_id,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)
    await db.flush()

    return UserResponse.model_validate(user)


@router.get("/staff", response_model=list[UserResponse])
async def list_staff(
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """List all staff for the current bar."""
    result = await db.execute(
        select(User).where(User.bar_id == current_user.bar_id).order_by(User.full_name)
    )
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]
