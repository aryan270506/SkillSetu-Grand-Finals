import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { recruiterService } from '../services/recruiterService';
import CandidateEvaluationModal from '../Internship/CandidateEvaluationModal';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Chip,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Inset,
  Page,
  Pill,
  ProgressBar,
  Ring,
  Row,
  SearchField,
  SectionTitle,
  Sheet,
  Skeleton,
  Stack,
  StatTile,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';
import { API_BASE, API_ORIGIN } from '../../../ui/config';

import { tl } from '../../../i18n/tl';

export default function Applications({ user }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;
  const token = user?.token || user?.access_token || '';

  // 1. Core State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    total: 0,
    new: 0,
    under_review: 0,
    shortlisted: 0,
    selected: 0,
    interview: 0,
    active_internships_count: 0,
    funnel: {
      applied: 0,
      applied_pct: 100,
      eligible: 0,
      eligible_pct: 0,
      under_review: 0,
      under_review_pct: 0,
      shortlisted: 0,
      shortlisted_pct: 0,
      interview: 0,
      interview_pct: 0,
      selected: 0,
      selected_pct: 0,
    },
  });

  const [applications, setApplications] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    internships: [],
    statuses: [],
    degrees: [],
    branches: [],
  });

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 1,
  });

  // 2. Filters & Search State
  const [selectedInternship, setSelectedInternship] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedScreening, setSelectedScreening] = useState('');
  const [selectedMinScore, setSelectedMinScore] = useState('');
  const [selectedDegree, setSelectedDegree] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('match_score_desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown open toggles
  const [openDropdown, setOpenDropdown] = useState(null);

  // 3. Selection & Inspection Drawer State
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const [candidateDetail, setCandidateDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [noteSavedMsg, setNoteSavedMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Candidate Evaluation Modal State
  const [evalModalVisible, setEvalModalVisible] = useState(false);
  const [evalModalAppId, setEvalModalAppId] = useState(null);
  const [evalModalInternshipId, setEvalModalInternshipId] = useState(null);

  // Bulk Progression State
  const [showBulkProgressionConfirm, setShowBulkProgressionConfirm] = useState(false);
  const [bulkProgressionAction, setBulkProgressionAction] = useState('SELECT_FOR_NEXT_ROUND');
  const [topNMenuOpen, setTopNMenuOpen] = useState(false);

  // 4. Fetch Summary
  const loadSummary = useCallback(async () => {
    if (!token) return;
    try {
      const data = await recruiterService.getApplicationsSummary(token);
      if (data) {
        setSummary(data);
      }
    } catch (err) {
      console.warn('Error loading applications summary:', err);
    }
  }, [token]);

  // 5. Fetch Applications List
  const loadApplications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        internship_id: selectedInternship || undefined,
        status: selectedStatus || undefined,
        screening_status: selectedScreening || undefined,
        min_match_score: selectedMinScore ? Number(selectedMinScore) : undefined,
        degree: selectedDegree || undefined,
        date_range: selectedDateRange || undefined,
        search: searchQuery.trim() || undefined,
        sort_by: sortBy,
        page: currentPage,
        page_size: 20,
      };

      const res = await recruiterService.getApplications(token, params);
      setApplications(res.items || []);
      setPagination({
        total: res.total || 0,
        page: res.page || 1,
        page_size: res.page_size || 20,
        total_pages: res.total_pages || 1,
      });

      if (res.filter_options) {
        setFilterOptions(res.filter_options);
      }

      // Auto-select first candidate if none is selected or previous selection is not in list
      if (res.items && res.items.length > 0) {
        setSelectedApplicantId((prev) => {
          if (!prev || !res.items.some((item) => item.id === prev)) {
            return res.items[0].id;
          }
          return prev;
        });
      } else {
        setSelectedApplicantId(null);
        setCandidateDetail(null);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err.message || 'Unable to load applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    selectedInternship,
    selectedStatus,
    selectedScreening,
    selectedMinScore,
    selectedDegree,
    selectedDateRange,
    searchQuery,
    sortBy,
    currentPage,
  ]);

  // 6. Fetch Single Candidate Inspection Detail
  const loadCandidateDetail = useCallback(async (appId) => {
    if (!token || !appId) return;
    setDetailLoading(true);
    try {
      const detail = await recruiterService.getApplicationDetail(token, appId);
      setCandidateDetail(detail);
      setRecruiterNotes(detail?.recruiter_notes || '');
    } catch (err) {
      console.warn('Error loading candidate detail:', err);
      setCandidateDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  // Initial & Filter change effects
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    if (selectedApplicantId) {
      loadCandidateDetail(selectedApplicantId);
    }
  }, [selectedApplicantId, loadCandidateDetail]);

  // Handle Multi-Select Checkbox
  const toggleSelectApplicant = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map((a) => a.id));
    }
  };

  // Handle Save Recruiter Notes
  const handleSaveNotes = async () => {
    if (!token || !selectedApplicantId) return;
    try {
      await recruiterService.updateApplicationNotes(token, selectedApplicantId, recruiterNotes);
      setNoteSavedMsg('Note saved successfully!');
      setTimeout(() => setNoteSavedMsg(''), 2000);
      loadCandidateDetail(selectedApplicantId);
    } catch (err) {
      alert('Failed to save notes: ' + err.message);
    }
  };

  // Handle Bulk Action (Shortlist, Review, Reject, Interview)
  const handleBulkAction = async (action) => {
    if (!token || selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      await recruiterService.bulkApplicationAction(token, selectedIds, action);
      setSelectedIds([]);
      await Promise.all([loadSummary(), loadApplications()]);
      if (selectedApplicantId) {
        loadCandidateDetail(selectedApplicantId);
      }
    } catch (err) {
      alert(tl('Action failed: {{message}}', {
        message: err.message
      }));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Single Action from Drawer
  const handleSingleAction = async (action) => {
    if (!token || !selectedApplicantId) return;
    setActionLoading(true);
    try {
      await recruiterService.bulkApplicationAction(token, [selectedApplicantId], action);
      await Promise.all([loadSummary(), loadApplications()]);
      loadCandidateDetail(selectedApplicantId);
    } catch (err) {
      alert(tl('Action failed: {{message}}', {
        message: err.message
      }));
    } finally {
      setActionLoading(false);
    }
  };

  // Open Candidate Evaluation Modal
  const handleOpenCandidateEvaluation = (appId, internshipId) => {
    setEvalModalAppId(appId || selectedApplicantId);
    setEvalModalInternshipId(
      internshipId ||
      candidateDetail?.internship?.id ||
      selectedCandidateRow?.internship_id ||
      selectedInternship
    );
    setEvalModalVisible(true);
  };

  // Select Top N candidates by authoritative ranking/match score
  const handleSelectTopN = (n) => {
    const topNIds = applications.slice(0, n).map((a) => a.id);
    setSelectedIds(topNIds);
    setTopNMenuOpen(false);
  };

  // Handle Single Candidate Progression
  const handleProgressSingleCandidate = async (action, notes = '') => {
    if (!token || !selectedApplicantId) return;
    const internId =
      candidateDetail?.internship?.id ||
      selectedCandidateRow?.internship_id ||
      selectedInternship;
    if (!internId) {
      alert('Internship context is required for round progression.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await recruiterService.progressCandidateRound(token, internId, selectedApplicantId, {
        action,
        notes,
      });
      alert(res.message || 'Candidate progression updated.');
      await Promise.all([loadSummary(), loadApplications()]);
      if (selectedApplicantId) {
        loadCandidateDetail(selectedApplicantId);
      }
    } catch (err) {
      alert(tl('Progression failed: {{message}}', {
        message: err.message
      }));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Bulk Progression Trigger
  const handleTriggerBulkProgression = (action) => {
    if (selectedIds.length === 0) {
      alert('Please select at least one candidate.');
      return;
    }
    setBulkProgressionAction(action);
    setShowBulkProgressionConfirm(true);
  };

  // Handle Bulk Progression Confirmation
  const handleConfirmBulkProgression = async () => {
    if (!token || selectedIds.length === 0) return;
    const firstSelected = applications.find((a) => selectedIds.includes(a.id));
    const internId = firstSelected?.internship_id || selectedInternship;
    if (!internId) {
      alert('Internship context is required for bulk progression.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await recruiterService.bulkProgressRound(token, internId, {
        action: bulkProgressionAction,
        application_ids: selectedIds,
      });
      setShowBulkProgressionConfirm(false);
      setSelectedIds([]);

      if (res.progressed_count === 0 && res.errors && res.errors.length > 0) {
        alert(tl('Bulk action could not be completed: {{error}}', {
          error: res.errors[0].error
        }));
      } else if (res.errors && res.errors.length > 0) {
        alert(tl(
          'Successfully processed {{progressed_count}} candidate(s). Note: {{error}}',
          {
            progressed_count: res.progressed_count,
            error: res.errors[0].error
          }
        ));
      } else {
        alert(res.message || 'Bulk progression completed successfully.');
      }

      await Promise.all([loadSummary(), loadApplications()]);
      if (selectedApplicantId) {
        loadCandidateDetail(selectedApplicantId);
      }
    } catch (err) {
      alert(tl('Bulk progression failed: {{message}}', {
        message: err.message
      }));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    const query = new URLSearchParams();
    if (selectedInternship) query.append('internship_id', selectedInternship);
    if (selectedStatus) query.append('status', selectedStatus);
    if (token) query.append('token', token);
    const exportUrl = `${API_BASE}/recruiter/applications/export-csv?${query.toString()}`;
    if (Platform.OS === 'web') {
      window.open(exportUrl, '_blank');
    } else {
      Linking.openURL(exportUrl);
    }
  };

  // Clear Filters
  const handleClearFilters = () => {
    setSelectedInternship('');
    setSelectedStatus('');
    setSelectedScreening('');
    setSelectedMinScore('');
    setSelectedDegree('');
    setSelectedDateRange('');
    setSearchQuery('');
    setSortBy('match_score_desc');
    setCurrentPage(1);
  };

  const selectedCount = selectedIds.length;
  const selectedCandidateRow = applications.find((a) => a.id === selectedApplicantId);

  // Derive active candidate data
  const candName = candidateDetail?.student_name || selectedCandidateRow?.student_name || 'Candidate';
  const candDegree = candidateDetail?.degree || selectedCandidateRow?.degree || '';
  const candCollege = candidateDetail?.college || selectedCandidateRow?.college || '';
  const candCgpa = candidateDetail?.cgpa || selectedCandidateRow?.cgpa || 'N/A';
  const candProfileImg = candidateDetail?.profile_image || selectedCandidateRow?.profile_image;
  const candAvatar = candidateDetail?.avatar || selectedCandidateRow?.avatar || (candName.substring(0, 2).toUpperCase());
  const candStatus = candidateDetail?.application?.status || selectedCandidateRow?.status || 'NEW';
  const candMatchScore = candidateDetail?.match_score ?? selectedCandidateRow?.match_score ?? 0;
  const candThreshold = candidateDetail?.threshold || selectedCandidateRow?.threshold || 'threshold';
  const candEligibility = candidateDetail?.eligibility || selectedCandidateRow?.eligibility || 'NEEDS_DEVELOPMENT';
  const isCandidateEligible = candEligibility === 'PASSED' || candEligibility === 'Passed';

  // AI Screening data
  const aiScreening = candidateDetail?.ai_screening;
  const hasAiScreening = aiScreening && aiScreening.evaluated;

  // Canonical Skills Breakdown
  const canonicalSkills = candidateDetail?.canonical_skills || [];

  // Verified Projects
  const verifiedProjects = candidateDetail?.verified_projects || [];

  // Resume info
  const resumeInfo = candidateDetail?.resume;

  // Timeline
  const timelineEvents = candidateDetail?.timeline || [];

  const statusTone = (s = '') => {
    const v = String(s).toUpperCase();
    if (v.includes('SELECT') && !v.includes('NOT')) return 'success';
    if (v.includes('SHORTLIST') || v.includes('NEXT_ROUND')) return 'info';
    if (v.includes('INTERVIEW') || v.includes('ASSESS') || v.includes('ROUND')) return 'accent';
    if (v.includes('REJECT') || v.includes('NOT_SELECTED')) return 'danger';
    if (v.includes('REVIEW')) return 'warning';
    return 'neutral';
  };
  const pretty = (s) => String(s || '').toLowerCase().replace(/_/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const openUrl = (u) => {
    if (!u) return;
    const url = /^https?:/.test(u) ? u : `${API_ORIGIN}${u}`;
    if (Platform.OS === 'web') window.open(url, '_blank', 'noopener,noreferrer');
    else Linking.openURL(url).catch(() => {});
  };
  const f = summary.funnel || {};
  const STATUSES = ['', 'NEW', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'];
  const SORTS = [
    { id: 'match_score_desc', label: 'Best match' },
    { id: 'applied_at_desc', label: 'Newest' },
    { id: 'name_asc', label: 'Name A–Z' },
  ];
  const sel = selectedCandidateRow || {};

  const filters = (
    <Stack gap={space.sm}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="All roles" icon="Briefcase" selected={!selectedInternship} onPress={() => { setSelectedInternship(''); setCurrentPage(1); }} />
        {(filterOptions.internships || []).map((p) => (
          <Chip key={p.id} label={p.title} tone="info" selected={String(selectedInternship) === String(p.id)} onPress={() => { setSelectedInternship(p.id); setCurrentPage(1); }} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {STATUSES.map((st) => (
          <Chip key={st || 'all'} label={st ? pretty(st) : 'Any status'} tone="accent" selected={selectedStatus === st} onPress={() => { setSelectedStatus(st); setCurrentPage(1); }} />
        ))}
        {['', '90', '80', '70', '60'].map((v) => (
          <Chip key={`m${v}`} label={v ? tl('{{v}}%+ match', {
            v: v
          }) : 'Any match'} tone="success" selected={selectedMinScore === v} onPress={() => { setSelectedMinScore(v); setCurrentPage(1); }} />
        ))}
        {[{ v: '', l: 'All time' }, { v: '7d', l: '7 days' }, { v: '30d', l: '30 days' }, { v: '90d', l: '90 days' }].map((d) => (
          <Chip key={`d${d.v}`} label={d.l} icon="Calendar" selected={selectedDateRange === d.v} onPress={() => { setSelectedDateRange(d.v); setCurrentPage(1); }} />
        ))}
        {(filterOptions.degrees || []).map((deg) => (
          <Chip key={`g${deg}`} label={deg} icon="GraduationCap" tone="warning" selected={selectedDegree === deg} onPress={() => { setSelectedDegree(selectedDegree === deg ? '' : deg); setCurrentPage(1); }} />
        ))}
      </ScrollView>
    </Stack>
  );

  const bulkBar = selectedCount ? (
    <Card tone="dark" padding={space.md}>
      <Row justify="space-between" wrap gap={8}>
        <Txt variant="bodyStrong" tone="inverse">{selectedCount} selected</Txt>
        <Row gap={6} wrap>
          <Button label="Review" size="sm" variant="light" onPress={() => handleBulkAction('UNDER_REVIEW')} disabled={actionLoading} />
          <Button label="Shortlist" size="sm" tone="success" onPress={() => handleBulkAction('SHORTLIST')} disabled={actionLoading} />
          <Button label="Next round" size="sm" tone="accent" onPress={() => handleTriggerBulkProgression('SEND_TO_NEXT_ROUND')} disabled={actionLoading} />
          <Button label="Reject" size="sm" tone="danger" onPress={() => handleBulkAction('REJECT')} disabled={actionLoading} />
          <IconButton icon="X" variant="frame" size={32} onPress={() => setSelectedIds([])} accessibilityLabel="Clear selection" />
        </Row>
      </Row>
    </Card>
  ) : null;

  const list = (
    <Card padding={space.sm}>
      <Row justify="space-between" style={{ padding: space.sm }} wrap gap={8}>
        <Row gap={10}>
          <Checkbox checked={applications.length > 0 && selectedIds.length === applications.length} onChange={toggleSelectAll} label={tl('{{total}} candidates', {
            total: pagination.total
          })} />
        </Row>
        <Row gap={6}>
          <Button label="Top 5" size="sm" variant="ghost" onPress={() => handleSelectTopN(5)} />
          <Button label="Top 10" size="sm" variant="ghost" onPress={() => handleSelectTopN(10)} />
        </Row>
      </Row>
      {loading ? (
        <Stack gap={8} style={{ padding: space.sm }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={64} />)}</Stack>
      ) : error ? (
        <EmptyState icon="CircleAlert" tone="danger" title="Couldn't load candidates" message={error} action={<Button label="Retry" onPress={loadApplications} />} />
      ) : applications.length ? (
        <Stack gap={4}>
          {applications.map((cand) => {
            const active = cand.id === selectedApplicantId;
            const checked = selectedIds.includes(cand.id);
            return (
              <Pressable
                key={cand.id}
                onPress={() => setSelectedApplicantId(cand.id)}
                style={({ hovered }) => [styles.candRow, active ? { backgroundColor: colors.lilac } : hovered ? { backgroundColor: colors.surfaceMuted } : null, webOnly({ cursor: 'pointer' })]}
              >
                <Pressable onPress={() => toggleSelectApplicant(cand.id)} hitSlop={8} style={[styles.check, checked ? { backgroundColor: colors.ink, borderColor: colors.ink } : null, webOnly({ cursor: 'pointer' })]}>
                  {checked ? <Icon name="Check" size={12} color="#fff" strokeWidth={3} /> : null}
                </Pressable>
                <Avatar name={cand.student_name} uri={cand.profile_image || undefined} size={40} />
                <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{cand.student_name}</Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>{[cand.internship_title, cand.college].filter(Boolean).join(' · ')}</Txt>
                </Stack>
                <Pill label={`${Math.round(cand.match_score ?? 0)}%`} tone={(cand.eligibility === 'PASSED' || cand.eligibility === 'Passed') ? 'success' : 'warning'} size="sm" />
                {isDesktop ? <Pill label={pretty(cand.status)} tone={statusTone(cand.status)} size="sm" /> : null}
              </Pressable>
            );
          })}
        </Stack>
      ) : (
        <EmptyState icon="Users" title="No candidates match" message="Try clearing filters." action={<Button label="Clear filters" size="sm" onPress={handleClearFilters} />} />
      )}
      {pagination.total_pages > 1 ? (
        <Row justify="center" gap={8} style={{ padding: space.sm }}>
          <IconButton icon="ChevronLeft" onPress={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} />
          <Txt variant="small" tone="muted">Page {pagination.page} of {pagination.total_pages}</Txt>
          <IconButton icon="ChevronRight" onPress={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))} disabled={currentPage >= pagination.total_pages} />
        </Row>
      ) : null}
    </Card>
  );

  const progression = candidateDetail?.assessment_progression || sel.assessment_progression;
  const detail = selectedApplicantId ? (
    <Card padding={isDesktop ? space.xl : space.lg}>
      {detailLoading && !candidateDetail ? (
        <Stack gap={10}><Skeleton height={64} /><Skeleton height={120} /><Skeleton height={120} /></Stack>
      ) : (
        <Stack gap={space.md}>
          <Row gap={space.md} align="flex-start" wrap>
            <Avatar name={candName} uri={candProfileImg || undefined} size={60} />
            <Stack gap={3} style={{ flex: 1, minWidth: 200 }}>
              <Txt variant="h2" tone="ink">{candName}</Txt>
              <Txt variant="small" tone="muted">{[candDegree, candCollege].filter(Boolean).join(' · ') || '—'}</Txt>
              <Row wrap gap={6}>
                <Pill label={pretty(candStatus)} tone={statusTone(candStatus)} size="sm" />
                <Pill label={`CGPA ${candCgpa}`} size="sm" />
                <Pill label={isCandidateEligible ? 'Meets threshold' : tl('Below {{candThreshold}}', {
                  candThreshold: candThreshold
                })} tone={isCandidateEligible ? 'success' : 'warning'} size="sm" />
              </Row>
            </Stack>
            <Ring value={candMatchScore || 0} size={76} stroke={8} tone={isCandidateEligible ? 'success' : 'warning'}>
              <Txt variant="title" tone="ink">{Math.round(candMatchScore || 0)}%</Txt>
            </Ring>
          </Row>

          <Row gap={6} wrap>
            {String(candStatus).toUpperCase() === 'SHORTLISTED' ? (
              <Button label="Unshortlist" size="sm" variant="secondary" onPress={() => handleSingleAction('UNSHORTLIST')} disabled={actionLoading} />
            ) : (
              <Button label="Shortlist" size="sm" icon="Check" onPress={() => handleSingleAction('SHORTLIST')} loading={actionLoading} />
            )}
            <Button label="Review" size="sm" variant="secondary" onPress={() => handleSingleAction('UNDER_REVIEW')} disabled={actionLoading} />
            <Button label="Interview" size="sm" variant="secondary" icon="Video" onPress={() => handleSingleAction('INTERVIEW')} disabled={actionLoading} />
            <Button label="Reject" size="sm" variant="danger" onPress={() => handleSingleAction('REJECT')} disabled={actionLoading} />
            <Button label="Full evaluation" size="sm" variant="ghost" iconRight="ArrowUpRight" onPress={() => handleOpenCandidateEvaluation(selectedApplicantId, sel.internship_id)} />
          </Row>

          {progression && progression.has_pipeline !== false && progression.current_round_name ? (
            <Inset tone="accent">
              <Row justify="space-between" wrap gap={8}>
                <Stack gap={2}>
                  <Txt variant="small" weight={700} tone="ink">Round: {progression.current_round_name}</Txt>
                  {progression.next_round_name ? <Txt variant="caption" tone="muted">Next: {progression.next_round_name}</Txt> : null}
                </Stack>
                <Row gap={6}>
                  {progression.is_final_round ? (
                    <Button label="Select" size="sm" icon="Award" onPress={() => handleProgressSingleCandidate('SELECT_CANDIDATE')} disabled={actionLoading} />
                  ) : (
                    <Button label="Next round" size="sm" icon="ArrowRight" onPress={() => handleProgressSingleCandidate('SEND_TO_NEXT_ROUND')} disabled={actionLoading} />
                  )}
                  <Button label="Not selected" size="sm" variant="danger" onPress={() => handleProgressSingleCandidate('NOT_SELECTED')} disabled={actionLoading} />
                </Row>
              </Row>
            </Inset>
          ) : null}

          {hasAiScreening ? (
            <Card padding={space.lg} tone="info">
              <Row justify="space-between">
                <Txt variant="h3" tone="ink">AI screening</Txt>
                <Pill label={tl('{{v0}} overall', {
                  v0: aiScreening.overall_score ?? '—'
                })} tone="info" size="sm" />
              </Row>
              <View style={styles.scoreGrid}>
                {[
                  ['Technical', aiScreening.technical_score],
                  ['Required skills', aiScreening.required_skills_score],
                  ['Projects', aiScreening.project_score],
                  ['Resume', aiScreening.resume_score],
                ].map(([k, v]) => (
                  <Inset key={k} tone="info" padding={space.sm} style={styles.scoreCell}>
                    <Row justify="space-between"><Txt variant="caption" weight={600} tone="ink">{k}</Txt><Txt variant="caption" weight={700} tone="ink">{v ?? '—'}</Txt></Row>
                    <ProgressBar value={v || 0} tone="info" track="rgba(255,255,255,0.7)" height={5} style={{ marginTop: 6 }} />
                  </Inset>
                ))}
              </View>
              {aiScreening.recommendation_note ? <Txt variant="small" color={colors.skyInk} style={{ marginTop: space.sm }}>{aiScreening.recommendation_note}</Txt> : null}
            </Card>
          ) : null}

          {canonicalSkills.length ? (
            <Stack gap={8}>
              <Txt variant="h3" tone="ink">Skills</Txt>
              {canonicalSkills.map((sk) => {
                const lvl = sk.student_level ?? sk.score ?? 0;
                const skName = sk.skill || sk.skill_name || sk.name;
                return (
                  <Stack key={sk.skill_id || skName} gap={4}>
                    <Row justify="space-between">
                      <Row gap={6}>
                        <Txt variant="small" weight={600} tone="ink">{skName}</Txt>
                        {sk.is_verified || sk.is_met ? <Icon name="ShieldCheck" size={13} color={colors.mintInk} /> : null}
                        {sk.status ? <Pill label={sk.status} tone={sk.is_met ? 'success' : 'warning'} size="sm" /> : null}
                      </Row>
                      <Txt variant="caption" tone="muted">{lvl}%{sk.required_level != null ? ` / ${sk.required_level}%` : ''}</Txt>
                    </Row>
                    <ProgressBar value={lvl} tone={sk.required_level != null && lvl < sk.required_level ? 'warning' : 'success'} height={6} />
                  </Stack>
                );
              })}
            </Stack>
          ) : null}

          {verifiedProjects.length || resumeInfo ? (
            <Row gap={space.sm} wrap>
              {resumeInfo ? (
                <Inset tone="neutral" style={{ flex: 1, minWidth: 200 }}>
                  <Txt variant="caption" tone="muted">Resume</Txt>
                  <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{resumeInfo.has_resume === false ? 'Not uploaded' : resumeInfo.filename || resumeInfo.file_name || 'Resume'}</Txt>
                  {resumeInfo.has_resume !== false && resumeInfo.ats_score != null ? <Txt variant="caption" tone="muted">ATS {resumeInfo.ats_score}</Txt> : null}
                  {resumeInfo.download_url || resumeInfo.view_url || resumeInfo.url ? (
                    <Button label="Open" size="sm" variant="light" icon="ExternalLink" onPress={() => openUrl(resumeInfo.view_url || resumeInfo.download_url || resumeInfo.url)} style={{ marginTop: 6 }} />
                  ) : null}
                </Inset>
              ) : null}
              {verifiedProjects.slice(0, 4).map((proj) => (
                <Pressable key={proj.id || proj.name} onPress={() => openUrl(proj.html_url || proj.github_url || proj.url)} style={[styles.projCell, webOnly({ cursor: 'pointer' })]}>
                  <Icon name="GitBranch" size={16} color={colors.textMuted} />
                  <Txt variant="small" weight={700} tone="ink" numberOfLines={1} style={{ flex: 1 }}>{proj.title || proj.name || proj.repo_name}</Txt>
                  <Icon name="ArrowUpRight" size={14} color={colors.textMuted} />
                </Pressable>
              ))}
            </Row>
          ) : null}

          <Stack gap={8}>
            <Txt variant="h3" tone="ink">Notes</Txt>
            <Field multiline placeholder="Private notes for your team…" value={recruiterNotes} onChangeText={setRecruiterNotes} />
            <Row gap={8}>
              <Button label="Save note" size="sm" variant="secondary" icon="Check" onPress={handleSaveNotes} />
              {noteSavedMsg ? <Txt variant="caption" tone="success">{noteSavedMsg}</Txt> : null}
            </Row>
          </Stack>

          {timelineEvents.length ? (
            <Stack gap={8}>
              <Txt variant="h3" tone="ink">Activity</Txt>
              {timelineEvents.map((t, i) => (
                <Row key={t.id || i} gap={10} align="flex-start">
                  <View style={styles.dot} />
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Txt variant="small" weight={600} tone="ink">{t.event_name || t.title}</Txt>
                    {t.message ? <Txt variant="caption" tone="muted">{t.message}</Txt> : null}
                    {t.timestamp ? <Txt variant="caption" tone="subtle">{t.timestamp}{t.actor ? ` · ${t.actor}` : ''}</Txt> : null}
                  </Stack>
                </Row>
              ))}
            </Stack>
          ) : null}
        </Stack>
      )}
    </Card>
  ) : null;

  return (
    (<Page>
      <SectionTitle
        title="Candidates"
        emoji="🧑‍💻"
        subtitle={tl('{{v0}} applications across {{v1}} active roles', {
          v0: summary.total || 0,
          v1: summary.active_internships_count || 0
        })}
        right={
          <Row gap={8}>
            <SearchField value={searchQuery} onChangeText={(v) => { setSearchQuery(v); setCurrentPage(1); }} placeholder="Name, college or skill" style={{ width: isDesktop ? 240 : '100%' }} />
            <Button label="Export CSV" icon="Download" variant="secondary" onPress={handleExportCSV} />
          </Row>
        }
      />
      <View style={styles.statsRow}>
        <StatTile value={summary.total ?? 0} label="Applied" tone="info" style={styles.stat} />
        <StatTile value={summary.under_review ?? f.under_review ?? 0} label="In review" tone="warning" style={styles.stat} />
        <StatTile value={summary.shortlisted ?? 0} label="Shortlisted" tone="accent" style={styles.stat} />
        <StatTile value={summary.interview ?? 0} label="Interviews" tone="pink" style={styles.stat} />
        <StatTile value={summary.selected ?? 0} label="Selected" tone="success" style={styles.stat} />
      </View>
      {filters}
      <Row gap={6} wrap>
        {SORTS.map((s) => <Chip key={s.id} label={s.label} icon="Funnel" tone="accent" selected={sortBy === s.id} onPress={() => setSortBy(s.id)} />)}
        <Button label="Clear filters" size="sm" variant="ghost" icon="X" onPress={handleClearFilters} />
      </Row>
      {bulkBar}
      <View style={[styles.split, isDesktop ? styles.splitRow : null]}>
        <View style={isDesktop ? { width: 420 } : null}>{list}</View>
        <View style={isDesktop ? { flex: 1, minWidth: 0 } : null}>{detail}</View>
      </View>
      <Sheet
        visible={showBulkProgressionConfirm}
        onClose={() => setShowBulkProgressionConfirm(false)}
        title={bulkProgressionAction === 'NOT_SELECTED' ? 'Mark as not selected?' : 'Send to next round?'}
        subtitle={selectedCount === 1 ? tl('1 candidate selected') : tl('{{count}} candidates selected', { count: selectedCount })}
        icon="Users"
        tone="accent"
        width={520}
        footer={
          <>
            <Button label="Cancel" variant="secondary" onPress={() => setShowBulkProgressionConfirm(false)} />
            <Button label="Confirm" icon="Check" onPress={handleConfirmBulkProgression} loading={actionLoading} />
          </>
        }
      >
        <Txt variant="body" tone="muted">Candidates are notified by email. This uses the internship of the first selected candidate.</Txt>
      </Sheet>
      <CandidateEvaluationModal
        visible={evalModalVisible}
        onClose={() => setEvalModalVisible(false)}
        token={token}
        internshipId={evalModalInternshipId}
        applicationId={evalModalAppId}
        onStatusUpdated={() => {
          loadSummary();
          loadApplications();
          if (selectedApplicantId) loadCandidateDetail(selectedApplicantId);
        }}
      />
    </Page>)
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 130,
    minHeight: 92,
  },
  split: {
    gap: space.lg,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  candRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radii.md,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.sm,
  },
  scoreCell: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  projCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 200,
    padding: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.connector,
    marginTop: 6,
  },
});
