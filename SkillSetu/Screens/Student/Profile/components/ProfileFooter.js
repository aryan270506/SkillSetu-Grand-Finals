import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII } from './DesignTokens';

export default function ProfileFooter() {
  return (
    <View style={styles.footerContainer}>
      {/* Upper Row */}
      <View style={styles.upperRow}>
        {/* Left: Brand + Framework Tag */}
        <View style={styles.brandCol}>
          <View style={styles.brandTitleRow}>
            <View style={styles.brandHex}>
              <Text style={styles.brandHexIcon}>✦</Text>
            </View>
            <Text style={styles.brandTitle}>SkillSetu</Text>
            <View style={styles.frameworkBadge}>
              <Text style={styles.frameworkBadgeText}>National Skill Framework</Text>
            </View>
          </View>
          <Text style={styles.brandSubtitle}>
            Empowering students through verified credentials, guided industry pathways, and AI-driven readiness benchmarks.
          </Text>
        </View>

        {/* Right: Footer Links */}
        <View style={styles.linksRow}>
          <Text style={styles.footerLink}>Accreditations & Partners</Text>
          <Text style={styles.footerLink}>Student Charter</Text>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerLink}>Help Desk</Text>
        </View>
      </View>

      {/* Bottom Legal Row */}
      <View style={styles.bottomRow}>
        <Text style={styles.copyrightText}>
          © 2026 SkillSetu Higher Education Readiness Portal. All rights reserved.
        </Text>
        <View style={styles.nsdcRow}>
          <Text style={styles.nsdcDot}>●</Text>
          <Text style={styles.nsdcText}>NSDC & Skill India Aligned Platform</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    paddingVertical: 26,
    marginTop: 20,
    borderTopWidth: 1.5,
    borderTopColor: CLAY_COLORS.cardBorder,
    gap: 16,
  },
  upperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 20,
  },
  brandCol: {
    flex: 1,
    minWidth: 280,
    gap: 6,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  brandHex: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: CLAY_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandHexIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  brandTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 17,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
  },
  frameworkBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  frameworkBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  brandSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
    maxWidth: 520,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  footerLink: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.06)',
  },
  copyrightText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.mutedLight,
  },
  nsdcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nsdcDot: {
    fontSize: 8,
    color: CLAY_COLORS.primary,
  },
  nsdcText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
});
