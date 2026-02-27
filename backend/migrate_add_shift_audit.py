"""
migrate_add_shift_audit.py
Adds opened_by and closed_by columns to the shifts table.
Safe to run multiple times (uses IF NOT EXISTS).
"""
import asyncio
from sqlalchemy import text
from app.database import engine


async def migrate():
    async with engine.begin() as conn:
        print("Adding opened_by column to shifts...")
        await conn.execute(text("""
            ALTER TABLE shifts
            ADD COLUMN IF NOT EXISTS opened_by UUID REFERENCES users(id);
        """))

        print("Adding closed_by column to shifts...")
        await conn.execute(text("""
            ALTER TABLE shifts
            ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(id);
        """))

        print("✅ Migration complete — shifts table updated with audit columns.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
