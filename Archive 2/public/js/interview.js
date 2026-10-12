const id = new URLSearchParams(location.search).get('id');
const $ = (sel) => document.getElementById(sel);
const { Room, RoomEvent, Track } = window.LivekitClient || {};

const CHUNK_MS = 5000; // recording upload interval
const AGENT_JOIN_TIMEOUT = 25000;

let session;
let stream; // camera + mic
let room;
let audioCtx;
let mixDest; // candidate mic + AI voice mixed for recording
let recorder;
let uploadChain = Promise.resolve();
let timerInterval;
let roundStartTime;
let finishing = false;
let agentSpeaking = false;
const segments = new Map();

// Round & Telemetry State
let currentRound = 'aptitude';
let activeRoundData = null;
let aptitudeIndex = 0;
let aptitudeAnswers = {};
let aptitudeTheoryIndex = 0;
let aptitudeTheoryAnswers = {};
let aptitudeActiveTab = 'mcq';
let tabHiddenStartTime = null;
let windowBlurStartTime = null;
let cameraTrack = null;
let audioTrack = null;
const markedForReview = new Set();

// Integrity & Real-time Vision Proctoring State
const activeIncidents = new Set();
let visionModel = null;
let faceMeshModel = null;
let visionSamplingInterval = null;
let hardwareWatchdogInterval = null;
let tabHiddenWatchdogTimeout = null;
let windowBlurWatchdogTimeout = null;
let phoneConsecutiveFrames = 0;
let multiplePersonsConsecutiveFrames = 0;
let noPersonConsecutiveFrames = 0;
let gazeConsecutiveFrames = 0;
let headTurnConsecutiveFrames = 0;
let currentGazeState = 'LOOKING_AT_SCREEN';
let gazeStartTime = 0;
let lastCameraState = 'live';
let lastAudioState = 'live';
const integrityEventQueue = [];
let isFlushingQueue = false;

// Session & Lifecycle Focus Guards
let intentionalEndRequested = false;
let isCompleting = false;
let isRoundEnded = false;
let isConfirmationModalOpen = false;

// Latency & Benchmark Metrics
const latencyAuditLogs = [];

// ---------- Question Loading & Error State Handlers ----------
let isQuestionLoading = false;
let isQuestionError = false;

function setQuestionLoading(loading, title = 'Preparing your next question…', subtitle = 'AI is tailoring questions based on your profile and round context.') {
  isQuestionLoading = loading;
  const loaderEl = $('questionLoadingState');
  const loaderTitle = $('questionLoadingTitle');
  const loaderSub = $('questionLoadingSub');

  if (loaderTitle && title) loaderTitle.textContent = title;
  if (loaderSub && subtitle) loaderSub.textContent = subtitle;

  if (loaderEl) {
    loaderEl.classList.toggle('hidden', !loading);
  }

  // When loading, hide question content panels and error state
  if (loading) {
    $('questionErrorState')?.classList.add('hidden');
    $('aptitudePanel')?.classList.add('hidden');
    $('codingPanel')?.classList.add('hidden');
    $('gdPanel')?.classList.add('hidden');
    $('aiVoicePanel')?.classList.add('hidden');

    if ($('prevQuestionBtn')) $('prevQuestionBtn').disabled = true;
    if ($('nextQuestionBtn')) $('nextQuestionBtn').disabled = true;
    if ($('markReviewBtn')) $('markReviewBtn').disabled = true;
  } else {
    if ($('nextQuestionBtn')) $('nextQuestionBtn').disabled = false;
    if ($('markReviewBtn')) $('markReviewBtn').disabled = false;
  }
}

function setQuestionError(isErr, message = 'Unable to load the next question.', retryFn = null) {
  isQuestionError = isErr;
  const errEl = $('questionErrorState');
  const errTitle = $('questionErrorTitle');
  const errSub = $('questionErrorSub');
  const retryBtn = $('questionRetryBtn');

  if (errTitle) errTitle.textContent = isErr ? 'Unable to load the next question' : '';
  if (errSub && message) errSub.textContent = message;

  if (errEl) {
    errEl.classList.toggle('hidden', !isErr);
  }

  if (isErr) {
    $('aptitudePanel')?.classList.add('hidden');
    $('codingPanel')?.classList.add('hidden');
    $('gdPanel')?.classList.add('hidden');
    $('aiVoicePanel')?.classList.add('hidden');

    if (retryBtn && retryFn) {
      retryBtn.onclick = () => {
        setQuestionError(false);
        retryFn();
      };
    }
  }
}

// ---------- UI Helpers ----------
function setStatus(text, question) {
  $('status').textContent = text;
  if (question !== undefined) $('question').textContent = question;
}

function showError(msg) {
  $('error').textContent = msg || '';
}

function startTimer() {
  roundStartTime = Date.now();
  $('timer').classList.remove('hidden');
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - roundStartTime) / 1000);
    $('timer').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);
}

async function api(path, body) {
  const res = await fetch(`/api/interviews/${id}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let activeWarningEventId = null;
let isAssessmentPaused = false;

// Device Detector
function detectDeviceCategory() {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /(iPad|Tablet|(Android(?!.*Mobile))|(Silk))/i.test(ua);
  return {
    category: isMobile ? 'Mobile phone' : isTablet ? 'Tablet' : 'Desktop / Laptop',
    isMobile: isMobile || isTablet,
    browser: navigator.userAgentData?.brands?.[0]?.brand || 'Standard Desktop Browser',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };
}

// ---------- Integrity & Anti-Cheating Telemetry Dispatcher ----------
async function logIntegrity(type, details = {}) {
  const detectionTs = details.detectionTimestamp || Date.now();
  const payload = {
    type,
    timestamp: new Date().toISOString(),
    detectionTimestamp: detectionTs,
    roundId: currentRound,
    sessionElapsedSec: roundStartTime ? Math.floor((Date.now() - roundStartTime) / 1000) : 0,
    deviceInfo: detectDeviceCategory(),
    ...details,
  };

  // If browser is offline, buffer the event
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    integrityEventQueue.push(payload);
    console.warn(`[Integrity] Device offline. Buffered critical event: ${type}`);
    return;
  }

  const sendStartTime = Date.now();
  try {
    const res = await fetch(`/api/assessment/${id}/integrity-signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    const receiveTime = Date.now();

    // Measure exact runtime latencies
    const detectionLatencyMs = sendStartTime - detectionTs;
    const backendLatencyMs = receiveTime - sendStartTime;
    const totalWarningLatencyMs = receiveTime - detectionTs;

    latencyAuditLogs.push({
      type,
      action: data.action || 'LOGGED',
      detectionLatencyMs,
      backendLatencyMs,
      totalWarningLatencyMs,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[Integrity Runtime] ${type} → Action: ${data.action || 'LOGGED'} | DetLat: ${detectionLatencyMs}ms | NetLat: ${backendLatencyMs}ms | Total: ${totalWarningLatencyMs}ms`
    );

    if (data.action === 'WARNING_ISSUED') {
      triggerWarningModal({ ...data, detectionLatencyMs, backendLatencyMs, totalWarningLatencyMs });
    } else if (data.action === 'ROUND_TERMINATED') {
      triggerTerminationModal({ ...data, detectionLatencyMs, backendLatencyMs, totalWarningLatencyMs });
    }
  } catch (e) {
    console.warn('Integrity signal sync failed, queuing event:', e);
    integrityEventQueue.push(payload);
  }
}

async function flushIntegrityQueue() {
  if (isFlushingQueue || !integrityEventQueue.length) return;
  isFlushingQueue = true;
  while (integrityEventQueue.length > 0 && navigator.onLine) {
    const nextEvent = integrityEventQueue.shift();
    try {
      await fetch(`/api/assessment/${id}/integrity-signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextEvent),
      });
    } catch (e) {
      integrityEventQueue.unshift(nextEvent);
      break;
    }
  }
  isFlushingQueue = false;
}

function speakWarning(text) {
  if (!text) return;
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    console.warn('SpeechSynthesis TTS unavailable or failed:', err);
  }
}

function triggerWarningModal(data) {
  isAssessmentPaused = true;
  activeWarningEventId = data.eventId;
  $('integrityModalTitle').textContent = data.title || '⚠️ Integrity Warning';
  $('integrityWarningBadge').className = 'pill warn';
  $('integrityWarningBadge').textContent = `Warning ${data.warningNumber} of ${data.maxWarnings}`;
  $('integrityModalMsg').textContent = `${data.message}\n\n${data.instructions}`;
  $('integrityExplanationForm').classList.remove('hidden');
  $('integrityTerminatedView').classList.add('hidden');
  $('integrityModal').classList.remove('hidden');

  if (data.message) {
    speakWarning(data.message);
  }
}

function triggerTerminationModal(data) {
  isAssessmentPaused = true;
  $('integrityModalTitle').textContent = data.title || '⛔ Round Terminated';
  $('integrityWarningBadge').className = 'pill bad';
  $('integrityWarningBadge').textContent = 'Terminated';
  $('integrityModalMsg').textContent = data.message;
  $('integrityExplanationForm').classList.add('hidden');
  $('integrityTerminatedView').classList.remove('hidden');
  $('integrityModal').classList.remove('hidden');
  $('submitRoundBtn').disabled = true;

  if (data.message) {
    speakWarning(data.message);
  }
}

// Append transcript item
function appendTranscriptMsg(role, speaker, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  const who = document.createElement('div');
  who.className = 'who';
  who.textContent = speaker;
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = $('timer').textContent;
  who.appendChild(time);
  const body = document.createElement('div');
  body.textContent = text;
  el.append(who, body);
  $('transcript').appendChild(el);
  $('transcript').scrollTop = $('transcript').scrollHeight;
}

