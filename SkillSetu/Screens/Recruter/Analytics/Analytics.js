import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = {
  pageBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  textMain: '#0F172A',
  textMuted: '#64748B',
  primaryTeal: '#004D40',
  primaryTealLight: '#005C4B',
  mintBg: '#E6F4F1',
  mintBadge: '#D1FAE5',
  mintBadgeText: '#065F46',
  amberBg: '#FEF3C7',
  amberText: '#92400E',
  blueBg: '#EFF6FF',
  blueText: '#1E40AF',
  accentGreen: '#10B981',
  redBg: '#FEE2E2',
  redText: '#991B1B',
  purpleBg: '#F3E8FF',
  purpleText: '#6B21A8',
  darkBannerBg: '#063B34',
};

// Hover Animated Card Wrapper
function HoverCard({ children, style }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleMouseEnter = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.015,
      friction: 8,
      tension: 80,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handleMouseLeave = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Animated.View
      style={[style, { transform: [{ scale: scaleAnim }] }]}
      // @ts-ignore - Web interactive props
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </Animated.View>
  );
}

// Hover Animated Button
function HoverButton({ children, style, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleMouseEnter = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.04,
      friction: 7,
      tension: 90,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handleMouseLeave = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[style, { transform: [{ scale: scaleAnim }] }]}
        // @ts-ignore - Web interactive props
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function Analytics() {
  const { width } = useWindowDimensions();
  const isCompact = width < 1050;

  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All Active Roles (4 Active Postings)');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Page Header */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.breadcrumb}>RECRUITER WORKSPACE • PERFORMANCE & PIPELINE INTELLIGENCE</Text>
            <Text style={styles.pageTitle}>Analytics</Text>
            <Text style={styles.pageSub}>
              Track internship performance, student applications, screening, and selection insights.
            </Text>
          </View>
          <View style={styles.headerActionsRight}>
            <View style={styles.timeDropdown}>
              <Text style={styles.timeDropdownText}>Last 30 Days  ▼</Text>
            </View>
            <HoverButton style={styles.exportBtn} onPress={() => {}}>
              <Text style={styles.exportBtnText}>📥 Export Report</Text>
            </HoverButton>
          </View>
        </View>

        {/* Filter & Sync Status Control Bar */}
        <View style={styles.controlBar}>
          <View style={styles.controlLeft}>
            <Text style={styles.controlLabel}>ANALYTICS FOR:</Text>
            <View style={styles.roleFilterDropdown}>
              <Text style={styles.roleFilterText}>{selectedRoleFilter}  ▼</Text>
            </View>
            <View style={styles.liveEnvBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.liveEnvBadgeText}>Live Environment Active</Text>
            </View>
          </View>
          <View style={styles.controlRight}>
            <Text style={styles.syncStatusText}>🕒 Data synced in real-time • Last updated 4 minutes ago</Text>
          </View>
        </View>

        {/* 5 Top Performance Metric Cards */}
        <View style={styles.metricsRow}>
          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>TOTAL APPLICATIONS</Text>
              <View style={styles.iconBoxTeal}>
                <Text style={styles.metricIcon}>📄</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>1,248</Text>
            <Text style={styles.metricSubGreen}>📈 +12.4% vs previous 30 day window</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>AVG SKILL MATCH</Text>
              <View style={styles.iconBoxGreen}>
                <Text style={styles.metricIcon}>🎯</Text>
              </View>
            </View>
            <View style={styles.valBadgeRow}>
              <Text style={styles.metricValue}>84%</Text>
              <View style={styles.strongFitPill}>
                <Text style={styles.strongFitPillText}>Strong Fit</Text>
              </View>
            </View>
            <Text style={styles.metricSub}>Verified benchmark across applicants</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>SHORTLIST RATE</Text>
              <View style={styles.iconBoxTeal}>
                <Text style={styles.metricIcon}>📋</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>17.0% <Text style={styles.metricValueSub}>(212)</Text></Text>
            <Text style={styles.metricSub}>212 students shortlisted</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>INTERVIEW RATE</Text>
              <View style={styles.iconBoxBlue}>
                <Text style={styles.metricIcon}>💼</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>8.0% <Text style={styles.metricValueSub}>(100)</Text></Text>
            <Text style={styles.metricSub}>100 scheduled evaluation rounds</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>SELECTION RATE</Text>
              <View style={styles.iconBoxTeal}>
                <Text style={styles.metricIcon}>🎓</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>4.0% <Text style={styles.metricValueSub}>(50)</Text></Text>
            <Text style={styles.metricSub}>50 offers accepted • 4.0% conv</Text>
          </HoverCard>
        </View>

        {/* 2-Column Analytics Charts Row */}
        <View style={[styles.twoColGrid, isCompact && styles.twoColGridCompact]}>
          {/* Chart 1: Applications Over Time */}
          <HoverCard style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Applications Over Time</Text>
                <Text style={styles.chartSub}>Track student application volume and progression velocity.</Text>
              </View>
              <View style={styles.chartTabsRight}>
                <View style={styles.chartTabActive}><Text style={styles.chartTabTextActive}>Applications</Text></View>
                <View style={styles.chartTab}><Text style={styles.chartTabText}>Shortlisted</Text></View>
                <View style={styles.chartTab}><Text style={styles.chartTabText}>Interviews</Text></View>
                <View style={styles.chartTab}><Text style={styles.chartTabText}>Selected</Text></View>
              </View>
            </View>

            {/* Peak Callout Banner */}
            <View style={styles.peakCallout}>
              <Text style={styles.peakCalloutText}>
                📌 Peak Day: Sep 02 • 124 Applications (Pool 12 & BITS Campus Drive Launch)
              </Text>
            </View>

            {/* Visual Applications Wave Chart Mock */}
            <View style={styles.visualGraphBox}>
              <View style={styles.graphPeakMarker}>
                <View style={styles.greenDot} />
                <Text style={styles.graphPeakText}>Sep 02 (124 apps)</Text>
              </View>

              <View style={styles.graphPolylineSvgMock}>
                {/* Visual Area Wave Shape */}
                <View style={styles.waveFillArea} />
                <View style={styles.waveLine} />
              </View>

              <View style={styles.graphXAxisLabels}>
                <Text style={styles.xAxisLabel}>Aug 15</Text>
                <Text style={styles.xAxisLabel}>Aug 22</Text>
                <Text style={styles.xAxisLabel}>Aug 29</Text>
                <Text style={styles.xAxisLabel}>Sep 02 (Peak)</Text>
                <Text style={styles.xAxisLabel}>Sep 05</Text>
                <Text style={styles.xAxisLabel}>Sep 10</Text>
                <Text style={styles.xAxisLabel}>Sep 15 (Today)</Text>
              </View>
            </View>

            <View style={styles.chartFooterRow}>
              <Text style={styles.chartFooterText}>Average: 41.6 Applications/day</Text>
              <Text style={styles.chartFooterLink}>View Daily Log Breakdown ➔</Text>
            </View>
          </HoverCard>

          {/* Chart 2: Application Funnel & Conversion */}
          <HoverCard style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Application Funnel & Conversion</Text>
                <Text style={styles.chartSub}>Stage progression efficiency through the hiring pipeline.</Text>
              </View>
              <View style={styles.overallConvBadge}>
                <Text style={styles.overallConvBadgeText}>Overall Conv: 2.5%</Text>
              </View>
            </View>

            <View style={styles.funnelList}>
              <View style={styles.funnelItem}>
                <View style={styles.funnelHeaderRow}>
                  <Text style={styles.funnelTitle}>1. Applications Received</Text>
                  <Text style={styles.funnelVal}>1,248 (100%)</Text>
                </View>
                <View style={styles.funnelTrack}><View style={[styles.funnelFill, { width: '100%' }]} /></View>
                <Text style={styles.funnelDropoff}>Drop off: 28.5% (Eligibility & Criteria)</Text>
              </View>

              <View style={styles.funnelItem}>
                <View style={styles.funnelHeaderRow}>
                  <Text style={styles.funnelTitle}>2. Eligibility Verified</Text>
                  <Text style={styles.funnelVal}>892 (71.5%)</Text>
                </View>
                <View style={styles.funnelTrack}><View style={[styles.funnelFill, { width: '71.5%' }]} /></View>
                <Text style={styles.funnelDropoff}>Drop off: 38.3% (Skill & Audit Score Below 75 Cutoff)</Text>
              </View>

              <View style={styles.funnelItem}>
                <View style={styles.funnelHeaderRow}>
                  <Text style={styles.funnelTitle}>3. AI Auto-Score Screened</Text>
                  <Text style={styles.funnelVal}>550 (44.1%)</Text>
                </View>
                <View style={styles.funnelTrack}><View style={[styles.funnelFill, { width: '44.1%' }]} /></View>
                <Text style={styles.funnelDropoff}>Shortlist conversion: 25.8%</Text>
              </View>

              <View style={styles.funnelItem}>
                <View style={styles.funnelHeaderRow}>
                  <Text style={styles.funnelTitle}>4. Shortlisted Candidates</Text>
                  <Text style={styles.funnelVal}>142 (11.4%)</Text>
                </View>
                <View style={styles.funnelTrack}><View style={[styles.funnelFill, { width: '25.8%' }]} /></View>
                <Text style={styles.funnelDropoff}>Conversion to interview: 61.9%</Text>
              </View>

              <View style={styles.funnelItem}>
                <View style={styles.funnelHeaderRow}>
                  <Text style={styles.funnelTitle}>5. Live Interviews Conducted</Text>
                  <Text style={styles.funnelVal}>88 (7.1%)</Text>
                </View>
                <View style={styles.funnelTrack}><View style={[styles.funnelFill, { width: '16.1%' }]} /></View>
                <Text style={styles.funnelDropoff}>Interview offer rate: 59.1%</Text>
              </View>

              <View style={styles.funnelItem}>
                <View style={styles.funnelHeaderRow}>
                  <Text style={styles.funnelTitle}>6. Selected & Offered</Text>
                  <Text style={styles.funnelValHighlight}>52 Students (4.16%)</Text>
                </View>
                <View style={styles.funnelTrack}><View style={[styles.funnelFillHighlight, { width: '10%' }]} /></View>
              </View>
            </View>

            <View style={styles.funnelFooterRow}>
              <Text style={styles.funnelFooterText}>Target capacity: 65 / 40 seats filled</Text>
              <Text style={styles.funnelFooterPct}>80% of hiring goal</Text>
            </View>
          </HoverCard>
        </View>

        {/* Internship Performance Breakdown Table */}
        <HoverCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardSectionTitle}>Internship Performance Breakdown</Text>
              <Text style={styles.cardSectionSub}>Granular volume and funnel metrics across all active and open role postings.</Text>
            </View>
            <View style={styles.filterByDeptBtn}>
              <Text style={styles.filterByDeptBtnText}>Filter by Department ▼</Text>
            </View>
          </View>

          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, { flex: 2 }]}>INTERNSHIP ROLE</Text>
            <Text style={styles.thText}>APPLICATIONS</Text>
            <Text style={styles.thText}>SHORTLISTED</Text>
            <Text style={styles.thText}>INTERVIEWS</Text>
            <Text style={styles.thText}>SELECTED</Text>
            <Text style={styles.thText}>SELECTION RATE</Text>
            <Text style={styles.thText}>AVG SKILL MATCH</Text>
            <Text style={[styles.thText, { textAlign: 'right' }]}>ACTIONS</Text>
          </View>

          {[
            { tag: 'BD', title: 'Backend Development Intern', dept: 'Engineering • 6 Openings • ₹35,000/mo', apps: 164, short: 32, int: 12, sel: 6, rate: '3.7%', match: '86%', color: '#004D40' },
            { tag: 'AI', title: 'AI / ML Intern', dept: 'Research & Dev • 4 Openings • ₹40,000/mo', apps: 124, short: 24, int: 9, sel: 5, rate: '4.0%', color: '#7C3AED', match: '88%' },
            { tag: 'FE', title: 'Frontend Development Intern', dept: 'Product Engineering • 3 Openings • ₹30,000/mo', apps: 95, short: 18, int: 7, sel: 4, rate: '4.2%', color: '#2563EB', match: '82%' },
            { tag: 'DA', title: 'Data Analytics Intern', dept: 'Business Intelligence • 2 Openings • ₹28,000/mo', apps: 115, short: 19, int: 6, sel: 5, rate: '4.3%', color: '#D97706', match: '81%' },
          ].map((row, idx) => (
            <View key={idx} style={styles.tableBodyRow}>
              <View style={[styles.tableRoleCol, { flex: 2 }]}>
                <View style={[styles.roleTagIcon, { backgroundColor: row.color }]}>
                  <Text style={styles.roleTagIconText}>{row.tag}</Text>
                </View>
                <View>
                  <Text style={styles.roleTitleText}>{row.title}</Text>
                  <Text style={styles.roleDeptText}>{row.dept}</Text>
                </View>
              </View>
              <Text style={styles.tdText}>{row.apps}</Text>
              <Text style={styles.tdText}>{row.short}</Text>
              <Text style={styles.tdText}>{row.int}</Text>
              <Text style={styles.tdText}>{row.sel}</Text>
              <Text style={styles.tdGreen}>{row.rate}</Text>
              <View style={styles.tdMatchCol}>
                <View style={styles.matchBarTrack}><View style={[styles.matchBarFill, { width: row.match }]} /></View>
                <Text style={styles.tdMatchText}>{row.match}</Text>
              </View>
              <Pressable style={styles.viewDetailsBtn}>
                <Text style={styles.viewDetailsBtnText}>View Details ›</Text>
              </Pressable>
            </View>
          ))}
        </HoverCard>

        {/* 2-Column Row: Skill Insights & Required Skills vs Availability */}
        <View style={[styles.twoColGrid, isCompact && styles.twoColGridCompact]}>
          {/* Skill Insights */}
          <HoverCard style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardSectionTitle}>Skill Insights — Top Skills Among Applicants</Text>
                <Text style={styles.cardSectionSub}>Distribution of verified competencies across 1,248 applicant profiles.</Text>
              </View>
              <View style={styles.verifiedSkillsBadge}>
                <Text style={styles.verifiedSkillsBadgeText}>Verified Skills Only</Text>
              </View>
            </View>

            {[
              { skill: 'Python (FastAPI / Django)', pct: '68%', count: '848 students', width: '68%', color: COLORS.primaryTeal },
              { skill: 'SQL & PostgreSQL Database', pct: '56%', count: '698 students', width: '56%', color: COLORS.primaryTeal },
              { skill: 'React & Node.js', pct: '48%', count: '599 students', width: '48%', color: COLORS.primaryTeal },
              { skill: 'JavaScript / TypeScript', pct: '45%', count: '561 students', width: '45%', color: COLORS.primaryTeal },
              { skill: 'Machine Learning & PyTorch', pct: '28%', count: '350 students', width: '28%', color: COLORS.primaryTeal },
              { skill: 'AWS Cloud Architecture', pct: '27%', count: '336 students', width: '27%', color: '#D97706' },
              { skill: 'Docker & Containerization', pct: '22%', count: '274 students', width: '22%', color: '#DC2626' },
            ].map((item, idx) => (
              <View key={idx} style={styles.skillInsightItem}>
                <View style={styles.skillInsightLabelRow}>
                  <Text style={styles.skillInsightName}>{item.skill}</Text>
                  <Text style={styles.skillInsightCount}>{item.pct} <Text style={styles.skillInsightSubCount}>({item.count})</Text></Text>
                </View>
                <View style={styles.skillInsightTrack}>
                  <View style={[styles.skillInsightFill, { width: item.width, backgroundColor: item.color }]} />
                </View>
              </View>
            ))}
          </HoverCard>

          {/* Required Skills vs Student Availability */}
          <HoverCard style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardSectionTitle}>Required Skills vs. Student Availability</Text>
                <Text style={styles.cardSectionSub}>Company required role competencies vs. real-world applicant pool depth.</Text>
              </View>
              <View style={styles.criticalGapsBadge}>
                <Text style={styles.criticalGapsBadgeText}>1 Critical Gap</Text>
              </View>
            </View>

            <View style={styles.reqTableTh}>
              <Text style={[styles.reqThText, { flex: 2 }]}>SKILL / TECH</Text>
              <Text style={styles.reqThText}>REQUIRED BY ROLE</Text>
              <Text style={styles.reqThText}>STUDENT SUPPLY</Text>
              <Text style={[styles.reqThText, { textAlign: 'right' }]}>POOL STATUS</Text>
            </View>

            {[
              { skill: 'Python', req: '✓ Mandatory', supply: '68% of candidates', status: 'Surplus Supply', badgeStyle: styles.badgeGreen },
              { skill: 'SQL / PostgreSQL', req: '✓ Mandatory', supply: '56% of candidates', status: 'Balanced Fit', badgeStyle: styles.badgeGreen },
              { skill: 'Docker', req: '✓ Preferred', supply: '22% of candidates', status: '⚠ 8% Deficit', badgeStyle: styles.badgeAmber },
              { skill: 'AWS Cloud Services', req: '✓ Preferred', supply: '27% of candidates', status: '⚠ Moderate Gap', badgeStyle: styles.badgeAmber },
              { skill: 'Kubernetes', req: '✓ Nice to have', supply: '9% of candidates', status: '🚨 Critical Gap', badgeStyle: styles.badgeRed },
            ].map((row, idx) => (
              <View key={idx} style={styles.reqTableTr}>
                <Text style={[styles.reqTdSkill, { flex: 2 }]}>{row.skill}</Text>
                <Text style={styles.reqTdText}>{row.req}</Text>
                <Text style={styles.reqTdText}>{row.supply}</Text>
                <View style={[styles.poolStatusBadge, row.badgeStyle]}>
                  <Text style={styles.poolStatusText}>{row.status}</Text>
                </View>
              </View>
            ))}

            <View style={styles.recTipBox}>
              <Text style={styles.recTipText}>
                💡 <Text style={styles.recTipBold}>Recruiter Tip:</Text> Relaxing Kubernetes to "In-training capability" increases the qualified applicant shortlist pool by 34%.
              </Text>
            </View>
          </HoverCard>
        </View>

        {/* 2-Column Row: Skill Match Distribution & AI Screening Overview */}
        <View style={[styles.twoColGrid, isCompact && styles.twoColGridCompact]}>
          {/* Skill Match Distribution */}
          <HoverCard style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardSectionTitle}>Skill Match Distribution</Text>
                <Text style={styles.cardSectionSub}>Breakdown of applicant compatibility across 5 scoring tiers.</Text>
              </View>
              <View style={styles.highlyQualifiedBadge}>
                <Text style={styles.highlyQualifiedBadgeText}>224 Highly Qualified (72%)</Text>
              </View>
            </View>

            {[
              { tier: '90% - 100% (Exceptional Match)', count: '88 Students', pct: '(28.4%)', width: '70%', color: COLORS.primaryTeal },
              { tier: '80% - 89% (Strong Fit)', count: '136 Students', pct: '(43.8%)', width: '90%', color: COLORS.primaryTeal },
              { tier: '70% - 79% (Good Match)', count: '83 Students', pct: '(26.7%)', width: '55%', color: COLORS.primaryTeal },
              { tier: '60% - 69% (Moderate Alignment)', count: '41 Students', pct: '(13.2%)', width: '30%', color: '#D97706' },
              { tier: 'Below 60% (Low Relevance)', count: '15 Students', pct: '(5.2%)', width: '12%', color: '#DC2626' },
            ].map((tier, idx) => (
              <View key={idx} style={styles.distItem}>
                <View style={styles.distLabelRow}>
                  <Text style={styles.distTierName}>{tier.tier}</Text>
                  <Text style={styles.distCount}>{tier.count} <Text style={styles.distSubPct}>{tier.pct}</Text></Text>
                </View>
                <View style={styles.distTrack}>
                  <View style={[styles.distFill, { width: tier.width, backgroundColor: tier.color }]} />
                </View>
              </View>
            ))}
          </HoverCard>

          {/* AI Screening Overview */}
          <HoverCard style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardSectionTitle}>AI Screening Overview</Text>
                <Text style={styles.cardSectionSub}>Autonomous profile analysis & score portfolio verification.</Text>
              </View>
              <View style={styles.screenedCountBox}>
                <Text style={styles.screenedCountVal}>892</Text>
                <Text style={styles.screenedCountSub}>PROFILES SCREENED</Text>
              </View>
            </View>

            <View style={styles.aiHumanNoticeBox}>
              <Text style={styles.aiHumanNoticeText}>
                🤖 Human-in-the-loop SkillSetu AI serves as an evaluation assistant. Recruiters maintain final decision-making control.
              </Text>
            </View>

            <Text style={styles.screeningBreakdownLabel}>Screening Outcome Breakdown <Text style={styles.screeningSub}>(892 Total Screened, 0 Avg Errors)</Text></Text>
            
            {/* Visual Outcome Meter Bar */}
            <View style={styles.outcomeBarTrack}>
              <View style={[styles.outcomeBarPassed, { width: '45.5%' }]} />
              <View style={[styles.outcomeBarFlagged, { width: '32.9%' }]} />
              <View style={[styles.outcomeBarFailed, { width: '21.6%' }]} />
            </View>

            <View style={styles.outcomeMetricsGrid}>
              <View style={styles.outcomeCardGreen}>
                <Text style={styles.outcomeCardValGreen}>406</Text>
                <Text style={styles.outcomeCardTitleGreen}>Passed</Text>
                <Text style={styles.outcomeCardSubGreen}>≥80% match score</Text>
              </View>
              <View style={styles.outcomeCardAmber}>
                <Text style={styles.outcomeCardValAmber}>294</Text>
                <Text style={styles.outcomeCardTitleAmber}>Flagged</Text>
                <Text style={styles.outcomeCardSubAmber}>60-79% manual review</Text>
              </View>
              <View style={styles.outcomeCardRed}>
                <Text style={styles.outcomeCardValRed}>192</Text>
                <Text style={styles.outcomeCardTitleRed}>Not Qualified</Text>
                <Text style={styles.outcomeCardSubRed}>&lt;60% below cutoff</Text>
              </View>
            </View>

            <View style={styles.auditAccuracyRow}>
              <Text style={styles.auditAccuracyText}>Audit accuracy: 99.4% confirmation</Text>
              <Text style={styles.auditAccuracyLink}>Configure Screening Rubric ➔</Text>
            </View>
          </HoverCard>
        </View>

        {/* 3-Column Row: Demographics & Education */}
        <View style={[styles.threeColGrid, isCompact && styles.twoColGridCompact]}>
          {/* Card 1: Student Education Insights */}
          <HoverCard style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>Student Education Insights</Text>
            <Text style={styles.cardSectionSub}>Degree & branch distribution of students.</Text>

            <Text style={styles.demoLabel}>DEGREE / DEGREE CLUB</Text>
            <View style={styles.demoRow}><Text style={styles.demoName}>B.Tech</Text><Text style={styles.demoVal}>62%</Text></View>
            <View style={styles.demoRow}><Text style={styles.demoName}>B.E.</Text><Text style={styles.demoVal}>18%</Text></View>
            <View style={styles.demoRow}><Text style={styles.demoName}>BCA</Text><Text style={styles.demoVal}>9%</Text></View>
            <View style={styles.demoRow}><Text style={styles.demoName}>MCA / M.Tech / Other</Text><Text style={styles.demoVal}>11%</Text></View>

            <Text style={[styles.demoLabel, { marginTop: 14 }]}>BRANCH / MAJOR</Text>
            <View style={styles.tagsFlexRow}>
              <View style={styles.tagPill}><Text style={styles.tagPillText}>CSE (54%)</Text></View>
              <View style={styles.tagPill}><Text style={styles.tagPillText}>IT (22%)</Text></View>
              <View style={styles.tagPill}><Text style={styles.tagPillText}>ECE (14%)</Text></View>
              <View style={styles.tagPill}><Text style={styles.tagPillText}>Mech / Others (10%)</Text></View>
            </View>
          </HoverCard>

          {/* Card 2: Top Colleges by Applications */}
          <HoverCard style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>Top Colleges by Applications</Text>
            <Text style={styles.cardSectionSub}>Highest engagement university partners.</Text>

            {[
              { name: 'IIT Roorkee', count: '84 applications • 89% avg match', shortlisted: '10 Shortlisted' },
              { name: 'BITS Pilani', count: '72 applications • 86% avg match', shortlisted: '12 Shortlisted' },
              { name: 'VJTI Mumbai', count: '61 applications • 82% avg match', shortlisted: '9 Shortlisted' },
              { name: 'COEP Pune', count: '54 applications • 80% avg match', shortlisted: '8 Shortlisted' },
            ].map((col, idx) => (
              <View key={idx} style={styles.collegeRow}>
                <View>
                  <Text style={styles.collegeName}>{col.name}</Text>
                  <Text style={styles.collegeMeta}>{col.count}</Text>
                </View>
                <View style={styles.collegeBadge}>
                  <Text style={styles.collegeBadgeText}>{col.shortlisted}</Text>
                </View>
              </View>
            ))}

            <Pressable style={styles.viewAllCampusesLink}>
              <Text style={styles.viewAllCampusesLinkText}>View All 42 Partner Campuses ➔</Text>
            </Pressable>
          </HoverCard>

          {/* Card 3: Applicants by Location */}
          <HoverCard style={styles.sectionCard}>
            <Text style={styles.cardSectionTitle}>Applicants by Location</Text>
            <Text style={styles.cardSectionSub}>Geographic distribution of talent pool.</Text>

            <View style={styles.demoRow}><Text style={styles.demoName}>Mumbai Metropolitan</Text><Text style={styles.demoVal}>26% (325)</Text></View>
            <View style={styles.demoRow}><Text style={styles.demoName}>Pune Tech Hub</Text><Text style={styles.demoVal}>19% (238)</Text></View>
            <View style={styles.demoRow}><Text style={styles.demoName}>Bengaluru</Text><Text style={styles.demoVal}>15% (187)</Text></View>
            <View style={styles.demoRow}><Text style={styles.demoName}>Delhi NCR</Text><Text style={styles.demoVal}>12% (150)</Text></View>
            <View style={styles.demoRow}><Text style={styles.demoName}>Other Regions (Pan-India)</Text><Text style={styles.demoVal}>28% (348)</Text></View>

            <View style={styles.relocationBox}>
              <Text style={styles.relocationText}>Relocation Flexibility: 78% Open  •  Hybrid Ready</Text>
            </View>
          </HoverCard>
        </View>

        {/* 2-Column Row: Interview Insights & Selection Velocity */}
        <View style={[styles.twoColGrid, isCompact && styles.twoColGridCompact]}>
          {/* Interview Insights */}
          <HoverCard style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardSectionTitle}>Interview Insights</Text>
                <Text style={styles.cardSectionSub}>Evaluation room outcomes, attendance and feedback speed.</Text>
              </View>
              <View style={styles.feedbackSpeedBadge}>
                <Text style={styles.feedbackSpeedBadgeText}>92% Feedback Speed</Text>
              </View>
            </View>

            <View style={styles.interviewMetricsRow}>
              <View style={styles.intMetricBox}>
                <Text style={styles.intMetricVal}>68</Text>
                <Text style={styles.intMetricLabel}>SCHEDULED</Text>
                <Text style={styles.intMetricSub}>Live Rooms & Sandbox</Text>
              </View>

              <View style={styles.intMetricBox}>
                <Text style={styles.intMetricVal}>62</Text>
                <Text style={styles.intMetricLabel}>COMPLETED</Text>
                <Text style={styles.intMetricSubGreen}>91.2% Attendance</Text>
              </View>

              <View style={styles.intMetricBox}>
                <Text style={styles.intMetricVal}>84 <Text style={styles.intMetricValSub}>/ 100</Text></Text>
                <Text style={styles.intMetricLabel}>AVG SCORE</Text>
                <Text style={styles.intMetricSub}>Scorecard Benchmark</Text>
              </View>
            </View>

            <Text style={styles.verdictHeader}>Interview Recommendation Verdicts</Text>

            <View style={styles.verdictRow}>
              <View style={styles.verdictDotGreen} />
              <Text style={styles.verdictLabel}>Recommended for Selection</Text>
              <Text style={styles.verdictValGreen}>76% (47 students)</Text>
            </View>

            <View style={styles.verdictRow}>
              <View style={styles.verdictDotRed} />
              <Text style={styles.verdictLabel}>Not Recommended / Culture Mismatch</Text>
              <Text style={styles.verdictValRed}>24% (15 students)</Text>
            </View>

            <View style={styles.manageRoomsFooterRow}>
              <Text style={styles.manageRoomsSub}>No-shows / Cancelled: 6 sessions (8.8%)</Text>
              <Text style={styles.manageRoomsLink}>Manage Evaluation Rooms ➔</Text>
            </View>
          </HoverCard>

          {/* Selection Timeline & Velocity */}
          <HoverCard style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardSectionTitle}>Selection Timeline & Velocity</Text>
                <Text style={styles.cardSectionSub}>Speed metrics from initial application to final offer issuance.</Text>
              </View>
              <View style={styles.velocityBadge}>
                <Text style={styles.velocityBadgeText}>⚡ 2.4 Days Faster</Text>
              </View>
            </View>

            <View style={styles.velocityHeroBox}>
              <View style={styles.velocityLeft}>
                <Text style={styles.velocityHeroTitle}>Total Average Internship Hiring Cycle</Text>
                <Text style={styles.velocityHeroSub}>Compared to 9.7 day benchmark across Technology recruiters</Text>
              </View>
              <View style={styles.velocityHeroValBox}>
                <Text style={styles.velocityHeroVal}>7.3</Text>
                <Text style={styles.velocityHeroValUnit}>Days</Text>
              </View>
            </View>

            {/* Velocity Stepper Audit */}
            <View style={styles.velocityStepper}>
              <View style={styles.velocityStep}>
                <View style={styles.velocityStepNum}><Text style={styles.velocityStepNumText}>1</Text></View>
                <View style={styles.velocityStepTextCol}>
                  <Text style={styles.velocityStepTitle}>Application ➔ Shortlist</Text>
                  <Text style={styles.velocityStepSub}>AI auto-audits resume screening & code proof evaluation</Text>
                </View>
                <Text style={styles.velocityStepTime}>3.4 Days</Text>
              </View>

              <View style={styles.velocityStep}>
                <View style={styles.velocityStepNum}><Text style={styles.velocityStepNumText}>2</Text></View>
                <View style={styles.velocityStepTextCol}>
                  <Text style={styles.velocityStepTitle}>Shortlist ➔ Interview Conducted</Text>
                  <Text style={styles.velocityStepSub}>Automated Google Meet calendar slot & Live Sandbox</Text>
                </View>
                <Text style={styles.velocityStepTime}>2.1 Days</Text>
              </View>

              <View style={styles.velocityStep}>
                <View style={styles.velocityStepNum}><Text style={styles.velocityStepNumText}>3</Text></View>
                <View style={styles.velocityStepTextCol}>
                  <Text style={styles.velocityStepTitle}>Interview ➔ Offer Acceptance</Text>
                  <Text style={styles.velocityStepSub}>Scorecard final review and offer letter release</Text>
                </View>
                <Text style={styles.velocityStepTime}>1.8 Days</Text>
              </View>
            </View>

            <View style={styles.velocityFooterRow}>
              <Text style={styles.velocityTargetText}>Target goal: &lt; 8.0 days</Text>
              <Text style={styles.velocityRankText}>Within Top 15% on SkillSetu</Text>
            </View>
          </HoverCard>
        </View>

        {/* SkillSetu Intelligence & Recommendations Footer Banner */}
        <View style={styles.intelligenceBannerCard}>
          <View style={styles.intelligenceHeaderRow}>
            <View style={styles.intelligenceTitleRow}>
              <Text style={styles.intelligenceIcon}>✨</Text>
              <View>
                <Text style={styles.intelligenceTitle}>SkillSetu Intelligence & Recommendations</Text>
                <Text style={styles.intelligenceSub}>Continuous automated talent pool analysis and pipeline optimization insights for TechNova.</Text>
              </View>
            </View>
            <HoverButton style={styles.recalculateBtn} onPress={() => {}}>
              <Text style={styles.recalculateBtnText}>Recalculate Insights</Text>
            </HoverButton>
          </View>

          <View style={styles.intelligenceGrid}>
            <View style={styles.intelligenceItemCard}>
              <Text style={styles.itemCardIcon}>📈</Text>
              <Text style={styles.itemCardTitle}>Campus Outreach Surge</Text>
              <Text style={styles.itemCardDesc}>
                Your Backend Development Internship received 42% more applications this month following the campus outreach integration.
              </Text>
              <View style={styles.itemCardStatusBadge}>
                <Text style={styles.itemCardStatusText}>Status: Active Campus Pipeline</Text>
              </View>
            </View>

            <View style={styles.intelligenceItemCard}>
              <Text style={styles.itemCardIcon}>⚙️</Text>
              <Text style={styles.itemCardTitle}>Cloud Training Gap</Text>
              <Text style={styles.itemCardDesc}>
                Docker and Kubernetes represent the most frequent verified skill gap among your applicants (only 22% verified).
              </Text>
              <View style={styles.itemCardStatusBadgeAmber}>
                <Text style={styles.itemCardStatusTextAmber}>Action: Adjust rubric to on-job training</Text>
              </View>
            </View>

            <View style={styles.intelligenceItemCard}>
              <Text style={styles.itemCardIcon}>🎯</Text>
              <Text style={styles.itemCardTitle}>High-Pass Tech Stack</Text>
              <Text style={styles.itemCardDesc}>
                Candidates with verified Python + SQL + FastAPI demonstrate a 94.6% higher technical round pass rate in live sandbox tests.
              </Text>
              <View style={styles.itemCardStatusBadge}>
                <Text style={styles.itemCardStatusText}>Recommendation: Prioritize this combination</Text>
              </View>
            </View>

            <View style={styles.intelligenceItemCard}>
              <Text style={styles.itemCardIcon}>⚡</Text>
              <Text style={styles.itemCardTitle}>Velocity Acceleration</Text>
              <Text style={styles.itemCardDesc}>
                Average application to interview turnaround dropped to 5.5 days for candidates screened via AI automated assessments.
              </Text>
              <View style={styles.itemCardStatusBadgeGreen}>
                <Text style={styles.itemCardStatusTextGreen}>Velocity Gain: 2.4 Days saved</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },

  // Header Section
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 16,
  },
  breadcrumb: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: COLORS.primaryTeal,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeDropdown: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  exportBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Control Bar
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  controlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  controlLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  roleFilterDropdown: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  liveEnvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mintBadge,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentGreen,
  },
  liveEnvBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mintBadgeText,
  },
  controlRight: {},
  syncStatusText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  iconBoxTeal: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.mintBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxGreen: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxBlue: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.blueBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  metricValueSub: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  valBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strongFitPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  strongFitPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  metricSubGreen: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accentGreen,
  },

  // Grids
  twoColGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  twoColGridCompact: {
    flexDirection: 'column',
  },
  threeColGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },

  // Chart Cards
  chartCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  chartSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chartTabsRight: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 2,
  },
  chartTabActive: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  chartTabTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  chartTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chartTabText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  peakCallout: {
    backgroundColor: COLORS.mintBg,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  peakCalloutText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },

  // Visual Graph Mock
  visualGraphBox: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  graphPeakMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  graphPeakText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  graphPolylineSvgMock: {
    height: 100,
    justifyContent: 'flex-end',
  },
  waveFillArea: {
    height: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 40,
  },
  waveLine: {
    height: 3,
    backgroundColor: COLORS.primaryTeal,
    marginTop: -70,
  },
  graphXAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  chartFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartFooterText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  chartFooterLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },

  // Funnel
  overallConvBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overallConvBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  funnelList: {
    gap: 12,
    marginBottom: 16,
  },
  funnelItem: {},
  funnelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  funnelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  funnelVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  funnelValHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  funnelTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  funnelFill: {
    height: '100%',
    backgroundColor: COLORS.primaryTeal,
  },
  funnelFillHighlight: {
    height: '100%',
    backgroundColor: COLORS.accentGreen,
  },
  funnelDropoff: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  funnelFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  funnelFooterText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  funnelFooterPct: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },

  // Section Cards General
  sectionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  cardSectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  filterByDeptBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterByDeptBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },

  // Table
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  thText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRoleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleTagIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleTagIconText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  roleTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  roleDeptText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tdText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMain,
  },
  tdGreen: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accentGreen,
  },
  tdMatchCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchBarTrack: {
    width: 50,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  matchBarFill: {
    height: '100%',
    backgroundColor: COLORS.primaryTeal,
  },
  tdMatchText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  viewDetailsBtn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  viewDetailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },

  // Skill Insights
  verifiedSkillsBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedSkillsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  skillInsightItem: {
    marginBottom: 12,
  },
  skillInsightLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  skillInsightName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  skillInsightCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  skillInsightSubCount: {
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  skillInsightTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillInsightFill: {
    height: '100%',
  },

  // Required Skills vs Availability
  criticalGapsBadge: {
    backgroundColor: COLORS.redBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  criticalGapsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.redText,
  },
  reqTableTh: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  reqThText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  reqTableTr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reqTdSkill: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  reqTdText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  poolStatusBadge: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'flex-end',
  },
  badgeGreen: { backgroundColor: '#DCFCE7' },
  badgeAmber: { backgroundColor: COLORS.amberBg },
  badgeRed: { backgroundColor: COLORS.redBg },
  poolStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  recTipBox: {
    marginTop: 14,
    backgroundColor: COLORS.blueBg,
    padding: 10,
    borderRadius: 8,
  },
  recTipText: {
    fontSize: 11,
    color: COLORS.blueText,
    lineHeight: 16,
  },
  recTipBold: {
    fontWeight: '800',
  },

  // Distribution
  highlyQualifiedBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  highlyQualifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  distItem: {
    marginBottom: 12,
  },
  distLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distTierName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  distCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  distSubPct: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  distTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
  },

  // AI Screening
  screenedCountBox: {
    alignItems: 'flex-end',
  },
  screenedCountVal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  screenedCountSub: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  aiHumanNoticeBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  aiHumanNoticeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  screeningBreakdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 8,
  },
  screeningSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  outcomeBarTrack: {
    height: 12,
    flexDirection: 'row',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  outcomeBarPassed: { backgroundColor: COLORS.accentGreen },
  outcomeBarFlagged: { backgroundColor: '#F59E0B' },
  outcomeBarFailed: { backgroundColor: '#EF4444' },

  outcomeMetricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  outcomeCardGreen: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 8,
  },
  outcomeCardValGreen: { fontSize: 18, fontWeight: '800', color: '#15803D' },
  outcomeCardTitleGreen: { fontSize: 11, fontWeight: '700', color: '#166534' },
  outcomeCardSubGreen: { fontSize: 10, color: '#166534' },

  outcomeCardAmber: {
    flex: 1,
    backgroundColor: COLORS.amberBg,
    padding: 10,
    borderRadius: 8,
  },
  outcomeCardValAmber: { fontSize: 18, fontWeight: '800', color: '#92400E' },
  outcomeCardTitleAmber: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  outcomeCardSubAmber: { fontSize: 10, color: '#92400E' },

  outcomeCardRed: {
    flex: 1,
    backgroundColor: COLORS.redBg,
    padding: 10,
    borderRadius: 8,
  },
  outcomeCardValRed: { fontSize: 18, fontWeight: '800', color: COLORS.redText },
  outcomeCardTitleRed: { fontSize: 11, fontWeight: '700', color: COLORS.redText },
  outcomeCardSubRed: { fontSize: 10, color: COLORS.redText },

  auditAccuracyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  auditAccuracyText: { fontSize: 11, color: COLORS.textMuted },
  auditAccuracyLink: { fontSize: 11, fontWeight: '700', color: COLORS.primaryTeal },

  // Demographics 3-Col
  demoLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5, marginTop: 10, marginBottom: 6 },
  demoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  demoName: { fontSize: 12, color: COLORS.textMain },
  demoVal: { fontSize: 12, fontWeight: '700', color: COLORS.textMain },

  tagsFlexRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: { backgroundColor: COLORS.mintBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagPillText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryTeal },

  collegeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  collegeName: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
  collegeMeta: { fontSize: 11, color: COLORS.textMuted },
  collegeBadge: { backgroundColor: COLORS.mintBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  collegeBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryTeal },
  viewAllCampusesLink: { alignItems: 'center', paddingTop: 10 },
  viewAllCampusesLinkText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryTeal },

  relocationBox: { marginTop: 14, backgroundColor: '#F1F5F9', padding: 8, borderRadius: 6, alignItems: 'center' },
  relocationText: { fontSize: 11, fontWeight: '600', color: COLORS.textMain },

  // Interview Insights
  feedbackSpeedBadge: { backgroundColor: COLORS.mintBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  feedbackSpeedBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryTeal },
  interviewMetricsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  intMetricBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  intMetricVal: { fontSize: 20, fontWeight: '800', color: COLORS.textMain },
  intMetricValSub: { fontSize: 12, color: COLORS.textMuted },
  intMetricLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, marginVertical: 2 },
  intMetricSub: { fontSize: 10, color: COLORS.textMuted },
  intMetricSubGreen: { fontSize: 10, fontWeight: '700', color: COLORS.accentGreen },

  verdictHeader: { fontSize: 12, fontWeight: '700', color: COLORS.textMain, marginBottom: 8 },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  verdictDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accentGreen },
  verdictDotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  verdictLabel: { flex: 1, fontSize: 12, color: COLORS.textMain },
  verdictValGreen: { fontSize: 12, fontWeight: '700', color: COLORS.accentGreen },
  verdictValRed: { fontSize: 12, fontWeight: '700', color: COLORS.redText },

  manageRoomsFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 10 },
  manageRoomsSub: { fontSize: 11, color: COLORS.textMuted },
  manageRoomsLink: { fontSize: 11, fontWeight: '700', color: COLORS.primaryTeal },

  // Velocity
  velocityBadge: { backgroundColor: COLORS.mintBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  velocityBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryTeal },
  velocityHeroBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  velocityLeft: { flex: 1 },
  velocityHeroTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
  velocityHeroSub: { fontSize: 11, color: COLORS.textMuted },
  velocityHeroValBox: { alignItems: 'center' },
  velocityHeroVal: { fontSize: 28, fontWeight: '900', color: COLORS.primaryTeal },
  velocityHeroValUnit: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },

  velocityStepper: { gap: 10, marginBottom: 14 },
  velocityStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  velocityStepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primaryTeal, justifyContent: 'center', alignItems: 'center' },
  velocityStepNumText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  velocityStepTextCol: { flex: 1 },
  velocityStepTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMain },
  velocityStepSub: { fontSize: 10, color: COLORS.textMuted },
  velocityStepTime: { fontSize: 12, fontWeight: '700', color: COLORS.primaryTeal },

  velocityFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  velocityTargetText: { fontSize: 11, color: COLORS.textMuted },
  velocityRankText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryTeal },

  // Intelligence Footer Banner
  intelligenceBannerCard: {
    backgroundColor: COLORS.darkBannerBg,
    borderRadius: 16,
    padding: 24,
    marginTop: 10,
  },
  intelligenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16,
  },
  intelligenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intelligenceIcon: {
    fontSize: 24,
  },
  intelligenceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  intelligenceSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  recalculateBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recalculateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },

  intelligenceGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  intelligenceItemCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'space-between',
  },
  itemCardIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  itemCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  itemCardDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 12,
  },
  itemCardStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  itemCardStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  itemCardStatusBadgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  itemCardStatusTextAmber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FDE68A',
  },
  itemCardStatusBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  itemCardStatusTextGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
  },
});
