import re
import json
import math
import httpx
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session
from app import models

# Popular tech ecosystem dependency mapping to canonical names & categories
TECH_MAP = {
    # Node / JS / TS ecosystem
    "react": ("React", "Frontend"),
    "react-dom": ("React", "Frontend"),
    "react-native": ("React Native", "Mobile"),
    "expo": ("React Native", "Mobile"),
    "next": ("Next.js", "Full Stack"),
    "vue": ("Vue.js", "Frontend"),
    "angular": ("Angular", "Frontend"),
    "@angular/core": ("Angular", "Frontend"),
    "express": ("Express.js", "Backend"),
    "@nestjs/core": ("NestJS", "Backend"),
    "tailwindcss": ("Tailwind CSS", "Frontend"),
    "redux": ("Redux", "State Management"),
    "@reduxjs/toolkit": ("Redux", "State Management"),
    "typescript": ("TypeScript", "Programming Languages"),
    "prisma": ("Prisma", "Database ORM"),
    "@prisma/client": ("Prisma", "Database ORM"),
    "mongoose": ("Mongoose", "Database ORM"),
    "axios": ("Axios", "Networking"),
    "graphql": ("GraphQL", "API"),
    "socket.io": ("Socket.io", "Realtime"),
    "socket.io-client": ("Socket.io", "Realtime"),
    "vite": ("Vite", "Build Tools"),
    "webpack": ("Webpack", "Build Tools"),
    "firebase": ("Firebase", "Cloud/Backend"),
    "@supabase/supabase-js": ("Supabase", "Cloud/Backend"),
    "three": ("Three.js", "3D/Graphics"),

    # Python ecosystem
    "fastapi": ("FastAPI", "Backend"),
    "django": ("Django", "Backend"),
    "flask": ("Flask", "Backend"),
    "torch": ("PyTorch", "AI/ML"),
    "pytorch": ("PyTorch", "AI/ML"),
    "tensorflow": ("TensorFlow", "AI/ML"),
    "pandas": ("Pandas", "Data Science"),
    "numpy": ("NumPy", "Data Science"),
    "sqlalchemy": ("SQLAlchemy", "Database ORM"),
    "celery": ("Celery", "Distributed Systems"),
    "pydantic": ("Pydantic", "Data Validation"),
    "scikit-learn": ("Scikit-Learn", "AI/ML"),
    "sklearn": ("Scikit-Learn", "AI/ML"),
    "opencv-python": ("OpenCV", "Computer Vision"),
    "cv2": ("OpenCV", "Computer Vision"),
    "requests": ("Requests", "Networking"),
    "beautifulsoup4": ("BeautifulSoup", "Web Scraping"),
    "bs4": ("BeautifulSoup", "Web Scraping"),
    "matplotlib": ("Matplotlib", "Data Visualization"),
    "scipy": ("SciPy", "Scientific Computing"),

    # Java / Kotlin / C# / Go
    "spring-boot": ("Spring Boot", "Backend"),
    "spring-framework": ("Spring", "Backend"),
    "hibernate": ("Hibernate", "Database ORM"),
    "gin-gonic/gin": ("Gin", "Backend"),
    "fiber": ("Fiber", "Backend"),

    # Containers / DevOps / DB
    "docker": ("Docker", "DevOps"),
    "kubernetes": ("Kubernetes", "DevOps"),
    "postgresql": ("PostgreSQL", "Database"),
    "postgres": ("PostgreSQL", "Database"),
    "mongodb": ("MongoDB", "Database"),
    "redis": ("Redis", "Database/Cache"),
    "sqlite3": ("SQLite", "Database"),
    "sqlite": ("SQLite", "Database"),
}

