import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
} from './LearningDesignTokens';

export default function LearningHero({
  displayCareerName,
  readinessScore = 0.82,
  targetFitScore = 82,
  targetCareers = [],
  activeCareerName,
  onSelectCareer,
  onContinueLearning,
  isDesktop,
  isMobile,
}) {
  const [showCareerDropdown, setShowCareerDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Animated Readiness Number
  const pctValue = Math.round(readinessScore * 100);
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    Animated.timing(animatedScore, {
      toValue: pctValue,
      duration: 800,
      useNativeDriver: false,
    }).start();

    const listener = animatedScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    return () => {
      animatedScore.removeListener(listener);
    };
  }, [pctValue]);

  // Click outside to close dropdown on Web
  useEffect(() => {
    if (Platform.OS !== 'web' || !showCareerDropdown) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCareerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCareerDropdown]);

  return (
    <View
      style={[
        styles.heroContainer,
        CLAY_SHADOWS.card,
        isDesktop ? styles.heroDesktop : styles.heroMobile,
      ]}
    >
      {/* Decorative gradient overlay accents */}
      <View style={styles.heroGlowCircle} />

      {/* Left Column: Learning Intelligence Info & Target Role */}
      <View style={styles.heroLeftCol}>
        <View style={styles.badgeRow}>
          <ClayBadge
            icon="✨"
            label="LEARNING INTELLIGENCE"
            variant="primary"
            size="small"
          />
          <ClayBadge
            icon="🎯"
            label={`ACTIVE TARGET: ${displayCareerName.toUpperCase()}`}
            variant="emerald"
            size="small"
          />
        </View>

        <Text style={styles.heroHeadline}>
          Your personalized learning path for:{' '}
          <Text style={styles.heroHighlightText}>[{displayCareerName}]</Text>
        </Text>

        <Text style={styles.heroSubtitle}>
          Build the skills you need next. Your learning plan adapts to your career target, skill gaps, assessment performance, and verified evidence.
        </Text>

        {/* Target Career Switcher (if multiple careers available) */}
        {targetCareers && targetCareers.length > 1 && (
          <View style={styles.careerSwitcherRow} ref={dropdownRef}>
            <Text style={styles.careerSwitcherLabel}>ACTIVE TARGET CAREER:</Text>
            <View style={styles.careerPillsRow}>
              {targetCareers.map((c, idx) => {
                const cName = typeof c === 'string' ? c : c.career_name || c.name || c.title;
                if (!cName) return null;
                const isSelected = cName === (activeCareerName || displayCareerName);
                return (
                  <Pressable
                    key={c.id || c.career_id || idx}
                    onPress={() => onSelectCareer(cName)}
                    style={[
                      styles.careerPill,
                      isSelected && styles.careerPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.careerPillText,
                        isSelected && styles.careerPillTextActive,
                      ]}
                    >
                      {isSelected ? '✓ ' : ''}{cName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.heroCtaRow}>
          <ClayButton
            onPress={onContinueLearning}
            style={styles.heroPrimaryBtn}
            testID="continue-learning-hero-btn"
          >
            <Text style={styles.heroPrimaryBtnText}>Continue Learning →</Text>
          </ClayButton>
        </View>
      </View>

      {/* Right Column: Learning Readiness Gauge */}
      <View style={styles.heroRightCol}>
        <View style={styles.readinessCard}>
          <Text style={styles.readinessTitle}>LEARNING READINESS</Text>

          {/* Circular Gauge Center */}
          <View style={styles.gaugeOuterCircle}>
            <View style={styles.gaugeInnerCircle}>
              <Text style={styles.gaugePercentageText}>{displayScore}%</Text>
              <Text style={styles.gaugeSublabel}>Career Fit</Text>
            </View>
          </View>

          <View style={styles.readinessMetaBox}>
            <View style={styles.readinessMetaRow}>
              <Text style={styles.readinessMetaKey}>Benchmark Match</Text>
              <Text style={styles.readinessMetaVal}>{targetFitScore}/100</Text>
            </View>
            <View style={styles.miniGaugeBarTrack}>
              <View
                style={[
                  styles.miniGaugeBarFill,
                  { width: `${Math.min(100, Math.max(5, pctValue))}%` },
                ]}
              />
            </View>
            <Text style={styles.readinessHintText}>
              Calibrated to {displayCareerName} production competency standards.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.hero,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 24,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 28,
  },
  heroMobile: {
    flexDirection: 'column',
    gap: 20,
  },
  heroGlowCircle: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  heroLeftCol: {
    flex: 1.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  heroHeadline: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 26,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.5,
    lineHeight: 34,
    marginBottom: 8,
  },
  heroHighlightText: {
    color: CLAY_COLORS.primary,
  },
  heroSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 14,
    color: CLAY_COLORS.muted,
    lineHeight: 21,
    marginBottom: 16,
    maxWidth: 580,
  },
  careerSwitcherRow: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.recessedBorder,
  },
  careerSwitcherLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  careerPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  careerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  careerPillActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  careerPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  careerPillTextActive: {
    color: '#FFFFFF',
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroPrimaryBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: CLAY_RADII.button,
    alignSelf: 'flex-start',
  },
  heroPrimaryBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroRightCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 18,
    alignItems: 'center',
  },
  readinessTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 1,
    marginBottom: 14,
  },
  gaugeOuterCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: CLAY_COLORS.primaryLight,
    borderWidth: 6,
    borderColor: CLAY_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...CLAY_SHADOWS.badge,
  },
  gaugeInnerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugePercentageText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 24,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: -0.5,
  },
  gaugeSublabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  readinessMetaBox: {
    width: '100%',
  },
  readinessMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  readinessMetaKey: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  readinessMetaVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  miniGaugeBarTrack: {
    height: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  miniGaugeBarFill: {
    height: '100%',
    backgroundColor: CLAY_COLORS.primary,
    borderRadius: 3,
  },
  readinessHintText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    lineHeight: 14,
  },
});
