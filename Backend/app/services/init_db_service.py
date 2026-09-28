import os
import sys
import csv
import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import engine, Base, SessionLocal
from app import models
from app.config import settings
from app.services.course_service import seed_default_providers

logger = logging.getLogger("init_db_service")

# Increase CSV field size limit for large descriptions
csv.field_size_limit(sys.maxsize)


def find_esco_data_dir() -> Optional[str]:
    """
    Locate the ESCO dataset directory. Checks multiple candidate paths.
    """
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    
    candidates = [
        os.getenv("ESCO_DATA_DIR"),
        os.path.join(base_dir, "data", "esco"),
        os.path.join(base_dir, "ESCO dataset - v1.2.1 - classification - en - csv"),
        os.path.join(os.getcwd(), "data", "esco"),
        os.path.join(os.getcwd(), "Backend", "data", "esco"),
    ]
    
    for path in candidates:
        if path and os.path.exists(path) and os.path.isdir(path):
            # Check for essential file
            if os.path.exists(os.path.join(path, "occupations_en.csv")):
                return os.path.abspath(path)
                
    return None


def is_esco_data_seeded(db: Session) -> bool:
    """
    Check if ESCO occupations and skills are already loaded in PostgreSQL.
    Uses fast LIMIT 1 queries (< 1ms).
    """
    try:
        has_occs = db.query(models.EscoOccupation.id).first() is not None
        has_skills = db.query(models.EscoSkill.id).first() is not None
        has_careers = db.query(models.SkillSetuCareer.id).first() is not None
        return has_occs and has_skills and has_careers
    except Exception as e:
        logger.warning(f"Error checking existing ESCO data in DB: {e}")
        return False


