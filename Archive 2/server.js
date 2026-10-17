import 'dotenv/config';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'livekit-server-sdk';
import { extractText } from './src/resume.js';
import { evaluate } from './src/gemini.js';
import { finalizeRecording } from './src/recording.js';
import {
  newId, getSession, saveSession, updateSession, listSessions, recordingPath, REC_DIR,
} from './src/store.js';
import { orchestrator, CodingAgent } from './src/agents/index.js';

const REQUIRED = ['GEMINI_API_KEY', 'LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing ${missing.join(', ')} in .env (see .env.example).`);
  process.exit(1);
}

const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
const AGENT_NAME = 'ai-interviewer'; // must match agent/agent.py
const SKILLSETU_API_URL = process.env.SKILLSETU_API_URL || 'http://127.0.0.1:8000';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: '1mb' }));
app.use(express.static('public', { etag: false, maxAge: 0, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate') }));
app.use('/vendor/livekit-client.js', (_req, res) =>
  res.sendFile('livekit-client.umd.js', { root: 'node_modules/livekit-client/dist' }));
app.use('/recordings', express.static(REC_DIR));

// Load session from :id or 404
async function loadSession(req, res, next) {
  const session = await getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Assessment/Interview not found' });
  req.session = session;
  next();
}

// Routes only the Python agent may call (it shares the LiveKit API secret)
function agentOnly(req, res, next) {
  const given = Buffer.from(String(req.get('x-agent-secret') || ''));
  const expected = Buffer.from(LIVEKIT_API_SECRET);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const now = () => new Date().toISOString();

// ==========================================
// 1. SESSION INITIALIZATION & PIPELINE SETUP
// ==========================================

// Create interview/assessment: resume upload + JD + optional pipeline configuration
app.post('/api/interviews', upload.single('resume'), async (req, res) => {
  const { name, jd, pipelineConfig } = req.body;
  const questionCount = Math.min(Math.max(parseInt(req.body.questionCount, 10) || 6, 3), 25);
  if (!req.file || !name?.trim() || !jd?.trim()) {
    return res.status(400).json({ error: 'Name, resume and job description are required.' });
  }
  let resumeText;
  try {
    resumeText = await extractText(req.file);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  if (!resumeText) return res.status(400).json({ error: 'Could not read any text from the resume.' });

  let parsedPipeline = null;
  if (pipelineConfig) {
    try {
      parsedPipeline = typeof pipelineConfig === 'string' ? JSON.parse(pipelineConfig) : pipelineConfig;
    } catch (_) {}
  }

  const session = await saveSession({
    id: newId(),
    name: name.trim(),
    jd: jd.trim(),
    resumeText,
    questionCount,
    status: 'created',
    transcript: [],
    evaluation: null,
    createdAt: now(),
  });

  // Initialize multi-agent orchestrator pipeline
  await orchestrator.initializeSessionPipeline(session, parsedPipeline);

  res.json({ id: session.id });
});

// Authorized session initialization from Main Backend with full candidate profile and recruiter pipeline
app.post('/api/assessment/session/init', async (req, res) => {
  const secret = req.get('x-assessment-secret');
  if (secret && secret !== LIVEKIT_API_SECRET && secret !== 'skillsetu-assessment-secret-token') {
    return res.status(401).json({ error: 'Unauthorized service communication' });
  }

  const {
    sessionId,
    studentId,
    applicationId,
    internshipId,
    targetRound,
    name,
    jd,
    resumeText,
    candidateContext,
    mode,
    pipelineConfig,
    callbackUrl,
  } = req.body;

  if (!name || !jd) {
    return res.status(400).json({ error: 'Candidate name and job description are required.' });
  }

  const targetId = sessionId || newId();
  const effectiveRound = targetRound || pipelineConfig?.rounds?.[0]?.id || 'aptitude';
  const session = await saveSession({
    id: targetId,
    studentId,
    applicationId,
    internshipId,
    mode: (mode || 'REAL').toUpperCase(),
    currentRound: effectiveRound,
    name: name.trim(),
    jd: jd.trim(),
    resumeText: resumeText || `Candidate ${name}`,
    candidateContext: candidateContext || null,
    questionCount: pipelineConfig?.rounds?.find((r) => r.id === 'aptitude')?.questionCount || 6,
    status: 'created',
    transcript: [],
    evaluation: null,
    callbackUrl: callbackUrl || null,
    createdAt: now(),
  });

  await orchestrator.initializeSessionPipeline(session, pipelineConfig || null);

  res.json({
    ok: true,
    id: session.id,
    mode: session.mode,
    targetRound: effectiveRound,
    url: `/interview.html?id=${session.id}&round=${effectiveRound}&mode=${session.mode.toLowerCase()}`,
  });
});

app.get('/api/interviews', async (_req, res) => {
  res.json(await listSessions());
});

app.get('/api/interviews/:id', loadSession, (req, res) => {
  const { resumeText, aptitudeQuestions, technicalSetup, ...rest } = req.session;
  res.json({
    ...rest,
    aptitudeQuestionsCount: aptitudeQuestions?.length || 0,
    hasTechnicalSetup: !!technicalSetup,
  });
});

// ==========================================
// 2. MULTI-AGENT ASSESSMENT ENDPOINTS
// ==========================================

// Configure custom pipeline for a session
app.post('/api/assessment/:id/pipeline', loadSession, async (req, res) => {
  const updated = await orchestrator.initializeSessionPipeline(req.session, req.body.pipeline);
  res.json({ ok: true, pipeline: updated.pipeline });
});

// Setup / retrieve assets for the active round (Aptitude questions, Tech coding problem, GD topic)
app.get('/api/assessment/:id/round/setup', loadSession, async (req, res) => {
  try {
    const roundSetup = await orchestrator.setupCurrentRound(req.session.id, req.query.roundId);
    res.json(roundSetup);
  } catch (err) {
    console.error('Round setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Run candidate code in isolated sandbox (visible tests only)
app.post('/api/assessment/:id/coding/run', loadSession, async (req, res) => {
  const { language, sourceCode, roundType } = req.body;
  let codingProblem;
  if (roundType === 'aptitude' || req.session.currentRound === 'aptitude') {
    codingProblem = req.session.aptitudeAssessment?.codingProblem || req.session.aptitudeAssessment?.codingQuestions?.[0];
  } else {
    codingProblem = req.session.technicalSetup?.codingProblem || req.session.aptitudeAssessment?.codingProblem;
  }

  if (!codingProblem) {
    return res.status(400).json({ error: 'No active coding problem found for this session.' });
  }

  try {
    const codingAgent = new CodingAgent();
    const results = await codingAgent.runVisibleTests(language || codingProblem.language || 'python', sourceCode || '', codingProblem);
    res.json(results);
  } catch (err) {
    console.error('Code execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit and evaluate completed round attempt
app.post('/api/assessment/:id/round/:roundId/complete', loadSession, async (req, res) => {
  try {
    const evaluation = await orchestrator.completeRound(req.session.id, req.params.roundId, req.body);
    res.json({ ok: true, ...evaluation });
  } catch (err) {
    console.error('Round completion error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Log real-time integrity signals and receive state machine response
app.post('/api/assessment/:id/integrity-signal', loadSession, async (req, res) => {
  try {
    const result = await orchestrator.recordIntegritySignal(req.session.id, req.body);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Integrity signal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Candidate explanation submission for active warning
app.post('/api/assessment/:id/integrity-explanation', loadSession, async (req, res) => {
  try {
    const result = await orchestrator.processCandidateExplanation(req.session.id, req.body);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Explanation submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Authoritative integrity status check
app.get('/api/assessment/:id/integrity-status', loadSession, async (req, res) => {
  const roundId = req.query.roundId || req.session.currentRound || 'aptitude';
  const warningCount = req.session.warningCounts?.[roundId] || 0;
  const isTerminated = Boolean(req.session.terminatedRounds?.[roundId]);
  res.json({
    roundId,
    warningCount,
    maxWarnings: 2,
    isTerminated,
    integrityStatus: isTerminated ? 'HIGH_RISK' : warningCount > 0 ? 'WARNING_ISSUED' : 'CLEAR',
  });
});

// Candidate Presence Heartbeat Endpoint
app.post('/api/interviews/:id/heartbeat', loadSession, async (req, res) => {
  const s = req.session;
  const nowIso = new Date().toISOString();
  await updateSession(s.id, (x) => {
    x.lastHeartbeatAt = nowIso;
    if (x.status === 'created') {
      x.status = 'in_progress';
      x.startedAt = x.startedAt || nowIso;
    }
  });

  // Forward heartbeat to Main Backend presence engine asynchronously
  try {
    fetch(`${SKILLSETU_API_URL}/api/v1/assessment/sessions/${s.id}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: s.studentId,
        round_key: req.body?.roundKey || s.currentRound,
        metadata: req.body?.metadata || {}
      })
    }).catch(() => {});
  } catch (_) {}

  res.json({ ok: true, session_id: s.id, lastHeartbeatAt: nowIso, presence: 'LIVE' });
});

// Fetch complete multi-round assessment dossier
app.get('/api/assessment/:id/report', loadSession, async (req, res) => {
  const s = req.session;
  res.json({
    id: s.id,
    name: s.name,
    jd: s.jd,
    status: s.status,
    createdAt: s.createdAt,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    hasRecording: s.hasRecording,
    roundResults: s.roundResults || {},
    evaluation: s.evaluation || null,
    transcript: s.transcript || [],
    pipeline: s.pipeline || null,
  });
});

// ==========================================
// 3. LIVEKIT REAL-TIME VOICE & MEDIA ENDPOINTS
// ==========================================

// Start LiveKit room session: provides JWT token with RoomAgentDispatch for ai-interviewer
app.post('/api/interviews/:id/start', loadSession, async (req, res) => {
  const s = req.session;
  if (s.status === 'completed') return res.status(400).json({ error: 'Interview already completed.' });
  await updateSession(s.id, (x) => {
    x.status = 'in_progress';
    x.startedAt = x.startedAt || now();
  });
  await fs.rm(recordingPath(s.id), { force: true });

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `candidate-${s.id}-${Date.now()}`,
    name: s.name,
    ttl: '2h',
  });
  const room = `interview-${s.id}`;
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
  at.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
  });
  res.json({ url: LIVEKIT_URL, token: await at.toJwt() });
});

// Recruiter Live Observer Token (Read-Only: canPublish: false, canPublishData: false, canSubscribe: true)
app.post('/api/interviews/:id/observer', loadSession, async (req, res) => {
  const s = req.session;
  const recruiterId = req.body?.recruiterId || 'recruiter';
  const recruiterName = req.body?.recruiterName || 'Recruiter Observer';

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `observer-${recruiterId}-${Date.now()}`,
    name: `${recruiterName} (Observer)`,
    ttl: '2h',
  });
  const room = `interview-${s.id}`;
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: false,
    canPublishData: false,
    canSubscribe: true,
  });

  res.json({
    url: LIVEKIT_URL,
    token: await at.toJwt(),
    room,
    sessionId: s.id,
    status: s.status,
    startedAt: s.startedAt,
    candidateName: s.name,
    transcript: s.transcript || [],
    role: 'OBSERVER'
  });
});

// Live Observer Telemetry & State Polling Endpoint
app.get('/api/interviews/:id/live-telemetry', loadSession, (req, res) => {
  const s = req.session;
  res.json({
    id: s.id,
    status: s.status,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    candidateName: s.name,
    transcript: s.transcript || [],
    questionCount: s.questionCount || 5,
    mode: s.mode,
    integrity: s.integrity || { status: 'VERIFIED', events: [] },
  });
});

// Agent context endpoint
app.get('/api/interviews/:id/context', agentOnly, loadSession, (req, res) => {
  const { name, jd, resumeText, candidateContext, mode, questionCount } = req.session;
  res.json({ name, jd, resumeText, candidateContext, mode, questionCount });
});

// Agent transcript line append
app.post('/api/interviews/:id/transcript', agentOnly, async (req, res) => {
  const role = req.body.role === 'ai' ? 'ai' : 'candidate';
  const text = String(req.body.text || '').replace(/''/g, "'").trim();
  if (!text) return res.json({ ok: true });
  const result = await updateSession(req.params.id, (s) => {
    if (s.status !== 'in_progress' && s.status !== 'created') return false;
    s.transcript.push({ role, text, at: now() });
    return true;
  });
  if (result === null) return res.status(404).json({ error: 'Interview not found' });
  res.json({ ok: result });
});

// Recording chunks are appended in order
app.post(
  '/api/interviews/:id/chunk',
  express.raw({ type: '*/*', limit: '50mb' }),
  loadSession,
  async (req, res) => {
    if (req.body?.length) await fs.appendFile(recordingPath(req.session.id), req.body);
    res.json({ ok: true });
  },
);

// End interview & synthesize evaluation
app.post('/api/interviews/:id/end', loadSession, async (req, res) => {
  if (req.session.status === 'completed') return res.json({ ok: true });
  const s = await updateSession(req.session.id, (x) => {
    x.status = 'evaluating';
    x.endedAt = now();
  });
  
  let evaluation = null;
  let evaluationError;
  const [hasRecording] = await Promise.all([
    finalizeRecording(recordingPath(s.id)),
    evaluate(s).then((e) => { evaluation = e; }, (err) => {
      console.error(err);
      evaluationError = err.message;
    }),
  ]);

  // Complete round in orchestrator
  await orchestrator.completeRound(s.id, 'interview', { transcript: s.transcript }).catch((err) => {
    console.warn('Orchestrator voice round completion fallback:', err.message);
  });

  await updateSession(s.id, (x) => {
    Object.assign(x, {
      evaluation: evaluation || x.evaluation,
      evaluationError,
      hasRecording,
      status: 'completed',
    });
  });
  res.json({ ok: true });
});

// Error handling middleware to catch client aborted requests gracefully
app.use((err, req, res, next) => {
  if (err.type === 'request.aborted' || err.code === 'ECONNABORTED' || err.message === 'request aborted') {
    return res.status(400).end();
  }
  console.error('Express server error:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  }
});

const port = process.env.PORT || 3000;
const server = app.listen(port, () => console.log(`SkillSetu Multi-Agent AI Assessment System running at http://localhost:${port}`));
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use by another process. Please terminate the existing process on port ${port} or configure a different PORT.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

