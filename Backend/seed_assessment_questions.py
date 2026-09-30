# -*- coding: utf-8 -*-
"""
Database Migration & Seeder for SkillSetu Rule 35:
Strictly guarantees that EVERY assessment in PostgreSQL contains between 15 and 25 valid unique questions.
"""
import json
import logging
from sqlalchemy import func
from app.database import SessionLocal
from app import models
from app.services.assessment_questions_data import ASSESSMENT_QUESTION_DATASETS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("assessment_audit_migration")

# Additional datasets for full coverage
EXTRA_ASSESSMENTS = {
    "System Readiness": {
        "title": "Full Stack Developer System Readiness Mock",
        "skill_name": "System Readiness",
        "description": "Advanced enterprise mock examination covering distributed systems, concurrency, database performance, caching, and cloud deployment.",
        "pass_score": 75,
        "difficulty": "Advanced",
        "duration_minutes": 60,
        "questions": [
            {
                "question_text": "In a distributed microservices system, how does the Saga Pattern maintain data consistency across distributed transactions without two-phase commit locks?",
                "options": {
                    "A": "By executing a sequence of local transactions where each transaction updates data within a single service and publishes events to trigger the next step or compensating transactions on failure",
                    "B": "By locking all relational database tables globally across all microservices until all services finish",
                    "C": "By converting all SQL databases to single-node SQLite files",
                    "D": "By running all microservices in a single memory process"
                },
                "correct_option": "A",
                "explanation": "The Saga pattern orchestrates distributed workflows via choreography or orchestration, applying compensating transactions to undo preceding steps if a subsequent step fails.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the primary trade-off of database Read Replicas with asynchronous replication?",
                "options": {
                    "A": "Replication Lag can lead to 'stale reads' where newly written data on the primary is not immediately visible on replicas",
                    "B": "Replicas prevent the primary database from accepting write queries",
                    "C": "Replicas require all client queries to use WebSockets",
                    "D": "Replicas double the cost of RAM by duplicating operating systems"
                },
                "correct_option": "A",
                "explanation": "Asynchronous replication offers high write throughput and scale-out read capacity, but introduces eventual consistency and replication lag during peak load.",
                "difficulty": "Medium"
            },
            {
                "question_text": "How does Database Connection Starvation typically occur in high-concurrency Node.js / Python API services?",
                "options": {
                    "A": "When incoming HTTP requests hold database connections open while awaiting long external API calls or third-party webhooks, exhausting the connection pool",
                    "B": "When database passwords contain special characters",
                    "C": "When tables have more than 3 indexes",
                    "D": "When queries use LIMIT 10"
                },
                "correct_option": "A",
                "explanation": "Holding pool connections open during slow external I/O exhausts available pool connections, queueing and timing out all other incoming database queries.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is Cache Stampede (Thundering Herd) in web caching and what is an effective mitigation strategy?",
                "options": {
                    "A": "When a popular cached item expires and thousands of concurrent requests simultaneously hit the database to recompute it; mitigated via Mutex locks (probabilistic early expiration / XFetch) or background cache warming",
                    "B": "When Redis runs out of disk storage space",
                    "C": "When web browsers clear their localStorage cookies",
                    "D": "When CDN edge nodes disconnect from the internet"
                },
                "correct_option": "A",
                "explanation": "Mutex locks or probabilistic early recomputation ensure only a single process recomputes the expired cache key while others receive stale-while-revalidate data.",
                "difficulty": "Hard"
            },
            {
                "question_text": "In relational database indexing, what is the 'Leftmost Prefix Rule' for composite indexes on (A, B, C)?",
                "options": {
                    "A": "The index can only accelerate queries filtering on (A), (A, B), or (A, B, C); it cannot accelerate queries filtering only on (B) or (C) alone",
                    "B": "The index sorts strings alphabetically from left to right only",
                    "C": "The leftmost column must always be an integer",
                    "D": "The index only stores the leftmost 10 characters of text"
                },
                "correct_option": "A",
                "explanation": "B-Tree composite indexes are sorted in order of the columns listed; skipping the leading column prevents the tree from doing a direct range seek.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the purpose of Idempotency Keys in RESTful billing and payment processing endpoints?",
                "options": {
                    "A": "Preventing duplicate financial transactions when network retries occur by checking if a request with the unique client key has already been executed",
                    "B": "Encrypting credit card numbers in transit",
                    "C": "Generating receipts in PDF format",
                    "D": "Verifying user bank account balances"
                },
                "correct_option": "A",
                "explanation": "Idempotency keys ensure that repeated requests with the same identifier return the cached previous outcome rather than creating duplicate charges.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What distinguishes Eventual Consistency from Strong Consistency in distributed data architectures?",
                "options": {
                    "A": "Strong consistency guarantees all readers see the latest write immediately; Eventual consistency guarantees all replicas will converge to the same state after some period of time without new updates",
                    "B": "Eventual consistency never updates records",
                    "C": "Strong consistency only works on single-core processors",
                    "D": "Eventual consistency requires continuous internet connection"
                },
                "correct_option": "A",
                "explanation": "Eventual consistency trades instantaneous cross-node visibility for lower write latency and higher availability under network partitions.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the function of an API Gateway in modern enterprise architecture?",
                "options": {
                    "A": "Acting as a single reverse-proxy entry point providing centralized authentication, rate limiting, request routing, SSL termination, and observability metrics for backend microservices",
                    "B": "Hosting relational databases in the cloud",
                    "C": "Compiling frontend React code into native binaries",
                    "D": "Sending automated marketing emails"
                },
                "correct_option": "A",
                "explanation": "API Gateways decouple external clients from internal service topology while centralizing cross-cutting security and traffic management policies.",
                "difficulty": "Easy"
            },
            {
                "question_text": "How does Database Connection Pooling reduce request latency in high-traffic web applications?",
                "options": {
                    "A": "By maintaining a set of persistent database TCP connections that are checked out and returned rather than performing TLS/TCP handshakes per HTTP request",
                    "B": "By converting all SQL queries into flat JSON files",
                    "C": "By running database queries on the client's browser",
                    "D": "By bypassing database user authentication"
                },
                "correct_option": "A",
                "explanation": "Pre-warmed connection pools eliminate TCP/SSL handshake round-trips and authentication overhead on every transaction.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the primary benefit of deploying services in a Zero-Downtime Blue-Green Deployment model?",
                "options": {
                    "A": "Two identical production environments (Blue active, Green idle) allow deploying and testing new releases on Green before switching load balancer router traffic instantaneously, with instant rollback if issues arise",
                    "B": "It halves server hosting costs by turning off servers at night",
                    "C": "It removes the requirement for database backups",
                    "D": "It forces all users to clear their browser cache"
                },
                "correct_option": "A",
                "explanation": "Blue-Green deployment eliminates downtime during releases and offers instantaneous rollback by routing router traffic back to the old environment.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the risk of the 'N+1 Query Problem' in ORM data access layers and how is it resolved?",
                "options": {
                    "A": "Executing 1 query to fetch parent records and then N additional queries for each child relation; resolved using eager loading (JOIN FETCH, `select_related` / `prefetch_related`)",
                    "B": "Having N+1 database administrator accounts",
                    "C": "Creating N+1 tables for a single entity",
                    "D": "Running queries N+1 times to verify accuracy"
                },
                "correct_option": "A",
                "explanation": "N+1 queries cause catastrophic database round-trip overhead; resolved by eager loading relations via SQL JOINs in a single query.",
                "difficulty": "Medium"
            },
            {
                "question_text": "How does Distributed Tracing (e.g. OpenTelemetry, Jaeger) assist in debugging microservice latency bottlenecks?",
                "options": {
                    "A": "By propagating a unique Trace ID across HTTP/gRPC request headers through all downstream services to visualize the timeline span breakdown of every service call",
                    "B": "By recording video of developer desktop screens",
                    "C": "By taking daily database snapshots",
                    "D": "By compressing server log files"
                },
                "correct_option": "A",
                "explanation": "Trace context propagation maps the complete end-to-end journey of a request across microservices, identifying exact latency bottlenecks.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the purpose of Rate Limiting algorithms like 'Token Bucket' or 'Leaky Bucket'?",
                "options": {
                    "A": "Controlling the rate of incoming traffic to protect downstream APIs from overload, burst abuse, and denial-of-service degradation",
                    "B": "Throttling client download speeds for paid video subscriptions",
                    "C": "Deleting inactive user accounts automatically",
                    "D": "Measuring developer code commit frequency"
                },
                "correct_option": "A",
                "explanation": "Token bucket allows controlled bursts while enforcing average request rate limits over defined time windows.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the difference between Synchronous and Asynchronous inter-service communication in microservices?",
                "options": {
                    "A": "Synchronous (REST/gRPC) blocks the caller waiting for an immediate response; Asynchronous (Message Brokers like RabbitMQ/Kafka) publishes events without blocking, decoupling services temporally",
                    "B": "Asynchronous communication only works over Bluetooth",
                    "C": "Synchronous communication is always faster than asynchronous",
                    "D": "Asynchronous communication cannot transmit JSON data"
                },
                "correct_option": "A",
                "explanation": "Asynchronous message brokering provides temporal decoupling, load buffering, and fault isolation across services.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What does Database Sharding achieve that standard Read Replicas cannot?",
                "options": {
                    "A": "Horizontal write scalability and dataset partitioning across multiple independent database nodes based on a shard key",
                    "B": "Automatic schema migration generation",
                    "C": "Elimination of foreign key relationships entirely",
                    "D": "Real-time client WebSocket updates"
                },
                "correct_option": "A",
                "explanation": "Read replicas only scale read throughput; sharding partitions the actual data and write traffic across multiple database servers.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the primary function of a Web Application Firewall (WAF)?",
                "options": {
                    "A": "Inspecting incoming HTTP/HTTPS traffic to filter and block application-layer attacks (SQLi, XSS, CSRF, malicious bots) before reaching backend servers",
                    "B": "Formatting frontend CSS stylesheets",
                    "C": "Generating SSL certificates on the fly",
                    "D": "Encrypting database hard drives"
                },
                "correct_option": "A",
                "explanation": "WAF operates at Layer 7 to analyze web traffic payloads for known attack signatures and malicious request patterns.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is a 'Canary Deployment' in continuous delivery pipelines?",
                "options": {
                    "A": "Gradually rolling out a new application version to a small subset of real users (e.g. 5%) to monitor errors and performance before full release",
                    "B": "Deploying code exclusively to developer laptops",
                    "C": "Testing applications in flight simulators",
                    "D": "Disabling server logging for 24 hours"
                },
                "correct_option": "A",
                "explanation": "Canary releases expose new code to a fraction of live traffic, reducing risk by detecting anomalies before full-scale deployment.",
                "difficulty": "Medium"
            },
            {
                "question_text": "What is the difference between State Machine replication and Log Shipping in database high availability?",
                "options": {
                    "A": "State Machine replication applies identical deterministic operations across nodes (e.g. Raft/Paxos); Log Shipping streams physical WAL binary changes to replicas",
                    "B": "Log Shipping is only for MySQL and State Machine is only for PostgreSQL",
                    "C": "State Machine replication stores data in CSV files",
                    "D": "Log shipping requires shipping physical hard drives"
                },
                "correct_option": "A",
                "explanation": "Log shipping transfers transaction journal (WAL) byte streams to standby nodes; consensus state machines replicate ordered command logs.",
                "difficulty": "Hard"
            },
            {
                "question_text": "What is the purpose of JWT Refresh Tokens compared to Access Tokens?",
                "options": {
                    "A": "Access tokens are short-lived (e.g. 15 mins) for low blast radius; Refresh tokens are securely stored (e.g. httpOnly cookie) to request new access tokens without requiring user re-login",
                    "B": "Refresh tokens contain the user's password in plain text",
                    "C": "Access tokens can never be revoked",
                    "D": "Refresh tokens are used only for payment processing"
                },
                "correct_option": "A",
                "explanation": "Short-lived access tokens minimize the exposure window if compromised; refresh tokens allow seamless renewal and can be revoked server-side.",
                "difficulty": "Easy"
            },
            {
                "question_text": "What is the 'Two-Generational Garbage Collection' hypothesis utilized by V8 and JVM memory managers?",
                "options": {
                    "A": "Most allocated objects die young (are short-lived), so separating memory into Nursery/Young and Tenured/Old spaces drastically reduces garbage collection pause times",
                    "B": "Memory must be cleared twice before recycling",
                    "C": "Garbage collectors only run when two users connect simultaneously",
                    "D": "Old objects are automatically written to external USB drives"
                },
                "correct_option": "A",
                "explanation": "The generational hypothesis allows collectors to scan and reclaim ephemeral objects in young generations quickly with minor GC passes.",
                "difficulty": "Hard"
            }
        ]
    }
}


