import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
  ClayProgressBar,
  SectionHeader,
} from './DashboardDesignTokens';

export default function SkillGapsSection({
  computedGapData,
  setIsSkillGapAnalysisModalOpen,
  onNavigate,
  isTablet,
}) {
  const getLevelCategory = (level) => {
    if (level >= 85) return 'Advanced';
    if (level >= 70) return 'Proficient';
    if (level >= 50) return 'Intermediate';
    if (level >= 25) return 'Beginner';
    return 'Novice';
  };

  const getBarBgColor = (level) => {
    if (level >= 75) return CLAY_COLORS.emerald;
    if (level >= 50) return CLAY_COLORS.sky;
    if (level >= 35) return CLAY_COLORS.amber;
    return CLAY_COLORS.danger;
  };

  const getIconBgColor = (sName, i) => {
    const l = (sName || '').toLowerCase();
    if (l.includes('docker') || l.includes('react native') || i === 0) return CLAY_COLORS.skyLight;
    if (l.includes('postgres') || l.includes('react') || i === 1) return CLAY_COLORS.emeraldLight;
    if (l.includes('aws') || l.includes('python') || i === 2) return CLAY_COLORS.amberLight;
    return CLAY_COLORS.primaryLight;
  };

  return (
    <View style={styles.sectionWrapper} className="dashboard-section-reveal">
      <SectionHeader
        preTitle="COMPETENCY DIAGNOSTIC"
        title="Your Skill Gaps"
        subtitle="Priority skills to strengthen for your target career and live matching opportunities."
        rightElement={
          <ClayButton
            variant="secondary"
            onPress={() => setIsSkillGapAnalysisModalOpen(true)}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>Complete Gap Analysis →</Text>
          </ClayButton>
        }
      />

      <View style={[styles.gapCardsGrid, !isTablet && styles.gapCardsGridMobile]}>
        {computedGapData.top_gaps && computedGapData.top_gaps.length > 0 ? (
          computedGapData.top_gaps.map((gap, idx) => {
            const isRedPriority = gap.priority === 'High Priority';
            const requiredLabel = gap.required_by_careers && gap.required_by_careers.length > 0
              ? (gap.required_by_careers.length > 1 ? `${gap.required_by_careers.length} Selected Roles` : gap.required_by_careers[0])
              : computedGapData.target_career;

            return (
              <ClayCard
                key={gap.skill_name + '_' + idx}
                style={styles.gapCard}
                hoverTranslate={-4}
                hoverScale={1.02}
                interactive={true}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: getIconBgColor(gap.skill_name, idx) }]}>
                    <Text style={{ fontSize: 16 }}>{gap.icon || '🚀'}</Text>
                  </View>
                  <Text style={styles.skillTitle} numberOfLines={1}>
                    {gap.skill_name}
                  </Text>
                  <ClayBadge
                    label={gap.priority || 'Medium Priority'}
                    variant={isRedPriority ? 'danger' : 'amber'}
                    size="small"
                  />
                </View>

                {/* Levels & Bar */}
                <View style={styles.levelsWrapper}>
                  <View style={styles.levelRow}>
                    <Text style={styles.levelLabel}>Current Level</Text>
                    <Text style={styles.levelVal}>
                      {gap.current_level}% <Text style={styles.levelCategory}>({getLevelCategory(gap.current_level)})</Text>
                    </Text>
                  </View>

                  <View style={{ marginVertical: 6 }}>
                    <ClayProgressBar
                      progress={gap.current_level}
                      color={getBarBgColor(gap.current_level)}
                      height={6}
                      borderRadius={3}
                    />
                  </View>

                  <View style={styles.levelRow}>
                    <Text style={styles.levelLabel} numberOfLines={1}>
                      Required for {requiredLabel}
                    </Text>
                    <Text style={styles.requiredVal}>
                      {gap.required_level}%
                    </Text>
                  </View>

                  <View style={styles.gapMetaRow}>
                    <ClayBadge
                      label={`Gap: ${Math.max(0, gap.required_level - gap.current_level)}%`}
                      variant="primary"
                      size="small"
                    />
                  </View>
                </View>

                {/* CTA */}
                <ClayButton
                  variant="secondary"
                  onPress={() => onNavigate && onNavigate('Learning')}
                  style={styles.learnBtn}
                >
                  <Text style={styles.learnBtnText}>Learn {gap.skill_name} →</Text>
                </ClayButton>
              </ClayCard>
            );
          })
        ) : (
          <ClayCard style={[styles.gapCard, { width: '100%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <ClayBadge label="GOAL READY" icon="✓" variant="emerald" size="small" />
              <Text style={styles.skillTitle}>Target Role Competency</Text>
            </View>
            <Text style={{ fontFamily: CLAY_FONTS.body, fontSize: 13, color: CLAY_COLORS.muted, lineHeight: 18 }}>
              Your verified evidence strongly covers the key skills required for {computedGapData.target_career}.
            </Text>
          </ClayCard>
        )}
      </View>
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
  gapCardsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  gapCardsGridMobile: {
    flexDirection: 'column',
  },
  gapCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 18,
    justifyContent: 'space-between',
    minHeight: 220,
    ...CLAY_SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    flex: 1,
  },
  levelsWrapper: {
    marginVertical: 4,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
  },
  levelVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  levelCategory: {
    fontFamily: CLAY_FONTS.body,
    fontWeight: '500',
    color: CLAY_COLORS.muted,
  },
  requiredVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  gapMetaRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  learnBtn: {
    marginTop: 14,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
  },
  learnBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
