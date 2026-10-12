import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  fetchCareerIntelligence,
  updateCourseProgress
} from '../services/careerIntelligenceService';

// Subcomponents & Design Tokens
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ensureSkillGlobalStyles,
} from './components/DesignTokens';
import AmbientBackground from './components/AmbientBackground';
import SkillHero from './components/SkillHero';
import SkillSummaryMetrics from './components/SkillSummaryMetrics';
import InternshipTelemetrySection from './components/InternshipTelemetrySection';
import SkillGrowthTrajectory from './components/SkillGrowthTrajectory';
import CareerRoleMatchSection from './components/CareerRoleMatchSection';
import SkillGapEngineSection from './components/SkillGapEngineSection';
import RequiredSkillMatrix from './components/RequiredSkillMatrix';
import CompleteSkillProfileSection from './components/CompleteSkillProfileSection';
import TargetedLearningAndPracticeSection from './components/TargetedLearningAndPracticeSection';
import HistoricalEvidenceSection from './components/HistoricalEvidenceSection';
import SkillAssessmentModal from './components/SkillAssessmentModal';
import SkillFooter from './components/SkillFooter';

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

  // Inject Google Fonts and animation keyframes on web
  useEffect(() => {
    ensureSkillGlobalStyles();
  }, []);

  const [taxonomyCareersMap, setTaxonomyCareersMap] = useState({});

  // Fetch taxonomy reference for ID -> Name mapping
  useEffect(() => {
    let isMounted = true;
    async function fetchTaxonomyReference() {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/taxonomy/careers?limit=100');
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
    } else {
      rawList = ['Backend Developer'];
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
      fetch(`http://127.0.0.1:8000/api/v1/student/skill-hero?email=${emailQ}&career_name=${targetQ}`)
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
      const resGaps = await fetch(`http://127.0.0.1:8000/api/v1/student/career-skill-gaps?email=${emailQ}&target_career=${targetQ}`);
      const jsonGaps = await resGaps.json();
      
      // Prevent stale responses if user switched career while request was in-flight
      if (reqId !== latestCareerRequestIdRef.current) return;

      if (resGaps.ok && jsonGaps.status === 'success' && jsonGaps.data) {
        setCareerSkillData(jsonGaps.data);
      } else {
        setCareerSkillData(null);
      }

      // Determine top / active gap skill
      const topGapSkill = overrideSkill || selectedGapSkillName || intelRes?.skill_gaps?.[0]?.skill_name || jsonGaps.data?.top_gaps?.[0]?.skill_name || 'JavaScript';
      if (!selectedGapSkillName || overrideSkill) {
        setSelectedGapSkillName(topGapSkill);
      }

      // 3. Fetch Personalized Learning Path
      const resPath = await fetch(`http://127.0.0.1:8000/api/v1/student/learning-path?email=${emailQ}&career_name=${targetQ}&gap_skill=${encodeURIComponent(topGapSkill)}`);
      const jsonPath = await resPath.json();
      if (reqId === latestCareerRequestIdRef.current && resPath.ok && jsonPath.data) setLearningPathData(jsonPath.data);

      // 4. Fetch Practice Challenge
      const resPrac = await fetch(`http://127.0.0.1:8000/api/v1/student/practice-challenge?email=${emailQ}&gap_skill=${encodeURIComponent(topGapSkill)}`);
      const jsonPrac = await resPrac.json();
      if (reqId === latestCareerRequestIdRef.current && resPrac.ok && jsonPrac.data) setPracticeChallenge(jsonPrac.data);

      // 5. Fetch Assessment History
      const resAssess = await fetch(`http://127.0.0.1:8000/api/v1/student/assessment-history?email=${emailQ}`);
      const jsonAssess = await resAssess.json();
      if (reqId === latestCareerRequestIdRef.current && resAssess.ok && jsonAssess.data) setAssessmentHistory(jsonAssess.data);

      // 6. Fetch Project Verifications
      const resProj = await fetch(`http://127.0.0.1:8000/api/v1/student/project-verifications?email=${emailQ}`);
      const jsonProj = await resProj.json();
      if (reqId === latestCareerRequestIdRef.current && resProj.ok && jsonProj.data) setProjectVerifications(jsonProj.data);

      // 7. Fetch Internship Impact
      const resImpact = await fetch(`http://127.0.0.1:8000/api/v1/student/internship-impact?email=${emailQ}&career_name=${targetQ}&gap_skill=${encodeURIComponent(topGapSkill)}`);
      const jsonImpact = await resImpact.json();
      if (reqId === latestCareerRequestIdRef.current && resImpact.ok && jsonImpact.data) setInternshipImpact(jsonImpact.data);

      // 8. Fetch Skill Growth History
      const resGrowth = await fetch(`http://127.0.0.1:8000/api/v1/student/skill-growth-history?email=${emailQ}&career_name=${targetQ}`);
      const jsonGrowth = await resGrowth.json();
      if (reqId === latestCareerRequestIdRef.current && resGrowth.ok && jsonGrowth.data) setGrowthHistory(jsonGrowth.data);

      // 9. Fetch Career Readiness
      const resRead = await fetch(`http://127.0.0.1:8000/api/v1/student/career-readiness?email=${emailQ}&career_name=${targetQ}`);
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
    const targetSkill = skillToTest || selectedGapSkillName || 'JavaScript';
    setIsVerifyingAssessment(true);
    setAssessmentResult(null);
    setSelectedAnswers({});
    setAssessmentData(null);
    setAssessmentModalVisible(true);
    try {
      const emailParam = studentEmail ? `&email=${encodeURIComponent(studentEmail)}` : '';
      const careerParam = activeCareerName ? `&career_name=${encodeURIComponent(activeCareerName)}` : '';
      const qRes = await fetch(`http://127.0.0.1:8000/api/v1/student/assessment-questions?skill_name=${encodeURIComponent(targetSkill)}${emailParam}${careerParam}`);
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
      const evalRes = await fetch('http://127.0.0.1:8000/api/v1/student/submit-assessment', {
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
    const topGapSkill = selectedGapSkillName || careerSkillData?.top_gaps?.[0]?.skill_name || 'JavaScript';
    
    let repoUrl = null;
    if (Platform.OS === 'web') {
      repoUrl = window.prompt(`Submit GitHub Repository URL for project "${practiceChallenge.title}" (Skill: ${topGapSkill}):`);
    }
    
    if (!repoUrl) return;
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/student/submit-project-repo', {
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
    const topGapSkill = selectedGapSkillName || careerSkillData?.top_gaps?.[0]?.skill_name || 'JavaScript';
    try {
      await fetch('http://127.0.0.1:8000/api/v1/student/learning-progress', {
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
    const topGapSkill = selectedGapSkillName || careerSkillData?.top_gaps?.[0]?.skill_name || 'JavaScript';
    const nextStep = Math.min(3, (practiceChallenge.progress_step || 0) + 1);
    try {
      await fetch('http://127.0.0.1:8000/api/v1/student/practice-attempt', {
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
  const topGapSubject = selectedGapSkillName || skillGapsList[0]?.skill_name || topMarketGaps[0]?.skill || careerSkillData?.top_gaps?.[0]?.skill_name || 'JavaScript';

  return (
    <View style={styles.container}>
      {/* Ambient background flowing spheres */}
      <AmbientBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Skill Hero Header with Target Career Selector & Readiness Gauge */}
        <SkillHero
          heroData={heroData}
          activeCareerId={activeCareerId}
          activeCareerName={activeCareerName}
          targetCareersList={targetCareersList}
          onCareerChange={handleCareerChange}
          isLoadingCareerData={isLoadingCareerData}
          careerSkillData={careerSkillData}
          careerIntel={careerIntel}
          verifiedSkillsCount={verifiedSkillsCount}
          gapSkillsCount={gapSkillsCount}
          careerMatchPct={careerMatchPct}
          projectVerificationsCount={projectVerifications.length}
        />

        {/* Section 2: 4 Top Horizontal Summary Metric Cards */}
        <SkillSummaryMetrics
          verifiedSkillsCount={verifiedSkillsCount}
          gapSkillsCount={gapSkillsCount}
          developingCount={marketDevelopingSkills.length}
          missingCount={marketMissingSkills.length}
          employerFitScore={employerSkillFit?.score ?? strictESCOMatchScore}
          unlockedInternships={internshipImpact?.unlocked_positions ?? 0}
        />

        {/* Section 3: Real-World Verification / Internship Impact & Telemetry */}
        <InternshipTelemetrySection
          internshipImpact={internshipImpact}
          activeCareerName={activeCareerName}
          careerMatchPct={careerMatchPct}
          projectVerifications={projectVerifications}
          onSubmitRepo={handleSubmitProjectRepo}
          topGapSubject={topGapSubject}
        />

        {/* Section 4: Longitudinal Telemetry / Skill Growth & Trajectory */}
        <SkillGrowthTrajectory
          growthHistory={growthHistory}
          studentVerifiedSkills={studentVerifiedSkills}
          careerMarketSkills={careerMarketSkills}
        />

        {/* Section 5: AI Recruiter Compatibility Index / Your Career Role Match */}
        <CareerRoleMatchSection
          highestMatch={highestMatch}
          otherRoleMatches={otherRoleMatches}
          activeCareerName={activeCareerName}
          onNavigate={onNavigate}
        />

        {/* Section 6: High-Priority Skill Gaps / Skill Gap Engine */}
        <SkillGapEngineSection
          topMarketGaps={topMarketGaps}
          skillGapsList={skillGapsList}
          activeCareerName={activeCareerName}
          selectedGapSkillName={selectedGapSkillName}
          onSelectSkillGap={handleSelectSkillGap}
          onOpenAssessmentModal={handleOpenAssessmentModal}
        />

        {/* Section 7: Required Skill Matrix & Competency Inventory */}
        <RequiredSkillMatrix
          skillGapsList={skillGapsList}
          studentVerifiedSkills={studentVerifiedSkills}
          careerMarketSkills={careerMarketSkills}
          activeCareerName={activeCareerName}
          selectedGapSkillName={selectedGapSkillName}
          highlightedSkillId={highlightedSkillId}
          highlightedCourseId={highlightedCourseId}
          onSelectSkillGap={handleSelectSkillGap}
          onClearFilter={() => {
            setHighlightedSkillId(null);
            setHighlightedCourseId(null);
          }}
          onNavigate={onNavigate}
          onOpenAssessmentModal={handleOpenAssessmentModal}
        />

        {/* Section 8: Your Skill Profile Bento Comparison & Domain Profiles */}
        <CompleteSkillProfileSection
          careerMarketSkills={careerMarketSkills}
          studentVerifiedSkills={studentVerifiedSkills}
          topMarketGaps={topMarketGaps}
          activeCareerName={activeCareerName}
        />

        {/* Section 9: Recommended Curriculum / Real-Time Adaptive Coding Practice */}
        <TargetedLearningAndPracticeSection
          learningPathData={learningPathData}
          topGapSubject={topGapSubject}
          studentEmail={studentEmail}
          activeCareerName={activeCareerName}
          selectedGapSkillName={selectedGapSkillName}
          isStartingModule={isStartingModule}
          onStartModule={handleStartModule}
          onSubmitProjectRepo={handleSubmitProjectRepo}
          onNavigate={onNavigate}
          onRefreshSkillData={() => fetchAllSkillGapData(activeCareerName)}
        />

        {/* Section 10: Historical Telemetry Log & Verified Skill Dossier */}
        <HistoricalEvidenceSection
          assessmentHistory={assessmentHistory}
          projectVerifications={projectVerifications}
          topGapSubject={topGapSubject}
          onOpenAssessmentModal={handleOpenAssessmentModal}
        />

        {/* Section 11: Bottom Branding Footer */}
        <SkillFooter />
      </ScrollView>

      {/* Interactive Assessment Proctored Modal */}
      <SkillAssessmentModal
        visible={assessmentModalVisible}
        onClose={() => setAssessmentModalVisible(false)}
        assessmentData={assessmentData}
        selectedAnswers={selectedAnswers}
        setSelectedAnswers={setSelectedAnswers}
        isSubmittingAssessment={isSubmittingAssessment}
        onSubmit={handleSubmitAssessmentModal}
        assessmentResult={assessmentResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CLAY_COLORS.canvas,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 60,
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
  },
});
