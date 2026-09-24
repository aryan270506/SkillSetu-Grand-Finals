import logging
from typing import List, Optional, Dict, Any
import httpx

from app.config import settings
from app.services.course_providers.base import BaseCourseProvider
from app.schemas.course import NormalizedCourse

logger = logging.getLogger("freecodecamp_provider")

# Official freeCodeCamp core curriculum paths and certifications
FREECODECAMP_CURRICULUM_CATALOG: List[Dict[str, Any]] = [
    {
        "slug": "responsive-web-design",
        "title": "Responsive Web Design Certification",
        "description": "Learn modern HTML5, CSS3, Flexbox, CSS Grid, and responsive design principles to build accessible and mobile-friendly websites.",
        "level": "Beginner",
        "duration_hours": 300.0,
        "skills": ["HTML5", "CSS3", "Flexbox", "CSS Grid", "Responsive Web Design", "Web Accessibility"],
        "url_path": "responsive-web-design"
    },
    {
        "slug": "javascript-algorithms-and-data-structures-v8",
        "title": "JavaScript Algorithms and Data Structures Certification",
        "description": "Learn modern JavaScript programming fundamentals, ES6 syntax, Regular Expressions, Debugging, Data Structures, OOP, and Functional Programming.",
        "level": "Intermediate",
        "duration_hours": 300.0,
        "skills": ["JavaScript", "ES6", "Data Structures", "Algorithms", "Object-Oriented Programming", "Functional Programming", "Regular Expressions"],
        "url_path": "javascript-algorithms-and-data-structures-v8"
    },
    {
        "slug": "front-end-development-libraries",
        "title": "Front End Development Libraries Certification",
        "description": "Build modern single-page web applications using industry standard frontend libraries including React, Redux, Bootstrap, SASS, and jQuery.",
        "level": "Intermediate",
        "duration_hours": 300.0,
        "skills": ["React", "Redux", "Bootstrap", "SASS", "jQuery", "Frontend Engineering", "UI Components"],
        "url_path": "front-end-development-libraries"
    },
    {
        "slug": "data-visualization",
        "title": "Data Visualization Certification",
        "description": "Learn to visualize data, charts, maps, and dynamic graphs using D3.js, SVG, JSON APIs, and AJAX.",
        "level": "Intermediate",
        "duration_hours": 300.0,
        "skills": ["D3.js", "Data Visualization", "SVG", "JSON APIs", "AJAX", "Interactive Charts"],
        "url_path": "data-visualization"
    },
    {
        "slug": "relational-database",
        "title": "Relational Database Certification",
        "description": "Learn relational database design, PostgreSQL, SQL queries, Bash scripting, Git version control, and Linux terminal command line.",
        "level": "Beginner",
        "duration_hours": 300.0,
        "skills": ["PostgreSQL", "SQL", "Relational Databases", "Bash", "Linux Command Line", "Git", "Database Schema"],
        "url_path": "relational-database"
    },
    {
        "slug": "back-end-development-and-apis",
        "title": "Back End Development and APIs Certification",
        "description": "Build robust backend microservices, RESTful APIs, and database-backed web servers using Node.js, Express, MongoDB, and Mongoose.",
        "level": "Intermediate",
        "duration_hours": 300.0,
        "skills": ["Node.js", "Express", "RESTful APIs", "MongoDB", "Mongoose", "Backend Architecture", "NPM"],
        "url_path": "back-end-development-and-apis"
    },
    {
        "slug": "quality-assurance",
        "title": "Quality Assurance Certification",
        "description": "Learn automated software testing, unit testing, functional testing, and assertion suites using Chai, Mocha, and advanced Node.js.",
        "level": "Intermediate",
        "duration_hours": 300.0,
        "skills": ["Quality Assurance", "Unit Testing", "Functional Testing", "Mocha", "Chai", "Test Automation"],
        "url_path": "quality-assurance"
    },
    {
        "slug": "scientific-computing-with-python",
        "title": "Scientific Computing with Python Certification",
        "description": "Master Python programming fundamentals, data structures, algorithm design, object-oriented concepts, and computational problem solving.",
        "level": "Beginner",
        "duration_hours": 300.0,
        "skills": ["Python", "Algorithms", "Data Structures", "Scientific Computing", "Computational Thinking"],
        "url_path": "scientific-computing-with-python"
    },
    {
        "slug": "data-analysis-with-python",
        "title": "Data Analysis with Python Certification",
        "description": "Analyze and visualize complex real-world datasets using Python libraries including NumPy, Pandas, Matplotlib, and Seaborn.",
        "level": "Intermediate",
        "duration_hours": 300.0,
        "skills": ["Data Analysis", "Python", "NumPy", "Pandas", "Matplotlib", "Seaborn", "Data Cleaning"],
        "url_path": "data-analysis-with-python"
    },
    {
        "slug": "information-security",
        "title": "Information Security Certification",
        "description": "Learn cybersecurity foundations, penetration testing, HelmetJS server security, and cryptography for secure web architectures.",
        "level": "Advanced",
        "duration_hours": 300.0,
        "skills": ["Information Security", "Cybersecurity", "HelmetJS", "Cryptography", "Penetration Testing", "Web Security"],
        "url_path": "information-security"
    },
    {
        "slug": "machine-learning-with-python",
        "title": "Machine Learning with Python Certification",
        "description": "Build deep learning neural networks, computer vision, natural language processing, and reinforcement learning models using TensorFlow and Python.",
        "level": "Advanced",
        "duration_hours": 300.0,
        "skills": ["Machine Learning", "Python", "TensorFlow", "Neural Networks", "Deep Learning", "Computer Vision", "Natural Language Processing"],
        "url_path": "machine-learning-with-python"
    },
    {
        "slug": "college-algebra-with-python",
        "title": "College Algebra with Python Certification",
        "description": "Learn algebraic mathematical concepts, functions, linear algebra, and mathematical modeling with Python and SymPy.",
        "level": "Beginner",
        "duration_hours": 300.0,
        "skills": ["Mathematics", "Linear Algebra", "Python", "SymPy", "Mathematical Modeling"],
        "url_path": "college-algebra-with-python"
    },
    {
        "slug": "foundational-c-sharp-with-microsoft",
        "title": "Foundational C# with Microsoft Certification",
        "description": "Official Microsoft and freeCodeCamp certification covering C# programming, .NET applications, logic, arrays, and object-oriented design.",
        "level": "Beginner",
        "duration_hours": 300.0,
        "skills": ["C#", ".NET", "Object-Oriented Programming", "Logic", "Application Development"],
        "url_path": "foundational-c-sharp-with-microsoft"
    },
    {
        "slug": "full-stack-developer",
        "title": "Full Stack Developer Certification",
        "description": "Comprehensive full stack software engineering curriculum covering responsive web design, JavaScript, React, Node.js, and databases.",
        "level": "Intermediate",
        "duration_hours": 400.0,
        "skills": ["Full Stack Development", "React", "Node.js", "JavaScript", "SQL", "Web Applications"],
        "url_path": "full-stack-developer"
    }
]


