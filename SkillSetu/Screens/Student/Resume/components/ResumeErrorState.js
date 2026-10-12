import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function ResumeErrorState({ message, onRetry }) {
  return (
    <View style={[styles.errorContainer, CLAY_SHADOWS.card]}>
      <View style={styles.errorIconCircle}>
        <Text style={styles.errorEmoji}>⚠️</Text>
      </View>
      <Text style={styles.errorTitle}>Unable to Load Tailored Resume</Text>
      <Text style={styles.errorMessage}>
        {message || 'A network error occurred while connecting to the AI career intelligence engine.'}
      </Text>

      {onRetry && (
        <Pressable
          style={[
            styles.retryButton,
            CLAY_SHADOWS.buttonPrimary,
            Platform.OS === 'web' ? { className: 'clay-btn-primary' } : {},
          ]}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 380,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: CLAY_COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorEmoji: {
    fontSize: 24,
  },
  errorTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    textAlign: 'center',
  },
  errorMessage: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: CLAY_RADII.button,
    marginTop: 8,
  },
  retryText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },
});
