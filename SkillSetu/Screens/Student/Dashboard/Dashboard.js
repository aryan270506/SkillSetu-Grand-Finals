import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { calculateSkillIndex } from './skillIndexCalculator';
import { formatCareerTitle } from '../services/profileService';
import { fetchRecommendedInternships } from '../services/internshipService';
import { fetchStudentApplications } from '../services/applicationService';

import {
  CLAY_COLORS,
  CLAY_FONTS,
  ensureDashboardGlobalStyles,
} from './components/DashboardDesignTokens';

import DashboardHero from './components/DashboardHero';
import DashboardMetrics from './components/DashboardMetrics';
import AiCareerRecommendation from './components/AiCareerRecommendation';
import SkillGapsSection from './components/SkillGapsSection';
import SkillIntelligenceSection from './components/SkillIntelligenceSection';
import CareerTrajectorySection from './components/CareerTrajectorySection';
import ResumeIntelligenceSection from './components/ResumeIntelligenceSection';
import PersonalizedLearningSection from './components/PersonalizedLearningSection';
import RecommendedInternshipsSection from './components/RecommendedInternshipsSection';
import PipelineAndReadinessSection from './components/PipelineAndReadinessSection';
import {
  SkillIndexModal,
  SkillGapAnalysisModal,
  SingleSkillModal,
  AllSkillsModal,
} from './components/DashboardModals';

