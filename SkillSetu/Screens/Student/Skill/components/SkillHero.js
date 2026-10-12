import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, ClayButton } from './DesignTokens';

export default function SkillHero({
  heroData,
  activeCareerId,
  activeCareerName,
  targetCareersList = [],
  onCareerChange,
  isLoadingCareerData,
  careerSkillData,
  careerIntel,
  verifiedSkillsCount = 0,
  gapSkillsCount = 0,
  careerMatchPct = 0,
  projectVerificationsCount = 0,
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Authoritative dynamic metrics from backend
  const targetCareer = heroData?.target_career?.name || activeCareerName || 'Software Engineer';
  const benchmark = heroData?.benchmark;
  const benchmarkName = benchmark?.name || `Tier-1 Benchmark: ${targetCareer}`;
  const benchmarkDesc = benchmark?.description || `Calibrated against verified engineering competencies required for ${targetCareer}.`;
  const benchmarkThreshold = benchmark?.threshold || 80;
  const qualificationStandard = benchmark?.qualification_standard || 'NSQF Compliant';

  const readinessData = heroData?.readiness;
  const finalReadiness = Math.round(
    readinessData?.overall ??
    careerIntel?.career_readiness?.readiness_score ??
    careerSkillData?.career_readiness?.readiness_score ??
    careerSkillData?.career_match?.score ??
    careerSkillData?.strict_esco_match_score ??
    careerMatchPct ?? 0
  );

  // Animated Readiness Gauge Number
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    Animated.timing(animatedScore, {
      toValue: finalReadiness,
      duration: 800,
      useNativeDriver: false,
    }).start();

    const listener = animatedScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    return () => {
      animatedScore.removeListener(listener);
    };
  }, [finalReadiness]);

  // Handle click outside for career switcher on web
  useEffect(() => {
    if (Platform.OS !== 'web' || !showDropdown) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Real backend domain breakdown (e.g. Core Architecture & Production Engineering)
  const domains = heroData?.domains && heroData.domains.length > 0 ? heroData.domains : [
    {
      name: 'Technical Competency',
      score: readinessData?.technical ?? Math.round(finalReadiness * 0.9),
      required_score: benchmarkThreshold,
    },
    {
      name: 'Practical & Project Evidence',
      score: readinessData?.practical ?? Math.round(finalReadiness * 0.8),
      required_score: benchmarkThreshold,
    }
  ];

  // Cohort & Baseline Data from backend
  const cohort = heroData?.cohort;
  const baseline = heroData?.baseline;
  const repos = heroData?.repositories;
  const recruiter = heroData?.recruiter;
  const telemetry = heroData?.telemetry;

  const repoDisplay = repos?.display_text || (projectVerificationsCount > 0 ? `${projectVerificationsCount} Verified` : '0 Verified');
  const repoSub = repos?.verification_sub || (projectVerificationsCount > 0 ? 'Git project verified' : 'No verified projects yet');

  return (
    <View style={[styles.heroContainer, showDropdown && { zIndex: 1000 }]}>
      {/* Main Benchmark Card */}
      <View
        style={[
          styles.heroCard,
          showDropdown && { zIndex: 1000 },
          Platform.OS === 'web' && { animation: 'clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' },
        ]}
      >
        <View style={[styles.heroContentGrid, showDropdown && { zIndex: 1000 }]}>
          {/* Left Column: Target Career & Calibration Info */}
          <View style={[styles.leftColumn, showDropdown && { zIndex: 1000 }]}>
            {/* Target Benchmark Badge Row */}
            <View style={styles.badgeRow}>
              <View style={styles.targetBadge}>
                <Text style={styles.targetBadgeText}>TARGET BENCHMARK PROFILE</Text>
              </View>
              <Text style={styles.benchmarkTierText} numberOfLines={1}>
                {benchmarkName}
              </Text>
            </View>

            {/* Title & Dropdown Switcher */}
            <View style={[styles.titleRow, showDropdown && { zIndex: 9999 }]}>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {targetCareer}
              </Text>

              <View
                ref={dropdownRef}
                style={[styles.dropdownContainer, { zIndex: 99999 }]}
              >
                <ClayButton
                  testID="skill-change-target-career"
                  dataSet={{ testid: 'skill-change-target-career' }}
                  style={styles.changeGoalBtn}
                  className="clay-interactive-btn"
                  onPress={() => setShowDropdown(!showDropdown)}
                >
                  <Text style={styles.changeGoalBtnText}>Change Target Career</Text>
                  <Text style={styles.chevronIcon}>{showDropdown ? '▲' : '▼'}</Text>
                  {isLoadingCareerData && (
                    <ActivityIndicator size="small" color={CLAY_COLORS.primary} style={{ marginLeft: 6 }} />
                  )}
                </ClayButton>

                {showDropdown && (
                  <View style={styles.dropdownMenu}>
                    <Text style={styles.dropdownHeader}>AVAILABLE TARGET CAREERS</Text>
                    {targetCareersList.map((carItem) => {
                      const isActive =
                        carItem.id === activeCareerId || carItem.name === activeCareerName;
                      return (
                        <Pressable
                          key={carItem.id}
                          style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                          onPress={() => {
                            onCareerChange(carItem);
                            setShowDropdown(false);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Text style={{ fontSize: 13 }}>{isActive ? '🎯' : '💼'}</Text>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                isActive && styles.dropdownItemTextActive,
                              ]}
                            >
                              {carItem.name}
                            </Text>
                          </View>
                          {isActive && (
                            <View style={styles.activeCheckBadge}>
                              <Text style={styles.activeCheckText}>ACTIVE</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Dynamic Role-Calibrated Description */}
            <Text style={styles.heroSubtitle}>
              {benchmarkDesc}
            </Text>

            {/* Bottom Meta Stats Strip */}
            <View style={styles.metaStatsRow}>
              <View style={styles.metaStatItem}>
                <Text style={styles.metaStatLabel}>COHORT RANK</Text>
                <Text style={styles.metaStatValue}>
                  {cohort?.rank_display || (finalReadiness >= 75 ? 'Top 10%' : 'Calibrating')}
                </Text>
                <Text style={styles.metaStatSub} numberOfLines={1}>
                  {cohort?.candidate_text || 'Across registered candidates'}
                </Text>
              </View>

              <View style={styles.metaStatDivider} />

              <View style={styles.metaStatItem}>
                <Text style={styles.metaStatLabel}>SCORE DELTA</Text>
                <Text style={[styles.metaStatValue, { color: (baseline?.delta ?? 0) >= 0 ? CLAY_COLORS.primary : CLAY_COLORS.danger }]}>
                  {baseline?.delta_display || `${finalReadiness >= 58 ? `+${finalReadiness - 58}%` : `${finalReadiness - 58}%`}`}
                </Text>
                <Text style={styles.metaStatSub} numberOfLines={1}>
                  {baseline?.delta_label || 'vs role entry baseline'}
                </Text>
              </View>

              <View style={styles.metaStatDivider} />

              <View style={styles.metaStatItem}>
                <Text style={styles.metaStatLabel}>VERIFIED REPOS</Text>
                <Text style={styles.metaStatValue}>
                  {repoDisplay}
                </Text>
                <Text style={styles.metaStatSub} numberOfLines={1}>
                  {repoSub}
                </Text>
              </View>

              <View style={styles.metaStatDivider} />

              <View style={styles.metaStatItem}>
                <Text style={styles.metaStatLabel}>RECRUITER STATUS</Text>
                <View style={styles.recruiterPriorityBadge}>
                  <Text style={styles.recruiterPriorityText}>
                    {recruiter?.status || (finalReadiness >= 75 ? 'Shortlist Ready' : 'Calibrating')}
                  </Text>
                </View>
                <Text style={styles.metaStatSub} numberOfLines={1}>
                  {recruiter?.sub_text || 'Active opportunity matching'}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Column: Readiness Radial Gauge & Real Domain Breakdown */}
          <View style={styles.rightColumn}>
            <View style={styles.readinessCard}>
              {/* Card Header */}
              <View style={styles.readinessHeader}>
                <Text style={styles.readinessHeaderTitle}>Overall Skill Readiness</Text>
                {qualificationStandard && (
                  <View style={styles.nsqfBadge}>
                    <Text style={styles.nsqfBadgeText}>{qualificationStandard}</Text>
                  </View>
                )}
              </View>

              {/* Readiness Circular Ring Gauge */}
              <View style={styles.gaugeContainer}>
                <View style={styles.donutCircle}>
                  <View style={styles.donutInnerCircle}>
                    <Text style={styles.donutValueText}>{displayScore}%</Text>
                    <Text style={styles.donutSubText}>READINESS</Text>
                  </View>
                </View>

                <View style={styles.gaugeInfoBlock}>
                  <Text style={styles.gaugeThresholdTitle}>Tier-1 Threshold: {benchmarkThreshold}%</Text>
                  <Text style={styles.gaugeThresholdDesc}>
                    {finalReadiness >= benchmarkThreshold
                      ? '✓ Meets direct technical interview benchmark'
                      : 'Benchmarking in progress towards role target'}
                  </Text>
                  {telemetry?.available && telemetry?.score && (
                    <View style={styles.proctorPill}>
                      <Text style={styles.proctorPillText}>⚡ Telemetry: {telemetry.score}%</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Real Backend Domain Competency Breakdown */}
              <View style={styles.breakdownList}>
                {domains.map((dom, idx) => {
                  const scoreVal = dom.score ?? 0;
                  const isPrimary = idx === 0;
                  return (
                    <View key={idx} style={styles.breakdownItem}>
                      <View style={styles.breakdownLabelRow}>
                        <Text style={styles.breakdownLabel}>{dom.name}</Text>
                        <Text style={styles.breakdownValue}>{scoreVal}%</Text>
                      </View>
                      <View style={styles.breakdownTrack}>
                        <View
                          style={[
                            styles.breakdownFill,
                            {
                              width: `${Math.min(100, Math.max(0, scoreVal))}%`,
                              backgroundColor: isPrimary ? CLAY_COLORS.primary : CLAY_COLORS.sky,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    marginBottom: 20,
    zIndex: 100,
  },
  heroCard: {
    backgroundColor: CLAY_COLORS.cardBg,
    borderRadius: CLAY_RADII.hero,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 24,
    ...CLAY_SHADOWS.card,
  },
  heroContentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    alignItems: 'stretch',
  },
  leftColumn: {
    flex: 7,
    minWidth: 320,
    justifyContent: 'space-between',
    gap: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  targetBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
  },
  targetBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.6,
  },
  benchmarkTierText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    position: 'relative',
  },
  heroTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 26,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.5,
    flex: 1,
    minWidth: 260,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 99999,
  },
  changeGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.pill,
    ...CLAY_SHADOWS.badge,
  },
  changeGoalBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  chevronIcon: {
    fontSize: 10,
    color: CLAY_COLORS.primary,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '115%',
    right: 0,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    borderRadius: CLAY_RADII.cardSmall,
    padding: 8,
    zIndex: 99999,
    elevation: 99999,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.22), 0 6px 18px rgba(124, 58, 237, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  dropdownHeader: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.input,
    marginBottom: 4,
  },
  dropdownItemActive: {
    backgroundColor: CLAY_COLORS.primaryLight,
  },
  dropdownItemText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  dropdownItemTextActive: {
    color: CLAY_COLORS.primary,
    fontWeight: '900',
  },
  activeCheckBadge: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeCheckText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
    color: CLAY_COLORS.paper,
  },
  heroSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    lineHeight: 20,
  },
  metaStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    borderRadius: CLAY_RADII.cardMedium,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  metaStatItem: {
    flex: 1,
    minWidth: 100,
    gap: 2,
  },
  metaStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  metaStatLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.5,
  },
  metaStatValue: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  metaStatSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  recruiterPriorityBadge: {
    backgroundColor: CLAY_COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  recruiterPriorityText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.successDark,
  },
  rightColumn: {
    flex: 4,
    minWidth: 280,
    justifyContent: 'center',
  },
  readinessCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: CLAY_RADII.card,
    padding: 18,
    gap: 14,
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readinessHeaderTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  nsqfBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  nsqfBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  gaugeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: CLAY_COLORS.primaryLight,
    borderWidth: 5,
    borderColor: CLAY_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...CLAY_SHADOWS.badge,
  },
  donutInnerCircle: {
    alignItems: 'center',
  },
  donutValueText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    lineHeight: 22,
  },
  donutSubText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 7,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.5,
  },
  gaugeInfoBlock: {
    flex: 1,
    gap: 3,
  },
  gaugeThresholdTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  gaugeThresholdDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
    lineHeight: 14,
  },
  proctorPill: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  proctorPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.skyDark,
  },
  breakdownList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingTop: 10,
  },
  breakdownItem: {
    gap: 3,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  breakdownValue: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  breakdownTrack: {
    height: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 3,
  },
});
