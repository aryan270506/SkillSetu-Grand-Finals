import React from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function OpportunityHero({
  user,
  profileData,
  metrics = {},
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const studentName = profileData?.personalInfo?.name || profileData?.personalInfo?.fullName || user?.name || user?.full_name || 'Verified Student';
  const college = profileData?.education?.universityDetected || profileData?.education?.list?.[0]?.university || profileData?.personalInfo?.college || user?.university || 'Campus Verified';
  const readinessPercent = (metrics.avgMatch && metrics.avgMatch > 0) ? metrics.avgMatch : (metrics.readinessScore || 0);

  return (
    <View style={[styles.heroCard, isDesktop ? styles.heroRowLayout : styles.heroColumnLayout]}>
      {/* Left Column: Heading & Dynamic Student Tag */}
      <View style={[styles.heroLeft, isDesktop ? { flex: 6.2 } : {}]}>
        {/* Dynamic Attestation Tag */}
        <View style={styles.attestationBadge}>
          <Text style={styles.attestationIcon}>🎓</Text>
          <Text style={styles.attestationText} numberOfLines={1}>
            {college} • {studentName} × Cryptographically Attested Student Profile
          </Text>
        </View>

        <Text style={styles.heroTitle}>
          Discover Verified Internships &{'\n'}
          <Text style={styles.heroTitleAccent}>Career Roles</Text>
        </Text>

        <Text style={styles.heroSubtitle}>
          Explore curated high-growth engineering internships and full-time opportunities dynamically calibrated against your verified campus skill proofs, ATS scores, and code sandboxes.
        </Text>
      </View>

      {/* Right Column: Opportunity Intelligence & Candidate Readiness Card */}
      <View style={[styles.heroRight, isDesktop ? { flex: 5.8 } : {}]}>
        <View style={styles.readinessCard}>
          {/* Top Row: Readiness Badge & Tier */}
          <View style={styles.readinessTopRow}>
            <View style={styles.readinessIconBox}>
              <Text style={styles.readinessIcon}>🏆</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.readinessLabel}>CANDIDATE READINESS</Text>
              <Text style={styles.readinessScoreText}>
                {readinessPercent > 0 ? `${readinessPercent}%` : 'Dynamic'} <Text style={styles.topTierText}>{readinessPercent >= 80 ? 'Top Tier' : 'In Progress'}</Text>
              </Text>
              <Text style={styles.readinessSubtext}>
                {readinessPercent >= 80 ? 'Eligible for Pre-Screen Waivers' : 'Complete learning items to unlock waivers'}
              </Text>
            </View>
          </View>

          {/* Dynamic 5 Metric Chips */}
          <View style={styles.statsGrid}>
            <View style={[styles.statChip, styles.statChipSlate]}>
              <Text style={[styles.statNum, { color: CLAY_COLORS.foreground }]}>{metrics.totalCount || 0}</Text>
              <Text style={styles.statLabel}>Total Opps</Text>
            </View>

            <View style={[styles.statChip, styles.statChipSuccess]}>
              <Text style={[styles.statNum, { color: CLAY_COLORS.successText }]}>{metrics.readyCount || 0}</Text>
              <Text style={styles.statLabel}>Ready</Text>
            </View>

            <View style={[styles.statChip, styles.statChipAmber]}>
              <Text style={[styles.statNum, { color: CLAY_COLORS.warningText }]}>{metrics.devCount || 0}</Text>
              <Text style={styles.statLabel}>Needs Dev</Text>
            </View>

            <View style={[styles.statChip, styles.statChipViolet]}>
              <Text style={[styles.statNum, { color: CLAY_COLORS.primary }]}>{metrics.verifiedCount || 0}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>

            <View style={[styles.statChip, styles.statChipSky]}>
              <Text style={[styles.statNum, { color: '#0369a1' }]}>{metrics.unverifiedCount || 0}</Text>
              <Text style={styles.statLabel}>Unverified</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    marginBottom: 24,
    gap: 24,
    alignItems: 'center',
    ...CLAY_SHADOWS.card,
    backdropFilter: 'blur(20px)',
  },
  heroRowLayout: {
    flexDirection: 'row',
  },
  heroColumnLayout: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  heroLeft: {
    justifyContent: 'center',
  },
  attestationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
    gap: 6,
    marginBottom: 14,
    maxWidth: '100%',
  },
  attestationIcon: {
    fontSize: 12,
  },
  attestationText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  heroTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 32,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    lineHeight: 38,
    letterSpacing: -0.6,
    marginBottom: 12,
  },
  heroTitleAccent: {
    color: CLAY_COLORS.primary,
  },
  heroSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 14,
    lineHeight: 21,
    color: CLAY_COLORS.muted,
    maxWidth: 580,
  },
  heroRight: {
    width: '100%',
    justifyContent: 'center',
  },
  readinessCard: {
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    ...CLAY_SHADOWS.card,
  },
  readinessTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.08)',
  },
  readinessIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: CLAY_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
  },
  readinessIcon: {
    fontSize: 22,
  },
  readinessLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  readinessScoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 22,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    lineHeight: 26,
  },
  topTierText: {
    fontSize: 18,
    color: CLAY_COLORS.foreground,
    fontWeight: '800',
  },
  readinessSubtext: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    ...CLAY_SHADOWS.pill,
  },
  statChipSlate: {
    backgroundColor: CLAY_COLORS.recessed,
    borderColor: 'rgba(124, 58, 237, 0.08)',
  },
  statChipSuccess: {
    backgroundColor: CLAY_COLORS.successLight,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statChipAmber: {
    backgroundColor: CLAY_COLORS.warningLight,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  statChipViolet: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  statChipSky: {
    backgroundColor: CLAY_COLORS.skyLight,
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  statNum: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9.5,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    textAlign: 'center',
  },
});
