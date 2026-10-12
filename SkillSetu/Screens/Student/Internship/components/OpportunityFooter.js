import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS } from './DesignTokens';

export default function OpportunityFooter() {
  return (
    <View style={styles.footerContainer}>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>⚡</Text>
        </View>
        <Text style={styles.brandText}>SkillSetu</Text>
      </View>

      <View style={styles.linksRow}>
        <Text style={styles.linkText}>Privacy Policy</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.linkText}>Terms of Service</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.linkText}>Career Support</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.linkText}>Industry Standards</Text>
      </View>

      <Text style={styles.copyrightText}>
        © 2026 SkillSetu. Empowering campus talent with verified career pathways.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: CLAY_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontSize: 12,
    color: '#ffffff',
  },
  brandText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  linkText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  dot: {
    fontSize: 12,
    color: CLAY_COLORS.mutedLight,
  },
  copyrightText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
  },
});
