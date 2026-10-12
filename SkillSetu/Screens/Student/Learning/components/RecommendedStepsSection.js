import React from 'react';
import {
  ActivityIndicator,
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

export default function RecommendedStepsSection({
  curatedNextSteps = [],
  stepProgression,
  displayCareerName,
  enrollingCourseId,
  onEnrollCourse,
  onOpenCourseUrl,
  onSelectCourseForProgress,
  isDesktop,
}) {
  if (!curatedNextSteps || curatedNextSteps.length === 0) {
    return null;
  }

  const currentStep = stepProgression?.currentStep || 1;
  const totalSteps = stepProgression?.totalSteps || 5;

  return (
    <View style={[styles.sectionContainer, CLAY_SHADOWS.card]}>
      <SectionHeader
        preTitle="AI RECOMMENDATION ENGINE"
        title="Recommended For You"
        subtitle={`Personalized from your target career and current skill gaps (Step ${currentStep} of ${totalSteps})`}
      />

      <View
        style={[
          styles.stepsGrid,
          isDesktop ? styles.stepsGridDesktop : styles.stepsGridMobile,
        ]}
      >
        {curatedNextSteps.map((item, idx) => {
          const isEnrolling = enrollingCourseId === item.course_id;
          const isCompleted = item.action === 'Completed';

          return (
            <ClayCard
              key={item.course_id || idx}
              style={styles.stepCard}
              hoverTranslate={-4}
            >
              <View style={styles.cardHeaderRow}>
                <ClayBadge
                  label={item.step_badge || `STEP 0${idx + 1}`}
                  variant="primary"
                  size="small"
                />
                <Text style={styles.metaText}>{item.meta}</Text>
              </View>

              <Text style={styles.stepTitle} numberOfLines={2}>
                {item.title}
              </Text>

              <Text style={styles.whyCrucialText} numberOfLines={3}>
                {item.why_crucial}
              </Text>

              <View style={styles.cardFooterRow}>
                <ClayButton
                  style={[
                    styles.actionBtn,
                    isCompleted && styles.actionBtnCompleted,
                  ]}
                  disabled={isEnrolling}
                  onPress={() => {
                    if (item.action === 'Enroll Free') {
                      onEnrollCourse(item.course_id, item);
                    } else if (item.canonical_url) {
                      onOpenCourseUrl(item.canonical_url);
                    } else {
                      onSelectCourseForProgress(item);
                    }
                  }}
                >
                  {isEnrolling ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.actionBtnText,
                        isCompleted && styles.actionBtnTextCompleted,
                      ]}
                    >
                      {item.action === 'Enroll Free'
                        ? 'Enroll Free →'
                        : isCompleted
                          ? 'Completed ✓'
                          : 'Continue Learning →'}
                    </Text>
                  )}
                </ClayButton>
              </View>
            </ClayCard>
          );
        })}
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
  stepsGrid: {
    gap: 14,
  },
  stepsGridDesktop: {
    flexDirection: 'row',
  },
  stepsGridMobile: {
    flexDirection: 'column',
  },
  stepCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
  },
  stepTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 20,
    marginBottom: 6,
  },
  whyCrucialText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 17,
    marginBottom: 14,
  },
  cardFooterRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: CLAY_COLORS.recessedBorder,
  },
  actionBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
  },
  actionBtnCompleted: {
    backgroundColor: CLAY_COLORS.emeraldLight,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  actionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionBtnTextCompleted: {
    color: CLAY_COLORS.emeraldDark,
  },
});
