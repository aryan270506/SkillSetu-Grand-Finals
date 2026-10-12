import unittest
import json
from app.database import SessionLocal, Base, engine
from app import models
from app.services import skill_hero_service

class TestSkillHeroDataDriven(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()

        # Ensure test student exists
        self.student = self.db.query(models.StudentUser).filter(
            models.StudentUser.email == "canonical_hero_test@skillsetu.ai"
        ).first()
        if not self.student:
            self.student = models.StudentUser(
                email="canonical_hero_test@skillsetu.ai",
                name="Canonical Hero Student",
                password_hash="hash",
                target_careers='["Full Stack Developer"]',
                resume_score=72
            )
            self.db.add(self.student)
            self.db.commit()
            self.db.refresh(self.student)

    def tearDown(self):
        self.db.close()

    def test_01_full_stack_hero_data(self):
        data = skill_hero_service.get_skill_hero_data(
            db=self.db,
            student_email=self.student.email,
            career_name="Full Stack Developer"
        )
        self.assertIsNotNone(data)
        
        # 1. Target Career & Benchmark
        self.assertEqual(data["target_career"]["name"].lower(), "full stack developer")
        self.assertIn("Full Stack Systems", data["benchmark"]["name"])
        self.assertEqual(data["benchmark"]["threshold"], 80)
        self.assertEqual(data["benchmark"]["baseline_score"], 58)
        self.assertIn("NSQF Level 7", data["benchmark"]["qualification_standard"])
        self.assertIn("frontend state architectures", data["benchmark"]["description"])

        # 2. Readiness Engine
        self.assertIn("overall", data["readiness"])
        self.assertIn("technical", data["readiness"])
        self.assertIn("practical", data["readiness"])
        self.assertIn("evidence", data["readiness"])

        # 3. Real Domain Competency
        self.assertEqual(len(data["domains"]), 2)
        domain_names = [d["name"] for d in data["domains"]]
        self.assertIn("Core Architecture", domain_names)
        self.assertIn("Production Engineering", domain_names)
        for dom in data["domains"]:
            self.assertIsInstance(dom["score"], int)
            self.assertGreaterEqual(dom["score"], 0)
            self.assertLessEqual(dom["score"], 100)

        # 4. Cohort & Candidates
        self.assertGreaterEqual(data["cohort"]["total_candidates"], 1)
        self.assertIn("Across", data["cohort"]["candidate_text"])
        self.assertIn("rank_display", data["cohort"])

        # 5. Baseline Delta
        expected_delta = data["readiness"]["overall"] - data["benchmark"]["baseline_score"]
        self.assertEqual(data["baseline"]["delta"], expected_delta)

        # 6. Repositories (Honest 0 if none verified)
        self.assertEqual(data["repositories"]["verified_count"], 0)
        self.assertEqual(data["repositories"]["display_text"], "0 Verified")

        # 7. Telemetry (Honest false)
        self.assertFalse(data["telemetry"]["available"])

    def test_02_data_engineer_career_switch(self):
        data = skill_hero_service.get_skill_hero_data(
            db=self.db,
            student_email=self.student.email,
            career_name="Data Engineer"
        )
        self.assertIsNotNone(data)
        
        # 1. Benchmark changes dynamically
        self.assertIn("Data Pipeline Benchmark", data["benchmark"]["name"])
        self.assertEqual(data["benchmark"]["threshold"], 82)
        self.assertEqual(data["benchmark"]["baseline_score"], 56)
        self.assertIn("stream processing", data["benchmark"]["description"])

        # 2. Domains reflect Data Engineering skills
        domain_map = {d["name"]: d for d in data["domains"]}
        self.assertIn("Core Architecture", domain_map)
        self.assertIn("Production Engineering", domain_map)

    def test_03_verified_repositories_increment(self):
        # Insert a real project submission
        sub = models.ProjectSubmission(
            student_id=self.student.id,
            challenge_id="proj_01",
            skill_name="React Native",
            repository_url="https://github.com/test/repo",
            analysis_status="VERIFIED"
        )
        self.db.add(sub)
        self.db.commit()

        data = skill_hero_service.get_skill_hero_data(
            db=self.db,
            student_email=self.student.email,
            career_name="Full Stack Developer"
        )
        self.assertGreaterEqual(data["repositories"]["verified_count"], 1)
        self.assertIn("Verified", data["repositories"]["display_text"])
        self.assertNotEqual(data["repositories"]["display_text"], "0 Verified")

        # Clean up
        self.db.delete(sub)
        self.db.commit()

if __name__ == "__main__":
    unittest.main()