# Import regex patterns for source-code import parsing
IMPORT_PATTERNS = [
    # JS/TS
    ("React Native", re.compile(r"from\s+['\"]react-native['\"]|require\(['\"]react-native['\"]\)")),
    ("React", re.compile(r"from\s+['\"]react['\"]|require\(['\"]react['\"]\)")),
    ("Next.js", re.compile(r"from\s+['\"]next/|require\(['\"]next/")),
    ("Vue.js", re.compile(r"from\s+['\"]vue['\"]|require\(['\"]vue['\"]\)")),
    ("Express.js", re.compile(r"from\s+['\"]express['\"]|require\(['\"]express['\"]\)")),
    ("Axios", re.compile(r"from\s+['\"]axios['\"]|require\(['\"]axios['\"]\)")),
    ("Redux", re.compile(r"from\s+['\"]@?redux|require\(['\"]@?redux")),
    ("Tailwind CSS", re.compile(r"from\s+['\"]tailwindcss|@import\s+['\"]tailwindcss")),
    ("Prisma", re.compile(r"from\s+['\"]@prisma/client['\"]")),
    ("Mongoose", re.compile(r"from\s+['\"]mongoose['\"]|require\(['\"]mongoose['\"]\)")),
    ("Firebase", re.compile(r"from\s+['\"]firebase/|require\(['\"]firebase/")),
    ("Supabase", re.compile(r"from\s+['\"]@supabase/|require\(['\"]@supabase/")),
    ("Socket.io", re.compile(r"from\s+['\"]socket\.io|require\(['\"]socket\.io")),
    ("GraphQL", re.compile(r"from\s+['\"]graphql['\"]|from\s+['\"]@apollo/")),
    ("Three.js", re.compile(r"from\s+['\"]three['\"]|require\(['\"]three['\"]\)")),

    # Python
    ("FastAPI", re.compile(r"import\s+fastapi|from\s+fastapi\s+import")),
    ("Django", re.compile(r"import\s+django|from\s+django\b")),
    ("Flask", re.compile(r"import\s+flask|from\s+flask\s+import")),
    ("PyTorch", re.compile(r"import\s+torch|from\s+torch\b")),
    ("TensorFlow", re.compile(r"import\s+tensorflow|from\s+tensorflow\b")),
    ("Pandas", re.compile(r"import\s+pandas|from\s+pandas\b")),
    ("NumPy", re.compile(r"import\s+numpy|from\s+numpy\b")),
    ("Scikit-Learn", re.compile(r"import\s+sklearn|from\s+sklearn\b")),
    ("OpenCV", re.compile(r"import\s+cv2\b")),
    ("SQLAlchemy", re.compile(r"import\s+sqlalchemy|from\s+sqlalchemy\b")),
    ("Celery", re.compile(r"import\s+celery|from\s+celery\b")),
    ("Requests", re.compile(r"import\s+requests\b")),
    ("BeautifulSoup", re.compile(r"import\s+bs4|from\s+bs4\s+import")),
    ("Matplotlib", re.compile(r"import\s+matplotlib|from\s+matplotlib\b")),
    ("SciPy", re.compile(r"import\s+scipy|from\s+scipy\b")),

    # Java / Kotlin / C# / Go / C++
    ("Spring Boot", re.compile(r"import\s+org\.springframework\.boot")),
    ("Spring", re.compile(r"import\s+org\.springframework")),
    ("Hibernate", re.compile(r"import\s+org\.hibernate")),
    ("Gin", re.compile(r"import\s+['\"].*github\.com/gin-gonic/gin")),
    ("Fiber", re.compile(r"import\s+['\"].*gofiber/fiber")),
    ("ASP.NET", re.compile(r"using\s+Microsoft\.AspNetCore")),
]

IGNORED_DIRS = {
    ".git", "node_modules", "dist", "build", "coverage", "__pycache__",
    "vendor", "generated", ".next", ".expo", "out", "bin", "obj"
}

PRIORITIZED_DIRS = (
    "src/", "app/", "apps/", "components/", "pages/", "frontend/",
    "backend/", "server/", "api/", "services/", "models/", "controllers/",
    "routes/", "lib/", "utils/", "tests/"
)


def parse_package_json(content: str) -> List[Dict[str, str]]:
    """Extract dependencies from package.json text with dynamic fallbacks."""
    detected = []
    try:
        data = json.loads(content)
        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
        for dep in deps.keys():
            dep_lower = dep.lower()
            if dep_lower in TECH_MAP:
                tech_name = TECH_MAP[dep_lower][0]
                detected.append({"name": tech_name, "raw_dep": dep})
            elif "react-native" in dep_lower or "expo" in dep_lower:
                detected.append({"name": "React Native", "raw_dep": dep})
            elif "react" in dep_lower and "native" not in dep_lower:
                detected.append({"name": "React", "raw_dep": dep})
            elif "vue" in dep_lower:
                detected.append({"name": "Vue.js", "raw_dep": dep})
            elif "express" in dep_lower:
                detected.append({"name": "Express.js", "raw_dep": dep})
            elif "tailwind" in dep_lower:
                detected.append({"name": "Tailwind CSS", "raw_dep": dep})
            elif dep_lower.startswith("@") or len(dep_lower) > 2:
                # Dynamic fallback for package dependencies
                clean_name = dep.split("/")[-1].replace("-", " ").replace("_", " ").title()
                detected.append({"name": clean_name, "raw_dep": dep})
    except Exception:
        pass
    return detected


