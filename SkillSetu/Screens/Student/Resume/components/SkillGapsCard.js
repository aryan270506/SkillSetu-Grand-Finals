import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  getClayRowStyle,
} from './DesignTokens';

function AnimatedGapItem({ gap, index, isExpanded, onToggle }) {
  const current = gap.student_level || 0;
  const target = gap.required_level || 80;
  const progressPct = Math.min(100, Math.round((current / (target || 1)) * 100));
  const isHigh = index === 0 || (gap.priority && gap.priority.toLowerCase().includes('high'));

  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animWidth.setValue(0);
    Animated.timing(animWidth, {
      toValue: progressPct,
      duration: 1200 + (index * 200),
      useNativeDriver: false,
    }).start();
  }, [progressPct, animWidth, index]);

  const widthInterpolated = animWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable
      className="clay-row-interactive"
      style={({ hovered, pressed }) => [
        styles.gapRow,
        CLAY_SHADOWS.pill,
        getClayRowStyle({ hovered, pressed }),
      ]}
      onPress={onToggle}
    >
      <View style={styles.gapTopRow}>
        <View style={styles.nameChevronRow}>
          <Text style={styles.skillName}>{gap.skill_name}</Text>
          <Text
            style={[
              styles.rowChevron,
              {
                transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                transition: 'transform 0.2s ease',
              },
            ]}
          >
            ▼
          </Text>
        </View>
        <View style={[styles.priorityTag, isHigh ? styles.priorityTagHigh : styles.priorityTagMed]}>
          <Text style={[styles.priorityTagText, isHigh ? styles.priorityTextHigh : styles.priorityTextMed]}>
            {isHigh ? 'HIGH PRIORITY' : 'MEDIUM PRIORITY'}
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              isHigh ? styles.fillAmber : styles.fillViolet,
              { width: widthInterpolated },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {current}/{target} <Text style={styles.pctLabel}>({progressPct}%)</Text>
        </Text>
      </View>

      {/* Expandable Recommendation Details */}
      {isExpanded && (
        <View style={styles.expandedDetails}>
          <Text style={styles.detailsText}>
            💡 <Text style={styles.detailsBold}>Action Recommendation:</Text> Complete a verified assessment or project module in {gap.skill_name} to bridge this proficiency gap and boost ATS matching.
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function SkillGapsCard({ skillGaps = [] }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!skillGaps || skillGaps.length === 0) return null;

  return (
    <View
      className="clay-interactive-card"
      style={[styles.card, CLAY_SHADOWS.card]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.cardTitle}>Skill Gaps Affecting Resume</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Action Items</Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        {skillGaps.slice(0, 3).map((gap, index) => (
          <AnimatedGapItem
            key={gap.skill_id || index}
            gap={gap}
            index={index}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    padding: 16,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
  },
  badge: {
    backgroundColor: CLAY_COLORS.warningLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: CLAY_RADII.pill,
  },
  badgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.warningText,
  },
  listContainer: {
    gap: 8,
  },
  gapRow: {
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: CLAY_RADII.cardSmall,
    padding: 10,
    borderWidth: 1,
    borderColor: CLAY_COLORS.recessedBorder,
    gap: 6,
  },
  gapTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  priorityTag: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
  },
  priorityTagHigh: {
    backgroundColor: CLAY_COLORS.dangerLight,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  priorityTagMed: {
    backgroundColor: CLAY_COLORS.warningLight,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  priorityTagText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  priorityTextHigh: {
    color: CLAY_COLORS.danger,
  },
  priorityTextMed: {
    color: CLAY_COLORS.warningText,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  fillAmber: {
    backgroundColor: CLAY_COLORS.warning,
  },
  fillViolet: {
    backgroundColor: CLAY_COLORS.primary,
  },
  progressLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  pctLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9.5,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
  },
  nameChevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowChevron: {
    fontSize: 9,
    color: CLAY_COLORS.mutedLight,
  },
  expandedDetails: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
  },
  detailsText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10.5,
    color: CLAY_COLORS.muted,
    lineHeight: 14,
  },
  detailsBold: {
    fontFamily: CLAY_FONTS.heading,
    fontWeight: '700',
    color: CLAY_COLORS.primaryDark,
  },
});
