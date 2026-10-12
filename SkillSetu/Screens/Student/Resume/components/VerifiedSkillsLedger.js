import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  getClayRowStyle,
} from './DesignTokens';

export default function VerifiedSkillsLedger({ requirements = [] }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const animFade = useRef(new Animated.Value(0)).current;

  const hasReqs = Array.isArray(requirements) && requirements.length > 0;

  useEffect(() => {
    if (hasReqs) {
      animFade.setValue(0);
      Animated.timing(animFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: false,
      }).start();
    }
  }, [hasReqs, requirements, animFade]);

  if (!hasReqs) return null;

  return (
    <Animated.View
      className="clay-interactive-card"
      style={[
        styles.card,
        CLAY_SHADOWS.card,
        { opacity: animFade },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Verified Skills Ledger</Text>
        <View className="clay-chip-interactive" style={styles.authBadge}>
          <Text style={styles.authBadgeText}>Authenticated</Text>
        </View>
      </View>

      <View style={styles.listContainer}>
        {requirements.slice(0, 5).map((req, idx) => {
          const score = req.student_level || 80;
          const isSelected = selectedIdx === idx;
          return (
            <Pressable
              key={idx}
              className="clay-row-interactive"
              style={({ hovered, pressed }) => [
                styles.ledgerRow,
                CLAY_SHADOWS.pill,
                getClayRowStyle({ hovered, pressed }),
              ]}
              onPress={() => setSelectedIdx(isSelected ? null : idx)}
            >
              <View style={styles.rowLeft}>
                <View style={styles.checkBadge}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
                <View style={styles.skillTextCol}>
                  <Text style={styles.skillName}>{req.skill_name}</Text>
                  <Text style={styles.skillEvidence}>
                    {req.category || 'Core Role Requirement'}
                    {isSelected ? ' · Verified against GitHub & ESCO taxonomy' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{score}% Verified</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
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
  cardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
  },
  authBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: CLAY_RADII.pill,
  },
  authBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  listContainer: {
    gap: 8,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: CLAY_RADII.cardSmall,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: CLAY_COLORS.recessedBorder,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: CLAY_COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    fontSize: 10,
    fontWeight: '900',
    color: CLAY_COLORS.successText,
  },
  skillTextCol: {
    gap: 1,
    flex: 1,
  },
  skillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  skillEvidence: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  scoreBadge: {
    backgroundColor: CLAY_COLORS.paper,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
  },
  scoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
