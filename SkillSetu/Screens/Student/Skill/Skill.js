import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

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

const SKILL_ROLES_DATA = {
  'Backend Developer': {
    careerMatch: 74,
    verifiedCount: 18,
    gapsCount: 6,
    internshipsCount: 24,
    skills: [
      { name: 'Python', current: 86, target: 80, status: 'Verified' },
      { name: 'SQL', current: 81, target: 85, status: 'Improving' },
      { name: 'FastAPI', current: 54, target: 80, status: 'Gap' },
      { name: 'Docker', current: 42, target: 80, status: 'Gap' },
    ],
    domains: {
      left: [
        {
          title: 'Programming',
          skills: [
            { name: 'Python', score: 86, badge: 'VERIFIED' },
            { name: 'JavaScript', score: 72, badge: 'IMPROVING' },
          ],
        },
        {
          title: 'Databases',
          skills: [
            { name: 'SQL (PostgreSQL)', score: 81, badge: 'IMPROVING' },
            { name: 'Redis', score: 30, badge: 'GAP' },
          ],
        },
      ],
      right: [
        {
          title: 'Backend Frameworks',
          skills: [
            { name: 'Django', score: 82, badge: 'VERIFIED' },
            { name: 'FastAPI', score: 54, badge: 'GAP' },
          ],
        },
        {
          title: 'DevOps & Cloud',
          skills: [
            { name: 'Git', score: 88, badge: 'VERIFIED' },
            { name: 'Docker', score: 42, badge: 'GAP' },
            { name: 'AWS', score: 60, badge: 'DEVELOPING' },
          ],
        },
      ],
    },
    gapAnalysis: {
      subject: 'Docker',
      industryDemand: 'Required in 78% of Backend Developer job descriptions.',
      githubEvidence: 'No Dockerfiles or docker-compose.yml found in your public repositories.',
      assessmentResults: 'Scored 42% on the theoretical assessment. Practical not attempted.',
      impactText: 'Impact: 74% ➔ 68% if unresolved.',
      projectedMatch: 76,
      unlocksCount: 14,
    },
    priorityInsights: [
      { name: 'Docker', priority: 'HIGH', score: '42/80', desc: 'Required by 78% of backend internships. Limited evidence of containerization in GitHub projects.' },
      { name: 'AWS (Cloud)', priority: 'MED', score: '60/80', desc: 'Core for modern backend deployments.' },
    ],
    nextAction: 'Start Docker Module',
  },
  'Frontend Engineer': {
    careerMatch: 86,
    verifiedCount: 22,
    gapsCount: 3,
    internshipsCount: 32,
    skills: [
      { name: 'React', current: 92, target: 90, status: 'Verified' },
      { name: 'TypeScript', current: 88, target: 85, status: 'Verified' },
      { name: 'CSS/Tailwind', current: 81, target: 80, status: 'Verified' },
      { name: 'GraphQL', current: 50, target: 70, status: 'Gap' },
    ],
    domains: {
      left: [
        {
          title: 'Programming',
          skills: [
            { name: 'TypeScript', score: 88, badge: 'VERIFIED' },
            { name: 'JavaScript', score: 90, badge: 'VERIFIED' },
          ],
        },
        {
          title: 'CSS & Styling',
          skills: [
            { name: 'TailwindCSS', score: 81, badge: 'VERIFIED' },
            { name: 'CSS/HTML', score: 85, badge: 'VERIFIED' },
          ],
        },
      ],
      right: [
        {
          title: 'Frontend Frameworks',
          skills: [
            { name: 'React', score: 92, badge: 'VERIFIED' },
            { name: 'Next.js', score: 80, badge: 'VERIFIED' },
          ],
        },
        {
          title: 'GraphQL & Testing',
          skills: [
            { name: 'GraphQL', score: 50, badge: 'GAP' },
            { name: 'Jest', score: 62, badge: 'IMPROVING' },
          ],
        },
      ],
    },
    gapAnalysis: {
      subject: 'GraphQL',
      industryDemand: 'Required in 60% of modern frontend roles.',
      githubEvidence: 'Minimal queries or schemas detected in connected projects.',
      assessmentResults: 'Scored 50% on theoretical test.',
      impactText: 'Impact: 86% ➔ 81% if unresolved.',
      projectedMatch: 92,
      unlocksCount: 19,
    },
    priorityInsights: [
      { name: 'GraphQL', priority: 'HIGH', score: '50/70', desc: 'Crucial for dynamic API integrations in modern frontend applications.' },
      { name: 'Jest', priority: 'LOW', score: '62/70', desc: 'Testing frameworks support reliable application rollouts.' },
    ],
    nextAction: 'Start GraphQL Module',
  },
  'Full Stack Developer': {
    careerMatch: 78,
    verifiedCount: 20,
    gapsCount: 5,
    internshipsCount: 28,
    skills: [
      { name: 'React', current: 92, target: 85, status: 'Verified' },
      { name: 'Python', current: 86, target: 80, status: 'Verified' },
      { name: 'SQL', current: 81, target: 80, status: 'Verified' },
      { name: 'Docker', current: 42, target: 75, status: 'Gap' },
    ],
    domains: {
      left: [
        {
          title: 'Front-End',
          skills: [
            { name: 'React', score: 92, badge: 'VERIFIED' },
            { name: 'TailwindCSS', score: 81, badge: 'VERIFIED' },
          ],
        },
        {
          title: 'Databases',
          skills: [
            { name: 'SQL PostgreSQL', score: 81, badge: 'VERIFIED' },
            { name: 'MongoDB', score: 60, badge: 'IMPROVING' },
          ],
        },
      ],
      right: [
        {
          title: 'Back-End Frameworks',
          skills: [
            { name: 'Node.js', score: 78, badge: 'VERIFIED' },
            { name: 'Python', score: 86, badge: 'VERIFIED' },
          ],
        },
        {
          title: 'DevOps & Deploy',
          skills: [
            { name: 'Docker', score: 42, badge: 'GAP' },
            { name: 'AWS', score: 50, badge: 'GAP' },
          ],
        },
      ],
    },
    gapAnalysis: {
      subject: 'Docker',
      industryDemand: 'Container usage is listed JDs for 72% of Full Stack roles.',
      githubEvidence: 'Minimal deployment config files present.',
      assessmentResults: 'Theoretical score is 42%. Practical not attempted.',
      impactText: 'Impact: 78% ➔ 71% if unresolved.',
      projectedMatch: 85,
      unlocksCount: 12,
    },
    priorityInsights: [
      { name: 'Docker', priority: 'HIGH', score: '42/75', desc: 'Essential for linking frontend services with backend engines locally.' },
      { name: 'AWS', priority: 'MED', score: '50/75', desc: 'Preferred cloud deploy host for full stack web nodes.' },
    ],
    nextAction: 'Start Docker Module',
  },
  'DevOps Engineer': {
    careerMatch: 48,
    verifiedCount: 12,
    gapsCount: 8,
    internshipsCount: 8,
    skills: [
      { name: 'Git', current: 88, target: 85, status: 'Verified' },
      { name: 'Docker', current: 42, target: 85, status: 'Gap' },
      { name: 'AWS', current: 30, target: 80, status: 'Gap' },
      { name: 'Kubernetes', current: 10, target: 80, status: 'Gap' },
    ],
    domains: {
      left: [
        {
          title: 'Programming',
          skills: [
            { name: 'Bash Scripting', score: 68, badge: 'IMPROVING' },
            { name: 'Python', score: 86, badge: 'VERIFIED' },
          ],
        },
        {
          title: 'Cloud Platforms',
          skills: [
            { name: 'AWS', score: 30, badge: 'GAP' },
            { name: 'GCP', score: 20, badge: 'GAP' },
          ],
        },
      ],
      right: [
        {
          title: 'Containers & CI',
          skills: [
            { name: 'Docker', score: 42, badge: 'GAP' },
            { name: 'Jenkins CI/CD', score: 50, badge: 'DEVELOPING' },
          ],
        },
        {
          title: 'Infrastructure as Code',
          skills: [
            { name: 'Terraform', score: 10, badge: 'GAP' },
            { name: 'Kubernetes', score: 10, badge: 'GAP' },
          ],
        },
      ],
    },
    gapAnalysis: {
      subject: 'Docker & Kubernetes',
      industryDemand: 'Docker is required in 92% of DevOps job requirements.',
      githubEvidence: 'No Dockerfiles detected in public repositories.',
      assessmentResults: 'Theoretical score is 42% on Docker, 10% on Kubernetes.',
      impactText: 'Impact: 48% ➔ 40% if unresolved.',
      projectedMatch: 65,
      unlocksCount: 8,
    },
    priorityInsights: [
      { name: 'Kubernetes', priority: 'HIGH', score: '10/80', desc: 'Required for enterprise cloud-native orchestration.' },
      { name: 'Docker', priority: 'HIGH', score: '42/85', desc: 'Prerequisite for containers and container-based pipeline structures.' },
    ],
    nextAction: 'Start Docker Module',
  },
};

