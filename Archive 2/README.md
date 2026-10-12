# AI Voice Interview System

A candidate uploads a resume and a job description, then has a live, natural voice conversation with an AI interviewer.
The interviewer is a LiveKit agent running on Gemini Live native audio. The camera stays on and the whole session is recorded,
including both voices. At the end the candidate gets a scored evaluation report.

```
Browser ──WebRTC (LiveKit Cloud)──► Python agent (agent/agent.py, Gemini Live native audio)
   │                                        │ loads resume/JD, saves transcript lines
   └──── HTTP ────► Node/Express server ◄───┘ (server.js: uploads, tokens, recording, evaluation)
```

## Setup
```bash
npm install
python3 -m venv agent/venv
agent/venv/bin/pip install -r agent/requirements.txt
cp .env.example .env      # add your Gemini key + LiveKit Cloud URL/key/secret
```
- Gemini key: https://aistudio.google.com/apikey
- LiveKit: create a free project at https://cloud.livekit.io (keep it separate from Dora, whose agent auto-joins every room in its project)

## Run (two terminals)
```bash
npm start          # web app on http://localhost:3000
npm run agent      # AI interviewer worker
```

## How it works
1. `index.html`: upload a resume (PDF/DOCX/TXT), paste the JD, and pick roughly how many questions.
2. `interview.html`: the camera and mic turn on and the browser joins a LiveKit room `interview-<id>`. The token
   dispatches the `ai-interviewer` agent, which fetches the resume and JD and starts talking. You can speak
   naturally and interrupt it, and turn-taking is handled by Gemini. Live captions for both sides stream into the transcript.
3. When the interviewer says goodbye it signals the browser, which stops recording and asks the server for an evaluation.
   The recording (camera + your mic + the AI's voice) is uploaded in 5-second chunks to `recordings/<id>.webm`.
4. `report.html`: shows the recording playback, the transcript and the evaluation. `reports.html` lists all past interviews.

Data is stored as JSON in `data/interviews/`.