export default function Dashboard({
  user,
  profileCompletion,
  onNavigateToProfile,
  profileData,
  setProfileData,
  onNavigate,
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;

  const displayName = user?.name || profileData?.personalInfo?.fullName || 'Student';
  const studentEmail = user?.email || profileData?.personalInfo?.email || '';

  // Ensure Web Styles and Google Fonts are injected
  useEffect(() => {
    ensureDashboardGlobalStyles();
  }, []);

  // GitHub Analysis Real Data States
  const [githubState, setGithubState] = useState({
    loading: true,
    error: false,
    connected: false,
    reposAnalyzed: 0,
    skills: [],
    username: '',
  });

  const [selectedSkillModal, setSelectedSkillModal] = useState(null);
  const [isSkillIndexModalOpen, setIsSkillIndexModalOpen] = useState(false);
  const [activeEvidencePop, setActiveEvidencePop] = useState(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [isSkillGapAnalysisModalOpen, setIsSkillGapAnalysisModalOpen] = useState(false);
  const [gapAnalysisTab, setGapAnalysisTab] = useState('combined');

  // Dynamic Live Opportunities State (Authoritative source)
  const [allInternships, setAllInternships] = useState([]);
  const [recommendedInternships, setRecommendedInternships] = useState([]);
  const [opportunitiesMetrics, setOpportunitiesMetrics] = useState(null);
  const [internshipsLoading, setInternshipsLoading] = useState(true);
  const [internshipsError, setInternshipsError] = useState(null);

  // Dynamic Student Applications State (Authoritative source)
  const [studentApplications, setStudentApplications] = useState([]);
  const [applicationStats, setApplicationStats] = useState(null);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState(null);

  // Dynamic Learning Path State
  const [learningPathData, setLearningPathData] = useState(null);
  const [learningPathLoading, setLearningPathLoading] = useState(true);

  // Dynamic Career Readiness State
  const [careerReadinessData, setCareerReadinessData] = useState(null);

  // Resume Intelligence Isolated Analysis State
  const [resumeIntelligence, setResumeIntelligence] = useState({
    analyzing: false,
    file: null,
    error: null,
    result: null,
  });

  // Fetch real GitHub analysis from Backend API
  const fetchGithubAnalysis = useCallback(async () => {
    if (!studentEmail) return;
    setGithubState(prev => ({ ...prev, loading: true, error: false }));

    try {
      const emailQuery = encodeURIComponent(studentEmail.trim());
      const res = await fetch(`http://127.0.0.1:8000/api/v1/github/status?email=${emailQuery}`);
      const data = await res.json();

      if (res.ok && data.status === 'success' && data.connection) {
        const conn = data.connection;
        if (conn.connected) {
          let skillsList = conn.skills || [];

          if ((!skillsList || skillsList.length === 0) && conn.repositories && conn.repositories.length > 0) {
            try {
              const analyzeRes = await fetch('http://127.0.0.1:8000/api/v1/github/analyze-selected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: studentEmail.trim(),
                  selected_repo_ids: conn.repositories.map(r => String(r.id)),
                }),
              });
              const analyzeData = await analyzeRes.json();
              if (analyzeRes.ok && analyzeData.skills) {
                skillsList = analyzeData.skills;
              }
            } catch (err) {
              console.error('Error auto-analyzing GitHub repositories:', err);
            }
          }

          setGithubState({
            loading: false,
            error: false,
            connected: true,
            reposAnalyzed: conn.metrics?.reposAnalyzed || (conn.repositories || []).length,
            skills: skillsList,
            username: conn.username || '',
          });
        } else {
          setGithubState({
            loading: false,
            error: false,
            connected: false,
            reposAnalyzed: 0,
            skills: [],
            username: '',
          });
        }
      } else {
        setGithubState({
          loading: false,
          error: true,
          connected: false,
          reposAnalyzed: 0,
          skills: [],
          username: '',
        });
      }
    } catch (err) {
      console.error('Error fetching GitHub analysis for Student Dashboard:', err);
      setGithubState({
        loading: false,
        error: true,
        connected: false,
        reposAnalyzed: 0,
        skills: [],
        username: '',
      });
    }
  }, [studentEmail]);

  useEffect(() => {
    fetchGithubAnalysis();
  }, [fetchGithubAnalysis]);

  // Selected Target Careers derivation from real profile & user data
  const activeTargetCareers = useMemo(() => {
    let list = [];
    if (
      profileData?.careerGoals?.targetCareerIds &&
      Array.isArray(profileData.careerGoals.targetCareerIds) &&
      profileData.careerGoals.targetCareerIds.length > 0
    ) {
      list = profileData.careerGoals.targetCareerIds;
    } else if (profileData?.careerGoals?.targetCareer) {
      list = [profileData.careerGoals.targetCareer];
    } else if (user?.target_careers && Array.isArray(user.target_careers) && user.target_careers.length > 0) {
      list = user.target_careers;
    } else if (user?.target_role) {
      list = [user.target_role];
    } else if (user?.headline) {
      list = [user.headline];
    }

    const result = [];
    const seen = new Set();
    for (const item of list) {
      if (!item) continue;
      const formatted = formatCareerTitle(String(item).trim());
      if (formatted && !seen.has(formatted.toLowerCase())) {
        seen.add(formatted.toLowerCase());
        result.push(formatted);
      }
    }
    return result;
  }, [profileData, user]);

  const activeTargetCareer = activeTargetCareers[0] || formatCareerTitle(user?.headline || 'Select Target Career');

  // State to hold Backend calculated skill gap response
  const [backendGapData, setBackendGapData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSkillGaps = async () => {
      try {
        const emailQuery = encodeURIComponent(studentEmail || '');
        const careerQueryParams =
          activeTargetCareers.length > 0
            ? activeTargetCareers.map(c => `target_careers=${encodeURIComponent(c)}`).join('&')
            : `target_careers=${encodeURIComponent(activeTargetCareer)}`;
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/student/career-skill-gaps?email=${emailQuery}&${careerQueryParams}`
        );
        const data = await res.json();
        if (isMounted && res.ok && data.status === 'success' && data.data) {
          setBackendGapData(data.data);
        }
      } catch (err) {
        console.error('Error fetching career skill gaps:', err);
      }
    };
    if (studentEmail) {
      fetchSkillGaps();
    }
    return () => {
      isMounted = false;
    };
  }, [studentEmail, activeTargetCareers, activeTargetCareer, githubState.skills]);

  // Fetch Recommended Live Internships via authoritative internshipService
  useEffect(() => {
    let isMounted = true;
    const fetchInternships = async () => {
      try {
        setInternshipsLoading(true);
        setInternshipsError(null);
        const data = await fetchRecommendedInternships({ email: studentEmail, pageSize: 50 });
        if (isMounted) {
          if (data && data.status === 'success') {
            const rawItems = data.items || data.data || [];
            setAllInternships(rawItems);
            if (data.metrics) {
              setOpportunitiesMetrics(data.metrics);
            }
            const eligible = rawItems.filter(item => {
              const thresh = item.application_threshold ?? item.minimum_match_threshold ?? 80;
              return (
                item.readiness_status === 'READY_TO_APPLY' ||
                ((item.match_score || item.score || 0) >= thresh && item.hard_eligible !== false)
              );
            });
            setRecommendedInternships(eligible);
          } else {
            setInternshipsError(data?.message || 'Unable to load opportunities');
            setRecommendedInternships([]);
          }
        }
      } catch (err) {
        console.error('[Dashboard] Error fetching internships:', err);
        if (isMounted) {
          setInternshipsError(err.message || 'Network error fetching opportunities');
          setRecommendedInternships([]);
        }
      } finally {
        if (isMounted) setInternshipsLoading(false);
      }
    };
    if (studentEmail) {
      fetchInternships();
    } else {
      setInternshipsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [studentEmail]);

  // Fetch Student Applications via authoritative applicationService
  useEffect(() => {
    let isMounted = true;
    const fetchApps = async () => {
      try {
        setApplicationsLoading(true);
        setApplicationsError(null);
        const data = await fetchStudentApplications(studentEmail);
        if (isMounted) {
          if (data && !data.error) {
            const allApps = data.all || [...(data.internships || []), ...(data.scholarships || [])];
            setStudentApplications(allApps);
            setApplicationStats(data.stats || null);
          } else {
            setApplicationsError(data?.error || 'Unable to load applications');
            setStudentApplications([]);
            setApplicationStats(null);
          }
        }
      } catch (err) {
        console.error('[Dashboard] Error fetching applications:', err);
        if (isMounted) {
          setApplicationsError(err.message || 'Network error fetching applications');
          setStudentApplications([]);
        }
      } finally {
        if (isMounted) setApplicationsLoading(false);
      }
    };
    if (studentEmail) {
      fetchApps();
    } else {
      setApplicationsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [studentEmail]);

  // Fetch Career Readiness
  useEffect(() => {
    let isMounted = true;
    const fetchReadiness = async () => {
      if (!activeTargetCareer || activeTargetCareer === 'Select Target Career') return;
      try {
        const emailParam = encodeURIComponent(studentEmail || '');
        const careerParam = encodeURIComponent(activeTargetCareer);
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/student/career-readiness?email=${emailParam}&career_name=${careerParam}`
        );
        const data = await res.json();
        if (isMounted && res.ok && data.status === 'success') {
          setCareerReadinessData(data.readiness || data.data || data);
        }
      } catch (err) {
        console.error('Error fetching career readiness:', err);
      }
    };
    if (studentEmail) {
      fetchReadiness();
    }
    return () => {
      isMounted = false;
    };
  }, [studentEmail, activeTargetCareer]);

  // Fetch Learning Path
  useEffect(() => {
    let isMounted = true;
    const fetchPath = async () => {
      try {
        setLearningPathLoading(true);
        const emailParam = encodeURIComponent(studentEmail || '');
        const careerParam = encodeURIComponent(activeTargetCareer || '');
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/student/learning-path?email=${emailParam}&career_name=${careerParam}`
        );
        const data = await res.json();
        if (isMounted && res.ok && data.status === 'success') {
          setLearningPathData(data.data || data);
        }
      } catch (err) {
        console.error('Error fetching dashboard learning path:', err);
      } finally {
        if (isMounted) setLearningPathLoading(false);
      }
    };
    if (studentEmail) {
      fetchPath();
    }
    return () => {
      isMounted = false;
    };
  }, [studentEmail, activeTargetCareer]);

  // Resume Intelligence Isolated Analysis Handler
  const handleDashboardResumeUpload = async file => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please select a smaller resume file.');
      return;
    }

    const allowed = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.txt'];
    const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
    if (!allowed.includes(ext)) {
      alert('Invalid format. Please upload a PDF, DOCX, TXT, or image resume file.');
      return;
    }

    setResumeIntelligence({
      analyzing: true,
      file: { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' },
      error: null,
      result: null,
    });

    const formData = new FormData();
    formData.append('file', file);
    if (user?.email) {
      formData.append('email', user.email.trim());
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/student/resume/analyze-intelligence', {
        method: 'POST',
        body: formData,
      });

      const resData = await response.json();

      if (response.ok && resData.status === 'success') {
        setResumeIntelligence({
          analyzing: false,
          file: { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' },
          error: null,
          result: resData,
        });
      } else {
        setResumeIntelligence(prev => ({
          ...prev,
          analyzing: false,
          error: resData.detail || 'ATS analysis unavailable. Please try again.',
        }));
      }
    } catch (err) {
      console.error('Resume intelligence upload error:', err);
      setResumeIntelligence(prev => ({
        ...prev,
        analyzing: false,
        error: 'Network error while analyzing resume. Please check your connection and retry.',
      }));
    }
  };

  // Pure ESCO Multi-Career Skill Gap Data
  const computedGapData = useMemo(() => {
    if (backendGapData && backendGapData.top_gaps) {
      return backendGapData;
    }

    return {
      target_careers: activeTargetCareers,
      target_career: activeTargetCareer,
      is_multi_career: activeTargetCareers.length > 1,
      recommendation_text:
        activeTargetCareers.length > 0
          ? `Improving your core skills in ${activeTargetCareer} will boost your match rate for verified opportunities.`
          : 'Select your target career in Profile to view tailored skill gaps and recommendations.',
      top_gaps: [],
      skill_gaps: [],
      recommended_pills: activeTargetCareers.length > 0 ? activeTargetCareers : ['Career Skills'],
      career_skills_map: {},
    };
  }, [backendGapData, activeTargetCareers, activeTargetCareer]);

  // Key Target Skills for active target career
  const keyTargetSkills = useMemo(() => {
    if (
      backendGapData?.career_market_skills &&
      Array.isArray(backendGapData.career_market_skills) &&
      backendGapData.career_market_skills.length > 0
    ) {
      return backendGapData.career_market_skills.map(s => s.skill || s.name || s).filter(Boolean);
    }
    if (
      backendGapData?.career_required_skills &&
      Array.isArray(backendGapData.career_required_skills) &&
      backendGapData.career_required_skills.length > 0
    ) {
      return backendGapData.career_required_skills.map(s => s.skill_name || s.name || s).filter(Boolean);
    }
    if (
      computedGapData?.recommended_pills &&
      Array.isArray(computedGapData.recommended_pills) &&
      computedGapData.recommended_pills.length > 0
    ) {
      return computedGapData.recommended_pills;
    }
    if (computedGapData?.top_gaps && Array.isArray(computedGapData.top_gaps) && computedGapData.top_gaps.length > 0) {
      return computedGapData.top_gaps.map(g => g.name || g.skill_name || g).filter(Boolean);
    }
    return [];
  }, [backendGapData, computedGapData]);

  // Helper to map evidence score to evidence level label
  const getEvidenceLevelText = score => {
    if (score >= 90) return 'Very Strong Evidence';
    if (score >= 75) return 'Strong Evidence';
    if (score >= 50) return 'Good Evidence';
    if (score >= 25) return 'Moderate Evidence';
    if (score > 0) return 'Limited Evidence';
    return 'No Evidence Yet';
  };

  // Calculate overall GitHub Skill Index using weighted Core Skill model
  const skillIndexDetails = useMemo(() => {
    return calculateSkillIndex(githubState.skills);
  }, [githubState.skills]);

  const overallGithubScore = skillIndexDetails.score;

  // Genuine evidence-based skills from GitHub analysis and verified profile
  const formattedSkills = useMemo(() => {
    const map = new Map();

    if (githubState.skills && Array.isArray(githubState.skills)) {
      githubState.skills.forEach(s => {
        const name = s.name || s.technology || s.tech;
        if (name) {
          const key = name.trim().toLowerCase();
          const score = Math.round(s.score || s.percentage || s.evidenceScore || 0);
          map.set(key, { name: name.trim(), score });
        }
      });
    }

    if (profileData) {
      const norm = profileData.normalizedSkills || profileData.normalized_skills || profileData.skills;
      if (Array.isArray(norm)) {
        norm.forEach(s => {
          const name = s.skill_name || s.name || s.label;
          if (name && !map.has(name.trim().toLowerCase())) {
            const score = Math.round(s.score || s.confidence || 75);
            map.set(name.trim().toLowerCase(), { name: name.trim(), score });
          }
        });
      }
    }

    const result = Array.from(map.values());
    return result.sort((a, b) => b.score - a.score);
  }, [githubState.skills, profileData]);

  const top8Skills = useMemo(() => formattedSkills.slice(0, 8), [formattedSkills]);

  // Authoritative Opportunities Counts & Metrics
  const liveMatchesCount = opportunitiesMetrics?.ready_to_apply ?? recommendedInternships.length;
  const totalOpportunitiesCount = opportunitiesMetrics?.total_opportunities ?? allInternships.length;

  // Authoritative Applications Counts & Status Normalization
  const totalAppsCount = applicationStats?.total ?? studentApplications.length;
  const activeAppsCount =
    applicationStats?.active ??
    studentApplications.filter(a => {
      const s = (a.application_status || a.statusClass || a.status || '').toUpperCase();
      return !['REJECTED', 'NOT_SELECTED', 'ACCEPTED', 'SELECTED', 'WITHDRAWN'].includes(s);
    }).length;

  const reviewAppsCount =
    applicationStats?.under_review ??
    studentApplications.filter(a => {
      const s = (a.application_status || a.statusClass || a.status || '').toUpperCase();
      return s === 'APPLIED' || s === 'UNDER_REVIEW';
    }).length;

  const interviewAppsCount = studentApplications.filter(a => {
    const s = (a.application_status || a.statusClass || a.status || '').toUpperCase();
    const roundName = (a.current_round_name || '').toLowerCase();
    return (
      roundName.includes('interview') ||
      roundName.includes('assessment') ||
      roundName.includes('aptitude') ||
      roundName.includes('technical') ||
      s.includes('INTERVIEW') ||
      s.includes('ROUND') ||
      s === 'SHORTLISTED' ||
      (a.has_pipeline && a.pipeline_status === 'IN_PROGRESS')
    );
  }).length;

  const selectedAppsCount =
    applicationStats?.accepted ??
    studentApplications.filter(a => {
      const s = (a.application_status || a.statusClass || a.status || '').toUpperCase();
      return ['ACCEPTED', 'OFFERED', 'SELECTED'].includes(s);
    }).length;

  // Real-world application tracking data percentages
  const submittedPercent = totalAppsCount > 0 ? 100 : 0;
  const interviewPercent = totalAppsCount > 0 ? Math.round((interviewAppsCount / totalAppsCount) * 100) : 0;
  const reviewPercent = totalAppsCount > 0 ? Math.round((reviewAppsCount / totalAppsCount) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
    >
      {/* 1. Welcome Hero Command Center */}
      <DashboardHero
        displayName={displayName}
        profileCompletion={profileCompletion !== undefined ? profileCompletion : 80}
        onNavigateToProfile={onNavigateToProfile}
        isTablet={isTablet}
        isWide={isWide}
      />

      {/* 2. Top Intelligence Metrics (4 Cards) */}
      <DashboardMetrics
        githubState={githubState}
        overallGithubScore={overallGithubScore}
        skillIndexDetails={skillIndexDetails}
        getEvidenceLevelText={getEvidenceLevelText}
        setIsSkillIndexModalOpen={setIsSkillIndexModalOpen}
        onNavigateToProfile={onNavigateToProfile}
        onNavigate={onNavigate}
        // Opportunities
        internshipsLoading={internshipsLoading}
        internshipsError={internshipsError}
        liveMatchesCount={liveMatchesCount}
        totalOpportunitiesCount={totalOpportunitiesCount}
        recommendedInternships={recommendedInternships}
        // Applications
        applicationsLoading={applicationsLoading}
        applicationsError={applicationsError}
        activeAppsCount={activeAppsCount}
        submittedPercent={submittedPercent}
        interviewPercent={interviewPercent}
        reviewPercent={reviewPercent}
        // Career Target
        activeTargetCareer={activeTargetCareer}
        activeTargetCareers={activeTargetCareers}
        careerReadinessData={careerReadinessData}
        backendGapData={backendGapData}
        keyTargetSkills={keyTargetSkills}
        formattedSkills={formattedSkills}
        isTablet={isTablet}
        isWide={isWide}
      />

      {/* 3. AI Career Recommendation Banner */}
      <AiCareerRecommendation
        computedGapData={computedGapData}
        onNavigate={onNavigate}
      />

      {/* 4. Your Skill Gaps */}
      <SkillGapsSection
        computedGapData={computedGapData}
        setIsSkillGapAnalysisModalOpen={setIsSkillGapAnalysisModalOpen}
        onNavigate={onNavigate}
        isTablet={isTablet}
      />

      {/* 5. Skill Intelligence */}
      <SkillIntelligenceSection
        top8Skills={top8Skills}
        formattedSkills={formattedSkills}
        setShowAllSkills={setShowAllSkills}
        setSelectedSkillModal={setSelectedSkillModal}
        isTablet={isTablet}
      />

      {/* 6. Career Trajectory & Goals */}
      <CareerTrajectorySection
        activeTargetCareer={activeTargetCareer}
        activeTargetCareers={activeTargetCareers}
        careerReadinessData={careerReadinessData}
        backendGapData={backendGapData}
        overallGithubScore={overallGithubScore}
        keyTargetSkills={keyTargetSkills}
        onNavigateToProfile={onNavigateToProfile}
        isTablet={isTablet}
      />

      {/* 7. Resume Intelligence & ATS Diagnostic */}
      <ResumeIntelligenceSection
        resumeIntelligence={resumeIntelligence}
        handleDashboardResumeUpload={handleDashboardResumeUpload}
        onNavigateToProfile={onNavigateToProfile}
        isTablet={isTablet}
      />

      {/* 8. Personalized Learning Tracks */}
      <PersonalizedLearningSection
        learningPathData={learningPathData}
        activeTargetCareer={activeTargetCareer}
        careerReadinessData={careerReadinessData}
        backendGapData={backendGapData}
        computedGapData={computedGapData}
        onNavigate={onNavigate}
        isWide={isWide}
      />

      {/* 9. Recommended Internships */}
      <RecommendedInternshipsSection
        internshipsLoading={internshipsLoading}
        internshipsError={internshipsError}
        recommendedInternships={recommendedInternships}
        onNavigate={onNavigate}
        isTablet={isTablet}
      />

      {/* 10. Application Pipeline & Interview Readiness */}
      <PipelineAndReadinessSection
        totalAppsCount={totalAppsCount}
        reviewAppsCount={reviewAppsCount}
        interviewAppsCount={interviewAppsCount}
        selectedAppsCount={selectedAppsCount}
        careerReadinessData={careerReadinessData}
        backendGapData={backendGapData}
        activeTargetCareer={activeTargetCareer}
        onNavigate={onNavigate}
        isTablet={isTablet}
      />

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* Modal 1: GitHub Skill Analysis Modal */}
      <SkillIndexModal
        isOpen={isSkillIndexModalOpen}
        onClose={() => setIsSkillIndexModalOpen(false)}
        overallGithubScore={overallGithubScore}
        getEvidenceLevelText={getEvidenceLevelText}
        skillIndexDetails={skillIndexDetails}
        githubState={githubState}
        activeEvidencePop={activeEvidencePop}
        setActiveEvidencePop={setActiveEvidencePop}
      />

      {/* Modal 2: Complete Skill Gap Analysis Modal */}
      <SkillGapAnalysisModal
        isOpen={isSkillGapAnalysisModalOpen}
        onClose={() => setIsSkillGapAnalysisModalOpen(false)}
        activeTargetCareers={activeTargetCareers}
        computedGapData={computedGapData}
        gapAnalysisTab={gapAnalysisTab}
        setGapAnalysisTab={setGapAnalysisTab}
      />

      {/* Modal 3: Single Skill Analysis Modal */}
      <SingleSkillModal
        selectedSkillModal={selectedSkillModal}
        onClose={() => setSelectedSkillModal(null)}
        getEvidenceLevelText={getEvidenceLevelText}
      />

      {/* Modal 4: View All Skills Modal */}
      <AllSkillsModal
        isOpen={showAllSkills}
        onClose={() => setShowAllSkills(false)}
        formattedSkills={formattedSkills}
        isTablet={isTablet}
        setSelectedSkillModal={setSelectedSkillModal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CLAY_COLORS.canvas,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 80,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
});
