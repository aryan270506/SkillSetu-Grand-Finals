import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';
import { formatCareerTitle } from '../../services/profileService';

export default function CareerAspirationCard({
  careerGoals = {},
  user = {},
}) {
  const targetCareer = formatCareerTitle(careerGoals?.targetCareer) || user?.headline || 'Lead Software Development Engineer (SDE-1)';
  const timeline = careerGoals?.timeline || 'Q3 2025 Goal';
  const matchPercentage = 88;

  const [displayMatch, setDisplayMatch] = useState(0);
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, {
      toValue: matchPercentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    const listener = animVal.addListener(({ value }) => {
      setDisplayMatch(Math.round(value));
    });

    return () => {
      animVal.removeListener(listener);
    };
  }, [matchPercentage, animVal]);

  return (
    <View style={[styles.cardContainer, Platform.OS === 'web' && { className: 'clay-section-revealed clay-hover-lift' }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>TARGET ASPIRATION</Text>
        <View style={styles.goalBadge}>
          <Text style={styles.goalBadgeText}>🎯 {timeline}</Text>
        </View>
      </View>

      {/* Target Title */}
      <Text style={styles.targetRoleTitle}>
        {targetCareer} in Distributed Systems
      </Text>

      {/* Target Role Archetypes */}
      <View style={styles.archetypesRow}>
        <View style={styles.archetypeChip}>
          <Text style={styles.archetypeText}>Distributed Systems Engineer</Text>
        </View>
        <View style={styles.archetypeChip}>
          <Text style={styles.archetypeText}>Cloud Platform Intern</Text>
        </View>
        <View style={styles.archetypeChip}>
          <Text style={styles.archetypeText}>Core SDE-1</Text>
        </View>
      </View>

      {/* Target Comp Range */}
      <View style={styles.infoBlock}>
        <Text style={styles.infoLabel}>Target Compensation Range</Text>
        <Text style={styles.compValue}>₹1,20,000 – ₹1,80,000 / mo <Text style={styles.compSub}>(Internship)</Text></Text>
        <Text style={styles.fullTimeComp}>₹24 – ₹32 LPA Full-time target</Text>
      </View>

      {/* Preferred Environment & Locations */}
      <View style={styles.infoBlock}>
        <Text style={styles.infoLabel}>Preferred Environment & Locations</Text>
        <View style={styles.envRow}>
          <Text style={styles.envIcon}>📍</Text>
          <Text style={styles.envText}>Hybrid (Bengaluru / Pune / Gurugram) or Remote</Text>
        </View>
        <Text style={styles.envSub}>High-growth Tech Startups & Tier-1 Global Product Companies</Text>
      </View>

      {/* Upcoming Milestones */}
      <View style={styles.milestoneBlock}>
        <Text style={styles.milestoneIcon}>🚀</Text>
        <View style={styles.milestoneTextWrap}>
          <Text style={styles.milestoneTitle}>Upcoming Milestone</Text>
          <Text style={styles.milestoneBody}>Complete Final Round Interviews with ABC Tech & Scaler by Nov 20, 2025</Text>
        </View>
      </View>

      {/* Overall Fit Match Progress Bar */}
      <View style={styles.fitProgressBlock}>
        <View style={styles.fitHeader}>
          <Text style={styles.fitLabel}>Overall Fit Match</Text>
          <Text style={styles.fitScore}>{displayMatch}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${displayMatch}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    marginBottom: 24,
    ...CLAY_SHADOWS.card,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  goalBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  goalBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  targetRoleTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 17,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    lineHeight: 23,
  },
  archetypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  archetypeChip: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  archetypeText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  infoBlock: {
    gap: 3,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 12,
  },
  infoLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.mutedLight,
  },
  compValue: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  compSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
  },
  fullTimeComp: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.primaryDark,
    fontWeight: '700',
  },
  envRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  envIcon: {
    fontSize: 12,
  },
  envText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
  },
  envSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  milestoneBlock: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.18)',
    borderRadius: CLAY_RADII.cardSmall,
    padding: 10,
  },
  milestoneIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  milestoneTextWrap: {
    flex: 1,
  },
  milestoneTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  milestoneBody: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
    lineHeight: 15,
  },
  fitProgressBlock: {
    gap: 6,
    marginTop: 4,
  },
  fitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fitLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  fitScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#E6E1F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: CLAY_COLORS.primary,
    borderRadius: 4,
  },
});
