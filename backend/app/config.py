from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5432/bar_management"
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8
    UPLOAD_DIR: str = "uploads"
    CORS_ORIGINS: str = "http://localhost:3000"
    MAX_IMAGE_SIZE: int = 5 * 1024 * 1024  # 5MB
    OPENAI_API_KEY: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def get_database_url(self) -> str:
        """
        Handle Render's 'postgres://' vs SQLAlchemy's 'postgresql://' requirements,
        ensure '+asyncpg' is present, and strip 'sslmode' which asyncpg doesn't support.
        """
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        if "postgresql://" in url and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        # asyncpg does not support 'sslmode' in the connection string
        if "?" in url and "sslmode=" in url:
            from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
            u = urlparse(url)
            query = parse_qs(u.query)
            query.pop("sslmode", None)
            url = urlunparse(u._replace(query=urlencode(query, doseq=True)))

        return url


@lru_cache()
def get_settings() -> Settings:
    return Settings()
