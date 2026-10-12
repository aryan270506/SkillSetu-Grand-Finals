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

export default function SkillGapsSection({
  gapSkills = [],
  verifiedSkills = [],
  totalSkillsCount = 9,
  onSelectSkillForSearch,
  onNavigateToSkills,
  isDesktop,
}) {
  const getSkillName = (s) => {
    if (!s) return 'Technical Skill';
    if (typeof s === 'string') return s;
    return s.skill_name || s.name || s.title || 'Technical Skill';
  };

  // Dynamically select top priority skill gap
  const topGapSkill = gapSkills.length > 0 ? gapSkills[0] : null;
  const topSkillName = topGapSkill ? getSkillName(topGapSkill) : '';
  const topCurr = topGapSkill ? Math.round(topGapSkill.current_score || 0) : 0;
  const topTarget = topGapSkill ? Math.round(topGapSkill.target_score || 80) : 80;
  const topGap = topGapSkill ? Math.round(topGapSkill.gap != null ? topGapSkill.gap : (topCurr - topTarget)) : 0;

  return (
    <View style={[styles.sectionContainer, CLAY_SHADOWS.card]}>
      <SectionHeader
        preTitle="ACTIONABLE FOCUS"
        title="Skill Gaps To Close"
        subtitle="The highest-impact skills for your current career target."
        rightElement={
          <ClayButton
            style={styles.headerBtn}
            onPress={() => onNavigateToSkills && onNavigateToSkills('Skills', {})}
          >
            <Text style={styles.headerBtnText}>
              Go to Skill Assessment [{verifiedSkills.length}/{totalSkillsCount}]
            </Text>
          </ClayButton>
        }
      />

      {/* 1. Highlighted "NEXT SKILL TO MASTER" card */}
      {topGapSkill && (
        <ClayCard style={styles.nextSkillMasterCard} hoverTranslate={-3}>
          <View style={styles.nextSkillHeaderRow}>
            <View style={styles.nextSkillBadgeRow}>
              <Text style={{ fontSize: 16 }}>🎯</Text>
              <Text style={styles.nextSkillPreTitle}>NEXT SKILL TO MASTER</Text>
            </View>
            <ClayBadge label="HIGHEST IMPACT" variant="danger" size="small" />
          </View>

          <View style={styles.nextSkillBodyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextSkillName}>{topSkillName}</Text>
              <Text style={styles.nextSkillDesc}>
                Your highest-impact current competency gap. Complete the targeted lecture track and practical workflow to earn verification evidence.
              </Text>
            </View>

            <View style={styles.nextSkillMetricsCol}>
              <View style={styles.nextSkillStatsBox}>
                <View style={styles.statMiniBox}>
                  <Text style={styles.statMiniKey}>Current</Text>
                  <Text style={styles.statMiniVal}>{topCurr}%</Text>
                </View>
                <View style={styles.statMiniBox}>
                  <Text style={styles.statMiniKey}>Target</Text>
                  <Text style={styles.statMiniVal}>{topTarget}%</Text>
                </View>
                <View style={styles.statMiniBox}>
                  <Text style={styles.statMiniKey}>Gap</Text>
                  <Text style={[styles.statMiniVal, { color: CLAY_COLORS.danger }]}>
                    {topGap}%
                  </Text>
                </View>
              </View>

              <ClayButton
                style={styles.startLearningBtn}
                onPress={() => onSelectSkillForSearch(topSkillName)}
              >
                <Text style={styles.startLearningBtnText}>
                  Start Recommended Learning →
                </Text>
              </ClayButton>
            </View>
          </View>
        </ClayCard>
      )}

      {/* 2. Skill Gaps Table / Modern List */}
      <View style={styles.tableWrapper}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.thCell, { flex: 2.5 }]}>Skill / Competency</Text>
          <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>Identified</Text>
          <Text style={[styles.thCell, { flex: 1.2, textAlign: 'center' }]}>Target</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>Gap</Text>
          <Text style={[styles.thCell, { flex: 1.3, textAlign: 'center' }]}>Priority</Text>
          <Text style={[styles.thCell, { flex: 1.5, textAlign: 'right' }]}>Action</Text>
        </View>

        {gapSkills.slice(0, 6).map((gapItem, idx) => {
          const sName = getSkillName(gapItem);
          const currScore = Math.round(gapItem.current_score || 0);
          const targetScore = Math.round(gapItem.target_score || 80);
          const gapVal = Math.round(gapItem.gap != null ? gapItem.gap : (currScore - targetScore));
          const isEssential = gapItem.importance === 'essential' || gapItem.importance === 'CORE' || (targetScore - currScore >= 40);
          const priorityLabel = isEssential ? 'High Priority' : 'Medium Priority';
          const priorityVariant = isEssential ? 'danger' : 'amber';
          const hasCourse = gapItem.recommended_courses && gapItem.recommended_courses.length > 0;
          const actionLabel = hasCourse ? 'Explore Course' : 'Practice Skill';

          return (
            <View
              key={gapItem.skill_id || idx}
              style={[
                styles.tableRow,
                idx % 2 === 1 && styles.tableRowAlt,
              ]}
            >
              <View style={{ flex: 2.5, marginRight: 8 }}>
                <Text style={styles.tdSkillName} numberOfLines={1}>
                  {sName}
                </Text>
              </View>

              <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'center' }]}>
                {currScore}%
              </Text>
              <Text style={[styles.tdCell, { flex: 1.2, textAlign: 'center' }]}>
                {targetScore}%
              </Text>
              <Text style={[styles.tdGapNegative, { flex: 1, textAlign: 'center' }]}>
                {gapVal > 0 ? `+${gapVal}%` : `${gapVal}%`}
              </Text>

              <View style={{ flex: 1.3, alignItems: 'center' }}>
                <ClayBadge
                  label={priorityLabel}
                  variant={priorityVariant}
                  size="small"
                />
              </View>

              <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                <ClayButton
                  style={styles.tableActionBtn}
                  onPress={() => onSelectSkillForSearch(sName)}
                >
                  <Text style={styles.tableActionBtnText}>{actionLabel}</Text>
                </ClayButton>
              </View>
            </View>
          );
        })}
      </View>

      <ClayButton
        style={styles.tableFooterLink}
        onPress={() => onNavigateToSkills && onNavigateToSkills('Skills', {})}
      >
        <Text style={styles.tableFooterLinkText}>
          Select to view all {gapSkills.length} Target Skill gaps on chart ➔
        </Text>
      </ClayButton>
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
  headerBtn: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  headerBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  nextSkillMasterCard: {
    backgroundColor: '#FFF1F2',
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    padding: 16,
    marginBottom: 18,
  },
  nextSkillHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextSkillBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextSkillPreTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.danger,
    letterSpacing: 0.8,
  },
  nextSkillBodyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  nextSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 4,
  },
  nextSkillDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 17,
    maxWidth: 480,
  },
  nextSkillMetricsCol: {
    alignItems: 'flex-end',
    gap: 8,
  },
  nextSkillStatsBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 14,
  },
  statMiniBox: {
    alignItems: 'center',
  },
  statMiniKey: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9,
    color: CLAY_COLORS.muted,
  },
  statMiniVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  startLearningBtn: {
    backgroundColor: CLAY_COLORS.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
  },
  startLearningBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tableWrapper: {
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: CLAY_COLORS.cardBorder,
  },
  thCell: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: CLAY_COLORS.recessedBorder,
  },
  tableRowAlt: {
    backgroundColor: '#FAF8FC',
  },
  tdSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  tdCell: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  tdGapNegative: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.danger,
  },
  tableActionBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  tableActionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  tableFooterLink: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  tableFooterLinkText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
