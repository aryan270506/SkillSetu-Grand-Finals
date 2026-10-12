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
  ClayCard,
} from './LearningDesignTokens';

export default function LearningSummaryMetrics({
  displayCareerName,
  targetFitScore = 82,
  verifiedSkillsCount = 4,
  inProgressCoursesCount = 4,
  totalCoursesCount = 4,
  xpEarned = 400,
  validatedCredentialsCount = 4,
  readinessPct = 82,
  isDesktop,
  isTablet,
}) {
  // Animated number counts
  const animXp = useRef(new Animated.Value(0)).current;
  const animFit = useRef(new Animated.Value(0)).current;
  const [displayXp, setDisplayXp] = useState(0);
  const [displayFit, setDisplayFit] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animXp, {
        toValue: xpEarned,
        duration: 700,
        useNativeDriver: false,
      }),
      Animated.timing(animFit, {
        toValue: readinessPct,
        duration: 700,
        useNativeDriver: false,
      }),
    ]).start();

    const l1 = animXp.addListener(({ value }) => setDisplayXp(Math.round(value)));
    const l2 = animFit.addListener(({ value }) => setDisplayFit(Math.round(value)));

    return () => {
      animXp.removeListener(l1);
      animFit.removeListener(l2);
    };
  }, [xpEarned, readinessPct]);

  return (
    <View
      style={[
        styles.gridContainer,
        isDesktop
          ? styles.gridDesktop
          : isTablet
            ? styles.gridTablet
            : styles.gridMobile,
      ]}
    >
      {/* 1. Career Goal */}
      <ClayCard
        style={[styles.metricCard, CLAY_SHADOWS.card]}
        hoverTranslate={-4}
      >
        <View style={styles.metricHeaderRow}>
          <Text style={styles.metricIcon}>🎯</Text>
          <Text style={styles.metricLabel}>CAREER GOAL</Text>
        </View>
        <Text style={styles.metricMainValue} numberOfLines={1}>
          {displayCareerName}
        </Text>
        <Text style={styles.metricSubtext}>
          {targetFitScore}/100 Target Fit Score
        </Text>
      </ClayCard>

      {/* 2. Skills Completed */}
      <ClayCard
        style={[styles.metricCard, CLAY_SHADOWS.card]}
        hoverTranslate={-4}
      >
        <View style={styles.metricHeaderRow}>
          <Text style={styles.metricIcon}>✓</Text>
          <Text style={styles.metricLabel}>SKILLS COMPLETED</Text>
        </View>
        <Text style={styles.metricMainValue}>
          {verifiedSkillsCount}
        </Text>
        <Text style={styles.metricSubtext}>
          Verified on-file credentials
        </Text>
      </ClayCard>

      {/* 3. Active Learning */}
      <ClayCard
        style={[styles.metricCard, CLAY_SHADOWS.card]}
        hoverTranslate={-4}
      >
        <View style={styles.metricHeaderRow}>
          <Text style={styles.metricIcon}>📚</Text>
          <Text style={styles.metricLabel}>ACTIVE LEARNING</Text>
        </View>
        <Text style={styles.metricMainValue}>
          {inProgressCoursesCount}
        </Text>
        <Text style={styles.metricSubtext}>
          {totalCoursesCount} total modules in path
        </Text>
      </ClayCard>

      {/* 4. Credentials & XP */}
      <ClayCard
        style={[styles.metricCard, CLAY_SHADOWS.card]}
        hoverTranslate={-4}
      >
        <View style={styles.metricHeaderRow}>
          <Text style={styles.metricIcon}>✨</Text>
          <Text style={styles.metricLabel}>CREDENTIALS & XP</Text>
        </View>
        <Text style={styles.metricMainValue}>
          {displayXp} XP
        </Text>
        <Text style={styles.metricSubtext}>
          {validatedCredentialsCount} validated proofs
        </Text>
      </ClayCard>

      {/* 5. Mastery Fit */}
      <ClayCard
        style={[styles.metricCard, styles.metricCardHighlight, CLAY_SHADOWS.card]}
        hoverTranslate={-4}
      >
        <View style={styles.metricHeaderRow}>
          <Text style={styles.metricIcon}>◉</Text>
          <Text style={styles.metricLabelHighlight}>MASTERY FIT</Text>
        </View>
        <View style={styles.fitScoreRow}>
          <Text style={styles.metricValueHighlight}>
            {displayFit}%
          </Text>
          <Text style={styles.metricSubHighlight}>Dynamic Match</Text>
        </View>
        <View style={styles.miniProgressBarTrack}>
          <View
            style={[
              styles.miniProgressBarFill,
              { width: `${Math.min(100, Math.max(5, displayFit))}%` },
            ]}
          />
        </View>
      </ClayCard>
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    gap: 12,
    marginBottom: 20,
  },
  gridDesktop: {
    flexDirection: 'row',
  },
  gridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridMobile: {
    flexDirection: 'column',
  },
  metricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    justifyContent: 'space-between',
  },
  metricCardHighlight: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 14,
    color: CLAY_COLORS.primary,
  },
  metricLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
  },
  metricLabelHighlight: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.8,
  },
  metricMainValue: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  metricSubtext: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  fitScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 6,
  },
  metricValueHighlight: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 22,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: -0.5,
  },
  metricSubHighlight: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: '#94A3B8',
  },
  miniProgressBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2.5,
  },
});