function upsertSegment(segmentId, role, text) {
  let el = segments.get(segmentId);
  if (!el) {
    el = document.createElement('div');
    el.className = `msg ${role}`;
    const who = document.createElement('div');
    who.className = 'who';
    who.textContent = role === 'ai' ? 'Dora' : session.name;
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = $('timer').textContent;
    who.appendChild(time);
    el.append(who, document.createElement('div'));
    segments.set(segmentId, el);
    $('transcript').appendChild(el);
  }
  el.lastChild.textContent = text;
  $('transcript').scrollTop = $('transcript').scrollHeight;
  if (role === 'ai') $('question').textContent = text;
  else $('caption').textContent = text;
}

// ---------- Synchronized Media Recording ----------
function startRecording() {
  if (recorder && recorder.state === 'recording') return;
  if (!stream) {
    console.warn('[RECORDING] Cannot start recording: MediaStream missing.');
    return;
  }
  try {
    let recStream = stream;
    if (audioCtx && mixDest) {
      try {
        const micSource = audioCtx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
        micSource.connect(mixDest);
        recStream = new MediaStream([...stream.getVideoTracks(), ...mixDest.stream.getAudioTracks()]);
      } catch (e) {
        recStream = stream;
      }
    }

    const types = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    recorder = new MediaRecorder(recStream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (e) => {
      if (!e.data || !e.data.size) return;
      console.log(`[RECORDING] Chunk received (${e.data.size} bytes), uploading upstream...`);
      uploadChain = uploadChain.then(() =>
        fetch(`/api/interviews/${id}/chunk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: e.data,
        }).catch((err) => console.error('[RECORDING] Chunk upload failed:', err)),
      );
    };
    recorder.start(CHUNK_MS);
    $('recBadge')?.classList.remove('hidden');
    if ($('secRecStatus')) {
      $('secRecStatus').className = 'security-item-status';
      $('secRecStatus').textContent = '✓ Active';
    }
    console.log('[RECORDING] MediaRecorder started successfully with state:', recorder.state);
  } catch (e) {
    console.warn('[RECORDING] Recording start error:', e);
    if ($('secRecStatus')) {
      $('secRecStatus').className = 'security-item-status fail';
      $('secRecStatus').textContent = '✕ Inactive';
    }
  }
}

function stopRecording() {
  return new Promise((resolve) => {
    if (!recorder || recorder.state === 'inactive') return resolve();
    recorder.onstop = () => resolve();
    recorder.stop();
  }).then(() => uploadChain);
}

// ---------- LiveKit Voice Engine (Used in AI Interview & GD) ----------
function setAgentSpeaking(speaking) {
  agentSpeaking = speaking;
  $('avatar').classList.toggle('speaking', speaking);
  if (finishing) return;
  setStatus(speaking ? 'Dora is speaking' : 'Listening… speak naturally');
  $('caption').classList.toggle('active', !speaking);
}

function waitForAgent() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('The AI interviewer did not join. Is the agent running (npm run agent)?')),
      AGENT_JOIN_TIMEOUT,
    );
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== Track.Kind.Audio || !participant.isAgent) return;
      const el = track.attach();
      el.classList.add('hidden');
      document.body.appendChild(el);
      audioCtx.createMediaStreamSource(new MediaStream([track.mediaStreamTrack])).connect(mixDest);
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function finishWhenQuiet() {
  const deadline = Date.now() + 12000;
  let quietSince = agentSpeaking ? null : Date.now();
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 250));
    if (agentSpeaking) quietSince = null;
    else if (!quietSince) quietSince = Date.now();
    else if (Date.now() - quietSince > 1500) break;
  }
  handleRoundSubmit();
}

async function connectRoom({ url, token }) {
  room = new Room({ adaptiveStream: false, dynacast: false });

  room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    setAgentSpeaking(speakers.some((p) => p.isAgent));
  });

  room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
    if (topic !== 'interview') return;
    const msg = JSON.parse(new TextDecoder().decode(payload));
    if (msg.type === 'end') finishWhenQuiet();
  });

  room.on(RoomEvent.ParticipantDisconnected, (p) => {
    if (p.isAgent && !finishing) finishWhenQuiet();
  });

  room.registerTextStreamHandler('lk.transcription', async (reader, participantInfo) => {
    const segmentId = reader.info.attributes?.['lk.segment_id'] || reader.info.id;
    const role = participantInfo.identity === room.localParticipant.identity ? 'candidate' : 'ai';
    let text = '';
    for await (const chunk of reader) {
      text += chunk;
      upsertSegment(segmentId, role, text);
    }
  });

  const agentReady = waitForAgent();
  await room.connect(url, token);
  await room.localParticipant.publishTrack(stream.getAudioTracks()[0], { source: Track.Source.Microphone });
  await agentReady;
}

// ---------- Multi-Round Stepper & State Management ----------
function renderPipelineStepper() {
  const pipeline = session.pipeline || {
    rounds: [
      { id: 'aptitude', name: 'Aptitude' },
      { id: 'technical', name: 'Technical' },
      { id: 'interview', name: 'AI Interview' },
      { id: 'gd', name: 'Group Discussion' },
    ],
  };

  const rounds = (pipeline.rounds || []).filter((r) => r.enabled !== false);
  $('pipelineBar').innerHTML = rounds
    .map((r, i) => {
      const isCompleted = session.roundResults && session.roundResults[r.id];
      const isActive = r.id === currentRound;
      const cls = isCompleted ? 'completed' : isActive ? 'active' : '';
      return `
      <div class="round-step ${cls}">
        <span class="step-num">${isCompleted ? '✓' : i + 1}</span>
        <span>${r.name || r.id}</span>
      </div>`;
    })
    .join('');
}

// ---------- Header & Assessment Progress Synchronizer ----------
function updateHeaderStatus() {
  if (!session) return;

  const roundNames = {
    aptitude: 'Aptitude Assessment',
    technical: 'Technical Coding Challenge',
    interview: 'AI Voice Interview',
    gd: 'Group Discussion Round',
  };

  const currentRoundName = roundNames[currentRound] || currentRound.toUpperCase();
  if ($('headerRoundTitle')) $('headerRoundTitle').textContent = currentRoundName;
  if ($('candidateNameDisplay')) $('candidateNameDisplay').textContent = session.name || 'Candidate';

  const isPractice = (session.mode || '').toLowerCase() === 'practice' || location.search.includes('mode=PRACTICE');
  if ($('modeBadge')) {
    $('modeBadge').className = `mode-badge ${isPractice ? 'practice' : 'official'}`;
    $('modeBadge').textContent = isPractice ? 'PRACTICE MOCK' : 'OFFICIAL';
  }

  // Calculate Progress
  if (currentRound === 'aptitude') {
    const mcqs = activeRoundData?.mcqs || activeRoundData?.questions || [];
    const total = mcqs.length || 6;
    const currentNum = aptitudeActiveTab === 'mcq' ? aptitudeIndex + 1 : aptitudeActiveTab === 'theory' ? total : total;
    const pct = Math.round((currentNum / Math.max(total, 1)) * 100);
    if ($('headerQuestionProgress')) $('headerQuestionProgress').textContent = `Question ${currentNum} of ${total}`;
    if ($('headerPercentProgress')) $('headerPercentProgress').textContent = `${pct}% Completed`;
    if ($('headerProgressBar')) $('headerProgressBar').style.width = `${pct}%`;
  } else if (currentRound === 'technical') {
    if ($('headerQuestionProgress')) $('headerQuestionProgress').textContent = 'Coding Challenge (1 of 1)';
    if ($('headerPercentProgress')) $('headerPercentProgress').textContent = '50% In Progress';
    if ($('headerProgressBar')) $('headerProgressBar').style.width = '50%';
  } else {
    if ($('headerQuestionProgress')) $('headerQuestionProgress').textContent = 'Live Session Active';
    if ($('headerPercentProgress')) $('headerPercentProgress').textContent = 'In Progress';
    if ($('headerProgressBar')) $('headerProgressBar').style.width = '75%';
  }
}

// ---------- Question Navigator Engine ----------
function renderQuestionNavigator() {
  const navGrid = $('questionNavGrid');
  if (!navGrid) return;

  if (currentRound !== 'aptitude') {
    $('questionNavigatorCard')?.classList.add('hidden');
    return;
  }
  $('questionNavigatorCard')?.classList.remove('hidden');

  const questions = activeRoundData?.mcqs || activeRoundData?.questions || [];
  if (!questions.length) {
    navGrid.innerHTML = '';
    return;
  }

  navGrid.innerHTML = questions
    .map((q, idx) => {
      const qId = q.id || `mcq_${idx + 1}`;
      q.id = qId;
      const isCurrent = aptitudeActiveTab === 'mcq' && aptitudeIndex === idx;
      const isAnswered = Boolean(aptitudeAnswers[qId]);
      const isReview = markedForReview.has(qId);

      let cls = 'nav-btn';
      if (isCurrent) cls += ' current';
      else if (isAnswered) cls += ' answered';
      if (isReview) cls += ' marked-review';

      return `<button class="${cls}" data-idx="${idx}" type="button" title="Question ${idx + 1}">${idx + 1}</button>`;
    })
    .join('');

  navGrid.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.onclick = () => {
      const targetIdx = parseInt(btn.dataset.idx, 10);
      aptitudeActiveTab = 'mcq';
      aptitudeIndex = targetIdx;
      switchAptitudeTab('mcq');
    };
  });
}

// ---------- Aptitude Multi-Section Navigation & Renderers ----------
function switchAptitudeTab(tab) {
  aptitudeActiveTab = tab;
  $('aptTabMcq')?.classList.toggle('active', tab === 'mcq');
  $('aptTabTheory')?.classList.toggle('active', tab === 'theory');
  $('aptTabCoding')?.classList.toggle('active', tab === 'coding');

  $('aptSubMcq')?.classList.toggle('hidden', tab !== 'mcq');
  $('aptSubTheory')?.classList.toggle('hidden', tab !== 'theory');
  $('aptSubCoding')?.classList.toggle('hidden', tab !== 'coding');

  if (tab === 'mcq') renderAptitudeMCQ();
  else if (tab === 'theory') renderAptitudeTheory();
  else if (tab === 'coding') renderAptitudeCoding();

  updateHeaderStatus();
  renderQuestionNavigator();
}

function renderAptitudeMCQ() {
  const questions = activeRoundData?.mcqs || activeRoundData?.questions || [];
  $('aptMcqBadge').textContent = questions.length;
  if (!questions.length) {
    $('aptQuestionText').textContent = 'No objective MCQs configured for this round.';
    return;
  }

  const q = questions[aptitudeIndex];
  if (!q) return;
  const qId = q.id || `mcq_${aptitudeIndex + 1}`;
  q.id = qId;

  if ($('aptQuestionNumBadge')) $('aptQuestionNumBadge').textContent = `Question ${aptitudeIndex + 1}`;
  if ($('aptCategory')) $('aptCategory').textContent = q.skill || q.category || 'Quantitative Aptitude';
  if ($('aptQuestionText')) $('aptQuestionText').textContent = q.question;

  const selected = aptitudeAnswers[qId];
  const grid = $('aptOptionsGrid');
  grid.innerHTML = ['A', 'B', 'C', 'D']
    .map((key) => {
      const text = q.options ? q.options[key] : '';
      if (!text) return '';
      const isSel = selected === key;
      return `
      <div class="option-card ${isSel ? 'selected' : ''}" data-key="${key}" tabindex="0">
        <div class="radio-indicator">
          <div class="radio-inner-dot"></div>
        </div>
        <div class="option-key-badge">${key}</div>
        <div class="option-text">${text}</div>
      </div>`;
    })
    .join('');

  grid.querySelectorAll('.option-card').forEach((card) => {
    const handleSelect = () => {
      const key = card.dataset.key;
      aptitudeAnswers[qId] = key;
      renderAptitudeMCQ();
    };
    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });

  // Update Action Bar Buttons
  const isFirst = aptitudeIndex === 0;
  const isLast = aptitudeIndex === questions.length - 1;
  const theoryCount = activeRoundData?.theoryQuestions?.length || 0;
  const hasCoding = Boolean(activeRoundData?.codingProblem || activeRoundData?.codingQuestions?.[0]);

  if ($('prevQuestionBtn')) $('prevQuestionBtn').disabled = isFirst;
  if ($('nextQuestionBtn')) {
    $('nextQuestionBtn').disabled = false;
    if (isLast) {
      if (theoryCount > 0) {
        $('nextQuestionBtn').textContent = 'Go to Section B (Written Theory) →';
      } else if (hasCoding) {
        $('nextQuestionBtn').textContent = 'Go to Section C (Coding Sandbox) →';
      } else {
        $('nextQuestionBtn').textContent = 'Submit Assessment →';
      }
    } else {
      $('nextQuestionBtn').textContent = 'Save & Next →';
    }
  }

  // Mark for review toggle state
  if ($('markReviewBtn')) {
    const isReview = markedForReview.has(q.id);
    $('markReviewBtn').className = isReview ? 'btn warn-outline' : 'btn ghost';
    $('markReviewBtn').textContent = isReview ? '★ Marked for Review' : '⚐ Mark for Review';
  }

  updateHeaderStatus();
  renderQuestionNavigator();
}

function renderAptitudeTheory() {
  const theoryQuestions = activeRoundData?.theoryQuestions || [];
  $('aptTheoryBadge').textContent = theoryQuestions.length;
  if (!theoryQuestions.length) {
    $('aptTheoryQuestionText').textContent = 'No written theory questions configured.';
    return;
  }

  const tq = theoryQuestions[aptitudeTheoryIndex];
  if ($('aptTheoryCounter')) $('aptTheoryCounter').textContent = `Theory ${aptitudeTheoryIndex + 1} of ${theoryQuestions.length}`;
  if ($('aptTheorySkill')) $('aptTheorySkill').textContent = `${tq.skill || 'Technical Concept'}`;
  if ($('aptTheoryMaxScore')) $('aptTheoryMaxScore').textContent = `Max Score: ${tq.max_score || 10} Pts`;
  if ($('aptTheoryQuestionText')) $('aptTheoryQuestionText').textContent = tq.question;

  if ($('aptTheoryAnswer')) {
    $('aptTheoryAnswer').value = aptitudeTheoryAnswers[tq.id] || '';
    $('aptTheoryAnswer').oninput = (e) => {
      aptitudeTheoryAnswers[tq.id] = e.target.value;
    };
  }

  if ($('prevQuestionBtn')) $('prevQuestionBtn').disabled = false;
  if ($('nextQuestionBtn')) {
    const isLastTheory = aptitudeTheoryIndex === theoryQuestions.length - 1;
    const hasCoding = Boolean(activeRoundData?.codingProblem || activeRoundData?.codingQuestions?.[0]);
    if (isLastTheory) {
      $('nextQuestionBtn').textContent = hasCoding ? 'Go to Section C (Coding Sandbox) →' : 'Submit Assessment →';
    } else {
      $('nextQuestionBtn').textContent = 'Next Theory Question →';
    }
  }

  updateHeaderStatus();
  renderQuestionNavigator();
}

function renderAptitudeCoding() {
  const problem = activeRoundData?.codingProblem || activeRoundData?.codingQuestions?.[0];
  $('aptCodingBadge').textContent = problem ? '1' : '0';
  if (!problem) {
    $('aptCodingProblemStatement').textContent = 'No coding problem configured for this round.';
    return;
  }

  if ($('aptCodingDifficulty')) {
    $('aptCodingDifficulty').textContent = `Problem: ${problem.title || 'Aptitude Challenge'} (${problem.language || 'Python'})`;
  }
  if ($('aptCodingProblemStatement')) {
    $('aptCodingProblemStatement').innerHTML = `
      <h3 style="margin-bottom:8px; font-size:16px;">${problem.title || ''}</h3>
      <p style="color:var(--text); line-height:1.6; margin-bottom:12px;">${problem.problem_statement || ''}</p>
      ${problem.constraints ? `<b>Constraints:</b><ul style="padding-left:18px; color:var(--text-secondary); margin-top:4px;">${problem.constraints.map((c) => `<li>${c}</li>`).join('')}</ul>` : ''}
    `;
  }

  if ($('aptCodeEditor') && !$('aptCodeEditor').value) {
    $('aptCodeEditor').value = problem.starter_code || '# Write your solution here\n';
  }

  if ($('aptRunCodeBtn')) {
    $('aptRunCodeBtn').onclick = async () => {
      $('aptRunStatusText').textContent = 'Executing sandbox tests…';
      $('aptTerminalOutput').classList.remove('hidden');
      $('aptTerminalOutput').textContent = 'Compiling and executing visible test cases…\n';

      try {
        const res = await fetch(`/api/assessment/${id}/coding/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roundType: 'aptitude',
            language: problem.language || 'python',
            sourceCode: $('aptCodeEditor').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Execution failed');

        let out = `Results: ${data.passedCount}/${data.totalTests} Passed (${data.passPercentage}%)\n`;
        (data.results || []).forEach((r) => {
          out += `[${r.passed ? 'PASS' : 'FAIL'}] ${r.name} - Runtime: ${r.runtimeMs}ms\n`;
          if (r.stderr) out += `   Error: ${r.stderr}\n`;
          if (!r.passed && !r.isHidden) out += `   Expected: ${r.expectedOutput}\n   Actual:   ${r.actualOutput}\n`;
        });
        $('aptTerminalOutput').textContent = out;
        $('aptRunStatusText').textContent = data.allPassed ? '✓ All Visible Tests Passed!' : 'Some tests failed.';
      } catch (err) {
        $('aptTerminalOutput').textContent = `Execution Error: ${err.message}`;
        $('aptRunStatusText').textContent = 'Execution failed.';
      }
    };
  }

  if ($('prevQuestionBtn')) $('prevQuestionBtn').disabled = false;
  if ($('nextQuestionBtn')) {
    $('nextQuestionBtn').disabled = false;
    $('nextQuestionBtn').textContent = 'Submit Assessment →';
  }

  updateHeaderStatus();
  renderQuestionNavigator();
}

function renderCodingSandbox() {
  const problem = activeRoundData?.codingProblem || activeRoundData?.coding_problem;
  if (!problem) {
    if ($('problemStatement')) $('problemStatement').textContent = 'No algorithmic challenge configured for this round.';
    return;
  }

  if ($('codingDifficulty')) {
    $('codingDifficulty').textContent = `Problem: ${problem.title || 'Technical Challenge'} (${problem.language || 'Python'})`;
  }
  if ($('problemStatement')) {
    $('problemStatement').innerHTML = `
      <h3 style="margin-bottom:8px; font-size:16px;">${problem.title || ''}</h3>
      <p style="color:var(--text); line-height:1.6; margin-bottom:12px;">${problem.problem_statement || ''}</p>
      ${problem.constraints ? `<b>Constraints:</b><ul style="padding-left:18px; color:var(--text-secondary); margin-top:4px;">${problem.constraints.map((c) => `<li>${c}</li>`).join('')}</ul>` : ''}
    `;
  }

  if ($('codeEditor') && !$('codeEditor').value) {
    $('codeEditor').value = problem.starter_code || '# Write your algorithmic solution here\n';
  }

  if ($('runCodeBtn')) {
    $('runCodeBtn').onclick = async () => {
      $('runStatusText').textContent = 'Executing sandbox tests…';
      $('terminalOutput').classList.remove('hidden');
      $('terminalOutput').textContent = 'Compiling and executing visible test cases…\n';

      try {
        const res = await fetch(`/api/assessment/${id}/coding/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roundType: 'technical',
            language: problem.language || 'python',
            sourceCode: $('codeEditor').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Execution failed');

        let out = `Results: ${data.passedCount}/${data.totalTests} Passed (${data.passPercentage}%)\n`;
        (data.results || []).forEach((r) => {
          out += `[${r.passed ? 'PASS' : 'FAIL'}] ${r.name} - Runtime: ${r.runtimeMs}ms\n`;
          if (r.stderr) out += `   Error: ${r.stderr}\n`;
          if (!r.passed && !r.isHidden) out += `   Expected: ${r.expectedOutput}\n   Actual:   ${r.actualOutput}\n`;
        });
        $('terminalOutput').textContent = out;
        $('runStatusText').textContent = data.allPassed ? '✓ All Visible Tests Passed!' : 'Some tests failed.';
      } catch (err) {
        $('terminalOutput').textContent = `Execution Error: ${err.message}`;
        $('runStatusText').textContent = 'Execution failed.';
      }
    };
  }

  if ($('prevQuestionBtn')) $('prevQuestionBtn').disabled = true;
  if ($('nextQuestionBtn')) {
    $('nextQuestionBtn').disabled = false;
    $('nextQuestionBtn').textContent = 'Submit Assessment →';
  }
}

// ---------- Hardware & Security Status Synchronizer ----------
function updateHardwareStatusUI(camLive, micLive) {
  if ($('cameraStatusPill')) {
    $('cameraStatusPill').className = `device-status-pill ${camLive ? 'active' : ''}`;
  }
  if ($('cameraStatusText')) {
    $('cameraStatusText').textContent = camLive ? 'Camera Active' : 'Camera Disconnected';
  }
  if ($('secCameraStatus')) {
    $('secCameraStatus').className = `security-item-status ${camLive ? '' : 'fail'}`;
    $('secCameraStatus').textContent = camLive ? '✓ Connected' : '✕ Disconnected';
  }

  if ($('micStatusPill')) {
    $('micStatusPill').className = `device-status-pill ${micLive ? 'active' : ''}`;
  }
  if ($('micStatusText')) {
    $('micStatusText').textContent = micLive ? 'Mic Active' : 'Mic Disconnected';
  }
  if ($('secMicStatus')) {
    $('secMicStatus').className = `security-item-status ${micLive ? '' : 'fail'}`;
    $('secMicStatus').textContent = micLive ? '✓ Connected' : '✕ Disconnected';
  }

  const isAllGood = camLive && micLive && navigator.onLine;
  if ($('overallSecurityBadge')) {
    $('overallSecurityBadge').className = `security-status-badge ${isAllGood ? '' : 'warning'}`;
    $('overallSecurityBadge').textContent = isAllGood ? '✓ Secure' : '⚠️ Action Needed';
  }
}

// ---------- Reset Per-Round Integrity State ----------
function resetRoundIntegrityState() {
  activeIncidents.clear();
  phoneConsecutiveFrames = 0;
  multiplePersonsConsecutiveFrames = 0;
  noPersonConsecutiveFrames = 0;
  tabHiddenStartTime = null;
  windowBlurStartTime = null;
  clearTimeout(tabHiddenWatchdogTimeout);
  clearTimeout(windowBlurWatchdogTimeout);
  console.log(`[Integrity] Reset per-round runtime state for: ${currentRound}`);
}

// ---------- Setup Active Round ----------
async function setupCurrentRoundUI(isInitial = false) {
  if (isQuestionLoading) return;

  console.log(`[ASSESSMENT] Setting up round UI. Round: ${currentRound}, isInitial: ${isInitial}`);
  resetRoundIntegrityState();
  renderPipelineStepper();
  $('aptitudePanel')?.classList.add('hidden');
  $('codingPanel')?.classList.add('hidden');
  $('gdPanel')?.classList.add('hidden');
  $('aiVoicePanel')?.classList.add('hidden');
  $('startBtn')?.classList.add('hidden');
  $('submitRoundBtn')?.classList.add('hidden');

  // Sidebar transcript visibility
  if (currentRound === 'interview' || currentRound === 'gd') {
    $('transcriptSidebarCard')?.classList.remove('hidden');
    $('questionNavigatorCard')?.classList.add('hidden');
  } else {
    $('transcriptSidebarCard')?.classList.add('hidden');
    $('questionNavigatorCard')?.classList.remove('hidden');
  }

  const loadingTitle = isInitial ? 'Preparing your first question…' : 'Generating your next question…';
  const loadingSub = isInitial
    ? 'AI is initializing your assessment round and tailoring questions to your profile'
    : 'AI is synthesizing your progression and preparing the next stage';
  setQuestionLoading(true, loadingTitle, loadingSub);

  try {
    console.log(`[QUESTION] Requesting questions from: /api/assessment/${id}/round/setup?roundId=${currentRound}`);
    const res = await fetch(`/api/assessment/${id}/round/setup?roundId=${currentRound}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to load round data (${res.status})`);
    }
    activeRoundData = await res.json();
    console.log('[QUESTION] Successfully loaded round payload:', activeRoundData);
    setQuestionError(false);
  } catch (err) {
    console.error('[QUESTION] Setup round error:', err);
    setQuestionError(true, 'Unable to load the next question.', () => setupCurrentRoundUI(isInitial));
    return;
  } finally {
    setQuestionLoading(false);
  }

  updateHeaderStatus();

  if (currentRound === 'aptitude') {
    $('aptitudePanel')?.classList.remove('hidden');
    $('startBtn')?.classList.add('hidden');
    $('submitRoundBtn')?.classList.add('hidden');
    setStatus('Round 1: Aptitude Assessment', 'Complete Section A (MCQs), Section B (Theory), and Section C (Coding).');
    switchAptitudeTab('mcq');
    startTimer();
    startRecording();
  } else if (currentRound === 'technical') {
    $('codingPanel')?.classList.remove('hidden');
    $('startBtn')?.classList.add('hidden');
    $('submitRoundBtn')?.classList.remove('hidden');
    setStatus('Round 2: Technical Coding Round', 'Solve the algorithmic challenge in the isolated sandbox.');
    renderCodingSandbox();
    startTimer();
    startRecording();
  } else if (currentRound === 'interview') {
    $('aiVoicePanel')?.classList.remove('hidden');
    $('startBtn')?.classList.remove('hidden');
    if ($('startBtn')) {
      $('startBtn').disabled = false;
      $('startBtn').textContent = 'Start Interview with Dora →';
    }
    setStatus('Round 3: AI Voice Interview', 'Press Start Interview to converse live with Dora.');
  } else if (currentRound === 'gd') {
    $('gdPanel')?.classList.remove('hidden');
    $('startBtn')?.classList.add('hidden');
    $('submitRoundBtn')?.classList.remove('hidden');
    if ($('gdTopicTitle')) $('gdTopicTitle').textContent = activeRoundData?.topic?.topicTitle || 'Group Discussion';
    if ($('gdTopicContext')) $('gdTopicContext').textContent = activeRoundData?.topic?.backgroundContext || '';
    setStatus('Round 4: Group Discussion', 'Engage in collaborative discussion on the displayed topic.');
    startTimer();
    startRecording();
  }
}

// ---------- Start Active Round Action ----------
async function startRound() {
  if (isQuestionLoading) return;

  // Verify camera and microphone are live
  if (!cameraTrack || cameraTrack.readyState !== 'live' || !audioTrack || audioTrack.readyState !== 'live') {
    showError('Camera and microphone must be actively connected to begin this monitored round.');
    return;
  }

  $('startBtn')?.classList.add('hidden');
  $('submitRoundBtn')?.classList.remove('hidden');
  $('endBtn')?.classList.remove('hidden');
  showError('');

  audioCtx = new AudioContext();
  mixDest = audioCtx.createMediaStreamDestination();
  window.onbeforeunload = () => 'Your assessment session is active.';

  startTimer();
  startRecording();

  if (currentRound === 'interview') {
    setStatus('Connecting to Dora…');
    try {
      const creds = await api('/start');
      setStatus('Dora is joining…');
      await connectRoom(creds);
    } catch (err) {
      console.error(err);
      showError(err.message);
      setStatus('Connection problem');
    }
  } else {
    appendTranscriptMsg('ai', 'Assessment Orchestrator', `Started ${currentRound.toUpperCase()} round.`);
  }
}

// ---------- Confirmation Modal & Submit Flow ----------
function openSubmitConfirmationModal() {
  if (currentRound === 'aptitude') {
    const mcqs = activeRoundData?.mcqs || activeRoundData?.questions || [];
    const answeredCount = Object.keys(aptitudeAnswers).length;
    const totalCount = mcqs.length;
    const unansweredCount = Math.max(0, totalCount - answeredCount);

    if ($('submitConfirmSummary')) {
      $('submitConfirmSummary').innerHTML = `
        You have answered <strong>${answeredCount} of ${totalCount}</strong> multiple choice questions.
        ${unansweredCount > 0 ? `<br><span style="color:var(--warn);">⚠️ You have ${unansweredCount} unanswered questions remaining.</span>` : '<br><span style="color:var(--good);">✓ All objective questions have been answered.</span>'}
        <br><br>Do you want to proceed with evaluating your responses and advancing to the next assessment round?
      `;
    }
  } else {
    if ($('submitConfirmSummary')) {
      $('submitConfirmSummary').textContent = 'Are you ready to submit your solution for automated AI evaluation and benchmark grading?';
    }
  }
  isConfirmationModalOpen = true;
  $('submitConfirmModal')?.classList.remove('hidden');
}

// ---------- Submit & Advance Round ----------
async function handleRoundSubmit() {
  intentionalEndRequested = true;
  isCompleting = true;
  isConfirmationModalOpen = false;

  if (isQuestionLoading) return;

  $('submitConfirmModal')?.classList.add('hidden');
  setQuestionLoading(true, 'Evaluating & generating next round…', 'AI is synthesizing your results and preparing the next assessment stage');
  if ($('submitRoundBtn')) {
    $('submitRoundBtn').disabled = true;
    $('submitRoundBtn').innerHTML = '<span class="spinner"></span> Running Sandbox &amp; AI Analysis…';
  }

  let submissionPayload = {};
  if (currentRound === 'aptitude') {
    submissionPayload = {
      mcqAnswers: aptitudeAnswers,
      answers: aptitudeAnswers,
      theoryAnswers: aptitudeTheoryAnswers,
      codingSourceCode: $('aptCodeEditor')?.value || '',
      codingLanguage: activeRoundData?.codingProblem?.language || 'python',
    };
  } else if (currentRound === 'technical') {
    submissionPayload = {
      codingSourceCode: $('codeEditor')?.value || '',
      codingLanguage: activeRoundData?.codingProblem?.language || 'python',
    };
  } else if (currentRound === 'gd') {
    submissionPayload = { transcript: session?.transcript || [] };
  } else if (currentRound === 'interview') {
    await api('/end');
  }

  try {
    const res = await fetch(`/api/assessment/${id}/round/${currentRound}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionPayload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Evaluation failed');

    if (data.status === 'completed' || data.status === 'all_rounds_completed') {
      isRoundEnded = true;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      location.href = `/report.html?id=${id}`;
      return;
    }

    currentRound = data.currentRound;
    intentionalEndRequested = false;
    if ($('submitRoundBtn')) {
      $('submitRoundBtn').disabled = false;
      $('submitRoundBtn').textContent = 'Submit Assessment →';
    }
    await setupCurrentRoundUI(false);
  } catch (err) {
    intentionalEndRequested = false;
    showError(`Evaluation error: ${err.message}`);
    setQuestionError(true, `Evaluation error: ${err.message}`, () => handleRoundSubmit());
    if ($('submitRoundBtn')) {
      $('submitRoundBtn').disabled = false;
      $('submitRoundBtn').textContent = 'Submit Assessment →';
    }
  } finally {
    isCompleting = false;
    setQuestionLoading(false);
  }
}

// ---------- Diagnostic HUD & Vision Proctoring Engine (MediaPipe FaceMesh + COCO-SSD) ----------
function updateVisionDebugHUD(info = {}) {
  const overlay = $('visionDebugOverlay');
  const content = $('visionDebugContent');
  if (!overlay || !content) return;

  const isDebug = window.location.search.includes('debug=1') || (session && session.mode === 'DEBUG');
  if (!isDebug) {
    overlay.classList.add('hidden');
    return;
  }

  overlay.classList.remove('hidden');
  content.innerHTML = `Face: ${info.faceCount ?? 0}
Left Eye: ${info.leftEye || 'ok'}
Right Eye: ${info.rightEye || 'ok'}
Head Yaw: ${info.yawDeg != null ? (info.yawDeg > 0 ? '+' : '') + info.yawDeg + '°' : '0°'}
Head Pitch: ${info.pitchDeg != null ? (info.pitchDeg > 0 ? '+' : '') + info.pitchDeg + '°' : '0°'}
Gaze: ${info.gaze || 'LOOKING_AT_SCREEN'}
Gaze Duration: ${info.duration || '0.0'}s
Integrity: ${info.integrity || 'NORMAL'}`;
}

async function initVisionProctoringEngine() {
  // 1. Initialize COCO-SSD for Object / Person Detection
  try {
    if (typeof window.cocoSsd !== 'undefined' && !visionModel) {
      console.log('[VisionProctoring] Loading COCO-SSD object detection model...');
      visionModel = await window.cocoSsd.load();
      console.log('[VisionProctoring] COCO-SSD model initialized successfully.');
    }
  } catch (err) {
    console.warn('[VisionProctoring] Could not load object detection model:', err);
  }

  // 2. Initialize MediaPipe FaceMesh for Facial Landmarks & Eye Gaze Estimation
  try {
    if (typeof window.FaceMesh !== 'undefined' && !faceMeshModel) {
      console.log('[VisionProctoring] Initializing MediaPipe FaceMesh for gaze tracking...');
      faceMeshModel = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      faceMeshModel.setOptions({
        maxNumFaces: 4,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      faceMeshModel.onResults(processFaceMeshResults);
      console.log('[VisionProctoring] MediaPipe FaceMesh initialized successfully.');
    }
  } catch (meshErr) {
    console.warn('[VisionProctoring] Could not load FaceMesh:', meshErr);
  }

  const offCanvas = document.createElement('canvas');
  offCanvas.width = 320;
  offCanvas.height = 240;
  const offCtx = offCanvas.getContext('2d');
  const previewEl = $('preview');

  clearInterval(visionSamplingInterval);
  visionSamplingInterval = setInterval(async () => {
    if (!previewEl || previewEl.paused || previewEl.ended || !previewEl.videoWidth) return;
    if (isAssessmentPaused || intentionalEndRequested || isCompleting || isRoundEnded) return;

    try {
      offCtx.drawImage(previewEl, 0, 0, offCanvas.width, offCanvas.height);
      const isGD = currentRound === 'gd' || currentRound === 'GROUP_DISCUSSION';
      const sampleTs = Date.now();

      // Run FaceMesh landmark analysis for Eye/Gaze/Head pose
      if (faceMeshModel) {
        try {
          await faceMeshModel.send({ image: previewEl });
        } catch (fmErr) {
          // Fallback to geometric canvas inspection if FaceMesh worker is busy
        }
      }

      // Run COCO-SSD object detection
      if (visionModel) {
        const predictions = await visionModel.detect(offCanvas);

        // 1. Phone / Handheld Device Detection
        const phonePred = (predictions || []).find(
          (p) => (p.class === 'cell phone' || p.class === 'phone' || p.class === 'remote') && p.score >= 0.52
        );

        if (phonePred) {
          phoneConsecutiveFrames++;
          if (phoneConsecutiveFrames >= 2) {
            if (!activeIncidents.has('PHONE_DETECTED')) {
              activeIncidents.add('PHONE_DETECTED');
              logIntegrity('PHONE_DETECTED', {
                detectionTimestamp: sampleTs,
                immediate: true,
                confidence: Math.round(phonePred.score * 100) / 100,
                persistenceCount: phoneConsecutiveFrames,
                bbox: phonePred.bbox,
                className: phonePred.class,
                source: 'VISION_COCO_SSD',
              });
            }
          }
        } else {
          if (phoneConsecutiveFrames > 0) phoneConsecutiveFrames--;
          if (phoneConsecutiveFrames === 0 && activeIncidents.has('PHONE_DETECTED')) {
            activeIncidents.delete('PHONE_DETECTED');
            logIntegrity('PHONE_CLEARED', { detectionTimestamp: sampleTs });
          }
        }

        // 2. Face & Person Count Tracking
        const persons = (predictions || []).filter((p) => p.class === 'person' && p.score >= 0.48);

        if (!isGD) {
          if (persons.length >= 2) {
            multiplePersonsConsecutiveFrames++;
            if (multiplePersonsConsecutiveFrames >= 2) {
              if (!activeIncidents.has('MULTIPLE_PERSONS')) {
                activeIncidents.add('MULTIPLE_PERSONS');
                logIntegrity('MULTIPLE_PERSONS_DETECTED', {
                  detectionTimestamp: sampleTs,
                  immediate: true,
                  personCount: persons.length,
                  confidence: Math.round(persons[1].score * 100) / 100,
                  persistenceCount: multiplePersonsConsecutiveFrames,
                  source: 'VISION_PERSON_DETECTOR',
                });
              }
            }
          } else {
            if (multiplePersonsConsecutiveFrames > 0) multiplePersonsConsecutiveFrames--;
            if (multiplePersonsConsecutiveFrames === 0 && activeIncidents.has('MULTIPLE_PERSONS')) {
              activeIncidents.delete('MULTIPLE_PERSONS');
              logIntegrity('MULTIPLE_PERSONS_CLEARED', { detectionTimestamp: sampleTs });
            }
          }

          if (persons.length === 0) {
            noPersonConsecutiveFrames++;
            if (noPersonConsecutiveFrames >= 6) {
              if (!activeIncidents.has('NO_FACE')) {
                activeIncidents.add('NO_FACE');
                logIntegrity('NO_FACE_DETECTED', {
                  detectionTimestamp: sampleTs,
                  immediate: true,
                  durationSec: 2,
                  persistenceCount: noPersonConsecutiveFrames,
                  source: 'VISION_PERSON_DETECTOR',
                });
              }
            }
          } else {
            if (noPersonConsecutiveFrames > 0) noPersonConsecutiveFrames = 0;
            if (activeIncidents.has('NO_FACE')) {
              activeIncidents.delete('NO_FACE');
              logIntegrity('FACE_RESTORED', { detectionTimestamp: sampleTs });
            }
          }
        }
      }
    } catch (visErr) {
      // Ignore transient frame draw error during video initialization
    }
  }, 330);
}

// Process MediaPipe FaceMesh Multi-Face Landmarks for Eye & Gaze Tracking
function processFaceMeshResults(results) {
  const isGD = currentRound === 'gd' || currentRound === 'GROUP_DISCUSSION';
  const sampleTs = Date.now();
  const faces = results.multiFaceLandmarks || [];
  const faceCount = faces.length;

  if (faceCount === 0) {
    currentGazeState = 'NO_FACE';
    updateVisionDebugHUD({ faceCount: 0, gaze: 'NO_FACE', yawDeg: 0, pitchDeg: 0, duration: '0.0', integrity: 'NO_FACE' });
    return;
  }

  const landmarks = faces[0];
  if (!landmarks || landmarks.length < 150) return;

  // 1. Head Pose Estimation (Nose: 1, Left Cheek: 234, Right Cheek: 454, Forehead: 10, Chin: 152)
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  const faceWidth = Math.max(0.001, rightCheek.x - leftCheek.x);
  const dxLeft = nose.x - leftCheek.x;
  const dxRight = rightCheek.x - nose.x;
  const yawRatio = (dxRight - dxLeft) / faceWidth;
  const yawDeg = Math.round(yawRatio * 75);

  const faceHeight = Math.max(0.001, chin.y - forehead.y);
  const dyTop = nose.y - forehead.y;
  const dyChin = chin.y - nose.y;
  const pitchRatio = (dyChin - dyTop) / faceHeight;
  const pitchDeg = Math.round((pitchRatio - 0.15) * 60);

  // 2. Eye Landmark Geometry & Iris Horizontal Ratio
  const leftEyeOuter = landmarks[33];
  const leftEyeInner = landmarks[133];
  const leftIris = landmarks[468] || { x: (leftEyeOuter.x + leftEyeInner.x) / 2, y: (leftEyeOuter.y + leftEyeInner.y) / 2 };

  const rightEyeInner = landmarks[362];
  const rightEyeOuter = landmarks[263];
  const rightIris = landmarks[473] || { x: (rightEyeInner.x + rightEyeOuter.x) / 2, y: (rightEyeInner.y + rightEyeOuter.y) / 2 };

  const leftEyeWidth = Math.max(0.001, Math.abs(leftEyeInner.x - leftEyeOuter.x));
  const rightEyeWidth = Math.max(0.001, Math.abs(rightEyeOuter.x - rightEyeInner.x));

  const leftIrisRatio = (leftIris.x - Math.min(leftEyeOuter.x, leftEyeInner.x)) / leftEyeWidth;
  const rightIrisRatio = (rightIris.x - Math.min(rightEyeInner.x, rightEyeOuter.x)) / rightEyeWidth;
  const avgIrisRatio = (leftIrisRatio + rightIrisRatio) / 2;

  // 3. Classify Gaze State
  let state = 'LOOKING_AT_SCREEN';
  if (yawDeg < -24) {
    state = 'HEAD_TURNED_AWAY';
  } else if (yawDeg > 24) {
    state = 'HEAD_TURNED_AWAY';
  } else if (avgIrisRatio < 0.36 || yawDeg < -12) {
    state = 'LOOKING_LEFT';
  } else if (avgIrisRatio > 0.64 || yawDeg > 12) {
    state = 'LOOKING_RIGHT';
  } else if (pitchDeg > 18) {
    state = 'LOOKING_DOWN';
  } else if (pitchDeg < -18) {
    state = 'LOOKING_UP';
  }

  currentGazeState = state;

  // 4. Temporal Confirmation (Target ~2.5s sustained off-screen behavior)
  const isOffScreen = state === 'LOOKING_LEFT' || state === 'LOOKING_RIGHT' || state === 'LOOKING_DOWN' || state === 'HEAD_TURNED_AWAY';

  if (isOffScreen) {
    gazeConsecutiveFrames++;
    if (gazeStartTime === 0) gazeStartTime = sampleTs;
    const durationMs = sampleTs - gazeStartTime;

    if (state === 'HEAD_TURNED_AWAY') headTurnConsecutiveFrames++;
    else if (headTurnConsecutiveFrames > 0) headTurnConsecutiveFrames--;

    // >= 8 frames at 330ms is ~2.6s
    if (gazeConsecutiveFrames >= 8 && !isGD) {
      const eventType = headTurnConsecutiveFrames >= 6 ? 'HEAD_TURNED_AWAY' : 'GAZE_OFF_SCREEN';
      if (!activeIncidents.has('GAZE_OFF_SCREEN')) {
        activeIncidents.add('GAZE_OFF_SCREEN');
        logIntegrity(eventType, {
          detectionTimestamp: sampleTs,
          immediate: false,
          direction: state,
          durationSec: Math.round(durationMs / 1000),
          durationMs,
          yawDeg,
          pitchDeg,
          confidence: 0.86,
          source: 'VISION_FACEMESH_TRACKER',
        });
      }
    }
  } else {
    // Normal gaze / blinks - gradual decay
    if (gazeConsecutiveFrames > 0) gazeConsecutiveFrames = Math.max(0, gazeConsecutiveFrames - 2);
    if (headTurnConsecutiveFrames > 0) headTurnConsecutiveFrames = Math.max(0, headTurnConsecutiveFrames - 2);

    if (gazeConsecutiveFrames === 0) {
      gazeStartTime = 0;
      if (activeIncidents.has('GAZE_OFF_SCREEN')) {
        activeIncidents.delete('GAZE_OFF_SCREEN');
        logIntegrity('GAZE_RECOVERED', {
          detectionTimestamp: sampleTs,
          reason: 'Candidate returned gaze to screen',
        });
      }
    }
  }

  updateVisionDebugHUD({
    faceCount,
    leftEye: 'detected',
    rightEye: 'detected',
    yawDeg,
    pitchDeg,
    gaze: currentGazeState,
    duration: gazeStartTime > 0 ? ((sampleTs - gazeStartTime) / 1000).toFixed(1) : '0.0',
    integrity: activeIncidents.has('GAZE_OFF_SCREEN') ? 'VIOLATION_FLAGGED' : isOffScreen ? 'PENDING' : 'NORMAL',
  });
}

// ---------- Real-time Audio Proctoring Engine (Web Audio API VAD + Speaker Representation) ----------
let audioSamplingInterval = null;
let candidateVoiceProfile = null;
let consecutiveSecondSpeakerFrames = 0;
let lastCandidateSpeechTs = 0;
let lastSecondSpeakerTs = 0;

function initAudioProctoringEngine() {
  if (!stream) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('[AudioProctoring] Web Audio API not supported in this browser environment.');
      return;
    }
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const micSource = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    micSource.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(bufferLength);

    clearInterval(audioSamplingInterval);
    audioSamplingInterval = setInterval(() => {
      if (isAssessmentPaused || !audioTrack || audioTrack.readyState !== 'live' || !audioTrack.enabled || audioTrack.muted) return;
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeArray);

      // 1. Compute RMS (Energy)
      let sumSq = 0;
      for (let i = 0; i < bufferLength; i++) {
        const norm = (timeArray[i] - 128) / 128;
        sumSq += norm * norm;
      }
      const rms = Math.sqrt(sumSq / bufferLength);

      // 2. VAD: Spectral Energy Distribution (Voice speech band: 250Hz - 3500Hz)
      const sampleRate = audioCtx.sampleRate || 44100;
      const binWidth = sampleRate / 512;
      let speechEnergy = 0;
      let noiseEnergy = 0;
      let weightedFreqSum = 0;
      let totalSpectralEnergy = 0;

      for (let i = 0; i < bufferLength; i++) {
        const freq = i * binWidth;
        const val = dataArray[i];
        totalSpectralEnergy += val;
        weightedFreqSum += freq * val;

        if (freq >= 250 && freq <= 3500) {
          speechEnergy += val;
        } else {
          noiseEnergy += val;
        }
      }

      const spectralCentroid = totalSpectralEnergy > 0 ? weightedFreqSum / totalSpectralEnergy : 0;
      const speechRatio = (speechEnergy + 1) / (noiseEnergy + 1);

      const sampleTs = Date.now();
      const isGD = currentRound === 'gd' || currentRound === 'GROUP_DISCUSSION';

      // Classify VAD window
      const isSilence = rms < 0.02;
      const isNoise = !isSilence && (speechRatio < 0.65 || spectralCentroid > 4500 || spectralCentroid < 180);
      const isSpeech = !isSilence && !isNoise && rms >= 0.03 && speechRatio >= 0.75 && spectralCentroid >= 250 && spectralCentroid <= 4000;

      if (isSpeech) {
        // If candidate baseline profile is not yet calibrated, learn candidate baseline
        if (!candidateVoiceProfile || candidateVoiceProfile.calibratedSamples < 12) {
          if (!candidateVoiceProfile) {
            candidateVoiceProfile = { centroidMean: spectralCentroid, energyMean: rms, calibratedSamples: 1 };
          } else {
            candidateVoiceProfile.centroidMean =
              (candidateVoiceProfile.centroidMean * candidateVoiceProfile.calibratedSamples + spectralCentroid) /
              (candidateVoiceProfile.calibratedSamples + 1);
            candidateVoiceProfile.energyMean =
              (candidateVoiceProfile.energyMean * candidateVoiceProfile.calibratedSamples + rms) /
              (candidateVoiceProfile.calibratedSamples + 1);
            candidateVoiceProfile.calibratedSamples++;
          }
          lastCandidateSpeechTs = sampleTs;
        } else {
          // Compare against candidate baseline
          const centroidDiff = Math.abs(spectralCentroid - candidateVoiceProfile.centroidMean) / candidateVoiceProfile.centroidMean;

          if (centroidDiff > 0.40 && !isGD) {
            // Possible different speaker formant / spectral signature
            consecutiveSecondSpeakerFrames++;
            if (consecutiveSecondSpeakerFrames >= 3) {
              lastSecondSpeakerTs = sampleTs;
              if (!activeIncidents.has('POSSIBLE_SECOND_SPEAKER')) {
                activeIncidents.add('POSSIBLE_SECOND_SPEAKER');
                logIntegrity('POSSIBLE_SECOND_SPEAKER', {
                  detectionTimestamp: sampleTs,
                  immediate: false,
                  confidence: 0.82,
                  consecutiveFrames: consecutiveSecondSpeakerFrames,
                  centroidDiff: Math.round(centroidDiff * 100) / 100,
                  spectralCentroid: Math.round(spectralCentroid),
                  source: 'AUDIO_VAD_ANALYZER',
                });
              }
            }
          } else {
            // Matches candidate baseline voice
            lastCandidateSpeechTs = sampleTs;
            if (consecutiveSecondSpeakerFrames > 0) consecutiveSecondSpeakerFrames--;
            if (consecutiveSecondSpeakerFrames === 0 && activeIncidents.has('POSSIBLE_SECOND_SPEAKER')) {
              activeIncidents.delete('POSSIBLE_SECOND_SPEAKER');
            }

            // Coaching Pattern Check: Candidate speech occurs 1.0s to 4.5s immediately following a second speaker prompt
            if (!isGD && lastSecondSpeakerTs > 0 && (sampleTs - lastSecondSpeakerTs) >= 1000 && (sampleTs - lastSecondSpeakerTs) <= 4500) {
              if (!activeIncidents.has('POSSIBLE_EXTERNAL_COACHING')) {
                activeIncidents.add('POSSIBLE_EXTERNAL_COACHING');
                logIntegrity('POSSIBLE_EXTERNAL_COACHING', {
                  detectionTimestamp: sampleTs,
                  immediate: true,
                  candidateSpeech: true,
                  possibleSecondSpeaker: true,
                  temporalGapMs: sampleTs - lastSecondSpeakerTs,
                  confidence: 0.85,
                  source: 'AUDIO_TEMPORAL_CORRELATOR',
                });
              }
            }
          }
        }
      } else {
        // Silence or background noise (keyboard, fan, chair) - clean decay
        if (consecutiveSecondSpeakerFrames > 0) consecutiveSecondSpeakerFrames--;
        if (consecutiveSecondSpeakerFrames === 0 && activeIncidents.has('POSSIBLE_SECOND_SPEAKER')) {
          activeIncidents.delete('POSSIBLE_SECOND_SPEAKER');
        }
      }
    }, 350);
  } catch (audioErr) {
    console.warn('[AudioProctoring] Web Audio proctoring init failed:', audioErr);
  }
}

// ---------- Hardware Media Track Listeners & 500ms Watchdog ----------
let lastVideoCurrentTime = -1;
let videoStuckFrameCount = 0;

function handleCameraLost(reason = '', specificType = 'CAMERA_DISCONNECTED') {
  lastCameraState = 'ended';
  const sampleTs = Date.now();
  updateHardwareStatusUI(false, lastAudioState === 'live');
  if (!activeIncidents.has('CAMERA_INACTIVE')) {
    activeIncidents.add('CAMERA_INACTIVE');
    logIntegrity(specificType, {
      detectionTimestamp: sampleTs,
      immediate: true,
      reason,
      readyState: cameraTrack?.readyState,
      enabled: cameraTrack?.enabled,
      muted: cameraTrack?.muted,
      source: 'CAMERA_WATCHDOG',
    });
  }
}

function handleCameraRestored(reason = '') {
  lastCameraState = 'live';
  const sampleTs = Date.now();
  updateHardwareStatusUI(true, lastAudioState === 'live');
  if (activeIncidents.has('CAMERA_INACTIVE')) {
    activeIncidents.delete('CAMERA_INACTIVE');
    logIntegrity('CAMERA_RECONNECTED', { detectionTimestamp: sampleTs, reason });
  }
}

function handleMicLost(reason = '', specificType = 'MIC_DISCONNECTED') {
  lastAudioState = 'ended';
  const sampleTs = Date.now();
  updateHardwareStatusUI(lastCameraState === 'live', false);
  if (!activeIncidents.has('MIC_INACTIVE')) {
    activeIncidents.add('MIC_INACTIVE');
    logIntegrity(specificType, {
      detectionTimestamp: sampleTs,
      immediate: true,
      reason,
      readyState: audioTrack?.readyState,
      enabled: audioTrack?.enabled,
      muted: audioTrack?.muted,
      source: 'MIC_WATCHDOG',
    });
  }
}

function handleMicRestored(reason = '') {
  lastAudioState = 'live';
  const sampleTs = Date.now();
  updateHardwareStatusUI(lastCameraState === 'live', true);
  if (activeIncidents.has('MIC_INACTIVE')) {
    activeIncidents.delete('MIC_INACTIVE');
    logIntegrity('MIC_RECONNECTED', { detectionTimestamp: sampleTs, reason });
  }
}

function setupTrackMonitoring() {
  if (cameraTrack) {
    cameraTrack.onended = () => handleCameraLost('Track ended event', 'CAMERA_DISCONNECTED');
    cameraTrack.onmute = () => handleCameraLost('Track muted event', 'CAMERA_MUTED');
    cameraTrack.onunmute = () => handleCameraRestored('Track unmuted event');
  }

  if (audioTrack) {
    audioTrack.onended = () => handleMicLost('Track ended event', 'MIC_DISCONNECTED');
    audioTrack.onmute = () => handleMicLost('Track muted event', 'MIC_MUTED');
    audioTrack.onunmute = () => handleMicRestored('Track unmuted event');
  }

  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'camera' }).then((p) => {
      p.onchange = () => {
        if (p.state === 'denied') handleCameraLost('Camera permission revoked', 'CAMERA_DISCONNECTED');
      };
    }).catch(() => {});

    navigator.permissions.query({ name: 'microphone' }).then((p) => {
      p.onchange = () => {
        if (p.state === 'denied') handleMicLost('Microphone permission revoked', 'MIC_DISCONNECTED');
      };
    }).catch(() => {});
  }

  clearInterval(hardwareWatchdogInterval);
  hardwareWatchdogInterval = setInterval(() => {
    const previewEl = $('preview');

    // 1. Camera track state & frame arrival watchdog
    if (cameraTrack) {
      if (cameraTrack.readyState === 'ended') {
        if (lastCameraState === 'live') handleCameraLost('Track readyState ended', 'CAMERA_DISCONNECTED');
      } else if (!cameraTrack.enabled) {
        if (lastCameraState === 'live') handleCameraLost('Camera track disabled by user', 'CAMERA_DISABLED');
      } else if (cameraTrack.muted) {
        if (lastCameraState === 'live') handleCameraLost('Camera track muted by OS', 'CAMERA_MUTED');
      } else {
        // Track is supposedly live, verify video element is actually playing and receiving frames
        if (previewEl && !previewEl.paused && !isAssessmentPaused) {
          if (previewEl.currentTime === lastVideoCurrentTime && previewEl.currentTime > 0) {
            videoStuckFrameCount++;
            if (videoStuckFrameCount >= 5 && lastCameraState === 'live') {
              handleCameraLost('Video frames stopped arriving (frozen)', 'CAMERA_NO_FRAME');
            }
          } else {
            videoStuckFrameCount = 0;
            lastVideoCurrentTime = previewEl.currentTime;
            if (lastCameraState !== 'live') {
              handleCameraRestored('Video frames arriving normally');
            }
          }
        } else if (lastCameraState !== 'live' && cameraTrack.readyState === 'live' && cameraTrack.enabled && !cameraTrack.muted) {
          handleCameraRestored('Camera track active');
        }
      }
    } else if (lastCameraState === 'live') {
      handleCameraLost('Camera track missing', 'CAMERA_DISCONNECTED');
    }

    // 2. Microphone track state watchdog
    if (audioTrack) {
      if (audioTrack.readyState === 'ended') {
        if (lastAudioState === 'live') handleMicLost('Microphone readyState ended', 'MIC_DISCONNECTED');
      } else if (!audioTrack.enabled) {
        if (lastAudioState === 'live') handleMicLost('Microphone track disabled by user', 'MIC_DISABLED');
      } else if (audioTrack.muted) {
        if (lastAudioState === 'live') handleMicLost('Microphone track muted by OS', 'MIC_MUTED');
      } else if (lastAudioState !== 'live') {
        handleMicRestored('Microphone track active');
      }
    } else if (lastAudioState === 'live') {
      handleMicLost('Microphone track missing', 'MIC_DISCONNECTED');
    }

    const camHealthy = cameraTrack && cameraTrack.readyState === 'live' && cameraTrack.enabled && !cameraTrack.muted && videoStuckFrameCount < 5;
    const micHealthy = audioTrack && audioTrack.readyState === 'live' && audioTrack.enabled && !audioTrack.muted;
    updateHardwareStatusUI(Boolean(camHealthy), Boolean(micHealthy));
  }, 500);
}

// ---------- Pre-Round Device Check & Real-time Listeners ----------
async function init() {
  console.log('[ASSESSMENT] Screen mounted. Session ID:', id);

  if (!id) {
    showError('Missing assessment session identifier. Please launch your assessment from your SkillSetu dashboard.');
    setStatus('Session Missing');
    return;
  }

  const res = await fetch(`/api/interviews/${id}`);
  if (!res.ok) {
    showError('Assessment session not found or expired. Please return to your SkillSetu Rounds tab to launch a practice or real interview session.');
    setStatus('Session Not Found');
    return;
  }
  session = await res.json();
  console.log('[ASSESSMENT] Session loaded:', {
    id: session.id,
    candidateName: session.name,
    currentRound: session.currentRound,
    status: session.status,
    mode: session.mode
  });

  if (session.status === 'completed') return (location.href = `/report.html?id=${id}`);

  const urlParams = new URLSearchParams(location.search);
  const targetRoundParam = urlParams.get('round');
  const modeParam = (urlParams.get('mode') || session.mode || 'REAL').toUpperCase();

  currentRound = targetRoundParam || session.currentRound || 'aptitude';
  updateHeaderStatus();

  // Authoritative candidate presence heartbeat (5s interval)
  function startCandidateHeartbeat() {
    const sendHb = async () => {
      try {
        await fetch(`/api/interviews/${id}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roundKey: currentRound,
            timestamp: new Date().toISOString(),
            metadata: {
              isPaused: isAssessmentPaused,
              device: detectDeviceCategory()
            }
          })
        });
      } catch (_) {}
    };
    sendHb();
    setInterval(sendHb, 5000);
  }
  startCandidateHeartbeat();

  if (!Room || !window.MediaRecorder) {
    showError('Your browser does not support WebRTC / MediaRecorder.');
    setStatus('Unsupported browser');
    return;
  }

  try {
    console.log('[CAMERA] Requesting user media stream...');
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    cameraTrack = stream.getVideoTracks()[0];
    audioTrack = stream.getAudioTracks()[0];

    console.log('[CAMERA] Stream acquired:', {
      streamId: stream.id,
      videoTracks: stream.getVideoTracks().map((t) => ({
        label: t.label,
        readyState: t.readyState,
        enabled: t.enabled,
        muted: t.muted,
      })),
      audioTracks: stream.getAudioTracks().map((t) => ({
        label: t.label,
        readyState: t.readyState,
        enabled: t.enabled,
        muted: t.muted,
      })),
    });

    const previewEl = $('preview');
    if (previewEl) {
      previewEl.srcObject = stream;
      previewEl.muted = true;
      previewEl.playsInline = true;
      previewEl.autoplay = true;

      try {
        await previewEl.play();
        console.log('[CAMERA] Video playback started:', {
          videoWidth: previewEl.videoWidth,
          videoHeight: previewEl.videoHeight,
          readyState: previewEl.readyState,
          paused: previewEl.paused,
        });
      } catch (playErr) {
        console.error('[CAMERA] preview.play() failed:', playErr);
      }
    }

    setupTrackMonitoring();
    updateHardwareStatusUI(
      Boolean(cameraTrack && cameraTrack.readyState === 'live'),
      Boolean(audioTrack && audioTrack.readyState === 'live'),
    );
  } catch (err) {
    console.error('[CAMERA] getUserMedia failed:', err);
    updateHardwareStatusUI(false, false);
    setStatus('Camera / microphone blocked');
    showError('Camera and microphone access is mandatory for this monitored assessment. Please allow permissions in your browser.');
    return;
  }

  initVisionProctoringEngine();
  initAudioProctoringEngine();

  // Focus & Visibility Listeners with Intentional End & Lifecycle Guards
  document.addEventListener('visibilitychange', () => {
    if (intentionalEndRequested || isCompleting || isRoundEnded || finishing || isConfirmationModalOpen) {
      return;
    }
    if (document.hidden) {
      tabHiddenStartTime = Date.now();
      logIntegrity('TAB_SWITCH_STARTED');
      clearTimeout(tabHiddenWatchdogTimeout);
      tabHiddenWatchdogTimeout = setTimeout(() => {
        if (document.hidden && !intentionalEndRequested && !isCompleting && !isRoundEnded && !isConfirmationModalOpen) {
          logIntegrity('TAB_SWITCH', { durationMs: 3000, immediate: true });
        }
      }, 3000);
    } else {
      clearTimeout(tabHiddenWatchdogTimeout);
      const durationMs = tabHiddenStartTime ? Date.now() - tabHiddenStartTime : 0;
      tabHiddenStartTime = null;
      logIntegrity('TAB_SWITCH', { durationMs });
      logIntegrity('TAB_VISIBLE');
    }
  });

  window.addEventListener('blur', () => {
    if (intentionalEndRequested || isCompleting || isRoundEnded || finishing || isConfirmationModalOpen) {
      return;
    }
    windowBlurStartTime = Date.now();
    logIntegrity('WINDOW_BLUR_STARTED');
    clearTimeout(windowBlurWatchdogTimeout);
    windowBlurWatchdogTimeout = setTimeout(() => {
      if (!intentionalEndRequested && !isCompleting && !isRoundEnded && !isConfirmationModalOpen) {
        logIntegrity('WINDOW_BLUR', { durationMs: 3000, immediate: true });
      }
    }, 3000);
  });

  window.addEventListener('focus', () => {
    clearTimeout(windowBlurWatchdogTimeout);
    if (intentionalEndRequested || isCompleting || isRoundEnded || finishing || isConfirmationModalOpen) {
      return;
    }
    const durationMs = windowBlurStartTime ? Date.now() - windowBlurStartTime : 0;
    windowBlurStartTime = null;
    logIntegrity('WINDOW_BLUR', { durationMs });
    logIntegrity('WINDOW_FOCUSED');
  });

  document.addEventListener('fullscreenchange', () => {
    if (intentionalEndRequested || isCompleting || isRoundEnded || finishing) {
      return;
    }
    if (!document.fullscreenElement) {
      logIntegrity('FULLSCREEN_EXIT', { immediate: true });
    } else {
      logIntegrity('FULLSCREEN_RESTORED');
    }
  });

  window.addEventListener('offline', () => {
    logIntegrity('NETWORK_DISCONNECTED');
    $('networkNotice')?.classList.remove('hidden');
    if ($('secNetStatus')) {
      $('secNetStatus').className = 'security-item-status fail';
      $('secNetStatus').textContent = '✕ Reconnecting…';
    }
  });

  window.addEventListener('online', () => {
    logIntegrity('NETWORK_RECONNECTED');
    $('networkNotice')?.classList.add('hidden');
    if ($('secNetStatus')) {
      $('secNetStatus').className = 'security-item-status';
      $('secNetStatus').textContent = '✓ Secure';
    }
    flushIntegrityQueue();
  });

  const device = detectDeviceCategory();
  if (device.isMobile) {
    logIntegrity('UNSUPPORTED_DEVICE', { message: 'Mobile or tablet device detected.' });
  }

  await setupCurrentRoundUI(true);
}

// ---------- Event Listeners Binding ----------
$('startBtn')?.addEventListener('click', startRound);
$('submitRoundBtn')?.addEventListener('click', openSubmitConfirmationModal);

$('endBtn')?.addEventListener('pointerdown', () => {
  intentionalEndRequested = true;
});
$('endBtn')?.addEventListener('click', () => {
  intentionalEndRequested = true;
  if (confirm('End entire assessment and calculate final evaluation now?')) {
    handleRoundSubmit();
  } else {
    intentionalEndRequested = false;
  }
});

// Navigation Bar Listeners
$('markReviewBtn')?.addEventListener('click', () => {
  const questions = activeRoundData?.mcqs || activeRoundData?.questions || [];
  const q = questions[aptitudeIndex];
  if (!q) return;

  if (markedForReview.has(q.id)) {
    markedForReview.delete(q.id);
  } else {
    markedForReview.add(q.id);
  }
  renderAptitudeMCQ();
  renderQuestionNavigator();
});

$('prevQuestionBtn')?.addEventListener('click', () => {
  if (currentRound === 'aptitude') {
    if (aptitudeActiveTab === 'mcq') {
      if (aptitudeIndex > 0) {
        aptitudeIndex--;
        renderAptitudeMCQ();
      }
    } else if (aptitudeActiveTab === 'theory') {
      if (aptitudeTheoryIndex > 0) {
        aptitudeTheoryIndex--;
        renderAptitudeTheory();
      } else {
        const mcqs = activeRoundData?.mcqs || activeRoundData?.questions || [];
        if (mcqs.length > 0) {
          aptitudeIndex = mcqs.length - 1;
          switchAptitudeTab('mcq');
        }
      }
    } else if (aptitudeActiveTab === 'coding') {
      const theoryQuestions = activeRoundData?.theoryQuestions || [];
      const mcqs = activeRoundData?.mcqs || activeRoundData?.questions || [];
      if (theoryQuestions.length > 0) {
        aptitudeTheoryIndex = theoryQuestions.length - 1;
        switchAptitudeTab('theory');
      } else if (mcqs.length > 0) {
        aptitudeIndex = mcqs.length - 1;
        switchAptitudeTab('mcq');
      }
    }
  }
});

$('nextQuestionBtn')?.addEventListener('click', (e) => {
  if (e) e.preventDefault();
  console.log('[NEXT] Save & Next button clicked:', {
    currentRound,
    aptitudeActiveTab,
    aptitudeIndex,
    answers: aptitudeAnswers
  });

  if (currentRound === 'aptitude') {
    if (aptitudeActiveTab === 'mcq') {
      const mcqs = activeRoundData?.mcqs || activeRoundData?.questions || [];
      if (aptitudeIndex < mcqs.length - 1) {
        aptitudeIndex++;
        renderAptitudeMCQ();
      } else {
        const theoryQuestions = activeRoundData?.theoryQuestions || [];
        const hasCoding = Boolean(activeRoundData?.codingProblem || activeRoundData?.codingQuestions?.[0]);
        if (theoryQuestions.length > 0) {
          aptitudeTheoryIndex = 0;
          switchAptitudeTab('theory');
        } else if (hasCoding) {
          switchAptitudeTab('coding');
        } else {
          openSubmitConfirmationModal();
        }
      }
    } else if (aptitudeActiveTab === 'theory') {
      const theoryQuestions = activeRoundData?.theoryQuestions || [];
      if (aptitudeTheoryIndex < theoryQuestions.length - 1) {
        aptitudeTheoryIndex++;
        renderAptitudeTheory();
      } else {
        const hasCoding = Boolean(activeRoundData?.codingProblem || activeRoundData?.codingQuestions?.[0]);
        if (hasCoding) {
          switchAptitudeTab('coding');
        } else {
          openSubmitConfirmationModal();
        }
      }
    } else if (aptitudeActiveTab === 'coding') {
      openSubmitConfirmationModal();
    }
  } else {
    openSubmitConfirmationModal();
  }
});

// Confirmation Modal Listeners
$('cancelSubmitModalBtn')?.addEventListener('click', () => {
  isConfirmationModalOpen = false;
  $('submitConfirmModal')?.classList.add('hidden');
});

$('confirmSubmitModalBtn')?.addEventListener('pointerdown', () => {
  intentionalEndRequested = true;
});
$('confirmSubmitModalBtn')?.addEventListener('click', () => {
  intentionalEndRequested = true;
  handleRoundSubmit();
});

// Integrity Modal Event Handlers
$('integritySubmitExplanationBtn')?.addEventListener('click', async () => {
  $('integritySubmitExplanationBtn').disabled = true;
  $('integritySubmitExplanationBtn').textContent = 'Submitting & Verifying…';
  try {
    const res = await fetch(`/api/assessment/${id}/integrity-explanation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: activeWarningEventId,
        reasonCategory: $('integrityReasonCategory').value,
        explanationText: $('integrityExplanationText').value,
        deviceInfo: detectDeviceCategory(),
      }),
    });
    const data = await res.json();
    $('integrityModal')?.classList.add('hidden');
    isAssessmentPaused = false;
    appendTranscriptMsg('candidate', 'Integrity Verified', `[Explanation Accepted: ${data.explanationStatus || 'PLAUSIBLE'}]`);
  } catch (e) {
    alert('Could not submit explanation: ' + e.message);
  } finally {
    $('integritySubmitExplanationBtn').disabled = false;
    $('integritySubmitExplanationBtn').textContent = 'Submit Explanation & Resume';
  }
});

$('integrityExitBtn')?.addEventListener('click', () => {
  location.href = `/report.html?id=${id}`;
});

// Aptitude Section Switcher Events
$('aptTabMcq')?.addEventListener('click', () => switchAptitudeTab('mcq'));
$('aptTabTheory')?.addEventListener('click', () => switchAptitudeTab('theory'));
$('aptTabCoding')?.addEventListener('click', () => switchAptitudeTab('coding'));

init();
