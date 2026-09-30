const API_BASE = 'http://127.0.0.1:8000/api/v1';

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
