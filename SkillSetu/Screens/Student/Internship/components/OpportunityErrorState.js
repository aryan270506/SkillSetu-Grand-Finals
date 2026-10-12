import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function OpportunityErrorState({ error, onRetry }) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Unable to Connect to Opportunity Registry</Text>
      <Text style={styles.errorSubtitle}>
        {error || 'Failed to communicate with SkillSetu deterministic opportunity API.'}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.retryBtn, pressed && styles.btnPressed]}
        onPress={onRetry}
      >
        <Text style={styles.retryBtnText}>Retry Connection</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.card,
    padding: 36,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    ...CLAY_SHADOWS.card,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.danger,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13.5,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 19,
    marginBottom: 18,
  },
  retryBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonPrimary,
    cursor: 'pointer',
  },
  retryBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    ...CLAY_SHADOWS.buttonPressed,
  },
});
