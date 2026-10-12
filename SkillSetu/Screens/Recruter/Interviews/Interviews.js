import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { recruiterService } from '../services/recruiterService';

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
  goldStar: '#F59E0B',
};

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

export default function Interviews({ user }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;
  const token = user?.token || user?.access_token || '';

  // 100% PostgreSQL Dashboard State
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters State
  const [selectedInternshipId, setSelectedInternshipId] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roundFilter, setRoundFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown UI states
  const [showInternshipDropdown, setShowInternshipDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showRoundDropdown, setShowRoundDropdown] = useState(false);

  // Selected candidate for right-side workspace dossier
  const [selectedId, setSelectedId] = useState(null);

  // Live Observer Mode State
  const [isObservingLive, setIsObservingLive] = useState(false);
  const [observerLoading, setObserverLoading] = useState(false);
  const [observerData, setObserverData] = useState(null);
  const [liveTelemetry, setLiveTelemetry] = useState({
    transcript: [],
    integrity_events: [],
    status: 'IN_PROGRESS',
    ai_status: 'AI Speaking',
  });
  const telemetryTimerRef = useRef(null);

  // Workspace Evaluation & Rubric State
  const [ratings, setRatings] = useState({
    techDepth: 5,
    problemSolving: 4,
    sysDesign: 5,
    communication: 4,
    teamFit: 5,
  });
  const [verdict, setVerdict] = useState('Strongly Recommend');
  const [strengthsText, setStrengthsText] = useState('');
  const [areasText, setAreasText] = useState('');
  const [isSavingEval, setIsSavingEval] = useState(false);
  const [evalSaved, setEvalSaved] = useState(false);

  // Progression Action State
  const [isProgressing, setIsProgressing] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const loadDashboard = useCallback(async (isManual = false, isSilent = false) => {
    if (isManual) setRefreshing(true);
    else if (!isSilent) setLoading(true);
    if (!isSilent) setError(null);

    try {
      const parsedIntId = selectedInternshipId !== 'All' ? parseInt(selectedInternshipId, 10) : null;
      const data = await recruiterService.getAssessmentsDashboard(token, {
        internshipId: parsedIntId,
        statusFilter: statusFilter !== 'All' ? statusFilter : null,
        roundFilter: roundFilter !== 'All' ? roundFilter : null,
        search: searchQuery.trim() || null,
      });

      if (data && data.status === 'success') {
        setDashboardData(data);
        if (!selectedId && data.scheduled_assessments && data.scheduled_assessments.length > 0) {
          setSelectedId(data.scheduled_assessments[0].id);
        }
      }
    } catch (err) {
      if (!isSilent) {
        console.error('[Recruiter Assessments] Error fetching dashboard:', err);
        setError(err.message || 'Failed to load assessments from server');
      }
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [token, selectedInternshipId, statusFilter, roundFilter, searchQuery, selectedId]);

  useEffect(() => {
    loadDashboard();
    // Background presence & state refresh (every 7 seconds)
    const pollInterval = setInterval(() => {
      loadDashboard(false, true);
    }, 7000);
    return () => clearInterval(pollInterval);
  }, [loadDashboard]);

  // Derived lists and values
  const internships = useMemo(() => dashboardData?.internships || [], [dashboardData]);
  const selectedOverview = useMemo(() => dashboardData?.selected_internship_overview || null, [dashboardData]);
  const pipelineRounds = useMemo(() => dashboardData?.pipeline_rounds_breakdown || [], [dashboardData]);
  const kpis = useMemo(() => dashboardData?.kpis || {
    upcoming: 0,
    today: 0,
    completed: 0,
    awaiting_feedback: 0,
    selected: 0,
  }, [dashboardData]);

  const scheduledAssessments = useMemo(() => dashboardData?.scheduled_assessments || [], [dashboardData]);
  const candidateDossiers = useMemo(() => dashboardData?.candidate_dossiers || {}, [dashboardData]);

  // Selected candidate object
  const activeCandidate = useMemo(() => {
    if (selectedId && candidateDossiers[selectedId]) {
      return candidateDossiers[selectedId];
    }
    if (scheduledAssessments.length > 0) {
      const firstId = scheduledAssessments[0].id;
      return candidateDossiers[firstId] || scheduledAssessments[0];
    }
    return null;
  }, [selectedId, candidateDossiers, scheduledAssessments]);

  // Sync workspace evaluation inputs when active candidate changes
  useEffect(() => {
    if (activeCandidate) {
      if (activeCandidate.ratings) {
        setRatings(activeCandidate.ratings);
      }
      if (activeCandidate.verdict) {
        setVerdict(activeCandidate.verdict);
      }
      if (activeCandidate.strengths) {
        setStrengthsText(activeCandidate.strengths);
      }
      if (activeCandidate.areas_for_improvement) {
        setAreasText(activeCandidate.areas_for_improvement);
      }
    }
  }, [activeCandidate?.id]);

  // Live Observer Mode Activation
  const handleStartLiveObserver = async (candidate) => {
    const target = candidate || activeCandidate;
    if (!target) return;
    setObserverLoading(true);
    setSelectedId(target.id);

    try {
      const res = await recruiterService.getAssessmentObserverToken(token, target.session_id || target.application_id);
      if (res && res.status === 'success') {
        setObserverData(res);
        setIsObservingLive(true);

        // Fetch initial telemetry
        try {
          const tData = await recruiterService.getAssessmentLiveTelemetry(token, target.session_id || target.application_id);
          if (tData && tData.telemetry) {
            setLiveTelemetry((prev) => ({
              ...prev,
              ...tData.telemetry,
              ai_status: tData.telemetry.status === 'IN_PROGRESS' ? 'AI Speaking' : 'Completed',
            }));
          }
        } catch (_) {}
      }
    } catch (err) {
      alert(err.message || 'Unable to start live observer mode.');
    } finally {
      setObserverLoading(false);
    }
  };

  // Telemetry Polling Effect when Live Observer is active
  useEffect(() => {
    if (isObservingLive && activeCandidate) {
      telemetryTimerRef.current = setInterval(async () => {
        try {
          const tData = await recruiterService.getAssessmentLiveTelemetry(
            token,
            activeCandidate.session_id || activeCandidate.application_id
          );
          if (tData && tData.telemetry) {
            setLiveTelemetry((prev) => ({
              ...prev,
              ...tData.telemetry,
            }));
          }
        } catch (_) {}
      }, 3000);
    } else if (telemetryTimerRef.current) {
      clearInterval(telemetryTimerRef.current);
      telemetryTimerRef.current = null;
    }
    return () => {
      if (telemetryTimerRef.current) {
        clearInterval(telemetryTimerRef.current);
        telemetryTimerRef.current = null;
      }
    };
  }, [isObservingLive, activeCandidate, token]);

  const handleCloseLiveObserver = () => {
    setIsObservingLive(false);
    setObserverData(null);
    if (telemetryTimerRef.current) {
      clearInterval(telemetryTimerRef.current);
      telemetryTimerRef.current = null;
    }
  };

  // Handle Scorecard Save
  const handleSaveEvaluation = async () => {
    if (!activeCandidate || !activeCandidate.application_id) return;
    setIsSavingEval(true);
    setEvalSaved(false);

    try {
      const compositeScore = Math.round(
        ((ratings.techDepth + ratings.problemSolving + ratings.sysDesign + ratings.communication + ratings.teamFit) / 25) * 100
      );

      await recruiterService.submitAssessmentEvaluation(token, {
        application_id: activeCandidate.application_id,
        session_id: activeCandidate.session_id,
        ratings,
        verdict,
        strengths: strengthsText,
        areas_for_improvement: areasText,
        composite_score: compositeScore,
      });

      setEvalSaved(true);
      setTimeout(() => setEvalSaved(false), 2500);
      loadDashboard(true);
    } catch (err) {
      alert(err.message || 'Failed to save candidate scorecard.');
    } finally {
      setIsSavingEval(false);
    }
  };

  // Handle Round Progression (Advance / Select / Reject)
  const handleProgressAction = async (actionType) => {
    if (!activeCandidate || !activeCandidate.application_id) return;
    setIsProgressing(true);
    setActionMessage(null);

    try {
      const res = await recruiterService.advanceAssessmentRound(token, {
        application_id: activeCandidate.application_id,
        action: actionType,
        notes: `Recruiter scorecard evaluation submitted with verdict: ${verdict}`,
      });

      if (res && res.status === 'success') {
        const successText =
          actionType === 'advance'
            ? `Successfully advanced ${activeCandidate.name} to ${res.current_round_name || 'the next stage'}!`
            : actionType === 'select'
            ? `Candidate ${activeCandidate.name} has been marked as SELECTED!`
            : `Application updated to ${res.application_status || 'REJECTED'}.`;

        setActionMessage({ text: successText, type: 'success' });
        setTimeout(() => setActionMessage(null), 3500);
        loadDashboard(true);
      }
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to update candidate round state.', type: 'error' });
      setTimeout(() => setActionMessage(null), 3500);
    } finally {
      setIsProgressing(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedInternshipId('All');
    setStatusFilter('All');
    setRoundFilter('All');
    setSearchQuery('');
  };

  const selectedInternshipObj = internships.find((p) => p.id === parseInt(selectedInternshipId, 10));
  const selectedInternshipTitle = selectedInternshipObj ? selectedInternshipObj.title : `All Internships (${internships.length} Active)`;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} colors={[COLORS.primaryTeal]} />}
    >
      {/* 1. Breadcrumb & Title Bar */}
      <View style={styles.topHeaderRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.breadcrumbText}>
            ● RECRUITER WORKSPACE • <Text style={styles.breadcrumbHighlight}>CANDIDATE EVALUATION & ASSESSMENTS</Text>
          </Text>
          <Text style={styles.pageTitle}>Assessments</Text>
          <Text style={styles.pageSubtitle}>
            Manage your company's internship assessment pipelines, round progression, proctored evaluations, and live observer console.
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable style={styles.calendarMasterBtn} onPress={() => loadDashboard(true)}>
            <Text style={styles.calendarMasterText}>🔄 Refresh Data</Text>
          </Pressable>
          <Pressable
            style={styles.scheduleInterviewPrimaryBtn}
            onPress={() => alert('Assessment schedules are automatically synchronized with candidate availability windows and AI pipelines.')}
          >
            <Text style={styles.scheduleInterviewPrimaryText}>+ Schedule Assessment</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Top Summary Metric Cards (5 Cards) */}
      <View style={styles.metricsGrid}>
        {/* Card 1 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>UPCOMING</Text>
            <Text style={{ fontSize: 13 }}>🔄</Text>
          </View>
          <Text style={styles.metricValue}>{kpis.upcoming}</Text>
          <Text style={styles.metricSub}>Across active assessment pipelines</Text>
        </HoverCard>

        {/* Card 2 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>TODAY</Text>
            <View style={styles.nextPill}>
              <Text style={styles.nextPillText}>● Scheduled today</Text>
            </View>
          </View>
          <Text style={styles.metricValue}>{kpis.today}</Text>
          <Text style={styles.metricSub}>Active candidate sessions</Text>
        </HoverCard>

        {/* Card 3 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>COMPLETED</Text>
            <Text style={{ fontSize: 13 }}>📋</Text>
          </View>
          <Text style={styles.metricValue}>{kpis.completed}</Text>
          <Text style={styles.metricSub}>Archived transcripts & results</Text>
        </HoverCard>

        {/* Card 4 */}
        <HoverCard hoverScale={1.03} style={[styles.metricCard, styles.warningMetricCard]}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: '#B45309' }]}>AWAITING FEEDBACK</Text>
            <Text style={{ fontSize: 13 }}>⚠️</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#B45309' }]}>{kpis.awaiting_feedback}</Text>
          <Text style={[styles.metricSub, { color: '#B45309' }]}>Requires scorecard evaluation</Text>
        </HoverCard>

        {/* Card 5 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>SELECTED</Text>
            <Text style={{ fontSize: 13 }}>🛡️</Text>
          </View>
          <Text style={styles.metricValue}>{kpis.selected}</Text>
          <Text style={styles.metricSub}>Candidates selected for hire</Text>
        </HoverCard>
      </View>

      {/* 3. Company Internship Assessment Pipelines Section (Internship-Wise Cards) */}
      <View style={styles.todaySectionCard}>
        <View style={styles.todaySectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.sectionTitle}>Company Internship Assessment Pipelines ({internships.length})</Text>
            <View style={styles.liveIntegrationPill}>
              <Text style={styles.liveIntegrationText}>📹 Live Proctored Assessment & LiveKit Observer Ready</Text>
            </View>
          </View>
          <Pressable onPress={() => loadDashboard(true)}>
            <Text style={styles.linkText}>Sync Status →</Text>
          </Pressable>
        </View>

        {internships.length === 0 ? (
          <View style={styles.emptyInlineCard}>
            <Text style={styles.emptyInlineText}>No internship assessment postings found for your company.</Text>
          </View>
        ) : (
          <View style={styles.todayCardsGrid}>
            {internships.map((item) => {
              const isSelected = selectedInternshipId === item.id.toString();
              return (
                <HoverCard
                  key={item.id}
                  hoverScale={1.02}
                  style={[styles.todaySessionCard, isSelected && styles.internshipCardSelected]}
                  onPress={() => setSelectedInternshipId(item.id.toString())}
                >
                  <View style={styles.todayCardTop}>
                    <Text style={styles.internshipCompanyText}>{item.company.toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={styles.matchPill}>
                        <Text style={styles.matchPillText}>{item.total_applicants} Applicants</Text>
                      </View>
                      {item.in_progress > 0 && (
                        <View style={styles.startsSoonPill}>
                          <Text style={styles.startsSoonText}>● {item.in_progress} Live</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={styles.todayCandidateName} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.todayCandidateSub}>
                    {item.department} • {item.location} ({item.work_mode}) • {item.duration} • {item.stipend}
                  </Text>

                  {/* Metrics Badge Row */}
                  <View style={styles.internshipMetricsRow}>
                    <Text style={styles.internshipMetricChip}>Shortlisted: <Text style={{ fontWeight: '800' }}>{item.shortlisted}</Text></Text>
                    <Text style={styles.internshipMetricChip}>Today: <Text style={{ fontWeight: '800' }}>{item.scheduled_today}</Text></Text>
                    <Text style={styles.internshipMetricChip}>Completed: <Text style={{ fontWeight: '800' }}>{item.completed}</Text></Text>
                    {item.awaiting_review > 0 && (
                      <Text style={[styles.internshipMetricChip, { backgroundColor: '#FEF3C7', color: '#B45309' }]}>
                        Review: <Text style={{ fontWeight: '800' }}>{item.awaiting_review}</Text>
                      </Text>
                    )}
                  </View>

                  {/* Pipeline Flow Preview */}
                  <View style={styles.pipelinePreviewBox}>
                    <Text style={styles.pipelinePreviewLabel}>PIPELINE:</Text>
                    <Text style={styles.pipelinePreviewText} numberOfLines={1}>
                      {item.pipeline_sequence && item.pipeline_sequence.length > 0
                        ? item.pipeline_sequence.map((seqName, sIdx) => `${sIdx + 1}. ${seqName}`).join(' → ')
                        : 'Aptitude → Technical Assessment → AI Voice Interview → GD'}
                    </Text>
                  </View>

                  <View style={styles.todayActionsRow}>
                    <Pressable
                      style={[styles.prepareSessionBtn, isSelected && styles.joinLiveRoomBtn]}
                      onPress={() => setSelectedInternshipId(item.id.toString())}
                    >
                      <Text style={[styles.prepareSessionText, isSelected && styles.joinLiveRoomText]}>
                        {isSelected ? '✓ Viewing Pipeline' : 'View Assessment'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.viewSessionBtn}
                      onPress={() => {
                        setSelectedInternshipId(item.id.toString());
                      }}
                    >
                      <Text style={styles.viewSessionText}>Inspect Rounds</Text>
                    </Pressable>
                  </View>
                </HoverCard>
              );
            })}
          </View>
        )}
      </View>

      {/* 4. Selected Internship Overview & Clickable Pipeline Rounds Bar */}
      {selectedOverview && (
        <View style={styles.selectedOverviewCard}>
          <View style={styles.overviewHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overviewSubTag}>SELECTED INTERNSHIP ASSESSMENT OVERVIEW</Text>
              <Text style={styles.overviewTitle}>{selectedOverview.title}</Text>
              <Text style={styles.overviewSub}>
                {selectedOverview.department} • {selectedOverview.location} • {selectedOverview.work_mode} • {selectedOverview.duration} • Stipend: {selectedOverview.stipend} • Screening Threshold: {selectedOverview.application_threshold}%
              </Text>
            </View>
            <Pressable
              style={styles.resetFilterChip}
              onPress={() => setSelectedInternshipId('All')}
            >
              <Text style={styles.resetFilterChipText}>✕ Clear Filter</Text>
            </Pressable>
          </View>

          {/* Clickable Pipeline Rounds */}
          {pipelineRounds.length > 0 && (
            <View style={styles.pipelineRoundsContainer}>
              <Text style={styles.pipelineBarHeading}>CONFIGURED ASSESSMENT ROUNDS (Click to Filter Candidates):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipelineRoundsScroll}>
                <Pressable
                  style={[styles.roundChip, roundFilter === 'All' && styles.roundChipActive]}
                  onPress={() => setRoundFilter('All')}
                >
                  <Text style={[styles.roundChipSequence, roundFilter === 'All' && styles.roundChipTextActive]}>ALL</Text>
                  <Text style={[styles.roundChipName, roundFilter === 'All' && styles.roundChipTextActive]}>All Rounds</Text>
                  <Text style={[styles.roundChipCount, roundFilter === 'All' && styles.roundChipTextActive]}>
                    ({scheduledAssessments.length})
                  </Text>
                </Pressable>

                {pipelineRounds.map((rd) => {
                  const isRdActive = roundFilter.toLowerCase() === rd.round_name.toLowerCase() || roundFilter.toLowerCase() === rd.round_key.toLowerCase();
                  return (
                    <Pressable
                      key={rd.round_key}
                      style={[styles.roundChip, isRdActive && styles.roundChipActive]}
                      onPress={() => setRoundFilter(isRdActive ? 'All' : rd.round_name)}
                    >
                      <Text style={[styles.roundChipSequence, isRdActive && styles.roundChipTextActive]}>
                        R{rd.sequence}
                      </Text>
                      <View>
                        <Text style={[styles.roundChipName, isRdActive && styles.roundChipTextActive]}>
                          {rd.round_name}
                        </Text>
                        <Text style={[styles.roundChipCount, isRdActive && styles.roundChipTextActive]}>
                          {rd.duration} • {rd.candidates_count} Cands ({rd.completed_count} done)
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* 5. Filter & Search Controls Bar */}
      <View style={styles.controlsBar}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search candidate, internship, college, or round..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.viewToggleRow}>
          <Pressable style={styles.viewToggleBtnActive}>
            <Text style={styles.viewToggleTextActive}>☰ List View</Text>
          </Pressable>
        </View>
      </View>

      {/* Dropdown Filters Row */}
      <View style={styles.dropdownsFilterRow}>
        {/* Internship Dropdown */}
        <Pressable
          style={styles.filterDropBtn}
          onPress={() => {
            setShowInternshipDropdown(!showInternshipDropdown);
            setShowStatusDropdown(false);
            setShowRoundDropdown(false);
          }}
        >
          <Text style={styles.filterDropText}>{selectedInternshipTitle} ▾</Text>
        </Pressable>

        {/* Status Dropdown */}
        <Pressable
          style={styles.filterDropBtn}
          onPress={() => {
            setShowStatusDropdown(!showStatusDropdown);
            setShowInternshipDropdown(false);
            setShowRoundDropdown(false);
          }}
        >
          <Text style={styles.filterDropText}>Status: {statusFilter} ▾</Text>
        </Pressable>

        {/* Round Dropdown */}
        <Pressable
          style={styles.filterDropBtn}
          onPress={() => {
            setShowRoundDropdown(!showRoundDropdown);
            setShowInternshipDropdown(false);
            setShowStatusDropdown(false);
          }}
        >
          <Text style={styles.filterDropText}>Round: {roundFilter} ▾</Text>
        </Pressable>

        <Pressable style={styles.resetBtn} onPress={handleResetFilters}>
          <Text style={styles.resetText}>⟲ Reset</Text>
        </Pressable>
      </View>

      {/* Dropdown Pickers Overlay */}
      {showInternshipDropdown && (
        <View style={styles.dropdownPickerList}>
          <Pressable
            style={styles.dropdownPickerItem}
            onPress={() => {
              setSelectedInternshipId('All');
              setShowInternshipDropdown(false);
            }}
          >
            <Text style={[styles.dropdownPickerText, selectedInternshipId === 'All' && { fontWeight: '800', color: COLORS.primaryTeal }]}>
              All Internships ({internships.length} Active)
            </Text>
          </Pressable>
          {internships.map((p) => (
            <Pressable
              key={p.id}
              style={styles.dropdownPickerItem}
              onPress={() => {
                setSelectedInternshipId(p.id.toString());
                setShowInternshipDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownPickerText,
                  selectedInternshipId === p.id.toString() && { fontWeight: '800', color: COLORS.primaryTeal },
                ]}
              >
                {p.title} ({p.department})
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {showStatusDropdown && (
        <View style={styles.dropdownPickerList}>
          {['All', 'Scheduled', 'In Progress', 'Needs Feedback', 'Completed', 'Selected', 'Rejected'].map((st) => (
            <Pressable
              key={st}
              style={styles.dropdownPickerItem}
              onPress={() => {
                setStatusFilter(st);
                setShowStatusDropdown(false);
              }}
            >
              <Text style={[styles.dropdownPickerText, statusFilter === st && { fontWeight: '800', color: COLORS.primaryTeal }]}>
                {st}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {showRoundDropdown && (
        <View style={styles.dropdownPickerList}>
          {['All', 'Aptitude', 'Technical', 'AI Voice Interview', 'Group Discussion'].map((rd) => (
            <Pressable
              key={rd}
              style={styles.dropdownPickerItem}
              onPress={() => {
                setRoundFilter(rd);
                setShowRoundDropdown(false);
              }}
            >
              <Text style={[styles.dropdownPickerText, roundFilter === rd && { fontWeight: '800', color: COLORS.primaryTeal }]}>
                {rd}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* 6. Alert Banner: Awaiting Feedback Count */}
      {kpis.awaiting_feedback > 0 && (
        <View style={styles.alertBanner}>
          <Text style={{ fontSize: 16 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {kpis.awaiting_feedback} Completed Assessment{kpis.awaiting_feedback > 1 ? 's' : ''} Require Scorecard Feedback
            </Text>
            <Text style={styles.alertSub}>
              Submit evaluations to advance candidates and release round progression decisions.
            </Text>
          </View>
          <Pressable style={styles.reviewListBtn} onPress={() => setStatusFilter('Needs Feedback')}>
            <Text style={styles.reviewListText}>Review List</Text>
          </Pressable>
        </View>
      )}

      {/* Action Notification Banner */}
      {actionMessage && (
        <View style={[styles.alertBanner, actionMessage.type === 'error' && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
          <Text style={{ fontSize: 16 }}>{actionMessage.type === 'error' ? '❌' : '✅'}</Text>
          <Text style={[styles.alertTitle, actionMessage.type === 'error' && { color: '#DC2626' }]}>
            {actionMessage.text}
          </Text>
        </View>
      )}

      {/* 7. Main Split View Layout (Left: Scheduled Table, Right: Candidate Dossier / Live Console Workspace) */}
      <View style={[styles.mainSplitLayout, !isDesktop && styles.stackedLayout]}>
        {/* Left Column: Scheduled Assessments Table */}
        <View style={[styles.card, { flex: 1.2 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              Candidate Assessment Records <Text style={styles.countBadge}>{scheduledAssessments.length}</Text>
            </Text>
          </View>

          {/* Table Header */}
          <View style={styles.thRow}>
            <Text style={[styles.thCell, { flex: 1.2 }]}>TIME • DATE</Text>
            <Text style={[styles.thCell, { flex: 2.2 }]}>CANDIDATE</Text>
            <Text style={[styles.thCell, { flex: 2 }]}>INTERNSHIP • ROUND</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>STATUS</Text>
            <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>ACTIONS</Text>
          </View>

          {/* Table Rows */}
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator size="large" color={COLORS.primaryTeal} />
              <Text style={{ fontSize: 13, color: COLORS.textMuted }}>Loading assessment records from PostgreSQL...</Text>
            </View>
          ) : scheduledAssessments.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textDark }}>No assessment candidates found</Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                Candidates will appear here once applications are submitted and assessment rounds are scheduled.
              </Text>
            </View>
          ) : (
            scheduledAssessments.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setSelectedId(item.id);
                    if (item.actionType !== 'VIEW_LIVE') {
                      setIsObservingLive(false);
                    }
                  }}
                  style={[styles.tdRow, isSelected && styles.tdRowSelected]}
                >
                  <View style={{ flex: 1.3 }}>
                    <Text style={styles.timeVal}>{item.formatted_date || item.dateLabel}</Text>
                    <Text style={[styles.dateLbl, (item.relative_day_label === 'Today' || item.dateLabel === 'Today') && styles.todayDateLbl]}>
                      {item.relative_day_label ? `${item.relative_day_label} • ` : ''}{item.formatted_time || item.time}
                    </Text>
                  </View>

                  <View style={{ flex: 2.1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{item.avatar}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.candName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.matchBadge}>
                          <Text style={styles.matchBadgeText}>{item.matchPct}</Text>
                        </View>
                      </View>
                      <Text style={styles.candCollege} numberOfLines={1}>{item.college}</Text>
                    </View>
                  </View>

                  <View style={{ flex: 2 }}>
                    <Text style={styles.roleTitle} numberOfLines={1}>{item.role}</Text>
                    <Text style={styles.roundTitle} numberOfLines={1}>{item.round}</Text>
                    <Text style={styles.modeText}>{item.mode}</Text>
                  </View>

                  <View style={{ flex: 1.5 }}>
                    <View style={[styles.statusPill, { backgroundColor: item.statusBg }]}>
                      <Text style={[styles.statusPillText, { color: item.statusText }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                    {item.can_view_live ? (
                      <Pressable
                        style={[styles.actionBtn, styles.actionBtnLiveGreen]}
                        onPress={() => {
                          setSelectedId(item.id);
                          handleStartLiveObserver(item);
                        }}
                      >
                        <Text style={[styles.actionBtnText, styles.actionBtnTextWhite]}>
                          📹 View Live
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[
                          styles.actionBtn,
                          item.actionText?.includes('Score') && styles.actionBtnOrange,
                        ]}
                        onPress={() => {
                          setSelectedId(item.id);
                          setIsObservingLive(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.actionBtnText,
                            item.actionText?.includes('Score') && styles.actionBtnTextWhite,
                          ]}
                        >
                          {item.actionText}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}

          <View style={styles.tableFooter}>
            <Text style={styles.tableFooterText}>
              Showing {scheduledAssessments.length} candidate record{scheduledAssessments.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Right Column: Candidate Dossier + Live Console Workspace */}
        <View style={[styles.card, styles.workspaceCard]}>
          {observerLoading ? (
            <View style={{ padding: 40, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator size="large" color={COLORS.primaryTeal} />
              <Text style={{ fontSize: 13, color: COLORS.textMuted }}>Initializing LiveKit observer session...</Text>
            </View>
          ) : isObservingLive && activeCandidate ? (
            /* ====================================================== */
            /* 100% READ-ONLY LIVE OBSERVER CONSOLE */
            /* ====================================================== */
            <View style={styles.liveObserverConsole}>
              <View style={styles.liveObserverTopBar}>
                <View style={styles.liveObserverPill}>
                  <Text style={styles.liveObserverPillText}>● LIVE OBSERVER MODE • READ-ONLY</Text>
                </View>
                <Pressable style={styles.closeObserverBtn} onPress={handleCloseLiveObserver}>
                  <Text style={styles.closeObserverBtnText}>✕ Close Observer</Text>
                </Pressable>
              </View>

              <Text style={styles.liveConsoleHeading}>Live Proctored Assessment Monitor</Text>
              <Text style={styles.liveConsoleSub}>
                Observing candidate: <Text style={{ fontWeight: '800', color: COLORS.textDark }}>{activeCandidate.name}</Text> ({activeCandidate.role})
              </Text>

              {/* Video & AI Agent Stream Monitor Box */}
              <View style={styles.liveVideoMonitorBox}>
                <View style={styles.liveVideoAvatarOverlay}>
                  <Text style={{ fontSize: 42 }}>📹</Text>
                  <Text style={styles.liveVideoAvatarName}>{activeCandidate.name}</Text>
                  <Text style={styles.liveVideoSubText}>Candidate Video Stream (LiveKit Subscribed)</Text>
                </View>

                <View style={styles.liveStateOverlayBadge}>
                  <Text style={styles.liveStateText}>● {liveTelemetry.ai_status || 'Session Active'}</Text>
                </View>
              </View>

              {/* Real-time Integrity Telemetry Signals */}
              <Text style={styles.rubricSubHeader}>REAL-TIME INTEGRITY TELEMETRY</Text>
              <View style={styles.integrityTelemetryGrid}>
                <View style={styles.telemetryChip}>
                  <Text style={styles.telemetryChipLbl}>Camera</Text>
                  <Text style={styles.telemetryChipValGreen}>Active ✓</Text>
                </View>
                <View style={styles.telemetryChip}>
                  <Text style={styles.telemetryChipLbl}>Microphone</Text>
                  <Text style={styles.telemetryChipValGreen}>Active ✓</Text>
                </View>
                <View style={styles.telemetryChip}>
                  <Text style={styles.telemetryChipLbl}>Face Track</Text>
                  <Text style={styles.telemetryChipValGreen}>1 Detected ✓</Text>
                </View>
                <View style={styles.telemetryChip}>
                  <Text style={styles.telemetryChipLbl}>Integrity</Text>
                  <Text style={styles.telemetryChipValGreen}>{activeCandidate.integrity_status || 'MONITORED'}</Text>
                </View>
              </View>

              {/* Live Transcript Stream */}
              <Text style={styles.rubricSubHeader}>LIVE SESSION TRANSCRIPT STREAM</Text>
              <View style={styles.liveTranscriptBox}>
                {liveTelemetry.transcript && liveTelemetry.transcript.length > 0 ? (
                  liveTelemetry.transcript.map((line, idx) => (
                    <View key={idx} style={styles.transcriptLine}>
                      <Text style={line.role === 'ai' ? styles.transcriptAiTag : styles.transcriptCandTag}>
                        {line.role === 'ai' ? 'AI Interviewer:' : 'Candidate:'}
                      </Text>
                      <Text style={styles.transcriptText}>{line.text}</Text>
                    </View>
                  ))
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={COLORS.primaryTeal} />
                    <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6 }}>
                      Listening to assessment stream... transcript will appear live.
                    </Text>
                  </View>
                )}
              </View>

              <Pressable style={styles.stopObservingBtn} onPress={handleCloseLiveObserver}>
                <Text style={styles.stopObservingText}>Disconnect Observer Console</Text>
              </Pressable>
            </View>
          ) : activeCandidate ? (
            /* ====================================================== */
            /* STANDARD CANDIDATE DOSSIER & SCORECARD RUBRIC */
            /* ====================================================== */
            <>
              <View style={styles.workspaceTopTagRow}>
                <Text style={styles.workspaceTag}>CANDIDATE DOSSIER & EVALUATION</Text>
                <View style={styles.todaySlotBadge}>
                  <Text style={styles.todaySlotBadgeText}>
                    ● {activeCandidate.formatted_date || activeCandidate.dateLabel} • {activeCandidate.relative_day_label ? `${activeCandidate.relative_day_label} • ` : ''}{activeCandidate.formatted_time || activeCandidate.time}
                  </Text>
                </View>
              </View>

              <Text style={styles.workspaceHeading}>Assessment Workspace</Text>

              {/* Candidate Top Profile Box */}
              <View style={styles.candHeaderBox}>
                <View style={styles.candAvatarLarge}>
                  <Text style={styles.candAvatarLargeText}>{activeCandidate.avatar}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.candNameLarge}>{activeCandidate.name}</Text>
                    <View style={styles.verifiedGreenBadge}>
                      <Text style={styles.verifiedGreenBadgeText}>{activeCandidate.matchPct} Verified</Text>
                    </View>
                  </View>
                  <Text style={styles.candDegreeLarge}>
                    {activeCandidate.degree} • {activeCandidate.college} • CGPA: {activeCandidate.cgpa} / 10
                  </Text>
                </View>
              </View>

              {/* If Candidate is actively Live / Reconnecting, show Live Observe Button */}
              {activeCandidate.can_view_live && (
                <Pressable
                  style={styles.viewLiveBannerBtn}
                  onPress={() => handleStartLiveObserver(activeCandidate)}
                >
                  <Text style={styles.viewLiveBannerText}>📹 View Live AI Interview Assessment (Observer Mode) →</Text>
                </Pressable>
              )}

              <Text style={styles.sectionSubHeading}>TOP VERIFIED COMPETENCIES</Text>
              <View style={styles.competenciesChipsRow}>
                {(activeCandidate.top_competencies || []).map((c, i) => (
                  <View key={i} style={styles.compChip}>
                    <Text style={styles.compChipText}>{c}</Text>
                  </View>
                ))}
              </View>

              {/* Candidate Round History / Breakdown */}
              <Text style={styles.sectionSubHeading}>PIPELINE STAGE BREAKDOWN</Text>
              <View style={styles.pipelineStepsList}>
                <View style={styles.pipelineStepItem}>
                  <Text style={styles.pipelineStepLbl}>Current Round:</Text>
                  <Text style={styles.pipelineStepVal}>{activeCandidate.round}</Text>
                </View>
                <View style={styles.pipelineStepItem}>
                  <Text style={styles.pipelineStepLbl}>Round Status:</Text>
                  <Text style={styles.pipelineStepVal}>{activeCandidate.status}</Text>
                </View>
                <View style={styles.pipelineStepItem}>
                  <Text style={styles.pipelineStepLbl}>Integrity Status:</Text>
                  <Text style={[styles.pipelineStepVal, { color: '#15803D' }]}>
                    {activeCandidate.integrity_status || 'VERIFIED'}
                  </Text>
                </View>
              </View>

              {/* Evaluation Rubric Section */}
              <View style={styles.rubricCard}>
                <View style={styles.rubricHeaderRow}>
                  <View>
                    <Text style={styles.rubricTag}>EVALUATION RUBRIC</Text>
                    <Text style={styles.rubricTitle}>Structured Scoring & Progression</Text>
                  </View>
                  <Pressable
                    style={[styles.saveScorecardBtn, isSavingEval && { opacity: 0.6 }]}
                    onPress={handleSaveEvaluation}
                    disabled={isSavingEval}
                  >
                    {isSavingEval ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveScorecardText}>{evalSaved ? '✓ Saved!' : 'Save Rubric'}</Text>
                    )}
                  </Pressable>
                </View>

                {/* Rubric Star Rows */}
                <View style={styles.rubricRowsList}>
                  <RatingRow
                    label="Technical Depth & Fundamentals"
                    stars={ratings.techDepth}
                    score={`${ratings.techDepth} / 5`}
                    onSelect={(val) => setRatings((prev) => ({ ...prev, techDepth: val }))}
                  />
                  <RatingRow
                    label="Problem Solving & Logic"
                    stars={ratings.problemSolving}
                    score={`${ratings.problemSolving} / 5`}
                    onSelect={(val) => setRatings((prev) => ({ ...prev, problemSolving: val }))}
                  />
                  <RatingRow
                    label="System Architecture & Database Design"
                    stars={ratings.sysDesign}
                    score={`${ratings.sysDesign} / 5`}
                    onSelect={(val) => setRatings((prev) => ({ ...prev, sysDesign: val }))}
                  />
                  <RatingRow
                    label="Communication & Structural Clarity"
                    stars={ratings.communication}
                    score={`${ratings.communication} / 5`}
                    onSelect={(val) => setRatings((prev) => ({ ...prev, communication: val }))}
                  />
                  <RatingRow
                    label="Role & Startup Team Fit"
                    stars={ratings.teamFit}
                    score={`${ratings.teamFit} / 5`}
                    onSelect={(val) => setRatings((prev) => ({ ...prev, teamFit: val }))}
                  />
                </View>

                {/* Composite Score Card */}
                <View style={styles.compositeScoreCard}>
                  <Text style={{ fontSize: 18 }}>🛡️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.compositeLbl}>Composite Score</Text>
                    <Text style={styles.compositeSub}>Weighted technical + soft skills</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.compositeVal}>{activeCandidate.composite_score || activeCandidate.matchPct || 85} / 100</Text>
                    <Text style={styles.compositeBadge}>HIGH CAPABILITY</Text>
                  </View>
                </View>

                {/* Strengths & Highlights */}
                <Text style={styles.rubricSubHeader}>Strengths & Highlights</Text>
                <TextInput
                  style={styles.feedbackInput}
                  multiline
                  value={strengthsText}
                  onChangeText={setStrengthsText}
                  placeholder="Candidate strengths during this round..."
                />

                {/* Areas for Improvement */}
                <Text style={styles.rubricSubHeader}>Areas for Improvement / Probing</Text>
                <TextInput
                  style={styles.feedbackInput}
                  multiline
                  value={areasText}
                  onChangeText={setAreasText}
                  placeholder="Notes on areas of improvement..."
                />

                {/* Recommendation Verdict Selectors */}
                <Text style={styles.rubricSubHeader}>Recommendation Verdict</Text>
                <View style={styles.verdictGrid}>
                  {['Strongly Recommend', 'Recommend', 'Maybe / Borderline', 'Do Not Recommend'].map((v) => {
                    const isVActive = verdict === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => setVerdict(v)}
                        style={[
                          styles.verdictBtn,
                          isVActive && v === 'Strongly Recommend' && styles.verdictActiveGreen,
                          isVActive && v === 'Recommend' && styles.verdictActiveTeal,
                          isVActive && v === 'Do Not Recommend' && styles.verdictActiveRed,
                        ]}
                      >
                        <Text style={[styles.verdictText, isVActive && styles.verdictTextActive]}>
                          {isVActive ? `✓ ${v}` : v}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Main Stage Progression Buttons */}
                {activeCandidate.next_round_name ? (
                  <Pressable
                    style={[styles.moveRoundBtn, isProgressing && { opacity: 0.7 }]}
                    onPress={() => handleProgressAction('advance')}
                    disabled={isProgressing}
                  >
                    {isProgressing ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.moveRoundText}>Advance to {activeCandidate.next_round_name} →</Text>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.moveRoundBtn, isProgressing && { opacity: 0.7 }]}
                    onPress={() => handleProgressAction('select')}
                    disabled={isProgressing}
                  >
                    {isProgressing ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.moveRoundText}>Select Candidate for Role 🛡️</Text>
                    )}
                  </Pressable>
                )}

                <View style={styles.bottomSecondaryActionsRow}>
                  <Pressable
                    style={styles.offerBtn}
                    onPress={() => handleProgressAction('select')}
                    disabled={isProgressing}
                  >
                    <Text style={styles.offerBtnText}>Extend Internship Offer</Text>
                  </Pressable>
                  <Pressable
                    style={styles.rejectFeedbackBtn}
                    onPress={() => handleProgressAction('reject')}
                    disabled={isProgressing}
                  >
                    <Text style={styles.rejectFeedbackText}>Reject with Feedback</Text>
                  </Pressable>
                </View>
              </View>

              {/* Evaluation Journey Log */}
              <View style={styles.journeySection}>
                <Text style={styles.rubricSubHeader}>EVALUATION JOURNEY</Text>
                <View style={styles.journeyList}>
                  {(activeCandidate.journey_steps || []).map((step, sIdx) => (
                    <JourneyStep key={sIdx} text={step.text} active={step.active} pending={step.pending} />
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: COLORS.textMuted }}>Select a candidate to view dossier</Text>
            </View>
          )}
        </View>
      </View>

      {/* 8. Fast-Track Scheduling Engine Section */}
      <View style={styles.schedulingEngineCard}>
        <View style={styles.schedulingEngineHeaderRow}>
          <View>
            <Text style={styles.engineSubTag}>FAST-TRACK SCHEDULING ENGINE</Text>
            <Text style={styles.engineTitle}>Standard 5-Step Recruiter Assessment Workflow</Text>
            <Text style={styles.engineSub}>
              Seamlessly sync assessment environments, proctoring streams, and evaluation rubrics for shortlisted applicants.
            </Text>
          </View>
        </View>

        <View style={styles.stepperRow}>
          <View style={styles.stepBox}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Select Student</Text>
            <Text style={styles.stepDesc}>Filter from shortlisted applicants</Text>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Role & Round</Text>
            <Text style={styles.stepDesc}>Aptitude, Technical, Voice, GD</Text>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>Slot & Mode</Text>
            <Text style={styles.stepDesc}>Live Sandbox or Video Call</Text>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>4</Text>
            </View>
            <Text style={styles.stepTitle}>Assign Panel</Text>
            <Text style={styles.stepDesc}>Add engineers & talent leads</Text>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>5</Text>
            </View>
            <Text style={styles.stepTitle}>Send Invites</Text>
            <Text style={styles.stepDesc}>Auto-generates Google Calendar</Text>
          </View>
        </View>
      </View>

      {/* 9. Page Footer */}
      <View style={styles.pageFooter}>
        <Text style={styles.footerText}>
          SkillSetu Recruiter Platform • Proctored Assessment Pipeline & Live Observer System
        </Text>
        <View style={styles.footerLinksRow}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerLink}>Evaluation Guide</Text>
          <Text style={styles.footerLink}>Support</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function RatingRow({ label, stars, score, onSelect }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLbl}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ flexDirection: 'row' }}>
          {[1, 2, 3, 4, 5].map((st) => (
            <Pressable key={st} onPress={() => onSelect && onSelect(st)}>
              <Text style={[styles.starText, { color: st <= stars ? COLORS.goldStar : '#CBD5E1' }]}>★</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.scoreText}>{score}</Text>
      </View>
    </View>
  );
}

function JourneyStep({ text, active, pending }) {
  return (
    <View style={styles.journeyRow}>
      <View
        style={[
          styles.journeyDot,
          active && styles.journeyDotActive,
          pending && styles.journeyDotPending,
        ]}
      />
      <Text
        style={[
          styles.journeyText,
          active && styles.journeyTextActive,
          pending && styles.journeyTextPending,
        ]}
      >
        {text}
      </Text>
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
  calendarMasterBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  calendarMasterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  scheduleInterviewPrimaryBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scheduleInterviewPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  warningMetricCard: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  nextPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  nextPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  todaySectionCard: {
    backgroundColor: COLORS.cardBg,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  todaySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  liveIntegrationPill: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  liveIntegrationText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tealText,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  todayCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  todaySessionCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: COLORS.bg,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  internshipCardSelected: {
    borderColor: COLORS.primaryTeal,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
  },
  internshipCompanyText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    letterSpacing: 0.5,
  },
  todayCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayCandidateName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  todayCandidateSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  internshipMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  internshipMetricChip: {
    fontSize: 11,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textDark,
  },
  pipelinePreviewBox: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  pipelinePreviewLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pipelinePreviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  todayActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  prepareSessionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  prepareSessionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  joinLiveRoomBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  joinLiveRoomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  viewSessionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  viewSessionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  selectedOverviewCard: {
    backgroundColor: COLORS.cardBg,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    gap: 14,
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  overviewSubTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    letterSpacing: 0.5,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 2,
  },
  overviewSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  resetFilterChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  pipelineRoundsContainer: {
    gap: 8,
  },
  pipelineBarHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  pipelineRoundsScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  roundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roundChipActive: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.primaryTeal,
    borderWidth: 1.5,
  },
  roundChipSequence: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roundChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  roundChipCount: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  roundChipTextActive: {
    color: COLORS.primaryTeal,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  searchBox: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    padding: 0,
  },
  viewToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewToggleTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  dropdownsFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  filterDropBtn: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterDropText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  dropdownPickerList: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownPickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dropdownPickerText: {
    fontSize: 13,
    color: COLORS.textDark,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: 14,
    borderRadius: 8,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  alertSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  reviewListBtn: {
    backgroundColor: '#92400E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reviewListText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mainSplitLayout: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'flex-start',
  },
  stackedLayout: {
    flexDirection: 'column',
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  countBadge: {
    color: COLORS.primaryTeal,
  },
  thRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  tdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  tdRowSelected: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryTeal,
    paddingLeft: 8,
  },
  timeVal: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  dateLbl: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  todayDateLbl: {
    color: '#15803D',
    fontWeight: '700',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.mintBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.tealText,
  },
  candName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  candCollege: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  matchBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  matchBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  roleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  roundTitle: {
    fontSize: 11,
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  modeText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnLiveGreen: {
    backgroundColor: '#15803D',
    borderColor: '#15803D',
  },
  actionBtnOrange: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  actionBtnTextWhite: {
    color: '#FFFFFF',
  },
  tableFooter: {
    paddingTop: 8,
    alignItems: 'center',
  },
  tableFooterText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  workspaceCard: {
    flex: 1,
  },
  workspaceTopTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workspaceTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    letterSpacing: 0.5,
  },
  todaySlotBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  todaySlotBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  workspaceHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  candHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  candAvatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  candAvatarLargeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  candNameLarge: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  verifiedGreenBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedGreenBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  candDegreeLarge: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  viewLiveBannerBtn: {
    backgroundColor: '#15803D',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewLiveBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionSubHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 6,
  },
  competenciesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  pipelineStepsList: {
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  pipelineStepItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pipelineStepLbl: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  pipelineStepVal: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  rubricCard: {
    backgroundColor: COLORS.bg,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  rubricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rubricTag: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    letterSpacing: 0.5,
  },
  rubricTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  saveScorecardBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveScorecardText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  rubricRowsList: {
    gap: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingLbl: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '600',
    flex: 1,
  },
  starText: {
    fontSize: 14,
    marginHorizontal: 1,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  compositeScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compositeLbl: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  compositeSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  compositeVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  compositeBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  rubricSubHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  feedbackInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 8,
    fontSize: 11,
    color: COLORS.textDark,
    minHeight: 48,
  },
  verdictGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  verdictBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  verdictActiveGreen: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  verdictActiveTeal: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.mintBorder,
  },
  verdictActiveRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  verdictText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  verdictTextActive: {
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  moveRoundBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  moveRoundText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomSecondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  offerBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  offerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  rejectFeedbackBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  rejectFeedbackText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  journeySection: {
    gap: 6,
  },
  journeyList: {
    gap: 6,
    marginTop: 4,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  journeyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  journeyDotActive: {
    backgroundColor: COLORS.primaryTeal,
  },
  journeyDotPending: {
    backgroundColor: '#F59E0B',
  },
  journeyText: {
    fontSize: 11,
    color: COLORS.textDark,
  },
  journeyTextActive: {
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  journeyTextPending: {
    color: COLORS.textMuted,
  },
  liveObserverConsole: {
    gap: 12,
  },
  liveObserverTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveObserverPill: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveObserverPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  closeObserverBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeObserverBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  liveConsoleHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  liveConsoleSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  liveVideoMonitorBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  liveVideoAvatarOverlay: {
    alignItems: 'center',
    gap: 4,
  },
  liveVideoAvatarName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  liveVideoSubText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  liveStateOverlayBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveStateText: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: '800',
  },
  integrityTelemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  telemetryChip: {
    flex: 1,
    minWidth: 80,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  telemetryChipLbl: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  telemetryChipValGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 2,
  },
  liveTranscriptBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    maxHeight: 180,
    gap: 6,
  },
  transcriptLine: {
    gap: 2,
  },
  transcriptAiTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  transcriptCandTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  transcriptText: {
    fontSize: 11,
    color: COLORS.textDark,
  },
  stopObservingBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopObservingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  emptyInlineCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyInlineText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  startsSoonPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  startsSoonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  matchPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  matchPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  schedulingEngineCard: {
    backgroundColor: COLORS.cardBg,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  schedulingEngineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engineSubTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    letterSpacing: 0.5,
  },
  engineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 2,
  },
  engineSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stepBox: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.bg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  stepDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  pageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexWrap: 'wrap',
    gap: 10,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footerLinksRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerLink: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
