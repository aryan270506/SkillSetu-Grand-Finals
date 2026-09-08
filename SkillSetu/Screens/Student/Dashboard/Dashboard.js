import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = {
  canvas: '#f8f9fa',       // Soft Off-white Background
  panel: '#f1f5f9',        // Slate light background
  paper: '#ffffff',        // Clean White Cards
  ink: '#0f172a',          // Deep Slate Black
  navy: '#1e293b',         // Navy Dark Gray
  muted: '#64748b',        // Muted Blue-Gray
  subtle: '#e2e8f0',       // Border Gray
  green: '#0e4f34',        // Primary Deep Green (SkillSetu Green)
  greenLight: '#e6f4ea',   // Very Light Green for badges
  teal: '#0d9488',         // Teal Accent
  mint: '#ccfbf1',         // Soft Mint Background
  amber: '#f59e0b',        // Amber/Yellow
  amberLight: '#fef3c7',   // Light Amber
  rose: '#f43f5e',         // Rose/Red
  roseLight: '#ffe4e6',    // Light Rose
  blue: '#2563eb',         // Link Blue
  blueLight: '#dbeafe',    // Light Blue
};

function HoverableCard({ children, style, containerStyle, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      const isReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isReduced) return;

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.04,
          friction: 8,
          tension: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shadow, {
          toValue: 1,
          duration: 250,
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
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  const shadowOpacity = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.02, 0.12],
  });

  const shadowRadius = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 20],
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
    if (flatStyle.marginHorizontal !== undefined) containerLayout.marginHorizontal = flatStyle.marginHorizontal;
    if (flatStyle.marginVertical !== undefined) containerLayout.marginVertical = flatStyle.marginVertical;
  }

  const animatedStyle = {
    transform: [{ scale }],
    shadowColor: '#1e293b',
    shadowOpacity,
    shadowRadius,
    shadowOffset: { width: 0, height: 6 },
    zIndex: scale.interpolate({
      inputRange: [1, 1.04],
      outputRange: [1, 10],
    }),
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

export default function Dashboard({ user, profileCompletion, onNavigateToProfile }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;

  const displayName = user?.name || 'Aryan';

  // Action plan states
  const [actions, setActions] = useState([
    { id: 1, text: 'Complete Docker basics module', completed: true },
    { id: 2, text: 'Apply to TechWave Internship', completed: true },
    { id: 3, text: 'Take technical mock interview', completed: false },
    { id: 4, text: 'Update resume with new Python project', completed: false },
  ]);

  const toggleAction = (id) => {
    setActions(actions.map(act => act.id === id ? { ...act, completed: !act.completed } : act));
  };

  const completedCount = actions.filter(act => act.completed).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* 1. Welcome Bar with Profile Completion */}
      <View style={styles.welcomeRow}>
        <View style={styles.welcomeTextWrap}>
          <Text style={styles.welcomeTitle}>Welcome back, {displayName} 👋</Text>
          <Text style={styles.welcomeSubtitle}>Here is a snapshot of your career readiness today.</Text>
        </View>
        <HoverableCard
          style={styles.profileCompletionWrap}
          onPress={onNavigateToProfile}
        >
          <Text style={styles.completionLabel}>Profile Completion</Text>
          <View style={styles.completionProgressRow}>
            <View style={styles.completionTrack}>
              <View style={[styles.completionBar, { width: `${profileCompletion !== undefined ? profileCompletion : 80}%` }]} />
            </View>
            <Text style={styles.completionValue}>{profileCompletion !== undefined ? profileCompletion : 80}%</Text>
          </View>
        </HoverableCard>
      </View>

      {/* 2. Top Metrics Grid */}
      <View style={[styles.metricsGrid, !isTablet && styles.metricsGridMobile]}>
        {/* Career Readiness */}
        <HoverableCard style={styles.metricCard}>
          <Text style={styles.metricTitle}>Skill Index</Text>
          <Text style={styles.metricSubtext}>Good Progress</Text>
          <View style={styles.circleContainer}>
            <View style={[styles.progressRing, styles.ring78]}>
              <Text style={styles.ringValueText}>78</Text>
              <Text style={styles.ringTotalText}>/100</Text>
            </View>
          </View>
          <Text style={styles.metricInfoText}>You are highly prepared for entry-level roles.</Text>
          <Pressable style={styles.metricLink}>
            <Text style={styles.metricLinkText}>View Analysis →</Text>
          </Pressable>
        </HoverableCard>

        {/* Internships */}
        <HoverableCard style={styles.metricCard}>
          <Text style={styles.metricTitle}>Opportunities</Text>
          <Text style={styles.metricSubtext}>24 Matches</Text>
          <View style={styles.internshipMatchBox}>
            <View style={styles.matchRateTag}>
              <Text style={styles.matchRateTagText}>92% Best Match</Text>
            </View>
            <Text style={styles.matchJobTitle}>Backend Developer Intern</Text>
            <Text style={styles.matchCompany}>@ TechWave</Text>
          </View>
          <Pressable style={styles.metricLink}>
            <Text style={styles.metricLinkText}>View Internships →</Text>
          </Pressable>
        </HoverableCard>

        {/* Resume ATS */}
        <HoverableCard style={styles.metricCard}>
          <Text style={styles.metricTitle}>Resume</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreGreen}>82</Text>
            <Text style={styles.scoreTotal}>/100</Text>
            <View style={styles.statusPillGreen}>
              <Text style={styles.statusPillTextGreen}>● Status: Good</Text>
            </View>
          </View>
          <View style={styles.barsList}>
            {renderMiniBar('Keywords', 80)}
            {renderMiniBar('Formatting', 92)}
            {renderMiniBar('Job Match', 70)}
          </View>
          <Pressable style={styles.metricLink} onPress={onNavigateToProfile}>
            <Text style={styles.metricLinkText}>Improve Resume →</Text>
          </Pressable>
        </HoverableCard>

        {/* Interviews */}
        <HoverableCard style={styles.metricCard}>
          <Text style={styles.metricTitle}>Interview</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreGreen}>75</Text>
            <Text style={styles.scoreTotal}>/100</Text>
            <View style={styles.statusPillGreen}>
              <Text style={styles.statusPillTextGreen}>Good Progress</Text>
            </View>
          </View>
          <View style={styles.barsList}>
            {renderMiniBar('Technical', 78)}
            {renderMiniBar('Behavioral', 83)}
            {renderMiniBar('Communication', 68)}
          </View>
          <Pressable style={styles.metricLink}>
            <Text style={styles.metricLinkText}>Start Mock Interview →</Text>
          </Pressable>
        </HoverableCard>
      </View>

      {/* 3. AI Career Recommendation Banner */}
      <HoverableCard style={styles.aiRecommendationCard}>
        <View style={styles.aiRecHeaderRow}>
          <Text style={styles.aiRecTitle}>✨ AI Career Recommendation</Text>
          <Pressable>
            <Text style={styles.aiRecLink}>View Personalized Learning Path →</Text>
          </Pressable>
        </View>
        <Text style={styles.aiRecText}>
          Based on your target role of <Text style={styles.boldText}>Backend Developer</Text>, improving <Text style={styles.boldText}>Docker</Text>, <Text style={styles.boldText}>PostgreSQL</Text> and <Text style={styles.boldText}>AWS</Text> could significantly increase your match rate for top opportunities.
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.recommendationBadge}>
            <Text style={styles.recBadgeText}>● Docker</Text>
          </View>
          <View style={styles.recommendationBadge}>
            <Text style={styles.recBadgeText}>● PostgreSQL</Text>
          </View>
          <View style={styles.recommendationBadge}>
            <Text style={styles.recBadgeText}>● AWS</Text>
          </View>
        </View>
      </HoverableCard>

      {/* 4. Your Skill Gaps */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Your Skill Gaps</Text>
          <Pressable>
            <Text style={styles.sectionHeaderLink}>View Complete Skill Gap Analysis →</Text>
          </Pressable>
        </View>

        <View style={[styles.gapCardsRow, !isTablet && styles.gapCardsRowMobile]}>
          {/* Docker Gap */}
          <HoverableCard style={styles.gapCard}>
            <View style={styles.gapCardHeader}>
              <View style={[styles.gapCardIconBox, { backgroundColor: COLORS.blueLight }]}>
                <Text style={styles.gapCardIconText}>🐳</Text>
              </View>
              <Text style={styles.gapCardTitle}>Docker</Text>
              <View style={styles.priorityBadgeRed}>
                <Text style={styles.priorityBadgeTextRed}>High Priority</Text>
              </View>
            </View>
            <View style={styles.gapDetails}>
              <View style={styles.gapLevelRow}>
                <Text style={styles.gapLevelLabel}>Current Level</Text>
                <Text style={styles.gapLevelValue}>40% (Beginner)</Text>
              </View>
              <View style={styles.gapTrack}>
                <View style={[styles.gapBar, { width: '40%', backgroundColor: COLORS.amber }]} />
              </View>
              <View style={styles.gapRequiredRow}>
                <Text style={styles.gapLevelLabel}>Required for Backend Dev</Text>
                <Text style={styles.gapLevelValueBold}>80% (Advanced)</Text>
              </View>
            </View>
            <Pressable style={styles.learnBtn}>
              <Text style={styles.learnBtnText}>Learn Docker →</Text>
            </Pressable>
          </HoverableCard>

          {/* PostgreSQL Gap */}
          <HoverableCard style={styles.gapCard}>
            <View style={styles.gapCardHeader}>
              <View style={[styles.gapCardIconBox, { backgroundColor: COLORS.mint }]}>
                <Text style={styles.gapCardIconText}>🐘</Text>
              </View>
              <Text style={styles.gapCardTitle}>PostgreSQL</Text>
              <View style={styles.priorityBadgeYellow}>
                <Text style={styles.priorityBadgeTextYellow}>Medium Priority</Text>
              </View>
            </View>
            <View style={styles.gapDetails}>
              <View style={styles.gapLevelRow}>
                <Text style={styles.gapLevelLabel}>Current Level</Text>
                <Text style={styles.gapLevelValue}>55% (Intermediate)</Text>
              </View>
              <View style={styles.gapTrack}>
                <View style={[styles.gapBar, { width: '55%', backgroundColor: COLORS.teal }]} />
              </View>
              <View style={styles.gapRequiredRow}>
                <Text style={styles.gapLevelLabel}>Required for Backend Dev</Text>
                <Text style={styles.gapLevelValueBold}>85% (Advanced)</Text>
              </View>
            </View>
            <Pressable style={styles.learnBtn}>
              <Text style={styles.learnBtnText}>Learn PostgreSQL →</Text>
            </Pressable>
          </HoverableCard>

          {/* AWS Gap */}
          <HoverableCard style={styles.gapCard}>
            <View style={styles.gapCardHeader}>
              <View style={[styles.gapCardIconBox, { backgroundColor: COLORS.amberLight }]}>
                <Text style={styles.gapCardIconText}>☁️</Text>
              </View>
              <Text style={styles.gapCardTitle}>AWS</Text>
              <View style={styles.priorityBadgeRed}>
                <Text style={styles.priorityBadgeTextRed}>High Priority</Text>
              </View>
            </View>
            <View style={styles.gapDetails}>
              <View style={styles.gapLevelRow}>
                <Text style={styles.gapLevelLabel}>Current Level</Text>
                <Text style={styles.gapLevelValue}>30% (Novice)</Text>
              </View>
              <View style={styles.gapTrack}>
                <View style={[styles.gapBar, { width: '30%', backgroundColor: COLORS.rose }]} />
              </View>
              <View style={styles.gapRequiredRow}>
                <Text style={styles.gapLevelLabel}>Required for Backend Dev</Text>
                <Text style={styles.gapLevelValueBold}>75% (Intermediate)</Text>
              </View>
            </View>
            <Pressable style={styles.learnBtn}>
              <Text style={styles.learnBtnText}>Learn AWS →</Text>
            </Pressable>
          </HoverableCard>
        </View>
      </View>

      {/* 5. Your Skills */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Your Skills</Text>
          <Pressable>
            <Text style={styles.sectionHeaderLink}>View All Skills →</Text>
          </Pressable>
        </View>
        <HoverableCard style={styles.skillsContainerCard}>
          <View style={[styles.skillsFlexRow, !isTablet && styles.skillsFlexColumn]}>
            <View style={styles.skillHalfCol}>
              {renderSkillRow('Python', 88, COLORS.green)}
              {renderSkillRow('SQL', 81, COLORS.green)}
              {renderSkillRow('Git', 76, COLORS.green)}
              {renderSkillRow('JavaScript', 72, COLORS.green)}
            </View>
            <View style={styles.skillHalfCol}>
              {renderSkillRow('React', 68, COLORS.green)}
              {renderSkillRow('FastAPI', 54, COLORS.amber)}
              {renderSkillRow('Docker', 42, COLORS.amber)}
            </View>
          </View>
        </HoverableCard>
      </View>

      {/* 6. Your Career Goal */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Your Career Goal</Text>
          <Pressable onPress={onNavigateToProfile}>
            <Text style={styles.sectionHeaderLink}>🖊️ Update Career Goal</Text>
          </Pressable>
        </View>
        <HoverableCard style={styles.goalCardContainer}>
          <Text style={styles.goalHintText}>Tracking your progress towards your dream role.</Text>
          <View style={[styles.goalBoxesRow, !isTablet && styles.goalBoxesColumn]}>
            {/* Target Role */}
            <View style={styles.goalBox}>
              <View style={styles.goalBoxLeftContent}>
                <Text style={styles.goalBoxLabel}>TARGET ROLE</Text>
                <Text style={styles.goalBoxTitle}>Backend Developer</Text>
                <Text style={styles.goalBoxSub}>Focusing on Python, APIs, and Cloud Infrastructure</Text>
              </View>
              <View style={styles.goalCircleContainer}>
                <View style={[styles.progressRing, styles.ring74]}>
                  <Text style={styles.ringValueText}>74%</Text>
                  <Text style={styles.ringTotalText}>MATCH</Text>
                </View>
              </View>
            </View>

            {/* Key Target Skills */}
            <View style={styles.goalBox}>
              <Text style={styles.goalBoxLabel}>KEY TARGET SKILLS</Text>
              <View style={styles.goalSkillsList}>
                <Text style={styles.goalSkillItem}>● Python / Django</Text>
                <Text style={styles.goalSkillItem}>● RESTful APIs</Text>
                <Text style={styles.goalSkillItem}>● Docker / K8s</Text>
              </View>
            </View>

            {/* Also Watches */}
            <View style={styles.goalBox}>
              <Text style={styles.goalBoxLabel}>ALSO WATCHES</Text>
              <View style={styles.watchesList}>
                <View style={styles.watchRow}>
                  <Text style={styles.watchLabel}>Data Engineer</Text>
                  <Text style={styles.watchValue}>(68%)</Text>
                </View>
                <View style={styles.watchRow}>
                  <Text style={styles.watchLabel}>Full Stack Dev</Text>
                  <Text style={styles.watchValue}>(65%)</Text>
                </View>
              </View>
            </View>
          </View>
        </HoverableCard>
      </View>

      {/* 7. Personalized Learning */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Personalized Learning</Text>
          <Pressable>
            <Text style={styles.sectionHeaderLink}>View Learning Paths →</Text>
          </Pressable>
        </View>
        <View style={[styles.learningLayout, !isWide && styles.learningLayoutColumn]}>
          {/* Active Path (Large Card) */}
          <HoverableCard style={[styles.activePathCard, !isWide && styles.activePathFullWidth]}>
            <View style={styles.activePathHeader}>
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>ACTIVE PATH</Text>
              </View>
              <Text style={styles.activeIcon}>🎓</Text>
            </View>
            <Text style={styles.activePathTitle}>Backend Development Mastery</Text>
            <Text style={styles.activePathDesc}>
              Complete course covering advanced Python, APIs, databases, and deployment.
            </Text>
            <View style={styles.activeProgressSection}>
              <View style={styles.activeProgressLabels}>
                <Text style={styles.activeProgressLabel}>Overall Progress</Text>
                <Text style={styles.activeProgressVal}>64%</Text>
              </View>
              <View style={styles.activeTrack}>
                <View style={[styles.activeBar, { width: '64%' }]} />
              </View>
            </View>
            <Pressable style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>Continue Learning</Text>
            </Pressable>
          </HoverableCard>

          {/* Recommended Path Cards */}
          <View style={styles.recPathsColumn}>
            {/* Card 1 */}
            <HoverableCard style={styles.recPathRowCard}>
              <View style={[styles.pathIconCircle, { backgroundColor: COLORS.blueLight }]}>
                <Text style={styles.pathIconText}>🐘</Text>
              </View>
              <View style={styles.pathInfo}>
                <Text style={styles.pathTitle}>Advanced PostgreSQL</Text>
                <Text style={styles.pathDesc}>Recommended based on skill gap</Text>
              </View>
              <Pressable style={styles.startPathBtn}>
                <Text style={styles.startPathBtnText}>Start</Text>
              </Pressable>
            </HoverableCard>

            {/* Card 2 */}
            <HoverableCard style={styles.recPathRowCard}>
              <View style={[styles.pathIconCircle, { backgroundColor: COLORS.mint }]}>
                <Text style={styles.pathIconText}>🐳</Text>
              </View>
              <View style={styles.pathInfo}>
                <Text style={styles.pathTitle}>Docker for Beginners</Text>
                <Text style={styles.pathDesc}>Recommended based on skill gap</Text>
              </View>
              <Pressable style={styles.startPathBtn}>
                <Text style={styles.startPathBtnText}>Start</Text>
              </Pressable>
            </HoverableCard>
          </View>
        </View>
      </View>

      {/* 8. Recommended Internships */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Recommended Internships</Text>
          <Pressable>
            <Text style={styles.sectionHeaderLink}>View All Opportunities →</Text>
          </Pressable>
        </View>
        <View style={[styles.internshipCardsRow, !isTablet && styles.internshipCardsMobile]}>
          {/* TechWave */}
          <HoverableCard style={styles.internshipCard}>
            <View style={styles.internHeader}>
              <Text style={styles.internTitle}>Backend Developer Intern</Text>
              <View style={styles.matchTagGreen}>
                <Text style={styles.matchTagTextGreen}>92% Match</Text>
              </View>
            </View>
            <Text style={styles.internCompany}>TechWave • Remote</Text>
            <Text style={styles.internDesc}>
              Looking for a motivated intern to help build scalable APIs using Python and Django.
            </Text>
            <Pressable style={styles.viewOpportunityBtn}>
              <Text style={styles.viewOpportunityBtnText}>View Opportunity</Text>
            </Pressable>
          </HoverableCard>

          {/* DataSphere */}
          <HoverableCard style={styles.internshipCard}>
            <View style={styles.internHeader}>
              <Text style={styles.internTitle}>Data Engineering Intern</Text>
              <View style={styles.matchTagYellow}>
                <Text style={styles.matchTagTextYellow}>88% Match</Text>
              </View>
            </View>
            <Text style={styles.internCompany}>DataSphere • Hybrid</Text>
            <Text style={styles.internDesc}>
              Join our data team to build data pipelines and optimize PostgreSQL databases.
            </Text>
            <Pressable style={styles.viewOpportunityBtn}>
              <Text style={styles.viewOpportunityBtnText}>View Opportunity</Text>
            </Pressable>
          </HoverableCard>

          {/* InnovateLabs */}
          <HoverableCard style={styles.internshipCard}>
            <View style={styles.internHeader}>
              <Text style={styles.internTitle}>Software Engineer Intern</Text>
              <View style={styles.matchTagYellow}>
                <Text style={styles.matchTagTextYellow}>78% Match</Text>
              </View>
            </View>
            <Text style={styles.internCompany}>InnovateLabs • On-site</Text>
            <Text style={styles.internDesc}>
              Generalist software engineering role touching both frontend and backend systems.
            </Text>
            <Pressable style={styles.viewOpportunityBtn}>
              <Text style={styles.viewOpportunityBtnText}>View Opportunity</Text>
            </Pressable>
          </HoverableCard>
        </View>
      </View>

      {/* 9. Application Pipeline & Interview Readiness */}
      <View style={[styles.sectionContainer, styles.rowLayout, !isTablet && styles.rowLayoutMobile]}>
        {/* Application Pipeline */}
        <HoverableCard style={styles.pipelineCard}>
          <View style={styles.cardHeaderWithLink}>
            <Text style={styles.sideCardTitle}>Application Pipeline</Text>
            <Pressable>
              <Text style={styles.sideCardLink}>View Applications</Text>
            </Pressable>
          </View>
          <View style={styles.pipelineTimeline}>
            <View style={styles.timelineConnectLine} />
            <View style={styles.timelineNodesRow}>
              {renderPipelineNode('12', 'Applied')}
              {renderPipelineNode('4', 'Review')}
              {renderPipelineNode('2', 'Interview')}
              {renderPipelineNode('0', 'Selected')}
            </View>
          </View>
        </HoverableCard>

        {/* Interview Readiness */}
        <HoverableCard style={styles.readinessCard}>
          <View style={styles.cardHeaderWithLink}>
            <Text style={styles.sideCardTitle}>Interview Readiness</Text>
            <Pressable>
              <Text style={styles.sideCardLink}>View History</Text>
            </Pressable>
          </View>
          <View style={styles.readinessContentRow}>
            <View style={styles.readinessCircle}>
              <Text style={styles.readinessCircleVal}>75</Text>
            </View>
            <View style={styles.readinessTextWrap}>
              <Text style={styles.readinessRoleTitle}>Recent Mock Interview</Text>
              <Text style={styles.readinessRoleDesc}>Backend Developer Role • 75% Score</Text>
              <View style={styles.readinessStatusRow}>
                <Text style={styles.readinessStatusText}>● Good Progress</Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.startMockBtn}>
            <Text style={styles.startMockBtnText}>Start AI Mock Interview</Text>
          </Pressable>
        </HoverableCard>
      </View>



      {/* 11. Ask SkillSetu AI (Floating Prompt at bottom) */}
      <HoverableCard style={styles.aiChatContainer}>
        <View style={styles.aiChatIconCircle}>
          <Text style={styles.aiChatIconText}>🤖</Text>
        </View>
        <Text style={styles.aiChatTitle}>Ask SkillSetu AI</Text>
        <Text style={styles.aiChatSubtitle}>
          Get personalized career advice, resume reviews, or technical interview prep instantly.
        </Text>
        <View style={styles.aiInputRow}>
          <TextInput
            placeholder="e.g., How can I improve my resume for a backend role?"
            placeholderTextColor={COLORS.muted}
            style={styles.aiInput}
          />
          <Pressable style={styles.aiSubmitBtn}>
            <Text style={styles.aiSubmitBtnText}>➔</Text>
          </Pressable>
        </View>
        <View style={styles.aiChipsRow}>
          <Pressable style={styles.aiChip}>
            <Text style={styles.aiChipText}>Review my resume for Backend roles</Text>
          </Pressable>
          <Pressable style={styles.aiChip}>
            <Text style={styles.aiChipText}>Suggest mock interview questions for Python</Text>
          </Pressable>
          <Pressable style={styles.aiChip}>
            <Text style={styles.aiChipText}>How do I negotiate an internship offer?</Text>
          </Pressable>
        </View>
      </HoverableCard>
    </ScrollView>
  );
}

// Helper render functions
function renderMiniBar(label, percentage) {
  return (
    <View style={styles.miniBarRow}>
      <Text style={styles.miniBarLabel}>{label}</Text>
      <View style={styles.miniBarTrackWrap}>
        <View style={styles.miniBarTrack}>
          <View style={[styles.miniBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.miniBarPercent}>{percentage}%</Text>
      </View>
    </View>
  );
}

function renderSkillRow(name, score, color) {
  return (
    <View style={styles.skillRow}>
      <Text style={styles.skillName}>{name}</Text>
      <View style={styles.skillTrackRow}>
        <View style={styles.skillTrack}>
          <View style={[styles.skillFill, { width: `${score}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.skillScore}>{score}%</Text>
      </View>
    </View>
  );
}

function renderPipelineNode(number, label) {
  return (
    <View style={styles.pipelineNode}>
      <View style={[styles.pipelineNodeCircle, number === '0' ? styles.nodeInactive : styles.nodeActive]}>
        <Text style={[styles.pipelineNodeNumber, number === '0' ? styles.numInactive : styles.numActive]}>
          {number}
        </Text>
      </View>
      <Text style={styles.pipelineNodeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 64,
  },
  // 1. Welcome Row
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  welcomeTextWrap: {
    flex: 1,
    minWidth: 280,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.ink,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 6,
  },
  profileCompletionWrap: {
    width: 240,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 12,
  },
  completionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  completionProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  completionTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    marginRight: 10,
    overflow: 'hidden',
  },
  completionBar: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  completionValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  // 2. Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  metricsGridMobile: {
    flexDirection: 'column',
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  metricSubtext: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  circleContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  // Progress Ring simulation
  progressRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
    borderColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring78: {
    borderTopColor: COLORS.green,
    borderLeftColor: COLORS.green,
    borderRightColor: COLORS.green,
  },
  ring74: {
    borderTopColor: COLORS.green,
    borderLeftColor: COLORS.green,
    borderRightColor: COLORS.green,
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  ringValueText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.ink,
  },
  ringTotalText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
    marginTop: 1,
  },
  metricInfoText: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 15,
  },
  metricLink: {
    borderTopWidth: 1,
    borderTopColor: COLORS.subtle,
    paddingTop: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  metricLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  internshipMatchBox: {
    backgroundColor: COLORS.canvas,
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  matchRateTag: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  matchRateTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.green,
  },
  matchJobTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  matchCompany: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
  },
  scoreGreen: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.green,
  },
  scoreTotal: {
    fontSize: 14,
    color: COLORS.muted,
    marginLeft: 2,
  },
  statusPillGreen: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 12,
  },
  statusPillTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.green,
  },
  barsList: {
    gap: 8,
    marginVertical: 6,
  },
  // Mini Progress Bar inside metric cards
  miniBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniBarLabel: {
    fontSize: 11,
    color: COLORS.muted,
    width: 60,
  },
  miniBarTrackWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.subtle,
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },
  miniBarPercent: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.ink,
    width: 26,
    textAlign: 'right',
  },
  // 3. AI Recommendation Card
  aiRecommendationCard: {
    backgroundColor: '#f0f9ff', // Light soft blue
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 20,
    marginBottom: 28,
  },
  aiRecHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  aiRecTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0369a1',
  },
  aiRecLink: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.blue,
  },
  aiRecText: {
    fontSize: 13.5,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  recommendationBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  recBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369a1',
  },
  // Sections General
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.ink,
  },
  sectionHeaderLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.green,
  },
  sectionHeaderCounter: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
  },
  // 4. Your Skill Gaps
  gapCardsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gapCardsRowMobile: {
    flexDirection: 'column',
  },
  gapCard: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    justifyContent: 'space-between',
  },
  gapCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gapCardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gapCardIconText: {
    fontSize: 16,
  },
  gapCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ink,
    flex: 1,
  },
  priorityBadgeRed: {
    backgroundColor: COLORS.roseLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeTextRed: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.rose,
  },
  priorityBadgeYellow: {
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeTextYellow: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#d97706',
  },
  gapDetails: {
    marginBottom: 16,
  },
  gapLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gapLevelLabel: {
    fontSize: 11.5,
    color: COLORS.muted,
  },
  gapLevelValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
  gapLevelValueBold: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.green,
  },
  gapTrack: {
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  gapBar: {
    height: '100%',
    borderRadius: 3,
  },
  gapRequiredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  learnBtn: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  learnBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
  },
  // 5. Your Skills
  skillsContainerCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 20,
  },
  skillsFlexRow: {
    flexDirection: 'row',
    gap: 32,
  },
  skillsFlexColumn: {
    flexDirection: 'column',
    gap: 0,
  },
  skillHalfCol: {
    flex: 1,
    gap: 12,
  },
  skillRow: {
    marginBottom: 2,
  },
  skillName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  skillTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    borderRadius: 3,
  },
  skillScore: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.ink,
    width: 32,
    textAlign: 'right',
    marginLeft: 10,
  },
  // 6. Your Career Goal
  goalCardContainer: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 20,
  },
  goalHintText: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  goalBoxesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  goalBoxesColumn: {
    flexDirection: 'column',
  },
  goalBox: {
    flex: 1,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  goalBoxLeftContent: {
    flex: 1,
  },
  goalBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  goalBoxTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
  },
  goalBoxSub: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 15,
  },
  goalCircleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
    top: 24,
  },
  goalSkillsList: {
    gap: 6,
  },
  goalSkillItem: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.navy,
  },
  watchesList: {
    gap: 6,
  },
  watchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  watchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  watchValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.green,
  },
  // 7. Personalized Learning
  learningLayout: {
    flexDirection: 'row',
    gap: 16,
  },
  learningLayoutColumn: {
    flexDirection: 'column',
  },
  activePathCard: {
    flex: 1.2,
    backgroundColor: COLORS.green,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    minHeight: 220,
  },
  activePathFullWidth: {
    width: '100%',
  },
  activePathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeTag: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.paper,
  },
  activeIcon: {
    fontSize: 20,
  },
  activePathTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.paper,
    marginTop: 12,
  },
  activePathDesc: {
    fontSize: 12.5,
    color: COLORS.paper,
    opacity: 0.85,
    marginTop: 4,
    lineHeight: 18,
  },
  activeProgressSection: {
    marginVertical: 14,
  },
  activeProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activeProgressLabel: {
    fontSize: 11.5,
    color: COLORS.paper,
    opacity: 0.8,
  },
  activeProgressVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.paper,
  },
  activeTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  activeBar: {
    height: '100%',
    backgroundColor: COLORS.paper,
    borderRadius: 3,
  },
  continueBtn: {
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.green,
  },
  recPathsColumn: {
    flex: 1,
    gap: 12,
  },
  recPathRowCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  pathIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pathIconText: {
    fontSize: 18,
  },
  pathInfo: {
    flex: 1,
  },
  pathTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  pathDesc: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  startPathBtn: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  startPathBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
  },
  // 8. Recommended Internships
  internshipCardsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  internshipCardsMobile: {
    flexDirection: 'column',
  },
  internshipCard: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 180,
  },
  internHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  internTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    flex: 1,
    marginRight: 8,
  },
  matchTagGreen: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchTagTextGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.green,
  },
  matchTagYellow: {
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchTagTextYellow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
  },
  internCompany: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  internDesc: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  viewOpportunityBtn: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewOpportunityBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
  },
  // 9. Pipeline & Readiness Card Row
  rowLayout: {
    flexDirection: 'row',
    gap: 16,
  },
  rowLayoutMobile: {
    flexDirection: 'column',
  },
  pipelineCard: {
    flex: 1.2,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
  },
  readinessCard: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
  },
  cardHeaderWithLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sideCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.ink,
  },
  sideCardLink: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  // Pipeline timeline layout
  pipelineTimeline: {
    height: 70,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 8,
  },
  timelineConnectLine: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: 2,
    backgroundColor: COLORS.subtle,
    top: 20,
  },
  timelineNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pipelineNode: {
    alignItems: 'center',
    width: '24%',
  },
  pipelineNodeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
  nodeActive: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.green,
  },
  nodeInactive: {
    backgroundColor: COLORS.canvas,
    borderColor: COLORS.subtle,
  },
  pipelineNodeNumber: {
    fontSize: 14,
    fontWeight: '900',
  },
  numActive: {
    color: COLORS.green,
  },
  numInactive: {
    color: COLORS.muted,
  },
  pipelineNodeLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 8,
    fontWeight: '600',
  },
  // Readiness card elements
  readinessContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  readinessCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  readinessCircleVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
  },
  readinessTextWrap: {
    flex: 1,
  },
  readinessRoleTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.ink,
  },
  readinessRoleDesc: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 1,
  },
  readinessStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  readinessStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green,
  },
  startMockBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  startMockBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.paper,
  },
  // 10. Today's Action Plan
  actionPlanCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 20,
  },
  actionItemsList: {
    gap: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  checkMark: {
    color: COLORS.paper,
    fontSize: 12,
    fontWeight: '900',
  },
  actionText: {
    fontSize: 13.5,
    color: COLORS.ink,
    fontWeight: '600',
  },
  actionTextCompleted: {
    color: COLORS.muted,
    textDecorationLine: 'line-through',
  },
  // 11. Ask SkillSetu AI
  aiChatContainer: {
    backgroundColor: COLORS.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 28,
    alignItems: 'center',
    marginTop: 12,
  },
  aiChatIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  aiChatIconText: {
    fontSize: 22,
  },
  aiChatTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.ink,
    textAlign: 'center',
  },
  aiChatSubtitle: {
    fontSize: 13.5,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 480,
    marginBottom: 20,
  },
  aiInputRow: {
    width: '100%',
    maxWidth: 520,
    height: 50,
    backgroundColor: COLORS.paper,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
    marginBottom: 16,
  },
  aiInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.ink,
    paddingVertical: 0,
  },
  aiSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSubmitBtnText: {
    color: COLORS.paper,
    fontSize: 14,
    fontWeight: '900',
  },
  aiChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 640,
  },
  aiChip: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  aiChipText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
});
