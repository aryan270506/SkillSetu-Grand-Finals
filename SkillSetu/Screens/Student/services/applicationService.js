import { API_BASE } from '../../../ui/config';

/**
 * Fetch unified student application tracking data (internships + scholarships).
 */
export async function fetchStudentApplications(email = '') {
  try {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/student/applications${params}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return {
      stats: { total: 0, active: 0, under_review: 0, shortlisted: 0, accepted: 0, rejected: 0 },
      internships: [],
      scholarships: [],
    };
  } catch (err) {
    console.error('[applicationService] fetchStudentApplications error:', err);
    return {
      stats: { total: 0, active: 0, under_review: 0, shortlisted: 0, accepted: 0, rejected: 0 },
      internships: [],
      scholarships: [],
      error: err.message,
    };
  }
}

/**
 * Check if an application has an active AI assessment pipeline.
 */
export async function checkApplicationAssessment(applicationId, email = '') {
  try {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/student/applications/${applicationId}/assessment${params}`);
    if (!res.ok) return { has_assessment: false };
    return await res.json();
  } catch (err) {
    console.warn('[applicationService] checkApplicationAssessment error:', err);
    return { has_assessment: false };
  }
}

/**
 * Start/launch an AI assessment for an application.
 */
export async function startApplicationAssessment(applicationId, email = '') {
  const params = email ? `?email=${encodeURIComponent(email)}` : '';
  const res = await fetch(`${API_BASE}/student/applications/${applicationId}/assessment/start${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to start assessment');
  }
  return data;
}

/**
 * Fetch all assessment pipelines and round timelines across all student internship applications.
 * 100% PostgreSQL database driven.
 */
export async function fetchStudentAssessmentRounds(email = '') {
  try {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/student/assessment-rounds${params}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data || [];
    }
    return [];
  } catch (err) {
    console.error('[applicationService] fetchStudentAssessmentRounds error:', err);
    return [];
  }
}

/**
 * Start/launch an AI practice assessment / mock session.
 * 100% database-driven context. Zero uploads needed.
 */
export async function startPracticeAssessment({ applicationId, internshipId, targetRound, email } = {}) {
  const queryEmail = email ? `?email=${encodeURIComponent(email)}` : '';
  const res = await fetch(`${API_BASE}/student/assessment/practice/start${queryEmail}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      application_id: applicationId || null,
      internship_id: internshipId || null,
      target_round: targetRound || 'interview',
      email: email || '',
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to start practice session');
  }
  return data;
}

/**
 * Fetch aggregated rounds dashboard data (KPIs, applications, schedules, skill matrix, projects, question bank, history, trajectory).
 * 100% PostgreSQL database driven.
 */
export async function fetchStudentRoundsDashboard(email = '') {
  try {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/student/rounds/dashboard${params}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('[applicationService] fetchStudentRoundsDashboard error:', err);
    return null;
  }
}

/**
 * Fetch 100+ role-specific interview question bank from the server.
 * Supports mode: 'practice' (default, unattempted only), 'review' (completed only), 'all'
 */
export async function fetchRoleQuestionBank(email = '', role = '', mode = 'practice') {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (role) params.append('role', role);
    if (mode) params.append('mode', mode);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/student/assessment/role-question-bank${query}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return null;
  } catch (err) {
    console.error('[applicationService] fetchRoleQuestionBank error:', err);
    return null;
  }
}

/**
 * Submit a student's practice answer for real-time Groq LLM evaluation.
 * Returns structured evaluation (score, verdict, relevance, correctness, completeness,
 * technical_depth, communication, strengths, missing_points, feedback, star_tip).
 */
export async function evaluatePracticeAnswer(payload, email = '') {
  try {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/student/assessment/evaluate-practice-answer${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    throw new Error(data.detail || 'Evaluation unavailable. Please try again.');
  } catch (err) {
    console.error('[applicationService] evaluatePracticeAnswer error:', err);
    throw err;
  }
}



