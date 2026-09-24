import os
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Settings(BaseModel):
    PROJECT_NAME: str = "SkillSetu API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["*"]
    
    # PostgreSQL Database URL (Defaulting to port 5431 as running on host)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres@localhost:5432/skillsetu"
    )

    # SMTP Email Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "abhoge5@gmail.com")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "abhoge5@gmail.com")


    # AI Document Extraction Keys
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

    # NPTEL / SWAYAM Ingestion Configuration
    NPTEL_BASE_URL: str = os.getenv("NPTEL_BASE_URL", "https://nptel.ac.in")
    NPTEL_REQUEST_DELAY_SECONDS: float = float(os.getenv("NPTEL_REQUEST_DELAY_SECONDS", "0.2"))
    NPTEL_REQUEST_TIMEOUT_SECONDS: float = float(os.getenv("NPTEL_REQUEST_TIMEOUT_SECONDS", "15.0"))
    NPTEL_MAX_RETRIES: int = int(os.getenv("NPTEL_MAX_RETRIES", "3"))
    NPTEL_BATCH_SIZE: int = int(os.getenv("NPTEL_BATCH_SIZE", "50"))

    # Qdrant Vector DB Configuration
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")
    QDRANT_STORAGE_PATH: str = os.getenv("QDRANT_STORAGE_PATH", "./qdrant_storage")
    QDRANT_COLLECTION_COURSES: str = os.getenv("QDRANT_COLLECTION_COURSES", "skillsetu_courses")

    # Course Embedding Configuration
    COURSE_EMBEDDING_MODEL: str = os.getenv("COURSE_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    COURSE_EMBEDDING_BATCH_SIZE: int = int(os.getenv("COURSE_EMBEDDING_BATCH_SIZE", "16"))

    # freeCodeCamp Ingestion Configuration (Open Curriculum)
    FREECODECAMP_BASE_URL: str = os.getenv("FREECODECAMP_BASE_URL", "https://www.freecodecamp.org")
    FREECODECAMP_REQUEST_TIMEOUT_SECONDS: float = float(os.getenv("FREECODECAMP_REQUEST_TIMEOUT_SECONDS", "15.0"))

    # YouTube Data API Configuration
    YOUTUBE_BASE_URL: str = os.getenv("YOUTUBE_BASE_URL", "https://www.googleapis.com/youtube/v3")
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    YOUTUBE_REQUEST_TIMEOUT_SECONDS: float = float(os.getenv("YOUTUBE_REQUEST_TIMEOUT_SECONDS", "15.0"))
    YOUTUBE_MAX_RESULTS_PER_QUERY: int = int(os.getenv("YOUTUBE_MAX_RESULTS_PER_QUERY", "25"))

    # Provider Synchronization Intervals (Hours)
    NPTEL_SYNC_INTERVAL_HOURS: int = int(os.getenv("NPTEL_SYNC_INTERVAL_HOURS", "12"))
    FREECODECAMP_SYNC_INTERVAL_HOURS: int = int(os.getenv("FREECODECAMP_SYNC_INTERVAL_HOURS", "24"))
    YOUTUBE_SYNC_INTERVAL_HOURS: int = int(os.getenv("YOUTUBE_SYNC_INTERVAL_HOURS", "6"))

settings = Settings()


