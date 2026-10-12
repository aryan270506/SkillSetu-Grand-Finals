import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
} from './ScholarshipDesignTokens';

export default function ScholarshipFilterBar({
  activeTab = 'All',
  onTabChange,
  counts = { all: 0, eligible: 0, closingSoon: 0, saved: 0 },
  sortBy = 'Best Match',
  onSortChange,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const tabs = [
    { id: 'All', label: 'All Schemes', count: counts.all, icon: '📚' },
    { id: 'Eligible', label: 'Verified Eligible', count: counts.eligible, icon: '✓' },
    { id: 'ClosingSoon', label: 'Closing Soon', count: counts.closingSoon, icon: '⏰' },
    { id: 'Saved', label: 'Saved Opportunities', count: counts.saved, icon: '🔖' },
  ];

  const sortOptions = [
    'Best Match',
    'Deadline (Soonest)',
    'Award (Highest)',
    'Scheme Name (A-Z)',
  ];

  return (
    <View style={styles.container}>
      {/* Sub-Nav Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={({ hovered, pressed }) => [
                styles.tabBtn,
                isActive && styles.tabBtnActive,
                {
                  transform: [
                    { translateY: hovered ? -2 : 0 },
                    { scale: pressed ? 0.96 : hovered ? 1.025 : 1 },
                  ],
                },
              ]}
              onPress={() => onTabChange(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
              <View
                style={[styles.tabBadge, isActive && styles.tabBadgeActive]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    isActive && styles.tabBadgeTextActive,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Sort & Filter Controls */}
      <View style={[styles.controlsRow, isMobile && styles.controlsRowMobile]}>
        <View style={styles.sortGroup}>
          <Text style={styles.controlLabel}>Sort by:</Text>
          <View style={styles.sortPillsRow}>
            {sortOptions.map((opt) => {
              const isSelected = sortBy === opt;
              return (
                <Pressable
                  key={opt}
                  style={({ hovered, pressed }) => [
                    styles.sortPill,
                    isSelected && styles.sortPillActive,
                    {
                      transform: [
                        { translateY: hovered ? -1 : 0 },
                        { scale: pressed ? 0.96 : hovered ? 1.04 : 1 },
                      ],
                    },
                  ]}
                  onPress={() => onSortChange(opt)}
                >
                  <Text
                    style={[
                      styles.sortPillText,
                      isSelected && styles.sortPillTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 4,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.md,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
    gap: 8,
    transition: 'transform 0.18s ease, background-color 0.18s ease',
  },
  tabBtnActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: CLAY_COLORS.cardSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.full,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'transparent',
  },
  tabBadgeText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  controlsRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  sortGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  sortPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.sm,
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
    transition: 'transform 0.15s ease, background-color 0.15s ease',
  },
  sortPillActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderColor: CLAY_COLORS.primary,
  },
  sortPillText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
  },
  sortPillTextActive: {
    color: CLAY_COLORS.primary,
    fontWeight: '800',
  },
});
