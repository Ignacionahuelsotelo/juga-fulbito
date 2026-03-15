import json
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Juga Fulbito API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/jugafulbito"

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else [v]
            except json.JSONDecodeError:
                # Support comma-separated: "https://a.com,https://b.com"
                return [origin.strip() for origin in v.split(",")]
        return v

    # File uploads
    MAX_AVATAR_SIZE_MB: int = 5
    UPLOAD_DIR: str = "./uploads"

    # Geo
    DEFAULT_SEARCH_RADIUS_KM: float = 5.0

    # AI / LangChain
    OPENAI_API_KEY: str = ""
    AI_MODEL_NAME: str = "gpt-4o-mini"
    AI_TEMPERATURE: float = 0.3

    # Production
    ENVIRONMENT: str = "development"  # development | production

    class Config:
        env_file = ".env"


settings = Settings()
