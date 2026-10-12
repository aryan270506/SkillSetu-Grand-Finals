import json
import logging
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models

logger = logging.getLogger(__name__)

CANONICAL_ROUND_LABELS = {
    "aptitude": "Aptitude",
    "technical": "Technical Assessment",
    "interview": "AI Voice Interview",
    "gd": "Group Discussion"
}


def get_canonical_round_label(round_key: str) -> str:
    if not round_key:
        return "Assessment Round"
    return CANONICAL_ROUND_LABELS.get(round_key.lower().strip(), round_key.replace("_", " ").title())


class CandidateProgressionService:
    @staticmethod
    def get_effective_round_sequence(config: Optional[models.InternshipAssessmentConfig]) -> List[str]:
        """
        Extracts ordered, enabled round sequence from assessment config.
        Returns empty list if no assessment config or no enabled rounds configured.
        """
        if not config or not config.is_active or not config.pipeline_config:
            return []

        try:
            p_dict = json.loads(config.pipeline_config) if isinstance(config.pipeline_config, str) else config.pipeline_config
            seq = p_dict.get("round_sequence") or ["aptitude", "technical", "interview", "gd"]
            
            # Filter to enabled rounds
            enabled_seq = []
            for r in seq:
                r_clean = str(r).lower().strip()
                r_cfg = p_dict.get(r_clean, {})
                if isinstance(r_cfg, dict) and r_cfg.get("enabled", True):
                    enabled_seq.append(r_clean)
                elif r_cfg is True:
                    enabled_seq.append(r_clean)

            return enabled_seq
        except Exception as e:
            logger.warning(f"Error parsing pipeline config round sequence: {e}")
            return []

    @staticmethod
    def get_candidate_round_score(
        session: Optional[models.CandidateAssessmentSession],
        round_key: str,
        app: Optional[models.InternshipApplication] = None
    ) -> float:
        """
        Extracts authoritative assessment score for candidate in a specific round.
        Uses round_results JSON, overall_score, or match_score_at_apply as fallback.
        """
        if session and session.round_results:
            try:
                res_dict = json.loads(session.round_results) if isinstance(session.round_results, str) else session.round_results
                if isinstance(res_dict, dict) and round_key in res_dict:
                    r_item = res_dict[round_key]
                    if isinstance(r_item, dict):
                        sc = r_item.get("score")
                        if sc is not None:
                            return float(sc)
            except Exception as e:
                logger.warning(f"Error parsing round_results for score extraction: {e}")

        if session and session.overall_score is not None:
            return float(session.overall_score)

        if app and app.match_score_at_apply is not None:
            return float(app.match_score_at_apply)

        return 80.0

    @staticmethod
    def get_round_threshold(
        config: Optional[models.InternshipAssessmentConfig],
        posting: Optional[models.InternshipPosting],
        round_key: str
    ) -> float:
        """
        Extracts passing score threshold for the given round.
        """
        if config and config.pipeline_config:
            try:
                p_dict = json.loads(config.pipeline_config) if isinstance(config.pipeline_config, str) else config.pipeline_config
                r_cfg = p_dict.get(round_key, {})
                if isinstance(r_cfg, dict) and r_cfg.get("passing_score") is not None:
                    return float(r_cfg["passing_score"])
            except Exception:
                pass

        if config and config.scoring_weights:
            try:
                w_dict = json.loads(config.scoring_weights) if isinstance(config.scoring_weights, str) else config.scoring_weights
                if isinstance(w_dict, dict) and w_dict.get("passing_threshold") is not None:
                    return float(w_dict["passing_threshold"])
            except Exception:
                pass

        if posting and posting.application_threshold is not None:
            return float(posting.application_threshold)

        return 70.0

    @classmethod
    def calculate_round_ranking(
        cls,
        db: Session,
        internship_id: int,
        round_key: str
    ) -> Dict[int, Tuple[int, int]]:
        """
        Calculates authoritative 1-based ranks for all candidates in the given round.
        Returns a mapping of application_id -> (rank, total_candidates_in_round).
        """
        apps = db.query(models.InternshipApplication).filter(
            (models.InternshipApplication.internship_id == internship_id) |
            (models.InternshipApplication.source_id == str(internship_id))
        ).all()

        if not apps:
            return {}

        app_ids = [a.id for a in apps]
        sessions = db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.application_id.in_(app_ids)
        ).all()
        session_by_app = {s.application_id: s for s in sessions}

        candidate_scores = []
        for a in apps:
            s = session_by_app.get(a.id)
            c_round = (s.current_round if s and s.current_round else "aptitude").lower().strip()
            if c_round == round_key.lower().strip():
                sc = cls.get_candidate_round_score(s, round_key, a)
                candidate_scores.append({
                    "app_id": a.id,
                    "score": sc,
                    "applied_at": a.applied_at or datetime.now(timezone.utc)
                })

        # Sort descending by score, tiebreaker earlier application date
        candidate_scores.sort(key=lambda x: (-x["score"], x["applied_at"]))

        total_in_round = len(candidate_scores)
        ranking_map: Dict[int, Tuple[int, int]] = {}
        for idx, item in enumerate(candidate_scores):
            ranking_map[item["app_id"]] = (idx + 1, total_in_round)

        return ranking_map

    @classmethod
    def get_candidate_progression_details(
        cls,
        db: Session,
        company_id: int,
        internship_id: int,
        application_id: int
    ) -> Dict[str, Any]:
        """
        Builds a comprehensive assessment progression snapshot for an individual candidate.
        Strictly distinguishes between configured pipeline and unconfigured pipeline.
        """
        posting = db.query(models.InternshipPosting).filter(
            models.InternshipPosting.id == internship_id,
            models.InternshipPosting.company_id == company_id
        ).first()

        if not posting:
            raise ValueError("Internship posting not found or unauthorized for this company.")

        app = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.id == application_id,
            (
                (models.InternshipApplication.internship_id == internship_id) |
                ((models.InternshipApplication.company_id == company_id) & (models.InternshipApplication.source_id == str(internship_id)))
            )
        ).first()

        if not app:
            raise ValueError("Candidate application not found or unauthorized.")

        config = db.query(models.InternshipAssessmentConfig).filter(
            models.InternshipAssessmentConfig.internship_id == internship_id,
            models.InternshipAssessmentConfig.is_active == True
        ).first()

        round_seq = cls.get_effective_round_sequence(config)
        has_pipeline = bool(config and config.is_active and len(round_seq) > 0)

        session = db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.application_id == application_id
        ).first()

        # Audit timeline
        audits = db.query(models.ApplicationStatusAudit).filter(
            models.ApplicationStatusAudit.application_id == application_id
        ).order_by(models.ApplicationStatusAudit.changed_at.asc()).all()

        progression_history = []
        for aud in audits:
            progression_history.append({
                "id": aud.id,
                "previous_status": aud.previous_status,
                "new_status": aud.new_status,
                "notes": aud.notes,
                "timestamp": aud.changed_at.isoformat() if aud.changed_at else None,
                "changed_by_recruiter_id": aud.changed_by_recruiter_id,
            })

        app_status = (app.status or "APPLIED").upper()
        assessment_status = (session.status if session and session.status else "CREATED").upper()
        integrity_status = (session.integrity_status if session and session.integrity_status else "VERIFIED").upper()
        is_selected = (app_status in ["SELECTED", "HIRED"])

        # IF NO PIPELINE CONFIGURED: Return clean unconfigured state
        if not has_pipeline:
            match_sc = int(round(app.match_score_at_apply or 80.0))
            return {
                "has_pipeline": False,
                "has_assessment_config": False,
                "round_sequence": [],
                "round_sequence_labels": [],
                "current_round_key": None,
                "current_round_name": None,
                "current_round_index": 0,
                "total_rounds": 0,
                "assessment_score": match_sc,
                "passing_threshold": int(round(posting.application_threshold or 70.0)),
                "overall_score": match_sc,
                "rank": 1,
                "total_candidates_in_round": 1,
                "qualification_status": app_status,
                "is_score_qualified": True,
                "integrity_status": integrity_status,
                "application_status": app_status,
                "assessment_status": assessment_status,
                "next_round_key": None,
                "next_round_name": None,
                "is_final_round": False,
                "is_selected": is_selected,
                "pipeline_status": "NONE",
                "can_progress": False,
                "can_select_candidate": False,
                "progression_history": progression_history
            }

        # PIPELINE IS CONFIGURED
        is_in_round = bool(session and session.current_round)

        if not is_in_round:
            # Candidate is Shortlisted, pending entry into Round 1
            current_round_key = None
            current_round_name = "Shortlisted"
            current_round_idx = -1
            round_score = cls.get_candidate_round_score(session, round_seq[0], app)
            threshold = cls.get_round_threshold(config, posting, round_seq[0])
            next_round_key = round_seq[0]
            next_round_name = get_canonical_round_label(round_seq[0])
            is_final_round = False
            can_progress = True
            can_select_candidate = False
            pipeline_status = "SHORTLISTED"
            qualification_status = "SHORTLISTED"
            rank, total_in_round = 1, 1
        else:
            current_round_key = session.current_round.lower().strip()
            if current_round_key not in round_seq:
                current_round_key = round_seq[0]

            current_round_idx = round_seq.index(current_round_key)
            current_round_name = get_canonical_round_label(current_round_key)

            round_score = cls.get_candidate_round_score(session, current_round_key, app)
            threshold = cls.get_round_threshold(config, posting, current_round_key)

            # Ranking
            ranking_map = cls.calculate_round_ranking(db, internship_id, current_round_key)
            rank, total_in_round = ranking_map.get(application_id, (1, max(1, len(ranking_map))))

            # Dynamic determination of final round from configured sequence
            is_final_round = current_round_idx >= (len(round_seq) - 1)
            
            if is_selected:
                next_round_key = None
                next_round_name = None
                can_progress = False
                can_select_candidate = False
                pipeline_status = "COMPLETED"
                qualification_status = "SELECTED"
            elif is_final_round:
                next_round_key = None
                next_round_name = "Selection (Final Decision)"
                can_progress = False
                can_select_candidate = True
                pipeline_status = "FINAL_ROUND"
                qualification_status = "FINAL_ROUND"
            else:
                next_round_key = round_seq[current_round_idx + 1]
                next_round_name = get_canonical_round_label(next_round_key)
                can_progress = True
                can_select_candidate = False
                pipeline_status = "IN_PROGRESS"
                qualification_status = "IN_PIPELINE"

        return {
            "has_pipeline": True,
            "has_assessment_config": True,
            "round_sequence": round_seq,
            "round_sequence_labels": [get_canonical_round_label(r) for r in round_seq],
            "current_round_key": current_round_key,
            "current_round_name": current_round_name,
            "current_round_index": current_round_idx,
            "total_rounds": len(round_seq),
            "assessment_score": int(round(round_score)),
            "passing_threshold": int(round(threshold)),
            "overall_score": int(round(session.overall_score if session and session.overall_score is not None else round_score)),
            "rank": rank,
            "total_candidates_in_round": total_in_round,
            "qualification_status": qualification_status,
            "is_score_qualified": round_score >= threshold,
            "integrity_status": integrity_status,
            "application_status": app_status,
            "assessment_status": assessment_status,
            "next_round_key": next_round_key,
            "next_round_name": next_round_name,
            "is_final_round": is_final_round,
            "is_selected": is_selected,
            "pipeline_status": pipeline_status,
            "can_progress": can_progress,
            "can_select_candidate": can_select_candidate,
            "progression_history": progression_history
        }

    @classmethod
    def progress_single_candidate(
        cls,
        db: Session,
        company_id: int,
        recruiter_id: int,
        internship_id: int,
        application_id: int,
        action: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes immediate recruiter progression:
        - 'SEND_TO_NEXT_ROUND' (or 'SELECTED_FOR_NEXT_ROUND'): Moves candidate to Round 1 (if not in pipeline) or next round in sequence.
        - 'SELECT_CANDIDATE' (or 'SELECT'): Permanently selects candidate (application_status = SELECTED, pipeline = COMPLETED).
        - 'NOT_SELECTED': Marks candidate not selected.
        No intermediate review/qualification/approval screen required.
        """
        posting = db.query(models.InternshipPosting).filter(
            models.InternshipPosting.id == internship_id,
            models.InternshipPosting.company_id == company_id
        ).first()

        if not posting:
            raise ValueError("Internship posting not found or unauthorized.")

        app = db.query(models.InternshipApplication).filter(
            models.InternshipApplication.id == application_id,
            (
                (models.InternshipApplication.internship_id == internship_id) |
                ((models.InternshipApplication.company_id == company_id) & (models.InternshipApplication.source_id == str(internship_id)))
            )
        ).first()

        if not app:
            raise ValueError("Application record not found or unauthorized.")

        config = db.query(models.InternshipAssessmentConfig).filter(
            models.InternshipAssessmentConfig.internship_id == internship_id,
            models.InternshipAssessmentConfig.is_active == True
        ).first()

        round_seq = cls.get_effective_round_sequence(config)
        if not round_seq:
            raise ValueError("No active assessment pipeline is configured for this internship.")

        session = db.query(models.CandidateAssessmentSession).filter(
            models.CandidateAssessmentSession.application_id == application_id
        ).first()

        now_utc = datetime.now(timezone.utc)
        prev_status = app.status or "APPLIED"
        norm_action = action.upper().strip()

        # Check if candidate has NOT yet entered Round 1
        if not session or not session.current_round:
            if norm_action in ["SEND_TO_NEXT_ROUND", "SELECTED_FOR_NEXT_ROUND", "PROGRESS", "START_PIPELINE"]:
                first_round_key = round_seq[0]
                first_round_name = get_canonical_round_label(first_round_key)

                if not session:
                    import uuid
                    session = models.CandidateAssessmentSession(
                        id=str(uuid.uuid4()),
                        student_id=app.student_id,
                        application_id=app.id,
                        internship_id=internship_id,
                        company_id=company_id,
                        status="IN_PROGRESS",
                        current_round=first_round_key,
                        overall_score=app.match_score_at_apply or 80.0,
                        integrity_status="VERIFIED"
                    )
                    db.add(session)
                else:
                    session.current_round = first_round_key
                    session.status = "IN_PROGRESS"

                if app.status not in ["SHORTLISTED", "SELECTED"]:
                    app.status = "SHORTLISTED"
                app.notes = f"Sent to Round 1: {first_round_name}."

                audit_note = f"Recruiter sent candidate to Round 1 ({first_round_name})."
                if notes:
                    audit_note += f" Notes: {notes}"

                audit = models.ApplicationStatusAudit(
                    application_id=app.id,
                    previous_status=prev_status,
                    new_status=app.status,
                    changed_by_recruiter_id=recruiter_id,
                    notes=audit_note
                )
                db.add(audit)
                db.commit()

                return {
                    "status": "success",
                    "application_id": app.id,
                    "action": "SEND_TO_NEXT_ROUND",
                    "application_status": app.status,
                    "pipeline_status": "IN_PROGRESS",
                    "is_selected": False,
                    "is_final_round": len(round_seq) == 1,
                    "current_round_key": first_round_key,
                    "current_round_name": first_round_name,
                    "current_round_index": 0,
                    "message": f"Candidate successfully moved to Round 1 ({first_round_name})."
                }

        # Candidate is already in an active round
        current_round_key = (session.current_round or round_seq[0]).lower().strip()
        if current_round_key not in round_seq:
            current_round_key = round_seq[0]

        current_idx = round_seq.index(current_round_key)
        prev_round_name = get_canonical_round_label(current_round_key)
        is_final_round = current_idx >= (len(round_seq) - 1)

        # 1. SEND TO NEXT ROUND (or SELECT_FOR_NEXT_ROUND)
        if norm_action in ["SEND_TO_NEXT_ROUND", "SELECTED_FOR_NEXT_ROUND", "PROGRESS"]:
            if is_final_round:
                # If triggered at final round, transition to final selection
                app.status = "SELECTED"
                session.status = "COMPLETED"
                session.completed_at = now_utc
                app.notes = f"Candidate selected by recruiter following final assessment round ({prev_round_name})."

                audit_note = f"Recruiter selected candidate following final round ({prev_round_name}). Status set to SELECTED."
                if notes:
                    audit_note += f" Notes: {notes}"

                audit = models.ApplicationStatusAudit(
                    application_id=app.id,
                    previous_status=prev_status,
                    new_status="SELECTED",
                    changed_by_recruiter_id=recruiter_id,
                    notes=audit_note
                )
                db.add(audit)
                db.commit()

                return {
                    "status": "success",
                    "application_id": app.id,
                    "action": "SELECT_CANDIDATE",
                    "application_status": "SELECTED",
                    "pipeline_status": "COMPLETED",
                    "is_selected": True,
                    "is_final_round": True,
                    "previous_round_key": current_round_key,
                    "previous_round_name": prev_round_name,
                    "message": f"Candidate successfully selected after completing {prev_round_name}."
                }
            else:
                next_round_key = round_seq[current_idx + 1]
                next_round_name = get_canonical_round_label(next_round_key)

                session.current_round = next_round_key
                session.status = "IN_PROGRESS"
                # Keep shortlisted status or advance stage
                if app.status not in ["SHORTLISTED", "SELECTED"]:
                    app.status = "SHORTLISTED"
                app.notes = f"Sent to Next Round: {next_round_name} (from {prev_round_name})."

                audit_note = f"Recruiter sent candidate from {prev_round_name} to {next_round_name}."
                if notes:
                    audit_note += f" Notes: {notes}"

                audit = models.ApplicationStatusAudit(
                    application_id=app.id,
                    previous_status=prev_status,
                    new_status=f"SENT_TO_NEXT_ROUND ({next_round_name})",
                    changed_by_recruiter_id=recruiter_id,
                    notes=audit_note
                )
                db.add(audit)
                db.commit()

                is_now_final = (current_idx + 1) >= (len(round_seq) - 1)
                return {
                    "status": "success",
                    "application_id": app.id,
                    "action": "SEND_TO_NEXT_ROUND",
                    "application_status": app.status,
                    "previous_round_key": current_round_key,
                    "previous_round_name": prev_round_name,
                    "current_round_key": next_round_key,
                    "current_round_name": next_round_name,
                    "next_round_key": next_round_key,
                    "next_round_name": next_round_name,
                    "is_final_round": is_now_final,
                    "message": f"Candidate moved to {next_round_name}."
                }

        # 2. SELECT CANDIDATE (FINAL ROUND SELECTION -> SELECTED)
        elif norm_action in ["SELECT_CANDIDATE", "SELECT", "SELECTED"]:
            app.status = "SELECTED"
            session.status = "COMPLETED"
            session.completed_at = now_utc
            app.notes = f"Candidate permanently selected by recruiter following final assessment round ({prev_round_name})."

            audit_note = f"Candidate selected by recruiter following {prev_round_name}. Application status: SELECTED."
            if notes:
                audit_note += f" Notes: {notes}"

            audit = models.ApplicationStatusAudit(
                application_id=app.id,
                previous_status=prev_status,
                new_status="SELECTED",
                changed_by_recruiter_id=recruiter_id,
                notes=audit_note
            )
            db.add(audit)
            db.commit()

            return {
                "status": "success",
                "application_id": app.id,
                "action": "SELECT_CANDIDATE",
                "application_status": "SELECTED",
                "pipeline_status": "COMPLETED",
                "is_selected": True,
                "is_final_round": True,
                "previous_round_key": current_round_key,
                "previous_round_name": prev_round_name,
                "message": "Candidate successfully selected."
            }

        # 3. NOT SELECTED
        elif norm_action in ["NOT_SELECTED", "REJECT", "REJECTED"]:
            session.status = "NOT_SELECTED"
            app.status = "NOT_SELECTED"
            app.notes = f"Not selected following {prev_round_name} assessment round."

            audit_note = f"Recruiter marked candidate Not Selected during {prev_round_name} round."
            if notes:
                audit_note += f" Notes: {notes}"

            audit = models.ApplicationStatusAudit(
                application_id=app.id,
                previous_status=prev_status,
                new_status="NOT_SELECTED",
                changed_by_recruiter_id=recruiter_id,
                notes=audit_note
            )
            db.add(audit)
            db.commit()

            return {
                "status": "success",
                "application_id": app.id,
                "action": "NOT_SELECTED",
                "application_status": "NOT_SELECTED",
                "current_round_key": current_round_key,
                "current_round_name": prev_round_name,
                "message": f"Candidate marked as Not Selected in {prev_round_name} round."
            }

        else:
            raise ValueError(f"Invalid progression action: {action}. Must be 'SEND_TO_NEXT_ROUND', 'SELECT_CANDIDATE', or 'NOT_SELECTED'.")

    @classmethod
    def bulk_progress_candidates(
        cls,
        db: Session,
        company_id: int,
        recruiter_id: int,
        internship_id: int,
        action: str,
        application_ids: Optional[List[int]] = None,
        top_n: Optional[int] = None,
        current_round: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Bulk progresses candidate applications for an internship.
        Supports explicit application IDs or authoritative Top N ranked selection.
        """
        target_ids = list(application_ids or [])
        norm_action = action.upper().strip()

        # Validate active pipeline upfront for progression actions
        if norm_action in ["SEND_TO_NEXT_ROUND", "SELECTED_FOR_NEXT_ROUND", "PROGRESS", "SELECT_CANDIDATE"]:
            config = db.query(models.InternshipAssessmentConfig).filter(
                models.InternshipAssessmentConfig.internship_id == internship_id,
                models.InternshipAssessmentConfig.is_active == True
            ).first()
            round_seq = cls.get_effective_round_sequence(config)
            if not round_seq:
                raise ValueError("No active assessment pipeline is configured for this internship.")

        # If top_n is specified, resolve top N applications in current round
        if top_n and top_n > 0:
            config = db.query(models.InternshipAssessmentConfig).filter(
                models.InternshipAssessmentConfig.internship_id == internship_id,
                models.InternshipAssessmentConfig.is_active == True
            ).first()
            round_seq = cls.get_effective_round_sequence(config)
            r_key = (current_round or (round_seq[0] if round_seq else "aptitude")).lower().strip()

            ranking_map = cls.calculate_round_ranking(db, internship_id, r_key)
            # Sort application IDs by their rank
            sorted_apps = sorted(ranking_map.keys(), key=lambda aid: ranking_map[aid][0])
            target_ids = sorted_apps[:top_n]

        if not target_ids:
            return {
                "status": "success",
                "progressed_count": 0,
                "results": [],
                "message": "No candidates selected for progression."
            }

        results = []
        errors = []
        for app_id in target_ids:
            try:
                # Find specific internship_id for each application if cross-selected
                app_obj = db.query(models.InternshipApplication).filter(
                    models.InternshipApplication.id == app_id,
                    models.InternshipApplication.company_id == company_id
                ).first()
                target_internship_id = app_obj.internship_id if app_obj and app_obj.internship_id else internship_id

                res = cls.progress_single_candidate(
                    db=db,
                    company_id=company_id,
                    recruiter_id=recruiter_id,
                    internship_id=target_internship_id,
                    application_id=app_id,
                    action=action,
                    notes=notes
                )
                results.append(res)
            except Exception as e:
                logger.error(f"Error progressing application {app_id}: {e}")
                errors.append({"application_id": app_id, "error": str(e)})

        if len(results) == 0 and len(errors) > 0:
            raise ValueError(errors[0]["error"])

        return {
            "status": "success",
            "progressed_count": len(results),
            "action": action,
            "results": results,
            "errors": errors,
            "message": f"Successfully processed {len(results)} candidate(s)."
        }
