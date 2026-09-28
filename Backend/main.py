from dotenv import load_dotenv
load_dotenv()

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import student, recruiter, admin, taxonomy, github, courses, learning_paths, skill_evidence
from app import models
from app.services.init_db_service import init_system_on_startup

logger = logging.getLogger("skillsetu_backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Create tables, seed ESCO dataset into PostgreSQL, seed providers, download AI model
    init_system_on_startup()
    yield
    # 2. Shutdown
    logger.info("SkillSetu Backend shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)


# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(student.router, prefix=f"{settings.API_V1_STR}/student", tags=["Student"])
app.include_router(skill_evidence.router, prefix=f"{settings.API_V1_STR}/student/skill-evidence", tags=["Skill Evidence"])
app.include_router(recruiter.router, prefix=f"{settings.API_V1_STR}/recruiter", tags=["Recruiter"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])
app.include_router(taxonomy.router, prefix=f"{settings.API_V1_STR}/taxonomy", tags=["Taxonomy"])
app.include_router(github.router, prefix=f"{settings.API_V1_STR}/github", tags=["GitHub"])
app.include_router(courses.router, prefix=f"{settings.API_V1_STR}/courses", tags=["Courses"])
app.include_router(learning_paths.router, prefix=f"{settings.API_V1_STR}/learning-paths", tags=["Learning Paths"])

@app.get("/")
def root():
    return {
        "message": "Welcome to SkillSetu API",
        "docs": "/docs",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
