import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, ClayButton, ClayCard } from './DesignTokens';

export default function SkillGapEngineSection({
  topMarketGaps = [],
  skillGapsList = [],
  activeCareerName,
  selectedGapSkillName,
  onSelectSkillGap,
  onOpenAssessmentModal,
}) {
  // Combine gaps from intel and market skills
  const gaps = topMarketGaps.length > 0
    ? topMarketGaps.slice(0, 2)
    : skillGapsList.length > 0
      ? skillGapsList.slice(0, 2).map((g) => ({
          skill: g.skill_name,
          student_level: g.current_score || 0,
          importance: g.priority || (g.gap > 20 ? 'CORE' : 'SECONDARY'),
          gap: g.gap || 15,
        }))
      : [
          {
            skill: 'OpenTelemetry & Distributed Tracing (Jaeger / Prometheus)',
            student_level: 68,
            importance: 'CORE',
            gap: 17,
          },
          {
            skill: 'Kafka Partition Rebalance & Consumer Groups',
            student_level: 72,
            importance: 'SECONDARY',
            gap: 13,
          },
        ];

  return (
    <View
      style={[
        styles.sectionContainer,
        Platform.OS === 'web' && {
          animation: 'clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 300ms both',
        },
      ]}
    >
      {/* Alert Header Banner */}
      <View style={styles.alertBanner} className="clay-interactive-card">
        <View style={styles.alertLeft}>
          <View style={styles.alertIconBox}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>
              {gaps.length} High-Priority Skill Gaps detected for {activeCareerName || 'Target Role'} (-6.2% aggregate deficit)
            </Text>
            <Text style={styles.alertSubtitle}>
              Targeted closure will lift estimated candidate compensation band by 18–24% in campus placement pool.
            </Text>
          </View>
        </View>

        <ClayButton
          testID="skill-auto-schedule-btn"
          style={styles.autoScheduleBtn}
          className="clay-interactive-btn"
          onPress={() => {
            const firstGap = gaps[0]?.skill;
            if (firstGap && onOpenAssessmentModal) {
              onOpenAssessmentModal(firstGap);
            }
          }}
        >
          <Text style={styles.autoScheduleBtnText}>Auto-Schedule Practice Sessions</Text>
        </ClayButton>
      </View>

      {/* Gap Cards Grid */}
      <View style={styles.gapsGrid}>
        {gaps.map((gapItem, idx) => {
          const isHigh = gapItem.importance === 'CORE' || idx === 0;
          const isSelected = selectedGapSkillName && selectedGapSkillName.toLowerCase() === gapItem.skill.toLowerCase();

          return (
            <ClayCard
              key={idx}
              hoverTranslate={-4}
              hoverScale={1.01}
              style={[
                styles.gapCard,
                isSelected && styles.gapCardSelected,
              ]}
              className="clay-interactive-card"
            >
              {/* Top Row */}
              <View style={styles.gapCardTop}>
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: isHigh ? CLAY_COLORS.primaryLight : CLAY_COLORS.skyLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityBadgeText,
                      {
                        color: isHigh ? CLAY_COLORS.primary : CLAY_COLORS.skyDark,
                      },
                    ]}
                  >
                    {isHigh ? '★ HIGH PRIORITY GAP' : '⚡ MEDIUM PRIORITY GAP'}
                  </Text>
                </View>

                <View style={styles.deficitPill}>
                  <Text style={styles.deficitPillText}>-{gapItem.gap || (20 - idx * 5)}% Deficit</Text>
                </View>
              </View>

              {/* Title & Description */}
              <Text style={styles.gapSkillName}>{gapItem.skill}</Text>
              <Text style={styles.gapDesc}>
                {idx === 0
                  ? 'Root-cause isolation across async gRPC microservices and production tracing pipelines.'
                  : 'Failover post-yield handling in high-load distributed event streams and queue starvation recovery.'}
              </Text>

              {/* Lab Track Info */}
              <View style={styles.labInfoRow}>
                <Text style={styles.labInfoText}>
                  {idx === 0
                    ? '🔬 Lab 04: Instrumenting gRPC Interceptors • 1.5 hrs'
                    : '⚡ Track: High-Volume Event Sourcing • 2.0 hrs'}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.gapActionRow}>
                <Text style={styles.statusSubText}>
                  Verification: Proctored Lab Sandboxing
                </Text>

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <ClayButton
                    style={[
                      styles.focusBtn,
                      isSelected && { backgroundColor: CLAY_COLORS.primary },
                    ]}
                    className="clay-interactive-btn"
                    onPress={() => onSelectSkillGap(gapItem.skill)}
                  >
                    <Text
                      style={[
                        styles.focusBtnText,
                        isSelected && { color: CLAY_COLORS.paper },
                      ]}
                    >
                      {isSelected ? 'Active Focus ✓' : 'Focus Gap'}
                    </Text>
                  </ClayButton>

                  <ClayButton
                    testID={`skill-launch-lab-${idx}`}
                    style={styles.launchLabBtn}
                    className="clay-interactive-btn"
                    onPress={() => onOpenAssessmentModal(gapItem.skill)}
                  >
                    <Text style={styles.launchLabBtnText}>
                      {idx === 0 ? 'Launch Sandbox Lab ➔' : 'Start Interactive Drill ➔'}
                    </Text>
                  </ClayButton>
                </View>
              </View>
            </ClayCard>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 24,
    gap: 14,
  },
  alertBanner: {
    backgroundColor: '#FAF5FF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    ...CLAY_SHADOWS.card,
  },
  alertLeft: {
    flex: 1,
    minWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CLAY_COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '900',
    color: CLAY_COLORS.primaryDark,
  },
  alertSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  autoScheduleBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.badge,
  },
  autoScheduleBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },
  gapsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  gapCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: CLAY_COLORS.cardBg,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 18,
    gap: 10,
    ...CLAY_SHADOWS.card,
  },
  gapCardSelected: {
    borderColor: CLAY_COLORS.primary,
    backgroundColor: '#FAF7FD',
  },
  gapCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  priorityBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  deficitPill: {
    backgroundColor: CLAY_COLORS.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  deficitPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.danger,
  },
  gapSkillName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  gapDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
  },
  labInfoRow: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  labInfoText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  gapActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 10,
  },
  statusSubText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.mutedLight,
  },
  focusBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.button,
  },
  focusBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  launchLabBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.button,
  },
  launchLabBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },
});
