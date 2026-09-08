import React, { useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = {
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  textDark: '#0F172A',
  textMuted: '#64748B',
  primaryTeal: '#004D40',
  primaryTealHover: '#00382E',
  mintBg: '#E6F4F1',
  mintBorder: '#B2DFDB',
  tealText: '#004D40',
  orangePillBg: '#FEF3C7',
  orangePillText: '#D97706',
  greenPillBg: '#DCFCE7',
  greenPillText: '#15803D',
  bluePillBg: '#E0F2FE',
  bluePillText: '#0369A1',
  redPillBg: '#FEE2E2',
  redPillText: '#DC2626',
  grayBg: '#F1F5F9',
};

function HoverCard({ children, style, hoverScale = 1.02, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      Animated.spring(scaleAnim, {
        toValue: hoverScale,
        friction: 6,
        tension: 90,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={{ flex: style?.flex, minWidth: style?.minWidth }}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const APPLICANTS_LIST = [
  {
    id: 'APP-01',
    name: 'Rahul Sharma',
    degree: 'B.Tech CSE • IIT Roorkee \'27',
    college: 'IIT Roorkee',
    internship: 'Backend Development',
    dept: 'TechNova Eng',
    matchPct: '94%',
    matchLabel: 'High',
    auditScore: '✓ Passed (93/100)',
    auditNote: 'Strong Systems project',
    appliedTime: 'Today, 10:15 AM',
    status: 'Shortlisted',
    statusBg: '#E0F2FE',
    statusText: '#0284C7',
    avatar: 'RS',
    cgpa: '8.9/10',
    selected: true,
  },
  {
    id: 'APP-02',
    name: 'Priya Patil',
    degree: 'B.Tech IT • VJTI Mumbai \'27',
    college: 'VJTI Mumbai',
    internship: 'AI / ML Intern',
    dept: 'Applied AI Lab',
    matchPct: '91%',
    matchLabel: 'High',
    auditScore: '✓ Passed (88/100)',
    auditNote: 'Good NLP models',
    appliedTime: 'Today, 08:30 AM',
    status: 'Under Review',
    statusBg: '#FEF3C7',
    statusText: '#D97706',
    avatar: 'PP',
    cgpa: '9.1/10',
    selected: false,
  },
  {
    id: 'APP-03',
    name: 'Aditya Singh',
    degree: 'B.Tech CSE • BITS Pilani \'27',
    college: 'BITS Pilani',
    internship: 'Backend Development',
    dept: 'Platform Infra',
    matchPct: '87%',
    matchLabel: 'Good',
    auditScore: '⚠️ Review (76/100)',
    auditNote: 'Docker unverified',
    appliedTime: 'Yesterday',
    status: 'New',
    statusBg: '#DCFCE7',
    statusText: '#15803D',
    avatar: 'AS',
    cgpa: '8.4/10',
    selected: false,
  },
  {
    id: 'APP-04',
    name: 'Sneha Joshi',
    degree: 'B.Tech CSE • COEP Pune \'27',
    college: 'COEP Pune',
    internship: 'Frontend Development',
    dept: 'Web Experience',
    matchPct: '83%',
    matchLabel: 'Good',
    auditScore: '✓ Passed (84/100)',
    auditNote: 'React 18 clean code',
    appliedTime: 'Yesterday',
    status: 'Interview',
    statusBg: '#E0F2FE',
    statusText: '#0284C7',
    avatar: 'SJ',
    cgpa: '8.7/10',
    selected: true,
  },
  {
    id: 'APP-05',
    name: 'Rohan Verma',
    degree: 'B.Tech ECE • NIT Trichy \'26',
    college: 'NIT Trichy',
    internship: 'Backend Development',
    dept: 'TechNova Eng',
    matchPct: '66%',
    matchLabel: '< 70%',
    auditScore: '🚩 Flagged (42/100)',
    auditNote: 'Missing SQL & Docker proof',
    appliedTime: '2 days ago',
    status: 'Under Review',
    statusBg: '#FEF3C7',
    statusText: '#D97706',
    avatar: 'RV',
    cgpa: '7.2/10',
    selected: false,
  },
];

export default function Applications() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;

  const [applicants, setApplicants] = useState(APPLICANTS_LIST);
  const [selectedApplicantId, setSelectedApplicantId] = useState('APP-01');
  const [recruiterNotes, setRecruiterNotes] = useState(
    'Candidate has strong database indexing projects. Proceed to Round 1 technical interview.'
  );
  const [noteSavedMsg, setNoteSavedMsg] = useState('');

  const selectedCandidate =
    applicants.find((a) => a.id === selectedApplicantId) || applicants[0];

  const selectedCount = applicants.filter((a) => a.selected).length;

  const toggleSelectApplicant = (id) => {
    setApplicants((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSaveNotes = () => {
    setNoteSavedMsg('Note saved successfully!');
    setTimeout(() => setNoteSavedMsg(''), 1500);
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      {/* 1. Breadcrumb & Title Bar */}
      <View style={styles.topHeaderRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.breadcrumbText}>
            RECRUITER WORKSPACE • <Text style={styles.breadcrumbHighlight}>Intelligent Talent Pipeline</Text>
          </Text>
          <Text style={styles.pageTitle}>Applications</Text>
          <Text style={styles.pageSubtitle}>
            Review, evaluate, and manage students who have applied to your internships.
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <View style={styles.autoScreenBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.autoScreenText}>Auto-Screening Active</Text>
          </View>
          <Pressable style={styles.exportBtn}>
            <Text style={styles.exportBtnText}>📥 Export Applications ▾</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Top Summary Metric Cards (5 Cards) */}
      <View style={styles.metricsGrid}>
        {/* Card 1 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Total Applications</Text>
            <Text style={{ fontSize: 13 }}>📋</Text>
          </View>
          <Text style={styles.metricValue}>186</Text>
          <Text style={styles.metricSub}>Across 5 active internships</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
              📈 +24%
            </Text>
          </View>
        </HoverCard>

        {/* Card 2 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>New</Text>
            <Text style={{ fontSize: 13 }}>📬</Text>
          </View>
          <Text style={styles.metricValue}>42</Text>
          <Text style={styles.metricSub}>Needs initial review</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.orangePillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.orangePillText }]}>
              Action required
            </Text>
          </View>
        </HoverCard>

        {/* Card 3 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Under Review</Text>
            <Text style={{ fontSize: 13 }}>👁️</Text>
          </View>
          <Text style={styles.metricValue}>58</Text>
          <Text style={styles.metricSub}>AI screening completed</Text>
        </HoverCard>

        {/* Card 4 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Shortlisted</Text>
            <Text style={{ fontSize: 13 }}>⭐</Text>
          </View>
          <Text style={styles.metricValue}>32</Text>
          <Text style={styles.metricSub}>Ready for interview scheduling</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.bluePillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.bluePillText }]}>
              17% of total
            </Text>
          </View>
        </HoverCard>

        {/* Card 5 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>Selected</Text>
            <Text style={{ fontSize: 13 }}>🏆</Text>
          </View>
          <Text style={styles.metricValue}>8</Text>
          <Text style={styles.metricSub}>Offers accepted</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.bluePillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.bluePillText }]}>
              4.3% Conv.
            </Text>
          </View>
        </HoverCard>
      </View>

      {/* 3. Application Funnel & Pipeline Overview */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Application Funnel & Pipeline Overview</Text>
            <Text style={styles.cardSub}>
              Real-time student conversion through automated screening and evaluations
            </Text>
          </View>
          <View style={styles.normalizedBadge}>
            <Text style={styles.normalizedBadgeText}>● Normalized for 5 Active Openings</Text>
          </View>
        </View>

        <View style={styles.funnelStepsGrid}>
          {/* Step 1 */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>1. Applied</Text>
              <Text style={styles.funnelPct}>100%</Text>
            </View>
            <Text style={styles.funnelNum}>186</Text>
            <Text style={styles.funnelSub}>Gross applications</Text>
            <View style={styles.trackBar}>
              <View style={[styles.fillBar, { width: '100%', backgroundColor: COLORS.primaryTeal }]} />
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>2. Eligible</Text>
              <Text style={styles.funnelPct}>76.3%</Text>
            </View>
            <Text style={styles.funnelNum}>142</Text>
            <Text style={styles.funnelSub}>Criteria verified</Text>
            <View style={styles.trackBar}>
              <View style={[styles.fillBar, { width: '76%', backgroundColor: '#0D9488' }]} />
            </View>
          </View>

          {/* Step 3 */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>3. Under Review</Text>
              <Text style={styles.funnelPct}>31.2%</Text>
            </View>
            <Text style={styles.funnelNum}>58</Text>
            <Text style={styles.funnelSub}>Skill screening</Text>
            <View style={styles.trackBar}>
              <View style={[styles.fillBar, { width: '31%', backgroundColor: '#14B8A6' }]} />
            </View>
          </View>

          {/* Step 4 */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>4. Shortlisted</Text>
              <Text style={styles.funnelPct}>17.2%</Text>
            </View>
            <Text style={styles.funnelNum}>32</Text>
            <Text style={styles.funnelSub}>High confidence</Text>
            <View style={styles.trackBar}>
              <View style={[styles.fillBar, { width: '17%', backgroundColor: '#5EEAD4' }]} />
            </View>
          </View>

          {/* Step 5 */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>5. Interview</Text>
              <Text style={styles.funnelPct}>6.4%</Text>
            </View>
            <Text style={styles.funnelNum}>12</Text>
            <Text style={styles.funnelSub}>Technical rounds</Text>
            <View style={styles.trackBar}>
              <View style={[styles.fillBar, { width: '10%', backgroundColor: '#5EEAD4' }]} />
            </View>
          </View>

          {/* Step 6 */}
          <View style={styles.funnelBox}>
            <View style={styles.funnelTop}>
              <Text style={styles.funnelStepTitle}>6. Selected</Text>
              <Text style={styles.funnelPct}>4.3%</Text>
            </View>
            <Text style={styles.funnelNum}>8</Text>
            <Text style={styles.funnelSub}>Accepted offers</Text>
            <View style={styles.trackBar}>
              <View style={[styles.fillBar, { width: '6%', backgroundColor: '#5EEAD4' }]} />
            </View>
          </View>
        </View>
      </View>

      {/* 4. Search Controls & Filter Row */}
      <View style={styles.filterControlsBar}>
        <View style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>All Internships (5) ▾</Text>
        </View>
        <View style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>All Statuses ▾</Text>
        </View>
        <View style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>All Screening ▾</Text>
        </View>
        <View style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>Skill Match: 80%+ ▾</Text>
        </View>
        <View style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>Degree & Branch ▾</Text>
        </View>
        <View style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>Last 30 Days ▾</Text>
        </View>
        <Pressable>
          <Text style={styles.clearFiltersText}>✕ Clear Filters</Text>
        </Pressable>
      </View>

      {/* 5. Dynamic Bulk Selection Banner */}
      {selectedCount > 0 && (
        <View style={styles.bulkBanner}>
          <Text style={styles.bulkBannerTitle}>
            ✓ {selectedCount} Students Selected{' '}
            <Text style={styles.bulkBannerSub}>
              ({applicants.filter((a) => a.selected).map((a) => a.name).join(', ')})
            </Text>
          </Text>

          <View style={styles.bulkActionsGroup}>
            <Pressable style={styles.bulkActionTeal}>
              <Text style={styles.bulkActionTealText}>Shortlist Selected</Text>
            </Pressable>
            <Pressable style={styles.bulkActionOutline}>
              <Text style={styles.bulkActionOutlineText}>Move to Review</Text>
            </Pressable>
            <Pressable style={styles.bulkActionOutline}>
              <Text style={styles.bulkActionOutlineText}>Schedule Interview</Text>
            </Pressable>
            <Pressable style={styles.bulkActionDanger}>
              <Text style={styles.bulkActionDangerText}>Reject Selected</Text>
            </Pressable>
            <Pressable style={styles.bulkActionOutline}>
              <Text style={styles.bulkActionOutlineText}>📥 Export CSV</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 6. Main Split View Layout (Left: Applications Table, Right: Candidate Drawer Inspection) */}
      <View style={[styles.mainSplitLayout, !isDesktop && styles.stackedLayout]}>
        {/* Left Column: Student Applications Table */}
        <View style={[styles.card, { flex: 1.3 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              Student Applications <Text style={styles.countBadge}>186</Text>
            </Text>
            <Pressable style={styles.sortBtn}>
              <Text style={styles.sortBtnText}>Sort by: Skill Match (Highest) ▾</Text>
            </Pressable>
          </View>

          {/* Table Header */}
          <View style={styles.thRow}>
            <View style={{ width: 28, alignItems: 'center' }}>
              <Text style={styles.checkboxText}>☐</Text>
            </View>
            <Text style={[styles.thCell, { flex: 2 }]}>STUDENT</Text>
            <Text style={[styles.thCell, { flex: 1.4 }]}>INTERNSHIP</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>SKILL MATCH</Text>
            <Text style={[styles.thCell, { flex: 1.4 }]}>SCREENING STATUS</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>APPLIED</Text>
            <Text style={[styles.thCell, { flex: 1.1 }]}>STATUS</Text>
            <Text style={[styles.thCell, { flex: 0.8, textAlign: 'right' }]}>ACTION</Text>
          </View>

          {/* Table Rows */}
          {applicants.map((cand) => {
            const isInspecting = cand.id === selectedApplicantId;
            return (
              <Pressable
                key={cand.id}
                onPress={() => setSelectedApplicantId(cand.id)}
                style={[styles.tdRow, isInspecting && styles.tdRowInspecting]}
              >
                <Pressable
                  onPress={() => toggleSelectApplicant(cand.id)}
                  style={{ width: 28, alignItems: 'center' }}
                >
                  <Text style={styles.checkboxText}>
                    {cand.selected ? '☑' : '☐'}
                  </Text>
                </Pressable>

                <View style={[styles.tdCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{cand.avatar}</Text>
                  </View>
                  <View>
                    <Text style={styles.candName}>{cand.name}</Text>
                    <Text style={styles.candDegree}>{cand.degree}</Text>
                  </View>
                </View>

                <View style={[styles.tdCell, { flex: 1.4 }]}>
                  <Text style={styles.internshipName}>{cand.internship}</Text>
                  <Text style={styles.deptName}>{cand.dept}</Text>
                </View>

                <View style={[styles.tdCell, { flex: 1.2 }]}>
                  <View style={styles.matchBarRow}>
                    <View style={styles.matchTrack}>
                      <View
                        style={[
                          styles.matchFill,
                          { width: cand.matchPct, backgroundColor: COLORS.primaryTeal },
                        ]}
                      />
                    </View>
                    <Text style={styles.matchPctVal}>{cand.matchPct}</Text>
                  </View>
                  <Text style={styles.matchLbl}>{cand.matchLabel}</Text>
                </View>

                <View style={[styles.tdCell, { flex: 1.4 }]}>
                  <View
                    style={[
                      styles.auditBadge,
                      cand.auditScore.includes('✓') && styles.auditPassBg,
                      cand.auditScore.includes('⚠️') && styles.auditWarnBg,
                      cand.auditScore.includes('🚩') && styles.auditFlagBg,
                    ]}
                  >
                    <Text
                      style={[
                        styles.auditBadgeText,
                        cand.auditScore.includes('✓') && styles.auditPassText,
                        cand.auditScore.includes('⚠️') && styles.auditWarnText,
                        cand.auditScore.includes('🚩') && styles.auditFlagText,
                      ]}
                    >
                      {cand.auditScore}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.tdMuted, { flex: 1.2 }]}>{cand.appliedTime}</Text>

                <View style={[styles.tdCell, { flex: 1.1 }]}>
                  <View style={[styles.statusPill, { backgroundColor: cand.statusBg }]}>
                    <Text style={[styles.statusPillText, { color: cand.statusText }]}>
                      {cand.status}
                    </Text>
                  </View>
                </View>

                <View style={[styles.tdCell, { flex: 0.8, alignItems: 'flex-end' }]}>
                  <Text style={styles.inspectBtnText}>
                    {isInspecting ? '● Inspect' : 'Inspect'}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.tableFooter}>
            <Text style={styles.tableFooterText}>
              Showing 1 to 5 of 186 student applications
            </Text>
            <View style={styles.paginationRow}>
              <Text style={styles.pageBtn}>‹</Text>
              <Text style={[styles.pageBtn, styles.pageBtnActive]}>1</Text>
              <Text style={styles.pageBtn}>2</Text>
              <Text style={styles.pageBtn}>3</Text>
              <Text style={styles.pageBtn}>...</Text>
              <Text style={styles.pageBtn}>38</Text>
              <Text style={styles.pageBtn}>›</Text>
            </View>
          </View>
        </View>

        {/* Right Column: Candidate Inspection Drawer (Rahul Sharma) */}
        <View style={[styles.card, styles.inspectionDrawerCard]}>
          {/* Candidate Top Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.drawerAvatar}>
              <Text style={styles.drawerAvatarText}>
                {selectedCandidate.avatar}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.drawerCandidateName}>{selectedCandidate.name}</Text>
                <View style={[styles.statusPill, { backgroundColor: selectedCandidate.statusBg }]}>
                  <Text style={[styles.statusPillText, { color: selectedCandidate.statusText }]}>
                    {selectedCandidate.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.drawerDegreeText}>
                {selectedCandidate.degree} • CGPA: {selectedCandidate.cgpa}
              </Text>
            </View>
          </View>

          {/* Applied Internship Box */}
          <View style={styles.appliedInternshipBox}>
            <Text style={styles.appliedBoxLbl}>APPLIED INTERNSHIP</Text>
            <Text style={styles.appliedBoxTitle}>{selectedCandidate.internship} Intern</Text>
            <Text style={styles.appliedBoxSub}>
              {selectedCandidate.dept} • Applied {selectedCandidate.appliedTime}
            </Text>
          </View>

          {/* AI Screening Audit Box */}
          <View style={styles.aiAuditCard}>
            <View style={styles.aiAuditHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>✨</Text>
                <Text style={styles.aiAuditTitle}>AI Screening Audit</Text>
              </View>
              <View style={styles.mintMatchBadge}>
                <Text style={styles.mintMatchText}>91% Total Match</Text>
              </View>
            </View>

            <View style={styles.aiScoresGrid}>
              <Text style={styles.aiScoreItem}>Required Skills: <Text style={{ fontWeight: '800' }}>94%</Text></Text>
              <Text style={styles.aiScoreItem}>Resume Evaluation: <Text style={{ fontWeight: '800' }}>88%</Text></Text>
              <Text style={styles.aiScoreItem}>Project Quality: <Text style={{ fontWeight: '800' }}>96%</Text></Text>
              <Text style={styles.aiScoreItem}>GitHub Proof: <Text style={{ fontWeight: '800' }}>92%</Text></Text>
            </View>
            <Text style={styles.academicsText}>Academics Criterion: 100% (Meets 7.5+ Cutoff)</Text>

            <View style={styles.aiNoteCard}>
              <Text style={styles.aiNoteText}>
                <Text style={{ fontWeight: '800' }}>AI Recommendation Note:</Text> Strong candidate for Backend Development Internship. Demonstrated hands-on schema optimization and automated test suites in distributed systems.
              </Text>
            </View>
          </View>

          {/* Skill Match Breakdown */}
          <View style={styles.skillBreakdownSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.sectionHeading}>Skill Match Breakdown</Text>
              <Text style={styles.sectionScoreText}>94% Overall</Text>
            </View>

            <View style={styles.skillBarsList}>
              <SkillBar label="Python" pct="100%" level="100% (Verified)" color="#004D40" />
              <SkillBar label="SQL & PostgreSQL" pct="95%" level="95% (Verified)" color="#004D40" />
              <SkillBar label="Node.js & Express" pct="90%" level="90% (Verified)" color="#004D40" />
              <SkillBar label="MongoDB" pct="88%" level="88% (Verified)" color="#004D40" />
              <SkillBar label="Docker" pct="80%" level="80% (Intermediate)" color="#0D9488" />
              <SkillBar label="AWS" pct="65%" level="65% (Developing)" color="#F59E0B" />
            </View>

            <View style={styles.skillChipsRow}>
              {['Python', 'FastAPI', 'Docker', 'SQL', 'Redis', 'Git', 'Microservices'].map((sk, i) => (
                <View key={i} style={styles.skillChipTag}>
                  <Text style={styles.skillChipTagText}>{sk}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Verified Student Resume Box */}
          <View style={styles.resumeCard}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.resumeCardTitle}>Verified Student Resume</Text>
                <Text style={styles.resumeScoreText}>Score: 92/100</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Text style={{ fontSize: 18 }}>📄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resumeFileName}>{selectedCandidate.name.replace(' ', '_')}_Resume.pdf</Text>
                  <Text style={styles.resumeFileMeta}>1.2 MB • Updated 4 days ago</Text>
                </View>
                <Pressable style={styles.iconBtn}>
                  <Text>👁️</Text>
                </Pressable>
                <Pressable style={styles.iconBtn}>
                  <Text>📥</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Verified Projects (Code Proof) */}
          <View style={styles.codeProofSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.sectionHeading}>Verified Projects (Code Proof)</Text>
              <Text style={{ fontSize: 14 }}>‹ ›</Text>
            </View>

            <View style={styles.projectItem}>
              <Text style={styles.projectTitle}>Student Management System ↗️</Text>
              <Text style={styles.projectDesc}>
                FastAPI + PostgreSQL backend architecture with JWT authentication and RBAC.
              </Text>
              <Text style={styles.projectCommitMeta}>142 commits • 92% code test coverage</Text>
            </View>

            <View style={styles.projectItem}>
              <Text style={styles.projectTitle}>Distributed Cache Service ↗️</Text>
              <Text style={styles.projectDesc}>
                Redis + Python lightweight in-memory key-value eviction simulator. Concurrency tested.
              </Text>
            </View>
          </View>

          {/* Application Audit Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeading}>Application Audit Timeline</Text>
            <View style={styles.timelineList}>
              <TimelineItem time="Today 10:15 AM" text="Application received via SkillSetu Portal" />
              <TimelineItem time="Today 10:16 AM" text="Automated AI Screening completed (Score: 92/100)" />
              <TimelineItem time="Today 11:30 AM" text="Recruiter Neha Sharma reviewed application" />
              <TimelineItem time="Today 11:45 AM" text="Moved to Shortlisted stage" />
              <TimelineItem time="Upcoming Action" text="Technical Round 1 Scheduling" isUpcoming />
            </View>
          </View>

          {/* Internal Recruiter Notes */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionHeading}>Internal Recruiter Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={3}
              value={recruiterNotes}
              onChangeText={setRecruiterNotes}
              placeholder="Add recruiter feedback or interview notes..."
            />
            {!!noteSavedMsg && (
              <Text style={styles.noteSavedText}>✓ {noteSavedMsg}</Text>
            )}
            <Pressable onPress={handleSaveNotes} style={styles.saveNoteBtn}>
              <Text style={styles.saveNoteText}>Save Note</Text>
            </Pressable>
          </View>

          {/* Bottom Primary Actions */}
          <View style={styles.drawerFooterActions}>
            <Pressable style={styles.scheduleInterviewBigBtn}>
              <Text style={styles.scheduleInterviewBigText}>📅 Schedule Interview</Text>
            </Pressable>

            <View style={styles.drawerFooterSecondaryRow}>
              <Pressable style={styles.actionPillBtn}>
                <Text style={styles.actionPillText}>Shortlisted</Text>
              </Pressable>
              <Pressable style={styles.actionPillBtn}>
                <Text style={styles.actionPillText}>Send Message</Text>
              </Pressable>
              <Pressable style={styles.actionPillDangerBtn}>
                <Text style={styles.actionPillDangerText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* 7. Footer */}
      <View style={styles.footerBar}>
        <Text style={styles.copyrightText}>
          © 2026 SkillSetu Career Architecture Platform. All rights reserved.
        </Text>
        <View style={styles.footerLinksRow}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerLink}>Support</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function SkillBar({ label, pct, level, color }) {
  return (
    <View style={styles.skillBarItem}>
      <View style={styles.skillBarTop}>
        <Text style={styles.skillBarLbl}>{label}</Text>
        <Text style={styles.skillBarVal}>{level}</Text>
      </View>
      <View style={styles.skillTrack}>
        <View style={[styles.skillFill, { width: pct, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function TimelineItem({ time, text, isUpcoming }) {
  return (
    <View style={styles.timelineItem}>
      <View style={[styles.timelineDot, isUpcoming && styles.timelineDotUpcoming]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.timelineTime, isUpcoming && styles.timelineTimeUpcoming]}>
          {time}
        </Text>
        <Text style={styles.timelineText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    padding: 24,
    gap: 20,
  },
  topHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  titleGroup: {},
  breadcrumbText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  breadcrumbHighlight: {
    color: COLORS.primaryTeal,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 2,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  autoScreenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  autoScreenText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  exportBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metricCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textDark,
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  normalizedBadge: {
    backgroundColor: COLORS.grayBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  normalizedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  funnelStepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  funnelBox: {
    flex: 1,
    minWidth: 130,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
  },
  funnelTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  funnelStepTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  funnelPct: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  funnelNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4,
  },
  funnelSub: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  trackBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 8,
  },
  fillBar: {
    height: '100%',
    borderRadius: 2,
  },
  filterControlsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
  },
  filterDropBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterDropText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  clearFiltersText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  bulkBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryTeal,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  bulkBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bulkBannerSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5EEAD4',
  },
  bulkActionsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bulkActionTeal: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkActionTealText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  bulkActionOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkActionOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bulkActionDanger: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkActionDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mainSplitLayout: {
    flexDirection: 'row',
    gap: 20,
  },
  stackedLayout: {
    flexDirection: 'column',
  },
  countBadge: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  sortBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  thRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  checkboxText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  thCell: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdRowInspecting: {
    backgroundColor: COLORS.mintBg,
  },
  tdCell: {},
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  candName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  candDegree: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  internshipName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  deptName: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  matchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchTrack: {
    width: 45,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  matchFill: {
    height: '100%',
    borderRadius: 3,
  },
  matchPctVal: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  matchLbl: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  auditBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  auditPassBg: { backgroundColor: COLORS.greenPillBg },
  auditWarnBg: { backgroundColor: COLORS.orangePillBg },
  auditFlagBg: { backgroundColor: COLORS.redPillBg },
  auditBadgeText: { fontSize: 10, fontWeight: '700' },
  auditPassText: { color: COLORS.greenPillText },
  auditWarnText: { color: COLORS.orangePillText },
  auditFlagText: { color: COLORS.redPillText },
  tdMuted: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inspectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  tableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  tableFooterText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pageBtn: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: COLORS.textMuted,
  },
  pageBtnActive: {
    backgroundColor: COLORS.primaryTeal,
    color: '#FFFFFF',
    fontWeight: '700',
    borderRadius: 4,
  },

  // Right Drawer Inspection Panel
  inspectionDrawerCard: {
    flex: 1,
    minWidth: 320,
    borderColor: COLORS.primaryTeal,
  },
  drawerHeader: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  drawerCandidateName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  drawerDegreeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  appliedInternshipBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appliedBoxLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  appliedBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 2,
  },
  appliedBoxSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  aiAuditCard: {
    backgroundColor: COLORS.mintBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    marginBottom: 12,
  },
  aiAuditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiAuditTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  mintMatchBadge: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mintMatchText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiScoresGrid: {
    gap: 4,
  },
  aiScoreItem: {
    fontSize: 11,
    color: COLORS.primaryTeal,
  },
  academicsText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
    marginTop: 6,
  },
  aiNoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  aiNoteText: {
    fontSize: 10,
    color: COLORS.textDark,
    lineHeight: 14,
  },
  skillBreakdownSection: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  sectionScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  skillBarsList: {
    gap: 6,
    marginVertical: 6,
  },
  skillBarItem: {},
  skillBarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skillBarLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  skillBarVal: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  skillTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 2,
  },
  skillFill: {
    height: '100%',
    borderRadius: 2,
  },
  skillChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  skillChipTag: {
    backgroundColor: COLORS.grayBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillChipTagText: {
    fontSize: 10,
    color: COLORS.textDark,
  },
  resumeCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  resumeCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  resumeScoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  resumeFileName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  resumeFileMeta: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  iconBtn: {
    padding: 4,
  },
  codeProofSection: {
    marginBottom: 12,
  },
  projectItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  projectTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  projectDesc: {
    fontSize: 10,
    color: COLORS.textDark,
    marginTop: 2,
  },
  projectCommitMeta: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  timelineSection: {
    marginBottom: 12,
  },
  timelineList: {
    gap: 8,
    marginTop: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryTeal,
    marginTop: 4,
  },
  timelineDotUpcoming: {
    backgroundColor: COLORS.orangePillText,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  timelineTimeUpcoming: {
    color: COLORS.orangePillText,
  },
  timelineText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  notesSection: {
    marginBottom: 14,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 11,
    color: COLORS.textDark,
    height: 60,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  noteSavedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.greenPillText,
    marginTop: 4,
  },
  saveNoteBtn: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.grayBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  saveNoteText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  drawerFooterActions: {
    gap: 8,
  },
  scheduleInterviewBigBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  scheduleInterviewBigText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  drawerFooterSecondaryRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionPillBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  actionPillDangerBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionPillDangerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  footerBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  copyrightText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footerLinksRow: {
    flexDirection: 'row',
    gap: 16,
  },
  footerLink: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
