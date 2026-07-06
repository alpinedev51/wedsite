# pydantic-settings: db/redis URLs, Resend key, secret keys, RSVP
from pydantic import AliasChoices, Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: PostgresDsn = Field(
        default=PostgresDsn(
            "postgresql+asyncpg://wedding_db_user:wedding_db_pw@localhost:5432/wedding_db"
        ),
        validation_alias=AliasChoices("DATABASE_URL"),
    )
    # BUGFIX: default was "redis://localhost:6739" -- 6379 is redis's actual
    # default port (and what .env / docker-compose.yml both use); this stale
    # typo'd default only matters if REDIS_DSN/REDIS_URL is ever unset, but
    # it had already propagated into docker-compose.yml as if 6739 were
    # intentional. Fixed at the source instead of leaving it to keep spreading.
    redis_dsn: RedisDsn = Field(
        default=RedisDsn("redis://localhost:6379"),
        validation_alias=AliasChoices("REDIS_DSN", "REDIS_URL"),
    )

    debug: bool = Field(default=False, validation_alias=AliasChoices("DEBUG"))

    resend_api_key: str | None = Field(
        default=None, validation_alias=AliasChoices("RESEND_API_KEY")
    )
    resend_from_address: str = Field(
        default="wedding@example.com",
        validation_alias=AliasChoices("RESEND_FROM_ADDRESS"),
    )

    session_cookie_name: str = Field(
        default="admin_session", validation_alias=AliasChoices("SESSION_COOKIE_NAME")
    )


settings = Settings()
