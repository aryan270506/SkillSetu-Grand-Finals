import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { recruiterService } from '../services/recruiterService';
import CandidateEvaluationModal from '../Internship/CandidateEvaluationModal';

const COLORS = {
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  textDark: '#0F172A',
  textMuted: '#64748B',
  primaryTeal: '#004D40',
  primaryTealHover: '#00382E',
  mintBg: '#E6F4F1',
  mintBorder: '#B2DFDB',
  tealText: '#004D40',
  orangePillBg: '#FEF3C7',
  orangePillText: '#D97706',
  greenPillBg: '#DCFCE7',
  greenPillText: '#15803D',
  bluePillBg: '#E0F2FE',
  bluePillText: '#0369A1',
  redPillBg: '#FEE2E2',
  redPillText: '#DC2626',
  grayBg: '#F1F5F9',
  purplePillBg: '#F3E8FF',
  purplePillText: '#7E22CE',
};

function getStatusStyle(candOrStatus) {
  if (typeof candOrStatus === 'object' && candOrStatus !== null) {
    if (candOrStatus.statusBg && candOrStatus.statusText && candOrStatus.step_badge) {
      return {
        bg: candOrStatus.statusBg,
        text: candOrStatus.statusText,
        label: candOrStatus.step_badge || candOrStatus.status || 'Applied',
      };
    }
    if (candOrStatus.raw_status === 'SHORTLISTED' && candOrStatus.current_round_name) {
      return {
        bg: '#EDE9FE',
        text: '#6D28D9',
        label: candOrStatus.current_round_index
          ? `⚡ R${candOrStatus.current_round_index}: ${candOrStatus.current_round_name}`
          : `⚡ ${candOrStatus.current_round_name}`,
      };
    }
  }

  const rawStr = typeof candOrStatus === 'string' ? candOrStatus : (candOrStatus?.status || candOrStatus?.raw_status || '');
  const norm = (rawStr || '').toUpperCase();

  if (norm === 'SELECTED' || norm === 'HIRED' || norm.includes('SELECTED')) {
    return { bg: COLORS.greenPillBg, text: COLORS.greenPillText, label: '★ Selected' };
  }
  if (norm.startsWith('ROUND') || norm.includes('ASSESSMENT') || norm.includes('INTERVIEW')) {
    return { bg: '#EDE9FE', text: '#6D28D9', label: `⚡ ${rawStr}` };
  }
  if (norm === 'SHORTLISTED') {
    return { bg: COLORS.bluePillBg, text: COLORS.bluePillText, label: 'Shortlisted' };
  }
  if (norm === 'UNDER_REVIEW' || norm === 'UNDER REVIEW') {
    return { bg: COLORS.orangePillBg, text: COLORS.orangePillText, label: 'Under Review' };
  }
  if (norm === 'INTERVIEW' || norm === 'INTERVIEW_SCHEDULED') {
    return { bg: COLORS.purplePillBg, text: COLORS.purplePillText, label: 'Interview' };
  }
  if (norm === 'REJECTED' || norm === 'NOT_SELECTED') {
    return { bg: COLORS.redPillBg, text: COLORS.redPillText, label: 'Rejected' };
  }
  return { bg: '#F1F5F9', text: '#475569', label: 'Applied' };
}


