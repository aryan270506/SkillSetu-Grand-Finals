from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import student, recruiter, taxonomy, github
from app import models

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
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
app.include_router(recruiter.router, prefix=f"{settings.API_V1_STR}/recruiter", tags=["Recruiter"])
app.include_router(taxonomy.router, prefix=f"{settings.API_V1_STR}/taxonomy", tags=["Taxonomy"])
app.include_router(github.router, prefix=f"{settings.API_V1_STR}/github", tags=["GitHub"])

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
