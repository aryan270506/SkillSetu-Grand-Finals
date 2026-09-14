from fastapi import APIRouter

router = APIRouter()

@router.get("/dashboard")
def get_recruiter_dashboard():
    return {
        "status": "success",
        "data": {
            "recruiter": {"name": "Sarah Miller", "company": "TechCorp"},
            "stats": {
                "active_jobs": 5,
                "total_applicants": 48,
                "interviews_scheduled": 12
            },
            "recent_applications": [
                {"id": 201, "candidate": "Alex Johnson", "role": "Junior Backend Engineer", "status": "Under Review"},
                {"id": 202, "candidate": "Maria Garcia", "role": "Frontend Developer", "status": "Interview Scheduled"}
            ]
        }
    }

@router.get("/jobs")
def get_job_postings():
    return {
        "status": "success",
        "jobs": [
            {"id": 1, "title": "Junior Backend Engineer (Python/FastAPI)", "location": "Remote", "type": "Full-time"},
            {"id": 2, "title": "Mobile App Developer (React Native)", "location": "Hybrid", "type": "Full-time"}
        ]
    }
