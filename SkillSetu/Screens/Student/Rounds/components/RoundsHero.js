import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function RoundsHero({ careerTrack, kpi }) {
  return (
    <View
      style={[styles.heroCard, CLAY_SHADOWS.card]}
      dataSet={{ cardHover: 'true' }}
      // @ts-ignore
      className="clay-card-hover"
    >
      <View style={styles.contentContainer}>
        {/* Left Info Group */}
        <View style={styles.leftGroup}>
          <View style={styles.badgeRow}>
            <View style={styles.tagPill}>
              <View style={styles.tagDot} />
              <Text style={styles.tagPillText}>VERIFIED CAREER TRACK</Text>
            </View>
            <Text style={styles.tagSubText}>• Targeted: {careerTrack || 'Full Stack / Backend Engineer'}</Text>
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Rounds</Text>
            <View
              style={styles.titleIconBadge}
              dataSet={{ iconInteractive: 'true' }}
              // @ts-ignore
              className="clay-icon-interactive"
            >
              <Text style={styles.titleIcon}>✦</Text>
            </View>
          </View>

          <Text style={styles.subtitleText}>
            Prepare smarter, practice confidently, and track your assessment round progression with AI tailored to your verified SkillSetu profile.
          </Text>
        </View>

        {/* Right Metric Pills Group */}
        <View style={styles.rightGroup}>
          <View
            style={styles.metricPillBox}
            dataSet={{ subcardHover: 'true' }}
            // @ts-ignore
            className="clay-subcard-hover"
          >
            <Text style={styles.metricPillLabel}>APPLICATIONS</Text>
            <Text style={styles.metricPillValue}>{kpi?.applications ?? 0} <Text style={styles.metricPillSub}>Tracked</Text></Text>
          </View>

          <View
            style={styles.metricPillBox}
            dataSet={{ subcardHover: 'true' }}
            // @ts-ignore
            className="clay-subcard-hover"
          >
            <Text style={styles.metricPillLabel}>PIPELINE</Text>
            <Text style={styles.metricPillValue}>{kpi?.active_rounds ?? 0} <Text style={styles.metricPillSub}>Active</Text></Text>
          </View>

          <View
            style={styles.aiAvgPillBox}
            dataSet={{ subcardHover: 'true' }}
            // @ts-ignore
            className="clay-subcard-hover"
          >
            <Text style={styles.aiAvgLabel}>AI AVG</Text>
            <Text style={styles.aiAvgValue}>
              {kpi?.average_score !== null && kpi?.average_score !== undefined ? `${kpi.average_score}%` : '—'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 24,
    marginBottom: 8,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
  },
  leftGroup: {
    flex: 1,
    minWidth: 280,
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY_COLORS.primary,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  tagSubText: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
    fontFamily: CLAY_FONTS.body,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    letterSpacing: -0.8,
    fontFamily: CLAY_FONTS.heading,
  },
  titleIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CLAY_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  titleIcon: {
    fontSize: 14,
    color: CLAY_COLORS.primary,
    fontWeight: '900',
  },
  subtitleText: {
    fontSize: 13.5,
    color: CLAY_COLORS.muted,
    lineHeight: 20,
    maxWidth: 620,
    fontFamily: CLAY_FONTS.body,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metricPillBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    alignItems: 'center',
    minWidth: 105,
  },
  metricPillLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  metricPillValue: {
    fontSize: 16,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    marginTop: 2,
    fontFamily: CLAY_FONTS.heading,
  },
  metricPillSub: {
    fontSize: 11,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  aiAvgPillBox: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.cardSmall,
    alignItems: 'center',
    minWidth: 95,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
        boxShadow: '0 8px 16px rgba(124, 58, 237, 0.35)',
      },
      default: {},
    }),
  },
  aiAvgLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  aiAvgValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    fontFamily: CLAY_FONTS.heading,
  },
});
