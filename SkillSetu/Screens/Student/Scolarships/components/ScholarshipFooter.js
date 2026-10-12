import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
} from './ScholarshipDesignTokens';

export default function ScholarshipFooter() {
  return (
    <View style={styles.footerContainer}>
      <View style={styles.footerTopRow}>
        <View style={styles.provenanceBadge}>
          <Text style={styles.provenanceDot}>●</Text>
          <Text style={styles.provenanceText}>
            Verified Institutional Data Stream • National Scholarship Portal (NSP) & AICTE
          </Text>
        </View>
      </View>

      <View style={styles.footerBottomRow}>
        <Text style={styles.footerCopyright}>
          © 2026 SkillSetu Career Intelligence Platform. All scholarship opportunities evaluated deterministically.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    marginTop: 20,
    gap: 12,
  },
  footerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  provenanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.04)',
    borderColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.full,
    gap: 6,
  },
  provenanceDot: {
    color: CLAY_COLORS.emeraldText,
    fontSize: 10,
  },
  provenanceText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  footerBottomRow: {
    alignItems: 'center',
  },
  footerCopyright: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
  },
});
