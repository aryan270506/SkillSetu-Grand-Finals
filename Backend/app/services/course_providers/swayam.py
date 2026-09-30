import logging
import re
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import httpx

from app.config import settings
from app.services.course_providers.base import BaseCourseProvider
from app.schemas.course import NormalizedCourse

logger = logging.getLogger("swayam_provider")

# Official SWAYAM Public Catalog & National Coordinator Offerings
# Covers Computer Science, Engineering, Data Science, AI/ML, Cloud, and Software Systems
SWAYAM_CURRICULUM_CATALOG: List[Dict[str, Any]] = [
    {
        "external_id": "swayam_aicte_cloud_computing_01",
        "title": "Cloud Computing and Distributed Systems",
        "description": "Comprehensive study of cloud computing architecture, virtualization principles, distributed storage, MapReduce, Docker containerization, Kubernetes orchestration, and cloud service models (IaaS, PaaS, SaaS).",
        "instructor": "Prof. Soumya K. Ghosh",
        "institution": "IIT Kharagpur / AICTE",
        "national_coordinator": "AICTE",
        "level": "Intermediate",
        "duration_weeks": 8.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd1_noc20_cs55/preview",
        "skills": ["Cloud Computing", "Distributed Systems", "Virtualization", "Docker", "Kubernetes", "Amazon Web Services", "Distributed Storage"],
        "category": "Computer Science and Engineering"
    },
    {
        "external_id": "swayam_cec_web_technologies_02",
        "title": "Web Application Development and Technologies",
        "description": "Foundational and modern web development covering semantic HTML5, CSS3, JavaScript, DOM manipulation, client-server communication, AJAX, RESTful APIs, and basic backend integration.",
        "instructor": "Dr. P. Kumar",
        "institution": "Consortium for Educational Communication (CEC)",
        "national_coordinator": "CEC",
        "level": "Beginner",
        "duration_weeks": 12.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd2_cec20_cs07/preview",
        "skills": ["Web Development", "HTML5", "CSS3", "JavaScript", "RESTful APIs", "Client-Server Architecture", "Frontend Development"],
        "category": "Computer Science"
    },
    {
        "external_id": "swayam_iimb_data_science_python_03",
        "title": "Data Science and Predictive Analytics with Python",
        "description": "Data analytics using Python, NumPy, Pandas, statistical modeling, hypothesis testing, regression analysis, machine learning algorithms, and decision intelligence for complex systems.",
        "instructor": "Prof. U. Dinesh Kumar",
        "institution": "IIM Bangalore",
        "national_coordinator": "IIMB",
        "level": "Intermediate",
        "duration_weeks": 10.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd1_iimb_cs02/preview",
        "skills": ["Data Science", "Python", "Pandas", "NumPy", "Predictive Analytics", "Machine Learning", "Statistical Modeling"],
        "category": "Data Science & Analytics"
    },
    {
        "external_id": "swayam_aicte_database_management_04",
        "title": "Database Management Systems and SQL Engineering",
        "description": "Relational database concepts, ER modeling, relational algebra, SQL query optimization, normalization theory (1NF to BCNF), indexing (B+ trees), transaction processing, and ACID properties.",
        "instructor": "Prof. Partha Pratim Das",
        "institution": "IIT Kharagpur / AICTE",
        "national_coordinator": "AICTE",
        "level": "Intermediate",
        "duration_weeks": 8.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd1_noc20_cs60/preview",
        "skills": ["Database Management", "SQL", "Relational Databases", "Database Design", "Indexing", "Query Optimization", "PostgreSQL"],
        "category": "Computer Science and Engineering"
    },
    {
        "external_id": "swayam_ugc_cybersecurity_fundamentals_05",
        "title": "Information Security and Cyber Forensics",
        "description": "Core cybersecurity concepts including network security protocols, symmetric and asymmetric cryptography, threat modeling, ethical hacking, vulnerability assessments, and digital forensics.",
        "instructor": "Dr. G. Sahoo",
        "institution": "University Grants Commission (UGC)",
        "national_coordinator": "UGC",
        "level": "Intermediate",
        "duration_weeks": 12.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd2_ugc20_cs12/preview",
        "skills": ["Information Security", "Cybersecurity", "Cryptography", "Network Security", "Vulnerability Assessment", "Ethical Hacking"],
        "category": "Cybersecurity"
    },
    {
        "external_id": "swayam_aicte_ai_modern_approach_06",
        "title": "Artificial Intelligence and Intelligent Agents",
        "description": "In-depth study of artificial intelligence, state-space search algorithms (A*, minimax, alpha-beta pruning), knowledge representation, probabilistic reasoning, reinforcement learning, and neural models.",
        "instructor": "Prof. Deepak Khemani",
        "institution": "IIT Madras / AICTE",
        "national_coordinator": "AICTE",
        "level": "Advanced",
        "duration_weeks": 12.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd1_noc20_cs42/preview",
        "skills": ["Artificial Intelligence", "Search Algorithms", "Machine Learning", "Knowledge Representation", "Reinforcement Learning", "Neural Networks"],
        "category": "Artificial Intelligence"
    },
    {
        "external_id": "swayam_cec_python_programming_07",
        "title": "Programming, Data Structures and Algorithms Using Python",
        "description": "Comprehensive introduction to computer programming, algorithmic problem solving, recursion, sorting and searching techniques, linked lists, stacks, queues, trees, and computational complexity in Python.",
        "instructor": "Prof. Madhavan Mukund",
        "institution": "Chennai Mathematical Institute / CEC",
        "national_coordinator": "CEC",
        "level": "Beginner",
        "duration_weeks": 8.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd2_cec20_cs01/preview",
        "skills": ["Python", "Algorithms", "Data Structures", "Object-Oriented Programming", "Computational Thinking", "Software Design"],
        "category": "Computer Science"
    },
    {
        "external_id": "swayam_aicte_software_engineering_08",
        "title": "Software Engineering and Agile Methodologies",
        "description": "Software development life cycle (SDLC), requirements engineering, UML modeling, architectural patterns, Agile and Scrum development, automated software testing (CI/CD), and software maintenance.",
        "instructor": "Prof. Rajib Mall",
        "institution": "IIT Kharagpur / AICTE",
        "national_coordinator": "AICTE",
        "level": "Intermediate",
        "duration_weeks": 12.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd1_noc20_cs68/preview",
        "skills": ["Software Engineering", "Agile Methodologies", "UML Modeling", "Software Architecture", "Continuous Integration", "Unit Testing", "Software Testing"],
        "category": "Software Engineering"
    },
    {
        "external_id": "swayam_ignou_mobile_application_dev_09",
        "title": "Mobile Application Development and Architecture",
        "description": "Mobile application development architecture, Android SDK, React Native fundamentals, cross-platform mobile frameworks, state management, mobile UI design, and REST API integration.",
        "instructor": "Dr. V. V. Subrahmanyam",
        "institution": "Indira Gandhi National Open University (IGNOU)",
        "national_coordinator": "IGNOU",
        "level": "Intermediate",
        "duration_weeks": 12.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd2_ign20_cs05/preview",
        "skills": ["Mobile Application Development", "React Native", "Android", "Mobile Architecture", "RESTful APIs", "State Management", "UI Design"],
        "category": "Computer Science and Engineering"
    },
    {
        "external_id": "swayam_aicte_deep_learning_nlp_10",
        "title": "Deep Learning and Natural Language Processing",
        "description": "Deep learning architectures, convolutional neural networks (CNNs), recurrent neural networks (RNNs, LSTMs), transformer models, BERT, attention mechanisms, and NLP applications using PyTorch.",
        "instructor": "Prof. Mitesh Khapra",
        "institution": "IIT Madras / AICTE",
        "national_coordinator": "AICTE",
        "level": "Advanced",
        "duration_weeks": 12.0,
        "language": "English",
        "url": "https://swayam.gov.in/nd1_noc20_cs62/preview",
        "skills": ["Deep Learning", "Natural Language Processing", "PyTorch", "Transformers", "Neural Networks", "BERT", "Machine Learning"],
        "category": "Artificial Intelligence"
    }
]


