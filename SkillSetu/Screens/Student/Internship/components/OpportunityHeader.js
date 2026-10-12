import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function OpportunityHeader({
  metrics = {},
  applicationsCount = 0,
  onNavigate,
  onSyncLedger,
}) {
  const [ledgerHovered, setLedgerHovered] = useState(false);
  const [ledgerPressed, setLedgerPressed] = useState(false);
  const [appPillHovered, setAppPillHovered] = useState(false);
  const [appPillPressed, setAppPillPressed] = useState(false);

  return (
    <View style={styles.headerContainer}>
      {/* Top Row: Breadcrumbs & Dynamic Live Status Tags */}
      <View style={styles.topRow}>
        {/* Breadcrumbs */}
        <View style={styles.breadcrumbRow}>
          <Pressable 
            onPress={() => onNavigate && onNavigate('Dashboard')}
            style={({ pressed }) => [styles.breadcrumbLink, pressed && styles.pressed]}
          >
            <Text style={styles.breadcrumbText}>Dashboard</Text>
          </Pressable>
          <Text style={styles.breadcrumbSep}>/</Text>
          <Text style={styles.breadcrumbText}>Student Career Hub</Text>
          <Text style={styles.breadcrumbSep}>/</Text>
          <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>Opportunities & Internships</Text>
        </View>

        {/* Action / Sync Pills */}
        <View style={styles.actionPillsGroup}>
          <Pressable
            style={[
              styles.ledgerSyncBtn,
              ledgerHovered && styles.ledgerSyncBtnHover,
              ledgerPressed && styles.btnPressed,
            ]}
            onPress={() => onSyncLedger && onSyncLedger()}
            onHoverIn={() => setLedgerHovered(true)}
            onHoverOut={() => setLedgerHovered(false)}
            onPressIn={() => setLedgerPressed(true)}
            onPressOut={() => setLedgerPressed(false)}
          >
            <Text style={styles.ledgerSyncIcon}>⚡</Text>
            <Text style={styles.ledgerSyncText}>Match to My Verified Ledger</Text>
            <View style={styles.multiSyncBadge}>
              <Text style={styles.multiSyncBadgeText}>Multi-Sync</Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.fastTrackAppPill,
              appPillHovered && styles.fastTrackAppPillHover,
              appPillPressed && styles.btnPressed,
            ]}
            onPress={() => onNavigate && onNavigate('Applications')}
            onHoverIn={() => setAppPillHovered(true)}
            onHoverOut={() => setAppPillHovered(false)}
            onPressIn={() => setAppPillPressed(true)}
            onPressOut={() => setAppPillPressed(false)}
          >
            <Text style={styles.fastTrackIcon}>⚡</Text>
            <Text style={styles.fastTrackText}>
              1-Click Fast Track Applied ({applicationsCount})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Sub-pill stats row */}
      <View style={styles.statsPillRow}>
        <View style={styles.statusPill}>
          <View style={styles.dotViolet} />
          <Text style={styles.statusPillText}>
            <Text style={styles.bold}>{metrics.verifiedCount || 0}</Text> Active Verified Openings
          </Text>
        </View>

        <View style={styles.statusPill}>
          <View style={styles.dotPink} />
          <Text style={styles.statusPillText}>
            <Text style={styles.bold}>{metrics.totalCount || 0}</Text> Total Discoverable Roles
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  breadcrumbLink: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  breadcrumbText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    fontWeight: '500',
  },
  breadcrumbActive: {
    color: CLAY_COLORS.primary,
    fontWeight: '700',
  },
  breadcrumbSep: {
    fontSize: 13,
    color: CLAY_COLORS.mutedLight,
  },
  actionPillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  ledgerSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.pill,
    gap: 6,
    ...CLAY_SHADOWS.buttonPrimary,
    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
    cursor: 'pointer',
  },
  ledgerSyncBtnHover: {
    transform: [{ translateY: -2 }],
    ...CLAY_SHADOWS.buttonPrimaryHover,
  },
  ledgerSyncIcon: {
    fontSize: 12,
    color: '#ffffff',
  },
  ledgerSyncText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  multiSyncBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
    marginLeft: 2,
  },
  multiSyncBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  fastTrackAppPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    ...CLAY_SHADOWS.buttonSecondary,
    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
    cursor: 'pointer',
  },
  fastTrackAppPillHover: {
    transform: [{ translateY: -2 }],
    backgroundColor: '#FAF5FF',
    ...CLAY_SHADOWS.buttonSecondaryHover,
  },
  fastTrackIcon: {
    fontSize: 12,
    color: CLAY_COLORS.primary,
  },
  fastTrackText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  statsPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.6)',
    ...CLAY_SHADOWS.pill,
  },
  dotViolet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: CLAY_COLORS.primary,
  },
  dotPink: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: CLAY_COLORS.secondary,
  },
  statusPillText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  bold: {
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
    fontFamily: CLAY_FONTS.heading,
  },
  pressed: {
    opacity: 0.7,
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    ...CLAY_SHADOWS.buttonPressed,
  },
});
