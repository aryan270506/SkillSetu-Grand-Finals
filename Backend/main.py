from dotenv import load_dotenv
load_dotenv()

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import student, recruiter, admin, taxonomy, github, courses, learning_paths, skill_evidence, mentor, internships, scholarships, assessment
from app import models
from app.services.init_db_service import init_system_on_startup

import asyncio
import os
from app.services import job_queue_service
from app.services import ai_recruitment_orchestrator  # registers durable queue job handlers

logger = logging.getLogger("skillsetu_backend")

async def _background_queue_worker():
    worker_id = f"worker_pid_{os.getpid()}"
    logger.info(f"Started durable recruitment queue worker ({worker_id})")
    iteration = 0
    while not job_queue_service.is_shutdown_requested():
        try:
            processed = job_queue_service.process_queue_iteration(worker_id)
            if not processed:
                await asyncio.sleep(1.0)
            else:
                await asyncio.sleep(0.05)

            iteration += 1
            if iteration % 60 == 0:
                job_queue_service.reap_stale_jobs(stale_threshold_seconds=300)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in queue worker loop: {e}")
            await asyncio.sleep(2.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Create tables, seed ESCO dataset into PostgreSQL, seed providers, download AI model
    init_system_on_startup()
    worker_task = asyncio.create_task(_background_queue_worker())
    yield
    # 2. Shutdown
    job_queue_service.stop_worker_loop()
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
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

from fastapi.staticfiles import StaticFiles
import os

# Ensure uploads directory exists and mount static files
os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/resumes", exist_ok=True)
os.makedirs("uploads/marksheets", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(student.router, prefix=f"{settings.API_V1_STR}/student", tags=["Student"])
app.include_router(mentor.router, prefix=f"{settings.API_V1_STR}/mentor", tags=["Personal AI Career Mentor"])
app.include_router(skill_evidence.router, prefix=f"{settings.API_V1_STR}/student/skill-evidence", tags=["Skill Evidence"])
app.include_router(recruiter.router, prefix=f"{settings.API_V1_STR}/recruiter", tags=["Recruiter"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Admin"])
app.include_router(taxonomy.router, prefix=f"{settings.API_V1_STR}/taxonomy", tags=["Taxonomy"])
app.include_router(github.router, prefix=f"{settings.API_V1_STR}/github", tags=["GitHub"])
app.include_router(courses.router, prefix=f"{settings.API_V1_STR}/courses", tags=["Courses"])
app.include_router(learning_paths.router, prefix=f"{settings.API_V1_STR}/learning-paths", tags=["Learning Paths"])
app.include_router(internships.router, prefix=f"{settings.API_V1_STR}/internships", tags=["Internships"])
app.include_router(scholarships.router, prefix=f"{settings.API_V1_STR}/scholarships", tags=["Scholarships"])
app.include_router(assessment.router, prefix=f"{settings.API_V1_STR}", tags=["AI Assessment System"])

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
