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
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import Agent, AgentSession, ConversationItemAddedEvent, function_tool, get_job_context
from livekit.agents.voice.room_io import AudioInputOptions, RoomOptions
from livekit.plugins import google, noise_cancellation

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

log = logging.getLogger("interviewer")
SERVER_URL = os.getenv("SERVER_URL", f"http://localhost:{os.getenv('PORT', '3000')}")
AGENT_NAME = "ai-interviewer"
HEADERS = {"x-agent-secret": os.environ["LIVEKIT_API_SECRET"]}

INSTRUCTIONS = """You are Dora, a warm, professional job interviewer conducting a live one-to-one VOICE interview.

How to speak:
- Sound like a real human interviewer: natural, friendly, relaxed pace. Use brief acknowledgements
  ("Got it", "That makes sense", "Interesting") before moving on — but never praise or score answers.
- Ask exactly ONE question at a time, short (1-2 sentences), then stop and let the candidate talk.
- Never read out lists, markdown or symbols. Plain spoken English only.
- If the candidate is silent or unclear, gently rephrase. If they go off-topic, steer back politely.
- Do not comment on the candidate's appearance or background noise.

Interview plan:
- Greet {name} by name, introduce yourself as Dora, and ask them to briefly introduce themselves.
- Then ask about {count} questions in total, mixing: technical questions on the job description's required
  skills, specific projects and experience from their resume, and one behavioural question.
- Ask a short follow-up when an answer is vague or especially interesting (follow-ups don't count toward the total).
- When done, thank them warmly, say the team will be in touch, and THEN call the end_interview tool.
  Also call end_interview if the candidate asks to stop.

JOB DESCRIPTION:
{jd}

CANDIDATE RESUME:
{resume}
"""


class Interviewer(Agent):
    def __init__(self, session_data: dict) -> None:
        super().__init__(
            instructions=INSTRUCTIONS.format(
                name=session_data["name"],
                count=session_data["questionCount"],
                jd=session_data["jd"],
                resume=session_data["resumeText"],
            ),
            llm=google.realtime.RealtimeModel(
                model=os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-latest"),
                voice=os.getenv("GEMINI_VOICE", "Aoede"),
                api_key=os.environ["GEMINI_API_KEY"],
                temperature=0.7,
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
    interview_id = ctx.room.name.removeprefix("interview-")
    http = aiohttp.ClientSession(base_url=SERVER_URL, headers=HEADERS)
    pending: set[asyncio.Task] = set()

    async def on_shutdown():
        # Let in-flight transcript saves finish before closing the HTTP client
        if pending:
            await asyncio.wait(pending, timeout=5)
        await http.close()

    ctx.add_shutdown_callback(on_shutdown)

    async with http.get(f"/api/interviews/{interview_id}/context") as res:
        if res.status != 200:
            log.error("Could not load interview %s: %s", interview_id, res.status)
            return
        session_data = await res.json()

    session = AgentSession()

    @session.on("conversation_item_added")
    def on_item(event: ConversationItemAddedEvent):
        item = event.item
        text = getattr(item, "text_content", None)
        if getattr(item, "role", None) not in ("user", "assistant") or not text:
            return
        role = "ai" if item.role == "assistant" else "candidate"
        # Persist each line as it happens so nothing is lost if the call drops
        task = asyncio.create_task(_post(http, interview_id, role, text))
        pending.add(task)
        task.add_done_callback(pending.discard)

    await session.start(
        room=ctx.room,
        agent=Interviewer(session_data),
        room_options=RoomOptions(
            audio_input=AudioInputOptions(noise_cancellation=noise_cancellation.BVC()),
        ),
    )
    await ctx.connect()
    await session.generate_reply(instructions=f"Greet {session_data['name']} and begin the interview.")


async def _post(http: aiohttp.ClientSession, interview_id: str, role: str, text: str):
    try:
        async with http.post(f"/api/interviews/{interview_id}/transcript", json={"role": role, "text": text}) as res:
            if res.status != 200:
                log.warning("Transcript save failed: %s", res.status)
    except aiohttp.ClientError as err:
        log.warning("Transcript save failed: %s", err)


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint, agent_name=AGENT_NAME))
