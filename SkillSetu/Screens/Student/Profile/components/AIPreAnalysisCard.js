import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function AIPreAnalysisCard({
  resumeAnalysis = {},
  user = {},
  onReanalyze,
  onViewAtsBreakdown,
  isReanalyzing = false,
}) {
  const hasAnalysis = Boolean(
    typeof resumeAnalysis?.score === 'number' ||
    user?.resume_score ||
    resumeAnalysis?.diagnostics ||
    resumeAnalysis?.scoreBreakdown
  );

  const rawScore = typeof resumeAnalysis?.score === 'number'
    ? resumeAnalysis.score
    : (user?.resume_score ? Number(user.resume_score) : null);

  const backendScore = rawScore !== null ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;

  const [displayScore, setDisplayScore] = useState(backendScore);
  const animatedScore = useRef(new Animated.Value(0)).current;

  // Stagger animation for 4 breakdown cards
  const animSemantic = useRef(new Animated.Value(0)).current;
  const animImpact = useRef(new Animated.Value(0)).current;
  const animDepth = useRef(new Animated.Value(0)).current;
  const animAts = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rawScore !== null) {
      animatedScore.setValue(0);
      Animated.timing(animatedScore, {
        toValue: backendScore,
        duration: 900,
        useNativeDriver: false,
      }).start();

      const listener = animatedScore.addListener(({ value }) => {
        setDisplayScore(Math.round(value));
      });

      return () => {
        animatedScore.removeListener(listener);
      };
    }
  }, [backendScore, rawScore, animatedScore]);

  useEffect(() => {
    Animated.stagger(90, [
      Animated.timing(animSemantic, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(animImpact, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(animDepth, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(animAts, { toValue: 1, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [animSemantic, animImpact, animDepth, animAts]);

  const diagnostics = resumeAnalysis?.diagnostics || {};
  const scoreBreakdown = resumeAnalysis?.scoreBreakdown || {};

  // 1. Semantic Match
  const semanticVal = typeof diagnostics?.semantic_match?.score === 'number'
    ? diagnostics.semantic_match.score
    : (typeof scoreBreakdown?.semantic_match === 'number' ? scoreBreakdown.semantic_match : null);
  const semanticDesc = diagnostics?.semantic_match?.description ||
    (hasAnalysis ? 'Target career skills aligned' : 'Upload CV to analyze role fit');

  // 2. Impact Quantification
  const impactVal = typeof diagnostics?.impact_quantification?.score === 'number'
    ? diagnostics.impact_quantification.score
    : (typeof scoreBreakdown?.impact_quantification === 'number' ? scoreBreakdown.impact_quantification : null);
  const impactDesc = diagnostics?.impact_quantification?.description ||
    (hasAnalysis ? 'Project outcome metrics' : 'Upload CV to quantify impact');

  // 3. Technical Depth
  const depthVal = typeof diagnostics?.technical_depth?.score === 'number'
    ? diagnostics.technical_depth.score
    : (typeof scoreBreakdown?.technical_depth === 'number' ? scoreBreakdown.technical_depth : null);
  const depthDesc = diagnostics?.technical_depth?.description ||
    (hasAnalysis ? 'Verified tech stack coverage' : 'Upload CV to evaluate depth');

  // 4. Readability & ATS
  const atsVal = typeof diagnostics?.readability_ats?.score === 'number'
    ? diagnostics.readability_ats.score
    : (typeof scoreBreakdown?.readability_ats === 'number' ? scoreBreakdown.readability_ats : null);
  const atsDesc = diagnostics?.readability_ats?.description ||
    (hasAnalysis ? 'ATS structure validated' : 'Upload CV for syntax validation');

  // 5. Tier
  const tierLabel = diagnostics?.tier ||
    (rawScore !== null
      ? (backendScore >= 80 ? 'Tier-1 Elite Benchmark' : backendScore >= 65 ? 'Tier-2 Proficient Benchmark' : 'Tier-3 Developing Benchmark')
      : 'Analysis Pending');

  // 6. Synthesis Note
  const synthesisNote = diagnostics?.synthesis_note ||
    resumeAnalysis?.scoreText ||
    (hasAnalysis
      ? 'Resume telemetry analyzed. Review individual metric cards for detailed diagnostic feedback.'
      : 'Upload or re-analyze your CV to generate verified AI diagnostics and deterministic ATS calibration.');

  const progressAngle = Math.round((displayScore / 100) * 360);
  const gaugeGradient = Platform.OS === 'web'
    ? `conic-gradient(#7C3AED 0deg ${progressAngle}deg, #EFEBF5 ${progressAngle}deg 360deg)`
    : CLAY_COLORS.primary;

  return (
    <View style={[styles.cardContainer, Platform.OS === 'web' && { className: 'clay-section-revealed clay-hover-lift' }]}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeIcon}>✨</Text>
            <Text style={styles.aiBadgeText}>AI DIAGNOSTICS</Text>
          </View>
          <View style={styles.benchmarkBadge}>
            <Text style={styles.benchmarkBadgeText}>{tierLabel}</Text>
          </View>
        </View>

        <Pressable
          style={[styles.reanalyzeBtn, isReanalyzing && { opacity: 0.8 }, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
          onPress={onReanalyze}
          disabled={isReanalyzing}
        >
          <Text style={styles.reanalyzeBtnIcon}>{isReanalyzing ? '⏳' : '⚡'}</Text>
          <Text style={styles.reanalyzeBtnText}>{isReanalyzing ? 'Analyzing your CV...' : 'Re-analyze Latest CV'}</Text>
        </Pressable>
      </View>

      {/* Main Row: Score Gauge & Metrics Grid */}
      <View style={styles.contentRow}>
        {/* Left: Circular Gauge */}
        <View style={styles.scoreCol}>
          <View
            style={[
              styles.gaugeOuter,
              Platform.OS === 'web' && {
                backgroundImage: rawScore !== null ? gaugeGradient : 'none',
                backgroundColor: rawScore !== null ? 'transparent' : '#EAE6F2',
              },

            ]}
          >
            <View style={styles.gaugeInner}>
              <Text style={styles.scoreNumber}>
                {rawScore !== null ? displayScore : '--'}
              </Text>
              <Text style={styles.scoreTotal}>/ 100</Text>
              <Text style={styles.scoreLabel}>ATS SCORE</Text>
            </View>
          </View>
        </View>

        {/* Right: 4 Score Breakdown Cards */}
        <View style={styles.metricsGrid}>
          {/* 1. Semantic Match */}
          <Animated.View style={[styles.metricCard, { opacity: animSemantic }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Semantic Match</Text>
              <Text style={[styles.metricScore, { color: CLAY_COLORS.primary }]}>
                {semanticVal !== null ? `${semanticVal}%` : '--'}
              </Text>
            </View>
            <Text style={styles.metricDesc} numberOfLines={2}>
              {semanticDesc}
            </Text>
          </Animated.View>

          {/* 2. Impact Quantification */}
          <Animated.View style={[styles.metricCard, { opacity: animImpact }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Impact Quantification</Text>
              <Text style={[styles.metricScore, { color: CLAY_COLORS.secondary }]}>
                {impactVal !== null ? `${impactVal}%` : '--'}
              </Text>
            </View>
            <Text style={styles.metricDesc} numberOfLines={2}>
              {impactDesc}
            </Text>
          </Animated.View>

          {/* 3. Technical Depth */}
          <Animated.View style={[styles.metricCard, { opacity: animDepth }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Technical Depth</Text>
              <Text style={[styles.metricScore, { color: CLAY_COLORS.skyDark }]}>
                {depthVal !== null ? `${depthVal}%` : '--'}
              </Text>
            </View>
            <Text style={styles.metricDesc} numberOfLines={2}>
              {depthDesc}
            </Text>
          </Animated.View>

          {/* 4. Readability & ATS */}
          <Animated.View style={[styles.metricCard, { opacity: animAts }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Readability & ATS</Text>
              <Text style={[styles.metricScore, { color: CLAY_COLORS.successDark }]}>
                {atsVal !== null ? `${atsVal}%` : '--'}
              </Text>
            </View>
            <Text style={styles.metricDesc} numberOfLines={2}>
              {atsDesc}
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Synthesis Note Footer */}
      <View style={styles.synthesisRow}>
        <View style={styles.synthesisIconWrap}>
          <Text style={styles.synthesisIcon}>🤖</Text>
        </View>
        <View style={styles.synthesisTextWrap}>
          <Text style={styles.synthesisTitle}>AI Pre-Analysis Synthesis Note</Text>
          <Text style={styles.synthesisBody}>{synthesisNote}</Text>
        </View>
        <Pressable
          style={[styles.viewBreakdownBtn, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
          onPress={onViewAtsBreakdown}
        >
          <Text style={styles.viewBreakdownText}>View ATS Breakdown ↗</Text>
        </Pressable>
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
    padding: 24,
    marginBottom: 26,
    ...CLAY_SHADOWS.card,
  },
  topHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
  },
  aiBadgeIcon: {
    fontSize: 12,
  },
  aiBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  benchmarkBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
  },
  benchmarkBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.skyDark,
  },
  reanalyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.buttonPrimary,
  },
  reanalyzeBtnIcon: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  reanalyzeBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 24,
  },
  scoreCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.primaryLight,
  },
  gaugeInner: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: '#FAF8FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  scoreNumber: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 32,
    fontWeight: '900',
    color: CLAY_COLORS.primaryDark,
    lineHeight: 34,
  },
  scoreTotal: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
    fontWeight: '600',
  },
  scoreLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  metricsGrid: {
    flex: 1,
    minWidth: 280,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  metricScore: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
  },
  metricDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  synthesisRow: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  synthesisIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  synthesisIcon: {
    fontSize: 16,
  },
  synthesisTextWrap: {
    flex: 1,
    minWidth: 240,
  },
  synthesisTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  synthesisBody: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 17,
    marginTop: 2,
  },
  viewBreakdownBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  viewBreakdownText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
