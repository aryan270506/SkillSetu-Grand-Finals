"""AI interviewer: a LiveKit voice agent running on Gemini Live native audio.

Joins room `interview-<id>`, loads the candidate's resume + JD from the Node server,
conducts the interview, and streams every transcript line back to the server.
"""
import asyncio
import json
import logging
import os
from pathlib import Path

import aiohttp
from datetime import datetime, timezone
from dotenv import load_dotenv
from google.genai import types

os.environ.setdefault("OTEL_LOGS_EXPORTER", "none")
from livekit import agents
from livekit.agents import Agent, AgentSession, function_tool, get_job_context
from livekit.agents.voice.events import (
    AgentFalseInterruptionEvent,
    AgentStateChangedEvent,
    ConversationItemAddedEvent,
    UserInputTranscribedEvent,
    UserStateChangedEvent,
)
from livekit.agents.voice.room_io import AudioInputOptions, RoomOptions
from livekit.plugins import google, noise_cancellation

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

def _get_live_model() -> str:
    m = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025").strip()
    # Normalize Vertex AI model name or invalid suffixes when vertexai=False
    if m in ("gemini-live-2.5-flash-native-audio", "gemini-2.5-flash-native-audio-latest", "gemini-live-2.5-flash-native-audio-latest"):
        return "gemini-2.5-flash-native-audio-preview-12-2025"
    return m

log = logging.getLogger("interviewer")
SERVER_URL = os.getenv("SERVER_URL", f"http://localhost:{os.getenv('PORT', '3000')}")
AGENT_NAME = "ai-interviewer"
HEADERS = {"x-agent-secret": os.environ["LIVEKIT_API_SECRET"]}

INSTRUCTIONS = """You are Dora, an experienced, warm, patient, and highly structured Principal Software Engineer conducting a live one-to-one technical voice interview.

CRITICAL TURN-TAKING & CONVERSATIONAL RULES (STRICT OPERATIONAL DIRECTIVES):

1. COMPLETE TURNS OVER FRAGMENTS — NEVER ACKNOWLEDGE PREMATURELY:
   - When you ask a question (such as the introductory question or a technical project question), the candidate is entitled to a FULL, UNINTERRUPTED TURN to answer.
   - Do NOT acknowledge each clause, half-sentence, or fragment (e.g. saying "right", "okay", "sounds good", or repeating the university or project name) while the candidate is still delivering their answer.
   - Wait patiently until the candidate has completely concluded their answer before speaking.
   - A single candidate answer must produce exactly ONE single interviewer response that provides ONE brief acknowledgment and asks the NEXT question.

2. CONTEXTUAL HANDLING OF "HELLO", "HELLO HELLO", "हेलो", AND "RIGHT":
   - Candidates naturally use words like "hello", "हेलो", "right", "uh", "um", or "so" as thinking fillers, sentence starters, or conversational bridges while organizing their thoughts.
   - DO NOT interpret "hello", "हेलो", "right", or a self-correction as a microphone check.
   - NEVER interrupt or say "I can hear you clearly", "Yes, please continue", or "Please go ahead" UNLESS the candidate explicitly asks a direct mic-check question (e.g., "Can you hear me?", "Am I audible?", or "Is my mic working?").
   - If the candidate says "right" or "hello I am studying at...", simply stay quiet, let them finish their sentence and complete their answer.

3. FORWARD PROGRESSION — NO REPEATING QUESTIONS OR ALREADY-ACKNOWLEDGED INFO:
   - Once a candidate mentions a fact, background, or project (e.g. Sanjay Ghodawat University, ERP system, QR attendance), note it in memory and progress forward.
   - NEVER re-ask for information the candidate already shared.
   - NEVER repeat the same acknowledgment twice.
   - Move smoothly into the next logical interview phase.

4. PHASE 1: THE INTRODUCTION TURN (MANDATORY BEHAVIOR):
   - You begin the interview by welcoming {name} by name and asking for a brief, one-minute introduction of their background, studies, and engineering interests.
   - Once you have asked for this introduction, REMAIN QUIET and PATIENT. The candidate may pause, think, restart sentences, or speak in English, Hindi, or Hinglish.
   - Allow them to complete their full introduction. Do NOT interrupt them after the first sentence or university name.
   - Once they have completed their introduction, give ONE brief acknowledgment (e.g., "Thank you for the introduction, {name}!") and smoothly transition to Phase 2.

5. MULTI-LINGUAL SUPPORT (ENGLISH, HINDI, HINGLISH):
   - Candidates may speak in English, Hindi, or mixed Hinglish (e.g., "Maine ek ERP system banaya tha...", "Right, hello, I am...").
   - Understand their technical intent seamlessly. Always reply in clear, professional spoken English.

6. STRUCTURED 5-PHASE INTERVIEW PROGRESSION:
   - Phase 1 (Greeting & Introduction): Welcome {name}, ask for their 1-minute introduction. Await their full response.
   - Phase 2 (Practical Project Deep-Dive): Ask about key practical projects from their background. When they name projects (e.g., ERP or QR attendance system), anchor on them and ask about the architecture, tech stack, and their personal role.
   - Phase 3 (Core Technical & System Architecture): Ask about engineering fundamentals relevant to the Job Description (e.g., APIs, database indexing, state management, or microservices).
   - Phase 4 (Troubleshooting & Real-World Debugging): Ask how they troubleshoot a complex bug or system failure.
   - Phase 5 (Closing): Thank them warmly for their time, provide an encouraging closing remark, and THEN call the `end_interview` tool.

7. VOCAL STYLE & BREVITY:
   - Speak in warm, professional, spoken conversational English.
   - Limit your spoken response to 1-2 concise sentences.
   - Never use lists, markdown, bullet points, or multiple questions at once.
   - One turn = One concise acknowledgment + One clear question.

JOB DESCRIPTION:
{jd}

CANDIDATE RESUME:
{resume}
"""