def parse_requirements_txt(content: str) -> List[Dict[str, str]]:
    """Extract dependencies from requirements.txt or pyproject.toml text."""
    detected = []
    lines = content.splitlines()
    for line in lines:
        line_clean = line.strip().split("==")[0].split(">=")[0].split("<=")[0].split("~=")[0].split("#")[0].strip().lower()
        if not line_clean or line_clean.startswith("-"):
            continue
        if line_clean in TECH_MAP:
            detected.append({"name": TECH_MAP[line_clean][0], "raw_dep": line_clean})
        elif "fastapi" in line_clean:
            detected.append({"name": "FastAPI", "raw_dep": line_clean})
        elif "django" in line_clean:
            detected.append({"name": "Django", "raw_dep": line_clean})
        elif "flask" in line_clean:
            detected.append({"name": "Flask", "raw_dep": line_clean})
        elif "torch" in line_clean:
            detected.append({"name": "PyTorch", "raw_dep": line_clean})
        elif "tensorflow" in line_clean:
            detected.append({"name": "TensorFlow", "raw_dep": line_clean})
        elif "pandas" in line_clean:
            detected.append({"name": "Pandas", "raw_dep": line_clean})
        elif "sqlalchemy" in line_clean:
            detected.append({"name": "SQLAlchemy", "raw_dep": line_clean})
        elif len(line_clean) > 2:
            clean_name = line_clean.replace("-", " ").replace("_", " ").title()
            detected.append({"name": clean_name, "raw_dep": line_clean})
    return detected


