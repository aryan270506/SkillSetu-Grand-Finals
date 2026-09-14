import os
import sys
import csv
import re
import uuid
from sqlalchemy.orm import Session

# Add Backend root directory to sys.path so app modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine, Base, SessionLocal
from app import models

csv.field_size_limit(sys.maxsize)

def slugify(text: str) -> str:
    cleaned = re.sub(r'[^\w\s-]', '', text.lower())
    return re.sub(r'[-\s]+', '_', cleaned).strip('_')

def run_etl():
    print("==================================================")
    print("  SkillSetu ESCO Dataset & Global Taxonomy ETL   ")
    print("==================================================")

    # 1. Create database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    esco_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'esco'))
    print(f"Reading ESCO dataset from: {esco_dir}")

    try:
        # ----------------------------------------------------
        # Phase 1: Ingest ESCO Raw Occupations
        # ----------------------------------------------------
        occ_csv = os.path.join(esco_dir, 'occupations_en.csv')
        if os.path.exists(occ_csv):
            print("\nProcessing ESCO Occupations into esco_occupations...")
            existing_uris = {u[0] for u in db.query(models.EscoOccupation.concept_uri).all()}
            new_occs = []
            with open(occ_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    uri = row.get('conceptUri')
                    if uri and uri not in existing_uris:
                        new_occs.append(models.EscoOccupation(
                            concept_uri=uri,
                            isco_code=row.get('iscoGroup', ''),
                            preferred_label=row.get('preferredLabel', ''),
                            alt_labels=row.get('altLabels', ''),
                            description=row.get('description', '')
                        ))
                        existing_uris.add(uri)

            if new_occs:
                db.bulk_save_objects(new_occs)
                db.commit()
                print(f"-> Saved {len(new_occs)} raw ESCO occupations.")
            else:
                print("-> Raw ESCO occupations up to date.")

        # ----------------------------------------------------
        # Phase 2: Ingest ESCO Raw Skills
        # ----------------------------------------------------
        skill_csv = os.path.join(esco_dir, 'skills_en.csv')
        if os.path.exists(skill_csv):
            print("\nProcessing ESCO Skills into esco_skills...")
            existing_skill_uris = {u[0] for u in db.query(models.EscoSkill.concept_uri).all()}
            new_skills = []
            with open(skill_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    uri = row.get('conceptUri')
                    if uri and uri not in existing_skill_uris:
                        new_skills.append(models.EscoSkill(
                            concept_uri=uri,
                            skill_type=row.get('skillType', ''),
                            reuse_level=row.get('reuseLevel', ''),
                            preferred_label=row.get('preferredLabel', ''),
                            alt_labels=row.get('altLabels', ''),
                            description=row.get('description', '')
                        ))
                        existing_skill_uris.add(uri)

            if new_skills:
                db.bulk_save_objects(new_skills)
                db.commit()
                print(f"-> Saved {len(new_skills)} raw ESCO skills.")
            else:
                print("-> Raw ESCO skills up to date.")

        # ----------------------------------------------------
        # Phase 3: Ingest ESCO Occupation-Skill Relations
        # ----------------------------------------------------
        rel_csv = os.path.join(esco_dir, 'occupationSkillRelations_en.csv')
        if os.path.exists(rel_csv) and db.query(models.EscoOccupationSkill).count() == 0:
            print("\nProcessing ESCO Occupation-Skill Relations...")
            new_rels = []
            with open(rel_csv, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    new_rels.append(models.EscoOccupationSkill(
                        occupation_uri=row.get('occupationUri', ''),
                        skill_uri=row.get('skillUri', ''),
                        relation_type=row.get('relationType', ''),
                        skill_type=row.get('skillType', '')
                    ))
                    if len(new_rels) >= 10000:
                        db.bulk_save_objects(new_rels)
                        db.commit()
                        new_rels = []
            if new_rels:
                db.bulk_save_objects(new_rels)
                db.commit()
            print(f"-> Saved ESCO occupation-skill relations into esco_occupation_skills table.")

        # ----------------------------------------------------
        # Phase 4: Import ALL 3,039+ ESCO Occupations into skillsetu_careers
        # ----------------------------------------------------
        print("\nImporting ALL ESCO Occupations into skillsetu_careers...")
        existing_career_ids = {c[0] for c in db.query(models.SkillSetuCareer.id).all()}
        esco_occs = db.query(models.EscoOccupation).all()
        
        new_career_objects = []
        for occ in esco_occs:
            # Generate deterministic canonical ID based on UUID in concept_uri or slug
            uri_part = occ.concept_uri.split('/')[-1]
            cid = f"car_esco_{uri_part}"
            if cid not in existing_career_ids:
                # Basic category heuristic based on title or ISCO
                category = "General Professional"
                lbl_lower = occ.preferred_label.lower()
                if any(w in lbl_lower for w in ['developer', 'engineer', 'software', 'programmer', 'data', 'computer', 'network', 'system', 'web', 'cyber', 'it']):
                    category = "Software & IT Engineering"
                elif any(w in lbl_lower for w in ['manager', 'director', 'chief', 'head', 'lead']):
                    category = "Management & Leadership"
                elif any(w in lbl_lower for w in ['designer', 'artist', 'graphics', 'media']):
                    category = "Design & Creative"
                elif any(w in lbl_lower for w in ['analyst', 'researcher', 'scientist']):
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
            # Bulk save in batches of 1000
            for i in range(0, len(new_career_objects), 1000):
                db.bulk_save_objects(new_career_objects[i:i+1000])
                db.commit()
            print(f"-> Imported {len(new_career_objects)} additional ESCO occupations into skillsetu_careers!")
        else:
            print("-> SkillSetu careers table fully populated.")

        # Seed/Update curated popular tech careers with high popularity score
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
        # Phase 5: Import ALL 13,939+ ESCO Skills into skillsetu_skills
        # ----------------------------------------------------
        print("\nImporting ALL ESCO Skills into skillsetu_skills...")
        existing_skill_ids = {s[0] for s in db.query(models.SkillSetuSkill.id).all()}
        esco_skills = db.query(models.EscoSkill).all()

        new_skill_objects = []
        alias_objects = []
        existing_aliases = {a[0] for a in db.query(models.SkillSetuSkillAlias.alias_name).all()}

        for sk in esco_skills:
            uri_part = sk.concept_uri.split('/')[-1]
            sid = f"skill_esco_{uri_part}"

            if sid not in existing_skill_ids:
                category = "General Skill"
                stype = "technical" if sk.skill_type == 'skill/competence' else "knowledge"
                lbl_lower = sk.preferred_label.lower()

                if any(w in lbl_lower for w in ['software', 'programming', 'code', 'web', 'script', 'data', 'database', 'cloud', 'security', 'algorithm', 'system', 'testing', 'network']):
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
                alt_list = [a.strip() for a in sk.alt_labels.split('\n') if a.strip()]
                for alt in alt_list:
                    alt_lower = alt.lower()
                    if len(alt_lower) > 1 and alt_lower not in existing_aliases:
                        alias_objects.append(models.SkillSetuSkillAlias(
                            alias_name=alt_lower,
                            canonical_skill_id=sid
                        ))
                        existing_aliases.add(alt_lower)

        if new_skill_objects:
            print(f"-> Bulk inserting {len(new_skill_objects)} skills...")
            for i in range(0, len(new_skill_objects), 2000):
                db.bulk_save_objects(new_skill_objects[i:i+2000])
                db.commit()
            print(f"-> Imported {len(new_skill_objects)} ESCO skills into skillsetu_skills!")
        else:
            print("-> SkillSetu skills table fully populated.")

        if alias_objects:
            print(f"-> Bulk inserting {len(alias_objects)} skill aliases...")
            for i in range(0, len(alias_objects), 2000):
                db.bulk_save_objects(alias_objects[i:i+2000])
                db.commit()
            print(f"-> Imported {len(alias_objects)} skill aliases!")

        # Seed/Update curated popular tech skills with high popularity score
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

        # Seed Tech Skill Aliases
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

        # ----------------------------------------------------
        # Phase 6: Import Complete Global & Indian Geographic Dataset (dr5hn Countries+States+Cities)
        # ----------------------------------------------------
        print("\nImporting Complete Global Geographic Dataset (Countries + States + Cities/Localities)...")
        import urllib.request
        import json

        geo_url = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries%2Bstates%2Bcities.json"
        print(f"-> Downloading master dataset from: {geo_url}")
        req = urllib.request.urlopen(geo_url)
        raw_geo = json.loads(req.read().decode('utf-8'))

        existing_loc_ids = {l[0] for l in db.query(models.SkillSetuLocation.id).all()}
        
        popular_city_names = {
            "pune", "mumbai", "bengaluru", "bangalore", "hyderabad", "delhi", "new delhi", 
            "chennai", "ahmedabad", "san francisco", "new york", "london", "tokyo", 
            "singapore", "dubai", "berlin", "toronto", "sydney"
        }

        loc_objects = []

        # Add Remote Location
        if "loc_remote_global" not in existing_loc_ids:
            loc_objects.append(models.SkillSetuLocation(
                id="loc_remote_global",
                name="Remote (Global / India)",
                type="locality",
                city="Remote",
                state="Remote",
                country="Global",
                country_code="GL",
                parent_location_id=None,
                is_popular=True,
                popularity_score=100
            ))
            existing_loc_ids.add("loc_remote_global")

        for c in raw_geo:
            c_name = c.get("name", "").strip()
            c_iso2 = c.get("iso2", "").upper()
            c_id = f"loc_cntry_{c_iso2.lower()}"

            if c_name and c_id not in existing_loc_ids:
                loc_objects.append(models.SkillSetuLocation(
                    id=c_id,
                    name=c_name,
                    type="country",
                    city=None,
                    district=None,
                    state=None,
                    country=c_name,
                    country_code=c_iso2,
                    parent_location_id=None,
                    is_popular=False,
                    popularity_score=30
                ))
                existing_loc_ids.add(c_id)

            for st in c.get("states", []):
                st_name = st.get("name", "").strip()
                st_code = (st.get("state_code") or "st").lower()
                st_id = f"loc_st_{c_iso2.lower()}_{st_code}"

                if st_name and st_id not in existing_loc_ids:
                    loc_objects.append(models.SkillSetuLocation(
                        id=st_id,
                        name=f"{st_name}, {c_name}",
                        type="state",
                        city=None,
                        district=None,
                        state=st_name,
                        country=c_name,
                        country_code=c_iso2,
                        parent_location_id=c_id,
                        is_popular=False,
                        popularity_score=20
                    ))
                    existing_loc_ids.add(st_id)

                for ct in st.get("cities", []):
                    ct_name = ct.get("name", "").strip()
                    ct_raw_id = ct.get("id")
                    ct_id = f"loc_city_{c_iso2.lower()}_{ct_raw_id}"

                    if ct_name and ct_id not in existing_loc_ids:
                        is_pop = ct_name.lower() in popular_city_names
                        pop_score = 95 if is_pop else 10

                        loc_objects.append(models.SkillSetuLocation(
                            id=ct_id,
                            name=f"{ct_name}, {st_name}, {c_name}" if st_name else f"{ct_name}, {c_name}",
                            type="city",
                            city=ct_name,
                            district=st_name,
                            state=st_name,
                            country=c_name,
                            country_code=c_iso2,
                            parent_location_id=st_id,
                            is_popular=is_pop,
                            popularity_score=pop_score
                        ))
                        existing_loc_ids.add(ct_id)

        if loc_objects:
            print(f"-> Bulk saving {len(loc_objects)} location records into skillsetu_locations...")
            for i in range(0, len(loc_objects), 5000):
                db.bulk_save_objects(loc_objects[i:i+5000])
                db.commit()
            print(f"-> Successfully imported {len(loc_objects)} location records!")
        else:
            print("-> SkillSetu location table fully populated.")

        print("\n==================================================")
        print("  ETL Completed Cleanly — Full Dataset Active     ")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"ETL Error: {e}")
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    run_etl()
