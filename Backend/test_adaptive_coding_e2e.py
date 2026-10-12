import unittest
import json
from app.database import SessionLocal, Base, engine
from app import models
from app.services.code_sandbox_service import execute_code_in_sandbox
from app.services.adaptive_coding_service import (
    get_or_generate_adaptive_challenge,
    execute_and_evaluate_challenge,
    get_progressive_hint
)

class TestAdaptiveCodingE2E(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()
        
        # Ensure test student exists
        self.student = self.db.query(models.StudentUser).filter(
            models.StudentUser.email == "canonical_test_student@skillsetu.ai"
        ).first()
        if not self.student:
            self.student = models.StudentUser(
                email="canonical_test_student@skillsetu.ai",
                name="Canonical Student",
                target_role="Software Development Engineer"
            )
            self.db.add(self.student)
            self.db.commit()
            self.db.refresh(self.student)
        
        # Reset test student progress record
        prog = self.db.query(models.AdaptiveCodingProgress).filter(
            models.AdaptiveCodingProgress.student_id == self.student.id
        ).first()
        if prog:
            prog.current_challenge_id = None
            prog.completed_challenge_ids_json = "[]"
            prog.failed_challenge_ids_json = "[]"
            prog.total_xp_earned = 0
            self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_01_code_sandboxes(self):
        # 1. Python sandbox
        py_tests = [{"input": [10, 20], "expected_output": 30, "is_hidden": False}]
        res_py = execute_code_in_sandbox("python", "def solution(a, b):\n    return a + b\n", py_tests)
        self.assertTrue(res_py["passed"])
        self.assertEqual(res_py["passed_tests"], 1)

        # 2. Python sandbox failure / syntax error
        bad_py = execute_code_in_sandbox("python", "def solution(a, b):\n    return a - b\n", py_tests)
        self.assertFalse(bad_py["passed"])

        # 3. SQL sandbox
        sql_schema = "CREATE TABLE users (id INT, name TEXT); INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob');"
        sql_tests = [{"expected_output": [[1, 'Alice'], [2, 'Bob']], "is_hidden": False}]
        res_sql = execute_code_in_sandbox("sql", "SELECT * FROM users ORDER BY id ASC;", sql_tests, schema_sql=sql_schema)
        self.assertTrue(res_sql["passed"])

        # 4. JavaScript sandbox
        js_tests = [{"input": [[1, 2, 3], 2], "expected_output": [[1, 2], [3]], "is_hidden": False}]
        res_js = execute_code_in_sandbox("javascript", "function solution(arr, size) { const res = []; for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size)); return res; }", js_tests)
        self.assertTrue(res_js["passed"])

    def test_02_adaptive_question_lifecycle_and_progression(self):
        # 1. Fetch challenge tailored to profile & gap skill
        ch = get_or_generate_adaptive_challenge(
            db=self.db,
            student_id=self.student.id,
            target_career="Software Development Engineer",
            preferred_gap_skill="SQL Query Optimization",
            force_new=False
        )
        self.assertIsNotNone(ch)
        self.assertIn("challenge_id", ch)
        
        # Verify SQL starter code is empty (no solution leaked)
        if ch.get("language") == "sql":
            self.assertEqual(ch["starter_code"], "", "SQL starter code must be empty string")
        self.assertGreater(ch["total_test_count"], 0)

        # 2. Run Incorrect Code -> assert failure and retry state
        bad_eval = execute_and_evaluate_challenge(
            db=self.db,
            student_id=self.student.id,
            challenge_id=ch["challenge_id"],
            code="-- incorrect query\nSELECT user_id FROM orders;",
            is_submission=False
        )
        self.assertFalse(bad_eval["passed"])
        self.assertFalse(bad_eval["is_completed"])
        self.assertIsNotNone(bad_eval["diagnostic_feedback"])

        # 3. Request progressive hints with student code and error context
        hint_1 = get_progressive_hint(
            self.db,
            ch["challenge_id"],
            hint_level=1,
            student_code="SELECT user_id FROM orders;",
            failed_tests=bad_eval.get("test_results")
        )
        self.assertIsNotNone(hint_1["hint"])
        self.assertEqual(hint_1["hint_level"], 1)

        # 4. Submit Valid Solution -> assert completed, XP earned, and skill evidence recorded
        if ch["challenge_id"] == "ch_sql_indexing_window_01" or ch.get("language") == "sql":
            valid_code = """
            SELECT user_id, SUM(amount) AS total_spent
            FROM orders
            WHERE status = 'completed'
            GROUP BY user_id
            HAVING total_spent > 500.0
            ORDER BY total_spent DESC;
            """
        elif ch.get("language") == "python":
            valid_code = """
def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.get('left')), max_depth(root.get('right')))
"""
        else:
            valid_code = "function chunkArray(items, size) { const r = []; for (let i=0; i<items.length; i+=size) r.push(items.slice(i, i+size)); return r; }"

        good_eval = execute_and_evaluate_challenge(
            db=self.db,
            student_id=self.student.id,
            challenge_id=ch["challenge_id"],
            code=valid_code,
            is_submission=True
        )
        self.assertTrue(good_eval["passed"])
        self.assertTrue(good_eval["is_completed"])
        self.assertGreater(good_eval["xp_earned"], 0)

        # Check evidence recorded in database
        ev = self.db.query(models.StudentSkillEvidence).filter(
            models.StudentSkillEvidence.student_id == self.student.id,
            models.StudentSkillEvidence.source_type == "adaptive_coding_challenge"
        ).first()
        self.assertIsNotNone(ev)
        self.assertGreaterEqual(ev.evidence_score, 0.60)

        # 5. Fetch next adaptive challenge -> assert new question avoiding completed ID
        next_ch = get_or_generate_adaptive_challenge(
            db=self.db,
            student_id=self.student.id,
            target_career="Software Development Engineer",
            preferred_gap_skill="Python",
            force_new=True
        )
        self.assertIsNotNone(next_ch)
        self.assertNotEqual(next_ch["challenge_id"], ch["challenge_id"])

    def test_03_hint_progression_and_empty_code_safeguards(self):
        # 1. Test that SQL challenge never sends solution in starter_code
        ch = get_or_generate_adaptive_challenge(
            db=self.db,
            student_id=self.student.id,
            target_career="Database Engineer",
            preferred_gap_skill="SQL",
            force_new=False
        )
        if ch.get("language") == "sql":
            self.assertEqual(ch["starter_code"], "")
            self.assertNotIn("SELECT user_id, SUM(amount)", ch["starter_code"])

        # 2. Test progressive hint levels (1, 2, 3)
        h1 = get_progressive_hint(self.db, "ch_sql_indexing_window_01", hint_level=1)
        h2 = get_progressive_hint(self.db, "ch_sql_indexing_window_01", hint_level=2)
        h3 = get_progressive_hint(self.db, "ch_sql_indexing_window_01", hint_level=3)
        
        self.assertEqual(h1["hint_level"], 1)
        self.assertEqual(h2["hint_level"], 2)
        self.assertEqual(h3["hint_level"], 3)
        
        # Verify hints do not leak full solution query
        for h in [h1, h2, h3]:
            self.assertNotIn("HAVING total_spent > 500.0", h["hint"])
            self.assertNotIn("ORDER BY total_spent DESC;", h["hint"])

if __name__ == "__main__":
    unittest.main()
