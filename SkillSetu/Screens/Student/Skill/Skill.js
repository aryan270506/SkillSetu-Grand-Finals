import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  fetchCareerIntelligence,
  updateCourseProgress
} from '../services/careerIntelligenceService';

const COLORS = {
  canvas: '#f9f9f8',       // Warm off-white canvas
  panel: '#f3f4f3',        // Light gray background
  paper: '#ffffff',        // Card white
  ink: '#1a1c1c',          // Dark charcoal text
  muted: '#3d4947',        // Muted gray text
  subtle: '#bcc9c6',       // Border color
  green: '#00685f',        // Primary Teal Green
  greenLight: '#f4fffc',   // Very light primary green
  teal: '#008378',         // Deep Teal accent
  mint: '#f0fdfa',         // Light mint tint
  amber: '#825100',        // Amber
  amberLight: '#ffddb8',   // Light Amber
  rose: '#ba1a1a',         // Error Red
  roseLight: '#ffdad6',    // Light Red
  blue: '#545f73',         // Slate Blue
  blueLight: '#d5e0f8',    // Light Blue
};

// Reuse HoverableCard helper for desktop/web animations
function HoverableCard({ children, style, containerStyle, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.005,
          friction: 8,
          tension: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shadow, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === 'web') {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.0,
          friction: 8,
          tension: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shadow, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  const shadowOpacity = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.02, 0.08],
  });

  const shadowRadius = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 12],
  });

  const flatStyle = StyleSheet.flatten(style);
  const containerLayout = {};
  if (flatStyle) {
    if (flatStyle.flex !== undefined) containerLayout.flex = flatStyle.flex;
    if (flatStyle.width !== undefined) containerLayout.width = flatStyle.width;
    if (flatStyle.margin !== undefined) containerLayout.margin = flatStyle.margin;
    if (flatStyle.marginTop !== undefined) containerLayout.marginTop = flatStyle.marginTop;
    if (flatStyle.marginBottom !== undefined) containerLayout.marginBottom = flatStyle.marginBottom;
    if (flatStyle.marginLeft !== undefined) containerLayout.marginLeft = flatStyle.marginLeft;
    if (flatStyle.marginRight !== undefined) containerLayout.marginRight = flatStyle.marginRight;
  }

  const animatedStyle = {
    transform: [{ scale }],
    shadowColor: '#1e293b',
    shadowOpacity,
    shadowRadius,
    shadowOffset: { width: 0, height: 2 },
  };

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={[containerLayout, containerStyle]}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function Skill({ profileData, user, setProfileData, navigationParams, onNavigate }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;

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
  const [showCareerDropdown, setShowCareerDropdown] = useState(false);

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
    // Invalidate any in-flight request
    latestCareerRequestIdRef.current++;
    
    // Clear previous career-dependent state immediately to prevent stale data display
    setCareerSkillData(null);
    setLearningPathData(null);
    setPracticeChallenge(null);
    setInternshipImpact(null);
    setCareerReadinessData(null);
    setSelectedGapSkillName('');

    setActiveCareerId(selectedItem.id);
    setActiveCareerName(selectedItem.name);
    setShowCareerDropdown(false);
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
    try {
      const qRes = await fetch(`http://127.0.0.1:8000/api/v1/student/assessment-questions?skill_name=${encodeURIComponent(targetSkill)}`);
      const qJson = await qRes.json();
      
      if (qRes.ok && qJson.data && qJson.data.questions && qJson.data.questions.length > 0) {
        setAssessmentData(qJson.data);
        setAssessmentModalVisible(true);
      } else {
        alert(`No assessment questions available for ${targetSkill} at this time.`);
      }
    } catch (err) {
      console.error('Error fetching assessment questions:', err);
      alert('Could not load assessment questions.');
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

  // Process separate state concepts from backend response contract
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

  // Single Source of Truth: Canonical ESCO Skill Gaps (ONLY skills with current < target and not verified)
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      
      {/* Header section with target career selector */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Skill Intelligence</Text>
          <Text style={styles.subtitle}>
            Understand your strengths, identify your skill gaps, and build the skills required for your career goals.
          </Text>
        </View>

        <View style={styles.targetCareerCard}>
          <View style={styles.targetCareerMeta}>
            <Text style={styles.targetCareerMetaLabel}>TARGET CAREER</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.targetCareerValue}>{activeCareerName || 'Select Career'}</Text>
              {isLoadingCareerData && <ActivityIndicator size="small" color={COLORS.green} />}
            </View>
          </View>
          <Pressable 
            style={styles.changeGoalBtn}
            onPress={() => setShowCareerDropdown(!showCareerDropdown)}
          >
            <Text style={styles.changeGoalBtnText}>change career goal</Text>
          </Pressable>

          {showCareerDropdown && (
            <View style={styles.dropdownMenu}>
              {targetCareersList.map((carItem) => {
                const isActive = carItem.id === activeCareerId || carItem.name === activeCareerName;
                return (
                  <Pressable
                    key={carItem.id}
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                    onPress={() => handleCareerChange(carItem)}
                  >
                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                      {carItem.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* 4 Summary Stats Cards Row */}
      <View style={[styles.statsRow, !isTablet && styles.flexCol]}>
        
        {/* Card 1: Verified Skills */}
        <HoverableCard style={styles.statCard} containerStyle={styles.statCardContainer}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statIcon, { color: '#00685f' }]}>🛡️</Text>
            <Text style={styles.statNumber}>{verifiedSkillsCount}</Text>
          </View>
          <Text style={[styles.statTitle, { color: '#00685f' }]}>VERIFIED SKILLS</Text>
          <Text style={styles.statDesc}>Across key career domains</Text>
        </HoverableCard>

        {/* Card 2: Skills to Strengthen */}
        <HoverableCard style={styles.statCard} containerStyle={styles.statCardContainer}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statIcon, { color: COLORS.rose }]}>⚠️</Text>
            <Text style={styles.statNumber}>{gapSkillsCount}</Text>
          </View>
          <Text style={[styles.statTitle, { color: COLORS.rose }]}>SKILLS TO STRENGTHEN</Text>
          <Text style={styles.statDesc}>{`${marketDevelopingSkills.length} developing · ${marketMissingSkills.length} to build`}</Text>
        </HoverableCard>

        {/* Card 3: Employer Skill Fit */}
        <HoverableCard style={styles.statCard} containerStyle={styles.statCardContainer}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statIcon, { color: '#3b82f6' }]}>🎯</Text>
            <Text style={styles.statNumber}>{employerSkillFit?.score ?? strictESCOMatchScore}%</Text>
          </View>
          <Text style={[styles.statTitle, { color: '#3b82f6' }]}>EMPLOYER SKILL FIT</Text>
          <Text style={styles.statDesc}>Based on top employer skill demand</Text>
        </HoverableCard>

        {/* Card 4: Internship Match */}
        <HoverableCard style={styles.statCard} containerStyle={styles.statCardContainer}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statIcon, { color: COLORS.amber }]}>💼</Text>
            <Text style={styles.statNumber}>{internshipImpact?.unlocked_positions || 0}</Text>
          </View>
          <Text style={[styles.statTitle, { color: COLORS.amber }]}>INTERNSHIP MATCH</Text>
          <Text style={styles.statDesc}>Matching opportunities</Text>
        </HoverableCard>

      </View>

      {/* Row 1: Skill Profile Chart (Left) & Priority Insights (Right) */}
      <View style={[styles.bentoRow, !isWide && styles.flexCol]}>
        
        {/* Left Card: Your Skill Profile */}
        <HoverableCard style={[styles.card, { flex: 7 }]}>
          <View style={styles.skillProfileHeader}>
            <View>
              <Text style={styles.cardTitle}>Your Skill Profile</Text>
              <Text style={styles.cardSubtitle}>
                CURRENT VERIFIED LEVEL VS REQUIRED LEVEL TO BECOME A {(activeCareerName || 'Target Role').toUpperCase()}
              </Text>
            </View>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: COLORS.green }]} />
                <Text style={styles.legendText}>Current</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: COLORS.subtle }]} />
                <Text style={styles.legendText}>Required</Text>
              </View>
            </View>
          </View>

          {/* Dynamic bar charts (Top Employer Skills) */}
          <View style={styles.skillsProfileBarsList}>
            {careerMarketSkills.length === 0 ? (
              <Text style={styles.statDesc}>Select a target career to view required skills profile.</Text>
            ) : (
              careerMarketSkills.slice(0, 6).map((sk, index) => {
                const isStrong = sk.status === 'STRONG' || sk.student_level >= 70;
                const isDeveloping = sk.status === 'DEVELOPING' || (sk.student_level > 0 && sk.student_level < 70);
                
                const barColor = isStrong ? COLORS.green : (isDeveloping ? COLORS.teal : COLORS.rose);
                const badgeBg = isStrong ? COLORS.greenLight : (isDeveloping ? COLORS.mint : COLORS.roseLight);
                const badgeColor = isStrong ? COLORS.green : (isDeveloping ? COLORS.teal : COLORS.rose);
                const statusLabel = isStrong ? 'STRONG' : (isDeveloping ? 'DEVELOPING' : 'MISSING');

                return (
                  <View key={index} style={styles.skillBarItem}>
                    <Text style={styles.skillBarLabel}>{sk.skill}</Text>
                    
                    <View style={styles.skillBarTracksWrapper}>
                      <View style={styles.skillBarTrack}>
                        <View style={[styles.targetRequiredFill, { width: `100%` }]} />
                        <View style={[styles.currentActualFill, { width: `${sk.student_level}%`, backgroundColor: barColor }]} />
                      </View>
                    </View>

                    <View style={styles.skillBarValueWrapper}>
                      <Text style={[styles.skillBarRatio, { color: barColor }]}>
                        {sk.student_level}/100
                      </Text>
                      <View style={[styles.skillBarStatusBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.skillBarStatusText, { color: badgeColor }]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </HoverableCard>

        {/* Right Card: PRIORITY INSIGHTS */}
        <HoverableCard style={[styles.card, styles.mintCardAccent, { flex: 4 }]}>
          <View style={styles.insightsHeader}>
            <Text style={styles.insightsSparkIcon}>⚡</Text>
            <Text style={styles.insightsHeadingText}>PRIORITY INSIGHTS</Text>
          </View>
          <Text style={styles.insightsSecTitle}>
            Based on your target role, these are the highest-priority skills to strengthen next.
          </Text>

          <View style={styles.insightsCardsList}>
            {topMarketGaps.length === 0 ? (
              <Text style={styles.statDesc}>No high priority skill gaps detected for this career goal!</Text>
            ) : (
              topMarketGaps.map((ins, index) => (
                <View key={index} style={styles.insightMiniCard}>
                  <View style={styles.insightHeaderRow}>
                    <Text style={styles.insightName}>{ins.skill}</Text>
                    <View style={[
                      styles.insightPriorityTag, 
                      ins.importance === 'CORE' ? { backgroundColor: COLORS.roseLight } : { backgroundColor: COLORS.amberLight }
                    ]}>
                      <Text style={[
                        styles.insightPriorityTagText,
                        ins.importance === 'CORE' ? { color: COLORS.rose } : { color: COLORS.amber }
                      ]}>
                        {ins.importance === 'CORE' ? 'HIGH' : 'MED'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.insightScoreLabel}>Score: {ins.student_level}/100</Text>
                  <Text style={styles.insightDesc}>{`High demand ${ins.importance.toLowerCase()} skill for ${activeCareerName || 'target career'}. Current level: ${ins.student_level}%.`}</Text>
                </View>
              ))
            )}
          </View>
        </HoverableCard>

      </View>

      {/* Row 2: Your Complete Skill Profile (Actual Verified Student Skills) */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Your Complete Skill Profile</Text>
        <Text style={styles.cardSubtitle}>Verified technical skills across your repositories, resume, and profile.</Text>

        <View style={[styles.domainsGrid, !isTablet && styles.flexCol]}>
          {/* Column 1: Core & Frontend */}
          <View style={styles.domainColumn}>
            <View style={styles.domainCard}>
              <Text style={styles.domainTitle}>Core Development & Frontend</Text>
              <View style={styles.domainSkillsList}>
                {studentVerifiedSkills.filter(s => s.category === 'Core Development' || s.category === 'Frontend').slice(0, 6).map((sk, skIdx) => (
                  <View key={skIdx} style={styles.domainSkillRow}>
                    <Text style={styles.domainSkillName}>{sk.skill_name}</Text>
                    <View style={styles.domainSkillScoreWrap}>
                      <Text style={styles.domainSkillScore}>{sk.score || sk.current_level}</Text>
                      <View style={[styles.domainBadge, { backgroundColor: (sk.score >= 70 || sk.status === 'VERIFIED') ? COLORS.greenLight : COLORS.mint }]}>
                        <Text style={[styles.domainBadgeText, { color: (sk.score >= 70 || sk.status === 'VERIFIED') ? COLORS.green : COLORS.teal }]}>
                          {sk.verification_status || (sk.score >= 70 ? 'VERIFIED' : 'DEVELOPING')}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Column 2: Backend, Databases & DevOps */}
          <View style={styles.domainColumn}>
            <View style={styles.domainCard}>
              <Text style={styles.domainTitle}>Backend, Databases & Cloud</Text>
              <View style={styles.domainSkillsList}>
                {studentVerifiedSkills.filter(s => s.category === 'Backend & APIs' || s.category === 'Databases' || s.category === 'Cloud & DevOps' || s.category === 'AI / Data').slice(0, 6).map((sk, skIdx) => (
                  <View key={skIdx} style={styles.domainSkillRow}>
                    <Text style={styles.domainSkillName}>{sk.skill_name}</Text>
                    <View style={styles.domainSkillScoreWrap}>
                      <Text style={styles.domainSkillScore}>{sk.score || sk.current_level}</Text>
                      <View style={[styles.domainBadge, { backgroundColor: (sk.score >= 70 || sk.status === 'VERIFIED') ? COLORS.greenLight : COLORS.mint }]}>
                        <Text style={[styles.domainBadgeText, { color: (sk.score >= 70 || sk.status === 'VERIFIED') ? COLORS.green : COLORS.teal }]}>
                          {sk.verification_status || (sk.score >= 70 ? 'VERIFIED' : 'DEVELOPING')}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </HoverableCard>

      {/* Row 3: Skill Gap Engine */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Skill Gap Engine</Text>
        <Text style={styles.cardSubtitle}>Prioritized gaps based on market demand and your current trajectory.</Text>

        <View style={[styles.gapEngineGrid, !isTablet && styles.flexCol]}>
          {topMarketGaps.length === 0 ? (
            <Text style={styles.statDesc}>You are meeting the current skill requirements for this career.</Text>
          ) : (
            topMarketGaps.map((gapItem, idx) => (
              <View key={idx} style={styles.gapEngineCard}>
                <View style={styles.gapEngineHeader}>
                  <Text style={styles.gapEngineName}>{gapItem.skill}</Text>
                  <View style={[styles.gapEngineBadge, { backgroundColor: gapItem.importance === 'CORE' ? COLORS.roseLight : COLORS.amberLight }]}>
                    <Text style={[styles.gapEngineBadgeText, { color: gapItem.importance === 'CORE' ? COLORS.rose : COLORS.amber }]}>
                      PRIORITY {idx + 1}
                    </Text>
                  </View>
                </View>
                <Text style={styles.gapEngineScore}>Score: {gapItem.student_level}/100</Text>
              </View>
            ))
          )}
        </View>
      </HoverableCard>

      {/* Row 4: Gap Analysis */}
      <HoverableCard style={[styles.card, styles.gapAnalysisOutlineCard, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Gap Analysis: {topGapSubject}</Text>
        <Text style={[styles.cardSubtitle, { color: COLORS.rose, fontWeight: '700' }]}>
          Why closing this gap improves your {activeCareerName || 'Career'} Match
        </Text>

        <View style={[styles.gapAnalysisGrid, !isTablet && styles.flexCol]}>
          <View style={styles.gapAnalysisBlock}>
            <Text style={styles.gapAnalysisBlockTitle}>Industry Demand</Text>
            <Text style={styles.gapAnalysisBlockDesc}>Essential skill requirement for {activeCareerName || 'target role'}.</Text>
          </View>
          
          <View style={styles.gapAnalysisBlock}>
            <Text style={styles.gapAnalysisBlockTitle}>GitHub Evidence</Text>
            <Text style={styles.gapAnalysisBlockDesc}>
              {projectVerifications.length > 0 ? `${projectVerifications.length} verified project repositories scanned.` : 'No GitHub repository evidence detected.'}
            </Text>
          </View>
          
          <View style={styles.gapAnalysisBlock}>
            <Text style={styles.gapAnalysisBlockTitle}>Assessment Results</Text>
            <Text style={styles.gapAnalysisBlockDesc}>
              {assessmentHistory.length > 0 ? `Latest score: ${assessmentHistory[0].score}% (${assessmentHistory[0].status})` : 'No assessment attempts recorded yet.'}
            </Text>
          </View>
        </View>
      </HoverableCard>

      {/* Row 4.5: REQUIRED SKILL MATRIX (SKILL-CENTRIC VIEW) */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardTitle}>Required Skill Matrix</Text>
              <View style={{ backgroundColor: COLORS.mint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.green }}>SKILL-CENTRIC VIEW</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>
              Canonical ESCO skills for {activeCareerName || 'target career'} and the exact recommended courses mapped to close each skill gap.
            </Text>
          </View>
        </View>

        {highlightedSkillId || highlightedCourseId ? (
          <View style={{ backgroundColor: COLORS.mint, borderColor: COLORS.green, borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.green }}>
              🎯 Filter active: Highlighting skills {highlightedCourseId ? `addressed by Course ID: ${highlightedCourseId}` : `for selected skill`}
            </Text>
            <Pressable onPress={() => { setHighlightedSkillId(null); setHighlightedCourseId(null); }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.ink }}>✕ Clear Filter</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={{ gap: 14 }}>
          {skillGapsList && skillGapsList.length > 0 ? (
            skillGapsList.map((sk) => {
              const isHighlighted = (highlightedSkillId && (String(sk.skill_id) === String(highlightedSkillId) || String(sk.esco_id) === String(highlightedSkillId))) ||
                (highlightedCourseId && sk.recommended_courses?.some(c => String(c.course_id) === String(highlightedCourseId))) ||
                (selectedGapSkillName && sk.skill_name.toLowerCase() === selectedGapSkillName.toLowerCase());
              const isVerified = sk.status === 'Verified' || sk.canonical_status === 'verified';
              const isLearning = sk.status === 'Learning Active' || sk.canonical_status === 'learning_active' || sk.canonical_status === 'developing';

              return (
                <View
                  key={sk.skill_id || sk.skill_name}
                  style={{
                    backgroundColor: isHighlighted ? '#f0fdf4' : COLORS.panel,
                    borderColor: isHighlighted ? COLORS.green : COLORS.subtle,
                    borderWidth: isHighlighted ? 2 : 1,
                    borderRadius: 10,
                    padding: 16,
                    gap: 12
                  }}
                >
                  {/* Skill Card Header */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 220 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.ink }}>{sk.skill_name}</Text>
                        <View style={{
                          backgroundColor: isVerified ? COLORS.greenLight : (isLearning ? COLORS.mint : COLORS.roseLight),
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}>
                          <Text style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: isVerified ? COLORS.green : (isLearning ? COLORS.teal : COLORS.rose)
                          }}>
                            {sk.status.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: COLORS.muted }}>ID: {sk.skill_id}</Text>
                      </View>

                      <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>
                        Current: <Text style={{ fontWeight: '700', color: COLORS.ink }}>{sk.current_score}%</Text> • Target: <Text style={{ fontWeight: '700', color: COLORS.ink }}>{sk.target_score}%</Text> (Gap: {sk.gap}%)
                      </Text>
                    </View>

                    {/* Gap Action Buttons */}
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Pressable
                        style={{
                          backgroundColor: selectedGapSkillName === sk.skill_name ? COLORS.green : COLORS.paper,
                          borderColor: COLORS.green,
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6
                        }}
                        onPress={() => handleSelectSkillGap(sk.skill_name)}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: selectedGapSkillName === sk.skill_name ? COLORS.paper : COLORS.green }}>
                          {selectedGapSkillName === sk.skill_name ? 'Active Focus ✓' : 'Focus Gap 🎯'}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={{
                          backgroundColor: COLORS.paper,
                          borderColor: COLORS.green,
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 6
                        }}
                        onPress={() => {
                          if (onNavigate) {
                            onNavigate('Learning', { selectedSkillId: sk.skill_id, selectedSkillName: sk.skill_name });
                          }
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.green }}>Explore Courses ➔</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Skill Score Progress Bar */}
                  <View style={{ height: 6, backgroundColor: COLORS.subtle, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, sk.current_score))}%`,
                      backgroundColor: isVerified ? COLORS.green : (isLearning ? COLORS.teal : COLORS.rose)
                    }} />
                  </View>

                  {/* Connected Recommended Courses List */}
                  {sk.recommended_courses && sk.recommended_courses.length > 0 ? (
                    <View style={{ gap: 8, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.muted, letterSpacing: 0.5 }}>
                        RECOMMENDED LEARNING RESOURCES FOR THIS GAP:
                      </Text>
                      {sk.recommended_courses.map((course, cIdx) => {
                        const provSlug = (course.provider || '').toLowerCase();
                        const badgeBg = provSlug.includes('nptel') ? '#e0e7ff' : provSlug.includes('youtube') ? '#fee2e2' : '#fef3c7';
                        const badgeColor = provSlug.includes('nptel') ? '#3730a3' : provSlug.includes('youtube') ? '#dc2626' : '#92400e';
                        const badgeBorder = provSlug.includes('nptel') ? '#c7d2fe' : provSlug.includes('youtube') ? '#fca5a5' : '#fde68a';

                        return (
                          <View
                            key={course.course_id || cIdx}
                            style={{
                              backgroundColor: COLORS.paper,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: COLORS.subtle,
                              padding: 12,
                              gap: 6
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                              <View style={{ flex: 1, minWidth: 200 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>{course.title}</Text>
                                  <View style={{ backgroundColor: badgeBg, borderColor: badgeBorder, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: badgeColor }}>{course.provider_name || course.provider}</Text>
                                  </View>
                                </View>
                                <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
                                  {course.institution || course.instructor ? `${course.institution || course.instructor} • ` : ''}⏱ {course.duration || 'Self-paced'}
                                </Text>
                              </View>

                              {/* Action Buttons */}
                              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                {course.canonical_url && (
                                  <Pressable
                                    style={{ backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.subtle, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                                    onPress={() => Linking.openURL(course.canonical_url)}
                                  >
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.ink }}>🔗 Open Resource</Text>
                                  </Pressable>
                                )}
                              </View>
                            </View>

                            {/* Course Progress in Path */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                              <View style={{ flex: 1, height: 4, backgroundColor: COLORS.subtle, borderRadius: 2, overflow: 'hidden' }}>
                                <View style={{ height: '100%', width: `${course.progress_percent || 0}%`, backgroundColor: COLORS.green }} />
                              </View>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.muted }}>
                                {course.progress_percent || 0}% ({course.status ? course.status.replace('_', ' ') : 'not started'})
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={styles.statDesc}>🎉 Outstanding! You have met or exceeded all required skill thresholds for this career goal.</Text>
          )}
        </View>
      </HoverableCard>

      {/* Row 5: Personalized Learning Path */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Personalized Learning Path: {topGapSubject}</Text>
        <Text style={styles.cardSubtitle}>Guided path to bridge this skill gap.</Text>

        <View style={styles.modulesStepList}>
          {learningPathData?.modules && learningPathData.modules.length > 0 ? (
            learningPathData.modules.map((mod, idx) => {
              const isActive = mod.status === 'ACTIVE';
              const isComp = mod.status === 'COMPLETED';
              return (
                <View key={idx} style={[styles.moduleStepItem, isActive && styles.activeModuleItem, isComp && styles.completedModuleItem]}>
                  <View style={styles.moduleStepLeft}>
                    <Text style={[styles.stepIcon, isComp && { color: COLORS.green }, isActive && { color: COLORS.teal }]}>
                      {isComp ? '✓' : (isActive ? '▶' : '🔒')}
                    </Text>
                    <View>
                      <Text style={styles.stepTitle}>{mod.title}</Text>
                      <Text style={styles.stepSubtitle}>{isComp ? `Completed (${mod.duration})` : `Est: ${mod.duration} • ${mod.provider || 'ESCO Course'}`}</Text>
                    </View>
                  </View>
                  {isActive && (
                    <Pressable style={styles.startModuleBtn} onPress={handleStartModule} disabled={isStartingModule}>
                      {isStartingModule ? <ActivityIndicator size="small" color={COLORS.paper} /> : <Text style={styles.startModuleBtnText}>Start</Text>}
                    </Pressable>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.statDesc}>No learning path is currently available for this skill.</Text>
          )}
        </View>
      </HoverableCard>

      {/* Row 6: Practice & Apply */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Practice & Apply: {topGapSubject}</Text>
        <Text style={styles.cardSubtitle}>Practical challenges to build hands-on experience for {topGapSubject}.</Text>

        {practiceChallenge ? (
          <View style={[styles.practiceChallengeBox, !isTablet && styles.flexCol]}>
            <View style={styles.practiceLeft}>
              <Text style={styles.practiceTitle}>{practiceChallenge.title}</Text>
              <Text style={styles.practiceDesc}>{practiceChallenge.description}</Text>
              <View style={styles.practiceTagRow}>
                {practiceChallenge.tags && practiceChallenge.tags.map((t, idx) => (
                  <View key={idx} style={styles.practiceTag}><Text style={styles.practiceTagText}>{t}</Text></View>
                ))}
              </View>
            </View>

            <View style={styles.practiceRight}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabelText}>Progress</Text>
                <Text style={styles.progressLabelPercent}>
                  {practiceChallenge.is_completed ? 'Completed' : `${practiceChallenge.progress_step || 0}/${practiceChallenge.total_steps || 3} Steps`}
                </Text>
              </View>
              <View style={styles.challengeTrack}>
                <View style={[styles.challengeBarFill, { width: `${((practiceChallenge.progress_step || 0) / (practiceChallenge.total_steps || 3)) * 100}%` }]} />
              </View>

              <Pressable 
                style={[styles.challengeBtn, practiceChallenge.is_completed && styles.challengeBtnDisabled]}
                onPress={handleStartChallenge}
                disabled={isUpdatingChallenge || practiceChallenge.is_completed}
              >
                {isUpdatingChallenge ? (
                  <ActivityIndicator size="small" color={COLORS.green} />
                ) : (
                  <Text style={styles.challengeBtnText}>
                    {practiceChallenge.is_completed ? 'Completed ✓' : (practiceChallenge.progress_step > 0 ? 'Continue Challenge' : 'Start Challenge')}
                  </Text>
                )}
              </Pressable>
              
              <Pressable 
                style={[styles.challengeBtn, { marginTop: 12, backgroundColor: COLORS.blue }]}
                onPress={handleSubmitProjectRepo}
              >
                <Text style={styles.challengeBtnText}>
                  Submit GitHub Repo (Optional)
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Text style={styles.statDesc}>No practice attempts yet.</Text>
        )}
      </HoverableCard>

      {/* Row 7: Assessment History */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <View style={styles.assessmentHistoryHeader}>
          <View>
            <Text style={styles.cardTitle}>Assessment History</Text>
            <Text style={styles.cardSubtitle}>Your latest verification attempts.</Text>
          </View>
          <Pressable 
            style={styles.retakeAssessmentBtn}
            onPress={() => handleOpenAssessmentModal(topGapSubject)}
            disabled={isVerifyingAssessment}
          >
            {isVerifyingAssessment ? (
              <ActivityIndicator size="small" color={COLORS.green} />
            ) : (
              <Text style={styles.retakeAssessmentBtnText}>
                {assessmentHistory.length === 0 
                  ? `Take ${topGapSubject} Assessment` 
                  : (assessmentHistory.some(a => a.skill_name?.toLowerCase() === topGapSubject?.toLowerCase() && a.status === 'VERIFIED')
                      ? `${topGapSubject} Verified ✓` 
                      : `Take ${topGapSubject} Assessment`)}
              </Text>
            )}
          </Pressable>
        </View>

        {assessmentHistory.length === 0 ? (
          <Text style={styles.statDesc}>No assessment attempts recorded yet.</Text>
        ) : (
          assessmentHistory.map((item) => (
            <View key={item.id} style={styles.assessmentHistoryRow}>
              <View>
                <Text style={styles.assessmentTitle}>{item.test_title}</Text>
                <Text style={styles.assessmentDate}>Taken: {item.completed_at}</Text>
              </View>
              <View style={styles.assessmentScoreBlock}>
                <Text style={[styles.assessmentScorePct, item.score >= 70 ? { color: COLORS.green } : { color: COLORS.rose }]}>
                  {item.score}%
                </Text>
                <View style={[styles.assessmentScoreBadge, item.score >= 70 ? { backgroundColor: COLORS.greenLight } : { backgroundColor: COLORS.roseLight }]}>
                  <Text style={[styles.assessmentScoreBadgeText, item.score >= 70 ? { color: COLORS.green } : { color: COLORS.rose }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </HoverableCard>

      {/* Row 8: Project Verification */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Project Verification</Text>
        <Text style={styles.cardSubtitle}>Evidence extracted from your connected repositories.</Text>

        {projectVerifications.length === 0 ? (
          <Text style={styles.statDesc}>No GitHub projects connected.</Text>
        ) : (
          projectVerifications.map((proj, idx) => (
            <View key={idx} style={styles.scanProjectBox}>
              <View style={styles.scanProjectHeader}>
                <View style={styles.scanHeaderLeft}>
                  <Text style={styles.scanFolderIcon}>📁</Text>
                  <View>
                    <Text style={styles.scanProjectTitle}>{proj.repository_name}</Text>
                    <Text style={styles.scanLinkText}>{proj.repository_url}</Text>
                  </View>
                </View>
                <View style={styles.scanBadge}>
                  <Text style={styles.scanBadgeText}>{proj.last_scanned}</Text>
                </View>
              </View>

              <View style={styles.scanMetaGrid}>
                <View style={styles.scanMetaItem}>
                  <Text style={styles.scanMetaLabel}>DETECTED FRAMEWORKS:</Text>
                  <Text style={styles.scanMetaVal}>{proj.detected_frameworks.join(', ')}</Text>
                </View>
                <View style={styles.scanMetaItem}>
                  <Text style={styles.scanMetaLabel}>EVIDENCE STATUS:</Text>
                  <Text style={[styles.scanMetaVal, { color: COLORS.green }]}>{proj.evidence_status}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </HoverableCard>

      {/* Row 9: Target Transformation */}
      <HoverableCard style={[styles.card, styles.mintCardAccent, styles.verticalSpacing, { alignItems: 'center' }]}>
        <Text style={styles.awardIcon}>🏆</Text>
        <Text style={[styles.transformTitle, { color: COLORS.green }]}>Target Transformation</Text>
        <Text style={styles.transformDesc}>
          Strengthen <Text style={{ fontWeight: '800' }}>{topGapSubject}</Text> to improve your employer skill fit and unlock verified career credentials.
        </Text>
      </HoverableCard>

      {/* Row 10: Internship Impact */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Internship Impact</Text>
        <Text style={styles.cardSubtitle}>How closing this gap affects your opportunities.</Text>

        <View style={styles.impactMatchDisplayBox}>
          <View style={styles.impactValBox}>
            <Text style={styles.impactPercentText}>{internshipImpact?.current_match || careerMatchPct}%</Text>
            <Text style={styles.impactSubText}>CURRENT MATCH</Text>
          </View>
          <Text style={styles.impactArrow}>➔</Text>
          <View style={styles.impactValBox}>
            <Text style={[styles.impactPercentText, { color: COLORS.green }]}>
              {internshipImpact?.projected_match || (careerMatchPct + 15)}%
            </Text>
            <Text style={[styles.impactSubText, { color: COLORS.green, fontWeight: '800' }]}>PROJECTED MATCH</Text>
          </View>
        </View>
        <Text style={styles.impactFooterText}>
          Unlocks {internshipImpact?.unlocked_positions || 0} matching opportunities requiring {topGapSubject}.
        </Text>
      </HoverableCard>

      {/* Row 11: Your Skill Growth */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Your Skill Growth</Text>
        <Text style={styles.cardSubtitle}>Progress over time.</Text>

        {growthHistory.length === 0 ? (
          <Text style={styles.statDesc}>Skill growth history will appear as you build more evidence.</Text>
        ) : (
          <View style={styles.chartCanvas}>
            <View style={styles.chartBarsContainer}>
              {growthHistory.map((gh, idx) => (
                <View key={idx} style={[styles.chartBar, { height: `${gh.score}%` }]} />
              ))}
            </View>
            <View style={styles.chartLineIndicator}>
              <Text style={styles.chartIndicatorLabel}>Verified Threshold</Text>
            </View>
          </View>
        )}
      </HoverableCard>

      {/* Row 12: YOUR CAREER ROLE MATCH Section */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.cardTitle}>YOUR CAREER ROLE MATCH</Text>
          <Text style={styles.cardSubtitle}>
            See how your verified skills align with the career roles available on SkillSetu.
          </Text>
        </View>

        {/* Highest Profile Match Box */}
        {highestMatch ? (
          <View style={{
            backgroundColor: COLORS.greenLight,
            borderWidth: 1.5,
            borderColor: COLORS.green,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ backgroundColor: COLORS.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '900', color: COLORS.paper, letterSpacing: 0.5 }}>BEST PROFILE MATCH</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.green }}>
                {highestMatch.match_score !== null ? `${highestMatch.match_score}% Match` : 'N/A'}
              </Text>
            </View>

            <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.ink, marginBottom: 4 }}>
              {highestMatch.career_name}
            </Text>

            <Text style={{ fontSize: 12, color: COLORS.muted, lineHeight: 18, marginBottom: 10 }}>
              Your current verified skill profile has the strongest alignment with <Text style={{ fontWeight: '800', color: COLORS.ink }}>{highestMatch.career_name}</Text> roles.
            </Text>

            {highestMatch.matched_skills && highestMatch.matched_skills.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.muted, width: '100%', marginBottom: 2 }}>KEY MATCHED SKILLS:</Text>
                {highestMatch.matched_skills.map((sk, idx) => (
                  <View key={idx} style={{ backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.green }}>✓ {sk}</Text>
                  </View>
                ))}
              </View>
            )}

            {highestMatch.priority_skills && highestMatch.priority_skills.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.muted, width: '100%', marginBottom: 2 }}>SKILLS TO BUILD NEXT:</Text>
                {highestMatch.priority_skills.slice(0, 4).map((sk, idx) => (
                  <View key={idx} style={{ backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.subtle, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: COLORS.muted }}>+ {sk}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.statDesc}>Calculating role matches across available career profiles...</Text>
        )}

        {/* Other Strong Matches List */}
        {otherRoleMatches.length > 0 && (
          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.muted, letterSpacing: 0.5, marginBottom: 12 }}>
              OTHER ROLES YOUR PROFILE ALIGNS WITH
            </Text>
            
            <View style={{ gap: 10 }}>
              {otherRoleMatches.slice(0, 5).map((role, idx) => (
                <View key={role.career_id || idx} style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: COLORS.panel,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.subtle
                }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.ink }}>{role.career_name}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{role.level}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: role.match_score >= 70 ? COLORS.green : COLORS.ink }}>
                      {role.match_score !== null ? `${role.match_score}%` : 'N/A'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </HoverableCard>

      {/* Interactive Assessment Modal */}
      <Modal
        visible={assessmentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAssessmentModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16
        }}>
          <View style={{
            backgroundColor: COLORS.paper,
            borderRadius: 16,
            maxWidth: 680,
            width: '100%',
            maxHeight: '90%',
            padding: 24,
            borderWidth: 1,
            borderColor: COLORS.subtle,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10
          }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.subtle, paddingBottom: 16, marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.ink }}>
                  {assessmentData?.title || `${assessmentData?.skill_name || 'Skill'} Assessment`}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                  Canonical Skill Verification • {assessmentData?.questions?.length || 0} Questions
                </Text>
              </View>
              <Pressable 
                onPress={() => setAssessmentModalVisible(false)}
                style={{ padding: 6, borderRadius: 6, backgroundColor: COLORS.canvas }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.muted }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
              {assessmentResult ? (
                /* Assessment Completed Result View */
                <View style={{ alignItems: 'center', paddingVertical: 20, gap: 16 }}>
                  <View style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: assessmentResult.is_verified ? COLORS.greenLight : COLORS.roseLight,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Text style={{ fontSize: 32 }}>{assessmentResult.is_verified ? '🏆' : '⚠️'}</Text>
                  </View>

                  <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.ink }}>
                    {assessmentResult.is_verified ? 'Assessment Passed & Verified!' : 'Verification Threshold Not Met'}
                  </Text>

                  <View style={{
                    backgroundColor: COLORS.panel,
                    borderRadius: 12,
                    padding: 20,
                    width: '100%',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.subtle
                  }}>
                    <Text style={{ fontSize: 40, fontWeight: '900', color: assessmentResult.is_verified ? COLORS.green : COLORS.rose }}>
                      {assessmentResult.score}%
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.muted, marginTop: 4 }}>
                      Correct: {assessmentResult.correct_count} of {assessmentResult.total_questions} Questions
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.ink, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
                      {assessmentResult.feedback}
                    </Text>
                  </View>

                  {assessmentResult.is_verified && (
                    <View style={{ backgroundColor: COLORS.mint, padding: 12, borderRadius: 8, width: '100%' }}>
                      <Text style={{ fontSize: 12, color: COLORS.green, fontWeight: '700', textAlign: 'center' }}>
                        ✓ Your verified evidence in PostgreSQL has been updated to {assessmentResult.score}%.
                      </Text>
                    </View>
                  )}

                  <Pressable
                    style={{
                      backgroundColor: COLORS.ink,
                      paddingVertical: 12,
                      paddingHorizontal: 32,
                      borderRadius: 8,
                      marginTop: 8
                    }}
                    onPress={() => setAssessmentModalVisible(false)}
                  >
                    <Text style={{ color: COLORS.paper, fontWeight: '800', fontSize: 14 }}>Close & View Updated Matrix</Text>
                  </Pressable>
                </View>
              ) : (
                /* Assessment Questions Form */
                <View style={{ gap: 20 }}>
                  {assessmentData?.questions && assessmentData.questions.map((q, qIdx) => (
                    <View key={q.id || qIdx} style={{
                      backgroundColor: COLORS.panel,
                      borderRadius: 10,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: COLORS.subtle
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.ink, marginBottom: 12 }}>
                        Question {qIdx + 1}: {q.question_text}
                      </Text>

                      <View style={{ gap: 8 }}>
                        {['A', 'B', 'C', 'D'].map((optKey) => {
                          const optText = q[`option_${optKey.toLowerCase()}`];
                          if (!optText) return null;
                          const isSelected = selectedAnswers[q.id] === optKey;

                          return (
                            <Pressable
                              key={optKey}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                paddingVertical: 10,
                                paddingHorizontal: 14,
                                borderRadius: 8,
                                borderWidth: 1.5,
                                borderColor: isSelected ? COLORS.green : COLORS.subtle,
                                backgroundColor: isSelected ? '#f0fdf4' : COLORS.paper
                              }}
                              onPress={() => {
                                setSelectedAnswers(prev => ({ ...prev, [q.id]: optKey }));
                              }}
                            >
                              <View style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: isSelected ? COLORS.green : COLORS.muted,
                                backgroundColor: isSelected ? COLORS.green : 'transparent',
                                justifyContent: 'center',
                                alignItems: 'center'
                              }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: isSelected ? COLORS.paper : COLORS.muted }}>
                                  {optKey}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 13, color: isSelected ? COLORS.ink : COLORS.ink, fontWeight: isSelected ? '700' : '400', flex: 1 }}>
                                {optText}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Modal Footer (When Answering) */}
            {!assessmentResult && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.subtle, paddingTop: 16, marginTop: 16 }}>
                <Pressable
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    borderRadius: 8,
                    backgroundColor: COLORS.canvas,
                    borderWidth: 1,
                    borderColor: COLORS.subtle
                  }}
                  onPress={() => setAssessmentModalVisible(false)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.muted }}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 22,
                    borderRadius: 8,
                    backgroundColor: COLORS.green,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onPress={handleSubmitAssessmentModal}
                  disabled={isSubmittingAssessment}
                >
                  {isSubmittingAssessment ? (
                    <ActivityIndicator size="small" color={COLORS.paper} />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.paper }}>Submit Assessment</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 80,
  },
  // Header Row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    zIndex: 1000,
    elevation: 1000,
  },
  headerLeft: {
    flex: 1,
    minWidth: 285,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 6,
  },
  targetCareerCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 16,
    minWidth: 240,
    shadowColor: COLORS.ink,
    shadowOpacity: 0.02,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    position: 'relative',
    zIndex: 1100,
    elevation: 1100,
  },
  targetCareerMeta: {
    marginBottom: 8,
  },
  targetCareerMetaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  targetCareerValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
    marginTop: 2,
  },
  changeGoalBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 20,
    alignItems: 'center',
  },
  changeGoalBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.green,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    left: 0,
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
    shadowColor: COLORS.ink,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 9999,
    elevation: 9999,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.greenLight,
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  dropdownItemTextActive: {
    color: COLORS.green,
    fontWeight: '800',
  },
  // 4 Cards row
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    zIndex: 1,
    elevation: 1,
  },
  flexCol: {
    flexDirection: 'column',
  },
  statCardContainer: {
    flex: 1,
  },
  statCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    padding: 16,
    gap: 6,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 22,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.ink,
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statDesc: {
    fontSize: 11,
    color: COLORS.muted,
  },
  // Bento Layout
  bentoRow: {
    flexDirection: 'row',
    gap: 24,
  },
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    padding: 20,
    gap: 12,
  },
  verticalSpacing: {
    marginTop: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '950',
    color: COLORS.ink,
  },
  cardSubtitle: {
    fontSize: 10,
    fontWeight: '750',
    color: COLORS.muted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  // Skill Profile Chart
  skillProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
  },
  skillsProfileBarsList: {
    gap: 14,
    marginTop: 8,
  },
  skillBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  skillBarLabel: {
    width: 90,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  skillBarTracksWrapper: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.panel,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  targetRequiredFill: {
    height: '100%',
    backgroundColor: COLORS.subtle,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  currentActualFill: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0.9,
    borderRadius: 6,
  },
  skillBarValueWrapper: {
    width: 110,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillBarRatio: {
    fontSize: 11,
    fontWeight: '800',
  },
  skillBarStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  skillBarStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  // Priority Insights
  mintCardAccent: {
    backgroundColor: COLORS.mint,
    borderColor: '#a7f3d0',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightsSparkIcon: {
    fontSize: 16,
  },
  insightsHeadingText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.green,
    letterSpacing: 0.5,
  },
  insightsSecTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.ink,
  },
  insightsCardsList: {
    gap: 10,
  },
  insightMiniCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  insightPriorityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  insightPriorityTagText: {
    fontSize: 9,
    fontWeight: '900',
  },
  insightScoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
  },
  insightDesc: {
    fontSize: 10,
    color: COLORS.muted,
  },
  // Domains Grid (2 columns)
  domainsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  domainColumn: {
    flex: 1,
    gap: 16,
  },
  domainCard: {
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    backgroundColor: COLORS.canvas,
  },
  domainTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.ink,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    paddingBottom: 4,
  },
  domainSkillsList: {
    gap: 6,
  },
  domainSkillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  domainSkillName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  domainSkillScoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  domainSkillScore: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
  },
  domainBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  domainBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  // Skill Gap Engine
  gapEngineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gapEngineCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  gapEngineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gapEngineName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  gapEngineBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gapEngineBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  gapEngineScore: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  // Gap Analysis
  gapAnalysisOutlineCard: {
    borderWidth: 1.5,
    borderColor: COLORS.roseLight,
    backgroundColor: '#fff5f5',
  },
  gapAnalysisGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  gapAnalysisBlock: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  gapAnalysisBlockTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  gapAnalysisBlockDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
  },
  // Learning Path
  modulesStepList: {
    gap: 10,
    marginTop: 8,
  },
  moduleStepItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    padding: 12,
  },
  activeModuleItem: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.mint,
  },
  completedModuleItem: {
    borderColor: COLORS.green,
  },
  moduleStepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    fontSize: 14,
    fontWeight: '900',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  stepSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
  },
  startModuleBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  startModuleBtnText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: '800',
  },
  // Practice
  practiceChallengeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  practiceLeft: {
    flex: 1,
    gap: 6,
  },
  practiceTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.ink,
  },
  practiceDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
  },
  practiceTagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  practiceTag: {
    backgroundColor: COLORS.panel,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  practiceTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.muted,
  },
  practiceRight: {
    width: 160,
    gap: 8,
    justifyContent: 'center',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  progressLabelPercent: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.green,
  },
  challengeTrack: {
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  challengeBarFill: {
    height: '100%',
    backgroundColor: COLORS.green,
  },
  challengeBtn: {
    backgroundColor: COLORS.green,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  challengeBtnDisabled: {
    backgroundColor: COLORS.subtle,
  },
  challengeBtnText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: '800',
  },
  // Assessment History
  assessmentHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retakeAssessmentBtn: {
    borderWidth: 1,
    borderColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retakeAssessmentBtnText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  assessmentHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  assessmentTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  assessmentDate: {
    fontSize: 10,
    color: COLORS.muted,
  },
  assessmentScoreBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  assessmentScorePct: {
    fontSize: 14,
    fontWeight: '900',
  },
  assessmentScoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  assessmentScoreBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  // Project Verification
  scanProjectBox: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  scanProjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanFolderIcon: {
    fontSize: 18,
  },
  scanProjectTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  scanLinkText: {
    fontSize: 10,
    color: COLORS.green,
  },
  scanBadge: {
    backgroundColor: COLORS.panel,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  scanBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
  },
  scanMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.subtle,
    paddingTop: 8,
  },
  scanMetaItem: {
    gap: 2,
  },
  scanMetaLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.muted,
  },
  scanMetaVal: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.ink,
  },
  // Transformation Banner
  awardIcon: {
    fontSize: 28,
  },
  transformTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  transformDesc: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 600,
  },
  // Impact
  impactMatchDisplayBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginVertical: 8,
  },
  impactValBox: {
    alignItems: 'center',
  },
  impactPercentText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.ink,
  },
  impactSubText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.muted,
  },
  impactArrow: {
    fontSize: 20,
    color: COLORS.muted,
  },
  impactFooterText: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
  },
  // Growth Chart
  chartCanvas: {
    height: 120,
    position: 'relative',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  chartBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: 20,
  },
  chartBar: {
    width: 24,
    backgroundColor: COLORS.green,
    borderRadius: 4,
  },
  chartLineIndicator: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: COLORS.subtle,
    alignItems: 'flex-end',
  },
  chartIndicatorLabel: {
    fontSize: 8,
    color: COLORS.muted,
    backgroundColor: COLORS.paper,
    paddingHorizontal: 4,
  },
  // Readiness Banner
  readinessCard: {
    backgroundColor: COLORS.green,
  },
  readinessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  readinessScoreText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.paper,
  },
  readinessSubText: {
    fontSize: 11,
    color: COLORS.greenLight,
    marginTop: 2,
  },
  readinessLegendsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  readinessLegendText: {
    fontSize: 10,
    color: COLORS.greenLight,
    fontWeight: '600',
  },
  nextActionBtn: {
    backgroundColor: COLORS.paper,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  nextActionBtnText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '900',
  },
});
