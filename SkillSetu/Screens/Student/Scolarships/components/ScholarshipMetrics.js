import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayCard,
} from './ScholarshipDesignTokens';

export default function ScholarshipMetrics({
  totalLive = 0,
  eligibleCount = 0,
  closingSoonCount = 0,
  savedCount = 0,
  appliedCount = 0,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const cards = [
    {
      label: 'Live Schemes',
      value: totalLive,
      subtext: 'Directly sourced from verified feeds',
      icon: '🏛️',
      color: CLAY_COLORS.primary,
      bg: CLAY_COLORS.primaryBg,
      border: 'rgba(124, 58, 237, 0.18)',
    },
    {
      label: 'Verified Eligible',
      value: eligibleCount,
      subtext: '100% pre-qualified on profile rules',
      icon: '✓',
      color: CLAY_COLORS.emeraldText,
      bg: CLAY_COLORS.emeraldBg,
      border: 'rgba(16, 185, 129, 0.22)',
    },
    {
      label: 'Closing Soon',
      value: closingSoonCount,
      subtext: 'Deadlines within next 30 days',
      icon: '⏰',
      color: CLAY_COLORS.amberText,
      bg: CLAY_COLORS.amberBg,
      border: 'rgba(245, 158, 11, 0.22)',
    },
    {
      label: 'Saved & Tracked',
      value: savedCount,
      subtext: `${appliedCount} application(s) tracked`,
      icon: '🔖',
      color: CLAY_COLORS.secondary,
      bg: CLAY_COLORS.secondaryBg,
      border: 'rgba(219, 39, 119, 0.18)',
    },
  ];

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {cards.map((c, i) => (
        <ClayCard
          key={c.label}
          style={[
            styles.metricCard,
            { borderColor: c.border },
            isMobile && styles.metricCardMobile,
          ]}
        >
          <View style={styles.metricTopRow}>
            <Text style={styles.metricLabel}>{c.label}</Text>
            <View style={[styles.iconBox, { backgroundColor: c.bg }]}>
              <Text style={[styles.iconText, { color: c.color }]}>{c.icon}</Text>
            </View>
          </View>
          <Text style={[styles.metricValue, { color: c.color }]}>{c.value}</Text>
          <Text style={styles.metricSubtext}>{c.subtext}</Text>
        </ClayCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  containerMobile: {
    flexDirection: 'column',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 18,
    borderRadius: CLAY_RADII.lg,
  },
  metricCardMobile: {
    width: '100%',
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: CLAY_RADII.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricValue: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  metricSubtext: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '500',
    color: CLAY_COLORS.muted,
  },
});
