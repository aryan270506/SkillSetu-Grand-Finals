import React, { useState, useEffect, useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  fetchRecommendedInternships,
  fetchInternshipDetail,
  toggleSaveInternship,
  completeCourseFromOpportunities,
  verifyCourseCertificate,
  applyToInternship,
} from '../services/internshipService';
import {
  fetchAssessmentDetail,
  submitAssessment,
  submitProjectTrack,
  fetchAvailableProjectRepos,
  enrollInCourse,
} from '../services/careerIntelligenceService';
import { fetchStudentApplications } from '../services/applicationService';
import { extractQuestionOptions } from '../Skill/components/AssessmentSheet';
import {
  Avatar,
  Button,
  Card,
  Chip,
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
  SearchField,
  SectionTitle,
  SegmentedTabs,
  Sheet,
  Skeleton,
  Stack,
  StatTrio,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';
import { pickFile } from '../../../ui/pickFile';

import { tl } from '../../../i18n/tl';
import { formatDate } from '../../../i18n/format';

export default function Internship({ user, profileData, onNavigate }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 640;
  const isDesktop = width >= 1024;
  const isWideDesktop = width >= 1400;

  const studentEmail = user?.email || profileData?.personalInfo?.email || '';

  // API State
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalOpportunities, setTotalOpportunities] = useState(0);
  const [serverMetrics, setServerMetrics] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortOption, setSortOption] = useState('Best Match');
  const [readinessTab, setReadinessTab] = useState('ALL'); // 'ALL' | 'READY' | 'NEEDS_DEV' | 'SAVED'
  const [verifiedFilter, setVerifiedFilter] = useState(''); // '' | 'VERIFIED' | 'UNVERIFIED'
  const [selectedTechStack, setSelectedTechStack] = useState('');

  // Modals & UI State
  const [selectedDetailJob, setSelectedDetailJob] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPlanJob, setSelectedPlanJob] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAppliedModal, setShowAppliedModal] = useState(false);
  const [appliedJob, setAppliedJob] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  // State for Interactive Assessment Runner
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentSubmitting, setAssessmentSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [assessmentCurrentIdx, setAssessmentCurrentIdx] = useState(0);
  const [assessmentError, setAssessmentError] = useState(null);

  // State for Interactive Project Challenge Runner
  const [activeProject, setActiveProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectResult, setProjectResult] = useState(null);
  const [projectRepoUrl, setProjectRepoUrl] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [projectError, setProjectError] = useState(null);
  const [availableRepos, setAvailableRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState(null);

  const [enrollingCourseId, setEnrollingCourseId] = useState(null);
  const [planSuccessNotice, setPlanSuccessNotice] = useState(null);

  // State for Real Certificate Upload & Verification
  const [activeUploadCourse, setActiveUploadCourse] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);


  // Helper to reliably test if a job is an authentic recruiter-verified posting
  const isJobVerified = (job) => {
    if (!job) return false;
    return (
      String(job.verification_status || '').toUpperCase() === 'VERIFIED' ||
      job.verified === true ||
      job.is_verified === true ||
      job.source === 'recruiter_posting' ||
      job.source_type === 'recruiter_verified' ||
      (job.company_id != null && job.company_id !== undefined && job.company_id !== '')
    );
  };

  // Initial load / refresh / pagination
  const loadData = async (isManualRefresh = false, targetPage = 1, append = false) => {
    if (isManualRefresh) setRefreshing(true);
    else if (!append) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const [recRes, appRes] = await Promise.all([
        fetchRecommendedInternships({
          email: studentEmail,
          page: targetPage,
          pageSize: 200,
          search: searchQuery,
          location: locationFilter,
          workMode: typeFilter,
        }),
        fetchStudentApplications(studentEmail),
      ]);

      if (recRes && recRes.status === 'success') {
        const newItems = recRes.items || recRes.data || [];
        if (append) {
          setInternships((prev) => {
            const seen = new Set(prev.map((p) => String(p.id)));
            const uniqueAdditions = newItems.filter((it) => !seen.has(String(it.id)));
            return [...prev, ...uniqueAdditions];
          });
        } else {
          setInternships(newItems);
        }
        const total = recRes.total ?? recRes.total_results ?? newItems.length;
        setTotalOpportunities(total);
        setHasMore(recRes.has_more ?? (targetPage * 200 < total));
        setPage(targetPage);
        if (recRes.metrics) {
          setServerMetrics(recRes.metrics);
        }
      } else {
        if (!append) setError(recRes?.message || 'Unable to load recommended internships');
      }

      if (appRes && appRes.internships) {
        setApplications(appRes.internships);
      }
    } catch (err) {
      console.error('[Internship Screen] Error loading data:', err);
      if (!append) setError(err.message || 'Failed to connect to opportunities server');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData(false, 1, false);
  }, [studentEmail, locationFilter, typeFilter]);

  // Handle Search submit
  const handleSearchSubmit = () => {
    loadData(true, 1, false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(false, page + 1, true);
    }
  };

  // Dynamic Metrics derived from real runtime server & loaded data
  const metrics = useMemo(() => {
    let ready = 0;
    let dev = 0;
    let verified = 0;
    let unverified = 0;
    let totalScore = 0;

    internships.forEach((job) => {
      const score = Number(job.match_score || 0);
      const thresh = job.application_threshold ?? job.minimum_match_threshold ?? 80;
      totalScore += score;
      if (job.readiness_status === 'READY_TO_APPLY' || (score >= thresh && job.hard_eligible !== false)) {
        ready++;
      } else {
        dev++;
      }
      if (isJobVerified(job)) {
        verified++;
      } else {
        unverified++;
      }
    });

    const total = totalOpportunities || internships.length;
    return {
      readyCount: serverMetrics?.ready_to_apply ?? ready,
      devCount: serverMetrics?.needs_development ?? dev,
      verifiedCount: serverMetrics?.verified ?? verified,
      unverifiedCount: serverMetrics?.unverified ?? unverified,
      totalCount: serverMetrics?.total_opportunities ?? total,
      avgMatch: internships.length ? Math.round(totalScore / internships.length) : (serverMetrics?.intelligence_score ?? null),
    };
  }, [internships, totalOpportunities, serverMetrics]);

  // Extract unique tech stack tags from actual loaded dataset
  const availableTechStacks = useMemo(() => {
    const techSet = new Set();
    internships.forEach(job => {
      (job.skills || []).forEach(s => {
        if (s && s.length <= 18) techSet.add(s);
      });
    });
    return Array.from(techSet);
  }, [internships]);

  // Featured recommendations
  const featuredJobs = useMemo(() => {
    return internships.slice(0, 3);
  }, [internships]);

  // Filtered & Sorted Listings
  const filteredJobs = useMemo(() => {
    let list = [...internships];

    // 1. Filter by Verified / Unverified Batch
    if (verifiedFilter === 'VERIFIED') {
      list = list.filter(isJobVerified);
    } else if (verifiedFilter === 'UNVERIFIED') {
      list = list.filter((job) => !isJobVerified(job));
    }

    // 2. Filter by Readiness tab
    if (readinessTab === 'READY') {
      list = list.filter((job) => {
        const thresh = job.application_threshold ?? job.minimum_match_threshold ?? 80;
        return job.readiness_status === 'READY_TO_APPLY' || ((job.match_score || 0) >= thresh && job.hard_eligible !== false);
      });
    } else if (readinessTab === 'NEEDS_DEV') {
      list = list.filter((job) => {
        const thresh = job.application_threshold ?? job.minimum_match_threshold ?? 80;
        return job.readiness_status === 'NEEDS_DEVELOPMENT' || (job.match_score || 0) < thresh || job.hard_eligible === false;
      });
    } else if (readinessTab === 'SAVED') {
      list = list.filter((job) => job.is_saved);
    }

    // 3. Filter by Tech Stack
    if (selectedTechStack) {
      const targetTech = selectedTechStack.toLowerCase();
      list = list.filter((job) => (job.skills || []).some((s) => s.toLowerCase().includes(targetTech)));
    }

    // 4. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((job) => {
        const titleMatch = job.title?.toLowerCase().includes(q);
        const compMatch = (job.company || job.company_name)?.toLowerCase().includes(q);
        const skillMatch = (job.skills || []).some((s) => s.toLowerCase().includes(q));
        const locMatch = job.location?.toLowerCase().includes(q);
        return titleMatch || compMatch || skillMatch || locMatch;
      });
    }

    return list.sort((a, b) => {
      if (sortOption === 'Best Match') {
        return (b.match_score || 0) - (a.match_score || 0);
      } else if (sortOption === 'Stipend (High to Low)') {
        const sA = a.stipend_max || a.stipend_min || 0;
        const sB = b.stipend_max || b.stipend_min || 0;
        return sB - sA;
      } else if (sortOption === 'Newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return 0;
    });
  }, [internships, readinessTab, verifiedFilter, selectedTechStack, searchQuery, sortOption]);

  // Open Targeted Development Plan Modal & Fetch Detailed Snapshot
  const openPlanModal = async (job) => {
    setSelectedPlanJob(job);
    setShowPlanModal(true);
    try {
      const detail = await fetchInternshipDetail(job.id, studentEmail);
      if (detail) {
        setSelectedPlanJob(detail);
      }
    } catch (err) {
      console.warn('[Internship] Could not load detailed job info:', err);
    }
  };

  // Course Completion / Enrollment Handler
  const handleEnrollCourse = async (course) => {
    const cId = course.id || course.course_id || course.title;
    setEnrollingCourseId(cId);
    try {
      await enrollInCourse(cId, studentEmail);
      if (course.url) {
        Linking.openURL(course.url).catch(() => {});
      }
      if (selectedPlanJob && selectedPlanJob.recommended_courses) {
        setSelectedPlanJob(prev => ({
          ...prev,
          recommended_courses: (prev.recommended_courses || []).map(c => 
            (c.id === course.id || c.title === course.title) ? { ...c, status: 'IN_PROGRESS', action_label: 'Continue Learning →' } : c
          )
        }));
      }
      setPlanSuccessNotice(tl('Enrolled in "{{title}}". Opening course module...', {
        title: course.title
      }));
      setTimeout(() => setPlanSuccessNotice(null), 5000);
    } catch (err) {
      console.warn('Enrollment error:', err);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleCompleteCourse = async (course) => {
    const cId = course.id || course.course_id || course.title;
    setEnrollingCourseId(cId);
    try {
      await completeCourseFromOpportunities(cId, studentEmail, 100.0);
      if (selectedPlanJob?.id) {
        const updatedJob = await fetchInternshipDetail(selectedPlanJob.id, studentEmail);
        if (updatedJob) {
          setSelectedPlanJob(updatedJob);
        }
      }
      setPlanSuccessNotice(tl('Completed verified course "{{title}}". Skill evidence recorded!', {
        title: course.title
      }));
      setTimeout(() => setPlanSuccessNotice(null), 5000);
      loadData(true);
    } catch (err) {
      console.warn('Course completion error:', err);
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleStartUploadCertificate = (course) => {
    setActiveUploadCourse(course);
    setUploadResult(null);
    setUploadError(null);
    setShowPlanModal(false);
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setActiveUploadCourse(null);
    setUploadResult(null);
    setUploadError(null);
    if (selectedPlanJob) {
      setShowPlanModal(true);
    }
  };

  const handleSubmitCertificate = async (certificateData) => {
    if (!activeUploadCourse) return;
    const cId = activeUploadCourse.id || activeUploadCourse.course_id || activeUploadCourse.title;
    setUploadingCertificate(true);
    setUploadError(null);

    try {
      const res = await verifyCourseCertificate(cId, studentEmail, certificateData);
      if (res && res.status === 'success') {
        setUploadResult(res);
        if (selectedPlanJob?.id) {
          const updatedJob = await fetchInternshipDetail(selectedPlanJob.id, studentEmail);
          if (updatedJob) {
            setSelectedPlanJob(updatedJob);
          }
        }
        setPlanSuccessNotice(tl(
          'Certificate verified for "{{title}}". Verifiable skill evidence attested!',
          {
            title: activeUploadCourse.title
          }
        ));
        setTimeout(() => setPlanSuccessNotice(null), 6000);
        loadData(true);
      } else {
        setUploadError(res?.message || 'Certificate verification failed. Please check the document.');
      }
    } catch (err) {
      console.error('Certificate verification error:', err);
      setUploadError(err.message || 'Unable to connect to certificate verification service.');
    } finally {
      setUploadingCertificate(false);
    }
  };

  // Assessment Runner Handler
  const closeAssessmentModal = () => {
    setShowAssessmentModal(false);
    setActiveAssessment(null);
    setAssessmentResult(null);
    setAssessmentError(null);
    if (selectedPlanJob) {
      setShowPlanModal(true);
    }
  };

  const handleStartAssessment = async (test) => {
    setShowPlanModal(false);
    setAssessmentLoading(true);
    setAssessmentError(null);
    setAssessmentResult(null);
    setAssessmentAnswers({});
    setAssessmentCurrentIdx(0);
    setShowAssessmentModal(true);

    try {
      const testId = test.id || test.assessment_id || (test.skill ? `test_${test.skill.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'test_git_01');
      const detail = await fetchAssessmentDetail(testId);
      if (detail && detail.questions && detail.questions.length >= 15) {
        setActiveAssessment(detail);
      } else if (detail && detail.questions && detail.questions.length > 0) {
        setAssessmentError('Not enough verified questions are currently available for this skill. Please try again later.');
        setActiveAssessment(detail);
      } else {
        setAssessmentError('Unable to load verified questions for this assessment. Please try again later.');
      }
    } catch (err) {
      console.error('Failed to load assessment:', err);
      setAssessmentError('Unable to connect to assessment service.');
    } finally {
      setAssessmentLoading(false);
    }
  };

  const handleSelectOption = (questionId, optionKey) => {
    setAssessmentAnswers(prev => ({
      ...prev,
      [questionId]: optionKey
    }));
  };

  const handleSubmitAssessment = async () => {
    if (!activeAssessment || !activeAssessment.id) return;
    setAssessmentSubmitting(true);
    setAssessmentError(null);

    try {
      const res = await submitAssessment(activeAssessment.id, studentEmail, assessmentAnswers);
      if (res && (res.status === 'success' || res.score !== undefined)) {
        setAssessmentResult(res);
        if (selectedPlanJob?.id) {
          const updatedJob = await fetchInternshipDetail(selectedPlanJob.id, studentEmail);
          if (updatedJob) {
            setSelectedPlanJob(updatedJob);
          }
        }
        loadData(true);
      } else {
        setAssessmentError(res?.message || 'Failed to evaluate assessment submission.');
      }
    } catch (err) {
      console.error('Submit assessment error:', err);
      setAssessmentError('An error occurred while submitting your assessment.');
    } finally {
      setAssessmentSubmitting(false);
    }
  };

  // Project Runner Handler
  const closeProjectModal = () => {
    setShowProjectModal(false);
    setActiveProject(null);
    setProjectResult(null);
    setProjectError(null);
    if (selectedPlanJob) {
      setShowPlanModal(true);
    }
  };

  const handleStartProject = async (project) => {
    setShowPlanModal(false);
    setActiveProject(project);
    setProjectError(null);
    setProjectResult(null);
    setProjectRepoUrl('');
    setProjectNotes('');
    setSelectedRepoId(null);
    setShowProjectModal(true);
    setLoadingRepos(true);
    try {
      const pId = project.id || project.project_id || 'proj_full_stack_architecture';
      const repoRes = await fetchAvailableProjectRepos(pId, studentEmail);
      if (repoRes && repoRes.repositories && repoRes.repositories.length > 0) {
        setAvailableRepos(repoRes.repositories);
        setSelectedRepoId(repoRes.repositories[0].id || repoRes.repositories[0].name);
        setProjectRepoUrl(repoRes.repositories[0].html_url || repoRes.repositories[0].url || '');
      } else {
        setAvailableRepos([]);
      }
    } catch (e) {
      console.warn('Could not fetch repos:', e);
      setAvailableRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSubmitProject = async () => {
    if (!activeProject || !activeProject.id) return;
    if (!projectRepoUrl || !projectRepoUrl.trim()) {
      setProjectError('Please select or provide a valid connected GitHub repository URL.');
      return;
    }
    setProjectSubmitting(true);
    setProjectError(null);

    try {
      const selectedRepoObj = availableRepos.find(r => (r.id === selectedRepoId || r.name === selectedRepoId || r.html_url === projectRepoUrl));
      const res = await submitProjectTrack(
        activeProject.id,
        studentEmail,
        selectedRepoObj || projectRepoUrl.trim(),
        projectNotes
      );
      if (res && res.status === 'success') {
        setProjectResult(res);
        if (selectedPlanJob?.id) {
          const updatedJob = await fetchInternshipDetail(selectedPlanJob.id, studentEmail);
          if (updatedJob) {
            setSelectedPlanJob(updatedJob);
          }
        }
        loadData(true);
      } else {
        setProjectError(res?.message || 'Project verification was not successful. Please verify all requirements.');
      }
    } catch (err) {
      console.error('Submit project error:', err);
      setProjectError('An error occurred during project verification.');
    } finally {
      setProjectSubmitting(false);
    }
  };

  // Apply Handler
  const handleApply = async (job) => {
    const score = job.match_score || 0;
    const threshold = job.application_threshold ?? job.minimum_match_threshold ?? 80;
    if (job.hard_eligible === false || score < threshold) {
      openPlanModal(job);
      return;
    }

    setApplyingId(job.id);
    try {
      const res = await applyToInternship(job.id, studentEmail);
      if (res && res.allowed === false) {
        openPlanModal(job);
        return;
      }
      
      const targetUrl = job.application_url || job.source_url || res?.data?.application_url;
      if (targetUrl) {
        Linking.openURL(targetUrl).catch((err) => {
          console.warn('Could not open external URL:', err);
        });
      }

      setAppliedJob(job);
      setShowAppliedModal(true);

      const appRes = await fetchStudentApplications(studentEmail);
      if (appRes && appRes.internships) {
        setApplications(appRes.internships);
      }
    } catch (err) {
      console.error('Apply error:', err);
    } finally {
      setApplyingId(null);
    }
  };

  // Save / Bookmark Handler
  const handleToggleSave = async (job) => {
    setSavingId(job.id);
    const willSave = !job.is_saved;
    try {
      await toggleSaveInternship(job.id, studentEmail, willSave);
      setInternships((prev) =>
        prev.map((item) => (item.id === job.id ? { ...item, is_saved: willSave } : item))
      );
      if (selectedDetailJob && selectedDetailJob.id === job.id) {
        setSelectedDetailJob(prev => ({ ...prev, is_saved: willSave }));
      }
      if (selectedPlanJob && selectedPlanJob.id === job.id) {
        setSelectedPlanJob(prev => ({ ...prev, is_saved: willSave }));
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleViewDetails = (job) => {
    setSelectedDetailJob(job);
    setShowDetailsModal(true);
  };

  const handleClearFilters = () => {
    setLocationFilter('');
    setTypeFilter('');
    setSearchQuery('');
    setVerifiedFilter('');
    setSelectedTechStack('');
    setReadinessTab('ALL');
  };


  // ---------------------------------------------------------------------------
  // View helpers
  // ---------------------------------------------------------------------------
  const thresholdOf = (job) => job.application_threshold ?? job.minimum_match_threshold ?? 80;
  const isReady = (job) => job.readiness_status === 'READY_TO_APPLY' || ((job.match_score || 0) >= thresholdOf(job) && job.hard_eligible !== false);
  const companyOf = (job) => job.company || job.company_name || 'Company';
  const stripHtml = (html) =>
    String(html || '')
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/(p|li|h\d)>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  const [certIssuer, setCertIssuer] = useState('');
  const [certFile, setCertFile] = useState(null);

  const pickCertificate = async () => {
    const file = await pickFile({ accept: '.pdf,.png,.jpg,.jpeg' });
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setCertFile({ name: file.name, base64: e.target.result });
    reader.readAsDataURL(file);
  };

  const runnerQuestions = activeAssessment?.questions || [];
  const runnerQ = runnerQuestions[assessmentCurrentIdx];
  const runnerOptions = extractQuestionOptions(runnerQ);

  const readinessTabs = [
    { id: 'ALL', label: 'All', badge: metrics.totalCount },
    { id: 'READY', label: 'Ready to apply', badge: metrics.readyCount },
    { id: 'NEEDS_DEV', label: 'Needs work', badge: metrics.devCount },
    { id: 'SAVED', label: 'Saved', icon: 'Bookmark' },
  ];

  // ---------------------------------------------------------------------------
  // Job card
  // ---------------------------------------------------------------------------
  const renderJob = (job, featured) => {
    const ready = isReady(job);
    const score = Math.round(job.match_score || 0);
    const verified = isJobVerified(job);
    const skills = job.skills || [];
    const body = (
      <>
        <Row gap={space.sm} align="flex-start">
          <Avatar name={companyOf(job)} uri={job.company_logo || undefined} size={48} />
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Txt variant={featured ? 'h2' : 'h3'} tone="ink" numberOfLines={2}>{job.title}</Txt>
            <Txt variant="small" tone="muted" numberOfLines={1}>
              {companyOf(job)} · {job.work_mode || job.work_preference || (job.is_remote ? 'Remote' : 'On-site')}{job.location ? ` · ${job.location}` : ''}
            </Txt>
          </Stack>
          <Ring value={score} size={56} stroke={6} tone={ready ? 'success' : 'warning'} track={featured ? 'rgba(255,255,255,0.6)' : undefined}>
            <Txt variant="small" weight={700} tone="ink">{score}%</Txt>
          </Ring>
        </Row>
        <Row wrap gap={6} style={{ marginTop: space.md }}>
          <Pill label={verified ? 'Verified recruiter' : 'External listing'} tone={verified ? 'success' : 'neutral'} icon={verified ? 'ShieldCheck' : 'Globe'} size="sm" />
          {job.stipend ? <Pill label={job.stipend} tone="warning" icon="Wallet" size="sm" /> : null}
          {job.application_deadline ? <Pill label={tl('Due {{v0}}', {
            v0: formatDate(job.application_deadline, { month: 'short', day: 'numeric' })
          })} icon="Calendar" size="sm" /> : null}
          {skills.slice(0, 4).map((s) => <Pill key={s} label={s} tone="info" size="sm" />)}
          {skills.length > 4 ? <Pill label={`+${skills.length - 4}`} size="sm" /> : null}
        </Row>
        <Row justify="space-between" style={{ marginTop: space.lg }} wrap gap={8}>
          <Pill label={ready ? 'Ready to apply' : tl('Need {{v0}}% to apply', {
            v0: thresholdOf(job)
          })} tone={ready ? 'success' : 'neutral'} icon={ready ? 'CircleCheck' : 'Clock'} />
          <Row gap={8}>
            <IconButton icon="Bookmark" variant={job.is_saved ? 'dark' : 'soft'} onPress={() => handleToggleSave(job)} disabled={savingId === job.id} accessibilityLabel={job.is_saved ? 'Unsave' : 'Save'} />
            <IconButton icon="Ellipsis" onPress={() => handleViewDetails(job)} accessibilityLabel="Details" />
            {ready ? (
              <Button label="Apply" size="sm" iconRight="ArrowUpRight" onPress={() => handleApply(job)} loading={applyingId === job.id} />
            ) : (
              <Button label="Improve match" size="sm" variant="secondary" icon="Route" onPress={() => openPlanModal(job)} />
            )}
          </Row>
        </Row>
      </>
    );
    return featured ? (
      <FeatureCard key={job.id} tilt={isDesktop}>{body}</FeatureCard>
    ) : (
      <Card key={job.id} style={styles.jobCard}>{body}</Card>
    );
  };

  // ---------------------------------------------------------------------------
  // Aside: application pipeline
  // ---------------------------------------------------------------------------
  const pipeline = (
    <>
      <SectionTitle title="Pipeline" emoji="📮" />
      <StatTrio
        items={[
          { value: applications.length, label: 'Applied', tone: 'info' },
          { value: applications.filter((a) => /SHORTLIST|INTERVIEW|ROUND/i.test(a.application_status || a.statusClass || '')).length, label: 'Rounds', tone: 'success' },
          { value: internships.filter((j) => j.is_saved).length, label: 'Saved', dashed: true },
        ]}
      />
      {applications.slice(0, 5).map((a, i) => (
        <EventCard
          key={a.id || i}
          tone={/SHORTLIST|INTERVIEW|ROUND/i.test(a.application_status || '') ? 'success' : /REJECT/i.test(a.application_status || '') ? 'danger' : 'info'}
          icon="Briefcase"
          type={a.status || 'Applied'}
          date={a.dateApplied ? a.dateApplied.replace(/, \d{4}$/, '') : ''}
          title={`${a.role || 'Internship'} · ${a.company || ''}`}
          body={a.nextAction}
          onPress={() => onNavigate && onNavigate('Applications')}
        />
      ))}
      {applications.length ? (
        <Button label="All applications" variant="secondary" iconRight="ArrowRight" onPress={() => onNavigate && onNavigate('Applications')} block />
      ) : (
        <View style={styles.emptyEvents}>
          <EmptyState icon="Send" title="No applications yet" message="Apply to a ready role and it will be tracked here." />
        </View>
      )}
    </>
  );

  const featured = !searchQuery.trim() && readinessTab === 'ALL' && !selectedTechStack && !verifiedFilter ? filteredJobs[0] : null;
  const rest = featured ? filteredJobs.slice(1) : filteredJobs;

  return (
    (<Page aside={pipeline}>
      <SectionTitle
        title="Internships"
        emoji="💼"
        subtitle={loading ? 'Finding roles that match your evidence…' : tl('{{totalCount}} opportunities · {{readyCount}} ready for you', {
          totalCount: metrics.totalCount,
          readyCount: metrics.readyCount
        })}
        right={
          <Row gap={8}>
            <SearchField value={searchQuery} onChangeText={setSearchQuery} onSubmit={handleSearchSubmit} placeholder="Role, company or skill" style={{ width: isTablet ? 260 : '100%' }} />
            <IconButton icon="RefreshCw" size={46} onPress={() => loadData(true)} disabled={refreshing} accessibilityLabel="Refresh" />
          </Row>
        }
      />
      <SegmentedTabs options={readinessTabs} value={readinessTab} onChange={setReadinessTab} scrollable={!isTablet} />
      <Row wrap gap={8}>
        <Chip label="Remote" icon="House" tone="info" selected={typeFilter === 'Remote'} onPress={() => setTypeFilter(typeFilter === 'Remote' ? '' : 'Remote')} />
        <Chip label="Verified only" icon="ShieldCheck" selected={verifiedFilter === 'VERIFIED'} onPress={() => setVerifiedFilter(verifiedFilter === 'VERIFIED' ? '' : 'VERIFIED')} />
        {['Best Match', 'Newest', 'Stipend (High to Low)'].map((s) => (
          <Chip key={s} label={s} icon="Funnel" tone="accent" selected={sortOption === s} onPress={() => setSortOption(s)} />
        ))}
        {locationFilter || typeFilter || searchQuery || verifiedFilter || selectedTechStack || readinessTab !== 'ALL' ? (
          <Button label="Clear" size="sm" variant="ghost" icon="X" onPress={handleClearFilters} />
        ) : null}
      </Row>
      {availableTechStacks.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {availableTechStacks.slice(0, 24).map((t) => (
            <Chip key={t} label={t} tone="success" selected={selectedTechStack === t} onPress={() => setSelectedTechStack(selectedTechStack === t ? '' : t)} />
          ))}
        </ScrollView>
      ) : null}
      {loading ? (
        <View style={styles.jobGrid}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={210} radius={radii.xl} style={styles.jobCard} />)}
        </View>
      ) : error ? (
        <Card>
          <EmptyState icon="CircleAlert" tone="danger" title="Couldn't load opportunities" message={error} action={<Button label="Retry" icon="RefreshCw" onPress={() => loadData(true)} />} />
        </Card>
      ) : filteredJobs.length ? (
        <>
          {featured ? renderJob(featured, true) : null}
          <View style={styles.jobGrid}>{rest.map((j) => renderJob(j, false))}</View>
          {hasMore ? <Button label="Load more" variant="secondary" onPress={handleLoadMore} loading={loadingMore} style={{ alignSelf: 'center' }} /> : null}
        </>
      ) : (
        <Card>
          <EmptyState icon="Briefcase" title="No roles match these filters" message="Try clearing filters or searching for a different skill." action={<Button label="Clear filters" onPress={handleClearFilters} />} />
        </Card>
      )}
      {/* Details */}
      <Sheet
        visible={showDetailsModal && !!selectedDetailJob}
        onClose={() => setShowDetailsModal(false)}
        title={selectedDetailJob?.title}
        subtitle={selectedDetailJob ? `${companyOf(selectedDetailJob)}${selectedDetailJob.location ? ` · ${selectedDetailJob.location}` : ''}` : ''}
        icon="Briefcase"
        tone="info"
        width={760}
        footer={
          selectedDetailJob ? (
            <>
              <Button label={selectedDetailJob.is_saved ? 'Saved' : 'Save'} icon="Bookmark" variant="secondary" onPress={() => handleToggleSave(selectedDetailJob)} />
              {isReady(selectedDetailJob) ? (
                <Button label="Apply" iconRight="ArrowUpRight" onPress={() => { setShowDetailsModal(false); handleApply(selectedDetailJob); }} />
              ) : (
                <Button label="Improve match" icon="Route" onPress={() => { setShowDetailsModal(false); openPlanModal(selectedDetailJob); }} />
              )}
            </>
          ) : null
        }
      >
        {selectedDetailJob ? (
          <>
            <Row wrap gap={6}>
              <Pill label={tl('{{v0}}% match', {
                v0: Math.round(selectedDetailJob.match_score || 0)
              })} tone={isReady(selectedDetailJob) ? 'success' : 'warning'} icon="Target" />
              {selectedDetailJob.stipend ? <Pill label={selectedDetailJob.stipend} tone="warning" icon="Wallet" /> : null}
              <Pill label={isJobVerified(selectedDetailJob) ? 'Verified recruiter' : tl('Source: {{v0}}', {
                v0: selectedDetailJob.source || 'external'
              })} icon={isJobVerified(selectedDetailJob) ? 'ShieldCheck' : 'Globe'} />
            </Row>
            {(selectedDetailJob.missing_skills || []).length ? (
              <Inset tone="warning">
                <Txt variant="small" weight={700} color={colors.butterInk}>Missing skills</Txt>
                <Row wrap gap={6} style={{ marginTop: 6 }}>
                  {selectedDetailJob.missing_skills.map((s) => <Pill key={typeof s === 'string' ? s : s.skill_name} label={typeof s === 'string' ? s : s.skill_name} tone="peach" size="sm" />)}
                </Row>
              </Inset>
            ) : null}
            <Txt variant="body" tone="default" style={{ lineHeight: 22 }}>{stripHtml(selectedDetailJob.description) || 'No description provided.'}</Txt>
          </>
        ) : null}
      </Sheet>
      {/* Targeted development plan */}
      <Sheet
        visible={showPlanModal && !!selectedPlanJob}
        onClose={() => setShowPlanModal(false)}
        title="Your plan for this role"
        subtitle={selectedPlanJob ? `${selectedPlanJob.title} · ${companyOf(selectedPlanJob)}` : ''}
        icon="Route"
        tone="accent"
        width={760}
      >
        {selectedPlanJob ? (
          <>
            {planSuccessNotice ? (
              <Inset tone="success"><Txt variant="small" weight={600} color={colors.mintInk}>{planSuccessNotice}</Txt></Inset>
            ) : null}
            <Card padding={space.lg}>
              <Row justify="space-between">
                <Txt variant="title" tone="ink">Your match</Txt>
                <Txt variant="title" tone="ink">{Math.round(selectedPlanJob.match_score || 0)}% / {thresholdOf(selectedPlanJob)}%</Txt>
              </Row>
              <ProgressBar value={((selectedPlanJob.match_score || 0) / thresholdOf(selectedPlanJob)) * 100} tone="accent" style={{ marginTop: 8 }} />
              <Txt variant="caption" tone="muted" style={{ marginTop: 6 }}>Reach the threshold to unlock Apply. Every course, test and project below adds verified evidence.</Txt>
            </Card>
            {(selectedPlanJob.skill_gaps || []).length ? (
              <Stack gap={8}>
                <Txt variant="h3" tone="ink">Skill gaps</Txt>
                {selectedPlanJob.skill_gaps.map((sk) => (
                  <Inset key={sk.skill_name} tone={sk.is_verified ? 'success' : 'neutral'}>
                    <Row justify="space-between">
                      <Txt variant="small" weight={700} tone="ink">{sk.skill_name}</Txt>
                      <Pill label={sk.is_verified ? 'Verified' : `${Math.round(sk.current_score ?? sk.score ?? 0)}%`} tone={sk.is_verified ? 'success' : 'warning'} size="sm" />
                    </Row>
                    <Row wrap gap={6} style={{ marginTop: 6 }}>
                      <Pill label={tl('Course {{v0}}', {
                        v0: sk.course?.completed ? '✓' : `${Math.round(sk.progress_percent || sk.course_progress || 0)}%`
                      })} size="sm" />
                      <Pill label={tl('Test {{v0}}', {
                        v0: sk.test?.passed ? `✓ ${sk.test?.score}%` : '—'
                      })} size="sm" />
                      <Pill label={tl('Project {{v0}}', {
                        v0: sk.assignment?.verified ? '✓' : '—'
                      })} size="sm" />
                      <Pill label={`GitHub ${sk.github?.evidence ? '✓' : '—'}`} size="sm" />
                    </Row>
                  </Inset>
                ))}
              </Stack>
            ) : null}
            {(selectedPlanJob.recommended_courses || []).length ? (
              <Stack gap={8}>
                <Txt variant="h3" tone="ink">Courses</Txt>
                {selectedPlanJob.recommended_courses.map((c) => {
                  const cid = c.id || c.course_id || c.title;
                  const done = /COMPLETE/i.test(c.status || '');
                  return (
                    (<Card key={cid} padding={space.md}>
                      <Txt variant="small" weight={700} tone="ink">{c.title}</Txt>
                      <Txt variant="caption" tone="muted">{[c.provider, c.duration != null && c.duration !== '' ? (isNaN(Number(c.duration)) ? c.duration : tl('{{duration}} hrs', {
                        duration: c.duration
                      })) : null].filter(Boolean).join(' · ')}</Txt>
                      <Row gap={6} wrap style={{ marginTop: 8 }}>
                        {done ? <Pill label="Completed" tone="success" icon="Check" size="sm" /> : (
                          <>
                            <Button label={/PROGRESS/i.test(c.status || '') ? 'Continue' : 'Enroll'} size="sm" onPress={() => handleEnrollCourse(c)} loading={enrollingCourseId === cid} />
                            <Button label="Mark complete" size="sm" variant="secondary" onPress={() => handleCompleteCourse(c)} />
                          </>
                        )}
                        <Button label="Upload certificate" size="sm" variant="ghost" icon="Upload" onPress={() => { setCertFile(null); setCertIssuer(c.provider || ''); handleStartUploadCertificate(c); }} />
                      </Row>
                    </Card>)
                  );
                })}
              </Stack>
            ) : null}
            {(selectedPlanJob.recommended_tests || []).length ? (
              <Stack gap={8}>
                <Txt variant="h3" tone="ink">Assessments</Txt>
                {selectedPlanJob.recommended_tests.map((t, i) => (
                  <Card key={t.id || i} padding={space.md}>
                    <Row justify="space-between" gap={8}>
                      <Stack gap={1} style={{ flex: 1 }}>
                        <Txt variant="small" weight={700} tone="ink">{t.title || tl('{{skill}} assessment', {
                          skill: t.skill
                        })}</Txt>
                        <Txt variant="caption" tone="muted">{[t.question_count && tl('{{question_count}} questions', {
                          question_count: t.question_count
                        }), t.duration].filter(Boolean).join(' · ')}</Txt>
                      </Stack>
                      <Button label="Start" size="sm" icon="Target" onPress={() => handleStartAssessment(t)} />
                    </Row>
                  </Card>
                ))}
              </Stack>
            ) : null}
            {(selectedPlanJob.recommended_projects || []).length ? (
              <Stack gap={8}>
                <Txt variant="h3" tone="ink">Projects</Txt>
                {selectedPlanJob.recommended_projects.map((p, i) => (
                  <Card key={p.id || i} padding={space.md}>
                    <Row justify="space-between" gap={8}>
                      <Stack gap={1} style={{ flex: 1 }}>
                        <Txt variant="small" weight={700} tone="ink">{p.title}</Txt>
                        {p.xp ? <Txt variant="caption" tone="muted">+{p.xp} XP</Txt> : null}
                      </Stack>
                      <Button label="Start" size="sm" icon="Rocket" onPress={() => handleStartProject(p)} />
                    </Row>
                  </Card>
                ))}
              </Stack>
            ) : null}
          </>
        ) : null}
      </Sheet>
      {/* Applied confirmation */}
      <Sheet
        visible={showAppliedModal && !!appliedJob}
        onClose={() => setShowAppliedModal(false)}
        title="Application started"
        subtitle={appliedJob ? `${appliedJob.title} · ${companyOf(appliedJob)}` : ''}
        icon="Send"
        tone="success"
        width={520}
        footer={
          <>
            <Button label="Keep browsing" variant="secondary" onPress={() => setShowAppliedModal(false)} />
            <Button label="View applications" onPress={() => { setShowAppliedModal(false); onNavigate && onNavigate('Applications'); }} />
          </>
        }
      >
        <Txt variant="body" tone="muted">
          {appliedJob && isJobVerified(appliedJob)
            ? 'Your verified profile was sent to the recruiter. Track progress in Applications.'
            : 'We opened the employer’s application page in a new tab. Finish there — we track it in Applications.'}
        </Txt>
      </Sheet>
      {/* Assessment runner */}
      <Sheet
        visible={showAssessmentModal}
        onClose={closeAssessmentModal}
        title={activeAssessment?.title || 'Assessment'}
        subtitle={runnerQuestions.length ? tl('{{length}} questions', {
          length: runnerQuestions.length
        }) : ''}
        icon="Target"
        tone="info"
        footer={
          assessmentResult ? (
            <Button label="Back to plan" onPress={closeAssessmentModal} />
          ) : runnerQuestions.length && !assessmentError ? (
            <>
              <Button label="Previous" variant="secondary" icon="ArrowLeft" onPress={() => setAssessmentCurrentIdx((i) => Math.max(0, i - 1))} disabled={assessmentCurrentIdx === 0} />
              {assessmentCurrentIdx >= runnerQuestions.length - 1 ? (
                <Button label="Submit" icon="Send" onPress={handleSubmitAssessment} loading={assessmentSubmitting} />
              ) : (
                <Button label="Next" iconRight="ArrowRight" onPress={() => setAssessmentCurrentIdx((i) => Math.min(runnerQuestions.length - 1, i + 1))} />
              )}
            </>
          ) : null
        }
      >
        {assessmentLoading ? (
          <Stack gap={10}><Skeleton height={22} width="60%" /><Skeleton height={56} /><Skeleton height={56} /></Stack>
        ) : assessmentResult ? (
          <Stack gap={space.md} style={{ alignItems: 'center' }}>
            <Ring value={assessmentResult.score ?? 0} size={124} stroke={12} tone={assessmentResult.passed ? 'success' : 'warning'}>
              <Txt variant="display" tone="ink">{assessmentResult.score != null ? `${Math.round(assessmentResult.score)}%` : '—'}</Txt>
            </Ring>
            <Pill label={assessmentResult.passed ? 'Passed' : 'Not passed yet'} tone={assessmentResult.passed ? 'success' : 'warning'} />
            {assessmentResult.correct_count != null ? <Txt variant="body" tone="muted">{assessmentResult.correct_count} correct answers</Txt> : null}
            {assessmentResult.updated_evidence != null ? <Txt variant="small" tone="muted">Evidence {assessmentResult.previous_evidence ?? 0}% → {assessmentResult.updated_evidence}%</Txt> : null}
          </Stack>
        ) : assessmentError ? (
          <EmptyState icon="CircleAlert" tone="warning" title="Assessment unavailable" message={assessmentError} />
        ) : runnerQ ? (
          <Stack gap={space.md}>
            <Txt variant="overline" tone="subtle">Question {assessmentCurrentIdx + 1} of {runnerQuestions.length}</Txt>
            <ProgressBar value={((assessmentCurrentIdx + 1) / runnerQuestions.length) * 100} tone="info" />
            <Txt variant="h3" tone="ink">{runnerQ.question_text || runnerQ.question}</Txt>
            <Stack gap={8}>
              {runnerOptions.map((opt) => {
                const selected = assessmentAnswers[runnerQ.id] === opt.key;
                return (
                  <Pressable key={opt.key} onPress={() => handleSelectOption(runnerQ.id, opt.key)} style={({ hovered }) => [styles.option, webOnly({ cursor: 'pointer' }), selected ? { backgroundColor: colors.sky, borderColor: colors.skyStrong } : hovered ? { backgroundColor: colors.surfaceMuted } : null]}>
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
      {/* Project runner */}
      <Sheet
        visible={showProjectModal}
        onClose={closeProjectModal}
        title={activeProject?.title || 'Project'}
        subtitle="Submit a GitHub repository as evidence"
        icon="Rocket"
        tone="warning"
        footer={
          projectResult ? <Button label="Back to plan" onPress={closeProjectModal} /> : <Button label="Submit project" icon="Send" onPress={handleSubmitProject} loading={projectSubmitting} />
        }
      >
        {projectResult ? (
          <EmptyState icon="CircleCheck" tone="success" title="Project verified" message={projectResult.message || 'Your repository was recorded as evidence.'} />
        ) : (
          <>
            {loadingRepos ? (
              <Skeleton height={60} />
            ) : availableRepos.length ? (
              <Stack gap={8}>
                {availableRepos.map((r) => {
                  const key = r.id || r.name;
                  const sel = selectedRepoId === key;
                  return (
                    <Pressable key={key} onPress={() => { setSelectedRepoId(key); setProjectRepoUrl(r.html_url || r.url || ''); }} style={({ hovered }) => [styles.repoRow, webOnly({ cursor: 'pointer' }), sel ? { backgroundColor: colors.butter } : hovered ? { backgroundColor: colors.surfaceMuted } : null]}>
                      <Icon name={sel ? 'CircleCheck' : 'Circle'} size={18} color={sel ? colors.butterInk : colors.textSubtle} />
                      <Txt variant="small" weight={700} tone="ink" style={{ flex: 1 }}>{r.name}</Txt>
                      {r.language ? <Pill label={r.language} size="sm" /> : null}
                    </Pressable>
                  );
                })}
              </Stack>
            ) : (
              <Field label="Repository URL" icon="GitBranch" placeholder="https://github.com/you/project" autoCapitalize="none" value={projectRepoUrl} onChangeText={setProjectRepoUrl} />
            )}
            <Field label="Notes (optional)" multiline placeholder="What did you build? Anything reviewers should know?" value={projectNotes} onChangeText={setProjectNotes} />
            {projectError ? <Txt variant="small" tone="danger">{projectError}</Txt> : null}
          </>
        )}
      </Sheet>
      {/* Certificate upload */}
      <Sheet
        visible={showUploadModal && !!activeUploadCourse}
        onClose={handleCloseUploadModal}
        title="Upload certificate"
        subtitle={activeUploadCourse?.title}
        icon="Award"
        tone="success"
        width={560}
        footer={
          uploadResult ? (
            <Button label="Done" onPress={handleCloseUploadModal} />
          ) : (
            <>
              <Button label="Cancel" variant="secondary" onPress={handleCloseUploadModal} />
              <Button
                label="Verify certificate"
                icon="ShieldCheck"
                disabled={!certFile}
                loading={uploadingCertificate}
                onPress={() => handleSubmitCertificate({ name: certFile.name, base64: certFile.base64, issuer: certIssuer || activeUploadCourse?.provider || '' })}
              />
            </>
          )
        }
      >
        {uploadResult ? (
          <EmptyState icon="CircleCheck" tone="success" title="Certificate recorded" message={uploadResult.message || 'Your certificate was added as skill evidence.'} />
        ) : (
          <>
            <Pressable onPress={pickCertificate} style={[styles.dropzone, webOnly({ cursor: 'pointer' })]}>
              <Icon name={certFile ? 'FileText' : 'Upload'} size={26} color={colors.mintInk} />
              <Txt variant="bodyStrong" tone="ink">{certFile ? certFile.name : 'Choose a PDF or image'}</Txt>
              <Txt variant="caption" tone="muted">{certFile ? 'Tap to choose a different file' : 'Completion certificate or statement of accomplishment'}</Txt>
            </Pressable>
            <Field label="Issuer" icon="Building" placeholder="e.g. NPTEL, Coursera, freeCodeCamp" value={certIssuer} onChangeText={setCertIssuer} />
            {uploadError ? <Txt variant="small" tone="danger">{uploadError}</Txt> : null}
          </>
        )}
      </Sheet>
    </Page>)
  );
}

const styles = StyleSheet.create({
  jobGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  jobCard: {
    flexGrow: 1,
    flexBasis: 380,
  },
  emptyEvents: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
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
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  dropzone: {
    alignItems: 'center',
    gap: 6,
    padding: space.xl,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.mintStrong,
    backgroundColor: colors.mint,
  },
});
