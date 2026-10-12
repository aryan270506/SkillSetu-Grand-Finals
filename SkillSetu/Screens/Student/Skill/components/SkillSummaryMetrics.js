import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, ClayCard } from './DesignTokens';

function AnimatedCounter({ value = 0, suffix = '' }) {
  const animatedVal = useRef(new Animated.Value(0)).current;
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    Animated.timing(animatedVal, {
      toValue: Number(value) || 0,
      duration: 800,
      useNativeDriver: false,
    }).start();

    const listener = animatedVal.addListener(({ value: v }) => {
      setDisplayVal(Math.round(v));
    });

    return () => animatedVal.removeListener(listener);
  }, [value]);

  return <Text>{displayVal}{suffix}</Text>;
}

export default function SkillSummaryMetrics({
  verifiedSkillsCount = 0,
  gapSkillsCount = 0,
  developingCount = 0,
  missingCount = 0,
  employerFitScore = 0,
  unlockedInternships = 0,
}) {
  const cards = [
    {
      id: 'verified',
      icon: '🛡️',
      title: 'VERIFIED SKILLS',
      value: verifiedSkillsCount,
      suffix: '',
      desc: 'Across key career domains',
      color: CLAY_COLORS.primary,
      lightBg: CLAY_COLORS.primaryLight,
      borderColor: 'rgba(124, 58, 237, 0.15)',
      trend: '+4 this month',
      trendColor: CLAY_COLORS.primaryDark,
    },
    {
      id: 'gaps',
      icon: '⚠️',
      title: 'SKILLS TO STRENGTHEN',
      value: gapSkillsCount,
      suffix: '',
      desc: `${developingCount} developing · ${missingCount} to build`,
      color: CLAY_COLORS.danger,
      lightBg: CLAY_COLORS.dangerLight,
      borderColor: 'rgba(239, 68, 68, 0.15)',
      trend: '3 high priority',
      trendColor: CLAY_COLORS.danger,
    },
    {
      id: 'fit',
      icon: '🎯',
      title: 'EMPLOYER SKILL FIT',
      value: employerFitScore,
      suffix: '%',
      desc: 'Based on top employer skill demand',
      color: CLAY_COLORS.skyDark,
      lightBg: CLAY_COLORS.skyLight,
      borderColor: 'rgba(14, 165, 233, 0.15)',
      trend: 'Top 5th Percentile',
      trendColor: CLAY_COLORS.skyDark,
    },
    {
      id: 'internships',
      icon: '💼',
      title: 'INTERNSHIP MATCH',
      value: unlockedInternships,
      suffix: '',
      desc: 'Matching active opportunities',
      color: CLAY_COLORS.warningDark,
      lightBg: CLAY_COLORS.warningLight,
      borderColor: 'rgba(245, 158, 11, 0.15)',
      trend: 'Direct Interview Bypass',
      trendColor: CLAY_COLORS.warningDark,
    },
  ];

  return (
    <View style={styles.metricsGrid}>
      {cards.map((card, idx) => (
        <ClayCard
          key={card.id}
          hoverTranslate={-4}
          hoverScale={1.015}
          style={[
            styles.metricCard,
            Platform.OS === 'web' && {
              animation: `clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 60}ms both`,
            },
          ]}
          className="clay-interactive-card"
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: card.lightBg }]}>
              <Text style={styles.iconText}>{card.icon}</Text>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: card.lightBg }]}>
              <Text style={[styles.trendText, { color: card.trendColor }]}>{card.trend}</Text>
            </View>
          </View>

          {/* Metric Value */}
          <View style={styles.valueRow}>
            <Text style={[styles.metricValue, { color: CLAY_COLORS.foreground }]}>
              <AnimatedCounter value={card.value} suffix={card.suffix} />
            </Text>
          </View>

          {/* Metric Title & Desc */}
          <View style={styles.textBlock}>
            <Text style={[styles.metricTitle, { color: card.color }]}>{card.title}</Text>
            <Text style={styles.metricDesc}>{card.desc}</Text>
          </View>
        </ClayCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: CLAY_COLORS.cardBg,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 18,
    gap: 10,
    ...CLAY_SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  trendText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
  },
  valueRow: {
    marginTop: 2,
  },
  metricValue: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 30,
    fontWeight: '950',
    letterSpacing: -0.5,
  },
  textBlock: {
    gap: 2,
  },
  metricTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  metricDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
});
