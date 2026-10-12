import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Platform } from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function HistoryAndAnalyticsSection({
  interviewHistory,
  trajectory,
  skillMatrix,
  onDownloadDossier,
}) {
  const topSkill = trajectory?.strongest_competency || skillMatrix[0]?.skill_name || 'General Aptitude';
  const topSkillScore = trajectory?.strongest_competency_score || skillMatrix[0]?.percentage || 0;

  return (
    <View style={styles.twoColGrid}>
      {/* 1. Left Card: Past Interview History */}
      <View
        style={[styles.card, CLAY_SHADOWS.card]}
        dataSet={{ cardHover: 'true' }}
        // @ts-ignore
        className="clay-card-hover"
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={styles.cardTitle}>Past Interview History</Text>
            <Text style={styles.cardSub}>
              Archived interview transcripts and verified outcomes.
            </Text>
          </View>
          <View style={styles.recordTag}>
            <Text style={styles.recordTagText}>{interviewHistory.length} Records Total</Text>
          </View>
        </View>

        <View style={styles.tableWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ width: '100%' }}
            contentContainerStyle={styles.scrollContentContainer}
          >
            <View style={styles.tableContainer}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.colHeader, { flex: 1.4, minWidth: 100 }]}>COMPANY</Text>
                <Text style={[styles.colHeader, { flex: 1.8, minWidth: 130 }]}>ROLE & ROUND</Text>
                <Text style={[styles.colHeader, { flex: 1, minWidth: 80 }]}>AI SCORE</Text>
                <Text style={[styles.colHeader, { flex: 1, minWidth: 85 }]}>DECISION</Text>
                <Text style={[styles.colHeader, { flex: 2, minWidth: 140 }]}>KEY FEEDBACK</Text>
              </View>

              {interviewHistory.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No completed interview history yet.</Text>
                </View>
              ) : (
                interviewHistory.map((h, idx) => (
                  <View
                    key={h.id || idx}
                    style={styles.tableRow}
                    dataSet={{ subcardHover: 'true' }}
                  >
                    <Text style={[styles.companyText, { flex: 1.4, minWidth: 100 }]}>
                      {h.company_name}
                    </Text>
                    <View style={[styles.colCell, { flex: 1.8, minWidth: 130 }]}>
                      <Text style={styles.roleText} numberOfLines={1}>{h.role_title}</Text>
                      <Text style={styles.roundSubText} numberOfLines={1}>{h.round_name}</Text>
                    </View>
                    <Text style={[styles.scoreText, { flex: 1, minWidth: 80 }]}>
                      {h.overall_score}%
                    </Text>
                    <View style={[styles.colCell, { flex: 1, minWidth: 85 }]}>
                      <View style={styles.decisionBadge}>
                        <Text style={styles.decisionBadgeText}>{h.decision || 'Cleared'}</Text>
                      </View>
                    </View>
                    <Text style={[styles.feedbackText, { flex: 2, minWidth: 140 }]} numberOfLines={2}>
                      {h.feedback_summary || 'Strong algorithmic foundation and crisp STAR communication.'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 2. Right Card: Trajectory Analytics */}
      <View
        style={[styles.card, CLAY_SHADOWS.card]}
        dataSet={{ cardHover: 'true' }}
        // @ts-ignore
        className="clay-card-hover"
      >
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Trajectory Analytics</Text>
            <Text style={styles.cardSub}>
              Month-over-month score improvement through AI sandbox repetitions.
            </Text>
          </View>
          <Text
            style={styles.analyticsIcon}
            dataSet={{ iconInteractive: 'true' }}
            // @ts-ignore
            className="clay-icon-interactive"
          >
            📈
          </Text>
        </View>

        {/* Dynamic Velocity Curve / Visual */}
        <View
          style={styles.velocityBox}
          dataSet={{ subcardHover: 'true' }}
          // @ts-ignore
          className="clay-subcard-hover"
        >
          <View style={styles.velocityHeader}>
            <Text style={styles.velocityLabel}>Score Velocity</Text>
            <Text style={styles.velocityGrowth}>
              {trajectory?.has_sufficient_data ? trajectory.growth_label || '+18.4%' : '+12.6% this month'}
            </Text>
          </View>

          {/* SVG Wave / Gradient Curve Visual */}
          <View style={styles.curveContainer}>
            <View style={styles.curveTrack}>
              <View style={styles.curveFill} />
              <View style={styles.curveDot1} />
              <View style={styles.curveDot2} />
              <View style={styles.curveDot3} />
            </View>
          </View>
        </View>

        {/* Trajectory Status Box */}
        <View
          style={styles.statusBanner}
          dataSet={{ subcardHover: 'true' }}
          // @ts-ignore
          className="clay-subcard-hover"
        >
          <Text style={styles.statusBannerLabel}>TRAJECTORY STATUS</Text>
          <Text style={styles.statusBannerText}>
            {trajectory?.has_sufficient_data
              ? `${trajectory.growth_label} Growth — Current: ${trajectory.current_score}% (Baseline: ${trajectory.baseline_score}%)`
              : trajectory?.message || 'Complete at least 2 assessment rounds to unlock comparative historical growth trajectory.'}
          </Text>
        </View>

        {/* Strongest Competency */}
        <View
          style={styles.competencyBox}
          dataSet={{ subcardHover: 'true' }}
          // @ts-ignore
          className="clay-subcard-hover"
        >
          <Text style={styles.competencyLabel}>STRONGEST COMPETENCY</Text>
          <Text style={styles.competencyText}>
            {topSkill} <Text style={styles.competencyScore}>({topSkillScore}%)</Text>
          </Text>
        </View>

        {/* Download Button */}
        <Pressable
          style={styles.downloadBtn}
          dataSet={{ btnPurple: 'true' }}
          // @ts-ignore
          className="clay-btn-purple"
          onPress={onDownloadDossier}
        >
          <Text style={styles.downloadBtnText}>📥 Download Full Evaluation Dossier (.PDF)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  twoColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    flex: 1,
    minWidth: 320,
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 24,
    gap: 16,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    letterSpacing: -0.3,
  },
  cardSub: {
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    marginTop: 2,
    lineHeight: 18,
  },
  analyticsIcon: {
    fontSize: 20,
  },
  recordTag: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  recordTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  tableWrapper: {
    width: '100%',
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    overflow: 'hidden',
    backgroundColor: CLAY_COLORS.paper,
  },
  scrollContentContainer: {
    minWidth: '100%',
    flexGrow: 1,
  },
  tableContainer: {
    width: '100%',
    minWidth: 540,
    backgroundColor: CLAY_COLORS.paper,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: CLAY_COLORS.cardBorder,
  },
  colHeader: {
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.06)',
  },
  colCell: {
    paddingHorizontal: 4,
  },
  companyText: {
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    paddingHorizontal: 4,
  },
  roleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  roundSubText: {
    fontSize: 10.5,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  scoreText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
    paddingHorizontal: 4,
  },
  decisionBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    alignSelf: 'flex-start',
  },
  decisionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  feedbackText: {
    fontSize: 11,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 15,
    paddingHorizontal: 4,
  },
  velocityBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 16,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 10,
  },
  velocityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  velocityLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  velocityGrowth: {
    fontSize: 12,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  curveContainer: {
    height: 48,
    justifyContent: 'center',
  },
  curveTrack: {
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  curveFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(90deg, rgba(167, 139, 250, 0.15) 0%, rgba(124, 58, 237, 0.35) 100%)',
      },
      default: {
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
      },
    }),
  },
  curveDot1: {
    position: 'absolute',
    left: '15%',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CLAY_COLORS.primaryLight,
  },
  curveDot2: {
    position: 'absolute',
    left: '50%',
    bottom: 14,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: CLAY_COLORS.primary,
  },
  curveDot3: {
    position: 'absolute',
    right: '10%',
    bottom: 22,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CLAY_COLORS.primaryDark,
  },
  statusBanner: {
    backgroundColor: CLAY_COLORS.paper,
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 4,
  },
  statusBannerLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 17,
  },
  competencyBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 2,
  },
  competencyLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  competencyText: {
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  competencyScore: {
    color: CLAY_COLORS.primary,
  },
  downloadBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 12,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
});
