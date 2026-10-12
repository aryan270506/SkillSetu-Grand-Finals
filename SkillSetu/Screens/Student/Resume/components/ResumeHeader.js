import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  getClayPrimaryBtnStyle,
  getClaySecondaryBtnStyle,
} from './DesignTokens';

export default function ResumeHeader({
  activeTargetRole = '',
  isGenerating = false,
  onRegenerate,
  onDownloadPdf,
  isEditing = false,
  onToggleEdit,
}) {
  return (
    <View style={[styles.headerCard, CLAY_SHADOWS.card]}>
      {/* Left Column: Breadcrumb, Title & Subtitle */}
      <View style={styles.leftColumn}>
        <View style={styles.breadcrumbRow}>
          <Text className="clay-breadcrumb-link" style={styles.breadcrumbItem}>
            Dashboard
          </Text>
          <Text style={styles.breadcrumbDivider}>/</Text>
          <Text className="clay-breadcrumb-link" style={styles.breadcrumbItem}>
            Career Hub
          </Text>
          <Text style={styles.breadcrumbDivider}>/</Text>
          <Text style={styles.breadcrumbCurrent}>AI ATS-Free Resume Generator</Text>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>AI ATS-Free Resume Generator</Text>
          <View className="clay-chip-interactive" style={styles.liveTag}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveTagText}>AI Verified</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          Automatically create a recruiter-ready, ATS-optimized resume tailored to your target role with zero parsing traps.
        </Text>
      </View>

      {/* Right Column: Actions & Verification Status */}
      <View style={styles.rightColumn}>
        {/* Verification Status Pill */}
        <View className="clay-chip-interactive" style={styles.statusPill}>
          <Text style={styles.statusIcon}>✓</Text>
          <Text style={styles.statusText}>
            Live Calibration Synced {activeTargetRole ? `· ${activeTargetRole}` : ''}
          </Text>
        </View>

        {/* Header Action Buttons Row */}
        <View style={styles.actionsRow}>
          {/* Edit / Preview Toggle */}
          <Pressable
            className="clay-btn-secondary"
            style={({ hovered, pressed }) => [
              styles.actionBtnSecondary,
              getClaySecondaryBtnStyle({ hovered, pressed }),
            ]}
            onPress={onToggleEdit}
          >
            <Text style={styles.btnIcon}>{isEditing ? '👁️' : '✏️'}</Text>
            <Text style={styles.btnTextSecondary}>
              {isEditing ? 'Preview Mode' : 'Edit Buffer'}
            </Text>
          </Pressable>

          {/* Regenerate with AI */}
          <Pressable
            className="clay-btn-secondary"
            style={({ hovered, pressed }) => [
              styles.actionBtnSecondary,
              getClaySecondaryBtnStyle({ hovered, pressed }),
            ]}
            onPress={onRegenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={CLAY_COLORS.primary} />
            ) : (
              <>
                <Text className="clay-rotate-icon" style={styles.btnIcon}>
                  🔄
                </Text>
                <Text style={styles.btnTextSecondary}>Regenerate</Text>
              </>
            )}
          </Pressable>

          {/* Download PDF Primary CTA */}
          <Pressable
            className="clay-btn-primary"
            style={({ hovered, pressed }) => [
              styles.actionBtnPrimary,
              getClayPrimaryBtnStyle({ hovered, pressed }),
            ]}
            onPress={onDownloadPdf}
          >
            <Text style={styles.btnIconWhite}>📥</Text>
            <Text style={styles.btnTextPrimary}>Download PDF</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  leftColumn: {
    flex: 1,
    minWidth: 320,
    gap: 4,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  breadcrumbItem: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
    fontWeight: '500',
  },
  breadcrumbDivider: {
    fontSize: 10,
    color: CLAY_COLORS.mutedLight,
  },
  breadcrumbCurrent: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    color: CLAY_COLORS.primary,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 22,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    letterSpacing: -0.4,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY_COLORS.primary,
  },
  liveTagText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  subtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
    maxWidth: 600,
  },
  rightColumn: {
    alignItems: 'flex-end',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.successLight,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  statusIcon: {
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.successText,
  },
  statusText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.successText,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: CLAY_COLORS.recessed,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.recessedBorder,
  },
  btnIcon: {
    fontSize: 12,
  },
  btnTextSecondary: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: CLAY_RADII.button,
  },
  btnIconWhite: {
    fontSize: 12,
    color: CLAY_COLORS.paper,
  },
  btnTextPrimary: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
    letterSpacing: 0.2,
  },
});