def seed_esco_and_taxonomy(db: Session, esco_dir: str):
    """
    Ingest ESCO CSVs and build SkillSetu global taxonomy in PostgreSQL.
    """
    logger.info(f"📂 Reading ESCO dataset from: {esco_dir}")

    # ----------------------------------------------------
    # Phase 1: Ingest ESCO Raw Occupations
    # ----------------------------------------------------
    occ_csv = os.path.join(esco_dir, "occupations_en.csv")
    if os.path.exists(occ_csv):
        existing_uris = {u[0] for u in db.query(models.EscoOccupation.concept_uri).all()}
        new_occs = []
        with open(occ_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                uri = row.get("conceptUri")
                if uri and uri not in existing_uris:
                    new_occs.append(models.EscoOccupation(
                        concept_uri=uri,
                        isco_code=row.get("iscoGroup", ""),
                        preferred_label=row.get("preferredLabel", ""),
                        alt_labels=row.get("altLabels", ""),
                        description=row.get("description", "")
                    ))
                    existing_uris.add(uri)

        if new_occs:
            for i in range(0, len(new_occs), 1000):
                db.bulk_save_objects(new_occs[i:i+1000])
                db.commit()
            logger.info(f"✅ Ingested {len(new_occs)} ESCO occupations.")
        else:
            logger.info("ℹ️ ESCO occupations already up to date.")

    # ----------------------------------------------------
    # Phase 2: Ingest ESCO Raw Skills
    # ----------------------------------------------------
    skill_csv = os.path.join(esco_dir, "skills_en.csv")
    if os.path.exists(skill_csv):
        existing_skill_uris = {u[0] for u in db.query(models.EscoSkill.concept_uri).all()}
        new_skills = []
        with open(skill_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                uri = row.get("conceptUri")
                if uri and uri not in existing_skill_uris:
                    new_skills.append(models.EscoSkill(
                        concept_uri=uri,
                        skill_type=row.get("skillType", ""),
                        reuse_level=row.get("reuseLevel", ""),
                        preferred_label=row.get("preferredLabel", ""),
                        alt_labels=row.get("altLabels", ""),
                        description=row.get("description", "")
                    ))
                    existing_skill_uris.add(uri)

        if new_skills:
            for i in range(0, len(new_skills), 2000):
                db.bulk_save_objects(new_skills[i:i+2000])
                db.commit()
            logger.info(f"✅ Ingested {len(new_skills)} ESCO skills.")
        else:
            logger.info("ℹ️ ESCO skills already up to date.")

    # ----------------------------------------------------
    # Phase 3: Ingest ESCO Occupation-Skill Relations
    # ----------------------------------------------------
    rel_csv = os.path.join(esco_dir, "occupationSkillRelations_en.csv")
    if os.path.exists(rel_csv) and db.query(models.EscoOccupationSkill).count() == 0:
        logger.info("Ingesting ESCO Occupation-Skill Relations...")
        new_rels = []
        with open(rel_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                new_rels.append(models.EscoOccupationSkill(
                    occupation_uri=row.get("occupationUri", ""),
                    skill_uri=row.get("skillUri", ""),
                    relation_type=row.get("relationType", ""),
                    skill_type=row.get("skillType", "")
                ))
                if len(new_rels) >= 10000:
                    db.bulk_save_objects(new_rels)
                    db.commit()
                    new_rels = []
        if new_rels:
            db.bulk_save_objects(new_rels)
            db.commit()
        logger.info("✅ Ingested ESCO occupation-skill relations.")

    # ----------------------------------------------------
    # Phase 4: Import Occupations into SkillSetu Careers
    # ----------------------------------------------------
    existing_career_ids = {c[0] for c in db.query(models.SkillSetuCareer.id).all()}
    esco_occs = db.query(models.EscoOccupation).all()
    new_career_objects = []
    
    for occ in esco_occs:
        uri_part = occ.concept_uri.split("/")[-1]
        cid = f"car_esco_{uri_part}"
        if cid not in existing_career_ids:
            category = "General Professional"
            lbl_lower = occ.preferred_label.lower()
            if any(w in lbl_lower for w in ["developer", "engineer", "software", "programmer", "data", "computer", "network", "system", "web", "cyber", "it"]):
                category = "Software & IT Engineering"
            elif any(w in lbl_lower for w in ["manager", "director", "chief", "head", "lead"]):
                category = "Management & Leadership"
            elif any(w in lbl_lower for w in ["designer", "artist", "graphics", "media"]):
                category = "Design & Creative"
            elif any(w in lbl_lower for w in ["analyst", "researcher", "scientist"]):
                category = "Analytics & Research"

            new_career_objects.append(models.SkillSetuCareer(
                id=cid,
                name=occ.preferred_label,
                category=category,
                esco_uri=occ.concept_uri,
                description=occ.description or occ.preferred_label,
                popularity_score=20,
                is_visible=True
            ))
            existing_career_ids.add(cid)

    if new_career_objects:
        for i in range(0, len(new_career_objects), 1000):
            db.bulk_save_objects(new_career_objects[i:i+1000])
            db.commit()
        logger.info(f"✅ Ingested {len(new_career_objects)} ESCO occupations into skillsetu_careers.")

    # Curated popular tech careers
    curated_careers = [
        {"id": "car_frontend_developer", "name": "Frontend Developer", "category": "Software Engineering", "popularity_score": 98, "description": "Specializes in building responsive user interfaces with HTML, CSS, JavaScript, React, and modern web frameworks."},
        {"id": "car_backend_developer", "name": "Backend Developer", "category": "Software Engineering", "popularity_score": 96, "description": "Builds server-side APIs, database architectures, microservices, and system scalability using Python, Node.js, Java, or Go."},
        {"id": "car_fullstack_developer", "name": "Full Stack Developer", "category": "Software Engineering", "popularity_score": 99, "description": "Engages across both client-side interfaces and server-side backend databases and server management."},
        {"id": "car_mobile_app_developer", "name": "Mobile App Developer", "category": "Software Engineering", "popularity_score": 92, "description": "Develops native and cross-platform iOS and Android mobile applications using React Native, Flutter, Swift, or Kotlin."},
        {"id": "car_data_analyst", "name": "Data Analyst", "category": "Data & Analytics", "popularity_score": 94, "description": "Parses complex datasets, creates dashboards, and extracts actionable business metrics using SQL, Python, Tableau, and Excel."},
        {"id": "car_data_scientist", "name": "Data Scientist", "category": "Data & Analytics", "popularity_score": 93, "description": "Builds predictive statistical models, machine learning algorithms, and deep data analysis pipelines."},
        {"id": "car_ai_ml_engineer", "name": "AI / ML Engineer", "category": "Artificial Intelligence", "popularity_score": 97, "description": "Designs neural networks, LLM integrations, computer vision pipelines, and production machine learning models."},
        {"id": "car_devops_engineer", "name": "DevOps Engineer", "category": "Cloud & Infrastructure", "popularity_score": 90, "description": "Manages CI/CD automation pipelines, cloud deployment infra, container orchestration (Docker/Kubernetes), and site reliability."},
        {"id": "car_cloud_engineer", "name": "Cloud Architect / Engineer", "category": "Cloud & Infrastructure", "popularity_score": 89, "description": "Architects cloud-native infrastructure solutions on AWS, Azure, or GCP."},
        {"id": "car_cybersecurity_analyst", "name": "Cybersecurity Analyst", "category": "Security & Risk", "popularity_score": 88, "description": "Protects IT systems, networks, and software applications against vulnerability exploits, security breaches, and malware."},
        {"id": "car_ui_ux_designer", "name": "UI/UX Designer", "category": "Design & Product", "popularity_score": 91, "description": "Crafts user journeys, high-fidelity wireframes, interactive prototypes, and modern visual design systems in Figma."},
        {"id": "car_product_manager", "name": "Product Manager", "category": "Design & Product", "popularity_score": 87, "description": "Defines product roadmaps, feature priorities, student requirements, and coordinates cross-functional tech development."},
        {"id": "car_embedded_engineer", "name": "Embedded Systems Engineer", "category": "Hardware & IoT", "popularity_score": 82, "description": "Develops low-level firmware and hardware integrations for IoT microcontrollers using C/C++."},
        {"id": "car_qa_automation_engineer", "name": "QA / Test Automation Engineer", "category": "Software Engineering", "popularity_score": 84, "description": "Constructs automated testing suites (Jest, Cypress, Selenium, PyTest) to ensure software quality and reliability."}
    ]
    for c in curated_careers:
        existing = db.query(models.SkillSetuCareer).filter(models.SkillSetuCareer.id == c["id"]).first()
        if existing:
            existing.popularity_score = c["popularity_score"]
            existing.category = c["category"]
        else:
            db.add(models.SkillSetuCareer(**c))
    db.commit()

    # ----------------------------------------------------
    # Phase 5: Import Skills into SkillSetu Skills & Aliases
    # ----------------------------------------------------
    existing_skill_ids = {s[0] for s in db.query(models.SkillSetuSkill.id).all()}
    esco_skills = db.query(models.EscoSkill).all()

    new_skill_objects = []
    alias_objects = []
    existing_aliases = {a[0] for a in db.query(models.SkillSetuSkillAlias.alias_name).all()}

    for sk in esco_skills:
        uri_part = sk.concept_uri.split("/")[-1]
        sid = f"skill_esco_{uri_part}"

        if sid not in existing_skill_ids:
            category = "General Skill"
            stype = "technical" if sk.skill_type == "skill/competence" else "knowledge"
            lbl_lower = sk.preferred_label.lower()

            if any(w in lbl_lower for w in ["software", "programming", "code", "web", "script", "data", "database", "cloud", "security", "algorithm", "system", "testing", "network"]):
                category = "Information Technology"

            new_skill_objects.append(models.SkillSetuSkill(
                id=sid,
                name=sk.preferred_label,
                category=category,
                skill_type=stype,
                esco_uri=sk.concept_uri,
                description=sk.description or sk.preferred_label,
                popularity_score=15,
                is_visible=True
            ))
            existing_skill_ids.add(sid)

        # Process altLabels as aliases
        if sk.alt_labels:
            alt_list = [a.strip() for a in sk.alt_labels.split("\n") if a.strip()]
            for alt in alt_list:
                alt_lower = alt.lower()
                if len(alt_lower) > 1 and alt_lower not in existing_aliases:
                    alias_objects.append(models.SkillSetuSkillAlias(
                        alias_name=alt_lower,
                        canonical_skill_id=sid
                    ))
                    existing_aliases.add(alt_lower)

    if new_skill_objects:
        for i in range(0, len(new_skill_objects), 2000):
            db.bulk_save_objects(new_skill_objects[i:i+2000])
            db.commit()
        logger.info(f"✅ Ingested {len(new_skill_objects)} ESCO skills into skillsetu_skills.")

    if alias_objects:
        for i in range(0, len(alias_objects), 2000):
            db.bulk_save_objects(alias_objects[i:i+2000])
            db.commit()
        logger.info(f"✅ Ingested {len(alias_objects)} skill aliases.")

    # Seed curated tech skills
    curated_skills = [
        {"id": "skill_react", "name": "React", "category": "Frontend Development", "skill_type": "technical", "popularity_score": 98},
        {"id": "skill_react_native", "name": "React Native", "category": "Mobile Development", "skill_type": "technical", "popularity_score": 95},
        {"id": "skill_javascript", "name": "JavaScript", "category": "Programming Languages", "skill_type": "technical", "popularity_score": 99},
        {"id": "skill_typescript", "name": "TypeScript", "category": "Programming Languages", "skill_type": "technical", "popularity_score": 96},
        {"id": "skill_html_css", "name": "HTML & CSS", "category": "Frontend Development", "skill_type": "technical", "popularity_score": 97},
        {"id": "skill_python", "name": "Python", "category": "Programming Languages", "skill_type": "technical", "popularity_score": 99},
        {"id": "skill_nodejs", "name": "Node.js", "category": "Backend Development", "skill_type": "technical", "popularity_score": 94},
        {"id": "skill_fastapi", "name": "FastAPI", "category": "Backend Development", "skill_type": "technical", "popularity_score": 90},
        {"id": "skill_sql", "name": "SQL", "category": "Databases & Storage", "skill_type": "technical", "popularity_score": 96},
        {"id": "skill_postgresql", "name": "PostgreSQL", "category": "Databases & Storage", "skill_type": "technical", "popularity_score": 92},
        {"id": "skill_mongodb", "name": "MongoDB", "category": "Databases & Storage", "skill_type": "technical", "popularity_score": 88},
        {"id": "skill_redis", "name": "Redis", "category": "Databases & Storage", "skill_type": "technical", "popularity_score": 85},
        {"id": "skill_docker", "name": "Docker", "category": "DevOps & Infrastructure", "popularity_score": 93},
        {"id": "skill_kubernetes", "name": "Kubernetes", "category": "DevOps & Infrastructure", "popularity_score": 87},
        {"id": "skill_aws", "name": "Amazon Web Services (AWS)", "category": "Cloud Computing", "popularity_score": 94},
        {"id": "skill_git", "name": "Git & GitHub", "category": "Development Tools", "popularity_score": 98},
        {"id": "skill_rest_api", "name": "RESTful APIs", "category": "Backend Development", "popularity_score": 95},
        {"id": "skill_graphql", "name": "GraphQL", "category": "Backend Development", "popularity_score": 84},
        {"id": "skill_java", "name": "Java", "category": "Programming Languages", "popularity_score": 93},
        {"id": "skill_spring_boot", "name": "Spring Boot", "category": "Backend Development", "popularity_score": 89},
        {"id": "skill_c_plus_plus", "name": "C++", "category": "Programming Languages", "popularity_score": 91},
        {"id": "skill_data_analysis", "name": "Data Analysis", "category": "Data & Analytics", "popularity_score": 92},
        {"id": "skill_pandas", "name": "Pandas & NumPy", "category": "Data & Analytics", "popularity_score": 90},
        {"id": "skill_machine_learning", "name": "Machine Learning", "category": "Artificial Intelligence", "popularity_score": 96},
        {"id": "skill_tensorflow", "name": "TensorFlow / PyTorch", "category": "Artificial Intelligence", "popularity_score": 91},
        {"id": "skill_figma", "name": "Figma", "category": "UI/UX Design", "popularity_score": 94},
        {"id": "skill_ui_ux", "name": "UI/UX Design", "category": "UI/UX Design", "popularity_score": 93},
        {"id": "skill_cybersecurity", "name": "Cybersecurity & Network Security", "category": "Security", "popularity_score": 88},
        {"id": "skill_agile", "name": "Agile / Scrum", "category": "Project Management", "skill_type": "soft_skill", "popularity_score": 85}
    ]
    for s in curated_skills:
        existing = db.query(models.SkillSetuSkill).filter(models.SkillSetuSkill.id == s["id"]).first()
        if existing:
            existing.popularity_score = s["popularity_score"]
            existing.category = s["category"]
        else:
            db.add(models.SkillSetuSkill(**s))
    db.commit()

    # Curated aliases
    curated_aliases = [
        ("react.js", "skill_react"),
        ("reactjs", "skill_react"),
        ("react js", "skill_react"),
        ("react framework", "skill_react"),
        ("react-native", "skill_react_native"),
        ("reactnative", "skill_react_native"),
        ("js", "skill_javascript"),
        ("ecmascript", "skill_javascript"),
        ("ts", "skill_typescript"),
        ("html", "skill_html_css"),
        ("css", "skill_html_css"),
        ("html5", "skill_html_css"),
        ("py", "skill_python"),
        ("python3", "skill_python"),
        ("node", "skill_nodejs"),
        ("node.js", "skill_nodejs"),
        ("nodejs", "skill_nodejs"),
        ("fast api", "skill_fastapi"),
        ("postgres", "skill_postgresql"),
        ("postgres db", "skill_postgresql"),
        ("mongo", "skill_mongodb"),
        ("k8s", "skill_kubernetes"),
        ("amazon web services", "skill_aws"),
        ("github", "skill_git"),
        ("git & github", "skill_git"),
        ("rest", "skill_rest_api"),
        ("rest api", "skill_rest_api"),
        ("spring", "skill_spring_boot"),
        ("springboot", "skill_spring_boot"),
        ("cpp", "skill_c_plus_plus"),
        ("c++", "skill_c_plus_plus"),
        ("ml", "skill_machine_learning"),
        ("machine learning", "skill_machine_learning"),
        ("pytorch", "skill_tensorflow"),
        ("tf", "skill_tensorflow"),
        ("ui/ux", "skill_ui_ux"),
        ("figma design", "skill_figma")
    ]
    for alias, can_id in curated_aliases:
        existing = db.query(models.SkillSetuSkillAlias).filter(models.SkillSetuSkillAlias.alias_name == alias.lower()).first()
        if not existing:
            db.add(models.SkillSetuSkillAlias(alias_name=alias.lower(), canonical_skill_id=can_id))
    db.commit()


def seed_locations_if_empty(db: Session):
    """
    Seeds essential and popular locations into skillsetu_locations table ONLY if empty.
    """
    if db.query(models.SkillSetuLocation.id).first() is not None:
        return

    logger.info("Seeding locations into skillsetu_locations...")
    
    popular_tech_locations = [
        {"id": "loc_remote_global", "name": "Remote (Global / India)", "type": "locality", "city": "Remote", "state": "Remote", "country": "Global", "country_code": "GL", "is_popular": True, "popularity_score": 100},
        {"id": "loc_city_in_pune", "name": "Pune, Maharashtra, India", "type": "city", "city": "Pune", "district": "Maharashtra", "state": "Maharashtra", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 95},
        {"id": "loc_city_in_mumbai", "name": "Mumbai, Maharashtra, India", "type": "city", "city": "Mumbai", "district": "Maharashtra", "state": "Maharashtra", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 98},
        {"id": "loc_city_in_bengaluru", "name": "Bengaluru, Karnataka, India", "type": "city", "city": "Bengaluru", "district": "Karnataka", "state": "Karnataka", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 100},
        {"id": "loc_city_in_hyderabad", "name": "Hyderabad, Telangana, India", "type": "city", "city": "Hyderabad", "district": "Telangana", "state": "Telangana", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 96},
        {"id": "loc_city_in_delhi", "name": "New Delhi / Delhi NCR, India", "type": "city", "city": "New Delhi", "district": "Delhi", "state": "Delhi", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 96},
        {"id": "loc_city_in_noida", "name": "Noida, Uttar Pradesh, India", "type": "city", "city": "Noida", "district": "Uttar Pradesh", "state": "Uttar Pradesh", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 90},
        {"id": "loc_city_in_gurgaon", "name": "Gurugram / Gurgaon, Haryana, India", "type": "city", "city": "Gurugram", "district": "Haryana", "state": "Haryana", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 92},
        {"id": "loc_city_in_chennai", "name": "Chennai, Tamil Nadu, India", "type": "city", "city": "Chennai", "district": "Tamil Nadu", "state": "Tamil Nadu", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 90},
        {"id": "loc_city_in_ahmedabad", "name": "Ahmedabad, Gujarat, India", "type": "city", "city": "Ahmedabad", "district": "Gujarat", "state": "Gujarat", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 88},
        {"id": "loc_city_in_kolkata", "name": "Kolkata, West Bengal, India", "type": "city", "country": "India", "country_code": "IN", "state": "West Bengal", "district": "West Bengal", "is_popular": True, "popularity_score": 85},
        {"id": "loc_city_us_sf", "name": "San Francisco, California, United States", "type": "city", "city": "San Francisco", "district": "California", "state": "California", "country": "United States", "country_code": "US", "is_popular": True, "popularity_score": 95},
        {"id": "loc_city_us_ny", "name": "New York, New York, United States", "type": "city", "city": "New York", "district": "New York", "state": "New York", "country": "United States", "country_code": "US", "is_popular": True, "popularity_score": 94},
        {"id": "loc_city_gb_london", "name": "London, United Kingdom", "type": "city", "city": "London", "country": "United Kingdom", "country_code": "GB", "is_popular": True, "popularity_score": 93},
        {"id": "loc_city_sg_singapore", "name": "Singapore, Singapore", "type": "city", "city": "Singapore", "country": "Singapore", "country_code": "SG", "is_popular": True, "popularity_score": 92},
        {"id": "loc_city_ae_dubai", "name": "Dubai, United Arab Emirates", "type": "city", "city": "Dubai", "country": "United Arab Emirates", "country_code": "AE", "is_popular": True, "popularity_score": 90},
        {"id": "loc_city_de_berlin", "name": "Berlin, Germany", "type": "city", "city": "Berlin", "country": "Germany", "country_code": "DE", "is_popular": True, "popularity_score": 88},
        {"id": "loc_cntry_in", "name": "India", "type": "country", "country": "India", "country_code": "IN", "is_popular": True, "popularity_score": 100},
        {"id": "loc_cntry_us", "name": "United States", "type": "country", "country": "United States", "country_code": "US", "is_popular": True, "popularity_score": 95},
        {"id": "loc_cntry_gb", "name": "United Kingdom", "type": "country", "country": "United Kingdom", "country_code": "GB", "is_popular": True, "popularity_score": 90},
    ]

    for loc in popular_tech_locations:
        db.add(models.SkillSetuLocation(**loc))
    db.commit()
    logger.info(f"✅ Seeded {len(popular_tech_locations)} default locations.")


def warmup_ai_embedding_model():
    """
    Downloads and warms up the configured FastEmbed TextEmbedding model.
    """
    try:
        logger.info(f"🤖 Initializing / Downloading AI embedding model '{settings.COURSE_EMBEDDING_MODEL}'...")
        from app.services.embedding_service import get_embedding_model
        model = get_embedding_model()
        # Warmup test embedding
        list(model.embed(["SkillSetu AI Model Warmup Test"]))
        logger.info(f"✨ AI Embedding model '{settings.COURSE_EMBEDDING_MODEL}' ready!")
    except Exception as e:
        logger.error(f"⚠️ Warning: Could not pre-warm embedding model: {e}")


def init_system_on_startup(force_reseed: bool = False):
    """
    Main entrypoint called during server startup:
    1. Ensures DB schema is created.
    2. Ingests ESCO dataset if not present.
    3. Seeds default course providers.
    4. Downloads/warms up the embedding model.
    """
    logger.info("🚀 SkillSetu Backend Initialization starting...")
    
    # 1. Create tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables verified/created.")
    except Exception as e:
        logger.error(f"❌ Failed to verify database tables: {e}")
        raise e

    db: Session = SessionLocal()
    try:
        # 2. ESCO & Taxonomy Seeding
        already_seeded = is_esco_data_seeded(db)
        if not already_seeded or force_reseed:
            esco_dir = find_esco_data_dir()
            if esco_dir:
                logger.info(f"🌱 Ingesting ESCO dataset into PostgreSQL from {esco_dir}...")
                seed_esco_and_taxonomy(db, esco_dir)
            else:
                logger.warning("⚠️ ESCO data folder not found. Please place CSVs in Backend/data/esco/")
        else:
            logger.info("✅ ESCO and SkillSetu taxonomy data already seeded in PostgreSQL.")

        # 3. Seed locations
        seed_locations_if_empty(db)

        # 4. Seed course providers only if empty
        if db.query(models.Provider.id).first() is None:
            seed_default_providers(db)
            logger.info("✅ Default course providers verified/seeded.")

        # 5. Seed default admin account if empty
        if db.query(models.AdminUser).first() is None:
            from app.security import hash_password
            admin = models.AdminUser(
                name="SkillSetu Admin",
                email="admin@skillsetu.com",
                password_hash=hash_password("admin123"),
                role="admin",
                status="ACTIVE"
            )
            db.add(admin)
            db.commit()
            logger.info("✅ Default admin user (admin@skillsetu.com) seeded.")

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error during data seeding: {e}")
    finally:
        db.close()

    # 6. Pre-download / warm up AI embedding model
    warmup_ai_embedding_model()
    
    logger.info("🎉 SkillSetu Backend initialization completed successfully!")
