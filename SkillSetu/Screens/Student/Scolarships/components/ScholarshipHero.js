import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  ClayBadge,
  ClayCard,
} from './ScholarshipDesignTokens';

export default function ScholarshipHero({
  liveCount = 0,
  eligibleCount = 0,
  searchQuery = '',
  onSearchChange,
  onSearchSubmit,
  selectedProvider = 'All',
  onSelectProvider,
  availableProviders = [],
  isRefreshing = false,
  onRefresh,
}) {
  return (
    <ClayCard style={styles.heroContainer}>
      <View style={styles.headerTopRow}>
        <View style={styles.badgeRow}>
          <ClayBadge
            text="SCHOLARSHIP INTELLIGENCE"
            icon="🎓"
            variant="primary"
            size="sm"
          />
          <View style={styles.liveIndicatorPill}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveIndicatorText}>
              Live Verified Feed • {liveCount} Schemes
            </Text>
          </View>
        </View>

        <Pressable
          style={({ hovered, pressed }) => [
            styles.syncBtn,
            {
              transform: [
                { translateY: hovered && !isRefreshing ? -2 : 0 },
                { scale: pressed ? 0.96 : hovered && !isRefreshing ? 1.03 : 1 },
              ],
            },
          ]}
          onPress={onRefresh}
          disabled={isRefreshing}
        >
          <Text style={styles.syncBtnIcon}>{isRefreshing ? '⏳' : '🔄'}</Text>
          <Text style={styles.syncBtnText}>
            {isRefreshing ? 'Syncing...' : 'Refresh Feed'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.heroTitle}>
        Discover & Verify Schemes Tailored to Your Profile
      </Text>
      <Text style={styles.heroSubtitle}>
        Real-time financial aid and institutional grants automatically evaluated against your verified academic markers, family income ceiling, category quotas, and state domicile.
      </Text>

      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchIconBox}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search live scholarships by scheme name, grantor foundation, or discipline..."
          placeholderTextColor={CLAY_COLORS.muted}
          value={searchQuery}
          onChangeText={onSearchChange}
          onSubmitEditing={onSearchSubmit}
          returnKeyType="search"
        />
        {searchQuery ? (
          <Pressable
            style={({ hovered, pressed }) => [
              styles.clearSearchBtn,
              {
                transform: [{ scale: pressed ? 0.88 : hovered ? 1.15 : 1 }],
              },
            ]}
            onPress={() => {
              onSearchChange('');
              if (onSearchSubmit) onSearchSubmit();
            }}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Provider Quick Pills */}
      {availableProviders.length > 0 ? (
        <View style={styles.providerRow}>
          <Text style={styles.providerLabel}>Filter by Grantor:</Text>
          <View style={styles.providerPillsContainer}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.providerPill,
                selectedProvider === 'All' && styles.providerPillActive,
                {
                  transform: [
                    { translateY: hovered ? -2 : 0 },
                    { scale: pressed ? 0.96 : hovered ? 1.04 : 1 },
                  ],
                },
              ]}
              onPress={() => onSelectProvider('All')}
            >
              <Text
                style={[
                  styles.providerPillText,
                  selectedProvider === 'All' && styles.providerPillTextActive,
                ]}
              >
                All Sources ({liveCount})
              </Text>
            </Pressable>
            {availableProviders.map((p) => {
              const isActive = selectedProvider === p.name;
              return (
                <Pressable
                  key={p.name}
                  style={({ hovered, pressed }) => [
                    styles.providerPill,
                    isActive && styles.providerPillActive,
                    {
                      transform: [
                        { translateY: hovered ? -2 : 0 },
                        { scale: pressed ? 0.96 : hovered ? 1.04 : 1 },
                      ],
                    },
                  ]}
                  onPress={() => onSelectProvider(p.name)}
                >
                  <Text
                    style={[
                      styles.providerPillText,
                      isActive && styles.providerPillTextActive,
                    ]}
                  >
                    {p.name} ({p.count})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </ClayCard>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    marginBottom: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    backgroundColor: '#FFFFFF',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  liveIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.full,
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: CLAY_COLORS.emerald,
  },
  liveIndicatorText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.emeraldText,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderColor: CLAY_COLORS.borderLight,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.md,
    gap: 6,
    transition: 'transform 0.18s ease',
  },
  syncBtnIcon: {
    fontSize: 13,
  },
  syncBtnText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  heroTitle: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 26,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 14,
    fontWeight: '500',
    color: CLAY_COLORS.muted,
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 920,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderRadius: CLAY_RADII.md,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 16,
  },
  searchIconBox: {
    marginRight: 10,
  },
  searchIconText: {
    fontSize: 16,
    color: CLAY_COLORS.muted,
  },
  searchInput: {
    flex: 1,
    fontFamily: CLAY_FONTS.family,
    fontSize: 14,
    color: CLAY_COLORS.foreground,
    paddingVertical: 10,
    outlineStyle: 'none',
  },
  clearSearchBtn: {
    padding: 6,
    transition: 'transform 0.15s ease',
  },
  clearSearchText: {
    fontSize: 14,
    color: CLAY_COLORS.muted,
    fontWeight: '700',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  providerLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  providerPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.full,
    backgroundColor: 'rgba(124, 58, 237, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.1)',
    transition: 'transform 0.18s ease, background-color 0.18s ease',
  },
  providerPillActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  providerPillText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  providerPillTextActive: {
    color: '#FFFFFF',
  },
});
