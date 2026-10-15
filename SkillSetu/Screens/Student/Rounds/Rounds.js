import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  fetchStudentRoundsDashboard,
  startApplicationAssessment,
  startPracticeAssessment,
  evaluatePracticeAnswer,
} from '../services/applicationService';
import InterviewBankSheet from './components/InterviewBankSheet';
import {
  Avatar,
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  EventCard,
  FeatureCard,
  Field,
  Icon,
  IconButton,
  Inset,
  Page,
  Pill,
  ProgressBar,
  Ring,
  Row,
  SectionTitle,
  Sheet,
  Skeleton,
  Stack,
  StatTile,
  Timeline,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';

export default function Rounds({ user, onNavigate, navigationParams }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1320 || (width >= 900 && width < 1120);
  const studentEmail = user?.email || '';


  // 100% PostgreSQL-driven dashboard state
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Assessment & Practice Launch State
  const [launchingAppId, setLaunchingAppId] = useState(null);
  const [practicingAppId, setPracticingAppId] = useState(null);

  // Interactive UI State
  const [timelineViewMode, setTimelineViewMode] = useState('list'); // 'list' | 'calendar'
  const [selectedTimelineFilter, setSelectedTimelineFilter] = useState('All');
  const [questionBankFilter, setQuestionBankFilter] = useState('All');
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [allQuestionsExpanded, setAllQuestionsExpanded] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'practice' | 'details'
  const [isAIInterviewPracticeOpen, setIsAIInterviewPracticeOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);

  const loadDashboard = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const data = await fetchStudentRoundsDashboard(studentEmail);
      if (data) {
        setDashboardData(data);
      } else {
        setDashboardData(null);
      }
    } catch (err) {
      console.error('[Rounds Screen] Error loading dashboard:', err);
      setError(err.message || 'Failed to load rounds data from server');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [studentEmail]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Derived Career Track
  const careerTrack = dashboardData?.career_track || '';

  // Derived KPI Metrics
  const kpi = useMemo(() => {
    const defaultKpi = {
      applications: 0,
      active_rounds: 0,
      prep_progress: 0,
      mocks_taken: 0,
      average_score: null,
      scheduled: 0,
    };
    return dashboardData?.kpi_metrics || defaultKpi;
  }, [dashboardData]);

  // Derived Applications List: Only show internships whose assessment rounds / pipeline are configured
  const applications = useMemo(() => {
    const rawApps = dashboardData?.applications || [];
    return rawApps.filter(
      (app) => !!app.has_pipeline && Array.isArray(app.rounds) && app.rounds.length > 0
    );
  }, [dashboardData]);

  // Derived available roles from career track and application history
  const availableRoles = useMemo(() => {
    const set = new Set();
    if (careerTrack) set.add(careerTrack);
    (applications || []).forEach((app) => {
      if (app.role_title) set.add(app.role_title);
    });
    ['Backend Developer', 'Frontend Developer', 'Full Stack Developer', 'Data Analyst / ML Engineer', 'DevOps / Cloud Engineer'].forEach(
      (r) => set.add(r)
    );
    return Array.from(set);
  }, [careerTrack, applications]);

  // Derived Schedule Entries
  const scheduleEntries = useMemo(() => {
    return dashboardData?.schedule_entries || [];
  }, [dashboardData]);

  // Filtered Schedule Entries
  const filteredScheduleEntries = useMemo(() => {
    if (!scheduleEntries || scheduleEntries.length === 0) return [];
    if (selectedTimelineFilter === 'All') return scheduleEntries;
    if (selectedTimelineFilter === 'Upcoming') {
      return scheduleEntries.filter((s) => s.status === 'SCHEDULED' || s.status === 'AVAILABLE');
    }
    if (selectedTimelineFilter === 'Today') {
      const todayStr = new Date().toISOString().split('T')[0];
      return scheduleEntries.filter((s) => s.scheduled_date && s.scheduled_date.includes(todayStr));
    }
    if (selectedTimelineFilter === 'This Week') {
      return scheduleEntries.filter(
        (s) => s.status === 'SCHEDULED' || s.status === 'AVAILABLE' || s.status === 'IN_PROGRESS'
      );
    }
    if (selectedTimelineFilter === 'Complete') {
      return scheduleEntries.filter((s) => s.status === 'COMPLETED');
    }
    return scheduleEntries;
  }, [scheduleEntries, selectedTimelineFilter]);

  // Timeline Filter Counts
  const timelineCounts = useMemo(() => {
    const all = scheduleEntries.length;
    const upcoming = scheduleEntries.filter(
      (s) => s.status === 'SCHEDULED' || s.status === 'AVAILABLE'
    ).length;
    const todayStr = new Date().toISOString().split('T')[0];
    const today = scheduleEntries.filter(
      (s) => s.scheduled_date && s.scheduled_date.includes(todayStr)
    ).length;
    const thisWeek = scheduleEntries.filter(
      (s) => s.status === 'SCHEDULED' || s.status === 'AVAILABLE' || s.status === 'IN_PROGRESS'
    ).length;
    const complete = scheduleEntries.filter((s) => s.status === 'COMPLETED').length;
    return { all, upcoming, today, thisWeek, complete };
  }, [scheduleEntries]);

  // Derived Skill Matrix
  const skillMatrix = useMemo(() => {
    return dashboardData?.skill_matrix || [];
  }, [dashboardData]);

  // Derived Project Questions
  const projectQuestions = useMemo(() => {
    return dashboardData?.project_questions || [];
  }, [dashboardData]);

  // Derived Question Bank
  const rawQuestionBank = useMemo(() => {
    return dashboardData?.question_bank || [];
  }, [dashboardData]);

  // Dynamic Question Bank Categories
  const questionCategories = useMemo(() => {
    const cats = ['All'];
    const catMap = {};
    rawQuestionBank.forEach((q) => {
      const c = q.category || 'General';
      catMap[c] = (catMap[c] || 0) + 1;
      if (!cats.includes(c)) cats.push(c);
    });
    return { cats, catMap };
  }, [rawQuestionBank]);

  // Filtered Question Bank
  const filteredQuestionBank = useMemo(() => {
    if (questionBankFilter === 'All') return rawQuestionBank;
    return rawQuestionBank.filter((q) => q.category === questionBankFilter);
  }, [rawQuestionBank, questionBankFilter]);

  // Derived Interview History
  const interviewHistory = useMemo(() => {
    return dashboardData?.interview_history || [];
  }, [dashboardData]);

  // Derived Trajectory
  const trajectory = useMemo(() => {
    return (
      dashboardData?.trajectory || {
        has_sufficient_data: false,
        message: 'Not enough historical assessment data yet.',
      }
    );
  }, [dashboardData]);

  // Actions
  const handleStartAIPracticeSession = async ({ applicationId, internshipId, targetRound } = {}) => {
    setPracticingAppId(applicationId || 'global');
    try {
      const res = await startPracticeAssessment({
        applicationId,
        internshipId,
        targetRound: targetRound || 'aptitude',
        email: studentEmail,
      });
      if (res?.assessment_url) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(res.assessment_url, '_blank');
        } else {
          // @ts-ignore
          import('react-native').then(({ Linking }) => Linking.openURL(res.assessment_url));
        }
      }
    } catch (err) {
      alert(err.message || 'Could not launch AI practice session.');
    } finally {
      setPracticingAppId(null);
    }
  };

  const handleStartOfficialAssessment = async (appId) => {
    setLaunchingAppId(appId);
    try {
      const res = await startApplicationAssessment(appId, studentEmail);
      if (res?.assessment_url) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(res.assessment_url, '_blank');
        } else {
          // @ts-ignore
          import('react-native').then(({ Linking }) => Linking.openURL(res.assessment_url));
        }
        setTimeout(() => loadDashboard(true), 2000);
      }
    } catch (err) {
      alert(err.message || 'Could not launch assessment.');
    } finally {
      setLaunchingAppId(null);
    }
  };

  const handleOpenDetailsModal = (item) => {
    setModalData(item);
    setActiveModal('details');
  };

  const handleStartPracticeModal = (questionInput) => {
    if (typeof questionInput === 'string') {
      setModalData({ title: questionInput, question: questionInput });
    } else if (questionInput && typeof questionInput === 'object') {
      setModalData({
        ...questionInput,
        title: questionInput.question || questionInput.title || 'Technical Question',
      });
    } else {
      setModalData({ title: 'System Architecture & Behavioral Interview Question' });
    }
    setActiveModal('practice');
    setPracticeAnswer('');
    setAiFeedback(null);
    setEvaluationError(null);
    setIsEvaluatingAI(false);
  };

  const handleEvaluateAI = async () => {
    if (!practiceAnswer || !practiceAnswer.trim()) {
      alert('Please enter or dictate an answer before requesting AI evaluation.');
      return;
    }
    setIsEvaluatingAI(true);
    setAiFeedback(null);
    setEvaluationError(null);

    try {
      const qText = modalData?.question || modalData?.title || 'Technical Question';
      const qId = modalData?.id || `Q_${qText.slice(0, 10).replace(/\W/g, '').toUpperCase()}`;
      const res = await evaluatePracticeAnswer(
        {
          question_id: qId,
          question_text: qText,
          student_answer: practiceAnswer.trim(),
          target_role: modalData?.target_role || careerTrack || '',
          category: modalData?.category || 'Technical',
          difficulty: modalData?.difficulty || 'Intermediate',
          skill: modalData?.skill || null,
          repo_name: modalData?.repo_name || null,
          expected_concepts: modalData?.explanation || null,
        },
        studentEmail
      );

      if (res) {
        setAiFeedback(res);
      } else {
        setEvaluationError('Evaluation unavailable. Please try again.');
      }
    } catch (err) {
      console.error('[Rounds] Error during AI practice evaluation:', err);
      setEvaluationError(err.message || 'Evaluation unavailable. Please try again.');
    } finally {
      setIsEvaluatingAI(false);
    }
  };

  const handleToggleExpandAllQuestions = () => {
    if (allQuestionsExpanded) {
      setExpandedQuestion(null);
      setAllQuestionsExpanded(false);
    } else {
      setExpandedQuestion('ALL');
      setAllQuestionsExpanded(true);
    }
  };

  const handleDownloadDossier = () => {
    if (!dashboardData) {
      alert('No evaluation dossier data available to export yet.');
      return;
    }
    const dossierText = `=====================================================
SKILLSETU CANDIDATE EVALUATION DOSSIER
=====================================================
Generated: ${new Date().toLocaleString()}
Student Email: ${studentEmail}
Career Track Target: ${careerTrack}

KPI SUMMARY:
- Total Applications: ${kpi.applications}
- Active Pipeline Rounds: ${kpi.active_rounds}
- Canonical Prep Progress: ${kpi.prep_progress}%
- Mocks Taken: ${kpi.mocks_taken}
- Average Assessment Score: ${kpi.average_score !== null ? `${kpi.average_score}%` : 'N/A'}
- Scheduled Rounds: ${kpi.scheduled}

VERIFIED SKILL MATRIX:
${
  skillMatrix
    .map((s) => `• ${s.skill_name}: ${s.percentage}% (${s.level}) - Verified: ${s.is_verified ? 'YES' : 'NO'}`)
    .join('\n') || 'No verified skills recorded yet.'
}

PAST INTERVIEW HISTORY:
${
  interviewHistory
    .map(
      (h) =>
        `• ${h.company_name} | ${h.role_title} | ${h.round_name} | Score: ${h.overall_score}% | Decision: ${h.decision}\n  Feedback: ${h.feedback_summary}`
    )
    .join('\n\n') || 'No completed assessment records yet.'
}

TRAJECTORY ANALYTICS:
${
  trajectory.has_sufficient_data
    ? `• Historical Growth: ${trajectory.growth_label}\n• Baseline: ${trajectory.baseline_period} (${trajectory.baseline_score}%) -> Current: ${trajectory.current_period} (${trajectory.current_score}%)\n• Strongest Competency: ${trajectory.strongest_competency} (${trajectory.strongest_competency_score}%)`
    : trajectory.message
}
=====================================================`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([dossierText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SkillSetu_Evaluation_Dossier_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Evaluation Dossier Export:\n\n' + dossierText);
    }
  };

  const [showAllSkills, setShowAllSkills] = useState(false);
  const roundTone = (st) => (st === 'COMPLETED' ? 'success' : st === 'IN_PROGRESS' ? 'info' : st === 'AVAILABLE' ? 'accent' : st === 'EXPIRED' || st === 'FAILED' ? 'danger' : 'neutral');
  const pretty = (s) => String(s || '').toLowerCase().replace(/_/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const scoreTone = (n) => (n >= 75 ? 'success' : n >= 50 ? 'info' : 'warning');

  const aside = (
    <>
      <SectionTitle title="Schedule" emoji="🗓️" />
      <ChipGroup
        options={[
          { id: 'All', label: `All ${timelineCounts.all}` },
          { id: 'Upcoming', label: `Upcoming ${timelineCounts.upcoming}` },
          { id: 'Today', label: `Today ${timelineCounts.today}` },
          { id: 'Complete', label: `Done ${timelineCounts.complete}` },
        ]}
        value={selectedTimelineFilter}
        multiple={false}
        tone="accent"
        onChange={setSelectedTimelineFilter}
      />
      {filteredScheduleEntries.map((s) => (
        <EventCard
          key={s.id}
          tone={s.status === 'COMPLETED' ? 'success' : s.status === 'AVAILABLE' ? 'accent' : s.status === 'IN_PROGRESS' ? 'info' : 'warning'}
          icon={s.status === 'COMPLETED' ? 'CircleCheck' : 'Clock'}
          type={s.round_name}
          date={s.scheduled_date}
          title={`${s.role_title} · ${s.company_name}`}
          body={`${s.display_time || s.round_type || ''}${s.duration_min ? ` · ${s.duration_min} min` : ''}`}
          footer={
            s.status === 'AVAILABLE' || s.status === 'IN_PROGRESS' ? (
              <Pressable onPress={() => handleStartOfficialAssessment(s.application_id)} style={[styles.footerBtn, webOnly({ cursor: 'pointer' })]}>
                <Icon name="Play" size={14} color={colors.ink} />
                <Txt variant="small" weight={600} tone="ink">{launchingAppId === s.application_id ? 'Opening…' : s.status === 'IN_PROGRESS' ? 'Resume round' : 'Start round'}</Txt>
              </Pressable>
            ) : null
          }
        />
      ))}
      {!filteredScheduleEntries.length && !isLoading ? (
        <View style={styles.emptyEvents}>
          <EmptyState icon="Calendar" title="Nothing scheduled" message="Assessment rounds from recruiters appear here once you're shortlisted." />
        </View>
      ) : null}
      {interviewHistory.slice(0, 3).map((h) => (
        <EventCard key={h.id} tone="neutral" icon="Award" type={h.round_name} date={`${h.overall_score ?? '—'}%`} title={`${h.role_title} · ${h.company_name}`} body={`${h.decision || ''}${h.feedback_summary ? ` — ${h.feedback_summary}` : ''}`} />
      ))}
    </>
  );

  return (
    <Page aside={aside} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}>
      <SectionTitle
        title="Assessments"
        emoji="🎯"
        subtitle={careerTrack && careerTrack.length <= 40 && !careerTrack.trim().endsWith('.') ? `Interview prep for ${careerTrack}` : 'Your assessment rounds and interview practice'}
        right={
          <Row gap={8}>
            <Button label="Export dossier" icon="Download" variant="secondary" onPress={handleDownloadDossier} />
            <IconButton icon="RefreshCw" size={44} onPress={() => loadDashboard(true)} accessibilityLabel="Refresh" />
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
        <StatTile value={isLoading ? '…' : kpi.active_rounds} label="Active rounds" tone="accent" style={styles.stat} />
        <StatTile value={isLoading ? '…' : kpi.scheduled} label="Scheduled" tone="info" style={styles.stat} />
        <StatTile value={isLoading ? '…' : `${kpi.prep_progress ?? 0}%`} label="Prep progress" tone="success" style={styles.stat} />
        <StatTile value={isLoading ? '…' : kpi.average_score != null ? `${kpi.average_score}%` : '—'} label="Avg score" dashed style={styles.stat} />
      </View>

      <FeatureCard tilt={isWide}>
        <Row align="flex-start" gap={space.md}>
          <Stack gap={6} style={{ flex: 1 }}>
            <Txt variant="overline" color={colors.lilacInk}>AI mock interview</Txt>
            <Txt variant="h2" tone="ink">Practise the real rounds before they count</Txt>
            <Txt variant="small" color={colors.lilacInk}>Aptitude, technical and HR rounds with live AI feedback — {kpi.mocks_taken || 0} mocks taken so far.</Txt>
          </Stack>
          <Pressable onPress={() => handleStartAIPracticeSession({ targetRound: 'aptitude' })} style={[styles.playDisc, webOnly({ cursor: 'pointer' })]} accessibilityLabel="Start mock interview">
            <Icon name="Play" size={26} color={colors.ink} />
          </Pressable>
        </Row>
        <Row gap={8} style={{ marginTop: space.lg }} wrap>
          <Button label="Start mock" icon="Play" onPress={() => handleStartAIPracticeSession({ targetRound: 'aptitude' })} loading={practicingAppId === 'global'} />
          <Button label="Question bank" icon="MessageCircle" variant="light" onPress={() => setIsAIInterviewPracticeOpen(true)} />
        </Row>
      </FeatureCard>

      <SectionTitle title="Your pipelines" size="h2" subtitle="Internships where recruiters set up assessment rounds." />
      {isLoading ? (
        <Skeleton height={160} radius={radii.xl} />
      ) : applications.length ? (
        <Stack gap={space.md}>
          {applications.map((app) => (
            <Card key={app.application_id} badge={{ icon: 'Target', tone: app.can_start ? 'accent' : 'neutral' }}>
              <Row gap={space.sm} align="flex-start">
                <Avatar name={app.company_name} size={44} />
                <Stack gap={2} style={{ flex: 1 }}>
                  <Txt variant="h3" tone="ink">{app.internship_title}</Txt>
                  <Txt variant="small" tone="muted">{app.company_name} · Applied {app.applied_at}</Txt>
                </Stack>
                <Pill label={pretty(app.overall_status || app.application_status)} tone={roundTone(app.overall_status)} size="sm" />
              </Row>
              <Row gap={6} wrap style={{ marginTop: space.md }}>
                {(app.rounds || []).map((r, i) => (
                  <React.Fragment key={r.round_id || i}>
                    <Pill label={`${i + 1}. ${r.round_name}`} tone={roundTone(r.status)} icon={r.status === 'COMPLETED' ? 'Check' : r.status === 'AVAILABLE' ? 'Play' : undefined} size="sm" />
                    {i < app.rounds.length - 1 ? <Icon name="ChevronRight" size={14} color={colors.textSubtle} /> : null}
                  </React.Fragment>
                ))}
              </Row>
              <Row gap={10} style={{ marginTop: space.md }}>
                <ProgressBar value={app.progress_percent || 0} tone="accent" style={{ flex: 1 }} />
                <Txt variant="small" weight={700} tone="ink">{app.completed_rounds_count || 0}/{app.total_rounds || (app.rounds || []).length}</Txt>
              </Row>
              <Row justify="flex-end" gap={8} style={{ marginTop: space.md }} wrap>
                <Button label="Details" size="sm" variant="secondary" onPress={() => handleOpenDetailsModal(app)} />
                <Button label="Practise" size="sm" variant="secondary" icon="Sparkles" onPress={() => handleStartAIPracticeSession({ applicationId: app.application_id, internshipId: app.internship_id, targetRound: app.active_round_key })} loading={practicingAppId === app.application_id} />
                <Button label={app.can_start ? 'Start round' : 'Not open yet'} size="sm" icon="Play" disabled={!app.can_start} onPress={() => handleStartOfficialAssessment(app.application_id)} loading={launchingAppId === app.application_id} />
              </Row>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card>
          <EmptyState icon="Target" title="No assessment pipelines yet" message="When a recruiter shortlists you for a role with rounds, it shows up here." action={<Button label="Find internships" size="sm" onPress={() => onNavigate && onNavigate('Opportunities')} />} />
        </Card>
      )}

      <View style={[styles.grid, isWide ? styles.gridRow : null]}>
        <View style={isWide ? { flex: 1, minWidth: 0 } : null}>
          <Card badge={{ icon: 'Zap', tone: 'success' }}>
            <Txt variant="h2" tone="ink">Skill matrix</Txt>
            <Txt variant="small" tone="muted" style={{ marginBottom: space.md }}>Evidence recruiters see before your interview.</Txt>
            {skillMatrix.length ? (
              <Stack gap={10}>
                {(showAllSkills ? skillMatrix : skillMatrix.slice(0, 8)).map((s) => (
                  <Stack key={s.skill_name} gap={4}>
                    <Row justify="space-between">
                      <Row gap={6} style={{ flex: 1 }}>
                        <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{s.skill_name}</Txt>
                        {s.is_verified ? <Icon name="ShieldCheck" size={13} color={colors.mintInk} /> : null}
                      </Row>
                      <Txt variant="caption" tone="muted">{s.level} · {s.percentage}%</Txt>
                    </Row>
                    <ProgressBar value={s.percentage} tone={scoreTone(s.percentage)} height={6} />
                  </Stack>
                ))}
                {skillMatrix.length > 8 ? <Button label={showAllSkills ? 'Show less' : `Show all ${skillMatrix.length}`} size="sm" variant="ghost" onPress={() => setShowAllSkills((v) => !v)} /> : null}
              </Stack>
            ) : (
              <Txt variant="small" tone="subtle">No skill evidence yet.</Txt>
            )}
          </Card>
        </View>
        <View style={isWide ? { flex: 1, minWidth: 0, gap: space.md } : { gap: space.md }}>
          {projectQuestions.length ? (
            <Card badge={{ icon: 'GitBranch', tone: 'info' }}>
              <Txt variant="h2" tone="ink">From your projects</Txt>
              <Txt variant="small" tone="muted" style={{ marginBottom: space.md }}>Interviewers will ask about your own repositories.</Txt>
              <Stack gap={8}>
                {projectQuestions.map((q) => (
                  <Inset key={q.id} tone="info">
                    <Row gap={6} wrap>
                      <Pill label={q.repo_name} icon="GitBranch" size="sm" />
                      {q.difficulty ? <Pill label={q.difficulty} tone="warning" size="sm" /> : null}
                    </Row>
                    <Txt variant="small" tone="ink" style={{ marginTop: 6 }}>{q.question}</Txt>
                    <Button label="Practise" size="sm" icon="Mic" variant="light" onPress={() => handleStartPracticeModal(q)} style={{ marginTop: 8 }} />
                  </Inset>
                ))}
              </Stack>
            </Card>
          ) : null}
          <Card tone={trajectory.has_sufficient_data ? 'success' : undefined}>
            <Txt variant="h3" tone="ink">Growth trajectory</Txt>
            {trajectory.has_sufficient_data ? (
              <Stack gap={4} style={{ marginTop: 6 }}>
                <Txt variant="small" tone="ink">{trajectory.growth_label}</Txt>
                <Txt variant="caption" tone="muted">{trajectory.baseline_period} {trajectory.baseline_score}% → {trajectory.current_period} {trajectory.current_score}%</Txt>
              </Stack>
            ) : (
              <Txt variant="small" tone="muted" style={{ marginTop: 6 }}>{trajectory.message}</Txt>
            )}
            {trajectory.strongest_competency ? <Pill label={`Strongest: ${trajectory.strongest_competency} ${trajectory.strongest_competency_score ?? ''}%`} tone="success" icon="Award" size="sm" style={{ marginTop: 10 }} /> : null}
          </Card>
        </View>
      </View>

      {rawQuestionBank.length ? (
        <Card>
          <Row justify="space-between" wrap gap={8}>
            <Txt variant="h2" tone="ink">Question bank</Txt>
            <Button label={allQuestionsExpanded ? 'Collapse all' : 'Expand all'} size="sm" variant="ghost" onPress={handleToggleExpandAllQuestions} />
          </Row>
          <Row wrap gap={6} style={{ marginVertical: space.md }}>
            {questionCategories.cats.map((c) => (
              <Chip key={c} label={c === 'All' ? `All ${rawQuestionBank.length}` : `${c} ${questionCategories.catMap[c]}`} tone="info" selected={questionBankFilter === c} onPress={() => setQuestionBankFilter(c)} />
            ))}
          </Row>
          <Stack gap={8}>
            {filteredQuestionBank.map((q) => {
              const open = expandedQuestion === 'ALL' || expandedQuestion === q.id;
              return (
                <Pressable key={q.id} onPress={() => setExpandedQuestion(open && expandedQuestion !== 'ALL' ? null : q.id)} style={[styles.qRow, webOnly({ cursor: 'pointer' })]}>
                  <Row justify="space-between" gap={8}>
                    <Txt variant="small" weight={700} tone="ink" style={{ flex: 1 }}>{q.title}</Txt>
                    <Pill label={q.difficulty} tone="warning" size="sm" />
                    <Icon name="ChevronDown" size={16} color={colors.textMuted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
                  </Row>
                  {open ? (
                    <Stack gap={6} style={{ marginTop: 8 }}>
                      <Txt variant="small" tone="default">{q.question}</Txt>
                      {q.sample_approach ? (
                        <Inset tone="success" padding={space.sm}>
                          <Txt variant="caption" weight={700} color={colors.mintInk}>Approach</Txt>
                          <Txt variant="small" color={colors.mintInk}>{q.sample_approach}</Txt>
                        </Inset>
                      ) : null}
                      <Button label="Practise this" size="sm" icon="Mic" onPress={() => handleStartPracticeModal(q)} />
                    </Stack>
                  ) : null}
                </Pressable>
              );
            })}
          </Stack>
        </Card>
      ) : null}

      {/* Pipeline details */}
      <Sheet
        visible={activeModal === 'details' && !!modalData}
        onClose={() => setActiveModal(null)}
        title={modalData?.internship_title || modalData?.role_title}
        subtitle={modalData?.company_name}
        icon="Target"
        tone="accent"
      >
        {modalData ? (
          <>
            <Row wrap gap={6}>
              {modalData.application_status ? <Pill label={pretty(modalData.application_status)} /> : null}
              {modalData.applied_at ? <Pill label={`Applied ${modalData.applied_at}`} icon="Calendar" /> : null}
              {modalData.progress_percent != null ? <Pill label={`${modalData.progress_percent}% complete`} tone="accent" /> : null}
            </Row>
            {(modalData.required_skills || []).length ? (
              <Row wrap gap={6}>{modalData.required_skills.map((s) => <Pill key={s} label={s} tone="info" size="sm" />)}</Row>
            ) : null}
            {(modalData.rounds || []).length ? (
              <Timeline
                gap={space.sm}
                items={modalData.rounds.map((r, i) => ({
                  key: r.round_id || i,
                  done: r.status === 'COMPLETED',
                  content: (
                    <Card padding={space.md}>
                      <Row justify="space-between">
                        <Txt variant="small" weight={700} tone="ink">{r.round_name}</Txt>
                        <Pill label={pretty(r.status)} tone={roundTone(r.status)} size="sm" />
                      </Row>
                      <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        {[r.schedule_type, r.display_time, r.duration_min && `${r.duration_min} min`, r.score != null && `Score ${r.score}%`].filter(Boolean).join(' · ')}
                      </Txt>
                    </Card>
                  ),
                }))}
              />
            ) : null}
          </>
        ) : null}
      </Sheet>

      {/* Practice answer with AI feedback */}
      <Sheet
        visible={activeModal === 'practice' && !!modalData}
        onClose={() => setActiveModal(null)}
        title="Practise your answer"
        subtitle={modalData?.skill || modalData?.category || modalData?.repo_name || 'Interview question'}
        icon="Mic"
        tone="accent"
        width={720}
        footer={
          <>
            <Button label="Close" variant="secondary" onPress={() => setActiveModal(null)} />
            <Button label={aiFeedback ? 'Re-evaluate' : 'Get AI feedback'} icon="Sparkles" onPress={handleEvaluateAI} loading={isEvaluatingAI} />
          </>
        }
      >
        <Inset tone="accent">
          <Txt variant="bodyStrong" tone="ink">{modalData?.question || modalData?.title}</Txt>
        </Inset>
        <Field multiline placeholder="Type your answer as you'd say it in the interview…" value={practiceAnswer} onChangeText={setPracticeAnswer} inputStyle={{ minHeight: 140 }} />
        {evaluationError ? <Txt variant="small" tone="danger">{evaluationError}</Txt> : null}
        {aiFeedback ? (
          <Card padding={space.lg}>
            <Row justify="space-between" align="flex-start" gap={space.md}>
              <Stack gap={4} style={{ flex: 1 }}>
                <Txt variant="h3" tone="ink">{aiFeedback.verdict || 'Feedback'}</Txt>
                <Txt variant="small" tone="muted">{aiFeedback.feedback}</Txt>
              </Stack>
              <Ring value={aiFeedback.score || 0} size={72} stroke={8} tone={scoreTone(aiFeedback.score || 0)}>
                <Txt variant="title" tone="ink">{aiFeedback.score ?? '—'}</Txt>
              </Ring>
            </Row>
            <View style={styles.metricGrid}>
              {[
                ['Correctness', aiFeedback.correctness],
                ['Completeness', aiFeedback.completeness],
                ['Relevance', aiFeedback.relevance],
                ['Depth', aiFeedback.technical_depth],
              ].filter(([, v]) => v != null).map(([label, v]) => (
                <View key={label} style={styles.metricCell}>
                  <Row justify="space-between"><Txt variant="caption" weight={600} tone="ink">{label}</Txt><Txt variant="caption" weight={700} tone="ink">{v}</Txt></Row>
                  <ProgressBar value={Number(v) <= 10 ? Number(v) * 10 : Number(v)} tone="accent" height={5} style={{ marginTop: 6 }} />
                </View>
              ))}
            </View>
            {(aiFeedback.strengths || []).length ? (
              <Stack gap={4} style={{ marginTop: space.md }}>
                <Txt variant="caption" weight={700} tone="ink">Strengths</Txt>
                {aiFeedback.strengths.map((s, i) => <Txt key={i} variant="small" color={colors.mintInk}>✓ {s}</Txt>)}
              </Stack>
            ) : null}
            {(aiFeedback.missing_points || []).length ? (
              <Stack gap={4} style={{ marginTop: space.md }}>
                <Txt variant="caption" weight={700} tone="ink">Missing</Txt>
                {aiFeedback.missing_points.map((s, i) => <Txt key={i} variant="small" color={colors.butterInk}>• {s}</Txt>)}
              </Stack>
            ) : null}
            {aiFeedback.star_optimization_tip ? (
              <Inset tone="info" style={{ marginTop: space.md }}>
                <Txt variant="small" color={colors.skyInk}>{aiFeedback.star_optimization_tip}</Txt>
              </Inset>
            ) : null}
          </Card>
        ) : null}
      </Sheet>

      <InterviewBankSheet
        visible={isAIInterviewPracticeOpen}
        onClose={() => setIsAIInterviewPracticeOpen(false)}
        studentEmail={studentEmail}
        initialRole={careerTrack}
        availableRoles={availableRoles}
        onPracticeSingleQuestion={(q) => {
          setIsAIInterviewPracticeOpen(false);
          handleStartPracticeModal(q);
        }}
        onStartFullMock={() => handleStartAIPracticeSession({ targetRound: 'technical' })}
      />
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
    flexBasis: 140,
  },
  grid: {
    gap: space.md,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  playDisc: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyEvents: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
  },
  qRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: space.sm,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.md,
  },
  metricCell: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.lilac,
    borderRadius: radii.sm,
    padding: space.sm,
  },
});
