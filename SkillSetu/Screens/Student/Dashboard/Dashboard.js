import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { calculateSkillIndex } from './skillIndexCalculator';
import { formatCareerTitle } from '../services/profileService';
import { fetchRecommendedInternships } from '../services/internshipService';
import { fetchStudentApplications } from '../services/applicationService';
import {
  SkillIndexModal,
  SkillGapAnalysisModal,
  SingleSkillModal,
  AllSkillsModal,
} from './components/DashboardModals';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  EventCard,
  FeatureCard,
  Icon,
  IconButton,
  Page,
  Pill,
  ProgressBar,
  Ring,
  Row,
  SectionTitle,
  Sheet,
  Skeleton,
  Stack,
  StatTrio,
  Timeline,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';
import { API_BASE } from '../../../ui/config';
import { pickFile } from '../../../ui/pickFile';

import { tl } from '../../../i18n/tl';

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
  // Two-column body when the main column (beside the events panel) has room.
  const isWide = width >= 1320 || (width >= 900 && width < 1120);

  const displayName = user?.name || profileData?.personalInfo?.fullName || 'Student';
  const studentEmail = user?.email || profileData?.personalInfo?.email || '';

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
      const res = await fetch(`${API_BASE}/github/status?email=${emailQuery}`);
      const data = await res.json();

      if (res.ok && data.status === 'success' && data.connection) {
        const conn = data.connection;
        if (conn.connected) {
          let skillsList = conn.skills || [];

          if ((!skillsList || skillsList.length === 0) && conn.repositories && conn.repositories.length > 0) {
            try {
              const analyzeRes = await fetch(`${API_BASE}/github/analyze-selected`, {
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
          `${API_BASE}/student/career-skill-gaps?email=${emailQuery}&${careerQueryParams}`
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
          `${API_BASE}/student/career-readiness?email=${emailParam}&career_name=${careerParam}`
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
          `${API_BASE}/student/learning-path?email=${emailParam}&career_name=${careerParam}`
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
      const response = await fetch(`${API_BASE}/student/resume/analyze-intelligence`, {
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


  // ---------------------------------------------------------------------------
  // View-model for the redesigned dashboard
  // ---------------------------------------------------------------------------
  const firstName = (displayName || 'Student').split(' ')[0];
  const hasCareer = activeTargetCareers.length > 0;
  const topGaps = hasCareer ? (computedGapData?.top_gaps || []).slice(0, 3) : [];
  const modules = learningPathData?.modules || [];
  const currentModule = modules.find((m) => (m.status || '').toUpperCase() === 'ACTIVE') || modules[0];
  const readinessScore = careerReadinessData?.overall_readiness ?? backendGapData?.career_readiness?.score ?? null;
  const topMatches = [...recommendedInternships]
    .sort((a, b) => (b.match_score || b.score || 0) - (a.match_score || a.score || 0))
    .slice(0, 3);
  const completion = profileCompletion !== undefined ? profileCompletion : 0;
  const [resumeSheetOpen, setResumeSheetOpen] = useState(false);

  const pickResume = async () => {
    const file = await pickFile({ accept: '.pdf,.docx,.txt,.png,.jpg,.jpeg,.webp' });
    if (file) handleDashboardResumeUpload(file);
  };

  const events = useMemo(() => {
    const items = studentApplications
      .filter((a) => a.nextAction || a.current_round_name)
      .slice(0, 5)
      .map((a) => {
        const status = (a.application_status || a.statusClass || '').toUpperCase();
        const isScholarship = a.type === 'scholarship';
        const tone = status === 'SHORTLISTED' || a.current_round_name ? 'success' : isScholarship ? 'warning' : 'info';
        return {
          key: a.id || `${a.company}-${a.role}`,
          tone,
          icon: a.current_round_name ? 'Target' : isScholarship ? 'GraduationCap' : 'Briefcase',
          type: a.current_round_name || (isScholarship ? 'Scholarship' : 'Internship'),
          date: a.dateApplied ? a.dateApplied.replace(/, \d{4}$/, '') : '',
          title: `${a.role || 'Application'} · ${a.company || ''}`.trim(),
          body: a.nextAction || a.status,
          onPress: () => onNavigate && onNavigate(a.current_round_name ? 'Rounds' : 'Applications'),
        };
      });
    return items;
  }, [studentApplications, onNavigate]);

  const go = (id, params) => onNavigate && onNavigate(id, params);

  const roadmap = [
    {
      key: 'profile',
      done: completion >= 80,
      content: (
        <Card badge={{ icon: 'User', tone: completion >= 80 ? 'success' : 'warning' }} onPress={onNavigateToProfile}>
          <Stack gap={6}>
            <Txt variant="h2" tone="ink">Career profile</Txt>
            <Txt variant="body" tone="muted">
              {completion >= 80 ? 'Your profile is ready for recruiters.' : 'Add education, career goals, resume and GitHub to unlock better matches.'}
            </Txt>
          </Stack>
          <Row justify="space-between" style={{ marginTop: space.lg }}>
            {completion >= 80 ? (
              <Pill label="Completed 👏" tone="success" />
            ) : (
              <Row gap={10} style={{ flex: 1, maxWidth: 260 }}>
                <ProgressBar value={completion} tone="success" style={{ flex: 1 }} />
                <Txt variant="small" weight={700} tone="ink">{completion}%</Txt>
              </Row>
            )}
            <IconButton icon="ArrowRight" variant="dark" onPress={onNavigateToProfile} accessibilityLabel="Open profile" />
          </Row>
        </Card>
      ),
    },
    {
      key: 'learning',
      done: false,
      content: (
        <FeatureCard tilt={isWide} onPress={() => go('Learning')}>
          <Row align="flex-start" gap={space.md}>
            <Stack gap={6} style={{ flex: 1 }}>
              <Txt variant="overline" color={colors.lilacInk}>Continue learning</Txt>
              <Txt variant="h2" tone="ink" numberOfLines={2}>
                {learningPathLoading ? 'Loading your plan…' : currentModule?.title || (hasCareer ? 'Start your learning plan' : 'Pick a target career')}
              </Txt>
              <Txt variant="body" color={colors.lilacInk} numberOfLines={2}>
                {currentModule
                  ? tl('{{v0}} · closes your {{v1}} gap', {
                  v0: currentModule.provider || 'Curated course',
                  v1: learningPathData?.gap_skill || 'top'
                })
                  : 'Personal modules are generated from your skill gaps.'}
              </Txt>
            </Stack>
            <View style={styles.playDisc}>
              <Icon name="Play" size={26} color={colors.ink} />
            </View>
          </Row>
          <Row justify="space-between" style={{ marginTop: space.lg }}>
            <View style={styles.watchChip}>
              <Icon name="Clock" size={15} color={colors.ink} />
              <Txt variant="small" weight={600} tone="ink">
                {currentModule ? `${currentModule.duration || 'Self-paced'} · ${currentModule.difficulty || 'All levels'}` : 'Self-paced'}
              </Txt>
            </View>
            {modules.length ? <Pill label={tl('{{length}} modules', {
              length: modules.length
            })} tone="neutral" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }} /> : null}
          </Row>
        </FeatureCard>
      ),
    },
    {
      key: 'gaps',
      done: false,
      content: (
        <Card badge={{ icon: 'Zap', tone: 'warning' }}>
          <Stack gap={6}>
            <Txt variant="h2" tone="ink">Close your skill gaps</Txt>
            <Txt variant="body" tone="muted" numberOfLines={2}>
              {hasCareer && computedGapData?.recommendation_text
                ? computedGapData.recommendation_text
                : 'Choose a target career to see the skills employers expect from you.'}
            </Txt>
          </Stack>
          <Stack gap={space.sm} style={{ marginTop: space.lg }}>
            {topGaps.length ? (
              topGaps.map((g) => (
                <Pressable key={g.skill_name || g.name} onPress={() => go('Skills', { focusSkill: g.skill_name })} style={webOnly({ cursor: 'pointer' })}>
                  <Row justify="space-between" style={{ marginBottom: 6 }}>
                    <Txt variant="bodyStrong" tone="ink">{g.student_friendly_name || g.skill_name || g.name}</Txt>
                    <Txt variant="small" tone="muted">{g.current_level ?? 0}% / {g.required_level ?? 100}%</Txt>
                  </Row>
                  <ProgressBar value={g.current_level ?? 0} tone={(g.current_level ?? 0) >= 60 ? 'success' : 'warning'} />
                </Pressable>
              ))
            ) : (
              <Txt variant="small" tone="subtle">{hasCareer ? 'No gaps detected — nice work.' : 'Set a target career in your profile first.'}</Txt>
            )}
          </Stack>
          <Row justify="space-between" style={{ marginTop: space.lg }}>
            <Pill
              label={!hasCareer ? 'Needs a career goal' : topGaps.length ? tl('{{v0}} priority skills', {
                v0: computedGapData?.top_gaps?.length || topGaps.length
              }) : 'Up to date'}
              tone={!hasCareer ? 'neutral' : topGaps.length ? 'warning' : 'success'}
              icon="Target"
            />
            <Row gap={8}>
              <IconButton icon="Ellipsis" onPress={() => setIsSkillGapAnalysisModalOpen(true)} accessibilityLabel="Full gap analysis" />
              <IconButton icon="ArrowRight" variant="dark" onPress={() => go('Skills')} accessibilityLabel="Open skills" />
            </Row>
          </Row>
        </Card>
      ),
    },
    {
      key: 'apply',
      done: false,
      content: (
        <Card badge={{ icon: 'Briefcase', tone: 'info' }}>
          <Stack gap={6}>
            <Txt variant="h2" tone="ink">Apply to matched roles</Txt>
            <Txt variant="body" tone="muted">
              {internshipsLoading
                ? 'Finding internships that match your evidence…'
                : internshipsError
                ? 'Opportunities are unavailable right now.'
                : tl(
                '{{liveMatchesCount}} of {{totalOpportunitiesCount}} opportunities meet your match threshold.',
                {
                  liveMatchesCount: liveMatchesCount,
                  totalOpportunitiesCount: totalOpportunitiesCount
                }
              )}
            </Txt>
          </Stack>
          <Stack gap={space.xs} style={{ marginTop: space.md }}>
            {internshipsLoading ? (
              <>
                <Skeleton height={44} />
                <Skeleton height={44} />
              </>
            ) : (
              topMatches.map((it) => (
                <Pressable key={it.id || it.internship_id} onPress={() => go('Opportunities')} style={({ hovered }) => [styles.matchRow, webOnly({ cursor: 'pointer' }), hovered ? { backgroundColor: colors.surfaceMuted } : null]}>
                  <Avatar name={it.company_name || it.company || '?'} uri={it.company_logo || undefined} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="bodyStrong" tone="ink" numberOfLines={1}>{it.title}</Txt>
                    <Txt variant="caption" tone="muted" numberOfLines={1}>{it.company_name || it.company} · {it.work_mode || it.location_name || 'Flexible'}</Txt>
                  </View>
                  <Pill label={`${Math.round(it.match_score || it.score || 0)}%`} tone="success" size="sm" />
                </Pressable>
              ))
            )}
          </Stack>
          <Row justify="space-between" style={{ marginTop: space.lg }}>
            <Pill label={liveMatchesCount ? 'Ready to apply' : 'Upcoming'} tone={liveMatchesCount ? 'info' : 'neutral'} icon={liveMatchesCount ? 'Rocket' : 'Clock'} />
            <IconButton icon="ArrowRight" variant="dark" onPress={() => go('Opportunities')} accessibilityLabel="Open internships" />
          </Row>
        </Card>
      ),
    },
  ];

  const resumeResult = resumeIntelligence.result;

  const insights = (
    <Stack gap={space.md}>
      <StatTrio
        items={[
          { value: applicationsLoading ? '…' : totalAppsCount, label: 'Applications', tone: 'info', onPress: () => go('Applications') },
          { value: applicationsLoading ? '…' : interviewAppsCount, label: 'In rounds', tone: 'success', onPress: () => go('Rounds') },
          { value: internshipsLoading ? '…' : liveMatchesCount, label: 'Ready to apply', dashed: true, onPress: () => go('Opportunities') },
        ]}
      />

      <Card>
        <Row justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Txt variant="overline" tone="subtle">Career readiness</Txt>
            <Txt variant="h3" tone="ink" numberOfLines={1}>{hasCareer ? activeTargetCareer : 'No target career yet'}</Txt>
            {activeTargetCareers.length > 1 ? (
              <Txt variant="caption" tone="muted">+{activeTargetCareers.length - 1} more target{activeTargetCareers.length > 2 ? 's' : ''}</Txt>
            ) : null}
          </Stack>
          <Ring value={readinessScore || 0} size={76} stroke={8} tone="success">
            <Txt variant="h3" tone="ink">{readinessScore != null ? `${readinessScore}%` : '—'}</Txt>
          </Ring>
        </Row>
        {careerReadinessData ? (
          <Stack gap={10} style={{ marginTop: space.md }}>
            {[
              ['Technical', careerReadinessData.technical_score, 'info'],
              ['Practical', careerReadinessData.practical_score, 'accent'],
              ['Evidence', careerReadinessData.evidence_score, 'warning'],
            ].map(([label, v, tone]) => (
              <Row key={label} gap={10}>
                <Txt variant="small" tone="muted" style={{ width: 72 }}>{label}</Txt>
                <ProgressBar value={v || 0} tone={tone} style={{ flex: 1 }} />
                <Txt variant="small" weight={700} tone="ink" style={{ width: 36, textAlign: 'right' }}>{v ?? 0}%</Txt>
              </Row>
            ))}
          </Stack>
        ) : !hasCareer ? (
          <Button label="Choose target career" icon="Target" variant="secondary" size="sm" onPress={onNavigateToProfile} style={{ marginTop: space.md }} />
        ) : null}
      </Card>

      <Card>
        <Row justify="space-between">
          <Stack gap={2}>
            <Txt variant="overline" tone="subtle">Skill intelligence</Txt>
            <Txt variant="h3" tone="ink">{formattedSkills.length} verified skills</Txt>
          </Stack>
          <Pressable onPress={() => setIsSkillIndexModalOpen(true)} style={webOnly({ cursor: 'pointer' })} accessibilityLabel="GitHub skill index">
            <Ring value={overallGithubScore || 0} size={56} stroke={6} tone="accent">
              <Txt variant="small" weight={700} tone="ink">{githubState.loading ? '…' : overallGithubScore || 0}</Txt>
            </Ring>
          </Pressable>
        </Row>
        <Row wrap gap={8} style={{ marginTop: space.md }}>
          {top8Skills.length ? (
            top8Skills.map((s) => (
              <Pressable key={s.name} onPress={() => setSelectedSkillModal(s)} style={webOnly({ cursor: 'pointer' })}>
                <Pill label={`${s.name} · ${s.score}`} tone={s.score >= 75 ? 'success' : s.score >= 50 ? 'info' : 'neutral'} size="sm" />
              </Pressable>
            ))
          ) : (
            <Txt variant="small" tone="muted">
              {githubState.connected ? 'Analysing your repositories…' : 'Connect GitHub or upload a resume to verify skills.'}
            </Txt>
          )}
        </Row>
        <Row gap={8} style={{ marginTop: space.md }}>
          {formattedSkills.length > 8 ? <Button label="All skills" size="sm" variant="secondary" onPress={() => setShowAllSkills(true)} /> : null}
          {!githubState.connected ? <Button label="Connect GitHub" icon="GitBranch" size="sm" variant="secondary" onPress={onNavigateToProfile} /> : null}
        </Row>
      </Card>

      <Card tone="info">
        <Row justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Txt variant="overline" color={colors.skyInk}>Resume check</Txt>
            <Txt variant="h3" tone="ink">
              {resumeIntelligence.analyzing ? 'Analysing…' : resumeResult ? tl('ATS score {{v0}}/100', {
                v0: resumeResult.ats_score || 0
              }) : 'How does your resume score?'}
            </Txt>
            <Txt variant="small" color={colors.skyInk} numberOfLines={2}>
              {resumeIntelligence.error
                ? resumeIntelligence.error
                : resumeResult
                ? tl('Best fit: {{v0}} ({{v1}}%)', {
                v0: resumeResult.role_fit?.best_fit_role || '—',
                v1: resumeResult.role_fit?.fit_score || 0
              })
                : 'Upload a PDF, DOCX or image for an instant ATS and role-fit report.'}
            </Txt>
          </Stack>
          <View style={[styles.resumeIcon]}>
            <Icon name="FileText" size={22} color={colors.skyInk} />
          </View>
        </Row>
        <Row gap={8} style={{ marginTop: space.md }}>
          <Button label={resumeResult ? 'Analyse another' : 'Upload resume'} icon="Upload" size="sm" onPress={pickResume} loading={resumeIntelligence.analyzing} />
          {resumeResult ? <Button label="View report" size="sm" variant="light" onPress={() => setResumeSheetOpen(true)} /> : null}
        </Row>
      </Card>
    </Stack>
  );

  const eventsPanel = (
    <>
      <SectionTitle title="My Events" emoji="🧐" size="h1" />
      {computedGapData?.recommendation_text && hasCareer ? (
        <EventCard
          tone="accent"
          icon="Sparkles"
          type="Mentor tip"
          date="Today"
          body={computedGapData.recommendation_text}
          footer={
            <Pressable onPress={() => go('Learning')} style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, webOnly({ cursor: 'pointer' })]}>
              <Icon name="BookOpen" size={15} color={colors.ink} />
              <Txt variant="small" weight={600} tone="ink">Open learning plan</Txt>
            </Pressable>
          }
        />
      ) : null}
      {applicationsLoading ? (
        <>
          <Skeleton height={130} radius={radii.xl} />
          <Skeleton height={130} radius={radii.xl} />
        </>
      ) : events.length ? (
        events.map(({ key, ...ev }) => <EventCard key={key} {...ev} />)
      ) : (
        <View style={styles.emptyEvents}>
          <EmptyState
            icon="Calendar"
            title="Nothing scheduled"
            message="Applications, assessment rounds and deadlines will show up here."
            action={<Button label="Find internships" size="sm" icon="Briefcase" onPress={() => go('Opportunities')} />}
          />
        </View>
      )}
    </>
  );

  return (
    (<Page aside={eventsPanel}>
      <SectionTitle
        title={tl('Hi {{firstName}}, here\'s your plan', {
          firstName: firstName
        })}
        emoji="⏰"
        subtitle={hasCareer ? tl('Tracking {{v0}}', {
          v0: activeTargetCareers.join(' · ')
        }) : 'Set a target career to personalise everything below.'}
        right={
          <Button
            label={hasCareer ? 'Edit goals' : 'Set career goal'}
            icon="Target"
            variant="secondary"
            onPress={onNavigateToProfile}
          />
        }
      />
      <View style={[styles.grid, isWide ? styles.gridWide : null]}>
        <View style={isWide ? { flex: 1.15 } : null}>
          <Timeline items={roadmap} gap={space.lg} />
        </View>
        <View style={isWide ? { flex: 1 } : null}>{insights}</View>
      </View>
      {/* Modals (kept from previous dashboard) */}
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
      <SkillGapAnalysisModal
        isOpen={isSkillGapAnalysisModalOpen}
        onClose={() => setIsSkillGapAnalysisModalOpen(false)}
        activeTargetCareers={activeTargetCareers}
        computedGapData={computedGapData}
        gapAnalysisTab={gapAnalysisTab}
        setGapAnalysisTab={setGapAnalysisTab}
      />
      <SingleSkillModal
        selectedSkillModal={selectedSkillModal}
        onClose={() => setSelectedSkillModal(null)}
        getEvidenceLevelText={getEvidenceLevelText}
      />
      <AllSkillsModal
        isOpen={showAllSkills}
        onClose={() => setShowAllSkills(false)}
        formattedSkills={formattedSkills}
        isTablet={isTablet}
        setSelectedSkillModal={setSelectedSkillModal}
      />
      <Sheet
        visible={resumeSheetOpen}
        onClose={() => setResumeSheetOpen(false)}
        title="Resume report"
        subtitle={resumeResult?.filename || resumeIntelligence.file?.name}
        icon="FileText"
        tone="info"
      >
        {resumeResult ? (
          <>
            <Row gap={space.lg}>
              <Ring value={resumeResult.ats_score || 0} size={92} stroke={9} tone="info">
                <Txt variant="h2" tone="ink">{resumeResult.ats_score || 0}</Txt>
              </Ring>
              <Txt variant="body" tone="muted" style={{ flex: 1 }}>
                {resumeResult.score_text || 'ATS structure, format and keywords evaluated against industry standards.'}
              </Txt>
            </Row>
            {resumeResult.ats_breakdown ? (
              <Card padding={space.lg}>
                <Stack gap={12}>
                  {[
                    ['Skills', resumeResult.ats_breakdown.skills || 0, 30],
                    ['Experience', resumeResult.ats_breakdown.experience || 0, 25],
                    ['Projects', resumeResult.ats_breakdown.projects || 0, 20],
                    ['Education & extras', (resumeResult.ats_breakdown.education || 0) + (resumeResult.ats_breakdown.extras || 0), 25],
                  ].map(([label, v, max]) => (
                    <Stack key={label} gap={6}>
                      <Row justify="space-between">
                        <Txt variant="small" weight={600} tone="ink">{label}</Txt>
                        <Txt variant="small" tone="muted">{v}/{max}</Txt>
                      </Row>
                      <ProgressBar value={(v / max) * 100} tone="info" />
                    </Stack>
                  ))}
                </Stack>
              </Card>
            ) : null}
            <Card padding={space.lg}>
              <Txt variant="overline" tone="subtle">Best-fit role</Txt>
              <Row justify="space-between" style={{ marginTop: 4 }}>
                <Txt variant="h3" tone="ink">{resumeResult.role_fit?.best_fit_role || 'General Software Engineering'}</Txt>
                <Pill label={tl('{{v0}}% fit', {
                  v0: resumeResult.role_fit?.fit_score || 0
                })} tone="success" />
              </Row>
              <Txt variant="small" tone="muted" style={{ marginTop: 6 }}>{resumeResult.role_fit?.why_fit || ''}</Txt>
              {(resumeResult.extracted_skills || []).length ? (
                <Row wrap gap={6} style={{ marginTop: space.sm }}>
                  {resumeResult.extracted_skills.slice(0, 10).map((sk, i) => (
                    <Pill key={`${sk}-${i}`} label={typeof sk === 'string' ? sk : sk.name || sk.skill} tone="info" size="sm" />
                  ))}
                </Row>
              ) : null}
              {resumeResult.role_fit?.missing_skills?.length ? (
                <>
                  <Txt variant="small" weight={600} tone="ink" style={{ marginTop: space.md }}>Missing for this role</Txt>
                  <Row wrap gap={6} style={{ marginTop: 6 }}>
                    {resumeResult.role_fit.missing_skills.slice(0, 6).map((sk, i) => (
                      <Pill key={`${sk}-${i}`} label={typeof sk === 'string' ? sk : sk.name || sk.skill} tone="warning" size="sm" />
                    ))}
                  </Row>
                </>
              ) : null}
            </Card>
            {resumeResult.skillsetu_value?.length ? (
              <Stack gap={8}>
                {resumeResult.skillsetu_value.map((point, i) => (
                  <Row key={i} gap={8} align="flex-start">
                    <Icon name="CircleCheck" size={16} color={colors.mintInk} />
                    <Txt variant="small" tone="default" style={{ flex: 1 }}>{typeof point === 'string' ? point : point.text || JSON.stringify(point)}</Txt>
                  </Row>
                ))}
              </Stack>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </Page>)
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: space.xl,
  },
  gridWide: {
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
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: radii.md,
  },
  resumeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEvents: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
  },
});
