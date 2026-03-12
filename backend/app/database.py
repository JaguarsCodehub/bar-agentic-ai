from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Handle SSL for Render/Production databases
connect_args = {}
db_url = settings.get_database_url()
if "localhost" not in db_url and "127.0.0.1" not in db_url:
    # asyncpg requires 'ssl' instead of 'sslmode'
    connect_args["ssl"] = True

engine = create_async_engine(
    db_url,
    echo=False,
    pool_size=20,
    max_overflow=10,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
