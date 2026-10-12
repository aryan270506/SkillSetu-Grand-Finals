import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
  SectionHeader,
  useAnimatedNumber,
} from './DashboardDesignTokens';

export default function CareerTrajectorySection({
  activeTargetCareer,
  activeTargetCareers,
  careerReadinessData,
  backendGapData,
  overallGithubScore,
  keyTargetSkills,
  onNavigateToProfile,
  isTablet,
}) {
  const readinessVal =
    careerReadinessData?.score ??
    careerReadinessData?.overall_readiness ??
    backendGapData?.readiness_score ??
    (overallGithubScore || 0);

  const animatedReadiness = useAnimatedNumber(readinessVal, 900);

  return (
    <View style={styles.sectionWrapper} className="dashboard-section-reveal">
      <SectionHeader
        preTitle="CAREER TRAJECTORY"
        title="Career Goal & Alignment"
        subtitle="Tracking multi-career readiness, primary target alignment, and cross-domain market requirements."
        rightElement={
          <ClayButton
            variant="secondary"
            onPress={onNavigateToProfile}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>Update Career Goal →</Text>
          </ClayButton>
        }
      />

      <ClayCard style={styles.goalContainerCard} interactive={false}>
        <View style={[styles.goalBoxesRow, !isTablet && styles.goalBoxesColumn]}>
          {/* 1. Target Role & Match */}
          <View style={styles.goalBox}>
            <View style={styles.boxHeader}>
              <Text style={styles.boxLabel}>PRIMARY TARGET ROLE</Text>
              <ClayBadge label="ACTIVE" icon="🎯" variant="primary" size="small" />
            </View>

            <View style={styles.targetRoleContentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>{activeTargetCareer}</Text>
                <Text style={styles.roleSubtitle}>
                  {activeTargetCareers.length > 1
                    ? `Primary target role (+${activeTargetCareers.length - 1} secondary tracks)`
                    : 'Primary career target'}
                </Text>
              </View>

              <View style={styles.ringContainer}>
                <View style={styles.ringOuter}>
                  <Text style={styles.ringValue}>{animatedReadiness}%</Text>
                  <Text style={styles.ringLabel}>MATCH</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Key Target Skills */}
          <View style={styles.goalBox}>
            <View style={styles.boxHeader}>
              <Text style={styles.boxLabel}>KEY MARKET SKILLS</Text>
              <ClayBadge label="TAXONOMY" icon="⚡" variant="sky" size="small" />
            </View>

            <View style={styles.skillsList}>
              {keyTargetSkills.length > 0 ? (
                keyTargetSkills.slice(0, 4).map((skName, i) => (
                  <View key={i} style={styles.skillChip}>
                    <Text style={styles.skillDot}>●</Text>
                    <Text style={styles.skillItemText} numberOfLines={1}>{skName}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySkillText}>
                  Select target roles in Profile to populate required market taxonomy.
                </Text>
              )}
            </View>
          </View>

          {/* 3. Also Watches (Secondary Careers) */}
          <View style={styles.goalBox}>
            <View style={styles.boxHeader}>
              <Text style={styles.boxLabel}>ALSO WATCHES</Text>
              <ClayBadge label="CROSS-TRACK" icon="👁️" variant="amber" size="small" />
            </View>

            <View style={styles.watchesList}>
              {activeTargetCareers.length > 1 ? (
                activeTargetCareers.slice(1, 4).map((secRole, i) => (
                  <View key={i} style={styles.watchRow}>
                    <Text style={styles.watchName} numberOfLines={1}>{secRole}</Text>
                    <ClayBadge label="Tracked" variant="emerald" size="small" />
                  </View>
                ))
              ) : (
                <Text style={styles.emptySkillText}>
                  Add secondary career goals in Profile to track multi-domain opportunities.
                </Text>
              )}
            </View>
          </View>
        </View>
      </ClayCard>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrapper: {
    marginBottom: 28,
  },
  headerBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.button,
  },
  headerBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  goalContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 20,
    ...CLAY_SHADOWS.card,
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
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    borderRadius: CLAY_RADII.cardMedium,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  boxLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
  },
  targetRoleContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  roleTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  roleSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    marginTop: 3,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: CLAY_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonSecondary,
  },
  ringValue: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    lineHeight: 17,
  },
  ringLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  skillsList: {
    gap: 6,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillDot: {
    fontSize: 8,
    color: CLAY_COLORS.primary,
  },
  skillItemText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  emptySkillText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
  },
  watchesList: {
    gap: 8,
  },
  watchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  watchName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
    flex: 1,
    marginRight: 6,
  },
});
