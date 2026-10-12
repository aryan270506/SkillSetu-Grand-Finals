import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';
import AssessmentRoundCard from './AssessmentRoundCard';

export default function AssessmentRoundsSection({
  applications,
  isLoading,
  practicingAppId,
  launchingAppId,
  onStartPractice,
  onStartOfficial,
  onOpenDetails,
}) {
  return (
    <View style={styles.sectionContainer}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={styles.sectionTitle}>Internship Assessment Rounds</Text>
          <Text style={styles.sectionSub}>
            Each applied internship has its own assessment pipeline, round status, and dedicated practice sandbox.
          </Text>
        </View>
        <View style={styles.pillBadge}>
          <Text style={styles.pillBadgeText}>
            {applications.length} {applications.length === 1 ? 'Internship Active' : 'Internships Active'}
          </Text>
        </View>
      </View>

      {/* Content Area */}
      {isLoading ? (
        <View style={[styles.loadingBox, CLAY_SHADOWS.card]}>
          <ActivityIndicator size="large" color={CLAY_COLORS.primary} />
          <Text style={styles.loadingText}>Loading your internship assessment pipelines...</Text>
        </View>
      ) : applications.length === 0 ? (
        <View style={[styles.emptyBox, CLAY_SHADOWS.card]}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>🎯</Text>
          </View>
          <Text style={styles.emptyTitle}>No Assessment Pipelines Configured Yet</Text>
          <Text style={styles.emptySub}>
            Only internships with active assessment rounds configured by recruiters appear here. Applications without assessment pipelines can be tracked in the Applications tab.
          </Text>
        </View>
      ) : (
        <View style={styles.cardsGrid}>
          {applications.map((app) => (
            <AssessmentRoundCard
              key={app.application_id}
              app={app}
              practicingAppId={practicingAppId}
              launchingAppId={launchingAppId}
              onStartPractice={onStartPractice}
              onStartOfficial={onStartOfficial}
              onOpenDetails={onOpenDetails}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: -0.4,
  },
  sectionSub: {
    fontSize: 13,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    marginTop: 2,
  },
  pillBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  loadingBox: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 36,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  emptyBox: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CLAY_COLORS.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyIcon: {
    fontSize: 22,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  emptySub: {
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    textAlign: 'center',
    maxWidth: 480,
    lineHeight: 18,
  },
});