export default function Skill({ profileData }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;

  const [activeCareer, setActiveCareer] = useState('Backend Developer');
  const [showCareerDropdown, setShowCareerDropdown] = useState(false);

  // Assessment score simulator state
  const [dockerAssessmentScore, setDockerAssessmentScore] = useState(42);
  const [isVerifyingAssessment, setIsVerifyingAssessment] = useState(false);

  // Learning Path Module State
  const [learningStepState, setLearningStepState] = useState(2); // Step 2 is active
  const [isCompletingStep, setIsCompletingStep] = useState(false);

  // Practice challenge progress simulation
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [isStartingChallenge, setIsStartingChallenge] = useState(false);

  // Load configured metrics based on target role
  const activeRoleData = SKILL_ROLES_DATA[activeCareer] || SKILL_ROLES_DATA['Backend Developer'];

  // Dynamically calculate verify and gap count adjustments if user simulated retaking docker assessment
  const adjustedVerifiedCount = dockerAssessmentScore > 42 
    ? activeRoleData.verifiedCount + 1 
    : activeRoleData.verifiedCount;

  const adjustedGapsCount = dockerAssessmentScore > 42 
    ? Math.max(0, activeRoleData.gapsCount - 1) 
    : activeRoleData.gapsCount;

  const adjustedCareerMatch = dockerAssessmentScore > 42
    ? Math.min(100, activeRoleData.careerMatch + 12)
    : activeRoleData.careerMatch;

  // Simulator: Retake Assessment
  const handleRetakeAssessment = () => {
    setIsVerifyingAssessment(true);
    setTimeout(() => {
      setIsVerifyingAssessment(false);
      setDockerAssessmentScore(85);
      alert('Congratulations! Your Docker score has updated to 85%.\nYour Docker skill is now VERIFIED!');
    }, 1200);
  };

  // Simulator: Start Module Step
  const handleStartModule = () => {
    setIsCompletingStep(true);
    setTimeout(() => {
      setIsCompletingStep(false);
      setLearningStepState(3); // Completes step 2, unlocks step 3
      alert('Module "Writing Dockerfiles" completed! Step 3 "Docker Compose Basics" is now unlocked.');
    }, 1200);
  };

  // Simulator: Start Challenge
  const handleStartChallenge = () => {
    setIsStartingChallenge(true);
    setChallengeProgress(1);
    
    setTimeout(() => {
      setChallengeProgress(2);
      setTimeout(() => {
        setChallengeProgress(3);
        setIsStartingChallenge(false);
        alert('Challenge Completed successfully!\nEvidence added to your Docker portfolio file.');
      }, 800);
    }, 800);
  };

  const handleCareerChange = (roleName) => {
    setActiveCareer(roleName);
    setShowCareerDropdown(false);
    // Reset simulators when swapping careers
    setDockerAssessmentScore(42);
    setLearningStepState(2);
    setChallengeProgress(0);
  };

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
            <Text style={styles.targetCareerValue}>{activeCareer}</Text>
          </View>
          <Pressable 
            style={styles.changeGoalBtn}
            onPress={() => setShowCareerDropdown(!showCareerDropdown)}
          >
            <Text style={styles.changeGoalBtnText}>change career goal</Text>
          </Pressable>

          {showCareerDropdown && (
            <View style={styles.dropdownMenu}>
              {Object.keys(SKILL_ROLES_DATA).map((role) => (
                <Pressable
                  key={role}
                  style={[styles.dropdownItem, role === activeCareer && styles.dropdownItemActive]}
                  onPress={() => handleCareerChange(role)}
                >
                  <Text style={[styles.dropdownItemText, role === activeCareer && styles.dropdownItemTextActive]}>
                    {role}
                  </Text>
                </Pressable>
              ))}
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
            <Text style={styles.statNumber}>{adjustedVerifiedCount}</Text>
          </View>
          <Text style={[styles.statTitle, { color: '#00685f' }]}>VERIFIED SKILLS</Text>
          <Text style={styles.statDesc}>Across 4 domains</Text>
        </HoverableCard>

        {/* Card 2: Skill Gaps */}
        <HoverableCard style={styles.statCard} containerStyle={styles.statCardContainer}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statIcon, { color: COLORS.rose }]}>⚠️</Text>
            <Text style={styles.statNumber}>{adjustedGapsCount}</Text>
          </View>
          <Text style={[styles.statTitle, { color: COLORS.rose }]}>SKILL GAPS</Text>
          <Text style={styles.statDesc}>
            {dockerAssessmentScore > 42 ? '2 high priority' : '3 high priority'}
          </Text>
        </HoverableCard>

        {/* Card 3: Career Match */}
        <HoverableCard style={styles.statCard} containerStyle={styles.statCardContainer}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statIcon, { color: '#3b82f6' }]}>🎯</Text>
            <Text style={styles.statNumber}>{adjustedCareerMatch}%</Text>
          </View>
          <Text style={[styles.statTitle, { color: '#3b82f6' }]}>CAREER MATCH</Text>
          <Text style={styles.statDesc}>📈 +12% this month</Text>
        </HoverableCard>

        {/* Card 4: Internship Match */}
        <HoverableCard style={styles.statCard} containerStyle={styles.statCardContainer}>
          <View style={styles.statCardHeader}>
            <Text style={[styles.statIcon, { color: COLORS.amber }]}>💼</Text>
            <Text style={styles.statNumber}>{activeRoleData.internshipsCount}</Text>
          </View>
          <Text style={[styles.statTitle, { color: COLORS.amber }]}>INTERNSHIP MATCH</Text>
          <Text style={styles.statDesc}>Available positions</Text>
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
                CURRENT VERIFIED LEVEL VS REQUIRED LEVEL TO BECOME A {activeCareer.toUpperCase()}
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

          {/* Custom bar charts */}
          <View style={styles.skillsProfileBarsList}>
            {activeRoleData.skills.map((sk, index) => {
              const isDocker = sk.name === 'Docker';
              const currentVal = isDocker ? dockerAssessmentScore : sk.current;
              
              // Determine color representation
              const isGap = currentVal < sk.target;
              const barColor = isGap ? COLORS.rose : COLORS.green;
              const badgeBg = isGap ? COLORS.roseLight : COLORS.greenLight;
              const badgeColor = isGap ? COLORS.rose : COLORS.green;
              const statusLabel = isGap ? 'Gap' : (currentVal > sk.target ? 'Verified' : 'Improving');

              return (
                <View key={index} style={styles.skillBarItem}>
                  <Text style={styles.skillBarLabel}>{sk.name}</Text>
                  
                  <View style={styles.skillBarTracksWrapper}>
                    <View style={styles.skillBarTrack}>
                      {/* Target Required fill */}
                      <View style={[styles.targetRequiredFill, { width: `${sk.target}%` }]} />
                      {/* Current actual fill */}
                      <View style={[styles.currentActualFill, { width: `${currentVal}%`, backgroundColor: barColor }]} />
                    </View>
                  </View>

                  <View style={styles.skillBarValueWrapper}>
                    <Text style={[styles.skillBarRatio, { color: barColor }]}>
                      {currentVal}/{sk.target}
                    </Text>
                    <View style={[styles.skillBarStatusBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.skillBarStatusText, { color: badgeColor }]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </HoverableCard>

        {/* Right Card: PRIORITY INSIGHTS */}
        <HoverableCard style={[styles.card, styles.mintCardAccent, { flex: 4 }]}>
          <View style={styles.insightsHeader}>
            <Text style={styles.insightsSparkIcon}>⚡</Text>
            <Text style={styles.insightsHeadingText}>PRIORITY INSIGHTS</Text>
          </View>
          <Text style={styles.insightsSecTitle}>High Priority Gaps</Text>

          <View style={styles.insightsCardsList}>
            {activeRoleData.priorityInsights.map((ins, index) => (
              <View key={index} style={styles.insightMiniCard}>
                <View style={styles.insightHeaderRow}>
                  <Text style={styles.insightName}>{ins.name}</Text>
                  <View style={[
                    styles.insightPriorityTag, 
                    ins.priority === 'HIGH' ? { backgroundColor: COLORS.roseLight } : { backgroundColor: COLORS.amberLight }
                  ]}>
                    <Text style={[
                      styles.insightPriorityTagText,
                      ins.priority === 'HIGH' ? { color: COLORS.rose } : { color: COLORS.amber }
                    ]}>
                      {ins.priority}
                    </Text>
                  </View>
                </View>
                <Text style={styles.insightScoreLabel}>Score: {ins.score}</Text>
                <Text style={styles.insightDesc}>{ins.desc}</Text>
              </View>
            ))}
          </View>
        </HoverableCard>

      </View>

      {/* Row 2: Your Complete Skill Profile */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Your Complete Skill Profile</Text>
        <Text style={styles.cardSubtitle}>Detailed breakdown across key domains.</Text>

        <View style={[styles.domainsGrid, !isTablet && styles.flexCol]}>
          {/* Column 1 */}
          <View style={styles.domainColumn}>
            {activeRoleData.domains.left.map((domain, index) => (
              <View key={index} style={styles.domainCard}>
                <Text style={styles.domainTitle}>{domain.title}</Text>
                <View style={styles.domainSkillsList}>
                  {domain.skills.map((sk, skIdx) => {
                    const isDocker = sk.name === 'Docker';
                    const score = isDocker ? dockerAssessmentScore : sk.score;
                    const badge = isDocker && dockerAssessmentScore > 42 ? 'VERIFIED' : sk.badge;
                    
                    let badgeBg = COLORS.subtle;
                    let badgeColor = COLORS.muted;
                    if (badge === 'VERIFIED') {
                      badgeBg = COLORS.greenLight;
                      badgeColor = COLORS.green;
                    } else if (badge === 'GAP') {
                      badgeBg = COLORS.roseLight;
                      badgeColor = COLORS.rose;
                    } else if (badge === 'IMPROVING') {
                      badgeBg = COLORS.panel;
                      badgeColor = COLORS.muted;
                    }

                    return (
                      <View key={skIdx} style={styles.domainSkillRow}>
                        <Text style={styles.domainSkillName}>{sk.name}</Text>
                        <View style={styles.domainSkillScoreWrap}>
                          <Text style={styles.domainSkillScore}>{score}</Text>
                          <View style={[styles.domainBadge, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.domainBadgeText, { color: badgeColor }]}>
                              {badge.toLowerCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* Column 2 */}
          <View style={styles.domainColumn}>
            {activeRoleData.domains.right.map((domain, index) => (
              <View key={index} style={styles.domainCard}>
                <Text style={styles.domainTitle}>{domain.title}</Text>
                <View style={styles.domainSkillsList}>
                  {domain.skills.map((sk, skIdx) => {
                    const isDocker = sk.name === 'Docker';
                    const score = isDocker ? dockerAssessmentScore : sk.score;
                    const badge = isDocker && dockerAssessmentScore > 42 ? 'VERIFIED' : sk.badge;
                    
                    let badgeBg = COLORS.subtle;
                    let badgeColor = COLORS.muted;
                    if (badge === 'VERIFIED') {
                      badgeBg = COLORS.greenLight;
                      badgeColor = COLORS.green;
                    } else if (badge === 'GAP') {
                      badgeBg = COLORS.roseLight;
                      badgeColor = COLORS.rose;
                    } else if (badge === 'DEVELOPING') {
                      badgeBg = COLORS.amberLight;
                      badgeColor = COLORS.amber;
                    }

                    return (
                      <View key={skIdx} style={styles.domainSkillRow}>
                        <Text style={styles.domainSkillName}>{sk.name}</Text>
                        <View style={styles.domainSkillScoreWrap}>
                          <Text style={styles.domainSkillScore}>{score}</Text>
                          <View style={[styles.domainBadge, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.domainBadgeText, { color: badgeColor }]}>
                              {badge.toLowerCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      </HoverableCard>

      {/* Row 3: Skill Gap Engine */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Skill Gap Engine</Text>
        <Text style={styles.cardSubtitle}>Prioritized gaps based on market demand and your current trajectory.</Text>

        <View style={[styles.gapEngineGrid, !isTablet && styles.flexCol]}>
          <View style={styles.gapEngineCard}>
            <View style={styles.gapEngineHeader}>
              <Text style={styles.gapEngineName}>Docker</Text>
              <View style={[styles.gapEngineBadge, { backgroundColor: COLORS.roseLight }]}><Text style={[styles.gapEngineBadgeText, { color: COLORS.rose }]}>PRIORITY 1</Text></View>
            </View>
            <Text style={styles.gapEngineScore}>Score: 42/80</Text>
          </View>

          <View style={styles.gapEngineCard}>
            <View style={styles.gapEngineHeader}>
              <Text style={styles.gapEngineName}>FastAPI</Text>
              <View style={[styles.gapEngineBadge, { backgroundColor: COLORS.roseLight }]}><Text style={[styles.gapEngineBadgeText, { color: COLORS.rose }]}>PRIORITY 2</Text></View>
            </View>
            <Text style={styles.gapEngineScore}>Score: 54/80</Text>
          </View>

          <View style={styles.gapEngineCard}>
            <View style={styles.gapEngineHeader}>
              <Text style={styles.gapEngineName}>AWS</Text>
              <View style={[styles.gapEngineBadge, { backgroundColor: COLORS.amberLight }]}><Text style={[styles.gapEngineBadgeText, { color: COLORS.amber }]}>PRIORITY 3</Text></View>
            </View>
            <Text style={styles.gapEngineScore}>Score: 60/80</Text>
          </View>

          <View style={styles.gapEngineCard}>
            <View style={styles.gapEngineHeader}>
              <Text style={styles.gapEngineName}>Redis</Text>
              <View style={[styles.gapEngineBadge, { backgroundColor: COLORS.panel }]}><Text style={[styles.gapEngineBadgeText, { color: COLORS.muted }]}>PRIORITY 4</Text></View>
            </View>
            <Text style={styles.gapEngineScore}>Score: 30/70</Text>
          </View>
        </View>
      </HoverableCard>

      {/* Row 4: Gap Analysis: Docker */}
      <HoverableCard style={[styles.card, styles.gapAnalysisOutlineCard, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Gap Analysis: {activeRoleData.gapAnalysis.subject}</Text>
        <Text style={[styles.cardSubtitle, { color: COLORS.rose, fontWeight: '700' }]}>
          Why this is blocking your Career Match ({activeRoleData.gapAnalysis.impactText})
        </Text>

        <View style={[styles.gapAnalysisGrid, !isTablet && styles.flexCol]}>
          <View style={styles.gapAnalysisBlock}>
            <Text style={styles.gapAnalysisBlockTitle}>Industry Demand</Text>
            <Text style={styles.gapAnalysisBlockDesc}>{activeRoleData.gapAnalysis.industryDemand}</Text>
          </View>
          
          <View style={styles.gapAnalysisBlock}>
            <Text style={styles.gapAnalysisBlockTitle}>GitHub Evidence</Text>
            <Text style={styles.gapAnalysisBlockDesc}>{activeRoleData.gapAnalysis.githubEvidence}</Text>
          </View>
          
          <View style={styles.gapAnalysisBlock}>
            <Text style={styles.gapAnalysisBlockTitle}>Assessment Results</Text>
            <Text style={styles.gapAnalysisBlockDesc}>
              {dockerAssessmentScore > 42 
                ? 'Scored 85% on verified assessment. Evidence unlocked.' 
                : activeRoleData.gapAnalysis.assessmentResults
              }
            </Text>
          </View>
        </View>
      </HoverableCard>

      {/* Row 5: Personalized Learning Path: Docker */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Personalized Learning Path: Docker</Text>
        <Text style={styles.cardSubtitle}>A 7-step guided path to bridge this gap.</Text>

        <View style={styles.modulesStepList}>
          {/* Step 1 */}
          <View style={styles.moduleStepItem}>
            <View style={styles.moduleStepLeft}>
              <Text style={[styles.stepIcon, { color: COLORS.green }]}>✓</Text>
              <View>
                <Text style={styles.stepTitle}>1. Container Fundamentals</Text>
                <Text style={styles.stepSubtitle}>Completed (30 mins)</Text>
              </View>
            </View>
          </View>

          {/* Step 2 */}
          <View style={[
            styles.moduleStepItem, 
            learningStepState === 2 && styles.activeModuleItem,
            learningStepState > 2 && styles.completedModuleItem
          ]}>
            <View style={styles.moduleStepLeft}>
              <Text style={[
                styles.stepIcon, 
                learningStepState === 2 && { color: COLORS.teal },
                learningStepState > 2 && { color: COLORS.green }
              ]}>
                {learningStepState === 2 ? '▶' : '✓'}
              </Text>
              <View>
                <Text style={styles.stepTitle}>2. Writing Dockerfiles</Text>
                <Text style={styles.stepSubtitle}>
                  {learningStepState === 2 ? 'Active Step • Est: 45 mins' : 'Completed (45 mins)'}
                </Text>
              </View>
            </View>
            {learningStepState === 2 && (
              <Pressable 
                style={styles.startModuleBtn}
                onPress={handleStartModule}
                disabled={isCompletingStep}
              >
                {isCompletingStep ? (
                  <ActivityIndicator size="small" color={COLORS.paper} />
                ) : (
                  <Text style={styles.startModuleBtnText}>Start</Text>
                )}
              </Pressable>
            )}
          </View>

          {/* Step 3 */}
          <View style={[
            styles.moduleStepItem, 
            learningStepState < 3 && styles.lockedModuleItem,
            learningStepState === 3 && styles.activeModuleItem
          ]}>
            <View style={styles.moduleStepLeft}>
              <Text style={[styles.stepIcon, { color: COLORS.muted }]}>
                {learningStepState < 3 ? '🔒' : '▶'}
              </Text>
              <View>
                <Text style={styles.stepTitle}>3. Docker Compose Basics</Text>
                <Text style={styles.stepSubtitle}>Est: 1 hr</Text>
              </View>
            </View>
            {learningStepState === 3 && (
              <Pressable style={styles.startModuleBtn} onPress={() => alert('Launching Docker Compose editor sandbox...')}>
                <Text style={styles.startModuleBtnText}>Start</Text>
              </Pressable>
            )}
          </View>
        </View>
        <Text style={styles.moreModulesText}>+ 4 more modules...</Text>
      </HoverableCard>

      {/* Row 6: Practice & Apply */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Practice & Apply</Text>
        <Text style={styles.cardSubtitle}>Practical challenges to build hands-on experience.</Text>

        <View style={[styles.practiceChallengeBox, !isTablet && styles.flexCol]}>
          <View style={styles.practiceLeft}>
            <Text style={styles.practiceTitle}>Containerize a FastAPI Application</Text>
            <Text style={styles.practiceDesc}>Write a Dockerfile, build an image, and run a containerized API.</Text>
            <View style={styles.practiceTagRow}>
              <View style={styles.practiceTag}><Text style={styles.practiceTagText}>DOCKERFILE</Text></View>
              <View style={styles.practiceTag}><Text style={styles.practiceTagText}>NETWORKING</Text></View>
            </View>
          </View>

          <View style={styles.practiceRight}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabelText}>Progress</Text>
              <Text style={styles.progressLabelPercent}>
                {challengeProgress === 3 ? 'Completed' : `${challengeProgress}/3 Steps`}
              </Text>
            </View>
            <View style={styles.challengeTrack}>
              <View style={[styles.challengeBarFill, { width: `${(challengeProgress / 3) * 100}%` }]} />
            </View>

            <Pressable 
              style={[styles.challengeBtn, challengeProgress === 3 && styles.challengeBtnDisabled]}
              onPress={handleStartChallenge}
              disabled={isStartingChallenge || challengeProgress === 3}
            >
              {isStartingChallenge ? (
                <ActivityIndicator size="small" color={COLORS.green} />
              ) : (
                <Text style={styles.challengeBtnText}>
                  {challengeProgress === 3 ? 'Completed ✓' : 'Start Challenge'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </HoverableCard>

      {/* Row 7: Assessment History */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <View style={styles.assessmentHistoryHeader}>
          <View>
            <Text style={styles.cardTitle}>Assessment History</Text>
            <Text style={styles.cardSubtitle}>Your latest verification attempts.</Text>
          </View>
          {dockerAssessmentScore === 42 && (
            <Pressable 
              style={styles.retakeAssessmentBtn}
              onPress={handleRetakeAssessment}
              disabled={isVerifyingAssessment}
            >
              {isVerifyingAssessment ? (
                <ActivityIndicator size="small" color={COLORS.green} />
              ) : (
                <Text style={styles.retakeAssessmentBtnText}>Retake Assessment</Text>
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.assessmentHistoryRow}>
          <View>
            <Text style={styles.assessmentTitle}>Docker Comprehensive Test</Text>
            <Text style={styles.assessmentDate}>Taken: Oct 12, 2023</Text>
          </View>
          <View style={styles.assessmentScoreBlock}>
            <Text style={[
              styles.assessmentScorePct, 
              dockerAssessmentScore > 42 ? { color: COLORS.green } : { color: COLORS.rose }
            ]}>
              {dockerAssessmentScore}%
            </Text>
            <View style={[
              styles.assessmentScoreBadge, 
              dockerAssessmentScore > 42 ? { backgroundColor: COLORS.greenLight } : { backgroundColor: COLORS.roseLight }
            ]}>
              <Text style={[
                styles.assessmentScoreBadgeText,
                dockerAssessmentScore > 42 ? { color: COLORS.green } : { color: COLORS.rose }
              ]}>
                {dockerAssessmentScore > 42 ? 'VERIFIED' : 'NEEDS WORK'}
              </Text>
            </View>
          </View>
        </View>
      </HoverableCard>

      {/* Row 8: Project Verification */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Project Verification</Text>
        <Text style={styles.cardSubtitle}>Evidence extracted from your connected repositories.</Text>

        <View style={styles.scanProjectBox}>
          <View style={styles.scanProjectHeader}>
            <View style={styles.scanHeaderLeft}>
              <Text style={styles.scanFolderIcon}>📁</Text>
              <View>
                <Text style={styles.scanProjectTitle}>FastAPI E-Commerce API</Text>
                <Text style={styles.scanLinkText}>github.com/aryan/fastapi-ecommerce</Text>
              </View>
            </View>
            <View style={styles.scanBadge}>
              <Text style={styles.scanBadgeText}>Scanned 2 days ago</Text>
            </View>
          </View>

          <View style={styles.scanMetaGrid}>
            <View style={styles.scanMetaItem}>
              <Text style={styles.scanMetaLabel}>DETECTED FRAMEWORKS:</Text>
              <Text style={styles.scanMetaVal}>FastAPI, SQLAlchemy</Text>
            </View>
            <View style={styles.scanMetaItem}>
              <Text style={styles.scanMetaLabel}>DOCKER EVIDENCE:</Text>
              <Text style={[
                styles.scanMetaVal, 
                dockerAssessmentScore > 42 ? { color: COLORS.green } : { color: COLORS.rose }
              ]}>
                {dockerAssessmentScore > 42 ? 'Dockerfile detected ✓' : 'None Detected'}
              </Text>
            </View>
          </View>
        </View>
      </HoverableCard>

      {/* Row 9: Target Transformation */}
      <HoverableCard style={[styles.card, styles.mintCardAccent, styles.verticalSpacing, { alignItems: 'center' }]}>
        <Text style={styles.awardIcon}>🏆</Text>
        <Text style={[styles.transformTitle, { color: COLORS.green }]}>Target Transformation</Text>
        <Text style={styles.transformDesc}>
          By completing this path, your Docker skill will jump from <Text style={{ fontWeight: '800' }}>42</Text> to <Text style={{ fontWeight: '800' }}>86</Text>, achieving <Text style={{ color: COLORS.green, fontWeight: '800' }}>Verified</Text> status backed by project evidence.
        </Text>
      </HoverableCard>

      {/* Row 10: Internship Impact */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Internship Impact</Text>
        <Text style={styles.cardSubtitle}>How closing this gap affects your opportunities.</Text>

        <View style={styles.impactMatchDisplayBox}>
          <View style={styles.impactValBox}>
            <Text style={styles.impactPercentText}>58%</Text>
            <Text style={styles.impactSubText}>CURRENT MATCH</Text>
          </View>
          <Text style={styles.impactArrow}>➔</Text>
          <View style={styles.impactValBox}>
            <Text style={[styles.impactPercentText, { color: COLORS.green }]}>
              {activeRoleData.gapAnalysis.projectedMatch}%
            </Text>
            <Text style={[styles.impactSubText, { color: COLORS.green, fontWeight: '800' }]}>PROJECTED MATCH</Text>
          </View>
        </View>
        <Text style={styles.impactFooterText}>
          Unlocks {activeRoleData.gapAnalysis.unlocksCount} new Backend Engineering roles requiring Docker.
        </Text>
      </HoverableCard>

      {/* Row 11: Your Skill Growth */}
      <HoverableCard style={[styles.card, styles.verticalSpacing]}>
        <Text style={styles.cardTitle}>Your Skill Growth</Text>
        <Text style={styles.cardSubtitle}>Progress over the last 6 months.</Text>

        <View style={styles.chartCanvas}>
          {/* 6 pseudo bars for growth */}
          <View style={styles.chartBarsContainer}>
            <View style={[styles.chartBar, { height: '35%' }]} />
            <View style={[styles.chartBar, { height: '42%' }]} />
            <View style={[styles.chartBar, { height: '50%' }]} />
            <View style={[styles.chartBar, { height: '58%' }]} />
            <View style={[styles.chartBar, { height: '70%' }]} />
            <View style={[styles.chartBar, { height: '85%' }]} />
          </View>
          {/* Threshold line */}
          <View style={styles.chartLineIndicator}>
            <Text style={styles.chartIndicatorLabel}>Verified Threshold</Text>
          </View>
        </View>
        <View style={styles.chartMonthsRow}>
          <Text style={styles.monthText}>May</Text>
          <Text style={styles.monthText}>Jun</Text>
          <Text style={styles.monthText}>Jul</Text>
          <Text style={styles.monthText}>Aug</Text>
          <Text style={styles.monthText}>Sep</Text>
          <Text style={styles.monthText}>Oct</Text>
        </View>
      </HoverableCard>

      {/* Row 12: Career Readiness Footer Banner */}
      <HoverableCard style={[styles.card, styles.readinessCard, styles.verticalSpacing]}>
        <View style={styles.readinessContainer}>
          <View>
            <Text style={styles.readinessScoreText}>86% Ready</Text>
            <Text style={styles.readinessSubText}>For {activeCareer} Roles</Text>
            <View style={styles.readinessLegendsRow}>
              <Text style={styles.readinessLegendText}>• Technical: 90%</Text>
              <Text style={styles.readinessLegendText}>• Practical: 82%</Text>
              <Text style={styles.readinessLegendText}>• Evidence: 85%</Text>
            </View>
          </View>

          <Pressable 
            style={styles.nextActionBtn}
            onPress={() => alert(`Redirecting to personalized ${activeRoleData.nextAction} sandbox editor...`)}
          >
            <Text style={styles.nextActionBtnText}>{activeRoleData.nextAction}</Text>
          </Pressable>
        </View>
      </HoverableCard>

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
    zIndex: 110,
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
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    zIndex: 150,
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
    width: 80,
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
    fontWeight: '600',
    color: COLORS.muted,
  },
  domainSkillScoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  domainSkillScore: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ink,
  },
  domainBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  domainBadgeText: {
    fontSize: 7,
    fontWeight: '900',
  },
  // Gap Engine 4-row layout
  gapEngineGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  gapEngineCard: {
    flex: 1,
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
    fontWeight: '850',
    color: COLORS.ink,
  },
  gapEngineBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  gapEngineBadgeText: {
    fontSize: 7,
    fontWeight: '900',
  },
  gapEngineScore: {
    fontSize: 11,
    color: COLORS.muted,
  },
  // Gap analysis outline
  gapAnalysisOutlineCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.green,
  },
  gapAnalysisGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  gapAnalysisBlock: {
    flex: 1,
    backgroundColor: COLORS.canvas,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    gap: 4,
  },
  gapAnalysisBlockTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  gapAnalysisBlockDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 15,
  },
  // Learning path stepper
  modulesStepList: {
    gap: 12,
    marginTop: 8,
  },
  moduleStepItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.subtle,
    backgroundColor: COLORS.canvas,
    borderRadius: 10,
    padding: 12,
  },
  activeModuleItem: {
    borderColor: '#bbf7d0',
    backgroundColor: COLORS.greenLight,
  },
  completedModuleItem: {
    borderColor: COLORS.subtle,
    backgroundColor: COLORS.canvas,
  },
  lockedModuleItem: {
    opacity: 0.6,
  },
  moduleStepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    fontSize: 16,
    fontWeight: '900',
    width: 20,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '850',
    color: COLORS.ink,
  },
  stepSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  startModuleBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  startModuleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.paper,
  },
  moreModulesText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  // Practice Box
  practiceChallengeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    lineHeight: 15,
  },
  practiceTagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  practiceTag: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  practiceTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.green,
  },
  practiceRight: {
    width: 140,
    gap: 8,
    alignSelf: 'center',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
  },
  progressLabelPercent: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.green,
  },
  challengeTrack: {
    height: 6,
    backgroundColor: COLORS.panel,
    borderRadius: 3,
    overflow: 'hidden',
  },
  challengeBarFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  challengeBtn: {
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  challengeBtnDisabled: {
    borderColor: COLORS.subtle,
    backgroundColor: COLORS.panel,
  },
  challengeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.green,
  },
  // Scan project details
  scanProjectBox: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  scanProjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  scanHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanFolderIcon: {
    fontSize: 20,
  },
  scanProjectTitle: {
    fontSize: 12,
    fontWeight: '850',
    color: COLORS.ink,
  },
  scanLinkText: {
    fontSize: 10,
    color: COLORS.blue,
    textDecorationLine: 'underline',
    marginTop: 1,
  },
  scanBadge: {
    backgroundColor: COLORS.subtle,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  scanBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.muted,
  },
  scanProjectBoxContainer: {
    marginTop: 10,
  },
  scanMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.subtle,
    paddingTop: 10,
  },
  scanMetaItem: {
    gap: 2,
    flex: 1,
  },
  scanMetaLabel: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scanMetaVal: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 2,
  },
  // Skill chart
  chartCanvas: {
    height: 140,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.subtle,
    position: 'relative',
    marginTop: 16,
  },
  chartBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: 10,
  },
  chartBar: {
    width: 16,
    backgroundColor: COLORS.green,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  chartLineIndicator: {
    position: 'absolute',
    bottom: '75%',
    left: 0,
    right: 0,
    height: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.subtle,
    borderStyle: 'dashed',
  },
  chartIndicatorLabel: {
    fontSize: 8,
    color: COLORS.muted,
    fontWeight: '800',
    position: 'absolute',
    left: 6,
    top: -12,
  },
  chartMonthsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  monthText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
  },
  // Right Column AI Priority Insights
  mintCardAccent: {
    backgroundColor: '#f0fdfa',
    borderColor: '#ccfbf1',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightsSparkIcon: {
    fontSize: 16,
  },
  insightsHeadingText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.green,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightsSecTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.ink,
    marginTop: 4,
  },
  insightsCardsList: {
    gap: 12,
    marginTop: 6,
  },
  insightMiniCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    gap: 6,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightName: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.ink,
  },
  insightPriorityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  insightPriorityTagText: {
    fontSize: 8,
    fontWeight: '900',
  },
  insightScoreLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '750',
  },
  insightDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 15,
  },
  // Target Transformation
  awardIcon: {
    fontSize: 32,
  },
  transformTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.ink,
    marginTop: 4,
  },
  transformDesc: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  // Internship impact
  impactMatchDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 8,
    padding: 12,
    gap: 16,
    marginTop: 6,
  },
  impactValBox: {
    alignItems: 'center',
  },
  impactPercentText: {
    fontSize: 24,
    fontWeight: '950',
    color: COLORS.muted,
  },
  impactSubText: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 2,
  },
  impactArrow: {
    fontSize: 18,
    color: COLORS.green,
  },
  impactFooterText: {
    fontSize: 11,
    color: COLORS.ink,
    textAlign: 'center',
    marginTop: 4,
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
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  retakeAssessmentBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.green,
  },
  assessmentHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  assessmentTitle: {
    fontSize: 12,
    fontWeight: '850',
    color: COLORS.ink,
  },
  assessmentDate: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  assessmentScoreBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  assessmentScorePct: {
    fontSize: 16,
    fontWeight: '900',
  },
  assessmentScoreBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  assessmentScoreBadgeText: {
    fontSize: 7,
    fontWeight: '900',
  },
  // Readiness Block
  readinessCard: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.subtle,
  },
  readinessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  readinessScoreText: {
    fontSize: 28,
    fontWeight: '950',
    color: COLORS.ink,
  },
  readinessSubText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '700',
    marginTop: 2,
  },
  readinessLegendsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  readinessLegendText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  nextActionBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  nextActionBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.paper,
  },
});
