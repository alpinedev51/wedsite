from typing import Any, AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from service_wed.config.settings import settings

# BUGFIX: "echo": True was hardcoded, so every environment (including prod)
# logged full SQL statements, including bound parameter values. Now driven by
# settings.debug (see config/settings.py), off by default.
engine_kwargs: dict[str, Any] = {
    "echo": settings.debug,
    "pool_size": 5,
    "max_overflow": 10,
}

engine = create_async_engine(str(settings.database_url), **engine_kwargs)

async_session_maker = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to yield an async database session.
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