class Interviewer(Agent):
    def __init__(self, session_data: dict) -> None:
        realtime_input_config = types.RealtimeInputConfig(
            automatic_activity_detection=types.AutomaticActivityDetection(
                disabled=False,
                silence_duration_ms=1000,  # Optimized from 1800ms to 1000ms: responsive turn completion without interrupting
                prefix_padding_ms=200,     # 200ms audio pre-buffering
                end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_LOW,  # Conservative endpointing
                start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_LOW,
            ),
            activity_handling=types.ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
        )

        super().__init__(
            instructions=INSTRUCTIONS.format(
                name=session_data["name"],
                count=session_data.get("questionCount", 5),
                jd=session_data["jd"],
                resume=session_data["resumeText"],
            ),
            llm=google.realtime.RealtimeModel(
                model=_get_live_model(),
                voice=os.getenv("GEMINI_VOICE", "Aoede"),
                api_key=os.environ["GEMINI_API_KEY"],
                temperature=0.7,
                realtime_input_config=realtime_input_config,
            ),
        )

    @function_tool()
    async def end_interview(self) -> str:
        """End the interview. Call this only AFTER you have said your closing goodbye out loud."""
        room = get_job_context().room
        await room.local_participant.publish_data(
            json.dumps({"type": "end"}), reliable=True, topic="interview"
        )
        return "The interview has ended. Do not say anything else."


