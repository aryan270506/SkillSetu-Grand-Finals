import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS } from './DesignTokens';

export default function ResumeFooter() {
  return (
    <View style={styles.footerContainer}>
      <Text style={styles.footerText}>
        SkillSetu Career Intelligence Platform · ATS Compliant Single-Page Standard · Zero Parsing Traps
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
    textAlign: 'center',
  },
});
