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
  useAnimatedNumber,
} from './DashboardDesignTokens';
import { formatCareerTitle } from '../../services/profileService';

export default function PersonalizedLearningSection({
  learningPathData,
  activeTargetCareer,
  careerReadinessData,
  backendGapData,
  computedGapData,
  onNavigate,
  isWide,
}) {
  const readinessScore = careerReadinessData?.score ?? backendGapData?.readiness_score ?? 0;
  const animatedReadiness = useAnimatedNumber(readinessScore, 800);

  return (
    <View style={styles.sectionWrapper} className="dashboard-section-reveal">
      <SectionHeader
        preTitle="CURRICULUM ENGINE"
        title="Personalized Learning"
        subtitle="Structured learning curriculum addressing your verified skill gaps with authorized courseware."
        rightElement={
          <ClayButton
            variant="secondary"
            onPress={() => onNavigate && onNavigate('Learning')}
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>View Learning Paths →</Text>
          </ClayButton>
        }
      />

      <View style={[styles.learningLayout, !isWide && styles.learningLayoutColumn]}>
        {/* Featured Active Path Card */}
        <ClayCard
          style={[styles.activePathCard, !isWide && styles.activePathFullWidth]}
          hoverTranslate={-4}
          hoverScale={1.015}
          interactive={true}
          onPress={() => onNavigate && onNavigate('Learning')}
        >
          <View style={styles.activeHeader}>
            <ClayBadge
              label="ACTIVE PATH"
              icon="🎓"
              variant="primary"
              size="small"
            />
            <ClayBadge
              label="CURRICULUM"
              variant="emerald"
              size="small"
            />
          </View>

          <Text style={styles.activePathTitle}>
            {formatCareerTitle(learningPathData?.career_name || activeTargetCareer)} Learning Track
          </Text>

          <Text style={styles.activePathDesc}>
            Structured learning curriculum addressing your verified skill gaps with authorized courseware and assessment milestones.
          </Text>

          {/* Progress Bar */}
          <View style={styles.activeProgressContainer}>
            <View style={styles.activeProgressHeader}>
              <Text style={styles.activeProgressLabel}>Target Career Readiness</Text>
              <Text style={styles.activeProgressVal}>{animatedReadiness}%</Text>
            </View>
            <ClayProgressBar
              progress={readinessScore}
              color={CLAY_COLORS.primary}
              height={7}
              borderRadius={4}
              showGlow={true}
            />
          </View>

          <ClayButton
            variant="primary"
            onPress={() => onNavigate && onNavigate('Learning')}
            style={styles.continueBtn}
          >
            <Text style={styles.continueBtnText}>Continue Learning Track →</Text>
          </ClayButton>
        </ClayCard>

        {/* Recommended Path Cards Column */}
        <View style={styles.recPathsColumn}>
          {computedGapData.top_gaps && computedGapData.top_gaps.length > 0 ? (
            computedGapData.top_gaps.slice(0, 2).map((gap, i) => (
              <ClayCard
                key={i}
                style={styles.recPathRowCard}
                hoverTranslate={-3}
                hoverScale={1.015}
                interactive={true}
                onPress={() => onNavigate && onNavigate('Learning')}
              >
                <View style={[styles.pathIconCircle, { backgroundColor: i === 0 ? CLAY_COLORS.skyLight : CLAY_COLORS.emeraldLight }]}>
                  <Text style={{ fontSize: 18 }}>{gap.icon || '📚'}</Text>
                </View>

                <View style={styles.pathInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.pathTitle} numberOfLines={1}>Master {gap.skill_name}</Text>
                  </View>
                  <Text style={styles.pathDesc}>Target Gap: {gap.gap || Math.max(0, (gap.required_level || 80) - (gap.current_level || 0))}% • {gap.priority}</Text>
                </View>

                <ClayButton
                  variant="secondary"
                  onPress={() => onNavigate && onNavigate('Learning')}
                  style={styles.startPathBtn}
                >
                  <Text style={styles.startPathBtnText}>Learn</Text>
                </ClayButton>
              </ClayCard>
            ))
          ) : (
            <ClayCard style={styles.recPathRowCard} interactive={false}>
              <View style={[styles.pathIconCircle, { backgroundColor: CLAY_COLORS.primaryLight }]}>
                <Text style={{ fontSize: 18 }}>✨</Text>
              </View>
              <View style={styles.pathInfo}>
                <Text style={styles.pathTitle}>Skill Curriculum</Text>
                <Text style={styles.pathDesc}>Connect GitHub or select target career to generate recommendations</Text>
              </View>
            </ClayCard>
          )}
        </View>
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
  learningLayout: {
    flexDirection: 'row',
    gap: 16,
  },
  learningLayoutColumn: {
    flexDirection: 'column',
  },
  activePathCard: {
    flex: 1.2,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    justifyContent: 'space-between',
    minHeight: 220,
    ...CLAY_SHADOWS.card,
  },
  activePathFullWidth: {
    width: '100%',
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activePathTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    marginTop: 12,
  },
  activePathDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    marginTop: 4,
    lineHeight: 19,
  },
  activeProgressContainer: {
    marginVertical: 14,
  },
  activeProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeProgressLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
  },
  activeProgressVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  continueBtn: {
    paddingVertical: 11,
    borderRadius: CLAY_RADII.button,
  },
  continueBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  recPathsColumn: {
    flex: 1,
    gap: 12,
  },
  recPathRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    gap: 12,
    ...CLAY_SHADOWS.card,
  },
  pathIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathInfo: {
    flex: 1,
  },
  pathTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  pathDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  startPathBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
  },
  startPathBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