function HoverCard({ children, style, hoverScale = 1.02, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      Animated.spring(scaleAnim, {
        toValue: hoverScale,
        friction: 6,
        tension: 90,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={{ flex: style?.flex, minWidth: style?.minWidth }}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

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
      alert(`Action failed: ${err.message}`);
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
      alert(`Action failed: ${err.message}`);
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
      alert(`Progression failed: ${err.message}`);
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
        alert(`Bulk action could not be completed: ${res.errors[0].error}`);
      } else if (res.errors && res.errors.length > 0) {
        alert(`Successfully processed ${res.progressed_count} candidate(s). Note: ${res.errors[0].error}`);
      } else {
        alert(res.message || 'Bulk progression completed successfully.');
      }

      await Promise.all([loadSummary(), loadApplications()]);
      if (selectedApplicantId) {
        loadCandidateDetail(selectedApplicantId);
      }
    } catch (err) {
      alert(`Bulk progression failed: ${err.message}`);
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
    const exportUrl = `http://127.0.0.1:8000/api/v1/recruiter/applications/export-csv?${query.toString()}`;
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
  const candStatus = candidateDetail?.status || selectedCandidateRow?.status || 'NEW';
  const candStatusStyle = getStatusStyle(candidateDetail || selectedCandidateRow || candStatus);
  const candMatchScore = candidateDetail?.match_score ?? selectedCandidateRow?.match_score ?? 0;
  const candThreshold = candidateDetail?.threshold || selectedCandidateRow?.threshold || '80%';
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

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      {/* 1. Breadcrumb & Title Bar */}
      <View style={styles.topHeaderRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.breadcrumbText}>
            RECRUITER WORKSPACE • <Text style={styles.breadcrumbHighlight}>Intelligent Talent Pipeline</Text>
          </Text>
          <Text style={styles.pageTitle}>Applications</Text>
          <Text style={styles.pageSubtitle}>
            Review, evaluate, and manage students who have applied to your internships.
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <View style={styles.autoScreenBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.autoScreenText}>AI Screening Active</Text>
          </View>
          <Pressable onPress={handleExportCSV} style={styles.exportBtn}>
            <Text style={styles.exportBtnText}>📥 Export Applications CSV</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Top Summary Metric Cards (5 Cards) */}
      <View style={styles.metricsGrid}>
        {/* Card 1: Total Applications */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Total Applications</Text>
            <Text style={{ fontSize: 13 }}>📋</Text>
          </View>
          <Text style={styles.metricValue}>{summary.total}</Text>
          <Text style={styles.metricSub}>
            Across {summary.active_internships_count || 0} active internship{summary.active_internships_count === 1 ? '' : 's'}
          </Text>
          <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
              Live Data
            </Text>
          </View>
        </HoverCard>

        {/* Card 2: New */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>New</Text>
            <Text style={{ fontSize: 13 }}>📬</Text>
          </View>
          <Text style={styles.metricValue}>{summary.new}</Text>
          <Text style={styles.metricSub}>Needs initial review</Text>
          {summary.new > 0 && (
            <View style={[styles.pill, { backgroundColor: COLORS.orangePillBg }]}>
              <Text style={[styles.pillText, { color: COLORS.orangePillText }]}>
                Action required
              </Text>
            </View>
          )}
        </HoverCard>

        {/* Card 3: Under Review */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Under Review</Text>
            <Text style={{ fontSize: 13 }}>👁️</Text>
          </View>
          <Text style={styles.metricValue}>{summary.under_review}</Text>
          <Text style={styles.metricSub}>In evaluation & screening</Text>
        </HoverCard>

        {/* Card 4: Shortlisted */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Shortlisted</Text>
            <Text style={{ fontSize: 13 }}>⭐</Text>
          </View>
          <Text style={styles.metricValue}>{summary.shortlisted}</Text>
          <Text style={styles.metricSub}>Ready for interview</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.bluePillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.bluePillText }]}>
              {summary.total > 0 ? ((summary.shortlisted / summary.total) * 100).toFixed(0) : 0}% of total
            </Text>
          </View>
        </HoverCard>

        {/* Card 5: Selected */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Selected</Text>
            <Text style={{ fontSize: 13 }}>🏆</Text>
          </View>
          <Text style={styles.metricValue}>{summary.selected}</Text>
          <Text style={styles.metricSub}>Offers accepted / hired</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
              {summary.total > 0 ? ((summary.selected / summary.total) * 100).toFixed(1) : 0}% Conv.
            </Text>
          </View>
        </HoverCard>
      </View>

      {/* 3. Application Funnel & Pipeline Overview */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Application Funnel & Pipeline Overview</Text>
            <Text style={styles.cardSub}>
              Real-time student conversion through automated screening and evaluations
            </Text>
          </View>
         
        </View>

        <View style={styles.funnelStepsGrid}>
          {/* Step 1: Applied */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>1. Applied</Text>
              <Text style={styles.funnelPct}>{summary.funnel.applied_pct}%</Text>
            </View>
            <Text style={styles.funnelNum}>{summary.funnel.applied}</Text>
            <Text style={styles.funnelSub}>Gross applications</Text>
            <View style={styles.trackBar}>
              <View
                style={[
                  styles.fillBar,
                  { width: `${Math.min(100, summary.funnel.applied_pct)}%`, backgroundColor: COLORS.primaryTeal },
                ]}
              />
            </View>
          </View>

          {/* Step 2: Eligible */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>2. Eligible</Text>
              <Text style={styles.funnelPct}>{summary.funnel.eligible_pct}%</Text>
            </View>
            <Text style={styles.funnelNum}>{summary.funnel.eligible}</Text>
            <Text style={styles.funnelSub}>Criteria verified</Text>
            <View style={styles.trackBar}>
              <View
                style={[
                  styles.fillBar,
                  { width: `${Math.min(100, summary.funnel.eligible_pct)}%`, backgroundColor: '#0D9488' },
                ]}
              />
            </View>
          </View>

          {/* Step 3: Under Review */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>3. Under Review</Text>
              <Text style={styles.funnelPct}>{summary.funnel.under_review_pct}%</Text>
            </View>
            <Text style={styles.funnelNum}>{summary.funnel.under_review}</Text>
            <Text style={styles.funnelSub}>Skill screening</Text>
            <View style={styles.trackBar}>
              <View
                style={[
                  styles.fillBar,
                  { width: `${Math.min(100, summary.funnel.under_review_pct)}%`, backgroundColor: '#14B8A6' },
                ]}
              />
            </View>
          </View>

          {/* Step 4: Shortlisted */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>4. Shortlisted</Text>
              <Text style={styles.funnelPct}>{summary.funnel.shortlisted_pct}%</Text>
            </View>
            <Text style={styles.funnelNum}>{summary.funnel.shortlisted}</Text>
            <Text style={styles.funnelSub}>High confidence</Text>
            <View style={styles.trackBar}>
              <View
                style={[
                  styles.fillBar,
                  { width: `${Math.min(100, summary.funnel.shortlisted_pct)}%`, backgroundColor: '#5EEAD4' },
                ]}
              />
            </View>
          </View>

          {/* Step 5: Interview */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>5. Interview</Text>
              <Text style={styles.funnelPct}>{summary.funnel.interview_pct}%</Text>
            </View>
            <Text style={styles.funnelNum}>{summary.funnel.interview}</Text>
            <Text style={styles.funnelSub}>Technical rounds</Text>
            <View style={styles.trackBar}>
              <View
                style={[
                  styles.fillBar,
                  { width: `${Math.min(100, summary.funnel.interview_pct)}%`, backgroundColor: '#A78BFA' },
                ]}
              />
            </View>
          </View>

          {/* Step 6: Selected */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>6. Selected</Text>
              <Text style={styles.funnelPct}>{summary.funnel.selected_pct}%</Text>
            </View>
            <Text style={styles.funnelNum}>{summary.funnel.selected}</Text>
            <Text style={styles.funnelSub}>Accepted offers</Text>
            <View style={styles.trackBar}>
              <View
                style={[
                  styles.fillBar,
                  { width: `${Math.min(100, summary.funnel.selected_pct)}%`, backgroundColor: '#34D399' },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* 4. Search Controls & Filter Row */}
      <View style={styles.filterControlsBar}>
        {/* Search Input */}
        <View style={styles.searchInputWrapper}>
          <Text style={{ fontSize: 13 }}>🔍</Text>
          <TextInput
            placeholder="Search candidates, college, role..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setCurrentPage(1);
            }}
            style={styles.searchInput}
          />
          {!!searchQuery && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Internship Filter */}
        <Pressable
          onPress={() => setOpenDropdown(openDropdown === 'internship' ? null : 'internship')}
          style={[styles.filterDropBtn, selectedInternship && styles.filterDropBtnActive]}
        >
          <Text style={[styles.filterDropText, selectedInternship && styles.filterDropTextActive]}>
            {selectedInternship
              ? filterOptions.internships.find((i) => i.id === selectedInternship)?.title || 'Internship'
              : 'All Internships ▾'}
          </Text>
        </Pressable>

        {/* Status Filter */}
        <Pressable
          onPress={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
          style={[styles.filterDropBtn, selectedStatus && styles.filterDropBtnActive]}
        >
          <Text style={[styles.filterDropText, selectedStatus && styles.filterDropTextActive]}>
            {selectedStatus ? `Status: ${selectedStatus} ▾` : 'All Statuses ▾'}
          </Text>
        </Pressable>

        {/* Skill Match Filter */}
        <Pressable
          onPress={() => setOpenDropdown(openDropdown === 'match' ? null : 'match')}
          style={[styles.filterDropBtn, selectedMinScore && styles.filterDropBtnActive]}
        >
          <Text style={[styles.filterDropText, selectedMinScore && styles.filterDropTextActive]}>
            {selectedMinScore ? `Match: ${selectedMinScore}%+ ▾` : 'Skill Match ▾'}
          </Text>
        </Pressable>

        {/* Degree Filter */}
        <Pressable
          onPress={() => setOpenDropdown(openDropdown === 'degree' ? null : 'degree')}
          style={[styles.filterDropBtn, selectedDegree && styles.filterDropBtnActive]}
        >
          <Text style={[styles.filterDropText, selectedDegree && styles.filterDropTextActive]}>
            {selectedDegree ? `Degree: ${selectedDegree} ▾` : 'Degree & Branch ▾'}
          </Text>
        </Pressable>

        {/* Date Filter */}
        <Pressable
          onPress={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
          style={[styles.filterDropBtn, selectedDateRange && styles.filterDropBtnActive]}
        >
          <Text style={[styles.filterDropText, selectedDateRange && styles.filterDropTextActive]}>
            {selectedDateRange === '7d'
              ? 'Last 7 Days ▾'
              : selectedDateRange === '30d'
              ? 'Last 30 Days ▾'
              : selectedDateRange === '90d'
              ? 'Last 90 Days ▾'
              : 'All Time ▾'}
          </Text>
        </Pressable>

        {/* Clear Filters Button */}
        {(selectedInternship || selectedStatus || selectedMinScore || selectedDegree || selectedDateRange || searchQuery) && (
          <Pressable onPress={handleClearFilters}>
            <Text style={styles.clearFiltersText}>✕ Clear Filters</Text>
          </Pressable>
        )}
      </View>

      {/* Filter Dropdown Overlays / Modals */}
      {openDropdown === 'internship' && (
        <View style={styles.dropdownMenu}>
          <Pressable
            onPress={() => {
              setSelectedInternship('');
              setOpenDropdown(null);
            }}
            style={styles.dropdownOption}
          >
            <Text style={[styles.dropdownOptionText, !selectedInternship && styles.dropdownOptionSelected]}>
              All Internships ({filterOptions.internships.length})
            </Text>
          </Pressable>
          {filterOptions.internships.map((int) => (
            <Pressable
              key={int.id}
              onPress={() => {
                setSelectedInternship(int.id);
                setOpenDropdown(null);
                setCurrentPage(1);
              }}
              style={styles.dropdownOption}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  selectedInternship === int.id && styles.dropdownOptionSelected,
                ]}
              >
                {int.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {openDropdown === 'status' && (
        <View style={styles.dropdownMenu}>
          {['', 'NEW', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED'].map((st) => (
            <Pressable
              key={st || 'ALL'}
              onPress={() => {
                setSelectedStatus(st);
                setOpenDropdown(null);
                setCurrentPage(1);
              }}
              style={styles.dropdownOption}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  selectedStatus === st && styles.dropdownOptionSelected,
                ]}
              >
                {st ? st.replace('_', ' ') : 'All Statuses'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {openDropdown === 'match' && (
        <View style={styles.dropdownMenu}>
          {[
            { label: 'All Match Scores', val: '' },
            { label: '90%+ Match', val: '90' },
            { label: '80%+ Match', val: '80' },
            { label: '70%+ Match', val: '70' },
            { label: '60%+ Match', val: '60' },
            { label: '50%+ Match', val: '50' },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                setSelectedMinScore(item.val);
                setOpenDropdown(null);
                setCurrentPage(1);
              }}
              style={styles.dropdownOption}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  selectedMinScore === item.val && styles.dropdownOptionSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {openDropdown === 'degree' && (
        <View style={styles.dropdownMenu}>
          <Pressable
            onPress={() => {
              setSelectedDegree('');
              setOpenDropdown(null);
              setCurrentPage(1);
            }}
            style={styles.dropdownOption}
          >
            <Text style={[styles.dropdownOptionText, !selectedDegree && styles.dropdownOptionSelected]}>
              All Degrees
            </Text>
          </Pressable>
          {filterOptions.degrees.map((deg) => (
            <Pressable
              key={deg}
              onPress={() => {
                setSelectedDegree(deg);
                setOpenDropdown(null);
                setCurrentPage(1);
              }}
              style={styles.dropdownOption}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  selectedDegree === deg && styles.dropdownOptionSelected,
                ]}
              >
                {deg}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {openDropdown === 'date' && (
        <View style={styles.dropdownMenu}>
          {[
            { label: 'All Time', val: '' },
            { label: 'Last 7 Days', val: '7d' },
            { label: 'Last 30 Days', val: '30d' },
            { label: 'Last 90 Days', val: '90d' },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => {
                setSelectedDateRange(item.val);
                setOpenDropdown(null);
                setCurrentPage(1);
              }}
              style={styles.dropdownOption}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  selectedDateRange === item.val && styles.dropdownOptionSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* 5. Dynamic Bulk Selection Banner */}
      {selectedCount > 0 && (
        <View style={styles.bulkBanner}>
          <Text style={styles.bulkBannerTitle}>
            ✓ {selectedCount} Student{selectedCount === 1 ? '' : 's'} Selected
          </Text>

          <View style={styles.bulkActionsGroup}>
            <Pressable
              disabled={actionLoading}
              onPress={() => handleTriggerBulkProgression('SEND_TO_NEXT_ROUND')}
              style={styles.bulkActionProgression}
            >
              <Text style={styles.bulkActionProgressionText}>
                ⚡ Send Selected to Next Round
              </Text>
            </Pressable>
            <Pressable
              disabled={actionLoading}
              onPress={() => handleTriggerBulkProgression('NOT_SELECTED')}
              style={styles.bulkActionDanger}
            >
              <Text style={styles.bulkActionDangerText}>
                ✕ Mark Not Selected
              </Text>
            </Pressable>
            <Pressable
              disabled={actionLoading}
              onPress={() => handleBulkAction('SHORTLIST')}
              style={styles.bulkActionTeal}
            >
              <Text style={styles.bulkActionTealText}>
                {actionLoading ? 'Processing...' : 'Shortlist'}
              </Text>
            </Pressable>
            <Pressable
              disabled={actionLoading}
              onPress={() => handleBulkAction('UNDER_REVIEW')}
              style={styles.bulkActionOutline}
            >
              <Text style={styles.bulkActionOutlineText}>Review</Text>
            </Pressable>
            <Pressable
              disabled={actionLoading}
              onPress={() => handleBulkAction('REJECT')}
              style={styles.bulkActionDanger}
            >
              <Text style={styles.bulkActionDangerText}>Reject</Text>
            </Pressable>
            <Pressable onPress={handleExportCSV} style={styles.bulkActionOutline}>
              <Text style={styles.bulkActionOutlineText}>📥 Export CSV</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 6. Main Split View Layout (Left: Applications Table, Right: Candidate Drawer Inspection) */}
      <View style={[styles.mainSplitLayout, !isDesktop && styles.stackedLayout]}>
        {/* Left Column: Student Applications Table */}
        <View style={[styles.card, { flex: 1.3 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              Student Applications <Text style={styles.countBadge}>{pagination.total}</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Top N Quick Picker */}
              <View style={{ position: 'relative', zIndex: 30 }}>
                <Pressable
                  onPress={() => setTopNMenuOpen((prev) => !prev)}
                  style={styles.topNBtn}
                >
                  <Text style={styles.topNBtnText}>🔝 Select Top N ▾</Text>
                </Pressable>
                {topNMenuOpen && (
                  <View style={styles.topNDropdown}>
                    {[3, 5, 10, 20].map((n) => (
                      <Pressable
                        key={n}
                        onPress={() => handleSelectTopN(n)}
                        style={styles.topNOption}
                      >
                        <Text style={styles.topNOptionText}>Top {n} Candidates</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Sort by:</Text>
                <Pressable
                  onPress={() => {
                    const nextSort =
                      sortBy === 'match_score_desc'
                        ? 'applied_at_desc'
                        : sortBy === 'applied_at_desc'
                        ? 'name_asc'
                        : 'match_score_desc';
                    setSortBy(nextSort);
                  }}
                  style={styles.sortBtn}
                >
                  <Text style={styles.sortBtnText}>
                    {sortBy === 'match_score_desc'
                      ? 'Skill Match (Highest) ▾'
                      : sortBy === 'applied_at_desc'
                      ? 'Date Applied (Newest) ▾'
                      : 'Candidate Name (A-Z) ▾'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Table Header */}
          <View style={styles.thRow}>
            <Pressable onPress={toggleSelectAll} style={{ width: 28, alignItems: 'center' }}>
              <Text style={styles.checkboxText}>
                {applications.length > 0 && selectedIds.length === applications.length ? '☑' : '☐'}
              </Text>
            </Pressable>
            <Text style={[styles.thCell, { flex: 1.8 }]}>STUDENT</Text>
            <Text style={[styles.thCell, { flex: 1.3 }]}>INTERNSHIP</Text>
            <Text style={[styles.thCell, { flex: 1.1 }]}>MATCH SCORE</Text>
            <Text style={[styles.thCell, { flex: 0.9 }]}>THRESHOLD</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>ELIGIBILITY</Text>
            <Text style={[styles.thCell, { flex: 1.0 }]}>STATUS</Text>
            <Text style={[styles.thCell, { flex: 0.8, textAlign: 'right' }]}>ACTION</Text>
          </View>

          {/* Loading / Error / Empty States */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={COLORS.primaryTeal} />
              <Text style={styles.centerText}>Loading candidate applications...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              <Pressable onPress={loadApplications} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : applications.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
              <Text style={styles.emptyTitle}>No applications yet</Text>
              <Text style={styles.emptySub}>
                No candidate applications match your filters or have been submitted for your company's postings.
              </Text>
            </View>
          ) : (
            /* Table Rows */
            applications.map((cand) => {
              const isInspecting = cand.id === selectedApplicantId;
              const isSelected = selectedIds.includes(cand.id);
              const isEligible = cand.eligibility === 'Passed' || cand.eligibility === 'PASSED';
              const stStyle = getStatusStyle(cand);

              return (
                <Pressable
                  key={cand.id}
                  onPress={() => setSelectedApplicantId(cand.id)}
                  style={[styles.tdRow, isInspecting && styles.tdRowInspecting]}
                >
                  <Pressable
                    onPress={() => toggleSelectApplicant(cand.id)}
                    style={{ width: 28, alignItems: 'center' }}
                  >
                    <Text style={styles.checkboxText}>{isSelected ? '☑' : '☐'}</Text>
                  </Pressable>

                  <View style={[styles.tdCell, { flex: 1.8, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    {cand.profile_image ? (
                      <Image source={{ uri: cand.profile_image }} style={styles.avatarImg} />
                    ) : (
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{cand.avatar}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.candName}>
                        {cand.student_name}
                      </Text>
                      <Text numberOfLines={1} style={styles.candDegree}>
                        {cand.degree || 'Student'} • {cand.college || 'University'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.tdCell, { flex: 1.3 }]}>
                    <Text numberOfLines={1} style={styles.internshipName}>
                      {cand.internship_title}
                    </Text>
                    <Text numberOfLines={1} style={styles.deptName}>
                      {cand.department || 'Engineering'}
                    </Text>
                  </View>

                  <View style={[styles.tdCell, { flex: 1.1 }]}>
                    <View style={styles.matchBarRow}>
                      <View style={styles.matchTrack}>
                        <View
                          style={[
                            styles.matchFill,
                            {
                              width: `${Math.min(100, cand.match_score)}%`,
                              backgroundColor: isEligible ? COLORS.primaryTeal : '#D97706',
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.matchPctVal, !isEligible && { color: '#D97706' }]}>
                        {cand.match_score}%
                      </Text>
                    </View>
                    <Text style={styles.matchLbl}>{cand.match_label}</Text>
                  </View>

                  <View style={[styles.tdCell, { flex: 0.9 }]}>
                    <View style={styles.thresholdTablePill}>
                      <Text style={styles.thresholdTablePillText}>{cand.threshold || '80%'}</Text>
                    </View>
                  </View>

                  <View style={[styles.tdCell, { flex: 1.2 }]}>
                    <View
                      style={[
                        styles.auditBadge,
                        isEligible ? styles.auditPassBg : styles.auditWarnBg,
                      ]}
                    >
                      <Text
                        style={[
                          styles.auditBadgeText,
                          isEligible ? styles.auditPassText : styles.auditWarnText,
                        ]}
                      >
                        {isEligible ? '✓ Passed' : '⚠️ Needs Dev'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.tdCell, { flex: 1.0 }]}>
                    <View style={[styles.statusPill, { backgroundColor: stStyle.bg }]}>
                      <Text style={[styles.statusPillText, { color: stStyle.text }]}>
                        {stStyle.label}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.tdCell, { flex: 0.8, alignItems: 'flex-end' }]}>
                    <Text style={[styles.inspectBtnText, isInspecting && { fontWeight: '800' }]}>
                      {isInspecting ? '● Inspect' : 'Inspect'}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* Pagination Footer */}
          {pagination.total > 0 && (
            <View style={styles.tableFooter}>
              <Text style={styles.tableFooterText}>
                Showing {Math.min(1, pagination.total) + (pagination.page - 1) * pagination.page_size} to{' '}
                {Math.min(pagination.total, pagination.page * pagination.page_size)} of {pagination.total} student applications
              </Text>
              <View style={styles.paginationRow}>
                <Pressable
                  disabled={pagination.page <= 1}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={[styles.pageBtnPress, pagination.page <= 1 && styles.pageBtnDisabled]}
                >
                  <Text style={styles.pageBtn}>‹</Text>
                </Pressable>
                {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.total_pages || Math.abs(p - pagination.page) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prevP && p - prevP > 1 && <Text style={styles.pageBtn}>...</Text>}
                        <Pressable
                          onPress={() => setCurrentPage(p)}
                          style={[styles.pageBtnPress, p === pagination.page && styles.pageBtnActivePress]}
                        >
                          <Text
                            style={[
                              styles.pageBtn,
                              p === pagination.page && styles.pageBtnActive,
                            ]}
                          >
                            {p}
                          </Text>
                        </Pressable>
                      </React.Fragment>
                    );
                  })}
                <Pressable
                  disabled={pagination.page >= pagination.total_pages}
                  onPress={() => setCurrentPage((p) => Math.min(pagination.total_pages, p + 1))}
                  style={[styles.pageBtnPress, pagination.page >= pagination.total_pages && styles.pageBtnDisabled]}
                >
                  <Text style={styles.pageBtn}>›</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Right Column: Candidate Inspection Drawer */}
        <View style={[styles.card, styles.inspectionDrawerCard]}>
          {detailLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="small" color={COLORS.primaryTeal} />
              <Text style={styles.centerText}>Loading candidate inspection profile...</Text>
            </View>
          ) : !selectedApplicantId ? (
            <View style={styles.centerBox}>
              <Text style={{ fontSize: 24, marginBottom: 6 }}>🔍</Text>
              <Text style={styles.emptyTitle}>Select a Candidate</Text>
              <Text style={styles.emptySub}>
                Click "Inspect" on any applicant in the table to view their full evaluation and verification audit.
              </Text>
            </View>
          ) : (
            <>
              {/* Candidate Top Header */}
              <View style={styles.drawerHeader}>
                {candProfileImg ? (
                  <Image source={{ uri: candProfileImg }} style={styles.drawerAvatarImg} />
                ) : (
                  <View style={styles.drawerAvatar}>
                    <Text style={styles.drawerAvatarText}>{candAvatar}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.drawerCandidateName}>{candName}</Text>
                    <View style={[styles.statusPill, { backgroundColor: candStatusStyle.bg }]}>
                      <Text style={[styles.statusPillText, { color: candStatusStyle.text }]}>
                        {candStatusStyle.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.drawerDegreeText}>
                    {candDegree} • {candCollege} {candCgpa !== 'N/A' ? `• CGPA: ${candCgpa}` : ''}
                  </Text>
                </View>
              </View>

              {/* Applied Internship Box */}
              <View style={styles.appliedInternshipBox}>
                <Text style={styles.appliedBoxLbl}>APPLIED INTERNSHIP</Text>
                <Text style={styles.appliedBoxTitle}>
                  {candidateDetail?.internship?.title || selectedCandidateRow?.internship_title || 'Internship'}
                </Text>
                <Text style={styles.appliedBoxSub}>
                  {candidateDetail?.internship?.location_type || 'Work Mode'} • Threshold: {candThreshold} • Applied{' '}
                  {candidateDetail?.applied_at_formatted || selectedCandidateRow?.applied_time || 'Recently'}
                </Text>
              </View>

              {/* Assessment Progression Section (Only when active pipeline is configured) */}
              {(() => {
                const progression = candidateDetail?.assessment_progression || selectedCandidateRow?.assessment_progression || {};
                if (progression.has_pipeline === false) return null;

                const isSelected = progression.is_selected || candStatus === 'SELECTED' || candStatus === 'HIRED';
                const isFinal = progression.is_final_round;
                const isNotSelected = progression.qualification_status === 'NOT_SELECTED' || candStatus === 'NOT_SELECTED' || candStatus === 'REJECTED';

                return (
                  <View style={styles.progressionDrawerCard}>
                    <View style={styles.progressionHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 16 }}>⚡</Text>
                        <Text style={styles.progressionTitle}>Assessment Progression</Text>
                      </View>
                      <View
                        style={[
                          styles.qualBadge,
                          isSelected ? styles.qualPassBg :
                          isFinal ? styles.qualSelectedBg :
                          isNotSelected ? styles.qualRejectBg : styles.qualPassBg
                        ]}
                      >
                        <Text
                          style={[
                            styles.qualBadgeText,
                            isSelected ? styles.qualPassText :
                            isFinal ? styles.qualSelectedText :
                            isNotSelected ? styles.qualRejectText : styles.qualPassText
                          ]}
                        >
                          {isSelected ? '★ SELECTED' :
                           isFinal ? '🏁 FINAL ROUND' :
                           isNotSelected ? '✕ NOT SELECTED' : '● IN PIPELINE'}
                        </Text>
                      </View>
                    </View>

                    {/* 4-Metric Grid */}
                    <View style={styles.progressionGrid}>
                      <View style={styles.progMetricItem}>
                        <Text style={styles.progMetricLbl}>Current Round</Text>
                        <Text style={styles.progMetricVal}>{progression.current_round_name || 'Aptitude'}</Text>
                        <Text style={styles.progMetricSub}>
                          {isFinal ? 'Final Assessment Stage' : `Stage ${(progression.current_round_index ?? 0) + 1} of ${progression.total_rounds || 4}`}
                        </Text>
                      </View>
                      <View style={styles.progMetricItem}>
                        <Text style={styles.progMetricLbl}>Candidate Rank</Text>
                        <Text style={styles.progMetricVal}>
                          #{progression.rank || 1} <Text style={{ fontSize: 11, color: COLORS.textMuted }}>/ {progression.total_candidates_in_round || 1}</Text>
                        </Text>
                        <Text style={styles.progMetricSub}>In Current Round</Text>
                      </View>
                      <View style={styles.progMetricItem}>
                        <Text style={styles.progMetricLbl}>Assessment Score</Text>
                        <Text style={styles.progMetricVal}>{progression.assessment_score ?? 80}%</Text>
                        <Text style={styles.progMetricSub}>Cutoff: {progression.passing_threshold ?? 70}%</Text>
                      </View>
                      <View style={styles.progMetricItem}>
                        <Text style={styles.progMetricLbl}>Integrity Audit</Text>
                        <Text
                          style={[
                            styles.progMetricVal,
                            { color: progression.integrity_status === 'VERIFIED' ? COLORS.greenPillText : COLORS.redPillText }
                          ]}
                        >
                          {progression.integrity_status === 'VERIFIED' ? '✓ Clear & Verified' : (progression.integrity_status || 'Verified')}
                        </Text>
                        <Text style={styles.progMetricSub}>AI Proctoring</Text>
                      </View>
                    </View>

                    {/* Next Round & Progression Action Box */}
                    <View style={styles.progressionActionBox}>
                      <Text style={styles.progressionActionHeading}>
                        {isSelected
                          ? '🎉 SELECTED · Pipeline Completed'
                          : isFinal
                          ? `🏆 Final Round: ${progression.current_round_name || 'Final Stage'}`
                          : `⏩ Next: ${progression.next_round_name || 'Technical Assessment'}`}
                      </Text>
                      <Text style={styles.progressionActionDesc}>
                        {isSelected
                          ? 'Candidate has been selected for the internship. No further assessment rounds required.'
                          : isFinal
                          ? 'Candidate has reached the final configured assessment round. Clicking Select Candidate moves status to SELECTED.'
                          : `Candidate is shortlisted. Clicking Send to Next Round advances them directly to ${progression.next_round_name || 'the next round'} in the student dashboard.`}
                      </Text>

                      {!isSelected && (
                        <View style={styles.progressionButtonsRow}>
                          {isFinal ? (
                            <Pressable
                              disabled={actionLoading}
                              onPress={() => handleProgressSingleCandidate('SELECT_CANDIDATE')}
                              style={[styles.progSelectBtn, { backgroundColor: '#15803D' }, actionLoading && { opacity: 0.6 }]}
                            >
                              <Text style={styles.progSelectBtnText}>
                                ✨ Select Candidate
                              </Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              disabled={actionLoading}
                              onPress={() => handleProgressSingleCandidate('SEND_TO_NEXT_ROUND')}
                              style={[styles.progSelectBtn, actionLoading && { opacity: 0.6 }]}
                            >
                              <Text style={styles.progSelectBtnText}>
                                ⚡ Send to Next Round
                              </Text>
                            </Pressable>
                          )}
                          <Pressable
                            disabled={actionLoading}
                            onPress={() => handleProgressSingleCandidate('NOT_SELECTED')}
                            style={[styles.progRejectBtn, actionLoading && { opacity: 0.6 }]}
                          >
                            <Text style={styles.progRejectBtnText}>✕ Not Selected</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {/* Open Full Evaluation Modal */}
                    <Pressable
                      onPress={() => handleOpenCandidateEvaluation()}
                      style={styles.openEvalModalBtn}
                    >
                      <Text style={styles.openEvalModalBtnText}>
                        🔍 Candidate Evaluation & Full Audit ↗
                      </Text>
                    </Pressable>
                  </View>
                );
              })()}

              {/* AI Screening Audit Box */}
              <View style={styles.aiAuditCard}>
                <View style={styles.aiAuditHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16 }}>✨</Text>
                    <Text style={styles.aiAuditTitle}>AI Screening Audit</Text>
                  </View>
                  <View style={styles.mintMatchBadge}>
                    <Text style={styles.mintMatchText}>
                      {hasAiScreening ? `${aiScreening.overall_score}% Total Match` : 'Screening In Progress'}
                    </Text>
                  </View>
                </View>

                {hasAiScreening ? (
                  <>
                    <View style={styles.aiScoresGrid}>
                      <Text style={styles.aiScoreItem}>
                        Required Skills: <Text style={{ fontWeight: '800' }}>{aiScreening.required_skills_score ?? candMatchScore}%</Text>
                      </Text>
                      <Text style={styles.aiScoreItem}>
                        Resume Evaluation: <Text style={{ fontWeight: '800' }}>{aiScreening.resume_score ?? 85}%</Text>
                      </Text>
                      <Text style={styles.aiScoreItem}>
                        Project Quality: <Text style={{ fontWeight: '800' }}>{aiScreening.project_score ?? 90}%</Text>
                      </Text>
                      <Text style={styles.aiScoreItem}>
                        Technical Assessment: <Text style={{ fontWeight: '800' }}>{aiScreening.technical_score ?? 88}%</Text>
                      </Text>
                    </View>
                    <Text style={styles.academicsText}>
                      Eligibility Audit: {isCandidateEligible ? 'Passed Criteria' : 'Needs Development'}
                    </Text>

                    {aiScreening.recommendation_note && (
                      <View style={styles.aiNoteCard}>
                        <Text style={styles.aiNoteText}>
                          <Text style={{ fontWeight: '800' }}>AI Recommendation:</Text> {aiScreening.recommendation_note}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.aiNoteCard}>
                    <Text style={styles.aiNoteText}>
                      <Text style={{ fontWeight: '800' }}>Canonical Match Evaluation:</Text> Current candidate match is{' '}
                      {candMatchScore}% based on canonical verified skill evidence from student portfolio.
                    </Text>
                  </View>
                )}
              </View>

              {/* Skill Match Breakdown */}
              <View style={styles.skillBreakdownSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.sectionHeading}>Skill Match Breakdown</Text>
                  <Text style={styles.sectionScoreText}>{candMatchScore}% Overall</Text>
                </View>

                {canonicalSkills.length > 0 ? (
                  <View style={styles.skillBarsList}>
                    {canonicalSkills.map((sk, i) => {
                      const req = sk.required_level || 75;
                      const stud = sk.student_level ?? sk.score ?? 0;
                      const gap = stud - req;
                      const gapLabel = gap >= 0 ? `+${gap}` : `${gap}`;
                      const isVerified = sk.is_verified || stud >= req;

                      return (
                        <SkillBar
                          key={sk.skill_id || sk.name || i}
                          label={sk.name || sk.skill_name}
                          pct={`${Math.min(100, Math.max(5, stud))}%`}
                          level={`Req: ${req} | Stud: ${stud} (${gapLabel})`}
                          color={isVerified ? COLORS.primaryTeal : '#D97706'}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.emptySmallText}>No specific skill breakdown available</Text>
                )}

                {candidateDetail?.skill_chips && candidateDetail.skill_chips.length > 0 && (
                  <View style={styles.skillChipsRow}>
                    {candidateDetail.skill_chips.map((sk, i) => (
                      <View key={i} style={styles.skillChipTag}>
                        <Text style={styles.skillChipTagText}>{sk}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Verified Student Resume Box */}
              <View style={styles.resumeCard}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.resumeCardTitle}>Verified Student Resume</Text>
                    {resumeInfo?.ats_score && (
                      <Text style={styles.resumeScoreText}>Score: {resumeInfo.ats_score}/100</Text>
                    )}
                  </View>

                  {resumeInfo?.url || resumeInfo?.file_name ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <Text style={{ fontSize: 18 }}>📄</Text>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.resumeFileName}>
                          {resumeInfo.file_name || `${candName.replace(/\s+/g, '_')}_Resume.pdf`}
                        </Text>
                        <Text style={styles.resumeFileMeta}>
                          {resumeInfo.updated_at ? `Updated ${resumeInfo.updated_at}` : 'Uploaded'}
                        </Text>
                      </View>
                      {resumeInfo.url && (
                        <Pressable
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              window.open(resumeInfo.url, '_blank');
                            } else {
                              Linking.openURL(resumeInfo.url);
                            }
                          }}
                          style={styles.iconBtn}
                        >
                          <Text>👁️</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <Text style={[styles.emptySmallText, { marginTop: 6 }]}>Resume not uploaded</Text>
                  )}
                </View>
              </View>

              {/* Verified Projects (Code Proof) */}
              <View style={styles.codeProofSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.sectionHeading}>Verified Projects (Code Proof)</Text>
                  {verifiedProjects.length > 0 && (
                    <Text style={styles.verifiedCountBadge}>
                      {verifiedProjects.length} Repositor{verifiedProjects.length === 1 ? 'y' : 'ies'}
                    </Text>
                  )}
                </View>

                {verifiedProjects.length > 0 ? (
                  <View style={styles.projectsList}>
                    {verifiedProjects.map((proj, i) => {
                      const repoName = proj.name || proj.repo_name || proj.title || 'repository';
                      const repoUrl = proj.html_url || proj.github_url || proj.url || (proj.name ? `https://github.com/${proj.name}` : '');
                      return (
                        <Pressable
                          key={proj.id || i}
                          onPress={() => {
                            if (repoUrl) {
                              if (Platform.OS === 'web') {
                                window.open(repoUrl, '_blank', 'noopener,noreferrer');
                              } else {
                                Linking.openURL(repoUrl);
                              }
                            }
                          }}
                          style={({ hovered, pressed }) => [
                            styles.projectItem,
                            hovered && styles.projectItemHovered,
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Text style={{ fontSize: 13 }}>📁</Text>
                          <Text numberOfLines={1} style={styles.projectTitle}>
                            {repoName}
                          </Text>
                          <Text style={styles.projectExtLink}>↗️</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.emptySmallText}>No verified projects uploaded</Text>
                )}
              </View>

              {/* Application Audit Timeline */}
              <View style={styles.timelineSection}>
                <Text style={styles.sectionHeading}>Application Audit Timeline</Text>
                <View style={styles.timelineList}>
                  {timelineEvents.length > 0 ? (
                    timelineEvents.map((evt, i) => (
                      <TimelineItem
                        key={evt.id || i}
                        time={evt.timestamp || 'Event'}
                        text={evt.message || evt.event_name}
                      />
                    ))
                  ) : (
                    <>
                      <TimelineItem
                        time="Applied"
                        text={`Application received for ${candidateDetail?.internship?.title || 'Internship'}`}
                      />
                      <TimelineItem
                        time="Status"
                        text={`Current status: ${candStatusStyle.label}`}
                      />
                    </>
                  )}
                </View>
              </View>

              {/* Internal Recruiter Notes */}
              <View style={styles.notesSection}>
                <Text style={styles.sectionHeading}>Internal Recruiter Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  multiline
                  numberOfLines={3}
                  value={recruiterNotes}
                  onChangeText={setRecruiterNotes}
                  placeholder="Add recruiter feedback or interview notes..."
                />
                {!!noteSavedMsg && <Text style={styles.noteSavedText}>✓ {noteSavedMsg}</Text>}
                <Pressable onPress={handleSaveNotes} style={styles.saveNoteBtn}>
                  <Text style={styles.saveNoteText}>Save Note</Text>
                </Pressable>
              </View>

              {/* Bottom Primary Actions */}
              <View style={styles.drawerFooterActions}>
                <Pressable
                  disabled={actionLoading}
                  onPress={() => handleSingleAction('INTERVIEW')}
                  style={styles.scheduleInterviewBigBtn}
                >
                  <Text style={styles.scheduleInterviewBigText}>📅 Schedule Interview</Text>
                </Pressable>

                <View style={styles.drawerFooterSecondaryRow}>
                  {candStatus === 'SHORTLISTED' ? (
                    <Pressable
                      disabled={actionLoading}
                      onPress={() => handleSingleAction('UNSHORTLIST')}
                      style={styles.actionPillBtn}
                    >
                      <Text style={styles.actionPillText}>Un-shortlist</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      disabled={actionLoading}
                      onPress={() => handleSingleAction('SHORTLIST')}
                      style={styles.actionPillBtn}
                    >
                      <Text style={styles.actionPillText}>Shortlist</Text>
                    </Pressable>
                  )}

                  <Pressable
                    disabled={actionLoading}
                    onPress={() => handleSingleAction('UNDER_REVIEW')}
                    style={styles.actionPillBtn}
                  >
                    <Text style={styles.actionPillText}>Move to Review</Text>
                  </Pressable>

                  <Pressable
                    disabled={actionLoading}
                    onPress={() => handleSingleAction('REJECT')}
                    style={styles.actionPillDangerBtn}
                  >
                    <Text style={styles.actionPillDangerText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* 7. Footer */}
      <View style={styles.footerBar}>
        <Text style={styles.copyrightText}>
          © 2026 SkillSetu Career Architecture Platform. All rights reserved.
        </Text>
        <View style={styles.footerLinksRow}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerLink}>Support</Text>
        </View>
      </View>

      {/* Bulk Progression Confirmation Modal */}
      <Modal
        visible={showBulkProgressionConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBulkProgressionConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalBox}>
            <View style={styles.confirmModalHeader}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>
                {bulkProgressionAction === 'NOT_SELECTED' ? '⚠️' : '⚡'}
              </Text>
              <Text style={styles.confirmModalTitle}>
                {bulkProgressionAction === 'NOT_SELECTED'
                  ? 'Confirm Bulk Non-Selection'
                  : 'Confirm Candidate Progression'}
              </Text>
            </View>

            {(() => {
              const firstSelectedApp = applications.find((a) => selectedIds.includes(a.id));
              const nextRoundName =
                firstSelectedApp?.assessment_progression?.next_round_name ||
                firstSelectedApp?.assessment_progression?.current_round_name ||
                'Next Assessment Round';
              const isFinal = firstSelectedApp?.assessment_progression?.is_final_round;

              return (
                <View style={styles.confirmModalBody}>
                  <Text style={styles.confirmModalMessage}>
                    {bulkProgressionAction === 'NOT_SELECTED'
                      ? `${selectedIds.length} candidate${selectedIds.length > 1 ? 's' : ''} will be marked as Not Selected for this round.`
                      : isFinal
                      ? `${selectedIds.length} candidate${selectedIds.length > 1 ? 's' : ''} will be permanently selected (status: SELECTED).`
                      : `${selectedIds.length} candidate${selectedIds.length > 1 ? 's' : ''} will move to ${nextRoundName}.`}
                  </Text>
                  <Text style={styles.confirmModalSubText}>
                    This action is authoritative and will immediately update candidate records in PostgreSQL, notify student dashboards, and preserve auditable assessment history.
                  </Text>
                </View>
              );
            })()}

            <View style={styles.confirmModalActions}>
              <Pressable
                onPress={() => setShowBulkProgressionConfirm(false)}
                style={styles.confirmCancelBtn}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={actionLoading}
                onPress={handleConfirmBulkProgression}
                style={[
                  styles.confirmSubmitBtn,
                  bulkProgressionAction === 'NOT_SELECTED' && styles.confirmSubmitDangerBtn,
                  actionLoading && { opacity: 0.6 },
                ]}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmSubmitBtnText}>
                    {bulkProgressionAction === 'NOT_SELECTED'
                      ? 'Confirm Non-Selection'
                      : 'Confirm & Advance'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Candidate Evaluation Modal */}
      <CandidateEvaluationModal
        visible={evalModalVisible}
        onClose={() => setEvalModalVisible(false)}
        token={token}
        internshipId={evalModalInternshipId}
        applicationId={evalModalAppId}
        onStatusUpdated={async () => {
          await Promise.all([loadSummary(), loadApplications()]);
          if (selectedApplicantId) {
            loadCandidateDetail(selectedApplicantId);
          }
        }}
      />
    </ScrollView>
  );
}

function SkillBar({ label, pct, level, color }) {
  return (
    <View style={styles.skillBarItem}>
      <View style={styles.skillBarTop}>
        <Text style={styles.skillBarLbl}>{label}</Text>
        <Text style={styles.skillBarVal}>{level}</Text>
      </View>
      <View style={styles.skillTrack}>
        <View style={[styles.skillFill, { width: pct, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function TimelineItem({ time, text, isUpcoming }) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, isUpcoming && styles.timelineDotUpcoming]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.timelineTime, isUpcoming && styles.timelineTimeUpcoming]}>
          {time}
        </Text>
        <Text style={styles.timelineText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    padding: 24,
    gap: 20,
  },
  topHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  titleGroup: {},
  breadcrumbText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  breadcrumbHighlight: {
    color: COLORS.primaryTeal,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 2,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoScreenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  autoScreenText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  exportBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metricCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textDark,
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  normalizedBadge: {
    backgroundColor: COLORS.grayBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  normalizedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  funnelStepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  funnelBox: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
  },
  funnelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  funnelStepTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  funnelPct: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  funnelNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4,
  },
  funnelSub: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  trackBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 8,
  },
  fillBar: {
    height: '100%',
    borderRadius: 2,
  },
  filterControlsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    position: 'relative',
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    minWidth: 200,
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textDark,
    paddingVertical: 2,
  },
  filterDropBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterDropBtnActive: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.mintBorder,
  },
  filterDropText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  filterDropTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  clearFiltersText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  dropdownOptionText: {
    fontSize: 12,
    color: COLORS.textDark,
  },
  dropdownOptionSelected: {
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  bulkBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryTeal,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  bulkBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bulkActionsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bulkActionTeal: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkActionTealText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  bulkActionOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkActionOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bulkActionDanger: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkActionDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mainSplitLayout: {
    flexDirection: 'row',
    gap: 20,
  },
  stackedLayout: {
    flexDirection: 'column',
  },
  countBadge: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  sortBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  thRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  checkboxText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdRowInspecting: {
    backgroundColor: COLORS.mintBg,
  },
  tdCell: {},
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  candName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  candDegree: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  internshipName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  deptName: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  matchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchTrack: {
    width: 45,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  matchFill: {
    height: '100%',
    borderRadius: 3,
  },
  matchPctVal: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  matchLbl: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  auditBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  thresholdTablePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignSelf: 'flex-start',
  },
  thresholdTablePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  auditPassBg: { backgroundColor: COLORS.greenPillBg },
  auditWarnBg: { backgroundColor: COLORS.orangePillBg },
  auditFlagBg: { backgroundColor: COLORS.redPillBg },
  auditBadgeText: { fontSize: 10, fontWeight: '700' },
  auditPassText: { color: COLORS.greenPillText },
  auditWarnText: { color: COLORS.orangePillText },
  auditFlagText: { color: COLORS.redPillText },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  tableFooterText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageBtnPress: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pageBtnActivePress: {
    backgroundColor: COLORS.primaryTeal,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtn: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pageBtnActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Right Drawer Inspection Panel
  inspectionDrawerCard: {
    flex: 1,
    minWidth: 320,
    borderColor: COLORS.primaryTeal,
  },
  drawerHeader: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  drawerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  drawerCandidateName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  drawerDegreeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  appliedInternshipBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appliedBoxLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  appliedBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 2,
  },
  appliedBoxSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  aiAuditCard: {
    backgroundColor: COLORS.mintBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 12,
  },
  aiAuditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiAuditTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  mintMatchBadge: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mintMatchText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiScoresGrid: {
    gap: 4,
  },
  aiScoreItem: {
    fontSize: 11,
    color: COLORS.primaryTeal,
  },
  academicsText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
    marginTop: 6,
  },
  aiNoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  aiNoteText: {
    fontSize: 10,
    color: COLORS.textDark,
    lineHeight: 14,
  },
  skillBreakdownSection: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  sectionScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  skillBarsList: {
    gap: 6,
    marginVertical: 6,
  },
  skillBarItem: {},
  skillBarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skillBarLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  skillBarVal: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  skillTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 2,
  },
  skillFill: {
    height: '100%',
    borderRadius: 2,
  },
  skillChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  skillChipTag: {
    backgroundColor: COLORS.grayBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillChipTagText: {
    fontSize: 10,
    color: COLORS.textDark,
  },
  resumeCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  resumeCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  resumeScoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  resumeFileName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  resumeFileMeta: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  iconBtn: {
    padding: 4,
  },
  codeProofSection: {
    marginBottom: 14,
  },
  verifiedCountBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  projectsList: {
    gap: 6,
    marginTop: 4,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    cursor: 'pointer',
  },
  projectItemHovered: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.mintBorder,
  },
  projectTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  projectExtLink: {
    fontSize: 10,
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  timelineSection: {
    marginBottom: 12,
  },
  timelineList: {
    gap: 8,
    marginTop: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryTeal,
    marginTop: 4,
  },
  timelineDotUpcoming: {
    backgroundColor: COLORS.orangePillText,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  timelineTimeUpcoming: {
    color: COLORS.orangePillText,
  },
  timelineText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  notesSection: {
    marginBottom: 14,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 11,
    color: COLORS.textDark,
    height: 60,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  noteSavedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.greenPillText,
    marginTop: 4,
  },
  saveNoteBtn: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.grayBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  saveNoteText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  drawerFooterActions: {
    gap: 8,
  },
  scheduleInterviewBigBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  scheduleInterviewBigText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  drawerFooterSecondaryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionPillBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  actionPillDangerBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionPillDangerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  footerBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  copyrightText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footerLinksRow: {
    flexDirection: 'row',
    gap: 16,
  },
  footerLink: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  centerBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  centerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  emptySub: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
  emptySmallText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.redPillText,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Bulk Progression & Top N Styles
  bulkActionProgression: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkActionProgressionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  topNBtn: {
    backgroundColor: '#E6F4F1',
    borderWidth: 1,
    borderColor: '#B2DFDB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  topNBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  topNDropdown: {
    position: 'absolute',
    top: 30,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  topNOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topNOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },

  // Assessment Progression Drawer Card
  progressionDrawerCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  progressionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  qualBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  qualBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  qualPassBg: {
    backgroundColor: '#DCFCE7',
  },
  qualPassText: {
    color: '#15803D',
  },
  qualSelectedBg: {
    backgroundColor: '#E0F2FE',
  },
  qualSelectedText: {
    color: '#0369A1',
  },
  qualRejectBg: {
    backgroundColor: '#F1F5F9',
  },
  qualRejectText: {
    color: '#64748B',
  },
  qualFailBg: {
    backgroundColor: '#FEE2E2',
  },
  qualFailText: {
    color: '#B91C1C',
  },
  progressionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  progMetricItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 8,
    padding: 8,
  },
  progMetricLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F766E',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 2,
  },
  progMetricSub: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  progressionActionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    padding: 10,
    marginBottom: 10,
  },
  progressionActionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 2,
  },
  progressionActionDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 14,
    marginBottom: 8,
  },
  progressionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  progSelectBtn: {
    flex: 2,
    backgroundColor: '#0D9488',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progSelectBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  progRejectBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progRejectBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  openEvalModalBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0D9488',
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openEvalModalBtnText: {
    color: '#0D9488',
    fontSize: 11,
    fontWeight: '700',
  },

  // Modal Overlay & Confirmation Box
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  confirmModalBody: {
    marginBottom: 20,
  },
  confirmModalMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 20,
    marginBottom: 8,
  },
  confirmModalSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  confirmCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  confirmSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSubmitDangerBtn: {
    backgroundColor: '#DC2626',
  },
  confirmSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
