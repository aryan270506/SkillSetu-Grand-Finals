import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
  SectionHeader,
} from './LearningDesignTokens';

export default function CompetencyBlueprintSection({
  skills = [],
  verifiedSkills = [],
  gapSkills = [],
  readinessScore = 0.82,
  displayCareerName,
  onNavigateToSkills,
  isDesktop,
}) {
  const pctValue = Math.round(readinessScore * 100);

  const getSkillName = (s) => {
    if (!s) return 'Technical Skill';
    if (typeof s === 'string') return s;
    return s.skill_name || s.name || s.title || 'Technical Skill';
  };

  return (
    <View style={[styles.sectionContainer, CLAY_SHADOWS.card]}>
      <SectionHeader
        preTitle="COMPETENCY BLUEPRINT"
        title="Skills Required Breakdown"
        subtitle={`${verifiedSkills.length} of ${skills.length} core skills verified • ${gapSkills.length} critical gaps remaining`}
        rightElement={
          <ClayButton
            style={styles.exploreSkillsBtn}
            onPress={() => onNavigateToSkills && onNavigateToSkills('Skills', {})}
          >
            <Text style={styles.exploreSkillsBtnText}>
              View All {skills.length} Skills ➔
            </Text>
          </ClayButton>
        }
      />

      <View
        style={[
          styles.blueprintLayoutRow,
          isDesktop ? styles.layoutDesktop : styles.layoutMobile,
        ]}
      >
        {/* Left Col: Target Readiness Gauge */}
        <View style={styles.gaugeCol}>
          <View style={styles.gaugeCard}>
            <View style={styles.circleGauge}>
              <Text style={styles.circleNumber}>{pctValue}%</Text>
              <Text style={styles.circleLabel}>CAREER FIT</Text>
            </View>

            <Text style={styles.gaugeRoleTitle}>
              Target: {displayCareerName}
            </Text>
            <Text style={styles.gaugeDesc}>
              {verifiedSkills.length} of {skills.length} target role competencies verified. Focus on closing critical gaps to maximize interview readiness.
            </Text>

            <ClayButton
              style={styles.matrixActionBtn}
              onPress={() => onNavigateToSkills && onNavigateToSkills('Skills', { focusCareer: displayCareerName })}
            >
              <Text style={styles.matrixActionBtnText}>
                Evaluate Required Skill Matrix
              </Text>
            </ClayButton>
          </View>
        </View>

        {/* Right Col: Skills Progress List with 4-Point Verification Matrix */}
        <View style={styles.skillsListCol}>
          <View style={styles.skillsListContainer}>
            {skills.slice(0, 5).map((skillItem, idx) => {
              const sName = getSkillName(skillItem);
              const curr = Math.round(skillItem.current_score || 0);
              const target = Math.round(skillItem.target_score || 80);
              const isVerified = Boolean(skillItem.is_verified || skillItem.canonical_status === 'verified' || skillItem.status === 'VERIFIED' || skillItem.status === 'Verified');
              const isDeveloping = curr > 0 && !isVerified;

              const statusLabel = isVerified
                ? '✓ Verified'
                : (skillItem.status || (isDeveloping ? `${curr}% In Progress` : 'Assessment Required'));

              const barColor = isVerified
                ? CLAY_COLORS.emerald
                : isDeveloping
                  ? (curr >= 50 ? CLAY_COLORS.primary : CLAY_COLORS.sky)
                  : CLAY_COLORS.danger;

              const statusBadgeVariant = isVerified
                ? 'emerald'
                : isDeveloping
                  ? 'sky'
                  : 'amber';

              return (
                <ClayCard
                  key={skillItem.skill_id || idx}
                  style={styles.skillItemCard}
                  interactive={false}
                >
                  <View style={styles.skillItemTopRow}>
                    <Text style={styles.skillName} numberOfLines={1}>
                      {sName}
                    </Text>
                    <ClayBadge
                      label={statusLabel}
                      variant={statusBadgeVariant}
                      size="small"
                    />
                  </View>

                  <View style={styles.skillTrack}>
                    <View
                      style={[
                        styles.skillFill,
                        {
                          width: `${Math.min(100, Math.max(5, isVerified ? 100 : curr))}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>

                  {/* 4-Component Verification Matrix */}
                  <View style={styles.verificationMatrixRow}>
                    <View
                      style={[
                        styles.matrixChip,
                        skillItem.course_completed ? styles.matrixChipActive : styles.matrixChipInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.matrixChipText,
                          skillItem.course_completed ? styles.matrixTextActive : styles.matrixTextInactive,
                        ]}
                      >
                        {skillItem.course_completed ? '✓ Learning' : '○ Learning'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.matrixChip,
                        skillItem.test_passed ? styles.matrixChipActive : styles.matrixChipInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.matrixChipText,
                          skillItem.test_passed ? styles.matrixTextActive : styles.matrixTextInactive,
                        ]}
                      >
                        {skillItem.test_passed ? '✓ Test' : (skillItem.test_failed ? '✗ Test' : '○ Test')}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.matrixChip,
                        skillItem.assignment_completed ? styles.matrixChipActive : styles.matrixChipInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.matrixChipText,
                          skillItem.assignment_completed ? styles.matrixTextActive : styles.matrixTextInactive,
                        ]}
                      >
                        {skillItem.assignment_completed ? '✓ Project' : '○ Project'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.matrixChip,
                        skillItem.github_evidence ? styles.matrixChipSky : styles.matrixChipInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.matrixChipText,
                          skillItem.github_evidence ? styles.matrixTextSky : styles.matrixTextInactive,
                        ]}
                      >
                        {skillItem.github_evidence ? '✓ GitHub' : '○ GitHub'}
                      </Text>
                    </View>
                  </View>
                </ClayCard>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    marginBottom: 20,
  },
  exploreSkillsBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  exploreSkillsBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  blueprintLayoutRow: {
    gap: 20,
  },
  layoutDesktop: {
    flexDirection: 'row',
  },
  layoutMobile: {
    flexDirection: 'column',
  },
  gaugeCol: {
    flex: 1,
    minWidth: 260,
  },
  gaugeCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 18,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
  },
  circleGauge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 6,
    borderColor: CLAY_COLORS.primary,
    backgroundColor: CLAY_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...CLAY_SHADOWS.badge,
  },
  circleNumber: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 22,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  circleLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  gaugeRoleTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 4,
    textAlign: 'center',
  },
  gaugeDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
  },
  matrixActionBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  matrixActionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  skillsListCol: {
    flex: 2,
  },
  skillsListContainer: {
    gap: 10,
  },
  skillItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 12,
  },
  skillItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  skillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    flex: 1,
    marginRight: 8,
  },
  skillTrack: {
    height: 6,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  skillFill: {
    height: '100%',
    borderRadius: 3,
  },
  verificationMatrixRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  matrixChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
  },
  matrixChipActive: {
    backgroundColor: CLAY_COLORS.emeraldLight,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  matrixChipInactive: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderColor: CLAY_COLORS.cardBorder,
  },
  matrixChipSky: {
    backgroundColor: CLAY_COLORS.skyLight,
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  matrixChipText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
  },
  matrixTextActive: {
    color: CLAY_COLORS.emeraldDark,
  },
  matrixTextInactive: {
    color: CLAY_COLORS.mutedLight,
  },
  matrixTextSky: {
    color: CLAY_COLORS.skyDark,
  },
});
