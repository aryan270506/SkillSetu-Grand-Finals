import { API_BASE } from '../../../ui/config';

const getHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const recruiterService = {
  // 1. Profile Retrieval & State
  async getProfile(token) {
    const res = await fetch(`${API_BASE}/recruiter/profile`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch recruiter profile');
    }
    return await res.json();
  },

  // 2. Company Details & Identity
  async updateCompanyIdentity(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/profile/company`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update company details');
    }
    return await res.json();
  },

  // 3. About Company, Mission, Vision
  async updateCompanyAbout(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/profile/about`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update about company');
    }
    return await res.json();
  },

  // 4. Culture & Benefits
  async updateCompanyCulture(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/profile/culture`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update culture and benefits');
    }
    return await res.json();
  },

  // 5. Internship Preferences
  async updateCompanyPreferences(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/profile/preferences`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update internship preferences');
    }
    return await res.json();
  },

  // 6. Hiring Process Stages
  async updateHiringProcess(token, stages) {
    const res = await fetch(`${API_BASE}/recruiter/profile/hiring-process`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ stages }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update hiring process');
    }
    return await res.json();
  },

  // 7. Company Locations
  async updateCompanyLocations(token, locations) {
    const res = await fetch(`${API_BASE}/recruiter/profile/locations`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ locations }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update company locations');
    }
    return await res.json();
  },

  async addCompanyLocation(token, location) {
    const res = await fetch(`${API_BASE}/recruiter/profile/locations`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(location),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to add location');
    }
    return await res.json();
  },

  async deleteCompanyLocation(token, locationId) {
    const res = await fetch(`${API_BASE}/recruiter/profile/locations/${locationId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete location');
    }
    return await res.json();
  },

  // 8. Social Links
  async updateSocialLinks(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/profile/social-links`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update social links');
    }
    return await res.json();
  },

  // 9. Hiring Team
  async addTeamMember(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/profile/team`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to add team member');
    }
    return await res.json();
  },

  async removeTeamMember(token, memberId) {
    const res = await fetch(`${API_BASE}/recruiter/profile/team/${memberId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to remove team member');
    }
    return await res.json();
  },

  // 10. Trust & Safety Verification
  async updateVerification(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/profile/verify`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update verification status');
    }
    return await res.json();
  },

  // 11. Dashboard
  async getDashboard(token) {
    const res = await fetch(`${API_BASE}/recruiter/dashboard`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch recruiter dashboard');
    }
    return await res.json();
  },

  // 12. Internships
  async getInternships(token) {
    const res = await fetch(`${API_BASE}/recruiter/internships`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch company internships');
    }
    return await res.json();
  },

  async createInternship(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/internships`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to publish internship');
    }
    return await res.json();
  },

  async getInternshipDetail(token, internshipId) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch internship details');
    }
    return await res.json();
  },

  async getCandidateEvaluation(token, internshipId, applicationId) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/applications/${applicationId}/evaluation`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch candidate evaluation details');
    }
    return await res.json();
  },

  async updateApplicationStatus(token, applicationId, status) {
    const res = await fetch(`${API_BASE}/recruiter/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status_update: status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update application status');
    }
    return await res.json();
  },

  async updateInternship(token, internshipId, payload) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update internship');
    }
    return await res.json();
  },

  async deleteInternship(token, internshipId) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}`, {
      method: 'DELETE',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete/archive internship');
    }
    return await res.json();
  },

  async archiveInternship(token, internshipId) {
    return this.updateInternship(token, internshipId, { status: 'Archived' });
  },

  // 13. Student Discovery
  async discoverStudents(token, queryParams = {}) {
    const params = new URLSearchParams(queryParams).toString();
    const url = `${API_BASE}/recruiter/students/discover${params ? '?' + params : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to discover students');
    }
    return await res.json();
  },

  // 14. Applications
  async getApplications(token, params = {}) {
    const query = new URLSearchParams();
    if (params.internship_id) query.append('internship_id', params.internship_id);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.screening_status && params.screening_status !== 'All') query.append('screening_status', params.screening_status);
    if (params.min_match_score) query.append('min_match_score', params.min_match_score);
    if (params.degree && params.degree !== 'All') query.append('degree', params.degree);
    if (params.branch && params.branch !== 'All') query.append('branch', params.branch);
    if (params.date_range && params.date_range !== 'all') query.append('date_range', params.date_range);
    if (params.search) query.append('search', params.search);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/recruiter/applications${queryString}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch applications');
    }
    return await res.json();
  },

  async getApplicationsSummary(token) {
    const res = await fetch(`${API_BASE}/recruiter/applications/summary`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch applications summary');
    }
    return await res.json();
  },

  async getApplicationDetail(token, applicationId) {
    const res = await fetch(`${API_BASE}/recruiter/applications/${applicationId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch candidate application detail');
    }
    return await res.json();
  },

  async updateApplicationNotes(token, applicationId, notes) {
    const res = await fetch(`${API_BASE}/recruiter/applications/${applicationId}/notes`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update application notes');
    }
    return await res.json();
  },

  async bulkApplicationAction(token, applicationIds, action, notes = '') {
    const res = await fetch(`${API_BASE}/recruiter/applications/bulk-action`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ application_ids: applicationIds, action, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to perform bulk application action');
    }
    return await res.json();
  },


  // 15. Interviews
  async getInterviews(token) {
    const res = await fetch(`${API_BASE}/recruiter/interviews`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch interviews');
    }
    return await res.json();
  },

  async scheduleInterview(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/interviews`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to schedule interview');
    }
    return await res.json();
  },

  // 16. Analytics
  async getAnalytics(token) {
    const res = await fetch(`${API_BASE}/recruiter/analytics`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch recruiter analytics');
    }
    return await res.json();
  },

  // 17. Assessment Management & Reports
  async getAssessmentConfig(token, internshipId) {
    const res = await fetch(`${API_BASE}/recruiter/assessments/config?internship_id=${internshipId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch assessment configuration');
    }
    return await res.json();
  },

  async saveAssessmentConfig(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/assessments/config`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save assessment configuration');
    }
    return await res.json();
  },

  async generateAssessmentSchedule(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/assessments/generate-schedule`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate assessment schedule');
    }
    return await res.json();
  },

  async getAssessmentReports(token, params = {}) {
    const query = new URLSearchParams();
    if (params.internship_id) query.append('internship_id', params.internship_id);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.round && params.round !== 'All') query.append('round', params.round);
    if (params.date_range && params.date_range !== 'all') query.append('date_range', params.date_range);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/recruiter/assessments/reports${queryString}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch assessment reports');
    }
    return await res.json();
  },

  async getAssessmentCandidates(token, params = {}) {
    const query = new URLSearchParams();
    if (params.internship_id) query.append('internship_id', params.internship_id);
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.integrity_status && params.integrity_status !== 'All') query.append('integrity_status', params.integrity_status);
    if (params.round && params.round !== 'All') query.append('round', params.round);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/recruiter/assessments/candidates${queryString}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch candidate assessments');
    }
    return await res.json();
  },

  async getCandidateAssessmentDossier(token, sessionId) {
    const res = await fetch(`${API_BASE}/recruiter/assessments/candidates/${sessionId}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch candidate assessment dossier');
    }
    return await res.json();
  },

  // 18. Candidate Round Progression
  async progressCandidateRound(token, internshipId, applicationId, payload = {}) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/applications/${applicationId}/progress-round`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to progress candidate round');
    }
    return await res.json();
  },

  async bulkProgressRound(token, internshipId, payload = {}) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/applications/bulk-progress-round`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to bulk progress candidate rounds');
    }
    return await res.json();
  },

  // 19. Aggregated Assessments Dashboard & Scorecard Evaluation
  async getAssessmentsDashboard(token, { internshipId, statusFilter, roundFilter, search } = {}) {
    const params = new URLSearchParams();
    if (internshipId) params.append('internship_id', internshipId);
    if (statusFilter && statusFilter !== 'All') params.append('status_filter', statusFilter);
    if (roundFilter && roundFilter !== 'All') params.append('round_filter', roundFilter);
    if (search) params.append('search', search);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/recruiter/assessments/dashboard${qs}`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch assessments dashboard');
    }
    return await res.json();
  },

  async submitAssessmentEvaluation(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/assessments/evaluate`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save candidate evaluation');
    }
    return await res.json();
  },

  async advanceAssessmentRound(token, payload) {
    const res = await fetch(`${API_BASE}/recruiter/assessments/advance-round`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to advance candidate');
    }
    return await res.json();
  },

  async getAssessmentObserverToken(token, sessionId) {
    const res = await fetch(`${API_BASE}/recruiter/assessments/sessions/${sessionId}/observer-token`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to initialize live observer session');
    }
    return await res.json();
  },

  async getAssessmentLiveTelemetry(token, sessionId) {
    const res = await fetch(`${API_BASE}/recruiter/assessments/sessions/${sessionId}/live-telemetry`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch live telemetry');
    }
    return await res.json();
  },

  // Recruitment Automation & Pipeline Versioning
  async suggestPipelineDraft(token, payload = {}) {
    const res = await fetch(`${API_BASE}/recruiter/internships/pipeline/suggest-draft`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to suggest pipeline draft');
    }
    return await res.json();
  },

  async generatePipelineDraft(token, internshipId, payload = {}) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/pipeline/generate-draft`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate pipeline draft');
    }
    return await res.json();
  },

  async getPipelineVersions(token, internshipId) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/pipeline/versions`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch pipeline versions');
    }
    return await res.json();
  },

  async publishPipelineVersion(token, internshipId, payload) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/pipeline/publish`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to publish pipeline version');
    }
    return await res.json();
  },

  async configureAutomation(token, internshipId, payload) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/automation/configure`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to configure automation');
    }
    return await res.json();
  },

  async submitDecisionOverride(token, internshipId, applicationId, payload) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/applications/${applicationId}/override`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit decision override');
    }
    return await res.json();
  },

  async revokeDecisionOverride(token, internshipId, applicationId, payload) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/applications/${applicationId}/override/revoke`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to revoke decision override');
    }
    return await res.json();
  },

  async getDeadLetterJobs(token) {
    const res = await fetch(`${API_BASE}/recruiter/jobs/dead-letter`, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch dead-letter jobs');
    }
    return await res.json();
  },

  async retryJob(token, jobId) {
    const res = await fetch(`${API_BASE}/recruiter/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to retry job');
    }
    return await res.json();
  },

  async executeFinalSelection(token, internshipId) {
    const res = await fetch(`${API_BASE}/recruiter/internships/${internshipId}/final-selection`, {
      method: 'POST',
      headers: getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to execute final selection sweep');
    }
    return await res.json();
  },
};

export default recruiterService;