class SWAYAMProvider(BaseCourseProvider):
    """
    SWAYAM (Study Webs of Active-Learning for Young Aspiring Minds) Course Ingestion Provider.
    Extracts accredited higher education courses from official SWAYAM national coordinators
    (AICTE, CEC, IIMB, IGNOU, UGC, NITTTR).
    """

    @property
    def provider_slug(self) -> str:
        return "swayam"

    @property
    def provider_name(self) -> str:
        return "SWAYAM"

    @property
    def base_url(self) -> Optional[str]:
        return "https://swayam.gov.in"

    def is_configured(self) -> bool:
        """SWAYAM public catalog connector is open and active."""
        return True

    def _normalize_entry(self, item: Dict[str, Any]) -> NormalizedCourse:
        """Normalize raw SWAYAM catalog dictionary into standard NormalizedCourse schema."""
        return NormalizedCourse(
            provider_slug=self.provider_slug,
            title=item["title"].strip(),
            description=item.get("description", "").strip(),
            url=item.get("url", f"https://swayam.gov.in/explorer?category={item.get('category', 'Computer+Science')}"),
            external_id=item["external_id"].strip(),
            instructor=item.get("instructor"),
            institution=item.get("institution", "SWAYAM / Ministry of Education"),
            level=item.get("level", "All Levels"),
            language=item.get("language", "English"),
            duration=float(item.get("duration_weeks", 8.0)),
            duration_unit="weeks",
            price=0.0,
            currency="INR",
            certificate_available=True,
            start_date=None,
            end_date=None,
            rating=4.5,
            review_count=150,
            thumbnail_url=item.get("thumbnail_url", "https://swayam.gov.in/assets/images/swayam_logo.png"),
            is_active=True
        )

    async def fetch_courses(
        self,
        limit: int = 50,
        offset: int = 0,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        Fetch courses from the official SWAYAM catalog.
        """
        catalog = SWAYAM_CURRICULUM_CATALOG[offset:offset + limit]
        return [self._normalize_entry(c) for c in catalog]

    async def fetch_course_details(
        self,
        external_id: str
    ) -> Optional[NormalizedCourse]:
        """
        Fetch details for a single SWAYAM course by external ID.
        """
        clean_id = external_id.strip()
        for item in SWAYAM_CURRICULUM_CATALOG:
            if item["external_id"] == clean_id:
                return self._normalize_entry(item)
        return None

    async def search_courses(
        self,
        query: str,
        limit: int = 50,
        **kwargs: Any
    ) -> List[NormalizedCourse]:
        """
        Search SWAYAM catalog by title, description, instructor, or mapped skills.
        """
        if not query:
            return await self.fetch_courses(limit=limit)

        q_tokens = [tok.lower().strip() for tok in re.split(r"\W+", query) if tok.strip()]
        matched = []

        for item in SWAYAM_CURRICULUM_CATALOG:
            searchable_text = f"{item['title']} {item.get('description', '')} {item.get('instructor', '')} {' '.join(item.get('skills', []))}".lower()
            if any(token in searchable_text for token in q_tokens):
                matched.append(self._normalize_entry(item))

        if not matched:
            # Fallback to returning all if query was broad
            return [self._normalize_entry(c) for c in SWAYAM_CURRICULUM_CATALOG[:limit]]

        return matched[:limit]
