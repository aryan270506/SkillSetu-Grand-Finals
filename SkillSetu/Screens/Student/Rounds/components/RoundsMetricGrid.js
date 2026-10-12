import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function RoundsMetricGrid({ kpi, trajectory }) {
  const metrics = [
    {
      id: 'applications',
      label: 'APPLICATIONS',
      icon: '🏢',
      value: kpi?.applications ?? 0,
      sub: 'Total submissions',
      accentColor: CLAY_COLORS.primary,
    },
    {
      id: 'active_rounds',
      label: 'ACTIVE ROUNDS',
      icon: '📅',
      value: kpi?.active_rounds ?? 0,
      sub: 'In assessment pipeline',
      accentColor: CLAY_COLORS.primaryDark,
    },
    {
      id: 'prep_progress',
      label: 'PREP PROGRESS',
      icon: '⏳',
      value: `${kpi?.prep_progress ?? 0}%`,
      sub: 'Across active rounds',
      accentColor: CLAY_COLORS.primary,
    },
    {
      id: 'mocks_taken',
      label: 'MOCKS TAKEN',
      icon: '🎙️',
      value: kpi?.mocks_taken ?? 0,
      sub: 'Practice AI sessions',
      accentColor: CLAY_COLORS.primary,
    },
    {
      id: 'average_score',
      label: 'AVERAGE SCORE',
      icon: '📈',
      value: kpi?.average_score !== null && kpi?.average_score !== undefined ? `${kpi.average_score}%` : '—',
      sub: trajectory?.has_sufficient_data ? `${trajectory.growth_label} 30d` : 'Verified benchmark',
      accentColor: CLAY_COLORS.primary,
    },
    {
      id: 'scheduled',
      label: 'SCHEDULED',
      icon: '🗂️',
      value: kpi?.scheduled ?? 0,
      sub: 'Rounds this week',
      accentColor: CLAY_COLORS.primary,
    },
  ];

  return (
    <View style={styles.gridContainer}>
      {metrics.map((item) => (
        <View
          key={item.id}
          style={[styles.metricCard, CLAY_SHADOWS.card]}
          dataSet={{ cardHover: 'true' }}
          // @ts-ignore
          className="clay-card-hover"
        >
          <View style={styles.cardHeader}>
            <Text style={styles.metricLabel}>{item.label}</Text>
            <View
              style={styles.iconCircle}
              dataSet={{ iconInteractive: 'true' }}
              // @ts-ignore
              className="clay-icon-interactive"
            >
              <Text style={styles.iconText}>{item.icon}</Text>
            </View>
          </View>
          <Text style={styles.metricValue}>{item.value}</Text>
          <Text style={styles.metricSub}>{item.sub}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 155,
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 16,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: CLAY_COLORS.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  iconText: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 11,
    fontWeight: '500',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
});
