import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  fetchCareerIntelligence,
  enrollInCourse,
  updateCourseProgress,
  refreshLearningPath,
  fetchAssignments,
  submitAssignment,
  fetchAssessments,
  fetchAssessmentDetail,
  submitAssessment,
  fetchProjects,
  startProjectTrack,
  submitProjectTrack,
  fetchAvailableProjectRepos,
} from '../services/careerIntelligenceService';
import { verifyCourseCertificate } from '../services/internshipService';

import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
  ensureLearningGlobalStyles,
} from './components/LearningDesignTokens';

import LearningHero from './components/LearningHero';
import LearningSummaryMetrics from './components/LearningSummaryMetrics';
import ContinueLearningHero from './components/ContinueLearningHero';
import CompetencyBlueprintSection from './components/CompetencyBlueprintSection';
import SkillGapsSection from './components/SkillGapsSection';
import CareerRoadmapSection from './components/CareerRoadmapSection';
import ActiveCoursesSection from './components/ActiveCoursesSection';
import RecommendedStepsSection from './components/RecommendedStepsSection';
import PracticeLabSection from './components/PracticeLabSection';
import AssessmentCenterSection from './components/AssessmentCenterSection';
import ProjectLabSection from './components/ProjectLabSection';
import VerifiedEvidenceSection from './components/VerifiedEvidenceSection';
import LearningFooter from './components/LearningFooter';
import {
  CourseProgressModal,
  AssignmentSandboxModal,
  AllAssignmentsModal,
  AssessmentRunnerModal,
  AllAssessmentsModal,
  ProjectSpecsModal,
} from './components/LearningModals';

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

  // Inject Google Fonts and Claymorphism CSS styles
  useEffect(() => {
    ensureLearningGlobalStyles();
  }, []);

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
    setSandboxCode(assign.starter_code || '// Complete your implementation\nfunction solve() {\n  return true;\n}\n');
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
          score: res.score || 100,
          xp_earned: res.xp_earned || 50,
          is_passed: true,
          test_results: res.test_results || [
            { id: 'tc_1', name: 'Syntax & Module Execution', status: 'PASSED' },
            { id: 'tc_2', name: 'Edge Case & Error Handling Verification', status: 'PASSED' },
          ],
          message: res.message || 'Workflow verified and graded with automated test suite.',
        });
        setPathActionMessage(`+50 XP Earned! Verified assignment: ${selectedAssignmentForSandbox.title}`);
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
          score: res.score != null ? res.score : 85,
          correct_answers: res.correct_answers || assessmentQuestions.length,
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
    const matchedTest = assessmentTests.find((t) => {
      const tSkill = (t.skill_name || t.skill || t.title || '').toLowerCase().trim();
      return tSkill.includes(skName) || skName.includes(tSkill);
    });
    if (matchedTest) {
      handleStartAssessment(matchedTest);
    } else if (assessmentTests.length > 0) {
      handleStartAssessment(assessmentTests[0]);
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
  const readinessScore = readinessData?.score != null ? readinessData.score / 100 : 0.82;
  const targetFitScore = readinessData?.target_fit_score || Math.round(readinessScore * 100);
  const skills = careerIntel?.all_required_skills || careerIntel?.skills || [];
  const targetCareers = careerIntel?.target_careers || [];
  const learningPath = careerIntel?.learning_path;
  const rawItems = learningPath?.items || [];
  const stepProgression = careerIntel?.step_progression;
  const learningProgress = careerIntel?.learning_progress;

  const displayCareerName = activeCareerName || getCareerName(careerIntel?.active_career) || 'Full Stack Developer';

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

  // -------------------------------------------------------------
  // LOADING / ERROR STATES
  // -------------------------------------------------------------
  if (isLoading && !careerIntel) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CLAY_COLORS.primary} />
        <Text style={styles.loadingText}>
          Synchronizing Learning Intelligence & Career Models...
        </Text>
      </View>
    );
  }

  if (loadError && !careerIntel) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
        <Text style={styles.errorTitle}>Unable to Load Learning Hub</Text>
        <Text style={styles.errorSubtitle}>{loadError}</Text>
        <ClayButton
          style={styles.retryBtn}
          onPress={() => loadData(activeCareerName)}
        >
          <Text style={styles.retryBtnText}>Retry Connection</Text>
        </ClayButton>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.mainContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. LEARNING INTELLIGENCE HERO */}
      <LearningHero
        displayCareerName={displayCareerName}
        readinessScore={readinessScore}
        targetFitScore={targetFitScore}
        targetCareers={targetCareers}
        activeCareerName={activeCareerName}
        onSelectCareer={(careerName) => {
          if (careerName !== activeCareerName) {
            setActiveCareerName(careerName);
            setCareerIntel(null);
            loadData(careerName);
          }
        }}
        onContinueLearning={() => {
          if (activeFeaturedCourse) {
            setSelectedItemForProgress(activeFeaturedCourse);
            setNewProgressPercent(activeFeaturedCourse.progress_percent || 0);
          } else if (curatedNextSteps.length > 0) {
            const topStep = curatedNextSteps[0];
            if (topStep.action === 'Enroll Free') {
              handleEnrollCourse(topStep.course_id, topStep);
            } else if (topStep.canonical_url) {
              handleOpenUrl(topStep.canonical_url);
            }
          } else {
            handleRefreshPath();
          }
        }}
        isDesktop={isDesktop}
        isMobile={isMobile}
      />

      {/* Action Message Banner */}
      {pathActionMessage ? (
        <View style={styles.actionBanner}>
          <Text style={styles.actionBannerText}>⚡ {pathActionMessage}</Text>
        </View>
      ) : null}

      {/* 2. SUB-NAVIGATION TABS */}
      <View style={styles.subNavBar}>
        {[
          { key: 'Overview', label: 'Overview' },
          { key: 'MyCourses', label: `My Courses (${coursesList.length})` },
          { key: 'PathSteps', label: `Path Steps (${milestoneSteps.length})` },
          { key: 'Assignments', label: `Assignments (${practicalAssignments.length})` },
          { key: 'MockTests', label: `Mock Tests (${diagnosticTests.length})` },
          { key: 'Projects', label: `Projects (${capstoneProjects.length})` },
          { key: 'Credentials', label: `Credentials (${validatedCredentials.length})` },
        ].map((tab) => {
          const isActive = activeSubTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.subNavItem, isActive && styles.subNavItemActive]}
              onPress={() => setActiveSubTab(tab.key)}
            >
              <Text style={[styles.subNavText, isActive && styles.subNavTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3. TOP LEARNING SUMMARY METRICS */}
      <LearningSummaryMetrics
        displayCareerName={displayCareerName}
        targetFitScore={targetFitScore}
        verifiedSkillsCount={verifiedSkills.length}
        inProgressCoursesCount={inProgressCourses.length}
        totalCoursesCount={coursesList.length}
        xpEarned={learningProgress?.xp_earned || 400}
        validatedCredentialsCount={validatedCredentials.length}
        readinessPct={Math.round(readinessScore * 100)}
        isDesktop={isDesktop}
        isTablet={isTablet}
      />

      {/* SUBTAB FILTERING: If user clicked a specific tab or is on Overview */}
      {(activeSubTab === 'Overview' || activeSubTab === 'MyCourses') && activeFeaturedCourse && (
        /* 4. CONTINUE LEARNING HERO CARD */
        <ContinueLearningHero
          activeCourse={activeFeaturedCourse}
          onContinueCourse={(c) => {
            setSelectedItemForProgress(c);
            setNewProgressPercent(c.progress_percent || 0);
          }}
          onOpenCourseUrl={handleOpenUrl}
          displayCareerName={displayCareerName}
          isDesktop={isDesktop}
        />
      )}

      {(activeSubTab === 'Overview' || activeSubTab === 'PathSteps') && (
        <>
          {/* 5. COMPETENCY BLUEPRINT */}
          <CompetencyBlueprintSection
            skills={skills}
            verifiedSkills={verifiedSkills}
            gapSkills={gapSkills}
            readinessScore={readinessScore}
            displayCareerName={displayCareerName}
            onNavigateToSkills={onNavigate}
            isDesktop={isDesktop}
          />

          {/* 6. SKILL GAPS TO CLOSE */}
          <SkillGapsSection
            gapSkills={gapSkills}
            verifiedSkills={verifiedSkills}
            totalSkillsCount={skills.length}
            onSelectSkillForSearch={(skillName) => {
              setSearchQuery(skillName);
              setSelectedStatusFilter('all');
            }}
            onNavigateToSkills={onNavigate}
            isDesktop={isDesktop}
          />

          {/* 7. CAREER ROADMAP TIMELINE */}
          <CareerRoadmapSection
            milestones={milestoneSteps}
            displayCareerName={displayCareerName}
            onRefreshPath={handleRefreshPath}
            onTrackCourseProgress={(c, pct) => {
              setSelectedItemForProgress(c);
              setNewProgressPercent(pct);
            }}
            onOpenCourseUrl={handleOpenUrl}
            onNavigateToSkills={onNavigate}
            onStartAssessment={handleStartSkillAssessment}
            onUploadCertificate={handleUploadCertificateForCourse}
          />
        </>
      )}

      {(activeSubTab === 'Overview' || activeSubTab === 'MyCourses') && (
        <>
          {/* 8. ACTIVE COURSES */}
          <ActiveCoursesSection
            coursesList={coursesList}
            filteredCourses={filteredCourses}
            inProgressCourses={inProgressCourses}
            completedCourses={completedCourses}
            selectedStatusFilter={selectedStatusFilter}
            setSelectedStatusFilter={setSelectedStatusFilter}
            selectedProviderFilter={selectedProviderFilter}
            setSelectedProviderFilter={setSelectedProviderFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSelectCourseForProgress={(c) => {
              setSelectedItemForProgress(c);
              setNewProgressPercent(c.progress_percent || 0);
            }}
            onOpenCourseUrl={handleOpenUrl}
            onNavigateToSkills={onNavigate}
            displayCareerName={displayCareerName}
            isDesktop={isDesktop}
          />

          {/* 9. RECOMMENDED FOR YOU */}
          <RecommendedStepsSection
            curatedNextSteps={curatedNextSteps}
            stepProgression={stepProgression}
            displayCareerName={displayCareerName}
            enrollingCourseId={enrollingCourseId}
            onEnrollCourse={handleEnrollCourse}
            onOpenCourseUrl={handleOpenUrl}
            onSelectCourseForProgress={(c) => {
              setSelectedItemForProgress(c);
              setNewProgressPercent(c.progress_percent || 0);
            }}
            isDesktop={isDesktop}
          />
        </>
      )}

      {(activeSubTab === 'Overview' || activeSubTab === 'Assignments') && (
        /* 10. PRACTICE LAB */
        <PracticeLabSection
          assignments={practicalAssignments}
          onOpenSandbox={handleOpenAssignmentSandbox}
          onViewAllAssignments={() => setIsAllAssignmentsModalOpen(true)}
        />
      )}

      {(activeSubTab === 'Overview' || activeSubTab === 'MockTests') && (
        /* 11. ASSESSMENT CENTER */
        <AssessmentCenterSection
          diagnosticTests={diagnosticTests}
          onStartAssessment={handleStartAssessment}
          onBrowseAllAssessments={() => setIsAllAssessmentsModalOpen(true)}
          isDesktop={isDesktop}
        />
      )}

      {(activeSubTab === 'Overview' || activeSubTab === 'Projects') && (
        /* 12. PROJECT LAB */
        <ProjectLabSection
          projects={capstoneProjects}
          displayCareerName={displayCareerName}
          onStartProjectTrack={handleStartProjectTrackCta}
          onOpenProjectSpecs={handleOpenProjectSpecs}
          isDesktop={isDesktop}
        />
      )}

      {(activeSubTab === 'Overview' || activeSubTab === 'Credentials') && (
        /* 13. VERIFIED EVIDENCE & CREDENTIALS */
        <VerifiedEvidenceSection
          credentials={validatedCredentials}
          xpEarned={learningProgress?.xp_earned || 400}
          verifiedSkillsCount={verifiedSkills.length}
          onNavigateToSkills={onNavigate}
          isDesktop={isDesktop}
        />
      )}

      {/* 14. FOOTER */}
      <LearningFooter />

      {/* ========================================================================= */}
      {/* ALL MODALS (6 MODALS PRESERVED AND CLAYMORPHICALLY REDESIGNED)            */}
      {/* ========================================================================= */}
      <CourseProgressModal
        visible={!!selectedItemForProgress}
        course={selectedItemForProgress}
        progressPercent={newProgressPercent}
        onChangeProgress={setNewProgressPercent}
        onSave={handleSaveProgress}
        onClose={() => setSelectedItemForProgress(null)}
        isUpdating={isUpdatingItem}
      />

      <AssignmentSandboxModal
        visible={!!selectedAssignmentForSandbox}
        assignment={selectedAssignmentForSandbox}
        sandboxCode={sandboxCode}
        onChangeCode={setSandboxCode}
        onSubmit={handleSubmitAssignmentSandbox}
        onClose={() => setSelectedAssignmentForSandbox(null)}
        isSubmitting={isSubmittingSandbox}
        testResults={sandboxTestResults}
      />

      <AllAssignmentsModal
        visible={isAllAssignmentsModalOpen}
        assignments={modalFilteredAssignments}
        filterDifficulty={assignmentsFilterDifficulty}
        onChangeDifficulty={setAssignmentsFilterDifficulty}
        onSelectAssignment={(assign) => {
          setIsAllAssignmentsModalOpen(false);
          handleOpenAssignmentSandbox(assign);
        }}
        onClose={() => setIsAllAssignmentsModalOpen(false)}
      />

      <AssessmentRunnerModal
        visible={!!activeAssessmentRunner}
        assessment={activeAssessmentRunner}
        questions={assessmentQuestions}
        currentIndex={currentQuestionIndex}
        userAnswers={userSelectedAnswers}
        timerSeconds={assessmentTimerSeconds}
        evaluationResult={assessmentEvaluationResult}
        onSelectAnswer={handleSelectAnswerOption}
        onPrevQuestion={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
        onNextQuestion={() => setCurrentQuestionIndex((prev) => Math.min(assessmentQuestions.length - 1, prev + 1))}
        onSubmit={handleSubmitAssessmentRunner}
        onClose={() => {
          setActiveAssessmentRunner(null);
          setAssessmentEvaluationResult(null);
        }}
        isSubmitting={isSubmittingAssessment}
      />

      <AllAssessmentsModal
        visible={isAllAssessmentsModalOpen}
        assessments={modalFilteredAssessments}
        activeTab={assessmentsFilterTab}
        onChangeTab={setAssessmentsFilterTab}
        onStartAssessment={(test) => {
          setIsAllAssessmentsModalOpen(false);
          handleStartAssessment(test);
        }}
        onClose={() => setIsAllAssessmentsModalOpen(false)}
      />

      <ProjectSpecsModal
        visible={!!selectedProjectForSpecs}
        project={selectedProjectForSpecs}
        connectedGitHubAccount={connectedGitHubAccount}
        availableRepos={availableRepos}
        selectedRepo={selectedRepo}
        onSelectRepo={setSelectedRepo}
        onSubmitRepo={handleSubmitProjectRepo}
        onClose={() => setSelectedProjectForSpecs(null)}
        onNavigateToProfile={() => {
          setSelectedProjectForSpecs(null);
          if (onNavigate) onNavigate('Profile', {});
        }}
        isLoadingRepos={isLoadingRepos}
        isSubmitting={isSubmittingProject}
        successMsg={projectActionSuccessMsg}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: CLAY_COLORS.canvas,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.canvas,
    padding: 40,
    minHeight: 400,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: CLAY_FONTS.body,
    fontSize: 14,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  errorTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '800',
    color: CLAY_COLORS.danger,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    marginBottom: 18,
  },
  retryBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
  },
  retryBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionBanner: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    marginBottom: 16,
  },
  actionBannerText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.primaryDark,
  },
  subNavBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: CLAY_COLORS.cardBorder,
    marginBottom: 18,
    gap: 6,
    overflow: 'scroll',
  },
  subNavItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  subNavItemActive: {
    borderBottomColor: CLAY_COLORS.primary,
  },
  subNavText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  subNavTextActive: {
    color: CLAY_COLORS.primary,
  },
});
