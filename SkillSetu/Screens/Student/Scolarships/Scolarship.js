import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

const STITCH_MCP_API_KEY = 'AQ.Ab8RN6K7n-m1-FxHgiYPmMRBse-2ZRvk55MCHyETK8AUHL-FYQ';

const COLORS = {
  bgSurface: '#f9f9f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f3',
  surfaceContainer: '#eeeeed',
  surfaceContainerHigh: '#e8e8e7',
  surfaceContainerHighest: '#e2e2e2',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#3d4947',
  primary: '#00685f',
  primaryContainer: '#008378',
  onPrimaryContainer: '#f4fffc',
  primaryFixed: '#89f5e7',
  onPrimaryFixedVariant: '#005049',
  secondary: '#545f73',
  secondaryFixed: '#d8e3fb',
  onSecondaryFixed: '#111c2d',
  tertiary: '#825100',
  tertiaryFixed: '#ffddb8',
  onTertiaryFixedVariant: '#653e00',
  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',
  emerald800: '#065f46',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  outlineVariant: '#bcc9c6',
};

const SCHOLARSHIPS = [
  {
    id: '1',
    initial: 'T',
    provider: 'Tata Trusts • Pan-India',
    title: 'Tata Scholarship Program 2026',
    match: '96% Match',
    statusTag: 'Closing Soon',
    typeTag: 'Merit & Need-based',
    description: 'Full tuition grant for top quartile engineering undergraduates pursuing tech innovation with community impact projects.',
    amount: '₹2,00,000 / year',
    deadline: '30 Oct 2026',
    bookmarked: true,
  },
  {
    id: '2',
    initial: 'W',
    provider: 'Wipro Cares • Karnataka, AP & TS',
    title: "Santoor Women's Scholarship 2026",
    match: '88% Match',
    statusTag: 'Application Open',
    typeTag: 'Gender Diversity & STEM',
    description: 'Annual financial assistance for young women from underprivileged backgrounds opting for higher education in technical disciplines.',
    amount: '₹75,000 / year',
    deadline: '15 Nov 2026',
    bookmarked: false,
  },
  {
    id: '3',
    initial: 'A',
    provider: 'Amazon India • Pan-India',
    title: 'Amazon Future Engineer Scholarship',
    match: '92% Match',
    statusTag: 'Laptop + Mentorship',
    typeTag: 'Women in Tech',
    description: 'Four-year financial backing alongside exclusive Amazon SWE mentorship sessions, curated technical workshops, and coding gear.',
    amount: '₹1,60,000 (40k/yr)',
    deadline: '05 Nov 2026',
    bookmarked: false,
  },
  {
    id: '4',
    initial: 'O',
    provider: 'Oil & Natural Gas Corp • Central Scheme',
    title: 'ONGC Foundation Merit Scholarship',
    match: 'Almost Eligible',
    statusTag: '1 Doc Missing',
    typeTag: 'Merit-cum-Means',
    description: 'Reserved funding for economically weaker section students admitted into first year engineering degree courses in approved institutes.',
    amount: '₹48,000 / year',
    deadline: '12 Dec 2026',
    bookmarked: false,
  },
];

