import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
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

import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, ensureClayGlobalStyles } from './components/DesignTokens';
import AmbientBackground from './components/AmbientBackground';
import OpportunityHeader from './components/OpportunityHeader';
import OpportunityHero from './components/OpportunityHero';
import OpportunityFilters from './components/OpportunityFilters';
import TopRecommendedSection from './components/TopRecommendedSection';
import OpportunityCard from './components/OpportunityCard';
import PipelineSidebar from './components/PipelineSidebar';
import OpportunityLoadingSkeleton from './components/OpportunityLoadingSkeleton';
import OpportunityErrorState from './components/OpportunityErrorState';
import OpportunityModals from './components/OpportunityModals';
import OpportunityFooter from './components/OpportunityFooter';

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

  // Ensure Google Fonts and high-fidelity claymorphic keyframes
  useEffect(() => {
    ensureClayGlobalStyles();
  }, []);

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
      avgMatch: internships.length ? Math.round(totalScore / internships.length) : (serverMetrics?.intelligence_score || 94),
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
      setPlanSuccessNotice(`Enrolled in "${course.title}". Opening course module...`);
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
      setPlanSuccessNotice(`Completed verified course "${course.title}". Skill evidence recorded!`);
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
        setPlanSuccessNotice(`Certificate verified for "${activeUploadCourse.title}". Verifiable skill evidence attested!`);
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

  return (
    <View style={styles.screenContainer}>
      <AmbientBackground />

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* 1. Header with Breadcrumbs & Sync Action Pills */}
        <OpportunityHeader
          metrics={metrics}
          applicationsCount={applications.length}
          onNavigate={onNavigate}
          onSyncLedger={() => loadData(true)}
        />

        {/* 2. Claymorphic Hero with Readiness & Intelligence Stats */}
        <OpportunityHero
          user={user}
          profileData={profileData}
          metrics={metrics}
        />

        {/* Loading / Error States */}
        {loading ? (
          <OpportunityLoadingSkeleton />
        ) : error ? (
          <OpportunityErrorState error={error} onRetry={() => loadData(true)} />
        ) : (
          <>
            {/* 3. Top Spotlight Section: Featured Recommendations on Left & Student Pipeline on Right */}
            {featuredJobs.length > 0 && (
              <View style={[styles.topSpotlightRow, isDesktop ? styles.desktopRow : styles.mobileColumn]}>
                <View style={[styles.spotlightLeft, isDesktop ? { flex: 6.8 } : {}]}>
                  <TopRecommendedSection
                    featuredJobs={featuredJobs}
                    onViewDetails={handleViewDetails}
                    onOpenPlan={openPlanModal}
                    onApply={handleApply}
                    applyingId={applyingId}
                  />
                </View>
                <View style={[styles.spotlightRight, isDesktop ? { flex: 3.2 } : {}]}>
                  <PipelineSidebar
                    applications={applications}
                    user={user}
                    profileData={profileData}
                    featuredJobs={featuredJobs}
                    onOpenPlan={openPlanModal}
                    onNavigate={onNavigate}
                  />
                </View>
              </View>
            )}

            {/* 4. Search & Interactive Clay Filter Chips (100% Full Width) */}
            <OpportunityFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearchSubmit={handleSearchSubmit}
              readinessTab={readinessTab}
              setReadinessTab={setReadinessTab}
              verifiedFilter={verifiedFilter}
              setVerifiedFilter={setVerifiedFilter}
              selectedTechStack={selectedTechStack}
              setSelectedTechStack={setSelectedTechStack}
              availableTechStacks={availableTechStacks}
              sortOption={sortOption}
              setSortOption={setSortOption}
              locationFilter={locationFilter}
              setLocationFilter={setLocationFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              metrics={metrics}
              totalCount={totalOpportunities || internships.length}
              savedCount={internships.filter(j => j.is_saved).length}
              onClearFilters={handleClearFilters}
            />

            {/* 5. All Verified & Discoverable Roles Section (100% Full Width Grid) */}
            <View style={styles.allRolesSection}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {verifiedFilter === 'VERIFIED'
                      ? `Verified Partner Roles (${filteredJobs.length})`
                      : verifiedFilter === 'UNVERIFIED'
                        ? `External Feed Roles (${filteredJobs.length})`
                        : `All Discoverable Roles (${filteredJobs.length})`}
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Recruiter-configured match thresholds determine direct application readiness. Internships below threshold include actionable development roadmaps.
                  </Text>
                </View>
              </View>

              {/* Opportunities Grid with 4-5 columns across 100% available width */}
              <View style={[
                styles.opportunityGrid,
                Platform.OS === 'web' && {
                  display: 'grid',
                  gridTemplateColumns: isWideDesktop 
                    ? 'repeat(5, minmax(0, 1fr))' 
                    : isDesktop 
                      ? 'repeat(4, minmax(0, 1fr))' 
                      : isTablet 
                        ? 'repeat(2, minmax(0, 1fr))' 
                        : 'repeat(1, minmax(0, 1fr))',
                  gap: isDesktop ? 18 : 14,
                  width: '100%',
                }
              ]}>
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <OpportunityCard
                      key={job.id}
                      job={job}
                      onViewDetails={handleViewDetails}
                      onOpenPlan={openPlanModal}
                      onApply={handleApply}
                      onToggleSave={handleToggleSave}
                      isSaving={savingId === job.id}
                      isApplying={applyingId === job.id}
                    />
                  ))
                ) : (
                  <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateIcon}>🔍</Text>
                    <Text style={styles.emptyStateTitle}>No opportunities matched your active filter criteria.</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Try clearing or relaxing your search query and tech filters to see more results.
                    </Text>
                    <Pressable
                      style={({ pressed }) => [styles.resetFiltersBtn, pressed && styles.btnPressed]}
                      onPress={handleClearFilters}
                    >
                      <Text style={styles.resetFiltersBtnText}>Reset All Filters</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Load More Button */}
              {hasMore && (
                <View style={styles.loadMoreWrap}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.loadMoreBtn,
                      loadingMore && styles.loadMoreBtnDisabled,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.loadMoreBtnText}>
                        Load More Roles ({internships.length} of {totalOpportunities})
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}

        {/* 6. Footer */}
        <OpportunityFooter />
      </ScrollView>

      {/* 6. All Interactive Modals */}
      <OpportunityModals
        // Details Modal
        selectedDetailJob={selectedDetailJob}
        showDetailsModal={showDetailsModal}
        setShowDetailsModal={setShowDetailsModal}
        onApply={handleApply}
        onOpenPlan={openPlanModal}
        onToggleSave={handleToggleSave}
        savingId={savingId}

        // Roadmap Modal
        selectedPlanJob={selectedPlanJob}
        showPlanModal={showPlanModal}
        setShowPlanModal={setShowPlanModal}
        planSuccessNotice={planSuccessNotice}
        enrollingCourseId={enrollingCourseId}
        handleEnrollCourse={handleEnrollCourse}
        handleCompleteCourse={handleCompleteCourse}
        handleStartAssessment={handleStartAssessment}
        handleStartProject={handleStartProject}
        onNavigate={onNavigate}

        // Assessment Runner Modal
        showAssessmentModal={showAssessmentModal}
        closeAssessmentModal={closeAssessmentModal}
        activeAssessment={activeAssessment}
        assessmentLoading={assessmentLoading}
        assessmentSubmitting={assessmentSubmitting}
        assessmentResult={assessmentResult}
        assessmentAnswers={assessmentAnswers}
        assessmentCurrentIdx={assessmentCurrentIdx}
        setAssessmentCurrentIdx={setAssessmentCurrentIdx}
        handleSelectOption={handleSelectOption}
        handleSubmitAssessment={handleSubmitAssessment}
        assessmentError={assessmentError}

        // Project Runner Modal
        showProjectModal={showProjectModal}
        closeProjectModal={closeProjectModal}
        activeProject={activeProject}
        projectSubmitting={projectSubmitting}
        projectResult={projectResult}
        projectRepoUrl={projectRepoUrl}
        setProjectRepoUrl={setProjectRepoUrl}
        projectNotes={projectNotes}
        setProjectNotes={setProjectNotes}
        projectError={projectError}
        availableRepos={availableRepos}
        loadingRepos={loadingRepos}
        selectedRepoId={selectedRepoId}
        setSelectedRepoId={setSelectedRepoId}
        handleSubmitProject={handleSubmitProject}

        // Applied Confirmation Modal
        showAppliedModal={showAppliedModal}
        setShowAppliedModal={setShowAppliedModal}
        appliedJob={appliedJob}

        // Certificate Upload & Verification Modal
        showUploadModal={showUploadModal}
        activeUploadCourse={activeUploadCourse}
        uploadingCertificate={uploadingCertificate}
        uploadResult={uploadResult}
        uploadError={uploadError}
        handleStartUploadCertificate={handleStartUploadCertificate}
        handleCloseUploadModal={handleCloseUploadModal}
        handleSubmitCertificate={handleSubmitCertificate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: CLAY_COLORS.canvas,
  },
  contentScroll: {
    padding: 24,
    paddingBottom: 60,
    maxWidth: 1680,
    width: '100%',
    alignSelf: 'center',
  },
  topSpotlightRow: {
    gap: 24,
    marginBottom: 24,
    width: '100%',
  },
  desktopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mobileColumn: {
    flexDirection: 'column',
  },
  spotlightLeft: {
    width: '100%',
  },
  spotlightRight: {
    width: '100%',
  },
  allRolesSection: {
    marginTop: 8,
    marginBottom: 32,
    width: '100%',
  },
  sectionHeaderRow: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 22,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  sectionSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13.5,
    color: CLAY_COLORS.muted,
    marginTop: 3,
    maxWidth: 750,
  },
  opportunityGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'flex-start',
  },
  emptyStateCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.card,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    ...CLAY_SHADOWS.card,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 18,
    marginBottom: 16,
  },
  resetFiltersBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonPrimary,
    cursor: 'pointer',
  },
  resetFiltersBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  loadMoreWrap: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 260,
    ...CLAY_SHADOWS.buttonPrimary,
    cursor: 'pointer',
  },
  loadMoreBtnDisabled: {
    opacity: 0.7,
  },
  loadMoreBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    ...CLAY_SHADOWS.buttonPressed,
  },
});
