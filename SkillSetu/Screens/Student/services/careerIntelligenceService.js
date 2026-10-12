const API_BASE = 'http://127.0.0.1:8000/api/v1';

/**
 * Fetch unified Career Intelligence data for a student.
 * Single source of truth for:
 * - Active target career & available target careers
 * - Career readiness percentage & verified count
 * - Required ESCO skills with canonical IDs, scores, statuses, and linked course recommendations
 * - Dynamic step progression targeting missing skills
 * - Practical skill assignments with code sandboxes
 * - Diagnostic tests & certified benchmarks
 * - Capstone projects
 * - Centralized learning progress
 */
export async function fetchCareerIntelligence(email, careerName = '') {
  try {
    const emailParam = encodeURIComponent(email || '');
    const careerParam = careerName ? `&career_name=${encodeURIComponent(careerName)}` : '';
    const res = await fetch(`${API_BASE}/student/career-intelligence?email=${emailParam}${careerParam}`);
    const data = await res.json();
    if (res.ok && data.status === 'success' && data.data) {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('[CareerIntelligenceService] fetch error:', err);
    return null;
  }
}

/**
 * Enroll a student in a course.
 */
export async function enrollInCourse(courseId, email = '') {
  try {
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/courses/${courseId}/enroll${emailParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email || undefined }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return null;
  } catch (err) {
    console.error('[CareerIntelligenceService] enroll error:', err);
    return null;
  }
}

/**
 * Update course progress on a learning path item.
 * Triggers automatic status transitions:
 * 0% -> not_started
 * 1-99% -> in_progress
 * 100% -> completed
 * And automatically records Phase 9 Skill Evidence.
 */
export async function updateCourseProgress(pathId, itemId, progressPercent, email = '') {
  try {
    const res = await fetch(`${API_BASE}/learning-paths/${pathId}/items/${itemId}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        progress_percent: progressPercent,
        email: email || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('[CareerIntelligenceService] update progress error:', err);
    return null;
  }
}

/**
 * Generate a new personalized learning path for student's target careers.
 */
export async function generateLearningPath(email, targetCareers = []) {
  try {
    const res = await fetch(`${API_BASE}/learning-paths`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email || undefined,
        target_careers: targetCareers && targetCareers.length > 0 ? targetCareers : undefined,
      }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('[CareerIntelligenceService] generate path error:', err);
    return null;
  }
}

/**
 * Refresh an existing learning path against latest student evidence and skill gaps.
 */
export async function refreshLearningPath(pathId, email = '') {
  try {
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/learning-paths/${pathId}/refresh${emailParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('[CareerIntelligenceService] refresh path error:', err);
    return null;
  }
}

/**
 * Fetch list of practical assignments with optional filtering.
 */
export async function fetchAssignments(email = '', careerName = '', skill = '', difficulty = '', status = '') {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (careerName) params.append('career_name', careerName);
    if (skill) params.append('skill', skill);
    if (difficulty) params.append('difficulty', difficulty);
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE}/student/assignments?${params.toString()}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return { count: 0, total_count: 0, data: [] };
  } catch (err) {
    console.error('[CareerIntelligenceService] fetch assignments error:', err);
    return { count: 0, total_count: 0, data: [] };
  }
}

/**
 * Submit code solution for an assignment.
 */
export async function submitAssignment(assignmentId, email, code = '', answers = null) {
  try {
    const res = await fetch(`${API_BASE}/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code,
        answers,
      }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return data;
  } catch (err) {
    console.error('[CareerIntelligenceService] submit assignment error:', err);
    return { status: 'error', message: err.message || 'Failed to submit assignment.' };
  }
}

/**
 * Fetch all assessments with prerequisite and benchmark data.
 */
export async function fetchAssessments(email = '', careerName = '') {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (careerName) params.append('career_name', careerName);

    const res = await fetch(`${API_BASE}/student/assessments?${params.toString()}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return { count: 0, data: [], benchmark: 'No benchmark yet' };
  } catch (err) {
    console.error('[CareerIntelligenceService] fetch assessments error:', err);
    return { count: 0, data: [], benchmark: 'No benchmark yet' };
  }
}

/**
 * Fetch full assessment questions and options by assessment ID.
 */
export async function fetchAssessmentDetail(assessmentId) {
  try {
    const res = await fetch(`${API_BASE}/student/assessments/${assessmentId}`);
    const data = await res.json();
    if (res.ok && data.status === 'success' && data.data) {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('[CareerIntelligenceService] fetch assessment detail error:', err);
    return null;
  }
}

/**
 * Submit assessment answers for evaluation.
 */
export async function submitAssessment(assessmentId, email, answers) {
  try {
    const res = await fetch(`${API_BASE}/student/assessments/${assessmentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        assessment_id: assessmentId,
        answers,
      }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return data;
  } catch (err) {
    console.error('[CareerIntelligenceService] submit assessment error:', err);
    return { status: 'error', message: err.message || 'Failed to submit assessment.' };
  }
}

/**
 * Fetch capstone projects list.
 */
export async function fetchProjects(email = '', careerName = '') {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (careerName) params.append('career_name', careerName);

    const res = await fetch(`${API_BASE}/student/projects?${params.toString()}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return [];
  } catch (err) {
    console.error('[CareerIntelligenceService] fetch projects error:', err);
    return [];
  }
}

/**
 * Start a capstone project track.
 */
export async function startProjectTrack(projectId, email) {
  try {
    const res = await fetch(`${API_BASE}/student/projects/${projectId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return data;
  } catch (err) {
    console.error('[CareerIntelligenceService] start project error:', err);
    return { status: 'error', message: err.message || 'Failed to start project.' };
  }
}

/**
 * Fetch connected GitHub repositories available for a specific project.
 */
export async function fetchAvailableProjectRepos(projectId, email) {
  try {
    const emailParam = encodeURIComponent(email || '');
    const res = await fetch(`${API_BASE}/student/projects/${projectId}/available-repos?email=${emailParam}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return { connected: false, repositories: [] };
  } catch (err) {
    console.error('[CareerIntelligenceService] fetch available repos error:', err);
    return { connected: false, repositories: [] };
  }
}

/**
 * Submit capstone project deliverables from connected GitHub repository.
 */
export async function submitProjectTrack(projectId, email, repoData, notes = '') {
  try {
    const payload = {
      email,
      notes,
    };
    if (typeof repoData === 'string') {
      payload.repository_url = repoData;
    } else if (typeof repoData === 'object' && repoData !== null) {
      payload.repository_url = repoData.html_url || repoData.url || '';
      payload.repository_id = repoData.id || '';
      payload.repository_name = repoData.name || '';
    }

    const res = await fetch(`${API_BASE}/student/projects/${projectId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return data;
  } catch (err) {
    console.error('[CareerIntelligenceService] submit project error:', err);
    return { status: 'error', message: err.message || 'Failed to submit project.' };
  }
}
