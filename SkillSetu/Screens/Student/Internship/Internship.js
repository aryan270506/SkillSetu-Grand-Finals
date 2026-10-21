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
  OpportunityHoverPreview,
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
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
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

  const handleViewDetails = async (job) => {
    setSelectedDetailJob(job);
    setDescExpanded(false);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    const targetJobId = job.id;
    try {
      const fullDetail = await fetchInternshipDetail(job.id, studentEmail);
      if (fullDetail) {
        setSelectedDetailJob((prev) => (prev && prev.id === targetJobId ? { ...prev, ...fullDetail } : prev));
      }
    } catch (err) {
      console.warn('[Internship] Failed to fetch full detail:', err);
    } finally {
      setDetailsLoading(false);
    }
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

  const sanitizeJobHtml = (html) => {
    if (!html) return '';
    let str = String(html);
    str = str.replace(/<(script|style|iframe|form)[^>]*>[\s\S]*?<\/\1>/gi, '');
    str = str.replace(/<\s*br\s*\/?>/gi, '\n');
    str = str.replace(/<\/(p|div|section|article|h[1-6]|tr|blockquote)>/gi, '\n\n');
    str = str.replace(/<\/li>/gi, '\n');
    str = str.replace(/<(li|dt)>/gi, '\n• ');
    str = str.replace(/<[a-zA-Z\/][^>]*$/g, '');
    str = str.replace(/<[^>]+>/g, ' ');
    const entities = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&rsquo;': "'",
      '&lsquo;': "'",
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&bull;': '•',
      '&middot;': '·',
      '&mdash;': '—',
      '&ndash;': '–',
    };
    str = str.replace(/&[a-zA-Z0-9#]+;/g, (m) => entities[m] || m);
    str = str
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n');
    return str.replace(/\n{3,}/g, '\n\n').trim();
  };
  const stripHtml = sanitizeJobHtml;
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
          {skills.slice(0, 4).map((s, idx) => {
            const sName = typeof s === 'string' ? s : (s?.skill_name || s?.name || 'Skill');
            const sKey = typeof s === 'string' ? s : (s?.skill_id || s?.id || s?.skill_name || idx);
            return <Pill key={sKey} label={sName} tone="info" size="sm" />;
          })}
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
    const cardContent = featured ? (
      <FeatureCard tilt={isDesktop}>{body}</FeatureCard>
    ) : (
      <Card style={{ flex: 1 }}>{body}</Card>
    );

    return (
      <OpportunityHoverPreview
        key={job.id}
        type="internship"
        item={job}
        studentEmail={studentEmail}
        isReady={ready}
        onOpenDetails={() => handleViewDetails(job)}
        onSave={() => handleToggleSave(job)}
        onApply={() => (ready ? handleApply(job) : openPlanModal(job))}
        saving={savingId === job.id}
        applying={applyingId === job.id}
        style={featured ? { width: '100%' } : styles.jobCard}
      >
        {cardContent}
      </OpportunityHoverPreview>
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
      {/* Enhanced Internship Details Modal */}
      <Sheet
        visible={showDetailsModal && !!selectedDetailJob}
        onClose={() => setShowDetailsModal(false)}
        title={selectedDetailJob?.title}
        subtitle={selectedDetailJob ? `${companyOf(selectedDetailJob)}${selectedDetailJob.location ? ` · ${selectedDetailJob.location}` : ''}` : ''}
        icon="Briefcase"
        tone="info"
        width={800}
        footer={
          selectedDetailJob ? (
            <Row justify="space-between" align="center" style={{ width: '100%' }} wrap gap={8}>
              <Row gap={8} align="center">
                <Button
                  label={selectedDetailJob.is_saved ? 'Saved' : 'Save'}
                  icon="Bookmark"
                  variant={selectedDetailJob.is_saved ? 'secondary' : 'soft'}
                  onPress={() => handleToggleSave(selectedDetailJob)}
                  disabled={savingId === selectedDetailJob.id}
                />
                {selectedDetailJob.source_url || selectedDetailJob.application_url || selectedDetailJob.apply_url ? (
                  <IconButton
                    icon="ExternalLink"
                    variant="soft"
                    accessibilityLabel="Open original listing"
                    onPress={() => {
                      const ext = selectedDetailJob.application_url || selectedDetailJob.apply_url || selectedDetailJob.source_url;
                      if (ext && (ext.startsWith('http://') || ext.startsWith('https://'))) {
                        Linking.openURL(ext).catch(() => {});
                      }
                    }}
                  />
                ) : null}
              </Row>
              <Row gap={8} align="center">
                {isReady(selectedDetailJob) ? (
                  <Button
                    label="Apply Now"
                    iconRight="ArrowUpRight"
                    onPress={() => {
                      setShowDetailsModal(false);
                      handleApply(selectedDetailJob);
                    }}
                    loading={applyingId === selectedDetailJob.id}
                  />
                ) : (
                  <Button
                    label={tl('Improve match (Need {{v0}}%)', { v0: thresholdOf(selectedDetailJob) })}
                    icon="Route"
                    variant="accent"
                    onPress={() => {
                      setShowDetailsModal(false);
                      openPlanModal(selectedDetailJob);
                    }}
                  />
                )}
              </Row>
            </Row>
          ) : null
        }
      >
        {selectedDetailJob ? (() => {
          const job = selectedDetailJob;
          const score = Math.round(job.match_score || 0);
          const threshold = thresholdOf(job);
          const ready = isReady(job);
          const hardFailed = job.hard_eligible === false || job.eligibility_status === 'NOT_ELIGIBLE';
          const verified = isJobVerified(job);

          // Deadline calculation
          const deadlineRaw = job.application_deadline || job.deadline;
          let deadlineText = 'Not specified';
          let deadlineSubtext = null;
          let deadlineTone = 'neutral';
          if (deadlineRaw) {
            const dlDate = new Date(deadlineRaw);
            if (!isNaN(dlDate.getTime())) {
              deadlineText = formatDate(dlDate, { month: 'short', day: 'numeric', year: 'numeric' });
              const diffMs = dlDate.getTime() - Date.now();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              if (diffDays < 0) {
                deadlineSubtext = 'Application closed';
                deadlineTone = 'danger';
              } else if (diffDays === 0) {
                deadlineSubtext = 'Due today';
                deadlineTone = 'warning';
              } else if (diffDays <= 7) {
                deadlineSubtext = `${diffDays} days left`;
                deadlineTone = 'warning';
              } else {
                deadlineSubtext = `${diffDays} days left`;
                deadlineTone = 'info';
              }
            }
          }

          // Posted date
          const postedRaw = job.posted_at || job.created_at;
          const postedText = postedRaw ? formatDate(postedRaw, { month: 'short', day: 'numeric' }) : 'Not specified';

          // Cleaned description
          const fullDesc = sanitizeJobHtml(job.description);
          const isDescLong = fullDesc.length > 420;
          const displayedDesc = (!descExpanded && isDescLong) ? fullDesc.slice(0, 380) + '…' : fullDesc;

          // Company overview deduplication
          let compOverview = job.company_overview || '';
          if (compOverview && fullDesc.includes(compOverview.slice(0, 50))) {
            compOverview = '';
          }

          // Responsibilities text
          const responsibilitiesText = job.responsibilities && job.responsibilities !== job.description ? sanitizeJobHtml(job.responsibilities) : '';

          // Skills lists
          const matchedSkills = job.matched_skills || [];
          const missingSkills = job.missing_skills || [];
          const allSkills = job.skills || [];

          return (
            <Stack gap={space.lg}>
              {/* SECTION A: Header Badges & Company Meta */}
              <Row wrap gap={8} align="center">
                <Avatar name={companyOf(job)} uri={job.company_logo || undefined} size={44} />
                <Stack gap={2} style={{ flex: 1, minWidth: 200 }}>
                  <Txt variant="h2" tone="ink" numberOfLines={2}>{job.title}</Txt>
                  <Txt variant="small" tone="muted">
                    {companyOf(job)} · {job.work_mode || job.work_preference || (job.is_remote ? 'Remote' : 'On-site')}
                    {job.location ? ` · ${job.location}` : ''}
                  </Txt>
                </Stack>
                <Row wrap gap={6} align="center">
                  <Pill
                    label={ready ? tl('{{v0}}% Match · Ready', { v0: score }) : hardFailed ? tl('{{v0}}% Match · Ineligible', { v0: score }) : tl('{{v0}}% Match', { v0: score })}
                    tone={ready ? 'success' : hardFailed ? 'danger' : 'warning'}
                    icon="Target"
                  />
                  <Pill
                    label={verified ? 'Verified Recruiter' : tl('Source: {{v0}}', { v0: job.source || 'external' })}
                    icon={verified ? 'ShieldCheck' : 'Globe'}
                    tone={verified ? 'success' : 'neutral'}
                  />
                </Row>
              </Row>

              {/* SECTION B: Key Information Grid */}
              <View>
                <Txt variant="small" weight={700} tone="muted" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Key Opportunity Details
                </Txt>
                <Row wrap gap={8}>
                  {/* 1. Stipend / Compensation */}
                  <View style={styles.gridCell}>
                    <Row gap={6} align="center">
                      <Icon name="Wallet" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Stipend / Salary</Txt>
                    </Row>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ marginTop: 4 }}>
                      {job.stipend || 'Not specified'}
                    </Txt>
                  </View>

                  {/* 2. Duration */}
                  <View style={styles.gridCell}>
                    <Row gap={6} align="center">
                      <Icon name="Clock" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Duration</Txt>
                    </Row>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ marginTop: 4 }}>
                      {job.duration || 'Not specified'}
                    </Txt>
                  </View>

                  {/* 3. Deadline & Remaining */}
                  <View style={styles.gridCell}>
                    <Row gap={6} align="center">
                      <Icon name="Calendar" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Application Deadline</Txt>
                    </Row>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ marginTop: 4 }}>
                      {deadlineText}
                    </Txt>
                    {deadlineSubtext ? (
                      <Txt variant="caption" color={deadlineTone === 'danger' ? colors.berryInk : deadlineTone === 'warning' ? colors.butterInk : colors.mintInk} weight={600} style={{ marginTop: 2 }}>
                        {deadlineSubtext}
                      </Txt>
                    ) : null}
                  </View>

                  {/* 4. Work Mode */}
                  <View style={styles.gridCell}>
                    <Row gap={6} align="center">
                      <Icon name="House" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Work Mode</Txt>
                    </Row>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ marginTop: 4 }}>
                      {job.work_mode || job.work_preference || (job.is_remote ? 'Remote' : 'On-site')}
                    </Txt>
                  </View>

                  {/* 5. Location & Regions */}
                  <View style={styles.gridCell}>
                    <Row gap={6} align="center">
                      <Icon name="MapPin" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Location & Eligibility</Txt>
                    </Row>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ marginTop: 4 }}>
                      {job.location || job.eligible_regions || 'Not specified'}
                    </Txt>
                  </View>

                  {/* 6. Internship Type */}
                  <View style={styles.gridCell}>
                    <Row gap={6} align="center">
                      <Icon name="Briefcase" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Role Type</Txt>
                    </Row>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ marginTop: 4 }}>
                      {job.job_type || job.opportunity_type || 'Internship'}
                    </Txt>
                  </View>

                  {/* 7. Experience */}
                  <View style={styles.gridCell}>
                    <Row gap={6} align="center">
                      <Icon name="GraduationCap" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Required Experience</Txt>
                    </Row>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ marginTop: 4 }}>
                      {job.experience_required || (verified ? 'Fresher / Student' : 'Not specified')}
                    </Txt>
                  </View>

                  {/* 8. Openings */}
                  <View style={styles.gridCell}>
                    <Row gap={6} align="center">
                      <Icon name="Users" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Openings</Txt>
                    </Row>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ marginTop: 4 }}>
                      {job.openings ? `${job.openings} opening${job.openings > 1 ? 's' : ''}` : 'Not specified'}
                    </Txt>
                  </View>

                  {/* 9. Posted Date */}
                  <View style={styles.gridCell}>
                    <Row gap={6} align="center">
                      <Icon name="Clock" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Posted Date</Txt>
                    </Row>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ marginTop: 4 }}>
                      {postedText}
                    </Txt>
                  </View>
                </Row>
              </View>

              {/* SECTION C: About the Company */}
              <Card padding={space.lg} radius={radii.lg} style={styles.sectionCard}>
                <Row justify="space-between" align="center" wrap gap={8}>
                  <Row gap={8} align="center">
                    <Icon name="Building" size={18} color={colors.ink} />
                    <Txt variant="h3" tone="ink">About {companyOf(job)}</Txt>
                  </Row>
                  {job.company_website ? (
                    <Button
                      label="Website"
                      iconRight="ExternalLink"
                      size="sm"
                      variant="ghost"
                      onPress={() => {
                        const url = job.company_website;
                        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                          Linking.openURL(url).catch(() => {});
                        }
                      }}
                    />
                  ) : null}
                </Row>
                <Stack gap={6} style={{ marginTop: 8 }}>
                  <Txt variant="body" tone="default" style={{ lineHeight: 22 }}>
                    {compOverview || `${companyOf(job)} is actively offering verified career opportunities for emerging student talent through SkillSetu.`}
                  </Txt>
                  {job.industry ? (
                    <Row gap={6} align="center" style={{ marginTop: 4 }}>
                      <Txt variant="caption" tone="muted">Industry:</Txt>
                      <Pill label={job.industry} tone="neutral" size="sm" />
                    </Row>
                  ) : null}
                </Stack>
              </Card>

              {/* SECTION D: About the Role */}
              <Card padding={space.lg} radius={radii.lg} style={styles.sectionCard}>
                <Row gap={8} align="center" style={{ marginBottom: 8 }}>
                  <Icon name="FileText" size={18} color={colors.ink} />
                  <Txt variant="h3" tone="ink">About the Role</Txt>
                </Row>
                <Txt variant="body" tone="default" style={{ lineHeight: 22 }}>
                  {displayedDesc || 'No detailed role description provided by employer.'}
                </Txt>
                {isDescLong ? (
                  <Button
                    label={descExpanded ? 'Show less' : 'Show more'}
                    size="sm"
                    variant="ghost"
                    icon={descExpanded ? 'ChevronUp' : 'ChevronDown'}
                    style={{ alignSelf: 'flex-start', marginTop: 6 }}
                    onPress={() => setDescExpanded(!descExpanded)}
                  />
                ) : null}
              </Card>

              {/* SECTION E: Responsibilities & Learning Outcomes */}
              {responsibilitiesText ? (
                <Card padding={space.lg} radius={radii.lg} style={styles.sectionCard}>
                  <Row gap={8} align="center" style={{ marginBottom: 8 }}>
                    <Icon name="Sparkles" size={18} color={colors.ink} />
                    <Txt variant="h3" tone="ink">Responsibilities & Outcomes</Txt>
                  </Row>
                  <Txt variant="body" tone="default" style={{ lineHeight: 22 }}>
                    {responsibilitiesText}
                  </Txt>
                </Card>
              ) : null}

              {/* SECTION F: Requirements & Qualifications */}
              <Card padding={space.lg} radius={radii.lg} style={styles.sectionCard}>
                <Row gap={8} align="center" style={{ marginBottom: 8 }}>
                  <Icon name="ShieldCheck" size={18} color={colors.ink} />
                  <Txt variant="h3" tone="ink">Requirements & Eligibility</Txt>
                </Row>
                <Stack gap={10}>
                  {/* Mandatory qualifications */}
                  <View>
                    <Txt variant="small" weight={700} tone="ink">Mandatory Qualifications</Txt>
                    <Stack gap={4} style={{ marginTop: 4 }}>
                      {(job.mandatory_qualifications || [
                        job.minimum_cgpa > 0 ? `Minimum CGPA requirement: ${job.minimum_cgpa.toFixed(1)}` : null,
                        `Eligible Degree: ${job.degree || 'Degree in Computer Science, IT, or related field'}`,
                        `Location & Authorization: ${job.eligible_regions || job.location || 'Eligible for remote/on-site work'}`
                      ]).filter(Boolean).map((q, idx) => (
                        <Row key={idx} gap={6} align="flex-start">
                          <Txt variant="small" tone="accent">•</Txt>
                          <Txt variant="small" tone="default" style={{ flex: 1 }}>{q}</Txt>
                        </Row>
                      ))}
                    </Stack>
                  </View>

                  {/* Technical Skills required */}
                  <View style={{ marginTop: 4 }}>
                    <Txt variant="small" weight={700} tone="ink">Required Technical Skills</Txt>
                    <Row wrap gap={6} style={{ marginTop: 6 }}>
                      {allSkills.length ? allSkills.map((s, idx) => {
                        const sName = typeof s === 'string' ? s : (s?.skill_name || s?.name || 'Skill');
                        const sKey = typeof s === 'string' ? s : (s?.skill_id || s?.id || s?.skill_name || idx);
                        const isMatched = matchedSkills.some((m) => (typeof m === 'string' ? m.toLowerCase() === sName.toLowerCase() : (m?.skill_name || '').toLowerCase() === sName.toLowerCase()));
                        return (
                          <Pill
                            key={sKey}
                            label={isMatched ? `✓ ${sName}` : sName}
                            tone={isMatched ? 'success' : 'neutral'}
                            size="sm"
                          />
                        );
                      }) : <Txt variant="caption" tone="muted">Foundational software engineering skills</Txt>}
                    </Row>
                  </View>
                </Stack>
              </Card>

              {/* SECTION G: Dedicated SkillSetu AI Match Analysis Section */}
              <Card padding={space.lg} radius={radii.lg} tone={ready ? 'success' : hardFailed ? 'danger' : 'accent'} style={styles.matchAnalysisCard}>
                <Row justify="space-between" align="center" wrap gap={8}>
                  <Row gap={8} align="center">
                    <Icon name="Brain" size={20} color={colors.ink} />
                    <Txt variant="h3" tone="ink">SkillSetu AI Match Analysis</Txt>
                  </Row>
                  <Pill
                    label={ready ? 'Eligible to Apply' : hardFailed ? 'Eligibility Blocker' : 'Needs Development'}
                    tone={ready ? 'success' : hardFailed ? 'danger' : 'warning'}
                    icon={ready ? 'CircleCheck' : hardFailed ? 'CircleAlert' : 'Clock'}
                  />
                </Row>

                {/* Score vs Threshold */}
                <View style={{ marginTop: space.md }}>
                  <Row justify="space-between" align="center">
                    <Txt variant="bodyStrong" tone="ink">
                      Profile Match: <Txt variant="bodyStrong" weight={700}>{score}%</Txt>
                    </Txt>
                    <Txt variant="small" tone="muted">
                      Application Threshold: <Txt variant="small" weight={700} tone="ink">{threshold}%</Txt>
                    </Txt>
                  </Row>
                  <ProgressBar
                    value={Math.min(100, (score / threshold) * 100)}
                    tone={ready ? 'success' : hardFailed ? 'danger' : 'accent'}
                    style={{ marginTop: 8 }}
                  />
                  <Txt variant="caption" tone={hardFailed ? 'danger' : ready ? 'success' : 'muted'} style={{ marginTop: 6 }}>
                    {ready
                      ? '✓ You meet the 80% application threshold and all mandatory criteria for this role.'
                      : hardFailed
                      ? (job.hard_failures?.join('. ') || 'A mandatory eligibility prerequisite is not currently satisfied.')
                      : `You need ${Math.max(1, threshold - score)}% more match to reach the 80% application gate. Complete the recommended actions below to unlock direct application.`}
                  </Txt>
                </View>

                {/* Matched vs Missing Skills breakdown */}
                <View style={{ marginTop: space.md }}>
                  <Row wrap gap={8}>
                    {matchedSkills.length ? (
                      <View style={{ flex: 1, minWidth: 200 }}>
                        <Txt variant="caption" weight={700} tone="muted">MATCHED SKILLS</Txt>
                        <Row wrap gap={6} style={{ marginTop: 6 }}>
                          {matchedSkills.map((s, idx) => {
                            const sName = typeof s === 'string' ? s : (s?.skill_name || s?.name || 'Skill');
                            const sKey = typeof s === 'string' ? s : (s?.skill_id || s?.id || s?.skill_name || idx);
                            return (
                              <Pill key={sKey} label={`✓ ${sName}`} tone="success" size="sm" />
                            );
                          })}
                        </Row>
                      </View>
                    ) : null}

                    {missingSkills.length ? (
                      <View style={{ flex: 1, minWidth: 200 }}>
                        <Txt variant="caption" weight={700} tone="muted">MISSING MANDATORY SKILLS</Txt>
                        <Row wrap gap={6} style={{ marginTop: 6 }}>
                          {missingSkills.map((s, idx) => {
                            const sName = typeof s === 'string' ? s : (s?.skill_name || s?.name || 'Skill');
                            const sKey = typeof s === 'string' ? s : (s?.skill_id || s?.id || s?.skill_name || idx);
                            return (
                              <Pill key={sKey} label={sName} tone="peach" size="sm" />
                            );
                          })}
                        </Row>
                      </View>
                    ) : null}
                  </Row>
                </View>

                {/* Why this matches explanation */}
                {job.why_this_matches ? (
                  <Inset tone="neutral" style={{ marginTop: space.md }}>
                    <Txt variant="caption" weight={700} tone="ink">MATCH REASONING</Txt>
                    <Txt variant="small" tone="default" style={{ marginTop: 4, lineHeight: 18 }}>
                      {job.why_this_matches}
                    </Txt>
                  </Inset>
                ) : null}

                {/* Recommended Actions for Below 80% */}
                {!ready && (job.recommended_courses?.length || job.recommended_tests?.length || job.recommended_projects?.length) ? (
                  <View style={{ marginTop: space.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md }}>
                    <Txt variant="small" weight={700} tone="ink" style={{ marginBottom: 8 }}>
                      Recommended Actions to Reach 80%
                    </Txt>

                    <Stack gap={8}>
                      {/* Course recommendation */}
                      {(job.recommended_courses || []).slice(0, 2).map((c) => {
                        const cid = c.id || c.course_id || c.title;
                        return (
                          <Card key={cid} padding={space.sm} radius={radii.md} style={{ backgroundColor: colors.surface }}>
                            <Row justify="space-between" align="center" gap={8}>
                              <Stack gap={2} style={{ flex: 1 }}>
                                <Txt variant="small" weight={600} tone="ink">{c.title}</Txt>
                                <Txt variant="caption" tone="muted">
                                  {c.provider || 'NPTEL / Swayam'} · {c.reason || `Targeted course for ${c.skill_name || 'skill gap'}`}
                                </Txt>
                              </Stack>
                              <Button
                                label={c.status === 'COMPLETED' ? 'Done ✓' : 'Enroll Free'}
                                size="sm"
                                variant={c.status === 'COMPLETED' ? 'secondary' : 'primary'}
                                onPress={() => handleEnrollCourse(c)}
                                loading={enrollingCourseId === cid}
                              />
                            </Row>
                          </Card>
                        );
                      })}

                      {/* Assessment recommendation */}
                      {(job.recommended_tests || []).slice(0, 2).map((t, idx) => (
                        <Card key={t.id || idx} padding={space.sm} radius={radii.md} style={{ backgroundColor: colors.surface }}>
                          <Row justify="space-between" align="center" gap={8}>
                            <Stack gap={2} style={{ flex: 1 }}>
                              <Txt variant="small" weight={600} tone="ink">{t.title || `${t.skill || 'Skill'} Diagnostic`}</Txt>
                              <Txt variant="caption" tone="muted">
                                Verify competency · {t.question_count || 15} questions · Boosts match score
                              </Txt>
                            </Stack>
                            <Button
                              label="Take Quiz"
                              icon="Target"
                              size="sm"
                              onPress={() => {
                                setShowDetailsModal(false);
                                handleStartAssessment(t);
                              }}
                            />
                          </Row>
                        </Card>
                      ))}
                    </Stack>
                  </View>
                ) : null}
              </Card>

              {/* SECTION H: Application Process */}
              <Card padding={space.lg} radius={radii.lg} style={styles.sectionCard}>
                <Row gap={8} align="center" style={{ marginBottom: 8 }}>
                  <Icon name="Send" size={18} color={colors.ink} />
                  <Txt variant="h3" tone="ink">Application Process</Txt>
                </Row>
                <Stack gap={8}>
                  <Txt variant="small" tone="default">
                    {job.application_instructions || 'Click Apply Now below to register your application and proceed to the official employer portal.'}
                  </Txt>
                  <Row wrap gap={12} style={{ marginTop: 4 }}>
                    <Row gap={4} align="center">
                      <Icon name="FileText" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Documents: Resume (PDF), Portfolio</Txt>
                    </Row>
                    <Row gap={4} align="center">
                      <Icon name="Globe" size={14} color={colors.textMuted} />
                      <Txt variant="caption" tone="muted">Source: {job.source || 'External Provider'}</Txt>
                    </Row>
                  </Row>
                </Stack>
              </Card>
            </Stack>
          );
        })() : null}
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
  gridCell: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchAnalysisCard: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
});
