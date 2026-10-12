import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  getClayRowStyle,
  getClaySelectStyle,
} from './DesignTokens';

export default function RoleCalibrationCard({
  activeTargetRole = '',
  targetCareers = [],
  onSelectRole,
  matchScore = null,
  requirements = [],
  hiringStandard = '',
  taxonomy = '',
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Dynamic Hiring Standard & Taxonomy
  const dynamicStandard = hiringStandard || (activeTargetRole ? `${activeTargetRole} Competency Benchmark` : 'Role Competency Benchmark');
  const dynamicTaxonomy = taxonomy || 'ESCO European Skills Classification v1.2';

  // Dynamic Role Icon
  const getRoleIcon = (role) => {
    if (!role) return '🎯';
    const rLower = role.toLowerCase();
    if (rLower.includes('mobile') || rLower.includes('android') || rLower.includes('ios')) return '📱';
    if (rLower.includes('ai') || rLower.includes('data') || rLower.includes('machine') || rLower.includes('ml')) return '🤖';
    if (rLower.includes('front') || rLower.includes('ui') || rLower.includes('design')) return '🎨';
    if (rLower.includes('cloud') || rLower.includes('devops')) return '☁️';
    if (rLower.includes('backend') || rLower.includes('full') || rLower.includes('software')) return '💻';
    return '🏛️';
  };

  // Dynamic Requirements Match Counts & Description
  const totalReqs = Array.isArray(requirements) ? requirements.length : 0;
  const matchedReqs = Array.isArray(requirements)
    ? requirements.filter((r) => r.matched || (typeof r.student_level === 'number' && r.student_level >= 50)).length
    : 0;

  let dynamicDescription = '';
  if (totalReqs > 0) {
    dynamicDescription = `Profile verified against ${totalReqs} standard requirements for ${activeTargetRole || 'target role'} (${matchedReqs} verified).`;
  } else if (activeTargetRole) {
    dynamicDescription = `Profile calibrated for ${activeTargetRole} against active competency requirements.`;
  } else {
    dynamicDescription = 'Profile calibrated against active role standards.';
  }

  // Animated Match Score Count-up
  const [displayMatchScore, setDisplayMatchScore] = useState(0);
  const animMatchVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typeof matchScore === 'number') {
      animMatchVal.setValue(0);
      Animated.timing(animMatchVal, {
        toValue: matchScore,
        duration: 1400,
        useNativeDriver: false,
      }).start();

      const listener = animMatchVal.addListener(({ value }) => {
        setDisplayMatchScore(Math.round(value));
      });

      return () => {
        animMatchVal.removeListener(listener);
      };
    }
  }, [matchScore, animMatchVal]);

  const matchDisplay = typeof matchScore === 'number' ? `${displayMatchScore}% Match` : 'Calibrating...';

  return (
    <View
      className="clay-interactive-card"
      style={[styles.card, CLAY_SHADOWS.card]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.cardTitle}>Role Calibration</Text>
        </View>
        <View style={styles.activeProfileBadge}>
          <Text style={styles.activeProfileDot}>●</Text>
          <Text style={styles.activeProfileText}>Active Profile</Text>
        </View>
      </View>

      {/* Target Position Archetype */}
      <View style={styles.sectionBlock}>
        <Text style={styles.inputLabel}>Target Position Archetype</Text>
        
        <Pressable
          className="clay-select-interactive"
          style={({ hovered, pressed }) => [
            styles.roleSelectBox,
            CLAY_SHADOWS.pill,
            getClaySelectStyle({ hovered, pressed }),
          ]}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <View style={styles.roleSelectLeft}>
            <Text style={styles.roleIcon}>{getRoleIcon(activeTargetRole)}</Text>
            <Text style={styles.roleTitleText}>
              {activeTargetRole || 'Software Engineer'}
            </Text>
          </View>
          {targetCareers && targetCareers.length > 1 && (
            <Text
              style={[
                styles.chevronIcon,
                {
                  transform: [{ rotate: showDropdown ? '180deg' : '0deg' }],
                  transition: 'transform 0.25s ease',
                },
              ]}
            >
              ▼
            </Text>
          )}
        </Pressable>

        {/* Dropdown Options */}
        {showDropdown && targetCareers && targetCareers.length > 0 && (
          <View
            className="clay-dropdown-menu"
            style={[styles.dropdownMenu, CLAY_SHADOWS.card]}
          >
            {targetCareers.map((careerName) => {
              const isSelected = careerName === activeTargetRole;
              return (
                <Pressable
                  key={careerName}
                  className="clay-row-interactive"
                  style={({ hovered, pressed }) => [
                    styles.dropdownOption,
                    isSelected && styles.dropdownOptionActive,
                    getClayRowStyle({ hovered, pressed }),
                  ]}
                  onPress={() => {
                    setShowDropdown(false);
                    if (onSelectRole) onSelectRole(careerName);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      isSelected && styles.dropdownOptionTextActive,
                    ]}
                  >
                    {isSelected ? '✓ ' : ''}{careerName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Target Hiring Standard (100% Dynamic) */}
      <View style={styles.sectionBlock}>
        <Text style={styles.inputLabel}>Target Hiring Standard</Text>
        <View
          className="clay-chip-interactive"
          style={styles.standardBox}
        >
          <Text style={styles.standardIcon}>{getRoleIcon(activeTargetRole)}</Text>
          <View style={styles.standardTextCol}>
            <Text style={styles.standardTitle}>{dynamicStandard}</Text>
            <Text style={styles.standardSub}>{dynamicTaxonomy}</Text>
          </View>
        </View>
      </View>

      {/* Target Role Match Status (100% Dynamic) */}
      <View
        className="clay-interactive-card"
        style={styles.jdSyncedBox}
      >
        <View style={styles.jdHeader}>
          <View style={styles.jdTitleRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.jdTitle}>Target Role Match</Text>
          </View>
          <View style={styles.matchScoreBadge}>
            <Text style={styles.matchScoreText}>{matchDisplay}</Text>
          </View>
        </View>
        <Text style={styles.jdDescription}>{dynamicDescription}</Text>
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
    gap: 6,
  },
  cardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
  },
  activeProfileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: CLAY_RADII.pill,
  },
  activeProfileDot: {
    fontSize: 7,
    color: CLAY_COLORS.primary,
  },
  activeProfileText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  sectionBlock: {
    gap: 5,
  },
  inputLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  roleSelectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.inputBg,
    borderRadius: CLAY_RADII.input,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: CLAY_COLORS.inputBorder,
  },
  roleSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleIcon: {
    fontSize: 13,
  },
  roleTitleText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  chevronIcon: {
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  dropdownMenu: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.recessedBorder,
    overflow: 'hidden',
    marginTop: 3,
  },
  dropdownOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: CLAY_COLORS.subtleBorder,
  },
  dropdownOptionActive: {
    backgroundColor: CLAY_COLORS.primaryLight,
  },
  dropdownOptionText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.foreground,
  },
  dropdownOptionTextActive: {
    fontFamily: CLAY_FONTS.heading,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  standardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: CLAY_RADII.input,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: CLAY_COLORS.recessedBorder,
  },
  standardIcon: {
    fontSize: 14,
  },
  standardTextCol: {
    gap: 1,
    flex: 1,
  },
  standardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  standardSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  jdSyncedBox: {
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: CLAY_RADII.cardSmall,
    padding: 10,
    borderWidth: 1,
    borderColor: CLAY_COLORS.recessedBorder,
    gap: 4,
  },
  jdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jdTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  checkIcon: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.successText,
  },
  jdTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  matchScoreBadge: {
    backgroundColor: CLAY_COLORS.successLight,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: CLAY_RADII.pill,
  },
  matchScoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.successText,
  },
  jdDescription: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    lineHeight: 15,
    color: CLAY_COLORS.muted,
  },
});
