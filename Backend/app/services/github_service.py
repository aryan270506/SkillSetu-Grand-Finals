import os
import httpx
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models import StudentGithubConnection, StudentUser

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_CALLBACK_URL = os.getenv("GITHUB_CALLBACK_URL", "http://localhost:8000/api/v1/github/callback")


def get_authorization_url(state: str) -> str:
    """
    Generate GitHub OAuth authorization URL with CSRF state protection.
    """
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_CALLBACK_URL,
        "scope": "read:user repo",
        "state": state,
    }
    encoded = "&".join(f"{k}={v}" for k, v in params.items() if v)
    return f"https://github.com/login/oauth/authorize?{encoded}"


def exchange_code_for_token(code: str) -> Optional[Dict[str, Any]]:
    """
    Exchange authorization code for access token and granted scopes.
    """
    url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_CALLBACK_URL,
    }
    try:
        res = httpx.post(url, json=data, headers=headers, timeout=10)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"Error exchanging GitHub code: {e}")
    return None


def fetch_github_user(token: str) -> Optional[Dict[str, Any]]:
    """
    Fetch authenticated GitHub user details using Bearer token.
    """
    url = "https://api.github.com/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "SkillSetu-App"
    }
    try:
        res = httpx.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"Error fetching GitHub user profile: {e}")
    return None


def fetch_user_repositories(username: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all accessible repositories (handling pagination up to >100 repos).
    """
    repos = []
    page = 1
    per_page = 100

    from app.config import settings
    tok = token or settings.GITHUB_TOKEN

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "SkillSetu-App"
    }
    if tok:
        headers["Authorization"] = f"Bearer {tok}"

    base_url = f"https://api.github.com/user/repos" if token else f"https://api.github.com/users/{username}/repos"

    while True:
        try:
            url = f"{base_url}?per_page={per_page}&page={page}&sort=updated"
            res = httpx.get(url, headers=headers, timeout=10)
            if res.status_code != 200:
                break
            batch = res.json()
            if not isinstance(batch, list) or len(batch) == 0:
                break

            for item in batch:
                repos.append({
                    "id": str(item.get("id")),
                    "name": item.get("name", ""),
                    "full_name": item.get("full_name", ""),
                    "description": item.get("description", "") or "No description provided.",
                    "html_url": item.get("html_url", ""),
                    "private": item.get("private", False),
                    "fork": item.get("fork", False),
                    "archived": item.get("archived", False),
                    "language": item.get("language", "Code"),
                    "tags": [item.get("language")] if item.get("language") else ["Repository"],
                    "stars": item.get("stargazers_count", 0),
                    "forks": item.get("forks_count", 0),
                    "updated_at": item.get("updated_at", "")[:10] if item.get("updated_at") else "",
                    "pushed_at": item.get("pushed_at", "")[:10] if item.get("pushed_at") else "",
                })

            if len(batch) < per_page:
                break
            page += 1
        except Exception as e:
            print(f"Error fetching GitHub repos page {page}: {e}")
            break

    return repos


def calculate_github_skills(repos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Derive skill evidence from actual repository language distribution.
    """
    lang_counts: Dict[str, int] = {}
    for r in repos:
        lang = r.get("language")
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

    total = sum(lang_counts.values())
    if total == 0:
        return []

    skills = []
    for lang, count in sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
        pct = min(98, max(50, int((count / total) * 100)))
        rating = "Expert" if pct >= 85 else ("Strong" if pct >= 70 else "Good")
        skills.append({
            "name": lang,
            "percentage": pct,
            "rating": rating
        })

    return skills