def fetch_github_file_tree(full_name: str, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch complete tree structure for default branch of repository."""
    from app.config import settings
    tok = token or settings.GITHUB_TOKEN
    headers = {"Accept": "application/vnd.github.v3+json", "User-Agent": "SkillSetu-App"}
    if tok:
        headers["Authorization"] = f"Bearer {tok}"

    try:
        repo_res = httpx.get(f"https://api.github.com/repos/{full_name}", headers=headers, timeout=8)
        if repo_res.status_code != 200:
            return []
        branch = repo_res.json().get("default_branch", "main")

        tree_url = f"https://api.github.com/repos/{full_name}/git/trees/{branch}?recursive=1"
        tree_res = httpx.get(tree_url, headers=headers, timeout=10)
        if tree_res.status_code == 200:
            return tree_res.json().get("tree", [])
    except Exception as e:
        print(f"Error fetching file tree for {full_name}: {e}")
    return []


def fetch_raw_file_content(full_name: str, path: str, token: Optional[str] = None) -> str:
    """Fetch raw file text content from GitHub using exact relative path."""
    from app.config import settings
    tok = token or settings.GITHUB_TOKEN
    headers = {"User-Agent": "SkillSetu-App"}
    if tok:
        headers["Authorization"] = f"Bearer {tok}"

    try:
        url = f"https://raw.githubusercontent.com/{full_name}/HEAD/{path}"
        res = httpx.get(url, headers=headers, timeout=8)
        if res.status_code == 200:
            return res.text[:100000]
    except Exception:
        pass
    return ""


def analyze_single_repository(repo: Dict[str, Any], token: Optional[str] = None) -> Dict[str, Any]:
    """
    Performs deterministic technical inspection across 4 evidence dimensions:
    1. Source Imports (Cap: 45 pts)
    2. Manifest / Config (Cap: 30 pts)
    3. Architecture / Extensions (Cap: 15 pts)
    4. Documentation / Topics (Cap: 10 pts)
    """
    full_name = repo.get("full_name") or f"{repo.get('owner', '')}/{repo.get('name', '')}"
    repo_name = repo.get("name", full_name)
    primary_lang = repo.get("language")
    description = repo.get("description") or ""

    skill_data: Dict[str, Dict[str, Any]] = {}

    def ensure_skill(name: str):
        if name not in skill_data:
            skill_data[name] = {
                "imports_pts": 0,
                "manifest_config_pts": 0,
                "arch_pts": 0,
                "docs_pts": 0,
                "import_files": [],
                "signals": []
            }

    def add_signal(name: str, signal_type: str, pts: int, category: str, file_path: str, desc: str):
        ensure_skill(name)
        sd = skill_data[name]

        if category == "imports":
            sd["imports_pts"] = min(45, sd["imports_pts"] + pts)
        elif category == "manifest_config":
            sd["manifest_config_pts"] = min(30, sd["manifest_config_pts"] + pts)
        elif category == "arch":
            sd["arch_pts"] = min(15, sd["arch_pts"] + pts)
        elif category == "docs":
            sd["docs_pts"] = min(10, sd["docs_pts"] + pts)

        sd["signals"].append({
            "signal_type": signal_type,
            "contribution_pts": pts,
            "repository_name": repo_name,
            "file_path": file_path,
            "evidence_description": desc
        })

    # 1. Primary Language Match (Dimension 3: Arch/Lang - 15 pts)
    if primary_lang and primary_lang != "Language not detected":
        add_signal(primary_lang, "LANGUAGE_DISTRIBUTION", 15, "arch", "repo/metadata", f"Primary language of repository '{repo_name}'")

    # 2. File Tree & Extension Architecture Inspection
    file_tree = fetch_github_file_tree(full_name, token=token)
    blob_items = [item for item in file_tree if item.get("type") == "blob"]

    # Filter out ignored directories
    valid_blobs = [
        item for item in blob_items
        if not any(part in IGNORED_DIRS for part in item.get("path", "").split("/"))
    ]

    manifest_files = []
    source_candidates = []

    for item in valid_blobs:
        path = item.get("path", "")
        lower_path = path.lower()

        # Identify all nested manifests
        if (
            lower_path.endswith("package.json") or
            lower_path.endswith("requirements.txt") or
            lower_path.endswith("pyproject.toml") or
            lower_path.endswith("dockerfile") or
            lower_path.endswith("schema.prisma") or
            lower_path.endswith("tsconfig.json") or
            lower_path.endswith("go.mod") or
            lower_path.endswith("cargo.toml")
        ):
            manifest_files.append(path)

        # Identify source files
        if any(lower_path.endswith(ext) for ext in [
            '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.kt', '.go', '.rs', '.cpp', '.c', '.cs', '.html', '.css'
        ]):
            source_candidates.append(path)

    # Architectural credits from manifests/configs
    for mpath in manifest_files:
        lpath = mpath.lower()
        if lpath.endswith("tsconfig.json"):
            add_signal("TypeScript", "FRAMEWORK_CONFIG", 15, "manifest_config", mpath, "TypeScript configuration proof")
        elif lpath.endswith("dockerfile"):
            add_signal("Docker", "FRAMEWORK_CONFIG", 20, "manifest_config", mpath, "Dockerfile container configuration")
        elif lpath.endswith("schema.prisma"):
            add_signal("Prisma", "FRAMEWORK_CONFIG", 20, "manifest_config", mpath, "Prisma ORM schema specification")

    # 3. Subdirectory Manifest Content Fetching & Parsing
    for mpath in manifest_files:
        lpath = mpath.lower()
        if lpath.endswith("package.json"):
            content = fetch_raw_file_content(full_name, mpath, token=token)
            if content:
                for dep in parse_package_json(content):
                    add_signal(dep["name"], "MANIFEST_DECLARATION", 20, "manifest_config", mpath, f"Declared '{dep['raw_dep']}' in {mpath}")
        elif lpath.endswith("requirements.txt") or lpath.endswith("pyproject.toml"):
            content = fetch_raw_file_content(full_name, mpath, token=token)
            if content:
                for dep in parse_requirements_txt(content):
                    add_signal(dep["name"], "MANIFEST_DECLARATION", 20, "manifest_config", mpath, f"Declared '{dep['raw_dep']}' in {mpath}")

    # 4. Smart Source File Sampling & Import Detection
    def score_source_priority(p: str) -> int:
        pl = p.lower()
        score = 0
        if any(pl.startswith(pref) or f"/{pref}" in pl for pref in PRIORITIZED_DIRS):
            score += 10
        if any(pl.endswith(ext) for ext in ['.tsx', '.jsx', '.ts', '.py', '.java', '.go', '.js']):
            score += 5
        return score

    source_candidates.sort(key=score_source_priority, reverse=True)
    sampled_sources = source_candidates[:20]

    for spath in sampled_sources:
        code = fetch_raw_file_content(full_name, spath, token=token)
        if not code:
            continue

        # Regex import pattern checking
        for tech_name, pattern in IMPORT_PATTERNS:
            if pattern.search(code):
                pts = 25 if skill_data.get(tech_name, {}).get("imports_pts", 0) == 0 else 5
                add_signal(tech_name, "SOURCE_USAGE", pts, "imports", spath, f"Imported {tech_name} in {spath}")

        # TypeScript source usage credit
        if spath.lower().endswith(".ts") or spath.lower().endswith(".tsx"):
            pts = 25 if skill_data.get("TypeScript", {}).get("imports_pts", 0) == 0 else 5
            add_signal("TypeScript", "SOURCE_USAGE", pts, "imports", spath, f"TypeScript source file {spath}")

    # 5. Documentation & Metadata (Dimension 4: Docs - Cap 10 pts max)
    if description:
        desc_lower = description.lower()
        for tech in ["React Native", "React", "Python", "FastAPI", "Django", "Flask", "TypeScript", "Docker", "Node.js"]:
            if tech.lower() in desc_lower:
                add_signal(tech, "REPO_METADATA", 5, "docs", "repo/description", f"Repository description mentions {tech}")

    # Compute Total Single Repo Score per skill
    repo_results = {}
    for sname, data in skill_data.items():
        total_single_score = min(100, data["imports_pts"] + data["manifest_config_pts"] + data["arch_pts"] + data["docs_pts"])
        repo_results[sname] = {
            "score": total_single_score,
            "signals": data["signals"]
        }

    return {
        "repo_id": repo.get("id"),
        "repo_name": repo_name,
        "full_name": full_name,
        "skills_found": repo_results
    }


def aggregate_repository_evidence(
    selected_repos: List[Dict[str, Any]],
    db: Optional[Session] = None,
    token: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Aggregates multi-repository technical evidence using square-root breadth formula:
    Aggregated Score = min(100, Max Single Repo Score + int(8 * sqrt(Repo Count - 1)))
    """
    if not selected_repos:
        return []

    combined_skills: Dict[str, Dict[str, Any]] = {}

    for repo in selected_repos:
        analysis = analyze_single_repository(repo, token=token)
        skills_found = analysis.get("skills_found", {})

        for skill_name, data in skills_found.items():
            if skill_name not in combined_skills:
                combined_skills[skill_name] = {
                    "name": skill_name,
                    "max_single_score": 0,
                    "repos": set(),
                    "all_signals": []
                }
            combined_skills[skill_name]["max_single_score"] = max(combined_skills[skill_name]["max_single_score"], data["score"])
            combined_skills[skill_name]["repos"].add(analysis.get("repo_name", ""))
            combined_skills[skill_name]["all_signals"].extend(data["signals"])

    result_skills = []
    for skill_name, data in combined_skills.items():
        repo_count = len(data["repos"])
        max_score = data["max_single_score"]

        # Square-Root Multi-Repo Breadth Formula
        if repo_count > 1:
            breadth_boost = int(8 * math.sqrt(repo_count - 1))
            final_score = min(100, max_score + breadth_boost)
        else:
            final_score = max_score

        # Map Evidence Strength Tiers
        if final_score >= 85:
            rating = "Very Strong Evidence"
            evidence_level = "VERY_STRONG"
        elif final_score >= 70:
            rating = "Strong Evidence"
            evidence_level = "STRONG"
        elif final_score >= 55:
            rating = "Good Evidence"
            evidence_level = "GOOD"
        elif final_score >= 40:
            rating = "Moderate Evidence"
            evidence_level = "MODERATE"
        else:
            rating = "Limited Evidence"
            evidence_level = "LIMITED"

        # Deduplicate signals and build summaries
        unique_signals = []
        seen_sig_keys = set()
        for sig in data["all_signals"]:
            key = (sig["signal_type"], sig["repository_name"], sig["file_path"])
            if key not in seen_sig_keys:
                seen_sig_keys.add(key)
                unique_signals.append(sig)

        provenance_summary = [sig["evidence_description"] for sig in unique_signals[:3]]
        provenance_summary.append(f"Detected across {repo_count} selected project{'s' if repo_count > 1 else ''}")

        # Resolve Canonical Skill ID & Taxonomy Classification
        canonical_id = None
        skill_type = "Verified Technology"

        if db:
            skill_row = db.query(models.SkillSetuSkill).filter(
                models.SkillSetuSkill.name.ilike(skill_name)
            ).first()
            if skill_row:
                canonical_id = skill_row.id
                skill_type = "Canonical Skill"
            else:
                alias_row = db.query(models.SkillSetuSkillAlias).filter(
                    models.SkillSetuSkillAlias.alias_name.ilike(skill_name)
                ).first()
                if alias_row:
                    canonical_id = alias_row.canonical_skill_id
                    skill_type = "Canonical Skill"

        result_skills.append({
            "skill_id": canonical_id,
            "name": skill_name,
            "percentage": final_score,
            "rating": rating,
            "score": final_score,
            "evidence_level": evidence_level,
            "type": skill_type,
            "score_meaning": "Strength of technical evidence found in selected GitHub repositories, not student human proficiency.",
            "repository_count": repo_count,
            "signals": unique_signals[:6],
            "evidence_sources": provenance_summary
        })

    # Sort skills by score descending
    result_skills.sort(key=lambda s: s["score"], reverse=True)
    return result_skills

