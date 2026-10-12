import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayCard,
  ClayProgressBar,
  useAnimatedNumber,
} from './DashboardDesignTokens';

export default function DashboardHero({
  displayName = 'Student',
  profileCompletion = 80,
  onNavigateToProfile,
  isTablet = true,
  isWide = true,
}) {
  const animatedCompletion = useAnimatedNumber(profileCompletion, 900);

  return (
    <View style={styles.heroWrapper} className="dashboard-section-reveal">
      {/* Decorative subtle ambient blob in the background */}
      <View style={styles.ambientBlob} pointerEvents="none" />

      <View style={[styles.heroRow, !isTablet && styles.heroRowMobile]}>
        {/* Left Column: Welcome Banner & Intelligence Subtitle */}
        <View style={styles.welcomeColumn}>
          <View style={styles.preTitleRow}>
            <ClayBadge
              label="CAREER COMMAND CENTER"
              icon="⚡"
              variant="primary"
              size="small"
            />
            <ClayBadge
              label="AI REAL-TIME INTELLIGENCE"
              icon="🎯"
              variant="emerald"
              size="small"
            />
          </View>

          <Text style={styles.welcomeTitle}>
            WELCOME BACK, {displayName.toUpperCase()} 👋
          </Text>

          <Text style={styles.welcomeSubtitle}>
            Your personalized career command center. Track your skill readiness, discover matched opportunities, close skill gaps, and prepare for your next career milestone.
          </Text>
        </View>

        {/* Right Column: Profile Readiness & Completion Card */}
        <ClayCard
          style={styles.profileCompletionCard}
          onPress={onNavigateToProfile}
          hoverTranslate={-3}
          hoverScale={1.02}
          interactive={true}
        >
          <View style={styles.completionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>👤</Text>
              <Text style={styles.completionTitle}>PROFILE COMPLETION</Text>
            </View>
            <Text style={styles.completionPercentage}>{animatedCompletion}%</Text>
          </View>

          <View style={{ marginVertical: 8 }}>
            <ClayProgressBar
              progress={profileCompletion}
              color={profileCompletion >= 80 ? CLAY_COLORS.emerald : CLAY_COLORS.primary}
              height={7}
              borderRadius={4}
              showGlow={true}
            />
          </View>

          <View style={styles.completionFooterRow}>
            <Text style={styles.completionHint}>
              {profileCompletion >= 80 ? 'Verified profile strength' : 'Enhance profile to boost matches'}
            </Text>
            <Text style={styles.completionLink}>Edit Profile →</Text>
          </View>
        </ClayCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrapper: {
    position: 'relative',
    marginBottom: 24,
    borderRadius: CLAY_RADII.hero,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 24,
    ...CLAY_SHADOWS.card,
    overflow: 'hidden',
  },
  ambientBlob: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    zIndex: 0,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    zIndex: 1,
  },
  heroRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  welcomeColumn: {
    flex: 1,
    minWidth: 280,
  },
  preTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 26,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  welcomeSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 14,
    color: CLAY_COLORS.muted,
    marginTop: 8,
    lineHeight: 21,
    maxWidth: 620,
  },
  profileCompletionCard: {
    width: '100%',
    maxWidth: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    ...CLAY_SHADOWS.card,
  },
  completionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.8,
  },
  completionPercentage: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  completionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  completionHint: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  completionLink: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
