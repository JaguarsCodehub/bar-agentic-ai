import asyncio
from app.database import engine, Base
from app.models import *

async def reset_db():
    async with engine.begin() as conn:
        print("Wiping existing database tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Recreating database tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database reset complete! You can now start fresh.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_db())
