import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function AcademicCredentialsCard({
  education = {},
  user = {},
}) {
  const eduItem = (education?.list && education.list[0]) || {};
  const degree = eduItem.degree || user?.degree || 'B.Tech in Computer Science & Engineering';
  const university = eduItem.university || user?.university || 'Indian Institute of Technology (IIT Delhi Node)';
  const cgpa = eduItem.cgpa || user?.cgpa_or_percentage || '9.32 / 10.0';
  const rank = 'Rank: 2 / 180 in batch';
  const batch = (user?.start_year && user?.graduation_year)
    ? `Batch: ${user.start_year} – ${user.graduation_year}`
    : 'Batch: 2021 – 2025';

  return (
    <View style={[styles.cardContainer, Platform.OS === 'web' && { className: 'clay-section-revealed clay-hover-lift' }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>ACADEMIC CREDENTIALS</Text>
        <View style={styles.nsqfBadge}>
          <Text style={styles.nsqfBadgeText}>NSQF Level 6</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>Academic Credentials</Text>

      {/* Main University / Degree Block */}
      <View style={styles.univBlock}>
        <View style={styles.degreeRow}>
          <View style={styles.eduIconWrap}>
            <Text style={styles.eduIconText}>🎓</Text>
          </View>
          <View style={styles.degreeWrap}>
            <Text style={styles.degreeTitle}>{degree}</Text>
            <Text style={styles.univName}>{university}</Text>
          </View>
        </View>

        {/* CGPA & Rank Pill Row */}
        <View style={styles.academicMetaRow}>
          <View style={styles.cgpaPill}>
            <Text style={styles.cgpaText}>CGPA: <Text style={styles.cgpaBold}>{cgpa}</Text></Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{rank}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{batch}</Text>
          </View>
        </View>

        {/* Cryptographic Hash Tag */}
        <View style={styles.cryptoHashRow}>
          <Text style={styles.cryptoIcon}>🛡️</Text>
          <Text style={styles.cryptoLabel}>Official B.Tech Transcript Cryptographic Hash:</Text>
          <Text style={styles.cryptoHashText}>0x89f...4a2b</Text>
        </View>
      </View>

      {/* Coursework Highlights */}
      <View style={styles.courseworkBlock}>
        <Text style={styles.sectionSublabel}>Coursework Highlights</Text>
        <View style={styles.chipsRow}>
          <View style={styles.courseChip}>
            <Text style={styles.courseChipText}>Advanced Distributed OS</Text>
          </View>
          <View style={styles.courseChip}>
            <Text style={styles.courseChipText}>Algorithmic Graph Theory</Text>
          </View>
          <View style={styles.courseChip}>
            <Text style={styles.courseChipText}>Database Kernel Design</Text>
          </View>
        </View>
      </View>

      {/* Verification Badges */}
      <View style={styles.verificationList}>
        <View style={styles.verifyItem}>
          <View style={styles.verifyIconWrap}>
            <Text style={styles.verifyIcon}>🛡️</Text>
          </View>
          <View style={styles.verifyTextWrap}>
            <Text style={styles.verifyTitle}>SkillSets 99.4% Anti-Cheat Proctored</Text>
            <Text style={styles.verifySubtitle}>Biometric, Keystroke & Sandbox Verified DSA Test</Text>
          </View>
        </View>

        <View style={styles.verifyItem}>
          <View style={styles.verifyIconWrap}>
            <Text style={styles.verifyIcon}>🐳</Text>
          </View>
          <View style={styles.verifyTextWrap}>
            <Text style={styles.verifyTitle}>Docker Sandbox Gold Badge</Text>
            <Text style={styles.verifySubtitle}>Issued by NCVET Cloud-Native SIG • Level 6 Verified</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    marginBottom: 24,
    ...CLAY_SHADOWS.card,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  nsqfBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  nsqfBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  cardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 17,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
  },
  univBlock: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 14,
    gap: 10,
  },
  degreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  eduIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eduIconText: {
    fontSize: 16,
  },
  degreeWrap: {
    flex: 1,
  },
  degreeTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  univName: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    marginTop: 1,
  },
  academicMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cgpaPill: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  cgpaText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  cgpaBold: {
    color: CLAY_COLORS.primaryDark,
    fontWeight: '900',
  },
  metaPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  metaPillText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  cryptoHashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.06)',
  },
  cryptoIcon: {
    fontSize: 11,
  },
  cryptoLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
  },
  cryptoHashText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  courseworkBlock: {
    gap: 6,
  },
  sectionSublabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  courseChip: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  courseChipText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.foreground,
    fontWeight: '600',
  },
  verificationList: {
    gap: 8,
  },
  verifyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: CLAY_RADII.cardSmall,
    padding: 10,
  },
  verifyIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyIcon: {
    fontSize: 13,
  },
  verifyTextWrap: {
    flex: 1,
  },
  verifyTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  verifySubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10.5,
    color: CLAY_COLORS.muted,
  },
});
