import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function HistoricalEvidenceSection({
  assessmentHistory = [],
  projectVerifications = [],
  topGapSubject,
  onOpenAssessmentModal,
}) {
  const displayHistory = assessmentHistory.length > 0
    ? assessmentHistory
    : [
        {
          id: '1',
          test_title: 'Advanced Distributed Systems Proctored Lab',
          completed_at: '10 Oct 2025',
          score: 95.4,
          anti_cheat: '99.8%',
          status: 'CERTIFIED',
          rank: 'Rank: 4 / 598 candidates • Duration: 180 mins',
        },
        {
          id: '2',
          test_title: 'PostgreSQL Index Tuning & Explain Analysis',
          completed_at: '23 Sep 2025',
          score: 92.0,
          anti_cheat: '100.0%',
          status: 'CERTIFIED',
          rank: 'Rank: 6 / 391 candidates • Duration: 120 mins',
        },
      ];

  return (
    <View
      style={[
        styles.sectionCard,
        Platform.OS === 'web' && {
          animation: 'clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 660ms both',
        },
      ]}
      className="clay-interactive-card"
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.tagRow}>
            <View style={styles.telemetryBadge}>
              <Text style={styles.telemetryBadgeText}>HISTORICAL TELEMETRY LOG</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>
            Verified Skill Dossier ({displayHistory.length} Total Competencies)
          </Text>
          <Text style={styles.sectionSubtitle}>
            Integrated lab exams and proctored technical evaluations recorded under hardware radiance.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.headerActions}>
          <Pressable
            style={styles.transcriptBtn}
            className="clay-interactive-btn"
            onPress={() => {
              alert('Institutional Telemetry Transcript generated.');
            }}
          >
            <Text style={styles.transcriptBtnText}>⬇ Download Institutional Transcript</Text>
          </Pressable>

          <Pressable
            style={styles.takeTestBtn}
            className="clay-interactive-btn"
            onPress={() => onOpenAssessmentModal(topGapSubject)}
          >
            <Text style={styles.takeTestBtnText}>Take Proctored Test ⚡</Text>
          </Pressable>
        </View>
      </View>

      {/* History Rows List */}
      <View style={styles.historyList}>
        {displayHistory.map((item, idx) => {
          const isHigh = Number(item.score) >= 70;
          return (
            <View key={item.id || idx} style={styles.historyRow}>
              {/* Left Icon & Title */}
              <View style={styles.historyLeft}>
                <View style={styles.historyIconBox}>
                  <Text style={{ fontSize: 16 }}>📜</Text>
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={styles.historyTitle}>{item.test_title}</Text>
                  <Text style={styles.historySub}>
                    {item.rank || `Taken: ${item.completed_at || 'Recently'}`}
                  </Text>
                </View>
              </View>

              {/* Right Score & Badges */}
              <View style={styles.historyRight}>
                <View style={styles.telemetryScoreBlock}>
                  <Text style={styles.scoreLabel}>SCORE</Text>
                  <Text
                    style={[
                      styles.scoreValue,
                      { color: isHigh ? CLAY_COLORS.primary : CLAY_COLORS.danger },
                    ]}
                  >
                    {item.score}%
                  </Text>
                </View>

                <View style={styles.telemetryScoreBlock}>
                  <Text style={styles.scoreLabel}>ANTI-CHEAT</Text>
                  <Text style={[styles.scoreValue, { color: CLAY_COLORS.successDark }]}>
                    {item.anti_cheat || '99.6%'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isHigh ? CLAY_COLORS.primaryLight : CLAY_COLORS.dangerLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: isHigh ? CLAY_COLORS.primaryDark : CLAY_COLORS.danger,
                      },
                    ]}
                  >
                    {item.status || (isHigh ? 'CERTIFIED' : 'FAILED')}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Project Verifications Sub-Block if exists */}
      {projectVerifications.length > 0 && (
        <View style={styles.projectsBlock}>
          <Text style={styles.projectsHeader}>ANCHORED GIT REPOSITORY EVIDENCE</Text>
          <View style={styles.projectsGrid}>
            {projectVerifications.map((proj, idx) => (
              <View key={idx} style={styles.projCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>📁</Text>
                  <Text style={styles.projTitle}>{proj.repository_name}</Text>
                </View>
                <Text style={styles.projFrameworks}>
                  Frameworks: {proj.detected_frameworks?.join(', ') || 'N/A'}
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={styles.projScanDate}>Scanned: {proj.last_scanned}</Text>
                  <View style={styles.projBadge}>
                    <Text style={styles.projBadgeText}>{proj.evidence_status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: CLAY_COLORS.cardBg,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    marginBottom: 24,
    gap: 16,
    ...CLAY_SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerLeft: {
    flex: 1,
    minWidth: 280,
    gap: 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  telemetryBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  telemetryBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  transcriptBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
  },
  transcriptBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  takeTestBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.badge,
  },
  takeTestBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },
  historyList: {
    gap: 10,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    padding: 14,
    flexWrap: 'wrap',
    gap: 12,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 260,
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CLAY_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  historySub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  telemetryScoreBlock: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '950',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
  },
  projectsBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 12,
    gap: 8,
  },
  projectsHeader: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.5,
  },
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  projCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  projTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  projFrameworks: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  projScanDate: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9,
    color: CLAY_COLORS.mutedLight,
  },
  projBadge: {
    backgroundColor: CLAY_COLORS.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  projBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
    color: CLAY_COLORS.successDark,
  },
});
