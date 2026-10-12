import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS } from './LearningDesignTokens';

export default function LearningFooter() {
  return (
    <View style={styles.footerSection}>
      <Text style={styles.footerBrand}>
        SkillSetu © 2026 Powered by Autonomous Platforms
      </Text>
      <View style={styles.footerLinksRow}>
        <Text style={styles.footerLink}>Privacy Policy</Text>
        <Text style={styles.footerDivider}>•</Text>
        <Text style={styles.footerLink}>Terms of Service</Text>
        <Text style={styles.footerDivider}>•</Text>
        <Text style={styles.footerLink}>Support Center</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerSection: {
    paddingVertical: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: CLAY_COLORS.cardBorder,
    marginTop: 20,
    marginBottom: 40,
  },
  footerBrand: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    marginBottom: 6,
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
  },
  footerDivider: {
    fontSize: 10,
    color: CLAY_COLORS.cardBorder,
  },
});
