"""
Asynchronous database connection and session management.

# Async/Await — allows the server to perform non-blocking database queries while serving other web requests.
# SQLAlchemy Engine — the central connection factory between Python and the underlying SQLite/Postgres database.
# AsyncSession — the temporary workspace where database operations (SELECT, INSERT, UPDATE) are executed.
# Dependency Injection — a pattern where FastAPI automatically provides a database session to each API endpoint.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from backend.core.config import settings
from backend.core.logging import logger
from backend.database.models import Base

# Create the asynchronous engine
# connect_args={"check_same_thread": False} is required specifically for SQLite to allow multi-threaded access.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args=connect_args,
    future=True,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db() -> None:
    """
    Initializes the database schema by creating all registered tables.
    Runs once on backend startup.
    """
    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schema initialized successfully.")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async database session for the duration of a web request.
    Automatically closes the session when the request finishes.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
