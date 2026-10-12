import React from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayCard,
  ClayProgressBar,
  useAnimatedNumber,
} from './DashboardDesignTokens';

export default function DashboardMetrics({
  githubState,
  overallGithubScore,
  skillIndexDetails,
  getEvidenceLevelText,
  setIsSkillIndexModalOpen,
  onNavigateToProfile,
  onNavigate,
  // Opportunities
  internshipsLoading,
  internshipsError,
  liveMatchesCount,
  totalOpportunitiesCount,
  recommendedInternships,
  // Applications
  applicationsLoading,
  applicationsError,
  activeAppsCount,
  submittedPercent,
  interviewPercent,
  reviewPercent,
  // Career Target
  activeTargetCareer,
  activeTargetCareers,
  careerReadinessData,
  backendGapData,
  keyTargetSkills,
  formattedSkills,
  isTablet,
  isWide,
}) {
  const targetCareerScore =
    careerReadinessData?.score ??
    careerReadinessData?.overall_readiness ??
    backendGapData?.readiness_score ??
    (overallGithubScore || 0);

  const animatedSkillIndex = useAnimatedNumber(githubState.connected ? overallGithubScore : 78, 900);
  const animatedLiveMatches = useAnimatedNumber(liveMatchesCount, 800);
  const animatedActiveApps = useAnimatedNumber(activeAppsCount, 700);
  const animatedCareerScore = useAnimatedNumber(targetCareerScore, 900);

  const verifiedSkillsPercent = keyTargetSkills.length > 0
    ? Math.min(100, Math.round((formattedSkills.filter(s => s.score >= 70).length / keyTargetSkills.length) * 100))
    : Math.min(100, formattedSkills.length * 10);

  // Circular gauge background calculation for web
  const scoreVal = githubState.connected ? overallGithubScore : 78;
  const scoreDeg = Math.round((scoreVal / 100) * 360);
  const ringBg = Platform.OS === 'web'
    ? `conic-gradient(${CLAY_COLORS.primary} 0deg ${scoreDeg}deg, #E9E4F3 ${scoreDeg}deg 360deg)`
    : CLAY_COLORS.primary;

  return (
    <View style={[styles.metricsGrid, !isWide && styles.metricsGridTablet, !isTablet && styles.metricsGridMobile]} className="dashboard-section-reveal">
      {/* 1. Skill Index Intelligence Card */}
      <ClayCard
        style={styles.metricCard}
        onPress={() => {
          if (githubState.connected) {
            setIsSkillIndexModalOpen(true);
          } else {
            onNavigateToProfile();
          }
        }}
        hoverTranslate={-5}
        hoverScale={1.02}
        interactive={true}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.cardHeaderTitle}>SKILL INDEX</Text>
          <ClayBadge
            label={githubState.connected ? 'VERIFIED' : 'GITHUB'}
            icon="⚡"
            variant={githubState.connected ? 'primary' : 'amber'}
            size="small"
          />
        </View>

        <Text style={styles.cardSubtext} numberOfLines={1}>
          {githubState.connected ? getEvidenceLevelText(overallGithubScore) : 'Technical Evidence'}
        </Text>

        {/* Radial Progress Gauge */}
        <View style={styles.radialGaugeContainer}>
          <View
            style={[
              styles.radialOuterCircle,
              {
                backgroundColor: ringBg,
                background: ringBg,
              },
            ]}
          >
            <View style={styles.radialInnerCircle}>
              <Text style={styles.radialScoreNumber}>{animatedSkillIndex}</Text>
              <Text style={styles.radialScoreDenom}>READINESS</Text>
            </View>
          </View>
        </View>

        <Text style={styles.metricDescription}>
          {githubState.connected
            ? `Technical evidence detected across ${githubState.reposAnalyzed} analyzed repositories.`
            : `Connect your GitHub account to generate verifiable evidence.`}
        </Text>

        <View style={styles.metricFooter}>
          <Text style={styles.metricFooterLink}>
            {githubState.connected ? 'View Skill Analysis →' : 'Connect GitHub →'}
          </Text>
        </View>
      </ClayCard>

      {/* 2. Opportunity Intelligence Card */}
      <ClayCard
        style={styles.metricCard}
        onPress={() => onNavigate && onNavigate('Opportunities')}
        hoverTranslate={-5}
        hoverScale={1.02}
        interactive={true}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.cardHeaderTitle}>OPPORTUNITIES</Text>
          <ClayBadge
            label="≥80% GATE"
            icon="💼"
            variant="emerald"
            size="small"
          />
        </View>

        <Text style={styles.cardSubtext}>
          {internshipsLoading
            ? 'Checking live feeds...'
            : internshipsError
            ? 'Feed unavailable'
            : `${liveMatchesCount} Live Matches Eligible`}
        </Text>

        <View style={styles.opportunitySnippetBox}>
          {internshipsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <ActivityIndicator size="small" color={CLAY_COLORS.primary} />
              <Text style={[styles.snippetCompany, { marginTop: 6 }]}>Syncing live matches...</Text>
            </View>
          ) : internshipsError ? (
            <View>
              <ClayBadge label="Sync Error" variant="danger" size="small" style={{ marginBottom: 6 }} />
              <Text style={styles.snippetRole} numberOfLines={1}>Unable to connect</Text>
              <Text style={styles.snippetCompany} numberOfLines={1}>{internshipsError}</Text>
            </View>
          ) : recommendedInternships.length > 0 ? (
            <View>
              <View style={styles.matchScoreTagRow}>
                <ClayBadge
                  label={`${Math.round(recommendedInternships[0].match_score || recommendedInternships[0].score || 80)}% Match`}
                  variant="emerald"
                  size="small"
                />
              </View>
              <Text style={styles.snippetRole} numberOfLines={1}>
                {recommendedInternships[0].title}
              </Text>
              <Text style={styles.snippetCompany} numberOfLines={1}>
                @ {recommendedInternships[0].company_name || recommendedInternships[0].company || 'Verified Employer'}
              </Text>
            </View>
          ) : (
            <View>
              <ClayBadge label="Strict Match Gate" variant="muted" size="small" style={{ marginBottom: 6 }} />
              <Text style={styles.snippetRole} numberOfLines={1}>Live Opportunity Feed</Text>
              <Text style={styles.snippetCompany} numberOfLines={2}>
                {totalOpportunitiesCount > 0 ? `${totalOpportunitiesCount} active roles · Build skills to unlock matches` : 'Build verified skills to unlock matches'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.metricDescription}>
          Match rate dynamically computed against verified repository evidence & required taxonomy.
        </Text>

        <View style={styles.metricFooter}>
          <Text style={styles.metricFooterLink}>View Internships →</Text>
        </View>
      </ClayCard>

      {/* 3. Application Intelligence Card */}
      <ClayCard
        style={styles.metricCard}
        onPress={() => onNavigate && onNavigate('Applications')}
        hoverTranslate={-5}
        hoverScale={1.02}
        interactive={true}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.cardHeaderTitle}>APPLICATIONS</Text>
          <ClayBadge
            label={applicationsLoading ? 'LOADING' : applicationsError ? 'ERROR' : activeAppsCount > 0 ? 'ACTIVE' : 'READY'}
            icon="📝"
            variant={applicationsError ? 'danger' : activeAppsCount > 0 ? 'emerald' : 'sky'}
            size="small"
          />
        </View>

        <View style={styles.scoreRowLarge}>
          {applicationsLoading ? (
            <ActivityIndicator size="small" color={CLAY_COLORS.primary} style={{ marginRight: 8 }} />
          ) : (
            <Text style={styles.scoreBigNumber}>{animatedActiveApps}</Text>
          )}
          <Text style={styles.scoreLabelSuffix}>Active In Pipeline</Text>
        </View>

        <View style={styles.miniBarsContainer}>
          <View style={styles.miniBarItem}>
            <View style={styles.miniBarHeader}>
              <Text style={styles.miniBarLabel}>Submitted</Text>
              <Text style={styles.miniBarVal}>{submittedPercent}%</Text>
            </View>
            <ClayProgressBar progress={submittedPercent} color={CLAY_COLORS.primary} height={5} borderRadius={3} />
          </View>

          <View style={styles.miniBarItem}>
            <View style={styles.miniBarHeader}>
              <Text style={styles.miniBarLabel}>Interviews</Text>
              <Text style={styles.miniBarVal}>{interviewPercent}%</Text>
            </View>
            <ClayProgressBar progress={interviewPercent} color={CLAY_COLORS.secondary} height={5} borderRadius={3} />
          </View>

          <View style={styles.miniBarItem}>
            <View style={styles.miniBarHeader}>
              <Text style={styles.miniBarLabel}>Under Review</Text>
              <Text style={styles.miniBarVal}>{reviewPercent}%</Text>
            </View>
            <ClayProgressBar progress={reviewPercent} color={CLAY_COLORS.sky} height={5} borderRadius={3} />
          </View>
        </View>

        <View style={styles.metricFooter}>
          <Text style={styles.metricFooterLink}>Track Applications →</Text>
        </View>
      </ClayCard>

      {/* 4. Career Target Intelligence Card */}
      <ClayCard
        style={styles.metricCard}
        onPress={onNavigateToProfile}
        hoverTranslate={-5}
        hoverScale={1.02}
        interactive={true}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.cardHeaderTitle}>CAREER TARGET</Text>
          <ClayBadge
            label={activeTargetCareers.length > 0 ? 'ACTIVE' : 'SELECT'}
            icon="🎯"
            variant="secondary"
            size="small"
          />
        </View>

        <View style={styles.scoreRowLarge}>
          <Text style={[styles.scoreBigNumber, { color: CLAY_COLORS.secondary }]}>{animatedCareerScore}</Text>
          <Text style={styles.scoreLabelSuffix}>/100 Readiness</Text>
        </View>

        <Text style={styles.targetCareerName} numberOfLines={1}>
          {activeTargetCareer}
        </Text>

        <View style={styles.miniBarsContainer}>
          <View style={styles.miniBarItem}>
            <View style={styles.miniBarHeader}>
              <Text style={styles.miniBarLabel}>Target Fit</Text>
              <Text style={styles.miniBarVal}>{targetCareerScore}%</Text>
            </View>
            <ClayProgressBar progress={targetCareerScore} color={CLAY_COLORS.secondary} height={5} borderRadius={3} />
          </View>

          <View style={styles.miniBarItem}>
            <View style={styles.miniBarHeader}>
              <Text style={styles.miniBarLabel}>Verified Skills</Text>
              <Text style={styles.miniBarVal}>{verifiedSkillsPercent}%</Text>
            </View>
            <ClayProgressBar progress={verifiedSkillsPercent} color={CLAY_COLORS.emerald} height={5} borderRadius={3} />
          </View>

          <View style={styles.miniBarItem}>
            <View style={styles.miniBarHeader}>
              <Text style={styles.miniBarLabel}>Skill Readiness</Text>
              <Text style={styles.miniBarVal}>{backendGapData?.readiness_score || targetCareerScore}%</Text>
            </View>
            <ClayProgressBar progress={backendGapData?.readiness_score || targetCareerScore} color={CLAY_COLORS.primary} height={5} borderRadius={3} />
          </View>
        </View>

        <View style={styles.metricFooter}>
          <Text style={styles.metricFooterLink}>Update Target Role →</Text>
        </View>
      </ClayCard>
    </View>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  metricsGridTablet: {
    flexWrap: 'wrap',
  },
  metricsGridMobile: {
    flexDirection: 'column',
  },
  metricCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 18,
    justifyContent: 'space-between',
    minHeight: 270,
    ...CLAY_SHADOWS.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
  },
  cardSubtext: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.foregroundDark,
    fontWeight: '600',
    marginBottom: 10,
  },
  radialGaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  radialOuterCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  radialInnerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialScoreNumber: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 22,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    lineHeight: 24,
  },
  radialScoreDenom: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.5,
  },
  metricDescription: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
    textAlign: 'center',
    marginVertical: 6,
  },
  opportunitySnippetBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 12,
    marginVertical: 8,
  },
  matchScoreTagRow: {
    marginBottom: 6,
  },
  snippetRole: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  snippetCompany: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  scoreRowLarge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 6,
  },
  scoreBigNumber: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 28,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  scoreLabelSuffix: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  targetCareerName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 6,
  },
  miniBarsContainer: {
    gap: 7,
    marginVertical: 6,
  },
  miniBarItem: {
    gap: 3,
  },
  miniBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniBarLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  miniBarVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  metricFooter: {
    borderTopWidth: 1,
    borderTopColor: CLAY_COLORS.cardBorder,
    paddingTop: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  metricFooterLink: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
