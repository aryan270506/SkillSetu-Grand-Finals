import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayCard,
} from './ScholarshipDesignTokens';

/**
 * Animated Loading Skeleton for Live Scholarships with Shimmer Pulse
 */
export function ScholarshipLoadingSkeleton() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.skeletonContainer}>
      <ClayCard style={styles.skeletonHeaderCard}>
        <Animated.View style={[styles.skeletonPulseLineLong, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.skeletonPulseLineMedium, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.skeletonPulseLineShort, { opacity: pulseAnim }]} />
      </ClayCard>

      <View style={[styles.skeletonGrid, isMobile && styles.skeletonGridMobile]}>
        {[1, 2, 3, 4].map((item) => (
          <ClayCard key={item} style={styles.skeletonCard}>
            <View style={styles.skeletonCardTop}>
              <Animated.View style={[styles.skeletonTag, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonCircle, { opacity: pulseAnim }]} />
            </View>
            <Animated.View style={[styles.skeletonTitle, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonSubtitle, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonDesc, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonDescShort, { opacity: pulseAnim }]} />
            <View style={styles.skeletonMetaRow}>
              <Animated.View style={[styles.skeletonMetaBlock, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonMetaBlock, { opacity: pulseAnim }]} />
            </View>
            <Animated.View style={[styles.skeletonBtn, { opacity: pulseAnim }]} />
          </ClayCard>
        ))}
      </View>
    </View>
  );
}

/**
 * Dedicated Empty State (No Live Scholarships Found)
 */
export function ScholarshipEmptyState({
  searchQuery = '',
  selectedProvider = 'All',
  activeTab = 'All',
  onResetFilters,
  onRefresh,
}) {
  const isFiltered = Boolean(searchQuery || selectedProvider !== 'All' || activeTab !== 'All');

  return (
    <ClayCard style={styles.stateCard}>
      <View style={styles.stateIconCircle}>
        <Text style={styles.stateIconText}>🔍</Text>
      </View>
      <Text style={styles.stateTitle}>
        {isFiltered ? 'No Matching Scholarships Found' : 'No Live Scholarships Currently Available'}
      </Text>
      <Text style={styles.stateDesc}>
        {isFiltered
          ? 'No opportunities match your current filter and search criteria. Try broadening your parameters or resetting filters.'
          : 'All live schemes from connected official portals have concluded their intake cycles. Check back soon for new cycle openings.'}
      </Text>

      <View style={styles.stateActionsRow}>
        {isFiltered && onResetFilters ? (
          <Pressable
            style={({ hovered, pressed }) => [
              styles.btnPrimary,
              {
                transform: [
                  { translateY: hovered ? -2 : 0 },
                  { scale: pressed ? 0.96 : hovered ? 1.02 : 1 },
                ],
              },
            ]}
            onPress={onResetFilters}
          >
            <Text style={styles.btnPrimaryText}>Reset All Filters</Text>
          </Pressable>
        ) : null}

        {onRefresh ? (
          <Pressable
            style={({ hovered, pressed }) => [
              styles.btnSecondary,
              {
                transform: [
                  { translateY: hovered ? -2 : 0 },
                  { scale: pressed ? 0.96 : hovered ? 1.02 : 1 },
                ],
              },
            ]}
            onPress={onRefresh}
          >
            <Text style={styles.btnSecondaryText}>🔄 Refresh Live Feed</Text>
          </Pressable>
        ) : null}
      </View>
    </ClayCard>
  );
}

/**
 * Dedicated Error State (API Failure)
 */
export function ScholarshipErrorState({
  errorMessage = 'Failed to connect to the live scholarship service.',
  onRetry,
}) {
  return (
    <ClayCard style={[styles.stateCard, styles.errorStateCard]}>
      <View style={[styles.stateIconCircle, styles.errorIconCircle]}>
        <Text style={styles.errorIconText}>⚠️</Text>
      </View>
      <Text style={[styles.stateTitle, { color: CLAY_COLORS.crimsonText }]}>
        Scholarships Couldn't Be Loaded
      </Text>
      <Text style={styles.stateDesc}>
        {errorMessage}
      </Text>

      {onRetry ? (
        <Pressable
          style={({ hovered, pressed }) => [
            styles.btnRetry,
            {
              transform: [
                { translateY: hovered ? -2 : 0 },
                { scale: pressed ? 0.96 : hovered ? 1.02 : 1 },
              ],
            },
          ]}
          onPress={onRetry}
        >
          <Text style={styles.btnRetryText}>Try Again</Text>
        </Pressable>
      ) : null}
    </ClayCard>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    gap: 20,
    marginBottom: 30,
  },
  skeletonHeaderCard: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.lg,
    gap: 12,
  },
  skeletonPulseLineLong: {
    height: 16,
    width: '40%',
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderRadius: 6,
  },
  skeletonPulseLineMedium: {
    height: 24,
    width: '70%',
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderRadius: 8,
  },
  skeletonPulseLineShort: {
    height: 14,
    width: '90%',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: 6,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  skeletonGridMobile: {
    flexDirection: 'column',
  },
  skeletonCard: {
    flex: 1,
    minWidth: 300,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.lg,
    gap: 10,
  },
  skeletonCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonTag: {
    width: 90,
    height: 18,
    borderRadius: CLAY_RADII.full,
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
  },
  skeletonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
  },
  skeletonTitle: {
    height: 20,
    width: '80%',
    backgroundColor: 'rgba(51, 47, 58, 0.14)',
    borderRadius: 6,
  },
  skeletonSubtitle: {
    height: 14,
    width: '50%',
    backgroundColor: 'rgba(51, 47, 58, 0.1)',
    borderRadius: 4,
  },
  skeletonDesc: {
    height: 12,
    width: '100%',
    backgroundColor: 'rgba(99, 95, 105, 0.1)',
    borderRadius: 4,
  },
  skeletonDescShort: {
    height: 12,
    width: '75%',
    backgroundColor: 'rgba(99, 95, 105, 0.1)',
    borderRadius: 4,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  skeletonMetaBlock: {
    height: 20,
    width: '35%',
    backgroundColor: 'rgba(124, 58, 237, 0.14)',
    borderRadius: 6,
  },
  skeletonBtn: {
    height: 38,
    width: '100%',
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderRadius: CLAY_RADII.md,
    marginTop: 6,
  },

  // States
  stateCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CLAY_RADII.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.borderLight,
    marginBottom: 30,
    gap: 12,
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: CLAY_COLORS.cardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stateIconText: {
    fontSize: 28,
  },
  stateTitle: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    textAlign: 'center',
  },
  stateDesc: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 14,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    maxWidth: 540,
    lineHeight: 22,
  },
  stateActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btnPrimary: {
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: CLAY_RADII.md,
    transition: 'transform 0.18s ease',
  },
  btnPrimaryText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnSecondary: {
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderColor: CLAY_COLORS.borderMedium,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: CLAY_RADII.md,
    transition: 'transform 0.18s ease',
  },
  btnSecondaryText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13.5,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },

  // Error State
  errorStateCard: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
  },
  errorIconCircle: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  errorIconText: {
    fontSize: 28,
  },
  btnRetry: {
    backgroundColor: CLAY_COLORS.crimsonText,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: CLAY_RADII.md,
    marginTop: 6,
    transition: 'transform 0.18s ease',
  },
  btnRetryText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
