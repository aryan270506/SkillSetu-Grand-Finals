import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';
import {
  calculateFormatScore,
  calculateImpactScore,
  calculateKeywordScore,
  calculateUtf8Score,
} from './atsEvaluator';

export default function ATSScoreMetricsCard({
  atsData = {},
  profileMatch = {},
  resumeData = {},
  careerRequirements = [],
  loading = false,
}) {
  const backendScore = typeof atsData?.score === 'number'
    ? atsData.score
    : (atsData?.score ? parseInt(atsData.score, 10) : null);

  const [displayScore, setDisplayScore] = useState(0);
  const animatedVal = useRef(new Animated.Value(0)).current;

  // Stagger animation values for 4 metrics
  const animFormat = useRef(new Animated.Value(0)).current;
  const animKeyword = useRef(new Animated.Value(0)).current;
  const animImpact = useRef(new Animated.Value(0)).current;
  const animUtf8 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (backendScore !== null) {
      animatedVal.setValue(0);
      Animated.timing(animatedVal, {
        toValue: backendScore,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      const listener = animatedVal.addListener(({ value }) => {
        setDisplayScore(Math.round(value));
      });

      return () => {
        animatedVal.removeListener(listener);
      };
    }
  }, [backendScore, animatedVal]);

  // Staggered entrance for the 4 metric pills (Smoothed and Slowed Down)
  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(animFormat, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(animKeyword, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(animImpact, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(animUtf8, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [animFormat, animKeyword, animImpact, animUtf8]);

  // Dynamically calculate the 4 real ATS metrics
  const formatScore = calculateFormatScore(resumeData);
  const keywordScore = calculateKeywordScore(atsData, careerRequirements, profileMatch);
  const impactScore = calculateImpactScore(resumeData);
  const utf8Score = calculateUtf8Score(resumeData);

  const formatDisplay = loading ? '...' : (formatScore !== null ? `${formatScore}%` : 'N/A');
  const keywordDisplay = loading ? '...' : (keywordScore !== null ? `${keywordScore}%` : 'N/A');
  const impactDisplay = loading ? '...' : (impactScore !== null ? `${impactScore}%` : 'N/A');
  const utf8Display = loading ? '...' : (utf8Score !== null ? `${utf8Score}%` : 'N/A');

  const isSafe = backendScore !== null && backendScore >= 75;

  return (
    <View
      className="clay-interactive-card"
      style={[styles.card, CLAY_SHADOWS.card]}
    >
      {/* Top ATS Score Display */}
      <View style={styles.topScoreSection}>
        <View className="clay-breathe-anim" style={styles.scoreRow}>
          <Text style={styles.scoreBigNumber}>
            {loading ? '...' : (backendScore !== null ? displayScore : 'N/A')}
          </Text>
          <View style={styles.scoreLabelCol}>
            <Text style={styles.scoreMainLabel}>ATS SCORE</Text>
            <Text style={styles.scoreSubLabel}>Bypass Index</Text>
          </View>
        </View>

        <View
          className="clay-chip-interactive"
          style={[
            styles.safeTag,
            isSafe ? styles.safeTagActive : styles.safeTagNeutral,
          ]}
        >
          <Text style={[styles.safeCheckIcon, isSafe ? styles.textSuccess : styles.textNeutral]}>
            {isSafe ? '✓' : '●'}
          </Text>
          <Text style={[styles.safeTagText, isSafe ? styles.textSuccess : styles.textNeutral]}>
            {isSafe ? 'Zero Parsing Traps' : 'ATS Validated'}
          </Text>
        </View>
      </View>

      {/* 4 Dynamic Supporting Metrics Grid with Staggered Entrance */}
      <View style={styles.metricsGrid}>
        <Animated.View
          className="clay-metric-interactive"
          style={[
            styles.metricCell,
            {
              opacity: animFormat,
              transform: [{ translateY: animFormat.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
            },
          ]}
        >
          <Text style={styles.metricVal}>{formatDisplay}</Text>
          <Text style={styles.metricLabel}>Format</Text>
        </Animated.View>
        <View style={styles.metricDivider} />
        
        <Animated.View
          className="clay-metric-interactive"
          style={[
            styles.metricCell,
            {
              opacity: animKeyword,
              transform: [{ translateY: animKeyword.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
            },
          ]}
        >
          <Text style={styles.metricVal}>{keywordDisplay}</Text>
          <Text style={styles.metricLabel}>Keyword</Text>
        </Animated.View>
        <View style={styles.metricDivider} />
        
        <Animated.View
          className="clay-metric-interactive"
          style={[
            styles.metricCell,
            {
              opacity: animImpact,
              transform: [{ translateY: animImpact.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
            },
          ]}
        >
          <Text style={styles.metricVal}>{impactDisplay}</Text>
          <Text style={styles.metricLabel}>Impact</Text>
        </Animated.View>
        <View style={styles.metricDivider} />
        
        <Animated.View
          className="clay-metric-interactive"
          style={[
            styles.metricCell,
            {
              opacity: animUtf8,
              transform: [{ translateY: animUtf8.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
            },
          ]}
        >
          <Text style={styles.metricVal}>{utf8Display}</Text>
          <Text style={styles.metricLabel}>UTF-8</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  topScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  scoreBigNumber: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 40,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    lineHeight: 44,
  },
  scoreLabelCol: {
    gap: 0,
  },
  scoreMainLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    letterSpacing: 0.8,
  },
  scoreSubLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  safeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
  },
  safeTagActive: {
    backgroundColor: CLAY_COLORS.successLight,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  safeTagNeutral: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  safeCheckIcon: {
    fontSize: 10,
    fontWeight: '900',
  },
  safeTagText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
  },
  textSuccess: {
    color: CLAY_COLORS.successText,
  },
  textNeutral: {
    color: CLAY_COLORS.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: CLAY_RADII.cardSmall,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: CLAY_COLORS.recessedBorder,
    gap: 10,
  },
  metricCell: {
    alignItems: 'center',
    minWidth: 46,
  },
  metricVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
  },
  metricLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9.5,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: CLAY_COLORS.recessedBorder,
  },
});
