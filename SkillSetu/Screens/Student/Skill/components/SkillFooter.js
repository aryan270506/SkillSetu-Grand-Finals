import React from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII } from './DesignTokens';

export default function SkillFooter() {
  return (
    <View style={styles.footerContainer}>
      <View style={styles.leftMeta}>
        <Text style={styles.brandText}>
          <Text style={{ fontWeight: '900', color: CLAY_COLORS.primary }}>SkillSetu</Text> • NSQF-Level 6 Aligned Higher Education Readiness Platform
        </Text>
      </View>

      <View style={styles.rightLinks}>
        <Pressable onPress={() => {}}>
          <Text style={styles.linkText}>Recruiter Policy</Text>
        </Pressable>
        <Text style={styles.dotSeparator}>•</Text>
        <Pressable onPress={() => {}}>
          <Text style={styles.linkText}>Assessment Framework</Text>
        </Pressable>
        <Text style={styles.dotSeparator}>•</Text>
        <Pressable onPress={() => {}}>
          <Text style={styles.linkText}>Support Desk</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 18,
    marginTop: 8,
    paddingBottom: 40,
  },
  leftMeta: {
    flex: 1,
    minWidth: 260,
  },
  brandText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  rightLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  linkText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  dotSeparator: {
    fontSize: 10,
    color: CLAY_COLORS.mutedLight,
  },
});
