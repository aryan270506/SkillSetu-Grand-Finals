import { API_BASE } from '../../../ui/config';

// In-memory session identifier generator & accessor
let currentSessionId = null;

export function getOrCreateSessionId(email = '') {
  if (!currentSessionId) {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 9);
    const prefix = email ? email.split('@')[0] : 'student';
    currentSessionId = `session_${prefix}_${timestamp}_${rand}`;
  }
  return currentSessionId;
}

export function resetSessionId() {
  currentSessionId = null;
}

/**
 * Fetch personalized, recommended internships with session-scoped caching and fast response.
 */
export async function fetchRecommendedInternships({
  email = '',
  page = 1,
  pageSize = 20,
  search = '',
  career = '',
  location = '',
  workMode = '',
  opportunityType = '',
  minStipend = '',
  minMatch = '',
  savedOnly = false,
  forceRefresh = false,
  sessionId = null,
} = {}) {
  try {
    const sid = sessionId || getOrCreateSessionId(email);
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (page) params.append('page', String(page));
    if (pageSize) params.append('page_size', String(pageSize));
    if (search) params.append('search', search);
    if (career) params.append('career', career);
    if (location) params.append('location', location);
    if (workMode && workMode !== 'all' && workMode !== 'All') params.append('work_mode', workMode);
    if (opportunityType && opportunityType !== 'all' && opportunityType !== 'All') params.append('opportunity_type', opportunityType);
    if (minStipend) params.append('minimum_stipend', String(minStipend));
    if (minMatch) params.append('min_match_score', String(minMatch));
    if (savedOnly) {
      params.append('saved', 'true');
      params.append('saved_only', 'true');
    }
    if (forceRefresh) params.append('force_refresh', 'true');
    if (sid) params.append('session_id', sid);

    const res = await fetch(`${API_BASE}/internships/recommended?${params.toString()}`, {
      headers: {
        'X-Session-ID': sid
      }
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return { status: 'error', message: data?.detail || 'Failed to fetch recommended internships', items: [], total: 0 };
  } catch (err) {
    console.error('[internshipService] fetchRecommendedInternships error:', err);
    return { status: 'error', message: err.message, items: [], total: 0 };
  }
}

/**
 * Fetch raw paginated internships.
 */
export async function fetchInternships({
  email = '',
  page = 1,
  pageSize = 20,
  search = '',
  location = '',
  workMode = '',
  isRemote = null,
  forceRefresh = false,
  sessionId = null,
} = {}) {
  try {
    const sid = sessionId || getOrCreateSessionId(email);
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (page) params.append('page', String(page));
    if (pageSize) params.append('page_size', String(pageSize));
    if (search) params.append('search', search);
    if (location) params.append('location', location);
    if (workMode) params.append('work_mode', workMode);
    if (isRemote !== null) params.append('is_remote', String(isRemote));
    if (forceRefresh) params.append('force_refresh', 'true');
    if (sid) params.append('session_id', sid);

    const res = await fetch(`${API_BASE}/internships?${params.toString()}`, {
      headers: {
        'X-Session-ID': sid
      }
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return { status: 'error', message: data?.detail || 'Failed to fetch internships', items: [], total: 0 };
  } catch (err) {
    console.error('[internshipService] fetchInternships error:', err);
    return { status: 'error', message: err.message, items: [], total: 0 };
  }
}

/**
 * Fetch detail of a single internship with match calculation.
 */
export async function fetchInternshipDetail(id, email = '', sessionId = null) {
  try {
    const sid = sessionId || getOrCreateSessionId(email);
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (sid) params.append('session_id', sid);

    const res = await fetch(`${API_BASE}/internships/${id}?${params.toString()}`, {
      headers: { 'X-Session-ID': sid }
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('[internshipService] fetchInternshipDetail error:', err);
    return null;
  }
}

/**
 * Save or unsave an internship.
 */
export async function toggleSaveInternship(id, email = '', save = true, sessionId = null) {
  try {
    const sid = sessionId || getOrCreateSessionId(email);
    const res = await fetch(`${API_BASE}/internships/${id}/save`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Session-ID': sid
      },
      body: JSON.stringify({ email, save }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return { status: 'error', message: data?.detail || 'Save action failed' };
  } catch (err) {
    console.error('[internshipService] toggleSaveInternship error:', err);
    return { status: 'error', message: err.message };
  }
}

/**
 * Track an internship application submission or external portal launch.
 * Strictly checks the 80% application gate on backend.
 */
export async function applyToInternship(id, email = '', notes = '', sessionId = null) {
  try {
    const sid = sessionId || getOrCreateSessionId(email);
    const res = await fetch(`${API_BASE}/internships/${id}/apply`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Session-ID': sid
      },
      body: JSON.stringify({ email, notes }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[internshipService] applyToInternship error:', err);
    return { status: 'error', allowed: false, message: err.message };
  }
}

/**
 * Fetch detailed internship progress matrix (Course, Test, Project, Readiness, Eligibility)
 */
export async function fetchInternshipProgress(id, email = '', sessionId = null) {
  try {
    const sid = sessionId || getOrCreateSessionId(email);
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (sid) params.append('session_id', sid);

    const res = await fetch(`${API_BASE}/internships/${id}/progress?${params.toString()}`, {
      headers: { 'X-Session-ID': sid }
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data || data;
    }
    return null;
  } catch (err) {
    console.error('[internshipService] fetchInternshipProgress error:', err);
    return null;
  }
}

/**
 * Complete a course directly from the opportunities tab.
 */
export async function completeCourseFromOpportunities(courseId, email = '', score = 100.0) {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    const res = await fetch(`${API_BASE}/courses/${courseId}/complete?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, score })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[internshipService] completeCourseFromOpportunities error:', err);
    return { status: 'error', message: err.message };
  }
}

/**
 * Upload and verify a course certificate cryptographically.
 */
export async function verifyCourseCertificate(courseId, email = '', certificateData = {}) {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    const res = await fetch(`${API_BASE}/courses/${courseId}/verify-certificate?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        certificate_data: certificateData.base64 || certificateData.uri || '',
        filename: certificateData.name || certificateData.filename || 'certificate.pdf',
        issuer: certificateData.issuer || ''
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[internshipService] verifyCourseCertificate error:', err);
    return { status: 'error', message: err.message };
  }
}

/**
 * Bookmark an internship explicitly.
 */
export async function bookmarkInternship(id, email = '', sessionId = null) {
  return toggleSaveInternship(id, email, true, sessionId);
}

/**
 * Remove bookmark from an internship.
 */
export async function unbookmarkInternship(id, email = '', sessionId = null) {
  return toggleSaveInternship(id, email, false, sessionId);
}

/**
 * Clear session opportunity cache upon logout.
 */
export async function clearOpportunitySessionCache(sessionId = null, email = '') {
  try {
    const sid = sessionId || currentSessionId;
    if (sid || email) {
      await fetch(`${API_BASE}/internships/cache/clear?session_id=${encodeURIComponent(sid || '')}&email=${encodeURIComponent(email || '')}`, {
        method: 'POST',
        headers: { 'X-Session-ID': sid || '' }
      });
      await fetch(`${API_BASE}/scholarships/cache/clear?session_id=${encodeURIComponent(sid || '')}&email=${encodeURIComponent(email || '')}`, {
        method: 'POST',
        headers: { 'X-Session-ID': sid || '' }
      });
      await fetch(`${API_BASE}/student/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, session_id: sid })
      });
    }
    resetSessionId();
  } catch (err) {
    console.warn('[internshipService] clearOpportunitySessionCache error:', err);
    resetSessionId();
  }
}

