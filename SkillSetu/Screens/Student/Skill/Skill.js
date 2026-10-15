import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { fetchCareerIntelligence } from '../services/careerIntelligenceService';
import PracticeLab from './components/PracticeLab';
import AssessmentSheet from './components/AssessmentSheet';
import {
  Button,
  Card,
  EmptyState,
  EventCard,
  FeatureCard,
  Page,
  Pill,
  ProgressBar,
  Ring,
  Row,
  SectionTitle,
  SegmentedTabs,
  Skeleton,
  Stack,
  StatTrio,
  Timeline,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';
import { API_BASE } from '../../../ui/config';

export default function Skill({
  profileData,
  user,
  setProfileData,
  navigationParams,
  onNavigate,
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;


  const [taxonomyCareersMap, setTaxonomyCareersMap] = useState({});

  // Fetch taxonomy reference for ID -> Name mapping
  useEffect(() => {
    let isMounted = true;
    async function fetchTaxonomyReference() {
      try {
        const res = await fetch(`${API_BASE}/taxonomy/careers?limit=100`);
        const data = await res.json();
        if (isMounted && res.ok && data.status === 'success' && data.data) {
          const map = {};
          data.data.forEach(c => {
            map[c.id] = c.name;
            map[c.name.toLowerCase()] = c.name;
          });
          setTaxonomyCareersMap(map);
        }
      } catch (err) {
        console.error('Error fetching taxonomy careers:', err);
      }
    }
    fetchTaxonomyReference();
    return () => { isMounted = false; };
  }, []);

  // Compute normalized target careers list from profileData / user
  const targetCareersList = useMemo(() => {
    let rawList = [];
    if (profileData?.careerGoals?.targetCareerIds && Array.isArray(profileData.careerGoals.targetCareerIds) && profileData.careerGoals.targetCareerIds.length > 0) {
      rawList = profileData.careerGoals.targetCareerIds;
    } else if (profileData?.careerGoals?.targetCareer) {
      rawList = [profileData.careerGoals.targetCareer];
    } else if (user?.target_careers && Array.isArray(user.target_careers) && user.target_careers.length > 0) {
      rawList = user.target_careers;
    } else if (user?.target_role) {
      rawList = [user.target_role];
    }

    const result = [];
    const seenIds = new Set();

    rawList.forEach(rawItem => {
      if (!rawItem) return;
      const str = String(rawItem).trim();
      if (!str) return;

      let cId = str;
      let cName = str;

      if (taxonomyCareersMap[str]) {
        cName = taxonomyCareersMap[str];
      } else if (str.startsWith('car_')) {
        cName = str.replace(/^car_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      } else {
        cId = `car_${str.toLowerCase().replace(/\s+/g, '_')}`;
      }

      if (!seenIds.has(cId.toLowerCase())) {
        seenIds.add(cId.toLowerCase());
        result.push({ id: cId, name: cName });
      }
    });

    return result;
  }, [profileData, user, taxonomyCareersMap]);

  const [activeCareerId, setActiveCareerId] = useState('');
  const [activeCareerName, setActiveCareerName] = useState('');

  // Race condition protection ref for career switching
  const latestCareerRequestIdRef = useRef(0);

  // Dynamic Backend State
  const [careerIntel, setCareerIntel] = useState(null);
  const [highlightedSkillId, setHighlightedSkillId] = useState(null);
  const [highlightedCourseId, setHighlightedCourseId] = useState(null);
  const [careerSkillData, setCareerSkillData] = useState(null);
  const [isLoadingCareerData, setIsLoadingCareerData] = useState(false);

  // Focused Skill Gap State
  const [selectedGapSkillName, setSelectedGapSkillName] = useState('');

  // Assessment Modal State
  const [assessmentModalVisible, setAssessmentModalVisible] = useState(false);
  const [assessmentData, setAssessmentData] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);

  // Sync navigation params from Learning screen
  useEffect(() => {
    if (navigationParams?.selectedSkillId) {
      setHighlightedSkillId(navigationParams.selectedSkillId);
    }
    if (navigationParams?.selectedCourseId) {
      setHighlightedCourseId(navigationParams.selectedCourseId);
    }
    if (navigationParams?.selectedSkillName) {
      setSelectedGapSkillName(navigationParams.selectedSkillName);
    }
  }, [navigationParams]);

  const [learningPathData, setLearningPathData] = useState(null);
  const [isStartingModule, setIsStartingModule] = useState(false);

  const [practiceChallenge, setPracticeChallenge] = useState(null);
  const [isUpdatingChallenge, setIsUpdatingChallenge] = useState(false);

  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [isVerifyingAssessment, setIsVerifyingAssessment] = useState(false);

  const [projectVerifications, setProjectVerifications] = useState([]);
  const [internshipImpact, setInternshipImpact] = useState(null);
  const [growthHistory, setGrowthHistory] = useState([]);
  const [careerReadinessData, setCareerReadinessData] = useState(null);
  const [heroData, setHeroData] = useState(null);

  // Sync initial active career when targetCareersList loads or changes
  useEffect(() => {
    if (targetCareersList && targetCareersList.length > 0) {
      const exists = targetCareersList.find(c => c.id === activeCareerId || c.name === activeCareerName);
      if (!exists) {
        const first = targetCareersList[0];
        setActiveCareerId(first.id);
        setActiveCareerName(first.name);
      }
    }
  }, [targetCareersList]);

  // Master Data Fetcher driven by activeCareerName & user email
  const studentEmail = user?.email || profileData?.personalInfo?.email || '';

  const fetchAllSkillGapData = async (cName, overrideSkill = null) => {
    if (!cName) return;
    const reqId = ++latestCareerRequestIdRef.current;
    setIsLoadingCareerData(true);
    const emailQ = encodeURIComponent(studentEmail);
    const targetQ = encodeURIComponent(cName);

    try {
      // 0. Fetch Authoritative Skill Hero & Benchmark Data
      fetch(`${API_BASE}/student/skill-hero?email=${emailQ}&career_name=${targetQ}`)
        .then(r => r.json())
        .then(j => {
          if (reqId === latestCareerRequestIdRef.current && j.status === 'success' && j.data) {
            setHeroData(j.data);
          }
        })
        .catch(err => console.error('Error fetching skill hero data:', err));

      // 1. Fetch Unified Career Intelligence
      const intelRes = await fetchCareerIntelligence(studentEmail, cName);
      if (reqId === latestCareerRequestIdRef.current && intelRes) {
        setCareerIntel(intelRes);
      }

      // 2. Fetch Main Career Skill Gaps
      const resGaps = await fetch(`${API_BASE}/student/career-skill-gaps?email=${emailQ}&target_career=${targetQ}`);
      const jsonGaps = await resGaps.json();
      
      // Prevent stale responses if user switched career while request was in-flight
      if (reqId !== latestCareerRequestIdRef.current) return;

      if (resGaps.ok && jsonGaps.status === 'success' && jsonGaps.data) {
        setCareerSkillData(jsonGaps.data);
      } else {
        setCareerSkillData(null);
      }

      // Determine top / active gap skill
      const topGapSkill = overrideSkill || selectedGapSkillName || intelRes?.skill_gaps?.[0]?.skill_name || jsonGaps.data?.top_gaps?.[0]?.skill_name || '';
      if (!selectedGapSkillName || overrideSkill) {
        setSelectedGapSkillName(topGapSkill);
      }

      // 3. Fetch Personalized Learning Path
      const resPath = await fetch(`${API_BASE}/student/learning-path?email=${emailQ}&career_name=${targetQ}&gap_skill=${encodeURIComponent(topGapSkill)}`);
      const jsonPath = await resPath.json();
      if (reqId === latestCareerRequestIdRef.current && resPath.ok && jsonPath.data) setLearningPathData(jsonPath.data);

      // 4. Fetch Practice Challenge
      const resPrac = await fetch(`${API_BASE}/student/practice-challenge?email=${emailQ}&gap_skill=${encodeURIComponent(topGapSkill)}`);
      const jsonPrac = await resPrac.json();
      if (reqId === latestCareerRequestIdRef.current && resPrac.ok && jsonPrac.data) setPracticeChallenge(jsonPrac.data);

      // 5. Fetch Assessment History
      const resAssess = await fetch(`${API_BASE}/student/assessment-history?email=${emailQ}`);
      const jsonAssess = await resAssess.json();
      if (reqId === latestCareerRequestIdRef.current && resAssess.ok && jsonAssess.data) setAssessmentHistory(jsonAssess.data);

      // 6. Fetch Project Verifications
      const resProj = await fetch(`${API_BASE}/student/project-verifications?email=${emailQ}`);
      const jsonProj = await resProj.json();
      if (reqId === latestCareerRequestIdRef.current && resProj.ok && jsonProj.data) setProjectVerifications(jsonProj.data);

      // 7. Fetch Internship Impact
      const resImpact = await fetch(`${API_BASE}/student/internship-impact?email=${emailQ}&career_name=${targetQ}&gap_skill=${encodeURIComponent(topGapSkill)}`);
      const jsonImpact = await resImpact.json();
      if (reqId === latestCareerRequestIdRef.current && resImpact.ok && jsonImpact.data) setInternshipImpact(jsonImpact.data);

      // 8. Fetch Skill Growth History
      const resGrowth = await fetch(`${API_BASE}/student/skill-growth-history?email=${emailQ}&career_name=${targetQ}`);
      const jsonGrowth = await resGrowth.json();
      if (reqId === latestCareerRequestIdRef.current && resGrowth.ok && jsonGrowth.data) setGrowthHistory(jsonGrowth.data);

      // 9. Fetch Career Readiness
      const resRead = await fetch(`${API_BASE}/student/career-readiness?email=${emailQ}&career_name=${targetQ}`);
      const jsonRead = await resRead.json();
      if (reqId === latestCareerRequestIdRef.current && resRead.ok && jsonRead.data) setCareerReadinessData(jsonRead.data);

    } catch (err) {
      console.error('[SKILL GAP PAGE] Error fetching data:', err);
    } finally {
      if (reqId === latestCareerRequestIdRef.current) {
        setIsLoadingCareerData(false);
      }
    }
  };

  useEffect(() => {
    if (activeCareerName) {
      fetchAllSkillGapData(activeCareerName);
    }
  }, [activeCareerId, activeCareerName, studentEmail]);

  // Handle Career Goal Switch
  const handleCareerChange = (selectedItem) => {
    latestCareerRequestIdRef.current++;
    setCareerSkillData(null);
    setLearningPathData(null);
    setPracticeChallenge(null);
    setInternshipImpact(null);
    setCareerReadinessData(null);
    setSelectedGapSkillName('');

    setActiveCareerId(selectedItem.id);
    setActiveCareerName(selectedItem.name);
  };

  // Handle Focus On Specific Skill Gap
  const handleSelectSkillGap = (skillName) => {
    setSelectedGapSkillName(skillName);
    if (activeCareerName) {
      fetchAllSkillGapData(activeCareerName, skillName);
    }
  };

  // Interactive Handler: Launch & Submit Real Assessment via Modal
  const handleOpenAssessmentModal = async (skillToTest = null) => {
    const targetSkill = skillToTest || selectedGapSkillName;
    if (!targetSkill) return;
    setIsVerifyingAssessment(true);
    setAssessmentResult(null);
    setSelectedAnswers({});
    setAssessmentData(null);
    setAssessmentModalVisible(true);
    try {
      const emailParam = studentEmail ? `&email=${encodeURIComponent(studentEmail)}` : '';
      const careerParam = activeCareerName ? `&career_name=${encodeURIComponent(activeCareerName)}` : '';
      const qRes = await fetch(`${API_BASE}/student/assessment-questions?skill_name=${encodeURIComponent(targetSkill)}${emailParam}${careerParam}`);
      const qJson = await qRes.json();
      
      if (qRes.ok && qJson.data && qJson.data.questions && qJson.data.questions.length > 0) {
        setAssessmentData(qJson.data);
      } else {
        alert(qJson.detail || `No assessment questions available for ${targetSkill} at this time.`);
        setAssessmentModalVisible(false);
      }
    } catch (err) {
      console.error('Error fetching assessment questions:', err);
      alert('Could not load assessment questions.');
      setAssessmentModalVisible(false);
    } finally {
      setIsVerifyingAssessment(false);
    }
  };

  const handleSubmitAssessmentModal = async () => {
    if (!assessmentData) return;
    const questions = assessmentData.questions || [];
    const answeredCount = Object.keys(selectedAnswers).length;
    
    if (answeredCount < questions.length) {
      alert(`Please select an answer for each question (${answeredCount}/${questions.length} answered).`);
      return;
    }

    setIsSubmittingAssessment(true);
    try {
      const evalRes = await fetch(`${API_BASE}/student/submit-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          assessment_id: assessmentData.assessment_id,
          answers: selectedAnswers
        })
      });

      const evalJson = await evalRes.json();
      if (evalRes.ok && evalJson.status === 'success' && evalJson.data) {
        setAssessmentResult(evalJson.data);
        await fetchAllSkillGapData(activeCareerName);
      } else {
        alert(evalJson.message || 'Could not submit assessment.');
      }
    } catch (err) {
      console.error('Error submitting assessment:', err);
      alert('Failed to evaluate assessment submission.');
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const handleSubmitProjectRepo = async () => {
    if (!practiceChallenge) return;
    const topGapSkill = selectedGapSkillName || careerSkillData?.top_gaps?.[0]?.skill_name || '';
    
    let repoUrl = null;
    if (Platform.OS === 'web') {
      repoUrl = window.prompt(`Submit GitHub Repository URL for project "${practiceChallenge.title}" (Skill: ${topGapSkill}):`);
    }
    
    if (!repoUrl) return;
    
    try {
      const res = await fetch(`${API_BASE}/student/submit-project-repo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          challenge_id: practiceChallenge.challenge_id,
          skill_name: topGapSkill,
          repository_url: repoUrl
        })
      });
      const data = await res.json();
      alert(data.message || 'Project repository submitted.');
      await fetchAllSkillGapData(activeCareerName);
    } catch (e) {
      console.error('Error submitting repo:', e);
      alert('Error submitting repo');
    }
  };

  // Interactive Handler: Start / Advance Module Step
  const handleStartModule = async () => {
    if (!learningPathData) return;
    setIsStartingModule(true);
    const topGapSkill = selectedGapSkillName || careerSkillData?.top_gaps?.[0]?.skill_name || '';
    try {
      await fetch(`${API_BASE}/student/learning-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          skill_name: topGapSkill,
          step_number: 2,
          step_title: `2. Advanced ${topGapSkill} Practices`,
          status: 'COMPLETED'
        })
      });
      alert(`Module step completed! Next module unlocked.`);
      await fetchAllSkillGapData(activeCareerName);
    } catch (err) {
      console.error('Error updating module:', err);
    } finally {
      setIsStartingModule(false);
    }
  };

  // Interactive Handler: Advance Practice Challenge
  const handleStartChallenge = async () => {
    if (!practiceChallenge) return;
    setIsUpdatingChallenge(true);
    const topGapSkill = selectedGapSkillName || careerSkillData?.top_gaps?.[0]?.skill_name || '';
    const nextStep = Math.min(3, (practiceChallenge.progress_step || 0) + 1);
    try {
      await fetch(`${API_BASE}/student/practice-attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          challenge_id: practiceChallenge.challenge_id,
          skill_name: topGapSkill,
          progress_step: nextStep,
          is_completed: nextStep === 3
        })
      });
      alert(`Challenge progress step ${nextStep}/3 updated successfully!`);
      await fetchAllSkillGapData(activeCareerName);
    } catch (err) {
      console.error('Error updating challenge:', err);
    } finally {
      setIsUpdatingChallenge(false);
    }
  };

  // Process data from backend
  const studentVerifiedSkills = careerSkillData?.student?.verified_skills || careerSkillData?.student_verified_skills || [];
  const careerSkills = careerSkillData?.all_skills || [];
  const skillGaps = careerSkillData?.skill_gaps || [];
  const topGaps = careerSkillData?.top_gaps || [];

  const strengths = careerSkillData?.strengths || [];
  const developingSkills = careerSkillData?.developing_skills || [];
  const prioritySkills = careerSkillData?.priority_skills || [];
  const careerReadiness = careerSkillData?.career_readiness || careerReadinessData || null;
  const careerAlignment = careerSkillData?.career_alignment || null;
  const employerSkillFit = careerSkillData?.employer_skill_fit || careerAlignment || null;
  const careerMarketSkills = careerSkillData?.career_market_skills || [];
  const careerRoleMatches = careerSkillData?.career_role_matches ?? null;
  const highestMatch = careerRoleMatches?.highest_match ?? null;
  const allRoleMatches = careerRoleMatches?.all_roles ?? [];
  const otherRoleMatches = useMemo(() => {
    if (!highestMatch || !allRoleMatches.length) return allRoleMatches;
    return allRoleMatches.filter(r => r.career_id !== highestMatch.career_id && r.career_name !== highestMatch.career_name);
  }, [highestMatch, allRoleMatches]);

  const verifiedSkillsCount = careerSkillData?.student?.verified_skill_count ?? (careerSkillData?.student_verified_skills_count ?? studentVerifiedSkills.length);
  const strictESCOMatchScore = careerSkillData?.strict_esco_match_score ?? (careerSkillData?.career_match?.score ?? 0);
  const careerMatchPct = strictESCOMatchScore;

  const marketDevelopingSkills = careerMarketSkills.filter(m => m.status === 'DEVELOPING');
  const marketMissingSkills = careerMarketSkills.filter(m => m.status === 'MISSING');
  const marketPrioritySkills = careerMarketSkills.filter(m => m.status === 'MISSING' || m.status === 'DEVELOPING');

  // Single Source of Truth: Canonical ESCO Skill Gaps
  const skillGapsList = useMemo(() => {
    if (careerIntel?.skill_gaps && Array.isArray(careerIntel.skill_gaps)) {
      return careerIntel.skill_gaps;
    }
    if (careerIntel?.skills && Array.isArray(careerIntel.skills)) {
      return careerIntel.skills.filter(sk => {
        const curr = Number(sk.current_score ?? 0);
        const tgt = Number(sk.target_score ?? 85);
        const isVer = sk.status === 'Verified' || sk.canonical_status === 'verified';
        return curr < tgt && !isVer;
      });
    }
    return [];
  }, [careerIntel]);

  const gapSkillsCount = skillGapsList.length || marketPrioritySkills.length;
  const topMarketGaps = marketPrioritySkills.slice(0, 3);
  const topGapSubject = selectedGapSkillName || skillGapsList[0]?.skill_name || topMarketGaps[0]?.skill || careerSkillData?.top_gaps?.[0]?.skill_name || '';

  const readiness = heroData?.readiness || null;
  const overall = readiness?.overall ?? careerReadiness?.score ?? careerReadinessData?.overall_readiness ?? null;
  const gapCards = (skillGapsList.length
    ? skillGapsList.map((g) => ({ name: g.skill_name, current: Math.round(g.current_score ?? 0), target: Math.round(g.target_score ?? 85), status: g.status, why: g.gap_explanation, importance: g.career_importance || g.importance }))
    : topMarketGaps.map((m) => ({ name: m.skill, current: m.student_level ?? 0, target: 80, status: m.status, why: null, importance: m.importance }))
  ).slice(0, 4);
  const modules = learningPathData?.modules || [];
  const hasCareers = targetCareersList.length > 0;

  const statusTone = (s = '') => {
    const v = String(s).toUpperCase();
    if (v.includes('VERIFIED') || v === 'STRONG' || v === 'MATCHED') return 'success';
    if (v.includes('DEVELOP') || v.includes('PARTIAL')) return 'info';
    if (v.includes('MISSING')) return 'danger';
    return 'warning';
  };

  const aside = (
    <>
      <SectionTitle title="Evidence" emoji="🔍" />
      {internshipImpact ? (
        <EventCard
          tone="success"
          icon="TrendingUp"
          type="Internship impact"
          date={internshipImpact.target_skill}
          title={`+${Math.max(0, (internshipImpact.projected_match ?? 0) - (internshipImpact.current_match ?? 0))}% match if you close this gap`}
          body={`${internshipImpact.current_match ?? 0}% → ${internshipImpact.projected_match ?? 0}% for ${internshipImpact.career_name || activeCareerName}. Unlocks ${internshipImpact.unlocked_positions ?? 0} more roles.`}
          onPress={() => onNavigate && onNavigate('Opportunities')}
        />
      ) : null}
      {highestMatch ? (
        <EventCard
          tone="accent"
          icon="Target"
          type="Best role match"
          date={`${highestMatch.match_score ?? '—'}%`}
          title={highestMatch.career_name}
          body={highestMatch.explanation || highestMatch.level}
          footer={
            otherRoleMatches.length ? (
              <Txt variant="caption" weight={600} tone="ink" numberOfLines={2} align="center">
                Also: {otherRoleMatches.slice(0, 3).map((r) => `${r.career_name} ${r.match_score ?? ''}%`).join(' · ')}
              </Txt>
            ) : null
          }
        />
      ) : null}
      {practiceChallenge ? (
        <EventCard
          tone="warning"
          icon="Rocket"
          type="Project challenge"
          date={`Step ${practiceChallenge.progress_step || 0}/${practiceChallenge.total_steps || 3}`}
          title={practiceChallenge.title}
          body={practiceChallenge.description}
          footer={
            <Row gap={8} justify="center" wrap>
              <Button label={practiceChallenge.is_completed ? 'Completed' : 'Mark step done'} size="sm" variant="light" onPress={handleStartChallenge} loading={isUpdatingChallenge} disabled={practiceChallenge.is_completed} />
              <Button label="Submit repo" icon="GitBranch" size="sm" onPress={handleSubmitProjectRepo} />
            </Row>
          }
        />
      ) : null}
      {assessmentHistory.slice(0, 3).map((a, i) => (
        <EventCard
          key={a.id || i}
          tone="info"
          icon="ShieldCheck"
          type="Assessment"
          date={a.completed_at ? String(a.completed_at).slice(0, 10) : ''}
          title={a.test_title}
          body={`Score ${a.score ?? '—'}% · ${a.status || ''}`}
        />
      ))}
      {projectVerifications.slice(0, 3).map((p, i) => (
        <EventCard
          key={p.repository_url || i}
          tone="neutral"
          icon="GitBranch"
          type={p.scan_status || 'Project scan'}
          date={p.primary_language}
          title={p.repository_name}
          body={[p.evidence_status, p.last_scanned].filter(Boolean).join(' · ')}
          onPress={p.repository_url ? () => (Platform.OS === 'web' ? window.open(p.repository_url, '_blank', 'noopener,noreferrer') : null) : undefined}
        />
      ))}
      {!internshipImpact && !highestMatch && !assessmentHistory.length && !projectVerifications.length ? (
        <EmptyState icon="ShieldCheck" title="No evidence yet" message="Take an assessment or solve a practice challenge to start building verified evidence." />
      ) : null}
    </>
  );

  if (!hasCareers) {
    return (
      <Page>
        <SectionTitle title="Skills" emoji="🧠" subtitle="Your verified skills and the gaps to your target role." />
        <Card>
          <EmptyState
            icon="Target"
            title="Choose a target career first"
            message="Skill gaps, assessments and practice are calculated against the careers you are aiming for."
            action={<Button label="Set career goals" icon="Target" onPress={() => onNavigate && onNavigate('Profile')} />}
          />
        </Card>
      </Page>
    );
  }

  return (
    <Page aside={aside}>
      <SectionTitle
        title="Skills"
        emoji="🧠"
        subtitle={heroData?.benchmark?.name || `Benchmarked against ${activeCareerName}`}
        right={<Button label="Take assessment" icon="Target" onPress={() => handleOpenAssessmentModal(topGapSubject)} />}
      />

      {targetCareersList.length > 1 ? (
        <SegmentedTabs
          options={targetCareersList.map((c) => ({ id: c.id, label: c.name, icon: 'Target' }))}
          value={activeCareerId}
          onChange={(id) => handleCareerChange(targetCareersList.find((c) => c.id === id))}
          scrollable={!isWide}
        />
      ) : null}

      <View style={[styles.grid, isWide ? styles.gridRow : null]}>
        <Card style={isWide ? { flex: 1.1 } : null}>
          <Row justify="space-between" align="flex-start" gap={space.md}>
            <Stack gap={4} style={{ flex: 1 }}>
              <Txt variant="overline" tone="subtle">Career readiness</Txt>
              <Txt variant="h2" tone="ink">{activeCareerName}</Txt>
              {heroData?.cohort?.rank_display ? <Pill label={`${heroData.cohort.rank_display} of ${heroData.cohort.total_candidates} students`} tone="accent" icon="Users" size="sm" /> : null}
            </Stack>
            <Ring value={overall || 0} size={96} stroke={10} tone="success">
              <Txt variant="h2" tone="ink">{isLoadingCareerData && overall == null ? '…' : overall != null ? `${overall}%` : '—'}</Txt>
            </Ring>
          </Row>
          {readiness ? (
            <Stack gap={10} style={{ marginTop: space.md }}>
              {[
                ['Technical', readiness.technical, 'info'],
                ['Practical', readiness.practical, 'accent'],
                ['Evidence', readiness.evidence, 'warning'],
              ].map(([label, v, tone]) => (
                <Row key={label} gap={10}>
                  <Txt variant="small" tone="muted" style={{ width: 72 }}>{label}</Txt>
                  <ProgressBar value={v || 0} tone={tone} style={{ flex: 1 }} />
                  <Txt variant="small" weight={700} tone="ink" style={{ width: 38, textAlign: 'right' }}>{v ?? 0}%</Txt>
                </Row>
              ))}
            </Stack>
          ) : null}
          {heroData?.baseline ? (
            <Txt variant="caption" tone="muted" style={{ marginTop: space.sm }}>
              {heroData.baseline.delta_display} vs role entry baseline ({heroData.baseline.baseline_score}%) · {heroData.baseline.delta_label}
            </Txt>
          ) : null}
        </Card>
        <View style={isWide ? { flex: 1, gap: space.md } : { gap: space.md }}>
          <StatTrio
            items={[
              { value: verifiedSkillsCount, label: 'Verified skills', tone: 'success' },
              { value: gapSkillsCount, label: 'Skill gaps', tone: 'warning' },
              { value: `${employerSkillFit?.score ?? strictESCOMatchScore ?? 0}%`, label: 'Employer fit', dashed: true },
            ]}
          />
          {strengths.length ? (
            <Card padding={space.lg}>
              <Txt variant="overline" tone="subtle">Your strengths</Txt>
              <Row wrap gap={6} style={{ marginTop: 8 }}>
                {strengths.slice(0, 8).map((s) => (
                  <Pill key={s.skill_id || s.skill_name} label={s.student_friendly_name || s.skill_name} tone="success" icon="Check" size="sm" />
                ))}
              </Row>
            </Card>
          ) : null}
        </View>
      </View>

      <SectionTitle title="Priority gaps" size="h2" subtitle="Focus on one at a time — the learning path and practice lab follow your focus." />
      {isLoadingCareerData && !gapCards.length ? (
        <Stack gap={space.md}>
          <Skeleton height={120} radius={radii.xl} />
          <Skeleton height={120} radius={radii.xl} />
        </Stack>
      ) : gapCards.length ? (
        <Timeline
          gap={space.md}
          items={gapCards.map((g) => {
            const focused = g.name === selectedGapSkillName;
            return {
              key: g.name,
              done: focused,
              content: focused ? (
                <FeatureCard>
                  <Row justify="space-between" align="flex-start" gap={space.md}>
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Txt variant="overline" color={colors.lilacInk}>In focus</Txt>
                      <Txt variant="h2" tone="ink">{g.name}</Txt>
                      {g.why ? <Txt variant="small" color={colors.lilacInk} numberOfLines={2}>{g.why}</Txt> : null}
                    </Stack>
                    <Ring value={g.current} size={64} stroke={7} tone="dark" track="rgba(255,255,255,0.6)">
                      <Txt variant="small" weight={700} tone="ink">{g.current}%</Txt>
                    </Ring>
                  </Row>
                  <Row justify="space-between" style={{ marginTop: space.md }} wrap gap={8}>
                    <Pill label={`Target ${g.target}%`} tone="neutral" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }} icon="Target" />
                    <Row gap={8}>
                      <Button label="Assess" size="sm" variant="light" icon="ShieldCheck" onPress={() => handleOpenAssessmentModal(g.name)} />
                      <Button label="Learn" size="sm" icon="BookOpen" onPress={() => onNavigate && onNavigate('Learning', { selectedSkillName: g.name })} />
                    </Row>
                  </Row>
                </FeatureCard>
              ) : (
                <Card padding={space.lg} onPress={() => handleSelectSkillGap(g.name)}>
                  <Row justify="space-between">
                    <Txt variant="title" tone="ink">{g.name}</Txt>
                    <Pill label={String(g.status || 'Gap').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())} tone={statusTone(g.status)} size="sm" />
                  </Row>
                  <Row gap={10} style={{ marginTop: 10 }}>
                    <ProgressBar value={g.current} tone="warning" style={{ flex: 1 }} />
                    <Txt variant="small" tone="muted">{g.current}% / {g.target}%</Txt>
                  </Row>
                </Card>
              ),
            };
          })}
        />
      ) : (
        <Card>
          <EmptyState icon="CircleCheck" tone="success" title="No gaps found" message={`You meet the core requirements for ${activeCareerName}.`} />
        </Card>
      )}

      {careerMarketSkills.length ? (
        <Card>
          <Row justify="space-between" style={{ marginBottom: space.md }}>
            <Stack gap={2}>
              <Txt variant="h2" tone="ink">Skill matrix</Txt>
              <Txt variant="small" tone="muted">What employers ask for in {activeCareerName}, and where you stand.</Txt>
            </Stack>
          </Row>
          <Stack gap={4}>
            {careerMarketSkills.map((m) => (
              <Pressable
                key={m.skill}
                onPress={() => handleSelectSkillGap(m.skill)}
                style={({ hovered }) => [styles.matrixRow, hovered ? { backgroundColor: colors.surfaceMuted } : null, webOnly({ cursor: 'pointer' })]}
              >
                <Stack gap={0} style={{ flex: 1.3, minWidth: 0 }}>
                  <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{m.skill}</Txt>
                  <Txt variant="caption" tone="muted">{m.importance} · demand {m.demand_score ?? '—'}</Txt>
                </Stack>
                {isTablet ? <ProgressBar value={m.student_level || 0} tone={statusTone(m.status)} style={{ flex: 1 }} /> : null}
                <Txt variant="small" weight={700} tone="ink" style={{ width: 42, textAlign: 'right' }}>{m.student_level ?? 0}%</Txt>
                <Pill label={String(m.status || '').toLowerCase()} tone={statusTone(m.status)} size="sm" style={{ minWidth: 86, justifyContent: 'center' }} />
              </Pressable>
            ))}
          </Stack>
        </Card>
      ) : null}

      <View style={[styles.grid, isWide ? styles.gridRow : null]}>
        <View style={isWide ? { flex: 0.85, minWidth: 0 } : null}>
          <Card badge={{ icon: 'BookOpen', tone: 'pink' }}>
            <Txt variant="h2" tone="ink">Learning path</Txt>
            <Txt variant="small" tone="muted" style={{ marginBottom: space.md }}>
              {learningPathData?.gap_skill ? `Modules for ${learningPathData.gap_skill}` : 'Modules for your focused gap'}
            </Txt>
            {modules.length ? (
              <Timeline
                gap={space.sm}
                items={modules.map((mod) => ({
                  key: mod.step_number,
                  done: String(mod.status).toUpperCase() === 'COMPLETED',
                  content: (
                    <View style={styles.moduleRow}>
                      <Txt variant="small" weight={700} tone="ink">{mod.title}</Txt>
                      <Txt variant="caption" tone="muted">{[mod.provider, mod.duration, mod.difficulty].filter(Boolean).join(' · ')}</Txt>
                      <Pill label={String(mod.status || 'Locked').toLowerCase()} tone={String(mod.status).toUpperCase() === 'COMPLETED' ? 'success' : String(mod.status).toUpperCase() === 'ACTIVE' ? 'info' : 'neutral'} size="sm" style={{ marginTop: 6 }} />
                    </View>
                  ),
                }))}
              />
            ) : (
              <Txt variant="small" tone="subtle">No modules yet.</Txt>
            )}
            <Row gap={8} style={{ marginTop: space.md }}>
              {modules.length ? <Button label="Complete current step" size="sm" icon="Check" onPress={handleStartModule} loading={isStartingModule} /> : null}
              <Button label="Open learning plan" size="sm" variant="secondary" onPress={() => onNavigate && onNavigate('Learning')} />
            </Row>
          </Card>
        </View>
        <View style={isWide ? { flex: 1.15, minWidth: 0 } : null}>
          <PracticeLab
            topGapSubject={topGapSubject}
            studentEmail={studentEmail}
            activeCareerName={activeCareerName}
            selectedGapSkillName={selectedGapSkillName}
            onRefreshSkillData={() => fetchAllSkillGapData(activeCareerName)}
          />
        </View>
      </View>

      <AssessmentSheet
        visible={assessmentModalVisible}
        onClose={() => setAssessmentModalVisible(false)}
        assessmentData={assessmentData}
        selectedAnswers={selectedAnswers}
        setSelectedAnswers={setSelectedAnswers}
        isSubmittingAssessment={isSubmittingAssessment}
        onSubmit={handleSubmitAssessmentModal}
        assessmentResult={assessmentResult}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: space.md,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
  },
  moduleRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: space.sm,
  },
});
