import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function ResumeLoadingSkeleton() {
  return (
    <View style={[styles.skeletonContainer, CLAY_SHADOWS.card]}>
      <View style={styles.spinnerWrapper}>
        <ActivityIndicator color={CLAY_COLORS.primary} size="large" />
      </View>
      <Text style={styles.loadingTitle}>Synthesizing ATS-Optimized Resume...</Text>
      <Text style={styles.loadingSubtitle}>
        Querying student evidence, GitHub repositories, and ESCO industry standards.
      </Text>

      <View style={styles.mockSheet}>
        <View style={styles.mockHeaderRow}>
          <View style={styles.mockAvatar} />
          <View style={styles.mockHeaderLines}>
            <View style={[styles.mockBar, { width: '60%', height: 16 }]} />
            <View style={[styles.mockBar, { width: '40%', height: 10 }]} />
          </View>
        </View>
        <View style={[styles.mockDivider]} />
        <View style={[styles.mockBar, { width: '30%', height: 12 }]} />
        <View style={[styles.mockBar, { width: '95%', height: 8 }]} />
        <View style={[styles.mockBar, { width: '90%', height: 8 }]} />
        <View style={[styles.mockBar, { width: '80%', height: 8 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 520,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  spinnerWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: CLAY_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loadingTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    maxWidth: 400,
  },
  mockSheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: CLAY_COLORS.recessedInput,
    borderRadius: CLAY_RADII.cardMedium,
    padding: 20,
    marginTop: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: CLAY_COLORS.inputBorder,
  },
  mockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mockAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  mockHeaderLines: {
    flex: 1,
    gap: 6,
  },
  mockDivider: {
    height: 1,
    backgroundColor: CLAY_COLORS.subtleBorder,
    marginVertical: 4,
  },
  mockBar: {
    backgroundColor: 'rgba(124, 58, 237, 0.10)',
    borderRadius: 4,
  },
});
