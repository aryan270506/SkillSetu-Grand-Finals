import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
} from './LearningDesignTokens';

export default function ContinueLearningHero({
  activeCourse,
  onContinueCourse,
  onOpenCourseUrl,
  displayCareerName,
  isDesktop,
}) {
  const pct = Math.round(activeCourse?.progress_percent || 0);

  // Animated progress bar fill
  const animFill = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    Animated.timing(animFill, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();

    const listener = animFill.addListener(({ value }) => {
      setDisplayPct(Math.round(value));
    });

    return () => {
      animFill.removeListener(listener);
    };
  }, [pct]);

  if (!activeCourse) {
    return null;
  }

  const providerName = activeCourse.provider_name || activeCourse.provider || 'YouTube';
  const skillsList = activeCourse.covered_skills && activeCourse.covered_skills.length > 0
    ? activeCourse.covered_skills.join(' • ')
    : activeCourse.skill_name || `${displayCareerName} Core Skills`;

  return (
    <View
      style={[
        styles.continueHeroCard,
        CLAY_SHADOWS.card,
        isDesktop ? styles.continueHeroDesktop : styles.continueHeroMobile,
      ]}
    >
      {/* Decorative accent element */}
      <View style={styles.accentGlow} />

      {/* Main Course Info */}
      <View style={styles.courseMainCol}>
        <View style={styles.topBadgeRow}>
          <ClayBadge
            icon="⚡"
            label="CONTINUE LEARNING"
            variant="primary"
            size="small"
          />
          <ClayBadge
            icon="📺"
            label={providerName.toUpperCase()}
            variant="sky"
            size="small"
          />
          <ClayBadge
            icon="⏱"
            label={activeCourse.estimated_hours || '8 hrs'}
            variant="muted"
            size="small"
          />
        </View>

        <Text style={styles.courseTitle} numberOfLines={2}>
          {activeCourse.title}
        </Text>

        <Text style={styles.courseSkillsSubtitle} numberOfLines={1}>
          {skillsList}
        </Text>

        {/* Progress bar container */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressStatusText}>
              Progress & Completion
            </Text>
            <Text style={styles.progressPctText}>{displayPct}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(5, displayPct))}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.buttonActionRow}>
          <ClayButton
            style={styles.continueBtn}
            onPress={() => onContinueCourse(activeCourse)}
            testID="continue-course-main-btn"
          >
            <Text style={styles.continueBtnText}>
              {pct > 0 ? 'Continue Course →' : 'Start Course →'}
            </Text>
          </ClayButton>

          {activeCourse.canonical_url ? (
            <ClayButton
              style={styles.openUrlBtn}
              onPress={() => onOpenCourseUrl(activeCourse.canonical_url)}
            >
              <Text style={styles.openUrlBtnText}>Open Course ↗</Text>
            </ClayButton>
          ) : null}
        </View>
      </View>

      {/* Right Side: Next Lesson / Up Next Focus */}
      <View style={styles.nextLessonCol}>
        <View style={styles.nextLessonBox}>
          <View style={styles.nextLessonHeaderRow}>
            <Text style={styles.nextLessonPre}>UP NEXT IN PATH</Text>
            <Text style={styles.nextLessonTimeTag}>
              {activeCourse.stage || 'Module'}
            </Text>
          </View>

          <Text style={styles.nextLessonTitle} numberOfLines={2}>
            {activeCourse.next_lesson_title || `Deep Dive: Mastering ${activeCourse.covered_skills?.[0] || 'Core Architecture'}`}
          </Text>

          <Text style={styles.nextLessonDesc} numberOfLines={2}>
            Apply hands-on code patterns and complete automated test benchmarks to verify on-file skill evidence.
          </Text>

          <ClayButton
            style={styles.nextLessonQuickBtn}
            onPress={() => onContinueCourse(activeCourse)}
          >
            <Text style={styles.nextLessonQuickBtnText}>Update Progress</Text>
          </ClayButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  continueHeroCard: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    padding: 24,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  continueHeroDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  continueHeroMobile: {
    flexDirection: 'column',
    gap: 18,
  },
  accentGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(124, 58, 237, 0.04)',
  },
  courseMainCol: {
    flex: 1.6,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  courseTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  courseSkillsSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.primary,
    fontWeight: '600',
    marginBottom: 14,
  },
  progressContainer: {
    marginBottom: 16,
    maxWidth: 520,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatusText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  progressPctText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: CLAY_COLORS.primary,
    borderRadius: 4,
  },
  buttonActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  continueBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
  },
  continueBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  openUrlBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  openUrlBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  nextLessonCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nextLessonBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
  },
  nextLessonHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nextLessonPre: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.8,
  },
  nextLessonTimeTag: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  nextLessonTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 19,
    marginBottom: 4,
  },
  nextLessonDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    lineHeight: 15,
    marginBottom: 10,
  },
  nextLessonQuickBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  nextLessonQuickBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
});