class FreeCodeCampProvider(BaseCourseProvider):
    """
    freeCodeCamp Course/Curriculum Ingestion Provider.
    Extracts official curriculum paths and certifications.
    No API key required (Open Curriculum Data).
    """

    @property
    def provider_slug(self) -> str:
        return "freecodecamp"

    @property
    def provider_name(self) -> str:
        return "freeCodeCamp"

    @property
    def base_url(self) -> Optional[str]:
        return "https://www.freecodecamp.org"

    def is_configured(self) -> bool:
        """freeCodeCamp curriculum is open and requires no credentials."""
        return True

    def _normalize_curriculum_item(self, item: Dict[str, Any]) -> NormalizedCourse:
        """Convert a freeCodeCamp curriculum definition into NormalizedCourse."""
        slug = item.get("slug", "").strip()
        title = item.get("title", "").strip() or "freeCodeCamp Certification"
        description = item.get("description", "")
        url_path = item.get("url_path", slug)
        
        external_id = f"freecodecamp:{slug}"
        url = f"https://www.freecodecamp.org/learn/{url_path}/"

        # Construct comprehensive description with curriculum topics
        skills_list = item.get("skills", [])
        if skills_list:
            topics_str = ", ".join(skills_list)
            full_description = f"{description}\n\nTopics Covered: {topics_str}"
        else:
            full_description = description

        return NormalizedCourse(
            provider_slug=self.provider_slug,
            title=title,
            description=full_description,
            url=url,
            external_id=external_id,
            instructor="Quincy Larson & freeCodeCamp Contributors",
            institution="freeCodeCamp",
            level=item.get("level", "All Levels"),
            language="English",
            duration=item.get("duration_hours", 300.0),
            duration_unit="hours",
            price=0.0,
            currency="INR",
            certificate_available=True,
            start_date=None,
            end_date=None,
            rating=4.9,
            review_count=None,
            thumbnail_url="https://design-style-guide.freecodecamp.org/downloads/fcc_primary_large.png",
            is_active=True
        )

    async def fetch_courses(
        self,
        limit: int = 50,
        offset: int = 0,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        Fetch official freeCodeCamp curriculum courses.
        """
        catalog_slice = FREECODECAMP_CURRICULUM_CATALOG[offset:offset + limit]
        courses = []
        for item in catalog_slice:
            try:
                norm = self._normalize_curriculum_item(item)
                courses.append(norm)
            except Exception as e:
                logger.warning(f"Error normalizing freeCodeCamp course {item.get('slug')}: {e}")

        return courses

    async def fetch_course_details(
        self,
        external_id: str
    ) -> Optional[NormalizedCourse]:
        """
        Fetch single freeCodeCamp curriculum course by external ID.
        """
        if not external_id:
            return None

        # Clean external_id prefix
        clean_slug = external_id.replace("freecodecamp:", "").strip()
        for item in FREECODECAMP_CURRICULUM_CATALOG:
            if item.get("slug") == clean_slug or item.get("url_path") == clean_slug:
                return self._normalize_curriculum_item(item)

        return None

    async def search_courses(
        self,
        query: str,
        limit: int = 50,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        Search freeCodeCamp curriculum by topic/keyword.
        """
        if not query:
            return await self.fetch_courses(limit=limit)

        norm_q = query.lower().strip()
        matched = []
        for item in FREECODECAMP_CURRICULUM_CATALOG:
            t = item.get("title", "").lower()
            d = item.get("description", "").lower()
            skills = [s.lower() for s in item.get("skills", [])]
            if norm_q in t or norm_q in d or any(norm_q in s or s in norm_q for s in skills):
                matched.append(self._normalize_curriculum_item(item))

        return matched[:limit]
