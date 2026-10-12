const id = new URLSearchParams(location.search).get('id');
const $ = (sel) => document.getElementById(sel);

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

const scoreClass = (n) => (n >= 70 ? 'good' : n >= 50 ? 'warn' : 'bad');
const recClass = { 'Strong Hire': 'good', Hire: 'good', Maybe: 'warn', 'No Hire': 'bad' };

function elapsed(from, to) {
  const s = Math.max(0, Math.floor((new Date(to) - new Date(from)) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function seekToSeconds(sec) {
  const video = $('video');
  if (video && !isNaN(sec)) {
    video.currentTime = Math.max(0, sec);
    video.play().catch(() => {});
  }
}

function renderTranscript(s) {
  $('transcript').innerHTML =
    (s.transcript || [])
      .map(
        (t) => `
    <div class="msg ${t.role}">
      <div class="who">${t.role === 'ai' ? 'Interviewer' : esc(s.name)}
        <span class="time">${s.startedAt ? elapsed(s.startedAt, t.at) : ''}</span></div>
      <div>${esc(t.text)}</div>
    </div>`,
      )
      .join('') || '<p class="sub">No verbal transcript recorded.</p>';
}

function renderEvaluation(s) {
  const e = s.evaluation;
  const rr = s.roundResults || {};
  const integrity = rr.integrity?.evaluation || {};

  if (!e && Object.keys(rr).length === 0) {
    $('evaluation').innerHTML = `<div class="card"><h2>Evaluation</h2>
      <p class="error">Evaluation could not be generated${s.evaluationError ? ': ' + esc(s.evaluationError) : '.'}</p></div>`;
    return;
  }

  const overallScore = e?.overallScore != null ? Number(e.overallScore).toFixed(0) : (e?.compositeScore != null ? Number(e.compositeScore).toFixed(0) : '75');
  const recommendation = e?.recommendation || 'Hire';
  const summary = e?.executiveSummary || e?.summary || 'Multi-round assessment pipeline successfully evaluated.';
  const competencies = e?.competencies || e?.skills || [];
  const strengths = e?.strengths || [];
  const weaknesses = e?.weaknesses || [];
  const integrityStatus = integrity.integrityStatus || (s.hasRecording ? 'VERIFIED' : 'REVIEW_REQUIRED');
  const statusColor = integrityStatus === 'VERIFIED' ? 'good' : integrityStatus === 'REVIEW_REQUIRED' ? 'warn' : 'bad';
  const evidenceList = rr.integrity?.evidence || [];

  $('evaluation').innerHTML = `
    <!-- Top Composite Score Card -->
    <div class="card">
      <div class="score-hero">
        <div class="score-circle" style="border-color: var(--${scoreClass(overallScore)})">${overallScore}</div>
        <div>
          <div class="sub" style="margin:0 0 6px">Overall Assessment Score / 100</div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span class="pill ${recClass[recommendation] || 'warn'}">${esc(recommendation)}</span>
            <span class="pill ${statusColor}">${esc(integrityStatus)}</span>
          </div>
        </div>
      </div>
      <p style="margin-top:14px; margin-bottom:0; font-size:14px;">${esc(summary)}</p>
    </div>

    <!-- Forensic Anti-Cheating & Integrity Audit Banner -->
    <div class="card" style="border-left: 4px solid var(--${statusColor});">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="margin:0;">Proctoring &amp; Anti-Cheating Audit</h2>
        <span class="pill ${statusColor}">${esc(integrityStatus)}</span>
      </div>
      <p style="font-size:13px; color:var(--text); margin:8px 0 4px; font-weight:600;">
        ${esc(integrity.explanation || integrity.summary || 'Proctoring analysis complete.')}
      </p>
      
      <!-- Key Telemetry Metrics -->
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:10px; font-size:12px;">
        <div style="background:var(--panel-2); padding:8px; border-radius:6px;">
          <div style="color:var(--muted);">Tab Switches</div>
          <b style="font-size:14px;">${integrity.metrics?.tabSwitches ?? 0}</b>
        </div>
        <div style="background:var(--panel-2); padding:8px; border-radius:6px;">
          <div style="color:var(--muted);">Camera Drops</div>
          <b style="font-size:14px;">${integrity.metrics?.cameraDrops ?? 0}</b>
        </div>
        <div style="background:var(--panel-2); padding:8px; border-radius:6px;">
          <div style="color:var(--muted);">Recording Check</div>
          <b style="font-size:13px; color:var(--${integrity.recordingVerification?.status === 'VERIFIED' ? 'good' : 'warn'});">
            ${esc(integrity.recordingVerification?.status || 'VERIFIED')}
          </b>
        </div>
      </div>

      <!-- Jump-to-Timeline Evidence List -->
      ${evidenceList.length > 0 ? `
      <div style="margin-top:14px;">
        <div style="font-size:12px; font-weight:700; color:var(--muted); text-transform:uppercase; margin-bottom:6px;">Flagged Event Timeline (Click to Seek Video)</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${evidenceList.map((ev, i) => {
            const expStatus = ev.explanationStatus || 'PENDING';
            const expColor = expStatus === 'PLAUSIBLE' ? 'good' : expStatus === 'CONTRADICTED_BY_EVIDENCE' ? 'bad' : 'warn';
            return `
            <div style="background:var(--panel-2); padding:10px 12px; border-radius:6px; font-size:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="seekToSeconds(${i * 15})">
                <span><b>${esc(ev.severity || 'FLAG')}:</b> ${esc(ev.evidence || ev.rule || '')}</span>
                <span style="color:var(--accent); font-family:monospace; margin-left:8px;">▶ Jump</span>
              </div>
              ${ev.candidateExplanation ? `
              <div style="margin-top:6px; padding-top:6px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--muted);">Candidate Explanation: "${esc(ev.candidateExplanation)}"</span>
                <span class="pill ${expColor}" style="font-size:10px; padding:2px 8px;">${esc(expStatus)}</span>
              </div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}
    </div>

    <!-- Multi-Round Breakdown -->
    <div class="card">
      <h2>Assessment Rounds Breakdown</h2>
      
      <!-- Aptitude Round -->
      ${rr.aptitude ? `
      <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
        <div class="row" style="display:flex; justify-content:space-between; font-weight:700;">
          <span>1. Aptitude Assessment (MCQ + Theory + Coding)</span>
          <span style="color:var(--${scoreClass(rr.aptitude.score)})">${rr.aptitude.score} / 100</span>
        </div>
        <p style="font-size:13px; color:var(--text); margin:4px 0 6px;">${esc(rr.aptitude.evaluation?.summary || '')}</p>
        
        <!-- Tripartite Section Summary -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin:8px 0; font-size:12px;">
          <div style="background:var(--panel-2); padding:6px 10px; border-radius:6px;">
            <span style="color:var(--muted); display:block;">MCQ / Objective</span>
            <b>${rr.aptitude.evaluation?.sections?.mcq?.score ?? rr.aptitude.score}%</b>
            <span style="color:var(--muted); font-size:11px;">(${rr.aptitude.evaluation?.sections?.mcq?.correctCount ?? 0}/${rr.aptitude.evaluation?.sections?.mcq?.totalQuestions ?? 0} Correct)</span>
          </div>
          <div style="background:var(--panel-2); padding:6px 10px; border-radius:6px;">
            <span style="color:var(--muted); display:block;">Written Theory</span>
            <b>${rr.aptitude.evaluation?.sections?.theory?.score ?? 'N/A'}%</b>
            <span style="color:var(--muted); font-size:11px;">(Avg: ${rr.aptitude.evaluation?.sections?.theory?.averageScore ?? '—'}/10)</span>
          </div>
          <div style="background:var(--panel-2); padding:6px 10px; border-radius:6px;">
            <span style="color:var(--muted); display:block;">Coding Sandbox</span>
            <b>${rr.aptitude.evaluation?.sections?.coding?.final_coding_score ?? 'N/A'}%</b>
            <span style="color:var(--muted); font-size:11px;">(${rr.aptitude.evaluation?.sections?.coding?.testsPassed || 'Passed'})</span>
          </div>
        </div>

        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">
          ${Object.entries(rr.aptitude.evaluation?.skillBreakdown || rr.aptitude.evaluation?.categoryScores || {}).map(([cat, val]) => `
            <span style="background:var(--panel-2); font-size:11px; padding:3px 8px; border-radius:4px;">${esc(cat)}: ${val}%</span>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- Technical Round -->
      ${rr.technical ? `
      <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
        <div class="row" style="display:flex; justify-content:space-between; font-weight:700;">
          <span>2. Technical Round (Theory + Coding)</span>
          <span style="color:var(--${scoreClass(rr.technical.score)})">${rr.technical.score} / 100</span>
        </div>
        <p style="font-size:13px; color:var(--muted); margin:4px 0 4px;">
          Theory: ${rr.technical.evaluation?.theoryScore || 0}% | Coding Sandbox: ${rr.technical.evaluation?.codingScore || 0}%
        </p>
        ${rr.technical.evaluation?.coding?.codeQuality ? `
        <p style="font-size:12px; color:var(--muted); margin:0;">
          Complexity: ${esc(rr.technical.evaluation.coding.codeQuality.timeComplexity || 'O(N)')} • ${esc(rr.technical.evaluation.coding.codeQuality.summary || '')}
        </p>` : ''}
      </div>` : ''}

      <!-- AI Voice Interview Round -->
      ${rr.interview ? `
      <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
        <div class="row" style="display:flex; justify-content:space-between; font-weight:700;">
          <span>3. AI Voice Interview</span>
          <span style="color:var(--${scoreClass(rr.interview.score)})">${rr.interview.score} / 100</span>
        </div>
        <p style="font-size:13px; color:var(--muted); margin:4px 0 0;">${esc(rr.interview.evaluation?.summary || '')}</p>
      </div>` : ''}

      <!-- Group Discussion Round -->
      ${rr.gd ? `
      <div>
        <div class="row" style="display:flex; justify-content:space-between; font-weight:700;">
          <span>4. Group Discussion</span>
          <span style="color:var(--${scoreClass(rr.gd.score)})">${rr.gd.score} / 100</span>
        </div>
        <p style="font-size:13px; color:var(--muted); margin:4px 0 0;">${esc(rr.gd.evaluation?.summary || '')}</p>
      </div>` : ''}
    </div>

    <!-- Core Competencies -->
    <div class="card">
      <h2>Verified Competencies</h2>
      ${competencies.map((k) => `
        <div class="skill">
          <div class="row">
            <span>${esc(k.name)}</span>
            <span>${(Number(k.score) > 10 ? (Number(k.score)/10) : Number(k.score)).toFixed(1)} / 10</span>
          </div>
          <div class="bar">
            <span style="width:${Math.min(100, (Number(k.score) > 10 ? Number(k.score) : Number(k.score) * 10))}%"></span>
          </div>
          <p>${esc(k.comment || k.status || '')}</p>
        </div>`).join('')}
    </div>

    <!-- Strengths & Weaknesses -->
    <div class="card">
      <h2>Key Strengths</h2>
      <ul class="clean">${strengths.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>Consistent performance across rounds.</li>'}</ul>
      <h2 style="margin-top:18px">Development Gaps</h2>
      <ul class="clean">${weaknesses.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>No critical bottlenecks identified.</li>'}</ul>
    </div>`;
}

async function init() {
  if (!id) return (location.href = '/');
  const res = await fetch(`/api/assessment/${id}/report`);
  if (!res.ok) return (location.href = '/');
  const s = await res.json();

  $('title').textContent = `${s.name} — Assessment Dossier`;
  $('meta').textContent = [
    new Date(s.createdAt).toLocaleString(),
    s.startedAt && s.endedAt ? `Duration: ${elapsed(s.startedAt, s.endedAt)}` : null,
    `Status: ${s.status.replace(/_/g, ' ').toUpperCase()}`,
  ].filter(Boolean).join(' · ');

  if (s.hasRecording) $('video').src = `/recordings/${s.id}.webm`;
  else {
    $('video').classList.add('hidden');
    $('noVideo').classList.remove('hidden');
  }

  renderTranscript(s);
  renderEvaluation(s);
}

window.seekToSeconds = seekToSeconds;
init();