def audit_and_seed_all_assessments():
    """
    Guarantees that EVERY assessment in the PostgreSQL database contains between 15 and 25 questions.
    """
    db = SessionLocal()
    try:
        logger.info("Starting SkillSetu Rule 35 Assessment Audit and Question Seeding...")

        all_datasets = {**ASSESSMENT_QUESTION_DATASETS, **EXTRA_ASSESSMENTS}

        for key, d_info in all_datasets.items():
            skill_target = d_info.get("skill_name") or key
            title_target = d_info["title"]
            pass_score = d_info.get("pass_score", 70)
            desc = d_info.get("description", f"Comprehensive assessment for {key}")

            # Find or create assessment
            assessment = db.query(models.EscoAssessment).filter(
                models.EscoAssessment.title == title_target
            ).first()

            if not assessment:
                logger.info(f"Creating missing assessment: {title_target} (Skill: {skill_target})")
                assessment = models.EscoAssessment(
                    skill_name=skill_target,
                    title=title_target,
                    description=desc,
                    pass_score=pass_score
                )
                db.add(assessment)
                db.commit()
                db.refresh(assessment)

            # Audit existing questions for this assessment
            existing_questions = db.query(models.EscoAssessmentQuestion).filter(
                models.EscoAssessmentQuestion.assessment_id == assessment.id
            ).all()

            # Deduplicate any duplicate question text if present
            seen_texts = set()
            for q in existing_questions:
                norm_text = q.question_text.strip().lower()
                if norm_text in seen_texts:
                    db.delete(q)
                else:
                    seen_texts.add(norm_text)
            db.commit()

            # Refresh list
            existing_questions = db.query(models.EscoAssessmentQuestion).filter(
                models.EscoAssessmentQuestion.assessment_id == assessment.id
            ).all()
            existing_texts = {q.question_text.strip().lower() for q in existing_questions}

            # Add missing questions from dataset
            added_count = 0
            for q in d_info["questions"]:
                q_text = q["question_text"].strip()
                if q_text.lower() not in existing_texts and len(existing_texts) < 25:
                    db_q = models.EscoAssessmentQuestion(
                        assessment_id=assessment.id,
                        question_text=q_text,
                        options_json=json.dumps(q["options"]),
                        correct_option=q["correct_option"],
                        explanation=q.get("explanation", "")
                    )
                    db.add(db_q)
                    existing_texts.add(q_text.lower())
                    added_count += 1

            if added_count > 0:
                db.commit()
                logger.info(f"Added {added_count} unique questions to '{assessment.title}' (ID: {assessment.id}).")

        # Trim any assessment that has > 25 questions
        for a in db.query(models.EscoAssessment).all():
            q_list = db.query(models.EscoAssessmentQuestion).filter(
                models.EscoAssessmentQuestion.assessment_id == a.id
            ).order_by(models.EscoAssessmentQuestion.id.asc()).all()
            if len(q_list) > 25:
                # Remove extras
                for extra_q in q_list[25:]:
                    db.delete(extra_q)
                db.commit()
                logger.info(f"Trimmed '{a.title}' (ID: {a.id}) to exactly 25 questions.")

        # Comprehensive Database Audit Verification
        all_assessments = db.query(models.EscoAssessment).all()
        logger.info(f"\n=======================================================")
        logger.info(f"ASSESSMENT AUDIT REPORT — STRICT RULE 35 VALIDATION")
        logger.info(f"=======================================================")
        logger.info(f"{'ID':<4} | {'Title':<48} | {'Q Count':<8} | {'Status':<10} | {'15<=Q<=25':<10}")
        logger.info(f"-" * 90)

        all_valid = True
        for a in all_assessments:
            q_count = db.query(models.EscoAssessmentQuestion).filter(
                models.EscoAssessmentQuestion.assessment_id == a.id
            ).count()
            is_valid = (15 <= q_count <= 25)
            if not is_valid:
                all_valid = False
            logger.info(f"{a.id:<4} | {a.title[:48]:<48} | {q_count:<8} | {'VALID' if is_valid else 'INVALID':<10} | {'PASSED' if is_valid else 'FAILED':<10}")

        logger.info(f"=======================================================")
        if all_valid:
            logger.info("AUDIT RESULT: ALL ASSESSMENTS STRICTLY CONFORM TO RULE 35 (15-25 QUESTIONS).")
        else:
            logger.error("AUDIT RESULT: SOME ASSESSMENTS VIOLATE RULE 35.")

    except Exception as e:
        db.rollback()
        logger.error(f"Audit migration failed: {e}", exc_info=True)
    finally:
        db.close()


if __name__ == "__main__":
    audit_and_seed_all_assessments()
