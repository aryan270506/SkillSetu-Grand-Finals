const API_BASE = 'http://127.0.0.1:8000/api/v1';

/**
 * Fetch deterministic, rule-evaluated scholarships with eligibility and missing profile info.
 */
export async function fetchEligibleScholarships({
  email = '',
  page = 1,
  pageSize = 20,
  search = '',
  academicYear = '',
  state = '',
  category = '',
  course = '',
  branch = '',
  minAward = '',
  deadlineBefore = '',
  onlyEligible = false,
} = {}) {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (page) params.append('page', String(page));
    if (pageSize) params.append('page_size', String(pageSize));
    if (search) params.append('search', search);
    if (academicYear) params.append('academic_year', academicYear);
    if (state && state !== 'all' && state !== 'All') params.append('state', state);
    if (category && category !== 'all' && category !== 'All') params.append('category', category);
    if (course && course !== 'all' && course !== 'All') params.append('course', course);
    if (branch && branch !== 'all' && branch !== 'All') params.append('branch', branch);
    if (minAward) params.append('min_award', String(minAward));
    if (deadlineBefore) params.append('deadline_before', deadlineBefore);
    if (onlyEligible) params.append('only_eligible', 'true');

    const res = await fetch(`${API_BASE}/scholarships/eligible?${params.toString()}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return { status: 'error', message: data?.detail || 'Failed to fetch scholarships', items: [], total: 0 };
  } catch (err) {
    console.error('[scholarshipService] fetchEligibleScholarships error:', err);
    return { status: 'error', message: err.message, items: [], total: 0 };
  }
}

/**
 * Fetch raw paginated scholarships.
 */
export async function fetchScholarships({
  email = '',
  page = 1,
  pageSize = 20,
  search = '',
  source = '',
  academicYear = '',
} = {}) {
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email);
    if (page) params.append('page', String(page));
    if (pageSize) params.append('page_size', String(pageSize));
    if (search) params.append('search', search);
    if (source) params.append('source', source);
    if (academicYear) params.append('academic_year', academicYear);

    const res = await fetch(`${API_BASE}/scholarships?${params.toString()}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data;
    }
    return { status: 'error', message: data?.detail || 'Failed to fetch scholarships', items: [], total: 0 };
  } catch (err) {
    console.error('[scholarshipService] fetchScholarships error:', err);
    return { status: 'error', message: err.message, items: [], total: 0 };
  }
}

/**
 * Fetch detail of a single scholarship with evaluated rules.
 */
export async function fetchScholarshipDetail(id, email = '') {
  try {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/scholarships/${id}${params}`);
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return null;
  } catch (err) {
    console.error('[scholarshipService] fetchScholarshipDetail error:', err);
    return null;
  }
}

/**
 * Simulate academic eligibility dynamically via backend deterministic rule engine.
 */
export async function simulateScholarshipEligibility(payload) {
  try {
    const res = await fetch(`${API_BASE}/scholarships/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.status === 'success') {
      return data.data;
    }
    return { error: data?.detail || 'Simulation failed' };
  } catch (err) {
    console.error('[scholarshipService] simulateScholarshipEligibility error:', err);
    return { error: err.message };
  }
}

/**
 * Save or unsave a scholarship.
 */
export async function toggleSaveScholarship(id, email = '', save = true) {
  try {
    const res = await fetch(`${API_BASE}/scholarships/${id}/save`, {
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
    console.error('[scholarshipService] toggleSaveScholarship error:', err);
    return { status: 'error', message: err.message };
  }
}

/**
 * Track a scholarship application submission or external portal launch.
 */
export async function applyToScholarship(id, email = '', notes = '') {
  try {
    const res = await fetch(`${API_BASE}/scholarships/${id}/apply`, {
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
    console.error('[scholarshipService] applyToScholarship error:', err);
    return { status: 'error', message: err.message };
  }
}
