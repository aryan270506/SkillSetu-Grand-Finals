import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
  useAnimatedNumber,
} from './DashboardDesignTokens';
import { formatCareerTitle } from '../../services/profileService';

export default function PipelineAndReadinessSection({
  totalAppsCount,
  reviewAppsCount,
  interviewAppsCount,
  selectedAppsCount,
  careerReadinessData,
  backendGapData,
  activeTargetCareer,
  onNavigate,
  isTablet,
}) {
  const readinessScore =
    careerReadinessData?.score ??
    backendGapData?.readiness_score ??
    0;

  const animatedReadiness = useAnimatedNumber(readinessScore, 800);

  const renderTimelineNode = (number, label, icon) => {
    const isZero = number === '0' || number === 0;

    return (
      <View style={styles.timelineNode}>
        <View style={[styles.timelineNodeCircle, isZero ? styles.nodeInactive : styles.nodeActive]}>
          <Text style={[styles.timelineNodeNumber, isZero ? styles.numInactive : styles.numActive]}>
            {number}
          </Text>
        </View>
        <Text style={styles.timelineNodeLabel}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.twoColRow, !isTablet && styles.twoColRowMobile]} className="dashboard-section-reveal">
      {/* 1. Application Pipeline Card */}
      <ClayCard
        style={styles.pipelineCard}
        hoverTranslate={-4}
        hoverScale={1.015}
        interactive={true}
        onPress={() => onNavigate && onNavigate('Applications')}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>📊</Text>
            <Text style={styles.cardTitle}>Application Pipeline</Text>
          </View>

          <ClayButton
            variant="ghost"
            onPress={() => onNavigate && onNavigate('Applications')}
            style={styles.headerLinkBtn}
          >
            <Text style={styles.headerLinkText}>View Applications →</Text>
          </ClayButton>
        </View>

        <View style={styles.timelineContainer}>
          <View style={styles.timelineTrack} />
          <View style={styles.timelineNodesRow}>
            {renderTimelineNode(String(totalAppsCount), 'Applied', '📝')}
            {renderTimelineNode(String(reviewAppsCount), 'Review', '🔍')}
            {renderTimelineNode(String(interviewAppsCount), 'Interview', '🎯')}
            {renderTimelineNode(String(selectedAppsCount), 'Selected', '🏆')}
          </View>
        </View>
      </ClayCard>

      {/* 2. Interview Readiness Card */}
      <ClayCard
        style={styles.readinessCard}
        hoverTranslate={-4}
        hoverScale={1.015}
        interactive={true}
        onPress={() => onNavigate && onNavigate('Rounds')}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>🎯</Text>
            <Text style={styles.cardTitle}>Interview Readiness</Text>
          </View>

          <ClayButton
            variant="ghost"
            onPress={() => onNavigate && onNavigate('Rounds')}
            style={styles.headerLinkBtn}
          >
            <Text style={styles.headerLinkText}>View History →</Text>
          </ClayButton>
        </View>

        <View style={styles.readinessContentRow}>
          <View style={styles.readinessGauge}>
            <Text style={styles.readinessScoreNum}>{animatedReadiness}</Text>
            <Text style={styles.readinessScoreDenom}>/100</Text>
          </View>

          <View style={styles.readinessTextColumn}>
            <Text style={styles.readinessRoleTitle} numberOfLines={1}>
              {formatCareerTitle(activeTargetCareer)} Diagnostic
            </Text>
            <Text style={styles.readinessStatusDesc}>
              {careerReadinessData?.status ? `Status: ${careerReadinessData.status}` : 'AI Role Readiness Assessment'}
            </Text>
            <View style={{ marginTop: 4 }}>
              <ClayBadge
                label={readinessScore >= 75 ? 'Strong Alignment' : 'Skills in Progress'}
                icon="●"
                variant={readinessScore >= 75 ? 'emerald' : 'amber'}
                size="small"
              />
            </View>
          </View>
        </View>

        <ClayButton
          variant="primary"
          onPress={() => onNavigate && onNavigate('Rounds')}
          style={styles.startMockBtn}
        >
          <Text style={styles.startMockBtnText}>Start AI Mock Interview →</Text>
        </ClayButton>
      </ClayCard>
    </View>
  );
}

const styles = StyleSheet.create({
  twoColRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  twoColRowMobile: {
    flexDirection: 'column',
  },
  pipelineCard: {
    flex: 1.2,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 20,
    justifyContent: 'space-between',
    ...CLAY_SHADOWS.card,
  },
  readinessCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 20,
    justifyContent: 'space-between',
    ...CLAY_SHADOWS.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  headerLinkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerLinkText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  timelineContainer: {
    height: 76,
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  timelineTrack: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: 3,
    backgroundColor: CLAY_COLORS.recessed,
    top: 20,
    borderRadius: 2,
  },
  timelineNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineNode: {
    alignItems: 'center',
    width: '24%',
  },
  timelineNodeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
  nodeActive: {
    backgroundColor: CLAY_COLORS.emeraldLight,
    borderColor: CLAY_COLORS.emerald,
    ...CLAY_SHADOWS.buttonSecondary,
  },
  nodeInactive: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderColor: CLAY_COLORS.cardBorder,
  },
  timelineNodeNumber: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '900',
  },
  numActive: {
    color: CLAY_COLORS.emeraldDark,
  },
  numInactive: {
    color: CLAY_COLORS.muted,
  },
  timelineNodeLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 8,
    fontWeight: '700',
  },
  readinessContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  readinessGauge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: CLAY_COLORS.primary,
    backgroundColor: CLAY_COLORS.recessedLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonSecondary,
  },
  readinessScoreNum: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 17,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    lineHeight: 19,
  },
  readinessScoreDenom: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  readinessTextColumn: {
    flex: 1,
  },
  readinessRoleTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  readinessStatusDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    marginTop: 1,
  },
  startMockBtn: {
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
  },
  startMockBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
