import React, { useState, useEffect, useMemo } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import {
  fetchCareerIntelligence,
  enrollInCourse,
  updateCourseProgress,
  refreshLearningPath,
  submitAssignment,
  fetchAssessmentDetail,
  submitAssessment,
  startProjectTrack,
  submitProjectTrack,
  fetchAvailableProjectRepos,
} from '../services/careerIntelligenceService';
import { verifyCourseCertificate } from '../services/internshipService';
import { extractQuestionOptions } from '../Skill/components/AssessmentSheet';
import {
  Button,
  Card,
  ChipGroup,
  EmptyState,
  EventCard,
  FeatureCard,
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
  SegmentedTabs,
  Sheet,
  Skeleton,
  Stack,
  StatTrio,
  Timeline,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';

// Safe string extractors
const getCareerName = (c) => {
  if (!c) return '';
  if (typeof c === 'string') return c;
  return c.career_name || c.name || c.title || '';
};

const getCareerId = (c, fallback = '') => {
  if (!c) return fallback;
  if (typeof c === 'string') return c;
  return c.career_id || c.id || c.career_name || c.name || fallback;
};

const getSkillName = (s) => {
  if (!s) return 'Technical Skill';
  if (typeof s === 'string') return s;
  return s.skill_name || s.name || s.title || 'Technical Skill';
};

export default function Learning({ profileData, user, setProfileData, navigationParams, onNavigate }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const studentEmail = user?.email || profileData?.personalInfo?.email || '';


  // Career Intelligence State
  const [careerIntel, setCareerIntel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [pathActionMessage, setPathActionMessage] = useState('');
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);

  // Target Career selection
  const [activeCareerName, setActiveCareerName] = useState('');

  // Sub-Navigation Active Tab
  const [activeSubTab, setActiveSubTab] = useState('Overview');

  // Filters & Search
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  // 1. Course Progress Modal
  const [selectedItemForProgress, setSelectedItemForProgress] = useState(null);
  const [newProgressPercent, setNewProgressPercent] = useState(0);

  // 2. Assignment Sandbox Modal
  const [selectedAssignmentForSandbox, setSelectedAssignmentForSandbox] = useState(null);
  const [sandboxCode, setSandboxCode] = useState('');
  const [isSubmittingSandbox, setIsSubmittingSandbox] = useState(false);
  const [sandboxTestResults, setSandboxTestResults] = useState(null);

  // 3. View All Assignments Modal
  const [isAllAssignmentsModalOpen, setIsAllAssignmentsModalOpen] = useState(false);
  const [assignmentsFilterDifficulty, setAssignmentsFilterDifficulty] = useState('All');

  // 4. Assessment Runner Modal
  const [activeAssessmentRunner, setActiveAssessmentRunner] = useState(null);
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userSelectedAnswers, setUserSelectedAnswers] = useState({});
  const [assessmentTimerSeconds, setAssessmentTimerSeconds] = useState(45 * 60);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [assessmentEvaluationResult, setAssessmentEvaluationResult] = useState(null);

  // 5. Browse All Assessments Modal
  const [isAllAssessmentsModalOpen, setIsAllAssessmentsModalOpen] = useState(false);
  const [assessmentsFilterTab, setAssessmentsFilterTab] = useState('All');

  // 6. Project Specification & Tracker Modal
  const [selectedProjectForSpecs, setSelectedProjectForSpecs] = useState(null);
  const [availableRepos, setAvailableRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [connectedGitHubAccount, setConnectedGitHubAccount] = useState(null);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [projectActionSuccessMsg, setProjectActionSuccessMsg] = useState('');

  // Initial Data Load & Dynamic Career Swapping
  const loadData = async (targetCareer = null) => {
    setIsLoading(true);
    setLoadError('');
    setPathActionMessage('');
    const careerToFetch = targetCareer || activeCareerName;
    if (targetCareer) {
      setActiveCareerName(targetCareer);
    }
    try {
      const data = await fetchCareerIntelligence(studentEmail, careerToFetch);
      if (data) {
        setCareerIntel(data);
        if (data?.active_career) {
          const extractedName = getCareerName(data.active_career);
          if (extractedName) {
            setActiveCareerName(extractedName);
          }
        }
      } else {
        setLoadError('Unable to load career intelligence from server.');
      }
    } catch (err) {
      console.error('Failed to load Career Intelligence in Learning Hub:', err);
      setLoadError(err.message || 'Error communicating with learning engine.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentEmail]);

  useEffect(() => {
    if (navigationParams?.targetSkillId || navigationParams?.targetSkillName) {
      const query = navigationParams.targetSkillName || '';
      setSearchQuery(query);
    }
  }, [navigationParams]);

  // Timer for active assessment runner
  useEffect(() => {
    let timerInterval = null;
    if (activeAssessmentRunner && !assessmentEvaluationResult) {
      timerInterval = setInterval(() => {
        setAssessmentTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [activeAssessmentRunner, assessmentEvaluationResult]);

  // -------------------------------------------------------------
  // HANDLERS: Course Enrollment & Progress
  // -------------------------------------------------------------
  const handleEnrollCourse = async (courseId, courseItem) => {
    if (!courseId) {
      if (courseItem?.canonical_url) {
        handleOpenUrl(courseItem.canonical_url);
      }
      return;
    }
    setEnrollingCourseId(courseId);
    setPathActionMessage(`Enrolling in "${courseItem?.title || 'course'}"...`);
    try {
      const res = await enrollInCourse(courseId, studentEmail);
      if (res && res.status === 'success') {
        setPathActionMessage(`Successfully enrolled in "${courseItem?.title || 'course'}".`);
        await loadData(activeCareerName);
      } else {
        setPathActionMessage(res?.message || 'Enrolled in course track.');
        await loadData(activeCareerName);
      }
      setTimeout(() => setPathActionMessage(''), 4000);
    } catch (err) {
      console.error('Course enrollment error:', err);
      setPathActionMessage('Failed to enroll in course.');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleSaveProgress = async () => {
    if (!selectedItemForProgress) return;
    setIsUpdatingItem(true);
    try {
      const pathId = careerIntel?.learning_path?.id || 1;
      const itemId = selectedItemForProgress.learning_path_item_id || selectedItemForProgress.id || 1;
      await updateCourseProgress(pathId, itemId, newProgressPercent, studentEmail);
      setSelectedItemForProgress(null);
      setPathActionMessage('Course progress updated & skill evidence recalculated.');
      await loadData(activeCareerName);
      setTimeout(() => setPathActionMessage(''), 4000);
    } catch (err) {
      console.error('Error updating progress:', err);
      Alert.alert('Error', 'Failed to update course progress.');
    } finally {
      setIsUpdatingItem(false);
    }
  };

  const handleRefreshPath = async () => {
    setIsUpdatingItem(true);
    setPathActionMessage('Refreshing pathway recommendations against latest skill gaps...');
    try {
      const pathId = careerIntel?.learning_path?.id || 1;
      await refreshLearningPath(pathId, studentEmail);
      await loadData(activeCareerName);
      setPathActionMessage('Pathway successfully refreshed with latest skill benchmarks.');
      setTimeout(() => setPathActionMessage(''), 4000);
    } catch (err) {
      console.error('Error refreshing path:', err);
      setPathActionMessage('Failed to refresh pathway.');
    } finally {
      setIsUpdatingItem(false);
    }
  };

  const handleOpenUrl = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error('Failed to open URL:', err));
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Practical Workflows / Assignments
  // -------------------------------------------------------------
  const handleOpenAssignmentSandbox = (assign) => {
    setSelectedAssignmentForSandbox(assign);
    setSandboxCode(assign.starter_code || '');
    setSandboxTestResults(null);
  };

  const handleSubmitAssignmentSandbox = async () => {
    if (!selectedAssignmentForSandbox) return;
    setIsSubmittingSandbox(true);
    setSandboxTestResults(null);
    try {
      const res = await submitAssignment(selectedAssignmentForSandbox.id, studentEmail, sandboxCode);
      if (res && res.status === 'success') {
        setSandboxTestResults({
          score: res.score ?? null,
          xp_earned: res.xp_earned ?? null,
          is_passed: res.is_passed ?? res.passed ?? true,
          test_results: res.test_results || [],
          message: res.message || '',
        });
        setPathActionMessage(`${res.xp_earned ? `+${res.xp_earned} XP · ` : ''}Submitted: ${selectedAssignmentForSandbox.title}`);
        await loadData(activeCareerName);
        setTimeout(() => setPathActionMessage(''), 5000);
      } else {
        Alert.alert('Submission Error', res?.message || 'Could not evaluate assignment.');
      }
    } catch (err) {
      console.error('Error submitting assignment sandbox:', err);
      Alert.alert('Error', 'Failed to submit assignment.');
    } finally {
      setIsSubmittingSandbox(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Certified Benchmarks / Assessments
  // -------------------------------------------------------------
  const handleStartAssessment = async (testItem) => {
    if (testItem.is_locked) {
      setIsAllAssessmentsModalOpen(true);
      return;
    }
    const assessId = testItem.id || 1;
    setIsLoading(true);
    try {
      const detail = await fetchAssessmentDetail(assessId);
      if (!detail || !detail.questions || detail.questions.length < 15 || detail.questions.length > 25) {
        Alert.alert(
          'Assessment Notice',
          detail?.detail || `This assessment is temporarily unavailable because it contains ${detail?.questions?.length || 0} questions. SkillSetu requires strictly between 15 and 25 questions.`
        );
        setIsLoading(false);
        return;
      }

      const questionsList = detail.questions;

      setActiveAssessmentRunner({
        ...testItem,
        id: assessId,
        title: detail?.title || testItem.title,
        skill_name: detail?.skill_name || testItem.skill_name,
        pass_score: detail?.pass_score || 70,
        question_count: detail?.questionCount || detail?.question_count || questionsList.length,
        questionCount: detail?.questionCount || detail?.question_count || questionsList.length,
        duration_minutes: detail?.durationMinutes || detail?.duration_minutes || testItem.duration_minutes || 45,
      });
      setAssessmentQuestions(questionsList);
      setCurrentQuestionIndex(0);
      setUserSelectedAnswers({});
      setAssessmentTimerSeconds((detail?.durationMinutes || detail?.duration_minutes || testItem.duration_minutes || 45) * 60);
      setAssessmentEvaluationResult(null);
    } catch (err) {
      console.error('Failed to start assessment:', err);
      Alert.alert('Error', err?.message || 'Failed to load assessment questions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnswerOption = (questionId, optionKey) => {
    setUserSelectedAnswers((prev) => ({
      ...prev,
      [String(questionId)]: optionKey,
    }));
  };

  const handleSubmitAssessmentRunner = async () => {
    if (!activeAssessmentRunner) return;
    setIsSubmittingAssessment(true);
    try {
      const res = await submitAssessment(activeAssessmentRunner.id, studentEmail, userSelectedAnswers);
      if (res && res.status === 'success') {
        setAssessmentEvaluationResult({
          score: res.score ?? null,
          correct_answers: res.correct_answers ?? null,
          total_questions: res.total_questions || assessmentQuestions.length,
          assessment_status: res.assessment_status || 'VERIFIED',
          skill_name: res.skill_name || activeAssessmentRunner.skill_name,
          test_title: res.test_title || activeAssessmentRunner.title,
        });
        setPathActionMessage(`Diagnostic Completed! Score: ${res.score}%. Benchmark and credentials updated.`);
        await loadData(activeCareerName);
        setTimeout(() => setPathActionMessage(''), 5000);
      } else {
        Alert.alert('Evaluation Notice', res?.message || 'Could not evaluate assessment submission.');
      }
    } catch (err) {
      console.error('Error submitting assessment runner:', err);
      Alert.alert('Error', 'Failed to submit assessment answers.');
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const handleStartSkillAssessment = (skillItem) => {
    const skName = (skillItem?.skill_name || skillItem?.name || '').toLowerCase().trim();
    const matchedTest = diagnosticTests.find((t) => {
      const tSkill = (t.skill_name || t.skill || t.title || '').toLowerCase().trim();
      return tSkill.includes(skName) || skName.includes(tSkill);
    });
    if (matchedTest) {
      handleStartAssessment(matchedTest);
    } else if (diagnosticTests.length > 0) {
      handleStartAssessment(diagnosticTests[0]);
    } else {
      setIsAllAssessmentsModalOpen(true);
    }
  };

  const handleUploadCertificateForCourse = async (courseItem, skillItem) => {
    if (!courseItem?.id && !courseItem?.course_id) return;
    const cId = courseItem.id || courseItem.course_id;
    setIsLoading(true);
    try {
      const res = await verifyCourseCertificate(cId, studentEmail, {
        filename: `${(courseItem.title || 'course').replace(/\s+/g, '_')}_certificate.pdf`,
        issuer: courseItem.provider_name || 'Accredited Provider',
      });
      if (res && (res.status === 'success' || res.data)) {
        setPathActionMessage(`Certificate Verified for "${courseItem.title}". Evidence recorded!`);
        await loadData(activeCareerName);
        setTimeout(() => setPathActionMessage(''), 5000);
      } else {
        Alert.alert('Verification Notice', res?.message || 'Certificate uploaded for review.');
      }
    } catch (err) {
      console.error('Error verifying certificate:', err);
      Alert.alert('Error', 'Failed to upload certificate.');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: Real World Simulations / Capstone Projects
  // -------------------------------------------------------------
  const handleOpenProjectSpecs = async (project) => {
    setSelectedProjectForSpecs(project);
    setSelectedRepo(null);
    setIsLoadingRepos(true);
    setProjectActionSuccessMsg('');
    try {
      const pId = project.id || 'proj_enterprise';
      const res = await fetchAvailableProjectRepos(pId, studentEmail);
      if (res && res.repositories) {
        setAvailableRepos(res.repositories);
        setConnectedGitHubAccount(res.connected_account || null);
        const nonSubmitted = res.repositories.filter((r) => !r.already_submitted);
        if (nonSubmitted.length > 0) {
          setSelectedRepo(nonSubmitted[0]);
        } else if (res.repositories.length > 0) {
          setSelectedRepo(res.repositories[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching available project repos:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleStartProjectTrackCta = async (project) => {
    const pId = project.id || `proj_${activeCareerName.toLowerCase().replace(/\s+/g, '_')}`;
    setPathActionMessage(`Starting Capstone Project Track: "${project.title}"...`);
    try {
      const res = await startProjectTrack(pId, studentEmail);
      if (res && res.status === 'success') {
        setProjectActionSuccessMsg('Project track initiated! Review milestones and select your connected GitHub repository below.');
        await loadData(activeCareerName);
      }
      await handleOpenProjectSpecs(project);
      setTimeout(() => setPathActionMessage(''), 4000);
    } catch (err) {
      console.error('Error starting project track:', err);
      await handleOpenProjectSpecs(project);
    }
  };

  const handleSubmitProjectRepo = async () => {
    if (!selectedProjectForSpecs) return;
    if (!selectedRepo) {
      Alert.alert('Repository Required', 'Please select a repository from your connected GitHub account to submit.');
      return;
    }
    setIsSubmittingProject(true);
    try {
      const pId = selectedProjectForSpecs.id || 'proj_enterprise';
      const res = await submitProjectTrack(pId, studentEmail, selectedRepo);
      if (res && res.status === 'success') {
        const verifiedList = res.skills_verified ? res.skills_verified.join(', ') : 'All project skills';
        setProjectActionSuccessMsg(`+200 XP Proof Awarded! Verified deliverables for "${selectedProjectForSpecs.title}". Skills verified: ${verifiedList}.`);
        setPathActionMessage(`+200 XP Earned! Capstone project successfully verified.`);
        await loadData(activeCareerName);
        setTimeout(() => {
          setSelectedProjectForSpecs(null);
          setSelectedRepo(null);
          setProjectActionSuccessMsg('');
        }, 3500);
      } else {
        Alert.alert('Submission Notice', res?.detail || res?.message || 'Project submitted.');
      }
    } catch (err) {
      console.error('Error submitting project:', err);
      Alert.alert('Error', 'Failed to submit project repository.');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  // -------------------------------------------------------------
  // DERIVED DYNAMIC VALUES
  // -------------------------------------------------------------
  const readinessData = careerIntel?.career_readiness;
  const readinessScore = readinessData?.score != null ? readinessData.score / 100 : null;
  const readinessPct = readinessScore != null ? Math.round(readinessScore * 100) : null;
  const skills = careerIntel?.all_required_skills || careerIntel?.skills || [];
  const targetCareers = careerIntel?.target_careers || [];
  const learningPath = careerIntel?.learning_path;
  const rawItems = learningPath?.items || [];
  const stepProgression = careerIntel?.step_progression;
  const learningProgress = careerIntel?.learning_progress;

  const displayCareerName = activeCareerName || getCareerName(careerIntel?.active_career) || '';

  // Deduplicated Courses
  const coursesList = useMemo(() => {
    const map = new Map();
    rawItems.forEach((item) => {
      const sName = getSkillName(item.skill_name);
      if (!map.has(item.course_id)) {
        map.set(item.course_id, {
          ...item,
          learning_path_item_id: item.id || item.learning_path_item_id,
          title: item.course?.title || item.title || 'Technical Course',
          provider: item.course?.provider?.slug || item.course?.provider || item.provider || 'youtube',
          provider_name: item.course?.provider?.name || item.course?.provider_name || item.provider_name || 'YouTube',
          canonical_url: item.course?.url || item.canonical_url,
          estimated_hours: item.course?.duration ? `${item.course.duration} hrs` : (item.stage === 'Foundation' ? '8 hrs' : '14 hrs'),
          covered_skills: [sName],
          covered_skill_ids: [item.skill_id],
        });
      } else {
        const existing = map.get(item.course_id);
        if (!existing.covered_skills.includes(sName)) {
          existing.covered_skills.push(sName);
          existing.covered_skill_ids.push(item.skill_id);
        }
      }
    });
    return Array.from(map.values());
  }, [rawItems]);

  const filteredCourses = useMemo(() => {
    return coursesList.filter((c) => {
      const matchProvider =
        selectedProviderFilter === 'All' ||
        (c.provider && c.provider.toLowerCase() === selectedProviderFilter.toLowerCase()) ||
        (c.provider_name && c.provider_name.toLowerCase() === selectedProviderFilter.toLowerCase());
      const matchStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'in_progress' && (c.status === 'in_progress' || (c.progress_percent > 0 && c.progress_percent < 100))) ||
        (selectedStatusFilter === 'completed' && (c.status === 'completed' || c.progress_percent === 100)) ||
        (selectedStatusFilter === 'saved' && (c.status === 'not_started' || !c.progress_percent));
      const matchQuery =
        !searchQuery.trim() ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.covered_skills?.some((s) => s?.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchProvider && matchStatus && matchQuery;
    });
  }, [coursesList, selectedProviderFilter, selectedStatusFilter, searchQuery]);

  const verifiedSkills = useMemo(() => {
    return skills.filter((s) => (s.current_score || 0) >= (s.target_score || 80) || s.canonical_status === 'verified' || s.status === 'Verified' || s.status === 'VERIFIED');
  }, [skills]);

  const gapSkills = useMemo(() => {
    return skills.filter((s) => (s.current_score || 0) < (s.target_score || 80) && s.canonical_status !== 'verified' && s.status !== 'Verified' && s.status !== 'VERIFIED');
  }, [skills]);

  const inProgressCourses = useMemo(() => {
    return coursesList.filter((c) => (c.progress_percent > 0 && c.progress_percent < 100) || c.status === 'in_progress');
  }, [coursesList]);

  const completedCourses = useMemo(() => {
    return coursesList.filter((c) => c.progress_percent === 100 || c.status === 'completed');
  }, [coursesList]);

  // Featured Course for Continue Learning Hero Card
  const activeFeaturedCourse = useMemo(() => {
    if (inProgressCourses.length > 0) return inProgressCourses[0];
    if (coursesList.length > 0) return coursesList[0];
    return null;
  }, [inProgressCourses, coursesList]);

  // Dynamic Roadmap Milestones from Backend
  const milestoneSteps = useMemo(() => {
    return careerIntel?.roadmap_milestones || [];
  }, [careerIntel]);

  // Dynamic Curated Next Steps from Backend
  const curatedNextSteps = useMemo(() => {
    return careerIntel?.curated_next_steps || [];
  }, [careerIntel]);

  // Dynamic Practical Skill Assignments
  const practicalAssignments = useMemo(() => {
    return careerIntel?.skill_assignments || [];
  }, [careerIntel]);

  // Dynamic Diagnostic Tests
  const diagnosticTests = useMemo(() => {
    return careerIntel?.mock_tests || [];
  }, [careerIntel]);

  // Dynamic Capstone Projects
  const capstoneProjects = useMemo(() => {
    return careerIntel?.capstone_projects || [];
  }, [careerIntel]);

  // Dynamic Validated Credentials
  const validatedCredentials = useMemo(() => {
    return careerIntel?.validated_credentials || [];
  }, [careerIntel]);

  // Filtered Assignments for All Assignments Modal
  const modalFilteredAssignments = useMemo(() => {
    return practicalAssignments.filter((a) => {
      const matchDiff =
        assignmentsFilterDifficulty === 'All' ||
        a.difficulty?.toLowerCase() === assignmentsFilterDifficulty.toLowerCase();
      const matchQuery =
        !searchQuery.trim() ||
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.skill_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDiff && matchQuery;
    });
  }, [practicalAssignments, assignmentsFilterDifficulty, searchQuery]);

  // Filtered Assessments for All Assessments Modal
  const modalFilteredAssessments = useMemo(() => {
    return diagnosticTests.filter((t) => {
      if (assessmentsFilterTab === 'Available') return !t.is_locked && !t.is_completed;
      if (assessmentsFilterTab === 'Completed') return t.is_completed;
      if (assessmentsFilterTab === 'Locked') return t.is_locked;
      return true;
    });
  }, [diagnosticTests, assessmentsFilterTab]);

  const openProgress = (c) => {
    setSelectedItemForProgress(c);
    setNewProgressPercent(Math.round(c.progress_percent || 0));
  };
  const switchCareer = (careerName) => {
    if (careerName !== activeCareerName) {
      setActiveCareerName(careerName);
      setCareerIntel(null);
      loadData(careerName);
    }
  };
  const courseState = (c) => {
    const pct = Math.round(c.progress_percent || 0);
    if (pct >= 100 || c.status === 'completed') return { label: 'Completed 👏', tone: 'success', badge: 'Check' };
    if (pct > 0 || c.status === 'in_progress') return { label: `In progress · ${pct}%`, tone: 'info', badge: 'Play' };
    return { label: 'Upcoming', tone: 'neutral', icon: 'Clock', badge: 'Lock' };
  };

  if (isLoading && !careerIntel) {
    return (
      <Page>
        <Skeleton height={40} width="40%" />
        <Row gap={space.md}>
          <Skeleton height={104} style={{ flex: 1 }} radius={radii.lg} />
          <Skeleton height={104} style={{ flex: 1 }} radius={radii.lg} />
          <Skeleton height={104} style={{ flex: 1 }} radius={radii.lg} />
        </Row>
        <Skeleton height={200} radius={radii.xl} />
        <Skeleton height={200} radius={radii.xl} />
      </Page>
    );
  }

  if (loadError && !careerIntel) {
    return (
      <Page>
        <Card>
          <EmptyState icon="CircleAlert" tone="danger" title="Couldn't load your learning plan" message={loadError} action={<Button label="Retry" icon="RefreshCw" onPress={() => loadData(activeCareerName)} />} />
        </Card>
      </Page>
    );
  }

  const upcoming = coursesList.length - completedCourses.length;
  const tabs = [
    { id: 'Overview', label: 'Plan', icon: 'Route' },
    { id: 'Assignments', label: 'Practice', icon: 'Code', badge: practicalAssignments.length },
    { id: 'MockTests', label: 'Tests', icon: 'Target', badge: diagnosticTests.length },
    { id: 'Projects', label: 'Projects', icon: 'Rocket', badge: capstoneProjects.length },
    { id: 'Credentials', label: 'Credentials', icon: 'Award', badge: validatedCredentials.length },
  ];

  // ---- Events panel ------------------------------------------------------
  const nextTests = diagnosticTests.filter((t) => !t.is_completed && !t.is_locked).slice(0, 2);
  const openAssignments = practicalAssignments.slice(0, 2);
  const openProjects = capstoneProjects.filter((p) => p.status !== 'completed').slice(0, 2);
  const eventsPanel = (
    <>
      <SectionTitle title="My Events" emoji="🧐" />
      {nextTests.map((t) => (
        <EventCard
          key={`t-${t.id}`}
          tone="info"
          icon="Target"
          type="Assessment"
          date={t.duration || `${t.duration_minutes || 45} min`}
          body={`${t.title}${t.meta ? ` — ${t.meta}` : ''}`}
          footer={
            <Pressable onPress={() => handleStartAssessment(t)} style={[styles.footerBtn, webOnly({ cursor: 'pointer' })]}>
              <Icon name="Play" size={14} color={colors.ink} />
              <Txt variant="small" weight={600} tone="ink">{t.action || 'Begin test'}</Txt>
            </Pressable>
          }
        />
      ))}
      {openAssignments.map((a) => (
        <EventCard key={`a-${a.id}`} tone="accent" icon="AudioLines" type="Practice" date={a.difficulty} body={a.title} onPress={() => handleOpenAssignmentSandbox(a)} />
      ))}
      {openProjects.map((p) => (
        <EventCard key={`p-${p.id}`} tone="warning" icon="Pin" type="Project" date={p.xp ? `+${p.xp} XP` : ''} body={p.title} onPress={() => (p.status === 'not_started' ? handleStartProjectTrackCta(p) : handleOpenProjectSpecs(p))} />
      ))}
      {!nextTests.length && !openAssignments.length && !openProjects.length ? (
        <View style={styles.emptyEvents}>
          <EmptyState icon="Calendar" title="All caught up" message="New tests, practice and projects appear here as your plan grows." />
        </View>
      ) : null}
    </>
  );

  // ---- Plan tab ----------------------------------------------------------
  const roadmapCourses = filteredCourses.filter((c) => !activeFeaturedCourse || c.course_id !== activeFeaturedCourse.course_id || searchQuery.trim());
  const timelineItems = [];
  if (activeFeaturedCourse && !searchQuery.trim()) {
    const pct = Math.round(activeFeaturedCourse.progress_percent || 0);
    timelineItems.push({
      key: 'featured',
      done: pct >= 100,
      content: (
        <FeatureCard tilt={isDesktop} onPress={() => openProgress(activeFeaturedCourse)}>
          <Row align="flex-start" gap={space.md}>
            <Stack gap={6} style={{ flex: 1 }}>
              <Txt variant="h2" tone="ink" numberOfLines={2}>{activeFeaturedCourse.title}</Txt>
              <Txt variant="small" color={colors.lilacInk} numberOfLines={2}>
                {activeFeaturedCourse.reason || `Closes your ${activeFeaturedCourse.covered_skills?.join(', ')} gap`}
              </Txt>
            </Stack>
            <Pressable onPress={() => handleOpenUrl(activeFeaturedCourse.canonical_url)} style={[styles.playDisc, webOnly({ cursor: 'pointer' })]} accessibilityLabel="Open course">
              <Icon name="Play" size={26} color={colors.ink} />
            </Pressable>
          </Row>
          <Row justify="space-between" style={{ marginTop: space.lg }} wrap gap={8}>
            <View style={styles.watchChip}>
              <Icon name="Clock" size={15} color={colors.ink} />
              <Txt variant="small" weight={600} tone="ink">{pct > 0 ? `Progress ${pct}%` : 'Not started'} · {activeFeaturedCourse.provider_name}</Txt>
            </View>
            <Row gap={4}>
              {(activeFeaturedCourse.covered_skills || []).slice(0, 3).map((s) => (
                <Pill key={s} label={s} size="sm" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }} />
              ))}
            </Row>
          </Row>
        </FeatureCard>
      ),
    });
  }
  roadmapCourses.forEach((c) => {
    const st = courseState(c);
    const enrolled = c.is_enrolled !== false && (c.status !== 'not_started' || c.progress_percent > 0 || c.learning_path_item_id);
    timelineItems.push({
      key: `c-${c.course_id}`,
      done: st.tone === 'success',
      content: (
        <Card badge={{ icon: st.badge, tone: st.tone === 'neutral' ? 'neutral' : st.tone }}>
          <Stack gap={6}>
            <Txt variant="h2" tone="ink" numberOfLines={2}>{c.title}</Txt>
            <Txt variant="body" tone="muted" numberOfLines={2}>{c.reason || c.course?.description || `${c.stage || 'Course'} · ${c.provider_name}`}</Txt>
          </Stack>
          <Row justify="space-between" style={{ marginTop: space.lg }}>
            <Pill label={st.label} tone={st.tone} icon={st.icon} />
            <Row gap={8}>
              <IconButton icon="Ellipsis" onPress={() => handleOpenUrl(c.canonical_url)} accessibilityLabel="Open course" />
              {enrolled ? (
                <IconButton icon="Check" variant="dark" onPress={() => openProgress(c)} accessibilityLabel="Update progress" />
              ) : (
                <Button label="Enroll" size="sm" onPress={() => handleEnrollCourse(c.course_id, c)} loading={enrollingCourseId === c.course_id} />
              )}
            </Row>
          </Row>
        </Card>
      ),
    });
  });

  const planTab = (
    <View style={[styles.grid, isDesktop ? styles.gridRow : null]}>
      <View style={isDesktop ? { flex: 1.1, minWidth: 0 } : null}>
        {timelineItems.length ? (
          <Timeline items={timelineItems} gap={space.lg} />
        ) : (
          <Card>
            <EmptyState
              icon="BookOpen"
              title={searchQuery.trim() ? 'No courses match your search' : 'No courses in your plan yet'}
              message={searchQuery.trim() ? 'Try a different skill or course name.' : 'Refresh your path to generate courses from your current skill gaps.'}
              action={<Button label="Refresh path" icon="RefreshCw" onPress={handleRefreshPath} loading={isUpdatingItem} />}
            />
          </Card>
        )}
      </View>
      <View style={isDesktop ? { flex: 1, minWidth: 0, gap: space.md } : { gap: space.md }}>
        <StatTrio
          items={[
            { value: coursesList.length, label: 'Total', tone: 'info' },
            { value: completedCourses.length, label: 'Completed', tone: 'success' },
            { value: upcoming, label: 'Upcoming', dashed: true },
          ]}
        />
        <Card>
          <Row justify="space-between" align="flex-start">
            <Stack gap={4} style={{ flex: 1 }}>
              <Txt variant="overline" tone="subtle">Readiness</Txt>
              <Txt variant="h3" tone="ink">{displayCareerName}</Txt>
              <Txt variant="small" tone="muted">{verifiedSkills.length} of {skills.length} skills verified · {learningProgress?.xp_earned ?? 0} XP</Txt>
            </Stack>
            <Ring value={readinessPct ?? 0} size={72} stroke={8} tone="success">
              <Txt variant="title" tone="ink">{readinessPct != null ? `${readinessPct}%` : '—'}</Txt>
            </Ring>
          </Row>
          <Row gap={8} style={{ marginTop: space.md }}>
            <Button label="Refresh path" icon="RefreshCw" size="sm" variant="secondary" onPress={handleRefreshPath} loading={isUpdatingItem} />
            <Button label="Skill gaps" icon="Zap" size="sm" variant="secondary" onPress={() => onNavigate && onNavigate('Skills')} />
          </Row>
        </Card>
        {milestoneSteps.map((m) => (
          <Card key={m.id || m.title} padding={space.lg} tone={m.status === 'completed' ? 'success' : undefined}>
            <Row justify="space-between">
              <Txt variant="title" tone="ink">{m.title}</Txt>
              <Pill label={m.status === 'completed' ? 'Completed' : m.status === 'in_progress' ? 'In progress' : 'Upcoming'} tone={m.status === 'completed' ? 'success' : m.status === 'in_progress' ? 'info' : 'neutral'} size="sm" />
            </Row>
            {m.description ? <Txt variant="small" tone="muted" style={{ marginTop: 4 }}>{m.description}</Txt> : null}
            <ProgressBar value={m.progress || 0} tone="success" style={{ marginTop: 10 }} track={m.status === 'completed' ? 'rgba(255,255,255,0.6)' : undefined} />
            {(m.skills || []).length ? (
              <Row wrap gap={6} style={{ marginTop: 10 }}>
                {m.skills.map((s) => (
                  <Pressable key={s.skill_id || s.skill_name} onPress={() => handleStartSkillAssessment(s)} style={webOnly({ cursor: 'pointer' })}>
                    <Pill label={`${s.skill_name} · ${Math.round(s.current_score || 0)}%`} tone={s.is_verified ? 'success' : 'warning'} icon={s.is_verified ? 'Check' : 'Target'} size="sm" />
                  </Pressable>
                ))}
              </Row>
            ) : null}
          </Card>
        ))}
        {curatedNextSteps.length ? (
          <Card>
            <Txt variant="h3" tone="ink">Recommended next</Txt>
            <Stack gap={8} style={{ marginTop: space.sm }}>
              {curatedNextSteps.map((s) => (
                <Inset key={s.step_number} tone="neutral" padding={space.sm}>
                  <Row justify="space-between" gap={8}>
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Txt variant="caption" tone="subtle">{s.step_badge}</Txt>
                      <Txt variant="small" weight={700} tone="ink" numberOfLines={2}>{s.title}</Txt>
                      <Txt variant="caption" tone="muted">{s.meta}</Txt>
                    </Stack>
                    {s.is_enrolled ? (
                      <Button label="Progress" size="sm" variant="secondary" onPress={() => openProgress(s)} />
                    ) : (
                      <Button label={s.action || 'Enroll'} size="sm" onPress={() => handleEnrollCourse(s.course_id, s)} loading={enrollingCourseId === s.course_id} />
                    )}
                  </Row>
                </Inset>
              ))}
            </Stack>
          </Card>
        ) : null}
      </View>
    </View>
  );

  // ---- Other tabs --------------------------------------------------------
  const practiceTab = (
    <Stack gap={space.md}>
      <ChipGroup options={['All', 'Beginner', 'Intermediate', 'Advanced']} value={assignmentsFilterDifficulty} multiple={false} onChange={setAssignmentsFilterDifficulty} tone="accent" />
      {modalFilteredAssignments.length ? (
        <View style={styles.cardGrid}>
          {modalFilteredAssignments.map((a) => (
            <Card key={a.id} style={styles.gridCard} badge={{ icon: 'Code', tone: 'accent' }} onPress={() => handleOpenAssignmentSandbox(a)}>
              <Txt variant="overline" tone="subtle">{a.skill_name}</Txt>
              <Txt variant="h3" tone="ink" style={{ marginTop: 4 }}>{a.title}</Txt>
              <Txt variant="small" tone="muted" numberOfLines={3} style={{ marginTop: 4 }}>{a.subtitle || a.description}</Txt>
              <Row justify="space-between" style={{ marginTop: space.md }}>
                <Pill label={a.difficulty || 'Practice'} tone="warning" size="sm" />
                <IconButton icon="ArrowRight" variant="dark" size={32} onPress={() => handleOpenAssignmentSandbox(a)} />
              </Row>
            </Card>
          ))}
        </View>
      ) : (
        <Card><EmptyState icon="Code" title="No practice workflows" message="Practice workflows are generated from your skill gaps." /></Card>
      )}
    </Stack>
  );

  const testsTab = (
    <Stack gap={space.md}>
      <SegmentedTabs options={['All', 'Available', 'Completed', 'Locked'].map((x) => ({ id: x, label: x }))} value={assessmentsFilterTab} onChange={setAssessmentsFilterTab} size="sm" />
      {modalFilteredAssessments.length ? (
        <View style={styles.cardGrid}>
          {modalFilteredAssessments.map((t) => (
            <Card key={t.id} style={styles.gridCard} tone={t.is_completed ? 'success' : undefined} badge={{ icon: t.is_locked ? 'Lock' : t.is_completed ? 'Check' : 'Target', tone: t.is_locked ? 'neutral' : t.is_completed ? 'success' : 'info' }}>
              <Txt variant="overline" tone="subtle">{t.type || t.category}</Txt>
              <Txt variant="h3" tone="ink" style={{ marginTop: 4 }}>{t.title}</Txt>
              <Txt variant="small" tone="muted" style={{ marginTop: 4 }}>{t.meta}</Txt>
              {t.is_locked && (t.prerequisites || []).length ? <Txt variant="caption" tone="subtle" style={{ marginTop: 4 }}>Requires: {t.prerequisites.map((x) => (typeof x === 'string' ? x : x.title || x.skill_name || x.name || '')).filter(Boolean).join(', ')}</Txt> : null}
              <Row justify="space-between" wrap gap={8} style={{ marginTop: space.md }}>
                <Pill label={t.is_completed ? `Score ${t.score ?? '—'}%` : t.is_locked ? 'Locked' : t.status_badge || 'Available'} tone={t.is_completed ? 'success' : t.is_locked ? 'neutral' : 'info'} icon={t.is_locked ? 'Lock' : undefined} size="sm" />
                {t.is_locked ? null : <Button label={t.is_completed ? 'Retake' : t.action || 'Begin'} size="sm" onPress={() => handleStartAssessment(t)} />}
              </Row>
            </Card>
          ))}
        </View>
      ) : (
        <Card><EmptyState icon="Target" title="No assessments here" /></Card>
      )}
    </Stack>
  );

  const projectsTab = capstoneProjects.length ? (
    <Stack gap={space.md}>
      {capstoneProjects.map((p) => (
        <Card key={p.id} badge={{ icon: 'Rocket', tone: p.is_primary ? 'warning' : 'neutral' }}>
          <Row wrap gap={6}>
            {(p.tags || []).map((t) => <Pill key={t} label={t} size="sm" />)}
          </Row>
          <Txt variant="h2" tone="ink" style={{ marginTop: space.sm }}>{p.title}</Txt>
          <Txt variant="body" tone="muted" style={{ marginTop: 4 }}>{p.desc}</Txt>
          <Row wrap gap={6} style={{ marginTop: space.sm }}>
            {(p.skills || []).map((s) => <Pill key={s} label={s} tone="accent" size="sm" />)}
          </Row>
          <Row justify="space-between" style={{ marginTop: space.lg }}>
            <Pill label={p.status === 'completed' ? 'Completed' : p.status === 'not_started' ? 'Not started' : 'In progress'} tone={p.status === 'completed' ? 'success' : p.status === 'not_started' ? 'neutral' : 'info'} icon={p.xp ? 'Zap' : undefined} />
            <Row gap={8}>
              <Button label="Specs" size="sm" variant="secondary" onPress={() => handleOpenProjectSpecs(p)} />
              {p.status === 'not_started' ? <Button label={p.btn_label || 'Start project'} size="sm" onPress={() => handleStartProjectTrackCta(p)} /> : <Button label="Submit repo" icon="GitBranch" size="sm" onPress={() => handleOpenProjectSpecs(p)} />}
            </Row>
          </Row>
        </Card>
      ))}
    </Stack>
  ) : (
    <Card><EmptyState icon="Rocket" title="No projects yet" message="Capstone projects unlock as your plan progresses." /></Card>
  );

  const credentialsTab = (
    <Stack gap={space.md}>
      <StatTrio
        items={[
          { value: validatedCredentials.length, label: 'Credentials', tone: 'success' },
          { value: learningProgress?.xp_earned ?? 0, label: 'XP earned', tone: 'warning' },
          { value: `${learningProgress?.learning_streak ?? 0}d`, label: 'Streak', dashed: true },
        ]}
      />
      {validatedCredentials.length ? (
        <View style={styles.cardGrid}>
          {validatedCredentials.map((c) => (
            <Card key={c.skill_id || c.title} style={styles.gridCard} tone="success">
              <Row gap={10}>
                <View style={styles.credIcon}><Icon name="Award" size={20} color={colors.mintInk} /></View>
                <Stack gap={2} style={{ flex: 1 }}>
                  <Txt variant="title" tone="ink">{c.title}</Txt>
                  <Txt variant="caption" color={colors.mintInk}>{c.badge} · {c.date}</Txt>
                </Stack>
              </Row>
            </Card>
          ))}
        </View>
      ) : (
        <Card><EmptyState icon="Award" title="No credentials yet" message="Pass assessments and finish projects to earn verified credentials." /></Card>
      )}
    </Stack>
  );

  const timerText = `${String(Math.floor(assessmentTimerSeconds / 60)).padStart(2, '0')}:${String(assessmentTimerSeconds % 60).padStart(2, '0')}`;
  const runnerQ = assessmentQuestions[currentQuestionIndex];
  const runnerOptions = extractQuestionOptions(runnerQ);

  return (
    <Page aside={eventsPanel}>
      <SectionTitle
        title="My Learning Plan"
        emoji="⏰"
        subtitle={`For ${displayCareerName}`}
        right={<SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Search courses or skills" style={{ width: isMobile ? '100%' : 280 }} />}
      />

      {targetCareers.length > 1 ? (
        <SegmentedTabs
          options={targetCareers.map((c) => ({ id: getCareerName(c), label: getCareerName(c), icon: 'Target' }))}
          value={displayCareerName}
          onChange={switchCareer}
          scrollable={isMobile}
        />
      ) : null}

      {pathActionMessage ? (
        <Inset tone="success" padding={space.sm}>
          <Row gap={8}>
            <Icon name="Sparkles" size={16} color={colors.mintInk} />
            <Txt variant="small" weight={600} color={colors.mintInk} style={{ flex: 1 }}>{pathActionMessage}</Txt>
          </Row>
        </Inset>
      ) : null}

      <SegmentedTabs options={tabs} value={activeSubTab === 'MyCourses' || activeSubTab === 'PathSteps' ? 'Overview' : activeSubTab} onChange={setActiveSubTab} scrollable={isMobile} />

      {activeSubTab === 'Assignments' ? practiceTab : activeSubTab === 'MockTests' ? testsTab : activeSubTab === 'Projects' ? projectsTab : activeSubTab === 'Credentials' ? credentialsTab : planTab}

      {/* Course progress */}
      <Sheet
        visible={!!selectedItemForProgress}
        onClose={() => setSelectedItemForProgress(null)}
        title="Update progress"
        subtitle={selectedItemForProgress?.title}
        icon="BookOpen"
        tone="info"
        width={520}
        footer={
          <>
            <Button label="Cancel" variant="secondary" onPress={() => setSelectedItemForProgress(null)} />
            <Button label="Save progress" icon="Check" onPress={handleSaveProgress} loading={isUpdatingItem} />
          </>
        }
      >
        <Row justify="center">
          <Ring value={newProgressPercent} size={120} stroke={12} tone="info">
            <Txt variant="display" tone="ink">{newProgressPercent}%</Txt>
          </Ring>
        </Row>
        <ChipGroup
          options={[0, 25, 50, 75, 100].map((v) => ({ id: v, label: v === 100 ? 'Finished' : `${v}%` }))}
          value={newProgressPercent}
          multiple={false}
          tone="info"
          onChange={setNewProgressPercent}
          style={{ justifyContent: 'center' }}
        />
        <Row gap={8} justify="center">
          <IconButton icon="Minus" onPress={() => setNewProgressPercent((p) => Math.max(0, p - 5))} />
          <IconButton icon="Plus" onPress={() => setNewProgressPercent((p) => Math.min(100, p + 5))} />
        </Row>
        {selectedItemForProgress?.canonical_url ? <Button label="Open course" icon="ExternalLink" variant="ghost" onPress={() => handleOpenUrl(selectedItemForProgress.canonical_url)} style={{ alignSelf: 'center' }} /> : null}
      </Sheet>

      {/* Practice workflow */}
      <Sheet
        visible={!!selectedAssignmentForSandbox}
        onClose={() => setSelectedAssignmentForSandbox(null)}
        title={selectedAssignmentForSandbox?.title}
        subtitle={[selectedAssignmentForSandbox?.skill_name, selectedAssignmentForSandbox?.difficulty].filter(Boolean).join(' · ')}
        icon="Code"
        tone="accent"
        width={760}
        footer={
          <>
            <Button label="Close" variant="secondary" onPress={() => setSelectedAssignmentForSandbox(null)} />
            <Button label="Submit for grading" icon="Send" onPress={handleSubmitAssignmentSandbox} loading={isSubmittingSandbox} />
          </>
        }
      >
        {selectedAssignmentForSandbox?.instructions ? (
          <Inset tone="neutral">
            <Stack gap={4}>
              {String(selectedAssignmentForSandbox.instructions).split('\n').filter((l) => l.trim()).map((line, i) => (
                <Txt key={i} variant={line.startsWith('#') ? 'bodyStrong' : 'small'} tone="default">{line.replace(/^#+\s*/, '')}</Txt>
              ))}
            </Stack>
          </Inset>
        ) : (
          <Txt variant="body" tone="muted">{selectedAssignmentForSandbox?.description}</Txt>
        )}
        <View style={styles.editor}>
          <TextInput value={sandboxCode} onChangeText={setSandboxCode} multiline autoCapitalize="none" autoCorrect={false} spellCheck={false} style={[styles.codeInput, webOnly({ outlineStyle: 'none' })]} />
        </View>
        {sandboxTestResults ? (
          <Inset tone={sandboxTestResults.is_passed ? 'success' : 'warning'}>
            <Txt variant="bodyStrong" tone="ink">
              {sandboxTestResults.score != null ? `Score ${sandboxTestResults.score}%` : 'Submitted'}{sandboxTestResults.xp_earned ? ` · +${sandboxTestResults.xp_earned} XP` : ''}
            </Txt>
            {sandboxTestResults.message ? <Txt variant="small" tone="muted">{sandboxTestResults.message}</Txt> : null}
            {(sandboxTestResults.test_results || []).map((t, i) => (
              <Row key={t.id || i} gap={8} style={{ marginTop: 6 }}>
                <Icon name={String(t.status).toUpperCase() === 'PASSED' || t.passed ? 'CircleCheck' : 'X'} size={15} color={String(t.status).toUpperCase() === 'PASSED' || t.passed ? colors.mintInk : '#B4232A'} />
                <Txt variant="small" tone="default">{t.name || t.description}</Txt>
              </Row>
            ))}
          </Inset>
        ) : null}
      </Sheet>

      {/* Timed assessment */}
      <Sheet
        visible={!!activeAssessmentRunner}
        onClose={() => {
          setActiveAssessmentRunner(null);
          setAssessmentEvaluationResult(null);
        }}
        title={activeAssessmentRunner?.title}
        subtitle={assessmentEvaluationResult ? 'Result' : `${assessmentQuestions.length} questions · pass ${activeAssessmentRunner?.pass_score || 70}%`}
        icon="Target"
        tone="info"
        footer={
          assessmentEvaluationResult ? (
            <Button label="Done" onPress={() => { setActiveAssessmentRunner(null); setAssessmentEvaluationResult(null); }} />
          ) : (
            <>
              <Button label="Previous" variant="secondary" icon="ArrowLeft" onPress={() => setCurrentQuestionIndex((p) => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0} />
              {currentQuestionIndex >= assessmentQuestions.length - 1 ? (
                <Button label="Submit" icon="Send" onPress={handleSubmitAssessmentRunner} loading={isSubmittingAssessment} />
              ) : (
                <Button label="Next" iconRight="ArrowRight" onPress={() => setCurrentQuestionIndex((p) => Math.min(assessmentQuestions.length - 1, p + 1))} />
              )}
            </>
          )
        }
      >
        {assessmentEvaluationResult ? (
          <Stack gap={space.md} style={{ alignItems: 'center' }}>
            <Ring value={assessmentEvaluationResult.score ?? 0} size={128} stroke={12} tone="info">
              <Txt variant="display" tone="ink">{assessmentEvaluationResult.score != null ? `${Math.round(assessmentEvaluationResult.score)}%` : '—'}</Txt>
            </Ring>
            <Pill label={assessmentEvaluationResult.assessment_status || 'Evaluated'} tone="success" icon="ShieldCheck" />
            <Txt variant="body" tone="muted">{assessmentEvaluationResult.correct_answers ?? '—'} of {assessmentEvaluationResult.total_questions ?? assessmentQuestions.length} correct</Txt>
          </Stack>
        ) : runnerQ ? (
          <Stack gap={space.md}>
            <Row justify="space-between">
              <Txt variant="overline" tone="subtle">Question {currentQuestionIndex + 1} of {assessmentQuestions.length}</Txt>
              <Pill label={timerText} tone={assessmentTimerSeconds < 300 ? 'danger' : 'neutral'} icon="Clock" size="sm" />
            </Row>
            <ProgressBar value={((currentQuestionIndex + 1) / assessmentQuestions.length) * 100} tone="info" />
            <Txt variant="h3" tone="ink">{runnerQ.question_text || runnerQ.question}</Txt>
            <Stack gap={8}>
              {runnerOptions.map((opt) => {
                const selected = userSelectedAnswers[String(runnerQ.id)] === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => handleSelectAnswerOption(runnerQ.id, opt.key)}
                    style={({ hovered }) => [styles.option, webOnly({ cursor: 'pointer' }), selected ? { backgroundColor: colors.sky, borderColor: colors.skyStrong } : hovered ? { backgroundColor: colors.surfaceMuted } : null]}
                  >
                    <View style={[styles.optKey, selected ? { backgroundColor: colors.ink } : null]}>
                      <Txt variant="small" weight={700} color={selected ? '#fff' : colors.text}>{opt.key}</Txt>
                    </View>
                    <Txt variant="body" tone="ink" style={{ flex: 1 }}>{opt.text}</Txt>
                  </Pressable>
                );
              })}
            </Stack>
          </Stack>
        ) : null}
      </Sheet>

      {/* Capstone project */}
      <Sheet
        visible={!!selectedProjectForSpecs}
        onClose={() => setSelectedProjectForSpecs(null)}
        title={selectedProjectForSpecs?.title}
        subtitle={selectedProjectForSpecs?.xp ? `+${selectedProjectForSpecs.xp} XP on verification` : 'Capstone project'}
        icon="Rocket"
        tone="warning"
        width={720}
        footer={
          <>
            <Button label="Close" variant="secondary" onPress={() => setSelectedProjectForSpecs(null)} />
            <Button label="Submit repository" icon="Send" onPress={handleSubmitProjectRepo} loading={isSubmittingProject} disabled={!selectedRepo} />
          </>
        }
      >
        {projectActionSuccessMsg ? (
          <Inset tone="success"><Txt variant="small" weight={600} color={colors.mintInk}>{projectActionSuccessMsg}</Txt></Inset>
        ) : null}
        <Txt variant="body" tone="muted">{selectedProjectForSpecs?.desc}</Txt>
        {(selectedProjectForSpecs?.milestones || []).length ? (
          <Timeline
            gap={space.sm}
            items={selectedProjectForSpecs.milestones.map((m) => ({
              key: m.milestone || m.title,
              done: m.status === 'completed',
              content: (
                <View style={styles.moduleRow}>
                  <Txt variant="small" weight={700} tone="ink">{m.milestone ? `${m.milestone} · ` : ''}{m.title}</Txt>
                  {m.deliverable ? <Txt variant="caption" tone="muted">{m.deliverable}</Txt> : null}
                </View>
              ),
            }))}
          />
        ) : null}
        <Txt variant="h3" tone="ink">Choose a repository</Txt>
        {isLoadingRepos ? (
          <Skeleton height={60} />
        ) : availableRepos.length ? (
          <Stack gap={8}>
            {connectedGitHubAccount?.username ? <Txt variant="caption" tone="muted">From @{connectedGitHubAccount.username}</Txt> : null}
            {availableRepos.map((r) => {
              const sel = selectedRepo?.id === r.id;
              return (
                <Pressable key={r.id} onPress={() => setSelectedRepo(r)} style={({ hovered }) => [styles.repoRow, webOnly({ cursor: 'pointer' }), sel ? { backgroundColor: colors.butter } : hovered ? { backgroundColor: colors.surfaceMuted } : null]}>
                  <Icon name={sel ? 'CircleCheck' : 'Circle'} size={18} color={sel ? colors.butterInk : colors.textSubtle} />
                  <Stack gap={1} style={{ flex: 1 }}>
                    <Txt variant="small" weight={700} tone="ink">{r.name}</Txt>
                    {r.description ? <Txt variant="caption" tone="muted" numberOfLines={1}>{r.description}</Txt> : null}
                  </Stack>
                  {r.language ? <Pill label={r.language} size="sm" /> : null}
                  {r.already_submitted ? <Pill label="Submitted" tone="success" size="sm" /> : null}
                </Pressable>
              );
            })}
          </Stack>
        ) : (
          <EmptyState
            icon="GitBranch"
            title="No repositories available"
            message="Connect GitHub in your profile to submit project work."
            action={<Button label="Go to profile" size="sm" onPress={() => { setSelectedProjectForSpecs(null); if (onNavigate) onNavigate('Profile', {}); }} />}
          />
        )}
      </Sheet>
    </Page>
  );
}

const mono = Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, monospace', ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  grid: {
    gap: space.xl,
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
  watchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
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
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  gridCard: {
    flexGrow: 1,
    flexBasis: 300,
  },
  credIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editor: {
    backgroundColor: colors.frame,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  codeInput: {
    minHeight: 220,
    color: '#E8E8EA',
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 20,
    padding: 14,
    textAlignVertical: 'top',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optKey: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: space.sm,
  },
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
});