async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    interview_id = ctx.room.name.removeprefix("interview-")
    http = aiohttp.ClientSession(base_url=SERVER_URL, headers=HEADERS)
    transcript_queue: asyncio.Queue = asyncio.Queue()
    seq_counter = 0

    async def _transcript_worker():
        while True:
            payload = await transcript_queue.get()
            if payload is None:
                break
            try:
                async with http.post(f"/api/interviews/{interview_id}/transcript", json=payload) as res:
                    if res.status != 200:
                        log.warning("[DIAGNOSTIC] Transcript save returned status %s for payload seq=%s", res.status, payload.get("seq"))
                    else:
                        log.info("[DIAGNOSTIC] Transcript persisted: seq=%s role=%s text=%r", payload.get("seq"), payload.get("role"), payload.get("text")[:40])
            except Exception as err:
                log.warning("[DIAGNOSTIC] Transcript save failed: %s", err)
            finally:
                transcript_queue.task_done()

    worker_task = asyncio.create_task(_transcript_worker())

    async def on_shutdown():
        # Drain the transcript queue sequentially before closing HTTP session
        await transcript_queue.join()
        transcript_queue.put_nowait(None)
        await worker_task
        await http.close()

    ctx.add_shutdown_callback(on_shutdown)

    async with http.get(f"/api/interviews/{interview_id}/context") as res:
        if res.status != 200:
            log.error("Could not load interview %s: %s", interview_id, res.status)
            return
        session_data = await res.json()

    # Session with tuned turn-handling: 800ms client min_delay, 1000ms Gemini VAD
    session = AgentSession(
        turn_handling={
            "turn_detection": "realtime_llm",
            "endpointing": {
                "mode": "fixed",
                "min_delay": 0.8,   # 800ms silence before endpointing
                "max_delay": 3.0,
            },
            "interruption": {
                "enabled": True,
                "min_duration": 0.5, # 500ms speech needed to register interruption (filters ambient noises)
                "resume_false_interruption": True,
            },
            "preemptive_generation": {
                "enabled": False,   # Disable preemptive LLM generation so turns are not formulated prematurely
            },
        }
    )

    @session.on("user_state_changed")
    def on_user_state(event: UserStateChangedEvent):
        log.info(
            "[DIAGNOSTIC][AUDIO_ACTIVITY] Candidate speech state changed: %s -> %s (at %s)",
            event.old_state, event.new_state, datetime.now(timezone.utc).isoformat()
        )

    @session.on("agent_state_changed")
    def on_agent_state(event: AgentStateChangedEvent):
        log.info(
            "[DIAGNOSTIC][AGENT_STATE] Dora state changed: %s -> %s (at %s)",
            event.old_state, event.new_state, datetime.now(timezone.utc).isoformat()
        )

    @session.on("user_input_transcribed")
    def on_transcribed(event: UserInputTranscribedEvent):
        clean = (event.transcript or "").strip()
        if not clean:
            return
        log.info(
            "[DIAGNOSTIC][TRANSCRIPTION] is_final=%s speaker=%s lang=%s text=%r (at %s)",
            event.is_final, getattr(event, "speaker_id", None), getattr(event, "language", None),
            event.transcript, datetime.now(timezone.utc).isoformat()
        )
        # Broadcast real-time partial/final candidate transcript to browser room data channel
        payload = json.dumps({
            "type": "transcript_update",
            "role": "candidate",
            "text": clean,
            "isFinal": bool(event.is_final),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        try:
            asyncio.create_task(
                ctx.room.local_participant.publish_data(
                    payload.encode("utf-8"), reliable=True, topic="interview"
                )
            )
        except Exception as e:
            log.warning("Failed to publish real-time transcript update: %s", e)

    @session.on("agent_false_interruption")
    def on_false_interruption(event: AgentFalseInterruptionEvent):
        log.info(
            "[DIAGNOSTIC][INTERRUPTION] False interruption detected, resumed=%s (at %s)",
            event.resumed, datetime.now(timezone.utc).isoformat()
        )

    @session.on("conversation_item_added")
    def on_item(event: ConversationItemAddedEvent):
        nonlocal seq_counter
        item = event.item
        text = getattr(item, "text_content", None)
        if getattr(item, "role", None) not in ("user", "assistant") or not text:
            return
        clean_text = str(text).strip()
        if not clean_text:
            return

        role = "ai" if item.role == "assistant" else "candidate"
        seq_counter += 1
        item_id = getattr(item, "id", None) or f"{interview_id}-{seq_counter}"
        
        raw_ca = getattr(event, "created_at", None)
        if raw_ca and hasattr(raw_ca, "isoformat"):
            created_at = raw_ca.isoformat()
        elif raw_ca:
            created_at = str(raw_ca)
        else:
            created_at = datetime.now(timezone.utc).isoformat()

        log.info(
            "[DIAGNOSTIC][CONVERSATION_ITEM] role=%s seq=%d id=%s text=%r (at %s)",
            role, seq_counter, item_id, clean_text, created_at
        )

        payload = {
            "id": item_id,
            "seq": seq_counter,
            "role": role,
            "text": clean_text,
            "createdAt": created_at,
        }
        transcript_queue.put_nowait(payload)

    await session.start(
        room=ctx.room,
        agent=Interviewer(session_data),
        room_options=RoomOptions(
            audio_input=AudioInputOptions(noise_cancellation=noise_cancellation.BVC()),
        ),
    )
    await session.generate_reply(instructions=f"Greet {session_data['name']} warmly, introduce yourself as Dora, and begin Phase 1 by asking for a one-minute introduction.")


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint, agent_name=AGENT_NAME))
