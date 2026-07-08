# pydantic-settings: db/redis URLs, Resend key, secret keys, RSVP
from pydantic import AliasChoices, Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: PostgresDsn = Field(
        default=PostgresDsn(
            "postgresql+asyncpg://wedding_db_user:wedding_db_pw@db:5432/wedding_db"
        ),
        validation_alias=AliasChoices("DATABASE_URL"),
    )
    redis_dsn: RedisDsn = Field(
        default=RedisDsn("redis://redis:6379"),
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

    # Base URL of the deployed frontend -- used only to build a full RSVP
    # link (f"{public_site_url}/rsvp/{token}") inside email templates
    # (services/campaigns.py's build_email_message). Not read by anything
    # else; unrelated to CORS_ALLOW_ORIGINS above (that's about which
    # origins may call this API, this is just a string interpolated into
    # outgoing email HTML).
    public_site_url: str = Field(
        default="http://localhost:5173", validation_alias=AliasChoices("PUBLIC_SITE_URL")
    )

    # Comma-separated, not a JSON list: pydantic-settings would otherwise
    # require env/​.env values for a `list[str]` field to be JSON-encoded
    # (e.g. '["http://a"]'), which is an awkward thing to hand-write in a
    # .env file. Parsed into a real list by cors_allow_origins_list below.
    cors_allow_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        validation_alias=AliasChoices("CORS_ALLOW_ORIGINS"),
    )

    # Signing secret for Resend's webhook callbacks (Svix scheme: see
    # controllers/v1/webhooks.py). None in local dev without a live Resend
    # account -- signature verification is skipped (with a warning) when
    # unset, and enforced once this is configured.
    resend_webhook_secret: str | None = Field(
        default=None, validation_alias=AliasChoices("RESEND_WEBHOOK_SECRET")
    )

    @property
    def cors_allow_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allow_origins.split(",")
            if origin.strip()
        ]


settings = Settings()
