import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import StudentGithubConnection, StudentUser
from app.services import github_service, github_analyzer

import secrets
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import RedirectResponse

router = APIRouter()

# Temporary in-memory CSRF state storage (state -> email)
CSRF_STATES: dict[str, str] = {}


class ConnectGithubRequest(BaseModel):
    email: str
    github_url: str


class AnalyzeReposRequest(BaseModel):
    email: str


class SelectReposRequest(BaseModel):
    email: str
    selected_repo_ids: List[str]


@router.get("/connect")
def initiate_github_oauth(email: str = Query(...)):
    """
    Generate GitHub OAuth authorization URL bound to student email.
    """
    email_clean = email.lower().strip()
    state = secrets.token_hex(16)
    CSRF_STATES[state] = email_clean

    auth_url = github_service.get_authorization_url(state)
    return {
        "status": "success",
        "authorization_url": auth_url,
        "state": state
    }


@router.get("/callback")
def github_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    OAuth Callback handler: Verifies state, exchanges code for access token,
    fetches authenticated GitHub identity, syncs user repositories, and persists connection.
    """
    student_email = CSRF_STATES.pop(state, None)
    if not student_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired CSRF state token."
        )

    token_payload = github_service.exchange_code_for_token(code)
    if not token_payload or "access_token" not in token_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to obtain access token from GitHub."
        )

    access_token = token_payload.get("access_token")
    granted_scope = token_payload.get("scope", "")

    # Retrieve real authenticated GitHub user identity
    gh_user = github_service.fetch_github_user(access_token)
    if not gh_user or "login" not in gh_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to verify authenticated GitHub identity."
        )

    username = gh_user.get("login")
    github_user_id = str(gh_user.get("id"))
    profile_url = gh_user.get("html_url") or f"https://github.com/{username}"
    avatar_url = gh_user.get("avatar_url") or ""

    # Fetch accessible repositories using authenticated token
    repos = github_service.fetch_user_repositories(username, token=access_token)
    skills = github_service.calculate_github_skills(repos)
    default_selected = [r["id"] for r in repos[:2]]

    conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == student_email).first()
    if conn:
        conn.github_user_id = github_user_id
        conn.github_username = username
        conn.github_profile_url = profile_url
        conn.avatar_url = avatar_url
        conn.access_token = access_token
        conn.scope = granted_scope
        conn.connection_status = "CONNECTED"
        conn.repos_json = json.dumps(repos)
        conn.selected_repo_ids = json.dumps(default_selected)
        conn.skills_json = json.dumps(skills)
    else:
        conn = StudentGithubConnection(
            student_email=student_email,
            github_user_id=github_user_id,
            github_username=username,
            github_profile_url=profile_url,
            avatar_url=avatar_url,
            access_token=access_token,
            scope=granted_scope,
            connection_status="CONNECTED",
            repos_json=json.dumps(repos),
            selected_repo_ids=json.dumps(default_selected),
            skills_json=json.dumps(skills)
        )
        db.add(conn)

    # Sync github_user_id to student model
    student = db.query(StudentUser).filter(StudentUser.email == student_email).first()
    if student:
        student.github_user_id = github_user_id or username

    db.commit()

    # Redirect back to frontend profile page with success message
    frontend_redirect_url = f"http://localhost:8081/?github_connected=true&username={username}"
    return RedirectResponse(url=frontend_redirect_url)


@router.get("/status")
def get_github_connection_status(email: str = Query(...), db: Session = Depends(get_db)):
    """
    Get current GitHub connection status and repository data for student.
    """
    conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == email.lower().strip()).first()
    if not conn or conn.connection_status == "DISCONNECTED":
        return {
            "status": "success",
            "connection": {
                "connected": False,
                "status": "NOT_CONNECTED",
                "username": "",
                "profile_url": "",
                "avatar_url": "",
                "metrics": {"reposAnalyzed": 0, "projectsDetected": 0},
                "skills": [],
                "repositories": []
            }
        }

    repos = json.loads(conn.repos_json) if conn.repos_json else []
    selected_ids = json.loads(conn.selected_repo_ids) if conn.selected_repo_ids else [r["id"] for r in repos[:2]]
    skills = json.loads(conn.skills_json) if conn.skills_json else github_service.calculate_github_skills(repos)

    # Attach selection state to repos
    for repo in repos:
        repo["selected"] = repo["id"] in selected_ids or repo.get("name") in selected_ids

    selected_count = sum(1 for r in repos if r.get("selected"))

    return {
        "status": "success",
        "connection": {
            "connected": True,
            "status": conn.connection_status,
            "username": conn.github_username,
            "profile_url": conn.github_profile_url or f"https://github.com/{conn.github_username}",
            "avatar_url": conn.avatar_url or "",
            "metrics": {
                "reposAnalyzed": len(repos),
                "projectsDetected": selected_count
            },
            "skills": skills,
            "repositories": repos
        }
    }


@router.post("/connect-by-url")
def connect_github_by_url(payload: ConnectGithubRequest, db: Session = Depends(get_db)):
    """
    Connect GitHub profile by URL and fetch public repositories.
    """
    email = payload.email.lower().strip()
    url_str = payload.github_url.strip()

    # Extract username from URL
    clean_url = url_str if url_str.startswith("http") else f"https://{url_str}"
    username = ""
    if "github.com/" in clean_url:
        parts = clean_url.split("github.com/")
        if len(parts) > 1:
            username = parts[1].split("/")[0].strip()

    if not username:
        username = url_str.replace("@", "").strip()

    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub profile URL or username."
        )

    # Fetch public repositories for user from GitHub API
    repos = github_service.fetch_user_repositories(username)
    skills = github_service.calculate_github_skills(repos)

    # Mark first 2 repos selected by default if available
    default_selected = [r["id"] for r in repos[:2]]

    conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == email).first()
    if conn:
        conn.github_username = username
        conn.github_profile_url = f"https://github.com/{username}"
        conn.connection_status = "CONNECTED"
        conn.repos_json = json.dumps(repos)
        conn.selected_repo_ids = json.dumps(default_selected)
        conn.skills_json = json.dumps(skills)
    else:
        conn = StudentGithubConnection(
            student_email=email,
            github_username=username,
            github_profile_url=f"https://github.com/{username}",
            connection_status="CONNECTED",
            repos_json=json.dumps(repos),
            selected_repo_ids=json.dumps(default_selected),
            skills_json=json.dumps(skills)
        )
        db.add(conn)

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully connected GitHub profile @{username}",
        "connection": {
            "connected": True,
            "status": "CONNECTED",
            "username": username,
            "profile_url": f"https://github.com/{username}",
            "metrics": {
                "reposAnalyzed": len(repos),
                "projectsDetected": len(default_selected)
            },
            "skills": skills,
            "repositories": repos
        }
    }


@router.post("/repositories/select")
def select_repositories(payload: SelectReposRequest, db: Session = Depends(get_db)):
    """
    Save selected project repository IDs.
    """
    email = payload.email.lower().strip()
    conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == email).first()
    if not conn:
        raise HTTPException(status_code=404, detail="GitHub connection not found.")

    conn.selected_repo_ids = json.dumps(payload.selected_repo_ids)
    db.commit()

    return {
        "status": "success",
        "message": "Saved selected showcase repositories.",
        "selected_repo_ids": payload.selected_repo_ids
    }


@router.post("/refresh")
def refresh_repositories(email: str = Query(...), db: Session = Depends(get_db)):
    """
    Refresh latest accessible repositories from GitHub.
    """
    email_clean = email.lower().strip()
    conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == email_clean).first()
    if not conn or not conn.github_username:
        raise HTTPException(status_code=404, detail="No active GitHub profile found.")

    repos = github_service.fetch_user_repositories(conn.github_username, conn.access_token)
    skills = github_service.calculate_github_skills(repos)

    conn.repos_json = json.dumps(repos)
    conn.skills_json = json.dumps(skills)
    db.commit()

    return {
        "status": "success",
        "message": f"Refreshed {len(repos)} repositories for @{conn.github_username}",
        "repos_count": len(repos),
        "repositories": repos,
        "skills": skills
    }


@router.delete("/disconnect")
def disconnect_github(email: str = Query(...), db: Session = Depends(get_db)):
    """
    Disconnect GitHub account.
    """
    email_clean = email.lower().strip()
    conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == email_clean).first()
    if conn:
        conn.connection_status = "DISCONNECTED"
        conn.repos_json = "[]"
        conn.selected_repo_ids = "[]"
        db.commit()

    return {
        "status": "success",
        "message": "GitHub connection disconnected."
    }



@router.post("/analyze-selected")
def analyze_selected_repositories(payload: AnalyzeReposRequest, db: Session = Depends(get_db)):
    """
    Triggers multi-factor technical analysis across selected student GitHub repositories,
    extracts manifest dependencies, imports, tree architecture, and resolves ESCO canonical skills.
    """
    email = payload.email.lower().strip()
    conn = db.query(StudentGithubConnection).filter(StudentGithubConnection.student_email == email).first()
    if not conn or conn.connection_status == "DISCONNECTED":
        raise HTTPException(status_code=404, detail="No active GitHub profile connected.")

    all_repos = json.loads(conn.repos_json) if conn.repos_json else []
    selected_ids = json.loads(conn.selected_repo_ids) if conn.selected_repo_ids else []

    if not selected_ids:
        selected_ids = [r["id"] for r in all_repos[:3]]

    selected_repos = [r for r in all_repos if str(r.get("id")) in [str(s) for s in selected_ids] or r.get("name") in selected_ids]

    if not selected_repos:
        selected_repos = all_repos[:3]

    skills = github_analyzer.aggregate_repository_evidence(selected_repos, db=db, token=conn.access_token)

    conn.skills_json = json.dumps(skills)
    db.commit()

    return {
        "status": "success",
        "message": f"Analyzed {len(selected_repos)} selected repositories successfully!",
        "repos_analyzed_count": len(selected_repos),
        "skills": skills
    }
