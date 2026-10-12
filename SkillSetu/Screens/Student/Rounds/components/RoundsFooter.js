import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function RoundsFooter({ onAskAiMentor }) {
  return (
    <View style={styles.footerContainer}>
      <View style={styles.contentRow}>
        {/* Left Brand Info */}
        <View style={styles.leftGroup}>
          <View style={styles.logoRow}>
            <View
              style={styles.logoHex}
              // @ts-ignore
              className="clay-icon-interactive"
              dataSet={{ iconInteractive: 'true' }}
            >
              <Text style={styles.logoIcon}>✦</Text>
            </View>
            <Text style={styles.logoText}>SkillSetu</Text>
          </View>
          <Text style={styles.copyrightText}>
            © 2026 SkillSetu. Empowering next-generation engineers.
          </Text>
        </View>

        {/* Center Links */}
        <View style={styles.linksRow}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerLink}>Career Support</Text>
          <Text style={styles.footerLink}>Industry Standards</Text>
        </View>



      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    paddingVertical: 20,
    marginTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: CLAY_COLORS.cardBorder,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoHex: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: CLAY_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  logoText: {
    fontSize: 15,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  copyrightText: {
    fontSize: 11.5,
    color: CLAY_COLORS.mutedLight,
    fontFamily: CLAY_FONTS.body,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
  },
  footerLink: {
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
    fontFamily: CLAY_FONTS.body,
  },
  askAiBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  askAiBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
});
