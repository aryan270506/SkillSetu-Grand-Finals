import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function OpportunityFilters({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  readinessTab,
  setReadinessTab,
  verifiedFilter,
  setVerifiedFilter,
  selectedTechStack,
  setSelectedTechStack,
  availableTechStacks = [],
  sortOption,
  setSortOption,
  locationFilter,
  setLocationFilter,
  typeFilter,
  setTypeFilter,
  metrics = {},
  totalCount = 0,
  savedCount = 0,
  onClearFilters,
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const [searchFocused, setSearchFocused] = useState(false);
  const [searchBtnHovered, setSearchBtnHovered] = useState(false);
  const [searchBtnPressed, setSearchBtnPressed] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const sortOptions = ['Best Match', 'Newest', 'Stipend (High to Low)'];

  // Tech stack default tags fallback if not populated
  const defaultTechStacks = ['Golang', 'React', 'Python', 'Kubernetes', 'Node.js', 'SQL', 'Distributed Systems'];
  const displayTechStacks = availableTechStacks.length > 0 ? availableTechStacks.slice(0, 7) : defaultTechStacks;

  const hasActiveFilters = Boolean(
    locationFilter || typeFilter || searchQuery || verifiedFilter || selectedTechStack || readinessTab !== 'ALL'
  );

  return (
    <View style={styles.container}>
      {/* 1. Large Recessed Clay Search Bar */}
      <View style={styles.searchRow}>
        <View style={[
          styles.searchBox,
          searchFocused && styles.searchBoxFocused,
        ]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search roles, tech stack, companies, or verified keywords..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={onSearchSubmit}
            placeholderTextColor={CLAY_COLORS.mutedLight}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {Platform.OS === 'web' && (
            <View style={styles.cmdKBadge}>
              <Text style={styles.cmdKText}>⌘K</Text>
            </View>
          )}
        </View>

        <Pressable
          style={[
            styles.searchSubmitBtn,
            searchBtnHovered && styles.searchSubmitBtnHover,
            searchBtnPressed && styles.btnPressed,
          ]}
          onPress={onSearchSubmit}
          onHoverIn={() => setSearchBtnHovered(true)}
          onHoverOut={() => setSearchBtnHovered(false)}
          onPressIn={() => setSearchBtnPressed(true)}
          onPressOut={() => setSearchBtnPressed(false)}
        >
          <Text style={styles.searchSubmitBtnText}>Search</Text>
        </Pressable>
      </View>

      {/* 2. Primary Verification Status Filter Bar */}
      <View style={styles.verificationSegmentBar}>
        {/* All Internships */}
        <Pressable
          style={[
            styles.verificationSegmentBtn,
            (!verifiedFilter || verifiedFilter === 'ALL') && styles.verificationSegmentBtnActiveAll,
          ]}
          onPress={() => setVerifiedFilter('')}
        >
          <Text style={[
            styles.verificationSegmentText,
            (!verifiedFilter || verifiedFilter === 'ALL') && styles.verificationSegmentTextActive,
          ]}>
            All Internships ({totalCount || metrics.totalCount || 0})
          </Text>
        </Pressable>

        {/* Verified */}
        <Pressable
          style={[
            styles.verificationSegmentBtn,
            verifiedFilter === 'VERIFIED' && styles.verificationSegmentBtnActiveVerified,
          ]}
          onPress={() => setVerifiedFilter(verifiedFilter === 'VERIFIED' ? '' : 'VERIFIED')}
        >
          <Text style={[
            styles.verificationSegmentText,
            verifiedFilter === 'VERIFIED' && styles.verificationSegmentTextActiveVerified,
          ]}>
            ✓ Verified ({metrics.verifiedCount || 0})
          </Text>
        </Pressable>

        {/* Unverified */}
        <Pressable
          style={[
            styles.verificationSegmentBtn,
            verifiedFilter === 'UNVERIFIED' && styles.verificationSegmentBtnActiveUnverified,
          ]}
          onPress={() => setVerifiedFilter(verifiedFilter === 'UNVERIFIED' ? '' : 'UNVERIFIED')}
        >
          <Text style={[
            styles.verificationSegmentText,
            verifiedFilter === 'UNVERIFIED' && styles.verificationSegmentTextActiveUnverified,
          ]}>
            ⚠ Unverified ({metrics.unverifiedCount || 0})
          </Text>
        </Pressable>
      </View>

      {/* 3. Filter Row 1: Role Types / Readiness Tabs & Sort */}
      <View style={styles.filterRow1}>
        <View style={styles.roleTypeGroup}>
          <Text style={styles.filterLabel}>Role Type :</Text>
          
          <View style={styles.chipsContainer}>
            {/* All Roles */}
            <Pressable
              style={[
                styles.chip,
                readinessTab === 'ALL' && styles.chipActive,
              ]}
              onPress={() => setReadinessTab('ALL')}
            >
              <Text style={[
                styles.chipText,
                readinessTab === 'ALL' && styles.chipTextActive,
              ]}>
                All Roles ({totalCount})
              </Text>
            </Pressable>

            {/* Ready to Apply */}
            <Pressable
              style={[
                styles.chip,
                readinessTab === 'READY' && styles.chipActive,
              ]}
              onPress={() => setReadinessTab('READY')}
            >
              <Text style={[
                styles.chipText,
                readinessTab === 'READY' && styles.chipTextActive,
              ]}>
                ✓ Ready to Apply ({metrics.readyCount || 0})
              </Text>
            </Pressable>

            {/* Needs Development */}
            <Pressable
              style={[
                styles.chip,
                readinessTab === 'NEEDS_DEV' && styles.chipActive,
              ]}
              onPress={() => setReadinessTab('NEEDS_DEV')}
            >
              <Text style={[
                styles.chipText,
                readinessTab === 'NEEDS_DEV' && styles.chipTextActive,
              ]}>
                ⚡ Needs Development ({metrics.devCount || 0})
              </Text>
            </Pressable>

            {/* Saved */}
            <Pressable
              style={[
                styles.chip,
                readinessTab === 'SAVED' && styles.chipActive,
              ]}
              onPress={() => setReadinessTab('SAVED')}
            >
              <Text style={[
                styles.chipText,
                readinessTab === 'SAVED' && styles.chipTextActive,
              ]}>
                ★ Saved ({savedCount})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Sort & Min Match Right Side */}
        <View style={styles.sortGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.sortBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => {
              const nextIndex = (sortOptions.indexOf(sortOption) + 1) % sortOptions.length;
              setSortOption(sortOptions[nextIndex]);
            }}
          >
            <Text style={styles.sortBtnText}>
              Sort: <Text style={{ color: CLAY_COLORS.primary, fontWeight: '800' }}>{sortOption}</Text> ▾
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 4. Filter Row 2: Tech Stack */}
      <View style={styles.filterRow2}>
        <View style={styles.techStackGroup}>
          <Text style={styles.filterLabel}>TECH STACK :</Text>

          <View style={styles.chipsContainer}>
            {/* Tech tags */}
            {displayTechStacks.map((tech) => {
              const isSelected = selectedTechStack === tech;
              return (
                <Pressable
                  key={tech}
                  style={[
                    styles.techChip,
                    isSelected && styles.techChipActive,
                  ]}
                  onPress={() => setSelectedTechStack(isSelected ? '' : tech)}
                >
                  <Text style={[
                    styles.techChipText,
                    isSelected && styles.techChipTextActive,
                  ]}>
                    {tech} {isSelected ? '✓' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Work Mode quick toggles */}
        <View style={styles.workModeGroup}>
          <Pressable
            style={[
              styles.workModeChip,
              typeFilter === 'Remote' && styles.techChipActive,
            ]}
            onPress={() => setTypeFilter(typeFilter === 'Remote' ? '' : 'Remote')}
          >
            <Text style={[
              styles.workModeChipText,
              typeFilter === 'Remote' && styles.techChipTextActive,
            ]}>
              🌐 Hybrid / Remote
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 4. Active Chips Bar with Reset */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
          {searchQuery ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>"{searchQuery}"</Text>
              <Pressable onPress={() => setSearchQuery('')} style={styles.activePillRemove}>
                <Text style={styles.activePillRemoveText}>×</Text>
              </Pressable>
            </View>
          ) : null}
          {readinessTab !== 'ALL' ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Status: {readinessTab}</Text>
              <Pressable onPress={() => setReadinessTab('ALL')} style={styles.activePillRemove}>
                <Text style={styles.activePillRemoveText}>×</Text>
              </Pressable>
            </View>
          ) : null}
          {verifiedFilter ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>
                {verifiedFilter === 'VERIFIED' ? '✓ Verified Roles' : '⚠ Unverified Feed'}
              </Text>
              <Pressable onPress={() => setVerifiedFilter('')} style={styles.activePillRemove}>
                <Text style={styles.activePillRemoveText}>×</Text>
              </Pressable>
            </View>
          ) : null}
          {selectedTechStack ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Skill: {selectedTechStack}</Text>
              <Pressable onPress={() => setSelectedTechStack('')} style={styles.activePillRemove}>
                <Text style={styles.activePillRemoveText}>×</Text>
              </Pressable>
            </View>
          ) : null}
          {locationFilter ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Loc: {locationFilter}</Text>
              <Pressable onPress={() => setLocationFilter('')} style={styles.activePillRemove}>
                <Text style={styles.activePillRemoveText}>×</Text>
              </Pressable>
            </View>
          ) : null}
          {typeFilter ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Type: {typeFilter}</Text>
              <Pressable onPress={() => setTypeFilter('')} style={styles.activePillRemove}>
                <Text style={styles.activePillRemoveText}>×</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={onClearFilters} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Clear All Filters</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.card,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    marginBottom: 24,
    ...CLAY_SHADOWS.card,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.inputBg,
    borderRadius: CLAY_RADII.input,
    paddingHorizontal: 16,
    height: 48,
    ...CLAY_SHADOWS.searchBar,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
  },
  searchBoxFocused: {
    backgroundColor: '#ffffff',
    borderColor: CLAY_COLORS.primary,
    ...CLAY_SHADOWS.searchBarFocused,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    color: CLAY_COLORS.muted,
  },
  searchInput: {
    flex: 1,
    fontFamily: CLAY_FONTS.body,
    fontSize: 14,
    color: CLAY_COLORS.foreground,
    padding: 0,
    outlineStyle: 'none',
  },
  cmdKBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  cmdKText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  searchSubmitBtn: {
    backgroundColor: CLAY_COLORS.primary,
    borderRadius: CLAY_RADII.button,
    paddingHorizontal: 22,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  searchSubmitBtnHover: {
    transform: [{ translateY: -2 }],
    ...CLAY_SHADOWS.buttonPrimaryHover,
  },
  searchSubmitBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  verificationSegmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFA',
    borderRadius: CLAY_RADII.pill,
    padding: 4,
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
    ...CLAY_SHADOWS.recessed,
    flexWrap: 'wrap',
  },
  verificationSegmentBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.pill,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  verificationSegmentBtnActiveAll: {
    backgroundColor: CLAY_COLORS.primary,
    ...CLAY_SHADOWS.cardInteractive,
  },
  verificationSegmentBtnActiveVerified: {
    backgroundColor: '#059669',
    ...CLAY_SHADOWS.cardInteractive,
  },
  verificationSegmentBtnActiveUnverified: {
    backgroundColor: '#D97706',
    ...CLAY_SHADOWS.cardInteractive,
  },
  verificationSegmentText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  verificationSegmentTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  verificationSegmentTextActiveVerified: {
    color: '#ffffff',
    fontWeight: '800',
  },
  verificationSegmentTextActiveUnverified: {
    color: '#ffffff',
    fontWeight: '800',
  },
  filterRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.08)',
    marginBottom: 12,
  },
  roleTypeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: CLAY_COLORS.recessed,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
    ...CLAY_SHADOWS.pill,
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  chipActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
    ...CLAY_SHADOWS.pillActive,
  },
  chipText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  sortGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.16)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.buttonSecondary,
    cursor: 'pointer',
  },
  sortBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  filterRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  techStackGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  techChip: {
    backgroundColor: '#FAF8FD',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.pill,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  techChipActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
    ...CLAY_SHADOWS.pillActive,
  },
  techChipText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    fontWeight: '600',
    color: CLAY_COLORS.foreground,
  },
  techChipTextActive: {
    color: '#ffffff',
    fontFamily: CLAY_FONTS.heading,
    fontWeight: '700',
  },
  workModeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workModeChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.pill,
    cursor: 'pointer',
  },
  workModeChipText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
  },
  activeFiltersTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    gap: 6,
  },
  activePillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.primaryDark,
  },
  activePillRemove: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePillRemoveText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: CLAY_COLORS.primaryDark,
    lineHeight: 12,
  },
  clearAllBtn: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.secondary,
    textDecorationLine: 'underline',
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    ...CLAY_SHADOWS.buttonPressed,
  },
});
