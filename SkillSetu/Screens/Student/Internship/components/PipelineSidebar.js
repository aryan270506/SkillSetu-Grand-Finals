import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function PipelineSidebar({
  applications = [],
  user,
  profileData,
  featuredJobs = [],
  onOpenPlan,
  onNavigate,
}) {
  const studentName = profileData?.personalInfo?.name || profileData?.personalInfo?.fullName || user?.name || user?.full_name || 'Student';
  const firstName = studentName.split(' ')[0] || 'Your';
  const college = profileData?.education?.universityDetected || profileData?.education?.list?.[0]?.university || profileData?.personalInfo?.college || user?.university || 'Campus';

  const activeAppsCount = applications.length;

  return (
    <View style={styles.sidebarContainer}>
      {/* 1. Student's Pipeline Bento Card */}
      <View style={styles.pipelineCard}>
        <View style={styles.pipelineHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.pipelineIcon}>📈</Text>
            <Text style={styles.pipelineTitle}>{firstName}'s Pipeline</Text>
          </View>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>{activeAppsCount} Active</Text>
          </View>
        </View>

        {/* 2 Stat Tiles */}
        <View style={styles.statTilesRow}>
          <View style={styles.statTile}>
            <Text style={styles.statTileLabel}>Applied & Fast-Tracked</Text>
            <Text style={styles.statTileNum}>{activeAppsCount || 0} Roles</Text>
            <Text style={styles.statTileSub} numberOfLines={1}>
              {applications.length > 0 
                ? applications.slice(0, 2).map(a => a.company || a.internship?.company || 'Verified').join(', ')
                : 'Direct Campus Partners'}
            </Text>
          </View>

          <View style={styles.statTile}>
            <Text style={styles.statTileLabel}>Fast-Track Status</Text>
            <Text style={[styles.statTileNum, { color: CLAY_COLORS.primary }]}>Active</Text>
            <Text style={styles.statTileSub}>Cryptographic Ledger</Text>
          </View>
        </View>

        {/* Dynamic Applications List / Timeline */}
        {applications.length > 0 ? (
          <View style={styles.pipelineList}>
            {applications.slice(0, 4).map((app, idx) => {
              const comp = app.internship?.company || app.company || 'Partner';
              const title = app.internship?.title || app.title || 'Internship Application';
              const status = app.status || 'SUBMITTED';
              return (
                <View key={idx} style={styles.pipelineItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pipelineItemRole} numberOfLines={1}>{title}</Text>
                    <Text style={styles.pipelineItemCompany}>{comp}</Text>
                  </View>
                  <View style={styles.pipelineStatusBadge}>
                    <Text style={styles.pipelineStatusText}>{status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.pipelineList}>
            <View style={styles.pipelineItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pipelineItemRole}>No active applications yet</Text>
                <Text style={styles.pipelineItemCompany}>Apply to ready roles to start your pipeline</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 2. Verified Advantage Bento Card */}
      <View style={styles.advantageCard}>
        <View style={styles.advantageHeader}>
          <Text style={styles.advantageIcon}>🛡️</Text>
          <Text style={styles.advantageTitle}>Verified Advantage</Text>
        </View>

        <Text style={styles.advantageSubtext}>
          Why {firstName}'s verified profile triggers direct fast-tracks across recruiters:
        </Text>

        <View style={styles.advantageList}>
          <View style={styles.advantageItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.advantageItemText}>
              <Text style={styles.bold}>{college} Student Ledger:</Text> Academic records and skill credentials verified.
            </Text>
          </View>

          <View style={styles.advantageItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.advantageItemText}>
              <Text style={styles.bold}>Anti-Cheat Proctoring:</Text> Verified benchmark score telemetry backed by skill evidence.
            </Text>
          </View>

          <View style={styles.advantageItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.advantageItemText}>
              <Text style={styles.bold}>Public Proof Hash:</Text> Embedded directly into company recruiting ATS dashboards.
            </Text>
          </View>
        </View>

        <View style={styles.hashBox}>
          <Text style={styles.hashText}>Proof: 0x71e98d...fbc49201a021</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebarContainer: {
    gap: 20,
  },
  pipelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    ...CLAY_SHADOWS.card,
  },
  pipelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pipelineIcon: {
    fontSize: 16,
  },
  pipelineTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  activePill: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  activePillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  statTilesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statTile: {
    flex: 1,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
  },
  statTileLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
  },
  statTileNum: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    marginVertical: 2,
  },
  statTileSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9.5,
    color: CLAY_COLORS.mutedLight,
  },
  nextStepBox: {
    backgroundColor: '#FAF8FE',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.14)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  nextStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nextStepLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9.5,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  nextStepTimingPill: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nextStepTimingText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  nextStepTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 2,
  },
  nextStepMeta: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10.5,
    color: CLAY_COLORS.muted,
  },
  pipelineList: {
    gap: 8,
  },
  pipelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.06)',
  },
  pipelineItemRole: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  pipelineItemCompany: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  pipelineStatusBadge: {
    backgroundColor: CLAY_COLORS.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pipelineStatusText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.successText,
  },
  passedText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.successText,
  },
  scoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  advantageCard: {
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    ...CLAY_SHADOWS.card,
  },
  advantageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  advantageIcon: {
    fontSize: 16,
  },
  advantageTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14.5,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  advantageSubtext: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
    marginBottom: 10,
  },
  advantageList: {
    gap: 8,
    marginBottom: 12,
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkIcon: {
    fontSize: 12,
    color: CLAY_COLORS.primary,
    fontWeight: 'bold',
    marginTop: 1,
  },
  advantageItemText: {
    flex: 1,
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.foreground,
    lineHeight: 16,
  },
  bold: {
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  hashBox: {
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  hashText: {
    fontFamily: Platform.select({ web: 'monospace', default: 'System' }),
    fontSize: 10,
    color: CLAY_COLORS.primary,
    fontWeight: '700',
  },
  drillCard: {
    backgroundColor: '#ffffff',
    borderRadius: CLAY_RADII.cardMedium,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(230, 225, 242, 0.85)',
    ...CLAY_SHADOWS.card,
  },
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  drillIcon: {
    fontSize: 16,
  },
  drillTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14.5,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  boostPill: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  boostPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  drillSubtext: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
    marginBottom: 10,
  },
  labCard: {
    backgroundColor: '#FAF8FE',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  labTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    flex: 1,
  },
  interactiveLabBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  interactiveLabBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  labMeta: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  resumeDrillBtn: {
    backgroundColor: CLAY_COLORS.primary,
    borderRadius: CLAY_RADII.button,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
    cursor: 'pointer',
  },
  resumeDrillBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  btnPressed: {
    transform: [{ scale: 0.92 }],
    ...CLAY_SHADOWS.buttonPressed,
  },
});
