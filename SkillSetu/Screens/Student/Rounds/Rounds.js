import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  fetchStudentRoundsDashboard,
  startApplicationAssessment,
  startPracticeAssessment,
  evaluatePracticeAnswer,
} from '../services/applicationService';
import { CLAY_COLORS, ensureClayGlobalStyles } from './components/DesignTokens';
import AmbientBackground from './components/AmbientBackground';
import RoundsHero from './components/RoundsHero';
import RoundsMetricGrid from './components/RoundsMetricGrid';
import MockInterviewCard from './components/MockInterviewCard';
import AssessmentRoundsSection from './components/AssessmentRoundsSection';
import ScheduleTimelineSection from './components/ScheduleTimelineSection';
import SkillMatrixAndProjectQuestions from './components/SkillMatrixAndProjectQuestions';
import QuestionBankSection from './components/QuestionBankSection';
import HistoryAndAnalyticsSection from './components/HistoryAndAnalyticsSection';
import RoundsFooter from './components/RoundsFooter';
import RoundsModals from './components/RoundsModals';
import AIInterviewPracticeModal from './components/AIInterviewPracticeModal';

export default function Rounds({ user, onNavigate, navigationParams }) {
  const studentEmail = user?.email || '';

  // Ensure global claymorphism CSS keyframes and fonts are injected on web
  useEffect(() => {
    ensureClayGlobalStyles();
  }, []);

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
  const careerTrack = dashboardData?.career_track || 'Full Stack / Backend Engineer';

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

  const handleSimulateAudioRecord = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setPracticeAnswer(
        'In my architecture, I enforced a strict separation of concerns with asynchronous messaging and idempotency keys. Under high load, database connection contention is mitigated through connection pooling, distributed caching with Redis, and eventual consistency.'
      );
    }, 1800);
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
          target_role: modalData?.target_role || careerTrack || 'Backend Developer',
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
Student Email: ${studentEmail || 'student@skillsetu.com'}
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

  return (
    <View style={styles.outerWrapper}>
      <AmbientBackground />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            colors={[CLAY_COLORS.primary]}
          />
        }
      >
        {/* 1. HERO SECTION */}
        <View dataSet={{ stagger: '1' }} className="clay-stagger-1">
          <RoundsHero careerTrack={careerTrack} kpi={kpi} />
        </View>

        {/* 2. 6 METRIC SUMMARY CARDS ROW */}
        <View dataSet={{ stagger: '2' }} className="clay-stagger-2">
          <RoundsMetricGrid kpi={kpi} trajectory={trajectory} />
        </View>

        {/* 3. MOCK INTERVIEW & PRACTICE CARD */}
        <View dataSet={{ stagger: '3' }} className="clay-stagger-3">
          <MockInterviewCard
            careerTrack={careerTrack}
            applications={applications}
            interviewHistory={interviewHistory}
            onStartPractice={handleStartAIPracticeSession}
            practicingAppId={practicingAppId}
          />
        </View>

        {/* 4. INTERNSHIP ASSESSMENT ROUNDS SECTION */}
        <View dataSet={{ stagger: '4' }} className="clay-stagger-4">
          <AssessmentRoundsSection
            applications={applications}
            isLoading={isLoading}
            practicingAppId={practicingAppId}
            launchingAppId={launchingAppId}
            onStartPractice={handleStartAIPracticeSession}
            onStartOfficial={handleStartOfficialAssessment}
            onOpenDetails={handleOpenDetailsModal}
          />
        </View>

        {/* 5. SCHEDULE & TIMELINE SECTION */}
        <View dataSet={{ stagger: '5' }} className="clay-stagger-5">
          <ScheduleTimelineSection
            scheduleEntries={scheduleEntries}
            filteredScheduleEntries={filteredScheduleEntries}
            timelineViewMode={timelineViewMode}
            setTimelineViewMode={setTimelineViewMode}
            selectedTimelineFilter={selectedTimelineFilter}
            setSelectedTimelineFilter={setSelectedTimelineFilter}
            timelineCounts={timelineCounts}
            onOpenDetails={handleOpenDetailsModal}
            applications={applications}
          />
        </View>

        {/* 6. VERIFIED SKILL MATRIX & QUESTIONS FROM VERIFIED PROJECTS */}
        <View dataSet={{ stagger: '6' }} className="clay-stagger-6">
          <SkillMatrixAndProjectQuestions
            skillMatrix={skillMatrix}
            projectQuestions={projectQuestions}
            onPracticeQuestion={handleStartPracticeModal}
            onOpenInterviewPracticeModal={() => setIsAIInterviewPracticeOpen(true)}
          />
        </View>

        {/* 7. CURATED TECHNICAL & HR QUESTION BANK */}
        <View dataSet={{ stagger: '7' }} className="clay-stagger-7">
          <QuestionBankSection
            questionCategories={questionCategories}
            questionBankFilter={questionBankFilter}
            setQuestionBankFilter={setQuestionBankFilter}
            filteredQuestionBank={filteredQuestionBank}
            rawQuestionBank={rawQuestionBank}
            expandedQuestion={expandedQuestion}
            setExpandedQuestion={setExpandedQuestion}
            allQuestionsExpanded={allQuestionsExpanded}
            onToggleExpandAll={handleToggleExpandAllQuestions}
            onPracticeQuestion={handleStartPracticeModal}
          />
        </View>

        {/* 8. PAST INTERVIEW HISTORY & TRAJECTORY ANALYTICS */}
        <View dataSet={{ stagger: '8' }} className="clay-stagger-8">
          <HistoryAndAnalyticsSection
            interviewHistory={interviewHistory}
            trajectory={trajectory}
            skillMatrix={skillMatrix}
            onDownloadDossier={handleDownloadDossier}
          />
        </View>

        {/* 9. FOOTER */}
        <RoundsFooter onAskAiMentor={() => handleStartPracticeModal('General System Architecture & Behavioral Interview Preparation')} />
      </ScrollView>

      {/* 9. MODALS */}
      <RoundsModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        modalData={modalData}
        practiceAnswer={practiceAnswer}
        setPracticeAnswer={setPracticeAnswer}
        isRecording={isRecording}
        onSimulateAudioRecord={handleSimulateAudioRecord}
        onEvaluateAI={handleEvaluateAI}
        aiFeedback={aiFeedback}
        isEvaluatingAI={isEvaluatingAI}
        evaluationError={evaluationError}
        practicingAppId={practicingAppId}
        onStartPracticeSession={handleStartAIPracticeSession}
      />

      {/* 10. ROLE-SPECIFIC 100+ QUESTION AI INTERVIEW PRACTICE SANDBOX MODAL */}
      <AIInterviewPracticeModal
        visible={isAIInterviewPracticeOpen}
        onClose={() => setIsAIInterviewPracticeOpen(false)}
        studentEmail={studentEmail}
        initialRole={careerTrack}
        availableRoles={availableRoles}
        onPracticeSingleQuestion={(questionText) => {
          handleStartPracticeModal(questionText);
        }}
        onStartFullMock={(role) => {
          handleStartAIPracticeSession({ targetRound: 'technical' });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: CLAY_COLORS.canvas,
    position: 'relative',
  },
  container: {
    flex: 1,
    zIndex: 1,
  },
  contentContainer: {
    padding: 20,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    gap: 20,
    paddingBottom: 40,
  },
});
