"""
SkillSetu ESCO Dataset & Global Taxonomy ETL Script
Can be run standalone or automatically on backend startup.
"""
import os
import sys
import logging

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

from app.services.init_db_service import init_system_on_startup

if __name__ == '__main__':
    print("==================================================")
    print("  SkillSetu ESCO Dataset & Global Taxonomy ETL   ")
    print("==================================================")
    init_system_on_startup(force_reseed=False)
