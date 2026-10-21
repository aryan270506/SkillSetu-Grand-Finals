import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { recruiterService } from '../services/recruiterService';
import {
  Avatar,
  Button,
  Card,
  Chip,
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

import { tl } from '../../../i18n/tl';

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

  // Recruiter Review Notes State (authorized recruiter action)
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

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

  // Sync workspace review notes when active candidate changes
  useEffect(() => {
    if (activeCandidate) {
      setRecruiterNotes(activeCandidate.recruiter_notes || '');
    } else {
      setRecruiterNotes('');
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

  // Handle Recruiter Review Notes Save (Permitted action: notes only, cannot edit scores/verdicts)
  const handleSaveReviewNotes = async () => {
    if (!activeCandidate || !activeCandidate.application_id) return;
    setIsSavingNotes(true);
    setNotesSaved(false);

    try {
      await recruiterService.submitAssessmentEvaluation(token, {
        application_id: activeCandidate.application_id,
        session_id: activeCandidate.session_id,
        notes: recruiterNotes,
      });

      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
      loadDashboard(false, true);
    } catch (err) {
      alert(err.message || 'Failed to save recruiter review notes.');
    } finally {
      setIsSavingNotes(false);
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
        notes: `Recruiter workflow action: ${actionType.toUpperCase()}${activeCandidate.verdict ? ` (System Verdict: ${activeCandidate.verdict})` : ''}`,
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

  // Dynamic round options derived from published pipeline & actual assessments
  const roundFilterOptions = useMemo(() => {
    const roundSet = new Set();
    pipelineRounds.forEach((r) => {
      if (r.round_name) roundSet.add(r.round_name);
    });
    scheduledAssessments.forEach((s) => {
      if (s.current_round_name) roundSet.add(s.current_round_name);
    });
    return ['All', ...Array.from(roundSet)];
  }, [pipelineRounds, scheduledAssessments]);

  const selectedInternshipObj = internships.find((p) => p.id === parseInt(selectedInternshipId, 10));
  const selectedInternshipTitle = selectedInternshipObj ? selectedInternshipObj.title : `All Internships (${internships.length} Active)`;

  const RATING_KEYS = [
    ['techDepth', 'Technical Depth'],
    ['problemSolving', 'Problem Solving'],
    ['sysDesign', 'System Design'],
    ['communication', 'Communication'],
    ['teamFit', 'Team Fit'],
  ];

  const statusTone = (s = '') => {
    const v = String(s).toLowerCase();
    if (v.includes('progress') || v.includes('live')) return 'info';
    if (v.includes('complete')) return 'success';
    if (v.includes('select')) return 'success';
    if (v.includes('reject') || v.includes('expired')) return 'danger';
    if (v.includes('feedback') || v.includes('review') || v.includes('waiting')) return 'warning';
    return 'accent';
  };

  const verdictTone = (v = '', isEvaluated = true) => {
    if (!isEvaluated) return 'neutral';
    const s = String(v).toLowerCase();
    if (s.includes('strongly')) return 'success';
    if (s.includes('recommend') && !s.includes('not')) return 'accent';
    if (s.includes('maybe') || s.includes('borderline')) return 'warning';
    if (s.includes('not recommend')) return 'danger';
    return 'neutral';
  };

  const roundStatusTone = (key = '') => {
    switch (key) {
      case 'ROUND_COMPLETED':
        return 'success';
      case 'ASSESSMENT_IN_PROGRESS':
        return 'info';
      case 'SUBMITTED_EVALUATION_PENDING':
        return 'warning';
      case 'AWAITING_RECRUITER_REVIEW':
        return 'accent';
      case 'ROUND_NOT_COMPLETED':
      default:
        return 'danger';
    }
  };

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
                  <Pill
                    label={item.round_status_label || item.status}
                    tone={item.round_status_tone || roundStatusTone(item.round_status_key) || statusTone(item.status)}
                    size="sm"
                  />
                  {item.can_view_live ? <Pill label="Live" tone="danger" icon="Eye" size="sm" /> : null}
                </Stack>
              </Pressable>
            );
          })}
        </Stack>
      ) : (
        <EmptyState icon="Target" title="No assessments found" message="Shortlisted candidates on roles with assessment rounds appear here." action={<Button label="Reset filters" size="sm" variant="secondary" onPress={handleResetFilters} />} />
      )}
    </Card>
  );

  const c = activeCandidate;
  const isCandidateEvaluated = Boolean(c?.is_evaluated || (c?.composite_score != null));
  const isAssessmentIncomplete = Boolean(
    !c?.round_status_key ||
    c?.round_status_key === 'ROUND_NOT_COMPLETED' ||
    c?.round_status_key === 'ASSESSMENT_IN_PROGRESS' ||
    c?.round_status_key === 'SUBMITTED_EVALUATION_PENDING'
  );
  const isRoundComplete = Boolean(c?.round_status_key === 'ROUND_COMPLETED' || c?.round_status_key === 'AWAITING_RECRUITER_REVIEW');
  const canAdvance = Boolean(c?.can_progress && isRoundComplete && c?.integrity_status !== 'FLAGGED');
  const canSelect = Boolean((c?.can_select || c?.progression?.is_final_round) && isRoundComplete && c?.integrity_status !== 'FLAGGED');

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
          <Pill label={tl('Integrity: {{v0}}', {
            v0: c.integrity_status || 'Monitored'
          })} tone={c.integrity_status === 'FLAGGED' ? 'danger' : 'success'} icon="ShieldCheck" size="sm" />
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
        {/* Candidate Detail Header */}
        <Row gap={space.md} align="flex-start" wrap>
          <Avatar name={c.name} size={56} />
          <Stack gap={3} style={{ flex: 1, minWidth: 200 }}>
            <Txt variant="h2" tone="ink">{c.name}</Txt>
            <Txt variant="small" tone="muted">{[c.degree, c.college, c.cgpa ? `CGPA ${c.cgpa}` : null].filter(Boolean).join(' · ')}</Txt>
            <Row wrap gap={6} align="center">
              <Pill label={c.status} tone={statusTone(c.status)} size="sm" />
              {c.round ? <Pill label={c.round} tone="accent" icon="Target" size="sm" /> : null}
              {/* Prominent Round-Status Badge Beside Current Round */}
              {c.round_status_label ? (
                <Pill
                  label={c.round_status_label}
                  tone={c.round_status_tone || roundStatusTone(c.round_status_key)}
                  size="sm"
                />
              ) : null}
              {c.matchPct && c.matchPct !== 'Pending' ? <Pill label={tl('{{matchPct}} match', {
                matchPct: c.matchPct
              })} tone="success" size="sm" /> : null}
              {c.composite_score != null ? <Pill label={tl('Score {{composite_score}}', {
                composite_score: c.composite_score
              })} tone="info" size="sm" /> : (
                <Pill label="Evaluation Pending" tone="neutral" size="sm" />
              )}
            </Row>
          </Stack>
          {c.can_view_live ? <Button label="Watch live" icon="Eye" onPress={() => handleStartLiveObserver(c)} loading={observerLoading} /> : null}
        </Row>

        {(c.top_competencies || []).length ? (
          <Row wrap gap={6} style={{ marginTop: space.md }}>
            {c.top_competencies.map((t) => <Pill key={String(t)} label={String(t)} tone="success" size="sm" />)}
          </Row>
        ) : null}

        {/* Clean PostgreSQL Audit Trail Timeline */}
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

        {c.integrity_status === 'FLAGGED' ? (
          <Inset tone="danger" padding={space.sm} style={{ marginTop: space.md }}>
            <Row gap={8} align="center">
              <Icon name="AlertTriangle" size={18} color="#B4232A" />
              <Txt variant="small" weight={600} color="#B4232A">
                Integrity Flag: Candidate session flagged for review. Verify integrity logs before advancing candidate.
              </Txt>
            </Row>
          </Inset>
        ) : null}

        {/* System-Generated Scorecard (Strictly Read-Only for Recruiters) */}
        <Card padding={space.lg} tone="neutral" style={{ marginTop: space.lg, backgroundColor: colors.surfaceMuted }}>
          <Row justify="space-between" align="center" wrap gap={8}>
            <Row gap={8} align="center">
              <Icon name="Award" size={20} color={colors.lilacInk} />
              <Txt variant="h3" tone="ink">System Assessment Scorecard</Txt>
            </Row>
            <Row gap={6} align="center">
              {/* Prominent Round-Status Badge in Scorecard Header */}
              {c.round_status_label ? (
                <Pill
                  label={c.round_status_label}
                  tone={c.round_status_tone || roundStatusTone(c.round_status_key)}
                  size="sm"
                />
              ) : null}
              <Pill
                label={isCandidateEvaluated ? (c.verdict || 'Evaluated') : 'Pending Evaluation'}
                tone={verdictTone(c.verdict, isCandidateEvaluated)}
                size="sm"
              />
              {c.evaluation_source ? (
                <Pill label={c.evaluation_source} tone="neutral" size="sm" />
              ) : null}
            </Row>
          </Row>

          {/* Prominent Context Inset Alert */}
          {c.round_status_key === 'ROUND_NOT_COMPLETED' ? (
            <Inset tone="danger" padding={space.sm} style={{ marginTop: space.sm }}>
              <Row gap={8} align="center">
                <Icon name="AlertCircle" size={18} color="#B4232A" />
                <Txt variant="small" weight={700} color="#B4232A">
                  ROUND NOT COMPLETED: The candidate has not submitted or completed this assessment round.
                </Txt>
              </Row>
            </Inset>
          ) : c.round_status_key === 'ASSESSMENT_IN_PROGRESS' ? (
            <Inset tone="info" padding={space.sm} style={{ marginTop: space.sm }}>
              <Row gap={8} align="center">
                <Icon name="Clock" size={18} color={colors.skyInk} />
                <Txt variant="small" weight={700} color={colors.skyInk}>
                  ASSESSMENT IN PROGRESS: Candidate is currently participating in this assessment session.
                </Txt>
              </Row>
            </Inset>
          ) : c.round_status_key === 'SUBMITTED_EVALUATION_PENDING' ? (
            <Inset tone="warning" padding={space.sm} style={{ marginTop: space.sm }}>
              <Row gap={8} align="center">
                <Icon name="Hourglass" size={18} color={colors.warning} />
                <Txt variant="small" weight={700} color={colors.warning}>
                  SUBMITTED — EVALUATION PENDING: Assessment submitted. Automated rubric grading in progress.
                </Txt>
              </Row>
            </Inset>
          ) : c.round_status_key === 'AWAITING_RECRUITER_REVIEW' ? (
            <Inset tone="accent" padding={space.sm} style={{ marginTop: space.sm }}>
              <Row gap={8} align="center">
                <Icon name="CheckCircle" size={18} color={colors.lilacInk} />
                <Txt variant="small" weight={700} color={colors.lilacInk}>
                  AWAITING RECRUITER REVIEW: Evaluation complete. Recruiter review checkpoint pending confirmation.
                </Txt>
              </Row>
            </Inset>
          ) : null}

          {isCandidateEvaluated ? (
            <Row wrap gap={12} align="center" style={{ marginTop: space.sm }}>
              <Txt variant="caption" tone="muted">
                Overall Score: <Txt variant="small" weight={700} tone="ink">{c.composite_score != null ? `${c.composite_score}/100` : 'N/A'}</Txt>
              </Txt>
              <Txt variant="caption" tone="muted">
                System-derived from rubric weights and actual test/interview evaluation.
              </Txt>
            </Row>
          ) : (
            <Txt variant="caption" tone="muted" style={{ marginTop: space.xs }}>
              Candidate has not completed assessment evaluation. Scores and star ratings are generated automatically upon assessment submission.
            </Txt>
          )}

          {/* System Star Ratings (Read-Only) */}
          <Stack gap={10} style={{ marginTop: space.md }}>
            {RATING_KEYS.map(([k, label]) => {
              const starVal = c.ratings?.[k] || 0;
              return (
                <Row key={k} justify="space-between" wrap gap={6} align="center">
                  <Txt variant="small" weight={600} tone="ink">{label}</Txt>
                  <Row gap={4} align="center">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <View key={n}>
                        <Icon
                          name="Star"
                          size={18}
                          color={n <= starVal ? colors.butterStrong : colors.borderStrong}
                          fill={n <= starVal ? colors.butterStrong : 'none'}
                        />
                      </View>
                    ))}
                    <Txt variant="caption" weight={600} tone="muted" style={{ marginLeft: 6, width: 28, textAlign: 'right' }}>
                      {starVal > 0 ? `${starVal}/5` : '—'}
                    </Txt>
                  </Row>
                </Row>
              );
            })}
          </Stack>

          {/* System Evidence Feedback Cards */}
          <Stack gap={space.sm} style={{ marginTop: space.md }}>
            <Card padding={space.sm} tone="light">
              <Txt variant="caption" weight={700} tone="ink" style={{ marginBottom: 4 }}>SYSTEM EVALUATION: STRENGTHS</Txt>
              <Txt variant="small" tone="muted">{c.strengths || 'Evaluation pending candidate submission.'}</Txt>
            </Card>

            <Card padding={space.sm} tone="light">
              <Txt variant="caption" weight={700} tone="ink" style={{ marginBottom: 4 }}>SYSTEM EVALUATION: AREAS FOR IMPROVEMENT</Txt>
              <Txt variant="small" tone="muted">{c.areas_for_improvement || 'Evaluation pending candidate submission.'}</Txt>
            </Card>
          </Stack>

          {/* Permitted Recruiter Review Notes */}
          <Stack gap={6} style={{ marginTop: space.md }}>
            <Txt variant="small" weight={600} tone="ink">Recruiter Review Notes</Txt>
            <Field
              placeholder="Add recruiter review observations, interview remarks, or verification notes..."
              multiline
              value={recruiterNotes}
              onChangeText={setRecruiterNotes}
            />
            <Row gap={8} align="center" style={{ marginTop: 4 }}>
              <Button
                label={notesSaved ? 'Notes Saved' : 'Save Review Notes'}
                icon={notesSaved ? 'Check' : 'Send'}
                onPress={handleSaveReviewNotes}
                loading={isSavingNotes}
                size="sm"
              />
              <Txt variant="caption" tone="muted">
                Assessment scores and verdicts are strictly system-generated.
              </Txt>
            </Row>
          </Stack>
        </Card>

        {actionMessage ? (
          <Inset tone={actionMessage.type === 'error' ? 'danger' : 'success'} padding={space.sm} style={{ marginTop: space.md }}>
            <Txt variant="small" weight={600} tone="ink">{actionMessage.text}</Txt>
          </Inset>
        ) : null}

        {/* Workflow Progression Actions */}
        <Row gap={8} wrap style={{ marginTop: space.md }}>
          {c.next_round_name ? (
            <Button
              label={tl('Advance to {{next_round_name}}', {
                next_round_name: c.next_round_name
              })}
              icon="ArrowRight"
              onPress={() => handleProgressAction('advance')}
              loading={isProgressing}
              disabled={!canAdvance}
            />
          ) : null}
          <Button
            label="Select"
            icon="Award"
            tone="success"
            onPress={() => handleProgressAction('select')}
            disabled={isProgressing || !canSelect || c.status === 'Selected'}
          />
          <Button
            label="Reject"
            variant="danger"
            onPress={() => handleProgressAction('reject')}
            disabled={isProgressing || c.status === 'Rejected'}
          />
        </Row>
        {isAssessmentIncomplete && c.status !== 'Selected' && c.status !== 'Rejected' ? (
          <Txt variant="caption" color={colors.danger} weight={600} style={{ marginTop: 6 }}>
            {tl('This candidate must complete the {{round_name}} before advancing.', {
              round_name: c.current_round_name || 'Assessment'
            })}
          </Txt>
        ) : null}
        {c.integrity_status === 'FLAGGED' ? (
          <Txt variant="caption" color={colors.danger} weight={600} style={{ marginTop: 6 }}>
            Unresolved integrity flag detected. Recruiter override or verification required before proceeding.
          </Txt>
        ) : null}
      </Card>
    )
  ) : null;

  return (
    (<Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}>
      <SectionTitle
        title="Assessments"
        emoji="🎯"
        subtitle={selectedOverview ? tl('{{title}} · min match {{v1}}%', {
          title: selectedOverview.title,
          v1: selectedOverview.application_threshold ?? '—'
        }) : tl('{{length}} roles with assessment rounds', {
          length: internships.length
        })}
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
        {roundFilterOptions.map((rd) => (
          <Chip key={`r${rd}`} label={rd === 'All' ? 'Any round' : rd} tone="warning" selected={roundFilter === rd} onPress={() => setRoundFilter(rd)} />
        ))}
      </ScrollView>
      {pipelineRounds.length ? (
        <Card padding={space.lg}>
          <Row justify="space-between" align="center" wrap gap={8}>
            <Txt variant="h3" tone="ink">Recruitment Assessment Pipeline</Txt>
            {roundFilter !== 'All' ? (
              <Button label="Clear round filter" size="sm" variant="ghost" onPress={() => setRoundFilter('All')} />
            ) : null}
          </Row>
          <Row wrap gap={8} style={{ marginTop: space.sm }}>
            {pipelineRounds.map((rd, i) => {
              const isFiltered = roundFilter === rd.round_name || roundFilter === rd.round_key;
              const isCurrentCandidateRound = Boolean(
                c && (
                  String(c.current_round_key).toLowerCase() === String(rd.round_key).toLowerCase() ||
                  String(c.current_round_name).toLowerCase() === String(rd.round_name).toLowerCase()
                )
              );
              return (
                <React.Fragment key={rd.round_key || rd.round_name}>
                  <Pressable
                    onPress={() => setRoundFilter(isFiltered ? 'All' : rd.round_name)}
                    style={[
                      styles.roundCell,
                      isFiltered ? { backgroundColor: colors.lilac, borderColor: colors.lilacInk, borderWidth: 1 } : null,
                      isCurrentCandidateRound ? { borderColor: colors.lilacInk, borderWidth: 1.5 } : null,
                      webOnly({ cursor: 'pointer' })
                    ]}
                  >
                    <Txt variant="caption" tone="muted">{rd.sequence ?? i + 1}. {rd.duration ? `${rd.duration}` : (rd.type || 'Round')}</Txt>
                    <Txt variant="small" weight={700} tone="ink">{rd.round_name}</Txt>
                    <Txt variant="caption" tone="muted">{rd.completed_count ?? 0}/{rd.candidates_count ?? 0} completed</Txt>
                    {isCurrentCandidateRound && c.round_status_label ? (
                      <View style={{ marginTop: 4 }}>
                        <Pill
                          label={c.round_status_label}
                          tone={c.round_status_tone || roundStatusTone(c.round_status_key)}
                          size="xs"
                        />
                      </View>
                    ) : rd.in_progress_count > 0 ? (
                      <Txt variant="caption" tone="info">{rd.in_progress_count} in progress</Txt>
                    ) : null}
                  </Pressable>
                  {i < pipelineRounds.length - 1 ? <Icon name="ChevronRight" size={16} color={colors.textSubtle} style={{ alignSelf: 'center' }} /> : null}
                </React.Fragment>
              );
            })}
          </Row>
        </Card>
      ) : (
        <Card padding={space.md} tone="neutral">
          <Row gap={12} align="center">
            <Icon name="GitBranch" size={24} color={colors.textMuted} />
            <Stack gap={2} style={{ flex: 1 }}>
              <Txt variant="small" weight={700} tone="ink">No Published Assessment Pipeline</Txt>
              <Txt variant="caption" tone="muted">
                No recruitment pipeline has been published for this internship. Configure and publish a pipeline in the Pipeline Editor to enable automated assessment rounds.
              </Txt>
            </Stack>
          </Row>
        </Card>
      )}
      <View style={[styles.split, isDesktop ? styles.splitRow : null]}>
        <View style={isDesktop ? { width: 400 } : null}>{list}</View>
        <View style={isDesktop ? { flex: 1, minWidth: 0 } : null}>{workspace}</View>
      </View>
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
