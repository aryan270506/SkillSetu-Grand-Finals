import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function ProfileHeaderNav({
  isVerified = true,
  onEditProfile,
  onShareProfile,
  onDownloadReport,
  isDownloading = false,
}) {
  return (
    <View style={styles.container}>
      {/* Left: Breadcrumbs & Status Tag */}
      <View style={styles.leftBreadcrumbs}>
        <View style={styles.breadcrumbItem}>
          <Text style={styles.breadcrumbMuted}>Dashboard</Text>
          <Text style={styles.breadcrumbSeparator}>/</Text>
          <Text style={styles.breadcrumbActive}>Student Career Dossier</Text>
        </View>
        <View style={styles.nsqfBadge}>
          <Text style={styles.nsqfBadgeText}>NSQF Level 6 Certified</Text>
        </View>
      </View>

      {/* Right: Actions */}
      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.btnSecondary, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
          onPress={onEditProfile}
          accessibilityLabel="Edit Profile"
        >
          <Text style={styles.btnSecondaryIcon}>✏️</Text>
          <Text style={styles.btnSecondaryText}>Edit Profile</Text>
        </Pressable>

        <Pressable
          style={[styles.btnSecondary, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
          onPress={onShareProfile}
          accessibilityLabel="Share Profile"
        >
          <Text style={styles.btnSecondaryIcon}>🔗</Text>
          <Text style={styles.btnSecondaryText}>Share Profile</Text>
        </Pressable>

        <Pressable
          style={[styles.btnPrimary, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
          onPress={onDownloadReport}
          disabled={isDownloading}
          accessibilityLabel="Download Report"
        >
          <Text style={styles.btnPrimaryIcon}>{isDownloading ? '⏳' : '📥'}</Text>
          <Text style={styles.btnPrimaryText}>{isDownloading ? 'Generating...' : 'Download Report'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    zIndex: 10,
  },
  leftBreadcrumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbMuted: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.mutedLight,
    fontWeight: '500',
  },
  breadcrumbSeparator: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.mutedLight,
  },
  breadcrumbActive: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    color: CLAY_COLORS.foreground,
    fontWeight: '700',
  },
  nsqfBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.badge,
  },
  nsqfBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  btnSecondaryIcon: {
    fontSize: 13,
  },
  btnSecondaryText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  btnPrimaryIcon: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnPrimaryText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