export default function Scolarship() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [activeSubTab, setActiveSubTab] = useState('Overview');
  const [cgpa, setCgpa] = useState(8.8);
  const [income, setIncome] = useState('4,50,000');
  const [aiQuery, setAiQuery] = useState('Which STEM scholarships close this month without an application fee?');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* SECTION 1: HEADER & SUB-NAVIGATION */}
      <View style={styles.headerSection}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.tagRowHeader}>
              <View style={styles.tagBadge}>
                <View style={styles.dot} />
                <Text style={styles.tagBadgeText}>Academic Precision Framework</Text>
              </View>
              <Text style={styles.subtextDossier}>B.Tech Dossier Synced (Updated 4h ago)</Text>
            </View>
            <Text style={styles.mainTitle}>Scholarships Intelligence</Text>
            <Text style={styles.subtitle}>
              Discover, verify eligibility, and track merit- and need-based financial aid tailored precisely to your academic standing and demographic profile.
            </Text>
          </View>

        
        </View>

       
      </View>

      {/* SECTION 2: 5 KEY METRIC CARDS */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Recommended</Text>
            <View style={[styles.iconBox, { backgroundColor: '#ccfbf1' }]}>
              <Text style={{ fontSize: 16 }}>⭐</Text>
            </View>
          </View>
          <Text style={styles.metricVal}>12</Text>
          <Text style={styles.metricSub}>Tailored to your B.Tech profile</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Eligible</Text>
            <View style={[styles.iconBox, { backgroundColor: '#d1fae5' }]}>
              <Text style={{ fontSize: 16 }}>✓</Text>
            </View>
          </View>
          <Text style={styles.metricVal}>8</Text>
          <Text style={styles.metricSub}>100% criteria verified</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Open Intake</Text>
            <View style={[styles.iconBox, { backgroundColor: '#ffddb8' }]}>
              <Text style={{ fontSize: 16 }}>⏳</Text>
            </View>
          </View>
          <Text style={styles.metricVal}>5</Text>
          <Text style={styles.metricSub}>Active intake this month</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Saved</Text>
            <View style={[styles.iconBox, { backgroundColor: '#d8e3fb' }]}>
              <Text style={{ fontSize: 16 }}>🔖</Text>
            </View>
          </View>
          <Text style={styles.metricVal}>14</Text>
          <Text style={styles.metricSub}>Bookmarked opportunities</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Applied</Text>
            <View style={[styles.iconBox, { backgroundColor: '#e2e2e2' }]}>
              <Text style={{ fontSize: 16 }}>📋</Text>
            </View>
          </View>
          <Text style={styles.metricVal}>3</Text>
          <Text style={styles.metricSub}>Under review / tracked</Text>
        </View>
      </View>

      {/* SECTION 3: AI SCHOLARSHIP RECOMMENDATION AGENT */}
      <View style={styles.aiBannerCard}>
        <View style={styles.aiBannerHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={styles.aiIconBadge}>
              <Text style={{ fontSize: 20, color: '#fff' }}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={styles.aiBannerTitle}>AI Scholarship Recommendation Agent</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Powered by SkillSetu Profile</Text>
                </View>
              </View>
              <Text style={styles.aiBannerSub}>
                Synthesizing 42 eligibility dimensions including academic transcripts, domicile, caste quota, and annual household income.
              </Text>
            </View>
          </View>
          <View style={styles.matchScorePill}>
            <Text style={styles.matchScoreText}>98.4% Confidence</Text>
          </View>
        </View>

        {/* AI Query Input */}
        <View style={styles.aiQueryRow}>
          <TextInput
            style={styles.aiInput}
            value={aiQuery}
            onChangeText={setAiQuery}
            placeholder="Ask AI scholarship assistant..."
          />
          <Pressable style={styles.queryBtn}>
            <Text style={styles.queryBtnText}>Query AI</Text>
          </Pressable>
        </View>

        {/* Featured Spotlight Card Inside Banner */}
        <View style={styles.spotlightCard}>
          <View style={{ flex: 1 }}>
            <View style={styles.spotlightTags}>
              <Text style={styles.tagEmerald}>94% AI Match</Text>
              <Text style={styles.tagGray}>Corporate Philanthropy</Text>
              <Text style={styles.tagAmber}>Intake Closes Soon</Text>
            </View>
            <Text style={styles.spotlightTitle}>Tata Trust Merit Scholarship 2026-27</Text>
            <Text style={styles.spotlightDetails}>
              ₹2,00,000 / year • Undergraduate STEM (All Branches) • National Coverage • Deadline: Oct 30, 2026
            </Text>
            <View style={styles.rationaleRow}>
              <Text style={styles.rationaleItem}>✓ Meets 8.5+ CGPA bar (Your CGPA: 8.8)</Text>
              <Text style={styles.rationaleItem}>✓ Family income &lt; ₹6 LPA verified</Text>
              <Text style={styles.rationaleItem}>✓ STEM B.Tech priority tier</Text>
            </View>
          </View>
          <View style={styles.spotlightActionCol}>
            <Pressable style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>⚡ Apply with SkillSetu Dossier</Text>
            </Pressable>
            <Pressable style={styles.ghostBtn}>
              <Text style={styles.ghostBtnText}>View Match Rationale</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* SECTION 4: DEADLINE RADAR & CRITICAL MILESTONES */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Deadline Radar & Critical Milestones</Text>
        <Text style={styles.sectionSub}>3 actions require immediate review</Text>
      </View>

      <View style={styles.radarGrid}>
        <View style={[styles.radarCard, { borderLeftColor: COLORS.error }]}>
          <View style={styles.radarCardHeader}>
            <Text style={styles.criticalPill}>Critical: 2 Days Left</Text>
            <Text style={styles.radarDate}>Oct 18, 2026</Text>
          </View>
          <Text style={styles.radarTitle}>Google Generation Scholarship (Asia-Pacific)</Text>
          <Text style={styles.radarText}>Disbursement: ₹1,50,000 • Status: Document review required</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: COLORS.error, marginTop: 12 }]}>
            <Text style={styles.primaryBtnText}>Complete Application</Text>
          </Pressable>
        </View>

        <View style={[styles.radarCard, { borderLeftColor: COLORS.tertiary }]}>
          <View style={styles.radarCardHeader}>
            <Text style={styles.upcomingPill}>Upcoming: 5 Days Left</Text>
            <Text style={styles.radarDate}>Oct 21, 2026</Text>
          </View>
          <Text style={styles.radarTitle}>Reliance Foundation Undergraduate Scholarship</Text>
          <Text style={styles.radarText}>Disbursement: ₹2,00,000 • Status: Application Open</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: COLORS.tertiary, marginTop: 12 }]}>
            <Text style={styles.primaryBtnText}>Review Criteria</Text>
          </Pressable>
        </View>

        <View style={[styles.radarCard, { borderLeftColor: COLORS.primary }]}>
          <View style={styles.radarCardHeader}>
            <Text style={styles.safePill}>Safe: 24 Days Left</Text>
            <Text style={styles.radarDate}>Nov 10, 2026</Text>
          </View>
          <Text style={styles.radarTitle}>Aditya Birla Capital Scholarship</Text>
          <Text style={styles.radarText}>Disbursement: ₹60,000 • Status: Profile Ready</Text>
          <Pressable style={[styles.secondaryBtn, { marginTop: 12 }]}>
            <Text style={styles.secondaryBtnText}>Explore Scheme</Text>
          </Pressable>
        </View>
      </View>

      {/* SECTION 5: SCHOLARSHIP CATALOG GRID */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Featured Scholarship Catalog</Text>
        <Text style={styles.sectionSub}>Displaying 4 priority recommendations</Text>
      </View>

      <View style={styles.catalogGrid}>
        {SCHOLARSHIPS.map((item) => (
          <View key={item.id} style={styles.catalogCard}>
            <View style={styles.catalogCardHeader}>
              <View style={styles.initialBox}>
                <Text style={styles.initialText}>{item.initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.providerText}>{item.provider}</Text>
                <Text style={styles.catalogTitle}>{item.title}</Text>
              </View>
            </View>

            <View style={styles.chipRow}>
              <Text style={styles.tagEmerald}>{item.match}</Text>
              <Text style={styles.tagAmber}>{item.statusTag}</Text>
              <Text style={styles.tagGray}>{item.typeTag}</Text>
            </View>

            <Text style={styles.catalogDesc}>{item.description}</Text>

            <View style={styles.valGrid}>
              <View>
                <Text style={styles.valLabel}>Annual Value</Text>
                <Text style={styles.valText}>{item.amount}</Text>
              </View>
              <View>
                <Text style={styles.valLabel}>Submission Deadline</Text>
                <Text style={[styles.valText, { color: COLORS.tertiary }]}>{item.deadline}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <Pressable style={[styles.primaryBtn, { flex: 1 }]}>
                <Text style={styles.primaryBtnText}>Apply Now</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>View Details</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {/* SECTION 6: REAL-TIME ACADEMIC ELIGIBILITY SIMULATOR */}
      <View style={styles.simulatorCard}>
        <Text style={styles.sectionTitle}>Real-Time Academic Eligibility Simulator</Text>
        <Text style={styles.subtitle}>
          Modify your baseline demographic and academic markers to uncover unlocked financial tranches.
        </Text>

        <View style={styles.simContent}>
          <View style={styles.simInputs}>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Degree Program</Text>
              <Text style={styles.inputValText}>B.Tech Computer Science (Locked)</Text>
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Current CGPA: {cgpa}</Text>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${(cgpa / 10) * 100}%` }]} />
              </View>
            </View>
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Annual Family Income: ₹{income}</Text>
              <Text style={styles.inputValText}>General - Economically Weaker (EWS)</Text>
            </View>
          </View>

          <View style={styles.simMeterBox}>
            <View style={styles.meterCircle}>
              <Text style={styles.meterNumber}>92%</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.meterLabel}>Eligibility Rating</Text>
              <Text style={styles.meterTitle}>Highly Qualified</Text>
              <Text style={styles.meterSub}>Eligible for 8 high-tier corporate & state grants.</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer API Key display */}
      <View style={styles.apiKeyFooter}>
        <Text style={styles.apiKeyLabel}>Stitch MCP Integration Key:</Text>
        <Text style={styles.apiKeyValue}>{STITCH_MCP_API_KEY}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSurface,
  },
  contentContainer: {
    padding: 20,
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
    gap: 20,
  },
  headerSection: {
    gap: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  tagRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  tagBadge: {
    backgroundColor: 'rgba(0, 104, 95, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  tagBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subtextDossier: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
    maxWidth: 700,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryBtn: {
    backgroundColor: COLORS.surfaceContainerHighest,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.onSurface,
    fontWeight: '600',
    fontSize: 13,
  },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  ghostBtnText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  subNavScroll: {
    marginTop: 6,
  },
  subNavContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  subNavTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subNavTabActive: {
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  subNavText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
  },
  subNavTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    fontWeight: '500',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricVal: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.onSurface,
    marginTop: 10,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  aiBannerCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
    gap: 16,
  },
  aiBannerHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  aiIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  verifiedBadge: {
    backgroundColor: COLORS.primaryFixed,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.onPrimaryFixedVariant,
  },
  aiBannerSub: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  matchScorePill: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  aiQueryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aiInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.onSurface,
  },
  queryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  queryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  spotlightCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  },
  spotlightTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  spotlightTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.onSurface,
    marginTop: 6,
  },
  spotlightDetails: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  rationaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  rationaleItem: {
    fontSize: 11,
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontWeight: '600',
  },
  spotlightActionCol: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.onSurface,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  radarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  radarCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
  },
  radarCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  criticalPill: {
    backgroundColor: COLORS.errorContainer,
    color: COLORS.onErrorContainer,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  upcomingPill: {
    backgroundColor: COLORS.tertiaryFixed,
    color: COLORS.onTertiaryFixedVariant,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  safePill: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  radarDate: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  radarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginTop: 8,
  },
  radarText: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  catalogCard: {
    width: '48%',
    minWidth: 300,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
    gap: 12,
  },
  catalogCardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  initialBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  providerText: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  catalogTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagEmerald: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagAmber: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.onTertiaryFixedVariant,
    backgroundColor: COLORS.tertiaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagGray: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  catalogDesc: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  valGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 10,
    borderRadius: 8,
  },
  valLabel: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  valText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  simulatorCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
    gap: 14,
  },
  simContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'center',
  },
  simInputs: {
    flex: 1,
    minWidth: 280,
    gap: 12,
  },
  inputBox: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  inputValText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.onSurface,
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 10,
    borderRadius: 8,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  simMeterBox: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minWidth: 260,
  },
  meterCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  meterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  meterTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.onSurface,
  },
  meterSub: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  apiKeyFooter: {
    marginTop: 20,
    padding: 12,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  apiKeyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  apiKeyValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.onSurface,
  },
});
