import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { recruiterService } from '../services/recruiterService';
import {
  Avatar,
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  Field,
  Icon,
  IconButton,
  Inset,
  Page,
  Pill,
  Row,
  SearchField,
  SectionTitle,
  Skeleton,
  Stack,
  StatTile,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';

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
  const EMPTY_RATINGS = { techDepth: 0, problemSolving: 0, sysDesign: 0, communication: 0, teamFit: 0 };
  const [ratings, setRatings] = useState(EMPTY_RATINGS);
  const [verdict, setVerdict] = useState('');
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
      // Reset per candidate so one candidate's scorecard never leaks into another's.
      setRatings(activeCandidate.ratings || EMPTY_RATINGS);
      setVerdict(activeCandidate.verdict || '');
      setStrengthsText(activeCandidate.strengths || '');
      setAreasText(activeCandidate.areas_for_improvement || '');
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
  const RATING_KEYS = [
    ['techDepth', 'Technical depth'],
    ['problemSolving', 'Problem solving'],
    ['sysDesign', 'System design'],
    ['communication', 'Communication'],
    ['teamFit', 'Team fit'],
  ];
  const VERDICTS = ['Strongly Recommend', 'Recommend', 'Maybe / Borderline', 'Do Not Recommend'];
  const statusTone = (s = '') => {
    const v = String(s).toLowerCase();
    if (v.includes('progress') || v.includes('live')) return 'info';
    if (v.includes('complete')) return 'success';
    if (v.includes('select')) return 'success';
    if (v.includes('reject') || v.includes('expired')) return 'danger';
    if (v.includes('feedback') || v.includes('review')) return 'warning';
    return 'accent';
  };
  const ratingsComplete = RATING_KEYS.every(([k]) => (ratings[k] || 0) > 0) && !!verdict;

  const list = (
    <Card padding={space.sm}>
      {loading && !dashboardData ? (
        <Stack gap={8} style={{ padding: space.sm }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={72} />)}</Stack>
      ) : scheduledAssessments.length ? (
        <Stack gap={4}>
          {scheduledAssessments.map((item) => {
            const active = item.id === (activeCandidate?.id ?? selectedId);
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedId(item.id)}
                style={({ hovered }) => [styles.row, active ? { backgroundColor: colors.lilac } : hovered ? { backgroundColor: colors.surfaceMuted } : null, webOnly({ cursor: 'pointer' })]}
              >
                <Avatar name={item.name} size={40} />
                <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{item.name}</Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>{[item.round, item.role].filter(Boolean).join(' · ')}</Txt>
                  <Txt variant="caption" tone="subtle" numberOfLines={1}>{[item.relative_day_label || item.dateLabel, item.formatted_time || item.time].filter(Boolean).join(' · ')}</Txt>
                </Stack>
                <Stack gap={4} style={{ alignItems: 'flex-end' }}>
                  <Pill label={item.status} tone={statusTone(item.status)} size="sm" />
                  {item.can_view_live ? <Pill label="Live" tone="danger" icon="Eye" size="sm" /> : null}
                </Stack>
              </Pressable>
            );
          })}
        </Stack>
      ) : (
        <EmptyState icon="Target" title="No assessments yet" message="Shortlisted candidates on roles with assessment rounds appear here." action={<Button label="Reset filters" size="sm" variant="secondary" onPress={handleResetFilters} />} />
      )}
    </Card>
  );

  const c = activeCandidate;
  const workspace = c ? (
    isObservingLive ? (
      <Card padding={space.lg} tone="dark">
        <Row justify="space-between" wrap gap={8}>
          <Row gap={8}>
            <View style={styles.liveDot} />
            <Txt variant="h3" tone="inverse">Live · {c.name}</Txt>
          </Row>
          <Button label="Exit observer" size="sm" variant="light" icon="X" onPress={handleCloseLiveObserver} />
        </Row>
        <Txt variant="small" tone="inverseMuted" style={{ marginTop: 4 }}>{c.role} · {c.round} · {liveTelemetry.ai_status}</Txt>
        <Row gap={8} wrap style={{ marginTop: space.md }}>
          <Pill label={`Integrity: ${c.integrity_status || 'Monitored'}`} tone="success" icon="ShieldCheck" size="sm" />
          <Pill label={liveTelemetry.status || 'IN_PROGRESS'} tone="info" size="sm" />
        </Row>
        <View style={styles.transcript}>
          {(liveTelemetry.transcript || []).length ? (
            liveTelemetry.transcript.map((line, i) => (
              <View key={i} style={[styles.bubble, line.role === 'ai' ? styles.bubbleAi : styles.bubbleCand]}>
                <Txt variant="caption" weight={700} color={line.role === 'ai' ? colors.lilacInk : colors.skyInk}>{line.role === 'ai' ? 'AI interviewer' : 'Candidate'}</Txt>
                <Txt variant="small" tone="ink">{line.text}</Txt>
              </View>
            ))
          ) : (
            <Txt variant="small" tone="inverseMuted">Listening… the transcript appears here as the session runs.</Txt>
          )}
        </View>
      </Card>
    ) : (
      <Card padding={isDesktop ? space.xl : space.lg}>
        <Row gap={space.md} align="flex-start" wrap>
          <Avatar name={c.name} size={56} />
          <Stack gap={3} style={{ flex: 1, minWidth: 200 }}>
            <Txt variant="h2" tone="ink">{c.name}</Txt>
            <Txt variant="small" tone="muted">{[c.degree, c.college, c.cgpa ? `CGPA ${c.cgpa}` : null].filter(Boolean).join(' · ')}</Txt>
            <Row wrap gap={6}>
              <Pill label={c.status} tone={statusTone(c.status)} size="sm" />
              {c.round ? <Pill label={c.round} tone="accent" icon="Target" size="sm" /> : null}
              {c.matchPct ? <Pill label={`${c.matchPct} match`} tone="success" size="sm" /> : null}
              {c.composite_score != null ? <Pill label={`Score ${c.composite_score}`} tone="info" size="sm" /> : null}
            </Row>
          </Stack>
          {c.can_view_live ? <Button label="Watch live" icon="Eye" onPress={() => handleStartLiveObserver(c)} loading={observerLoading} /> : null}
        </Row>

        {(c.top_competencies || []).length ? (
          <Row wrap gap={6} style={{ marginTop: space.md }}>
            {c.top_competencies.map((t) => <Pill key={String(t)} label={String(t)} tone="success" size="sm" />)}
          </Row>
        ) : null}

        {(c.journey_steps || []).length ? (
          <Row wrap gap={6} style={{ marginTop: space.md }}>
            {c.journey_steps.map((st, i) => (
              <React.Fragment key={i}>
                <Pill label={st.text} tone={st.active ? 'dark' : st.pending ? 'neutral' : 'success'} icon={!st.active && !st.pending ? 'Check' : undefined} size="sm" />
                {i < c.journey_steps.length - 1 ? <Icon name="ChevronRight" size={14} color={colors.textSubtle} /> : null}
              </React.Fragment>
            ))}
          </Row>
        ) : null}

        <Card padding={space.lg} tone="neutral" style={{ marginTop: space.lg, backgroundColor: colors.surfaceMuted }}>
          <Txt variant="h3" tone="ink">Scorecard</Txt>
          <Stack gap={10} style={{ marginTop: space.sm }}>
            {RATING_KEYS.map(([k, label]) => (
              <Row key={k} justify="space-between" wrap gap={6}>
                <Txt variant="small" weight={600} tone="ink">{label}</Txt>
                <Row gap={4}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setRatings((r) => ({ ...r, [k]: n }))} hitSlop={4} style={webOnly({ cursor: 'pointer' })} accessibilityLabel={`${label} ${n}`}>
                      <Icon name="Star" size={20} color={n <= (ratings[k] || 0) ? colors.butterStrong : colors.borderStrong} fill={n <= (ratings[k] || 0) ? colors.butterStrong : 'none'} />
                    </Pressable>
                  ))}
                </Row>
              </Row>
            ))}
          </Stack>
          <Txt variant="small" weight={600} tone="ink" style={{ marginTop: space.md, marginBottom: 6 }}>Verdict</Txt>
          <ChipGroup options={VERDICTS} value={verdict} multiple={false} tone="accent" onChange={setVerdict} />
          <Row gap={space.sm} wrap style={{ marginTop: space.md }}>
            <Field style={{ flex: 1, minWidth: 220 }} label="Strengths" multiline value={strengthsText} onChangeText={setStrengthsText} />
            <Field style={{ flex: 1, minWidth: 220 }} label="Areas to improve" multiline value={areasText} onChangeText={setAreasText} />
          </Row>
          <Row gap={8} style={{ marginTop: space.md }}>
            <Button label={evalSaved ? 'Saved' : 'Save scorecard'} icon={evalSaved ? 'Check' : 'Send'} onPress={handleSaveEvaluation} loading={isSavingEval} disabled={!ratingsComplete} />
            {!ratingsComplete ? <Txt variant="caption" tone="muted">Rate all five areas and pick a verdict.</Txt> : null}
          </Row>
        </Card>

        {actionMessage ? (
          <Inset tone={actionMessage.type === 'error' ? 'danger' : 'success'} padding={space.sm} style={{ marginTop: space.md }}>
            <Txt variant="small" weight={600} tone="ink">{actionMessage.text}</Txt>
          </Inset>
        ) : null}
        <Row gap={8} wrap style={{ marginTop: space.md }}>
          {c.next_round_name ? (
            <Button label={`Advance to ${c.next_round_name}`} icon="ArrowRight" onPress={() => handleProgressAction('advance')} loading={isProgressing} />
          ) : null}
          <Button label="Select" icon="Award" tone="success" onPress={() => handleProgressAction('select')} disabled={isProgressing} />
          <Button label="Reject" variant="danger" onPress={() => handleProgressAction('reject')} disabled={isProgressing} />
        </Row>
      </Card>
    )
  ) : null;

  return (
    <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}>
      <SectionTitle
        title="Assessments"
        emoji="🎯"
        subtitle={selectedOverview ? `${selectedOverview.title} · min match ${selectedOverview.application_threshold ?? '—'}%` : `${internships.length} roles with assessment rounds`}
        right={
          <Row gap={8}>
            <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Candidate name" style={{ width: isDesktop ? 220 : '100%' }} />
            <IconButton icon="RefreshCw" size={46} onPress={() => loadDashboard(true)} accessibilityLabel="Refresh" />
          </Row>
        }
      />

      {error ? (
        <Card tone="danger">
          <Row justify="space-between" wrap gap={8}>
            <Txt variant="small" weight={600} color="#B4232A" style={{ flex: 1 }}>{error}</Txt>
            <Button label="Retry" size="sm" variant="light" onPress={() => loadDashboard(true)} />
          </Row>
        </Card>
      ) : null}

      <View style={styles.statsRow}>
        <StatTile value={kpis.upcoming ?? 0} label="Upcoming" tone="info" style={styles.stat} />
        <StatTile value={kpis.today ?? 0} label="Today" tone="accent" style={styles.stat} />
        <StatTile value={kpis.completed ?? 0} label="Completed" tone="success" style={styles.stat} />
        <StatTile value={kpis.awaiting_feedback ?? 0} label="Need feedback" tone="warning" style={styles.stat} onPress={() => setStatusFilter('Needs Feedback')} />
        <StatTile value={kpis.selected ?? 0} label="Selected" dashed style={styles.stat} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        <Chip label="All roles" icon="Briefcase" selected={selectedInternshipId === 'All'} onPress={() => setSelectedInternshipId('All')} />
        {internships.map((p) => (
          <Chip key={p.id} label={p.title} tone="info" selected={String(selectedInternshipId) === String(p.id)} onPress={() => setSelectedInternshipId(String(p.id))} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {['All', 'Scheduled', 'In Progress', 'Needs Feedback', 'Completed', 'Selected', 'Rejected'].map((st) => (
          <Chip key={st} label={st === 'All' ? 'Any status' : st} tone="accent" selected={statusFilter === st} onPress={() => setStatusFilter(st)} />
        ))}
        {['All', 'Aptitude', 'Technical', 'AI Voice Interview', 'Group Discussion'].map((rd) => (
          <Chip key={`r${rd}`} label={rd === 'All' ? 'Any round' : rd} tone="warning" selected={roundFilter === rd} onPress={() => setRoundFilter(rd)} />
        ))}
      </ScrollView>

      {pipelineRounds.length ? (
        <Card padding={space.lg}>
          <Txt variant="h3" tone="ink">Pipeline</Txt>
          <Row wrap gap={8} style={{ marginTop: space.sm }}>
            {pipelineRounds.map((rd, i) => (
              <React.Fragment key={rd.round_key || rd.round_name}>
                <Pressable onPress={() => setRoundFilter(roundFilter === rd.round_name ? 'All' : rd.round_name)} style={[styles.roundCell, roundFilter === rd.round_name ? { backgroundColor: colors.lilac } : null, webOnly({ cursor: 'pointer' })]}>
                  <Txt variant="caption" tone="muted">{rd.sequence ?? i + 1}. {rd.duration ? `${rd.duration}` : ''}</Txt>
                  <Txt variant="small" weight={700} tone="ink">{rd.round_name}</Txt>
                  <Txt variant="caption" tone="muted">{rd.completed_count ?? 0}/{rd.candidates_count ?? 0} done</Txt>
                </Pressable>
                {i < pipelineRounds.length - 1 ? <Icon name="ChevronRight" size={16} color={colors.textSubtle} style={{ alignSelf: 'center' }} /> : null}
              </React.Fragment>
            ))}
          </Row>
        </Card>
      ) : null}

      <View style={[styles.split, isDesktop ? styles.splitRow : null]}>
        <View style={isDesktop ? { width: 400 } : null}>{list}</View>
        <View style={isDesktop ? { flex: 1, minWidth: 0 } : null}>{workspace}</View>
      </View>
    </Page>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radii.md,
  },
  roundCell: {
    padding: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    minWidth: 130,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  transcript: {
    marginTop: space.md,
    gap: 8,
    maxHeight: 420,
  },
  bubble: {
    borderRadius: radii.md,
    padding: space.sm,
    maxWidth: '90%',
  },
  bubbleAi: {
    backgroundColor: colors.lilac,
    alignSelf: 'flex-start',
  },
  bubbleCand: {
    backgroundColor: colors.sky,
    alignSelf: 'flex-end',
  },
});
