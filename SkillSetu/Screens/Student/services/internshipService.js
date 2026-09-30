const API_BASE = 'http://127.0.0.1:8000/api/v1';

/**
 * Fetch personalized, recommended internships with match scores and explainability.
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
} = {}) {
  try {
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

    const res = await fetch(`${API_BASE}/internships/recommended?${params.toString()}`);
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
} = {}) {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (page) params.append('page', String(page));
    if (pageSize) params.append('page_size', String(pageSize));
    if (search) params.append('search', search);
    if (location) params.append('location', location);
    if (workMode) params.append('work_mode', workMode);
    if (isRemote !== null) params.append('is_remote', String(isRemote));

    const res = await fetch(`${API_BASE}/internships?${params.toString()}`);
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
export async function fetchInternshipDetail(id, email = '') {
  try {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/internships/${id}${params}`);
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
export async function toggleSaveInternship(id, email = '', save = true) {
  try {
    const res = await fetch(`${API_BASE}/internships/${id}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
 */
export async function applyToInternship(id, email = '', notes = '') {
  try {
    const res = await fetch(`${API_BASE}/internships/${id}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, notes }),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return { status: 'error', message: data?.detail || 'Apply action failed' };
  } catch (err) {
    console.error('[internshipService] applyToInternship error:', err);
    return { status: 'error', message: err.message };
  }
}
