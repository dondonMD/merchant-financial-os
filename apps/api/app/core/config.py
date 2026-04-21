from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ZB Vaka API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://zbvaka:zbvaka@localhost:5432/zbvaka"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = Field(default="zb-vaka-demo-secret-2026", min_length=16)
    access_token_minutes: int = 30
    refresh_token_days: int = 14
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://127.0.0.1:3002"
    cors_origin_regex: str | None = None
    frontend_url: str = "http://localhost:3002"
    seed_admin_email: str = "admin@zbvaka.co.zw"
    seed_admin_password: str = "Admin123!"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
