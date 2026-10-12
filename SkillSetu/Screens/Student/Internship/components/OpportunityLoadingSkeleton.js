import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function OpportunityLoadingSkeleton() {
  return (
    <View style={styles.container}>
      {/* Top Banner Skeleton */}
      <View style={styles.heroSkeleton}>
        <View style={styles.tagSkeleton} />
        <View style={styles.titleSkeleton} />
        <View style={styles.subtitleSkeleton} />
      </View>

      {/* Cards Skeleton Row */}
      <View style={styles.cardsRow}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.cardSkeleton}>
            <View style={styles.cardHeaderSkeleton}>
              <View style={styles.avatarSkeleton} />
              <View style={styles.badgeSkeleton} />
            </View>
            <View style={styles.lineSkeletonLarge} />
            <View style={styles.lineSkeletonMedium} />
            <View style={styles.lineSkeletonSmall} />
            <View style={styles.cardFooterSkeleton}>
              <View style={styles.footerPillSkeleton} />
              <View style={styles.footerBtnSkeleton} />
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.loadingMessage}>
        Evaluating deterministic match telemetry & live verified opportunities...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    gap: 20,
  },
  heroSkeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: CLAY_RADII.card,
    padding: 30,
    ...CLAY_SHADOWS.card,
    gap: 12,
  },
  tagSkeleton: {
    width: 220,
    height: 24,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.recessed,
  },
  titleSkeleton: {
    width: '60%',
    height: 36,
    borderRadius: 8,
    backgroundColor: CLAY_COLORS.recessed,
  },
  subtitleSkeleton: {
    width: '85%',
    height: 20,
    borderRadius: 6,
    backgroundColor: CLAY_COLORS.recessed,
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  cardSkeleton: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    ...CLAY_SHADOWS.card,
    gap: 12,
  },
  cardHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatarSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: CLAY_COLORS.recessed,
  },
  badgeSkeleton: {
    width: 90,
    height: 24,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.recessed,
  },
  lineSkeletonLarge: {
    width: '80%',
    height: 18,
    borderRadius: 6,
    backgroundColor: CLAY_COLORS.recessed,
  },
  lineSkeletonMedium: {
    width: '50%',
    height: 14,
    borderRadius: 6,
    backgroundColor: CLAY_COLORS.recessed,
  },
  lineSkeletonSmall: {
    width: '100%',
    height: 32,
    borderRadius: 6,
    backgroundColor: CLAY_COLORS.recessed,
  },
  cardFooterSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: CLAY_COLORS.recessed,
  },
  footerPillSkeleton: {
    width: 80,
    height: 16,
    borderRadius: 4,
    backgroundColor: CLAY_COLORS.recessed,
  },
  footerBtnSkeleton: {
    width: 70,
    height: 28,
    borderRadius: CLAY_RADII.button,
    backgroundColor: CLAY_COLORS.recessed,
  },
  loadingMessage: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
});
