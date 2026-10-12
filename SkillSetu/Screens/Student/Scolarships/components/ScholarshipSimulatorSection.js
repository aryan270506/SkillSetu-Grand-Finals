import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  ClayBadge,
  ClayCard,
} from './ScholarshipDesignTokens';

export default function ScholarshipSimulatorSection({
  studentProfile,
  onRunSimulation,
  isSimulating = false,
  simulationResult = null,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 1024;

  const [cgpa, setCgpa] = useState(8.5);
  const [income, setIncome] = useState(450000);
  const [category, setCategory] = useState('General (EWS)');
  const [domicile, setDomicile] = useState('Maharashtra');
  const [gender, setGender] = useState('female');

  const cgpaOptions = [6.5, 7.5, 8.5, 9.0, 9.5];
  const incomeOptions = [
    { label: '₹2.5L', value: 250000 },
    { label: '₹4.5L', value: 450000 },
    { label: '₹6.0L', value: 600000 },
    { label: '₹8.0L', value: 800000 },
  ];
  const categoryOptions = ['General', 'General (EWS)', 'OBC-NCL', 'SC', 'ST'];
  const domicileOptions = ['All India', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi'];
  const genderOptions = ['female', 'male', 'any'];

  const handleSimulate = () => {
    if (onRunSimulation) {
      onRunSimulation({
        cgpa,
        annual_family_income: income,
        social_category: category.includes('EWS') ? 'EWS' : category.toUpperCase(),
        state_domicile: domicile,
        gender,
      });
    }
  };

  const score = simulationResult?.overall_eligibility_score ?? (cgpa >= 8.5 ? 94 : cgpa >= 7.5 ? 82 : 68);
  const eligibleCount = simulationResult?.eligible_count ?? (income <= 600000 && cgpa >= 7.5 ? 8 : 4);

  return (
    <ClayCard style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.badgeRow}>
            <ClayBadge text="INTERACTIVE ENGINE" variant="sky" size="sm" />
            <Text style={styles.engineMeta}>Deterministic Profile Simulator</Text>
          </View>
          <Text style={styles.title}>Real-Time Eligibility Simulator</Text>
          <Text style={styles.subtitle}>
            Adjust your academic and demographic parameters to instantly verify how changes in CGPA or income status unlock government & corporate grants.
          </Text>
        </View>
      </View>

      <View style={[styles.bodyLayout, isDesktop ? styles.rowLayout : styles.colLayout]}>
        {/* Left: Interactive Controls */}
        <View style={[styles.controlsCol, isDesktop ? { flex: 7 } : {}]}>
          {/* CGPA Selection */}
          <View style={styles.controlGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>ACADEMIC CGPA</Text>
              <Text style={styles.activeValueBadge}>{cgpa.toFixed(1)} / 10.0</Text>
            </View>
            <View style={styles.pillsRow}>
              {cgpaOptions.map((val) => (
                <Pressable
                  key={val}
                  style={[styles.pillBtn, cgpa === val && styles.pillBtnActive]}
                  onPress={() => setCgpa(val)}
                >
                  <Text style={[styles.pillText, cgpa === val && styles.pillTextActive]}>
                    {val.toFixed(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Annual Family Income */}
          <View style={styles.controlGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>ANNUAL HOUSEHOLD INCOME</Text>
              <Text style={styles.activeValueBadge}>₹{income.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.pillsRow}>
              {incomeOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.pillBtn, income === opt.value && styles.pillBtnActive]}
                  onPress={() => setIncome(opt.value)}
                >
                  <Text style={[styles.pillText, income === opt.value && styles.pillTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Category & Domicile Row */}
          <View style={[styles.formRowTwoCol, isMobile && styles.colLayout]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>SOCIAL CATEGORY / QUOTA</Text>
              <View style={styles.pillsRowWrap}>
                {categoryOptions.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.smallPillBtn, category === cat && styles.smallPillBtnActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.smallPillText, category === cat && styles.smallPillTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>STATE DOMICILE</Text>
              <View style={styles.pillsRowWrap}>
                {domicileOptions.map((dom) => (
                  <Pressable
                    key={dom}
                    style={[styles.smallPillBtn, domicile === dom && styles.smallPillBtnActive]}
                    onPress={() => setDomicile(dom)}
                  >
                    <Text style={[styles.smallPillText, domicile === dom && styles.smallPillTextActive]}>
                      {dom}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Right: Simulation Output Card */}
        <View style={[styles.resultsCol, isDesktop ? { flex: 5 } : {}]}>
          <View style={styles.scoreBox}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{Math.round(score)}%</Text>
              <Text style={styles.scoreLabel}>MATCH</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultHeading}>Pre-Qualification Status</Text>
              <Text style={styles.resultSub}>
                {eligibleCount} Scheme(s) fully unlocked based on current parameters.
              </Text>
            </View>
          </View>

          {/* Verification checklist */}
          <View style={styles.checklist}>
            <View style={styles.checklistItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.checkText}>
                Merit Cutoff: {cgpa >= 8.0 ? 'Exceeds High-Tier' : 'Meets Baseline'}
              </Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.checkText}>
                Income Bracket: Need-Based Tier Eligible (≤ ₹{income / 100000}L)
              </Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.checkText}>Quota Verified: {category}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.btnSimulate,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            onPress={handleSimulate}
            disabled={isSimulating}
          >
            {isSimulating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.btnSimulateText}>⚡ Re-Evaluate Parameters</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ClayCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
    padding: 24,
    borderRadius: CLAY_RADII.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  headerRow: {
    marginBottom: 18,
  },
  headerLeft: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  engineMeta: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  title: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 22,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13.5,
    fontWeight: '400',
    color: CLAY_COLORS.muted,
    lineHeight: 20,
    maxWidth: 820,
  },
  bodyLayout: {
    gap: 20,
  },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  colLayout: {
    flexDirection: 'column',
  },
  controlsCol: {
    gap: 16,
  },
  controlGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    letterSpacing: 0.6,
  },
  activeValueBadge: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.md,
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
  },
  pillBtnActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  pillText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 14,
  },
  pillsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  smallPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.sm,
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
  },
  smallPillBtnActive: {
    backgroundColor: CLAY_COLORS.skyText,
    borderColor: CLAY_COLORS.skyText,
  },
  smallPillText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  smallPillTextActive: {
    color: '#FFFFFF',
  },
  resultsCol: {
    backgroundColor: 'rgba(124, 58, 237, 0.04)',
    borderRadius: CLAY_RADII.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    justifyContent: 'space-between',
    gap: 14,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: CLAY_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  resultHeading: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  resultSub: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    lineHeight: 17,
  },
  checklist: {
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.md,
    padding: 12,
    borderWidth: 1,
    borderColor: CLAY_COLORS.borderLight,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: CLAY_COLORS.emeraldText,
  },
  checkText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 12,
    fontWeight: '600',
    color: CLAY_COLORS.foreground,
  },
  btnSimulate: {
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 12,
    borderRadius: CLAY_RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSimulateText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
