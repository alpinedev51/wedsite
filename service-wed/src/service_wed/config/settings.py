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
    redis_dsn: RedisDsn = Field(
        default=RedisDsn("redis://localhost:6739"),
        validation_alias=AliasChoices("REDIS_DSN", "REDIS_URL"),
    )


settings = Settings()
