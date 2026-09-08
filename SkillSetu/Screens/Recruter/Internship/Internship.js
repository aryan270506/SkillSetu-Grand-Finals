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
  darkBannerBg: '#091E15',
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

const APPLICANTS_DATA = [
  {
    id: 'APP-101',
    name: 'Rahul Sharma',
    degree: 'IIT Roorkee • B.Tech CSE (CGPA 8.9)',
    topSkills: 'Top: Python, SQL, Docker, FastAPI',
    skillMatch: '84%',
    matchLabel: 'High Match',
    appliedTime: 'Today, 10:15 AM',
    appliedSub: 'Direct portal submission',
    auditResult: '✓ Passed (93/100)',
    auditNote: 'GitHub & Live Verified',
    stage: 'Shortlisted',
    stageBg: '#E0F2FE',
    stageText: '#0284C7',
    avatar: 'RS',
  },
  {
    id: 'APP-102',
    name: 'Priya Patil',
    degree: 'VJTI Mumbai • B.Tech IT (CGPA 9.1)',
    topSkills: 'Top: Python, Node.js, MongoDB, Redis',
    skillMatch: '81%',
    matchLabel: 'High Match',
    appliedTime: 'Today, 08:30 AM',
    appliedSub: 'Direct portal submission',
    auditResult: '✓ Passed (88/100)',
    auditNote: 'Strong Systems project',
    stage: 'Under Review',
    stageBg: '#FEF3C7',
    stageText: '#D97706',
    avatar: 'PP',
  },
  {
    id: 'APP-103',
    name: 'Aditya Singh',
    degree: 'BITS Pilani • B.Tech ECE (CGPA 8.4)',
    topSkills: 'Top: Python, Django, PostgreSQL',
    skillMatch: '87%',
    matchLabel: 'Good Match',
    appliedTime: 'Yesterday',
    appliedSub: 'Direct portal submission',
    auditResult: '⚠️ Review (76/100)',
    auditNote: 'Docker proof unverified',
    stage: 'Under Review',
    stageBg: '#FEF3C7',
    stageText: '#D97706',
    avatar: 'AS',
  },
  {
    id: 'APP-104',
    name: 'Rohan Verma',
    degree: 'COEP Pune • B.Tech ECE (CGPA 7.2)',
    topSkills: 'Top: C++, Python Basics',
    skillMatch: '66%',
    matchLabel: 'Below Cutoff',
    appliedTime: '3 days ago',
    appliedSub: 'Direct portal submission',
    auditResult: '🚩 Flagged (42/100)',
    auditNote: 'Missing SQL & Docker proof',
    stage: 'Flagged for Review',
    stageBg: '#FEE2E2',
    stageText: '#DC2626',
    avatar: 'RV',
  },
];

export default function Internship({ onOpenPostModal }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [selectedRole, setSelectedRole] = useState('Backend Development Intern');
  const [activeTab, setActiveTab] = useState('Applications');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScreeningEnabled, setAutoScreeningEnabled] = useState(true);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      {/* 1. Top Title & Action Bar */}
      <View style={styles.topHeaderRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.pageTitle}>Internships</Text>
          <Text style={styles.pageSubtitle}>
            Create, configure and manage your company's high-intent student internships.
          </Text>
        </View>

        <View style={styles.headerButtonsRow}>
          <Pressable style={styles.exportSummaryBtn}>
            <Text style={styles.exportSummaryText}>📤 Export Summary</Text>
          </Pressable>
          <Pressable onPress={onOpenPostModal} style={styles.primaryPostBtn}>
            <Text style={styles.primaryPostText}>+ Post New Internship</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Metric Summary Cards (5 Cards) */}
      <View style={styles.metricsGrid}>
        {/* Metric 1 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>ACTIVE ROLES</Text>
            <View style={[styles.metricDot, { backgroundColor: '#10B981' }]} />
          </View>
          <Text style={styles.metricVal}>5</Text>
          <Text style={styles.metricSub}>Accepting students</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.orangePillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.orangePillText }]}>
              ⏰ 2 Closing soon | 5-13 days
            </Text>
          </View>
        </HoverCard>

        {/* Metric 2 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>DRAFTS</Text>
            <Text style={{ fontSize: 12 }}>✏️</Text>
          </View>
          <Text style={styles.metricVal}>2</Text>
          <Text style={styles.metricSub}>Unpublished postings</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.grayBg }]}>
            <Text style={[styles.pillText, { color: COLORS.textMuted }]}>
              Last edited 2 hours ago
            </Text>
          </View>
        </HoverCard>

        {/* Metric 3 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>TOTAL APPLICATIONS</Text>
            <Text style={{ fontSize: 12 }}>👥</Text>
          </View>
          <Text style={styles.metricVal}>186</Text>
          <Text style={styles.metricSub}>Across active roles</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
              📈 +24% this week
            </Text>
          </View>
        </HoverCard>

        {/* Metric 4 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>INTERVIEWS</Text>
            <Text style={{ fontSize: 12 }}>📅</Text>
          </View>
          <Text style={styles.metricVal}>12</Text>
          <Text style={styles.metricSub}>Active evaluation rounds</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.bluePillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.bluePillText }]}>
              📷 3 Scheduled today
            </Text>
          </View>
        </HoverCard>

        {/* Metric 5 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>SELECTED STUDENTS</Text>
            <Text style={{ fontSize: 12 }}>🛡️</Text>
          </View>
          <Text style={styles.metricVal}>8</Text>
          <Text style={styles.metricSub}>Offers accepted</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
              📊 4.3% Conversion rate
            </Text>
          </View>
        </HoverCard>
      </View>

      {/* 3. Search Bar & Status Filters */}
      <View style={styles.controlsBar}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search internships by title, department, skills..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.statusTabsRow}>
          {['All', 'Active (5)', 'Draft (2)', 'Paused (1)', 'Closed (3)'].map((tab) => {
            const isTabActive = statusFilter === tab.split(' ')[0];
            return (
              <Pressable
                key={tab}
                onPress={() => setStatusFilter(tab.split(' ')[0])}
                style={[styles.statusTabBtn, isTabActive && styles.statusTabBtnActive]}
              >
                <Text
                  style={[styles.statusTabText, isTabActive && styles.statusTabTextActive]}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
          <View style={styles.viewToggleGroup}>
            <Text style={styles.viewToggleActive}>⊞</Text>
            <Text style={styles.viewToggleInactive}>☰</Text>
          </View>
        </View>
      </View>

      {/* Filter Dropdowns Row */}
      <View style={styles.dropdownsRow}>
        <Pressable style={styles.dropdownBtn}>
          <Text style={styles.dropdownBtnText}>All Types ▾</Text>
        </Pressable>
        <Pressable style={styles.dropdownBtn}>
          <Text style={styles.dropdownBtnText}>All Departments ▾</Text>
        </Pressable>
        <Pressable style={styles.dropdownBtn}>
          <Text style={styles.dropdownBtnText}>All Work Modes ▾</Text>
        </Pressable>
        <Pressable style={styles.dropdownBtn}>
          <Text style={styles.dropdownBtnText}>Deadline (Earliest First) ▾</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Text style={styles.showingText}>
          Showing 4 of 7 Postings <Text style={styles.clearFilters}>Clear Filters</Text>
        </Text>
      </View>

      {/* 4. Active Postings Grid Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Active Postings & Opportunities</Text>
        <Text style={styles.sectionSub}>Auto-syncing applicants real-time</Text>
      </View>

      <View style={styles.postingsGrid}>
        {/* Card 1 - Currently Inspecting */}
        <HoverCard
          hoverScale={1.03}
          onPress={() => setSelectedRole('Backend Development Intern')}
          style={[
            styles.postingCard,
            selectedRole === 'Backend Development Intern' && styles.postingCardSelected,
          ]}
        >
          <View style={styles.inspectingBanner}>
            <Text style={styles.inspectingBannerText}>CURRENTLY INSPECTING</Text>
          </View>

          <View style={styles.postingBadgeRow}>
            <View style={styles.activePill}>
              <View style={styles.greenDot} />
              <Text style={styles.activePillText}>Active</Text>
            </View>
            <Text style={styles.tagGrey}>Full-time Internship</Text>
            <Text style={styles.tagGrey}>Remote</Text>
            <Text style={styles.tagPurple}>Engineering</Text>
          </View>

          <Text style={styles.postingTitle}>Backend Development Intern</Text>
          <Text style={styles.postingDept}>
            TechNova Engineering • Bengaluru (Hybrid / Remote Option)
          </Text>

          <View style={styles.postingInfoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Stipend</Text>
              <Text style={styles.infoVal}>₹35,000 /mo</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Deadline</Text>
              <Text style={[styles.infoVal, { color: COLORS.orangePillText }]}>
                20 Sep (5 days left)
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Openings</Text>
              <Text style={styles.infoVal}>8 positions</Text>
            </View>
          </View>

          <View style={styles.metricsBoxRow}>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>86</Text>
              <Text style={styles.mLbl}>APPLIED</Text>
            </View>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>15</Text>
              <Text style={styles.mLbl}>SHORTLIST</Text>
            </View>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>8</Text>
              <Text style={styles.mLbl}>INTERVIEW</Text>
            </View>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>8</Text>
              <Text style={styles.mLbl}>SELECTED</Text>
            </View>
          </View>

          <View style={styles.skillTagsWrap}>
            {['Python (Advanced)', 'SQL (Intermediate)', 'Docker', 'FastAPI'].map((s, i) => (
              <View key={i} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={styles.postingFooter}>
            <Pressable style={styles.viewAppTealBtn}>
              <Text style={styles.viewAppTealText}>View Applications (86) →</Text>
            </Pressable>
            <Pressable style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>Manage ▾</Text>
            </Pressable>
          </View>
        </HoverCard>

        {/* Card 2 */}
        <HoverCard
          hoverScale={1.03}
          onPress={() => setSelectedRole('AI / Machine Learning Intern')}
          style={[
            styles.postingCard,
            selectedRole === 'AI / Machine Learning Intern' && styles.postingCardSelected,
          ]}
        >
          <View style={styles.postingBadgeRow}>
            <View style={styles.activePill}>
              <View style={styles.greenDot} />
              <Text style={styles.activePillText}>Active</Text>
            </View>
            <Text style={styles.tagGrey}>Full-time Internship</Text>
            <Text style={styles.tagGrey}>Remote</Text>
            <Text style={styles.tagPurple}>TechNova Labs</Text>
          </View>

          <Text style={styles.postingTitle}>AI / Machine Learning Intern</Text>
          <Text style={styles.postingDept}>
            Applied Research Team • Deep Learning & NLP
          </Text>

          <View style={styles.postingInfoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Stipend</Text>
              <Text style={styles.infoVal}>₹40,000 /mo</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Deadline</Text>
              <Text style={styles.infoVal}>28 Sep (13 days left)</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Openings</Text>
              <Text style={styles.infoVal}>5 positions</Text>
            </View>
          </View>

          <View style={styles.metricsBoxRow}>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>64</Text>
              <Text style={styles.mLbl}>APPLIED</Text>
            </View>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>11</Text>
              <Text style={styles.mLbl}>SHORTLIST</Text>
            </View>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>5</Text>
              <Text style={styles.mLbl}>INTERVIEW</Text>
            </View>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>2</Text>
              <Text style={styles.mLbl}>SELECTED</Text>
            </View>
          </View>

          <View style={styles.skillTagsWrap}>
            {['Python (Advanced)', 'PyTorch', 'Transformers', 'Huggingface'].map((s, i) => (
              <View key={i} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={styles.postingFooter}>
            <Pressable style={styles.viewAppTealBtn}>
              <Text style={styles.viewAppTealText}>View Applications (64) →</Text>
            </Pressable>
            <Pressable style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>Manage ▾</Text>
            </Pressable>
          </View>
        </HoverCard>

        {/* Card 3 */}
        <HoverCard
          hoverScale={1.03}
          onPress={() => setSelectedRole('Frontend Development Intern')}
          style={[
            styles.postingCard,
            selectedRole === 'Frontend Development Intern' && styles.postingCardSelected,
          ]}
        >
          <View style={styles.postingBadgeRow}>
            <View style={styles.activePill}>
              <View style={styles.greenDot} />
              <Text style={styles.activePillText}>Active</Text>
            </View>
            <Text style={styles.tagGrey}>Full-time Internship</Text>
            <Text style={styles.tagGrey}>Hybrid - Bengaluru</Text>
            <Text style={styles.tagPurple}>Product Core</Text>
          </View>

          <Text style={styles.postingTitle}>Frontend Development Intern</Text>
          <Text style={styles.postingDept}>TechNova Product Experience Group</Text>

          <View style={styles.postingInfoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Stipend</Text>
              <Text style={styles.infoVal}>₹30,000 /mo</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Deadline</Text>
              <Text style={styles.infoVal}>05 Oct (20 days left)</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Openings</Text>
              <Text style={styles.infoVal}>6 positions</Text>
            </View>
          </View>

          <View style={styles.metricsBoxRow}>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>36</Text>
              <Text style={styles.mLbl}>APPLIED</Text>
            </View>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>6</Text>
              <Text style={styles.mLbl}>SHORTLIST</Text>
            </View>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>3</Text>
              <Text style={styles.mLbl}>INTERVIEW</Text>
            </View>
            <View style={styles.mCol}>
              <Text style={styles.mVal}>0</Text>
              <Text style={styles.mLbl}>SELECTED</Text>
            </View>
          </View>

          <View style={styles.skillTagsWrap}>
            {['React 18', 'TypeScript', 'Tailwind CSS'].map((s, i) => (
              <View key={i} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={styles.postingFooter}>
            <Pressable style={styles.viewAppTealBtn}>
              <Text style={styles.viewAppTealText}>View Applications (36) →</Text>
            </Pressable>
            <Pressable style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>Manage ▾</Text>
            </Pressable>
          </View>
        </HoverCard>

        {/* Card 4 - Draft */}
        <HoverCard
          hoverScale={1.03}
          onPress={() => setSelectedRole('Data Analytics & BI Intern')}
          style={[
            styles.postingCard,
            selectedRole === 'Data Analytics & BI Intern' && styles.postingCardSelected,
          ]}
        >
          <View style={styles.postingBadgeRow}>
            <View style={styles.draftPill}>
              <Text style={styles.draftPillText}>● Draft</Text>
            </View>
            <Text style={styles.tagGrey}>Full-time Internship</Text>
            <Text style={styles.tagGrey}>Onsite - Pune</Text>
            <Text style={styles.tagPurple}>Analytics</Text>
          </View>

          <Text style={styles.postingTitle}>Data Analytics & BI Intern</Text>
          <Text style={styles.postingDept}>
            Business Intelligence & Strategic Operations
          </Text>

          <View style={styles.setupProgressBox}>
            <View style={styles.setupProgressHeader}>
              <Text style={styles.setupProgressLbl}>Setup Progress (Step 3 of 5)</Text>
              <Text style={styles.setupProgressPct}>50%</Text>
            </View>
            <View style={styles.setupTrack}>
              <View style={[styles.setupFill, { width: '50%' }]} />
            </View>
            <Text style={styles.setupSub}>
              Saved automatically 2 hours ago. Required screening rules pending.
            </Text>
          </View>

          <View style={styles.postingInfoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Target Openings</Text>
              <Text style={styles.infoVal}>2 positions</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLbl}>Status</Text>
              <Text style={styles.infoVal}>Not Published yet</Text>
            </View>
          </View>

          <View style={styles.postingFooter}>
            <Pressable style={styles.continueSetupBtn}>
              <Text style={styles.continueSetupText}>Continue Setup →</Text>
            </Pressable>
            <Pressable style={styles.deleteDraftBtn}>
              <Text style={styles.deleteDraftText}>Delete Draft</Text>
            </Pressable>
            <Pressable style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>Manage ▾</Text>
            </Pressable>
          </View>
        </HoverCard>
      </View>

      {/* 5. Detailed Inspection Panel for Selected Role */}
      <View style={styles.inspectionPanel}>
        {/* Panel Header */}
        <View style={styles.inspectionTopBar}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.livePostingPill}>
                <Text style={styles.livePostingPillText}>● Live Posting</Text>
              </View>
              <Text style={styles.roleIdText}>ROLE ID: BDEV-AUG-2026-08</Text>
            </View>

            <Text style={styles.inspectionTitle}>{selectedRole}</Text>
            <Text style={styles.inspectionSub}>
              8 Openings • ₹35,000/mo • Deadline: 20 September 2026 (5 days left) • Posted: 1 Sep 2026
            </Text>
          </View>

          <View style={styles.inspectionTopActions}>
            <Pressable style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>✏️ Edit Role</Text>
            </Pressable>
            <Pressable style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>⏸️ Pause</Text>
            </Pressable>
            <Pressable style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>📅 Extend Deadline</Text>
            </Pressable>
            <Pressable style={styles.btnOutline}>
              <Text style={styles.btnOutlineText}>📥 Export CSV</Text>
            </Pressable>
            <Pressable style={styles.btnDanger}>
              <Text style={styles.btnDangerText}>Close Role</Text>
            </Pressable>
          </View>
        </View>

        {/* Inspection Navigation Sub-Tabs */}
        <View style={styles.inspectionNavTabs}>
          {[
            { id: 'Applications', label: 'Applications (86)', badge: null },
            { id: 'AIScreening', label: 'AI Screening & Match Engine', badge: 'Active Rules' },
            { id: 'Analytics', label: 'Analytics & Funnel', badge: null },
            { id: 'RoleDetails', label: 'Role Details & Requirements', badge: null },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.inspectionTabItem, isSelected && styles.inspectionTabItemActive]}
              >
                <Text
                  style={[
                    styles.inspectionTabText,
                    isSelected && styles.inspectionTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.badge && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
                {isSelected && <View style={styles.activeTabIndicator} />}
              </Pressable>
            );
          })}
        </View>

        {/* Applicant Filters Bar */}
        <View style={styles.applicantFiltersBar}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable style={styles.filterDropBtn}>
              <Text style={styles.filterDropText}>Skill Match: All (80%+) ▾</Text>
            </Pressable>
            <Pressable style={styles.filterDropBtn}>
              <Text style={styles.filterDropText}>Screening: All Statuses ▾</Text>
            </Pressable>
            <Pressable style={styles.filterDropBtn}>
              <Text style={styles.filterDropText}>Stage: All Active Stages ▾</Text>
            </Pressable>
          </View>

          <View style={styles.bulkActionsRow}>
            <Text style={styles.bulkLabel}>Bulk:</Text>
            <Pressable style={styles.bulkBtn}>
              <Text style={styles.bulkBtnText}>✔️ Shortlist (0)</Text>
            </Pressable>
            <Pressable style={styles.bulkBtn}>
              <Text style={styles.bulkBtnText}>❌ Reject (0)</Text>
            </Pressable>
            <Pressable style={styles.bulkBtn}>
              <Text style={styles.bulkBtnText}>Export CSV</Text>
            </Pressable>
          </View>
        </View>

        {/* Applicant Table */}
        <View style={styles.applicantTable}>
          {/* Table Header */}
          <View style={styles.athRow}>
            <View style={{ width: 30, alignItems: 'center' }}>
              <Text style={styles.athCheckbox}>☐</Text>
            </View>
            <Text style={[styles.athText, { flex: 2.2 }]}>STUDENT CANDIDATE</Text>
            <Text style={[styles.athText, { flex: 1 }]}>SKILL MATCH</Text>
            <Text style={[styles.athText, { flex: 1.4 }]}>APPLIED</Text>
            <Text style={[styles.athText, { flex: 1.5 }]}>AI SCREENING AUDIT</Text>
            <Text style={[styles.athText, { flex: 1.2 }]}>PIPELINE STAGE</Text>
            <Text style={[styles.athText, { flex: 1.2, textAlign: 'right' }]}>
              REVIEW ACTIONS
            </Text>
          </View>

          {/* Table Rows */}
          {APPLICANTS_DATA.map((app) => (
            <View key={app.id} style={styles.atdRow}>
              <View style={{ width: 30, alignItems: 'center' }}>
                <Text style={styles.athCheckbox}>☑</Text>
              </View>

              <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.appAvatar}>
                  <Text style={styles.appAvatarText}>{app.avatar}</Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.verifiedTag}>Verified Profile</Text>
                  </View>
                  <Text style={styles.appDegree}>{app.degree}</Text>
                  <Text style={styles.appSkills}>{app.topSkills}</Text>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.matchBarRow}>
                  <View style={styles.matchTrack}>
                    <View
                      style={[
                        styles.matchFill,
                        { width: app.skillMatch, backgroundColor: COLORS.primaryTeal },
                      ]}
                    />
                  </View>
                  <Text style={styles.matchPct}>{app.skillMatch}</Text>
                </View>
                <Text style={styles.matchLbl}>{app.matchLabel}</Text>
              </View>

              <View style={{ flex: 1.4 }}>
                <Text style={styles.appliedTime}>{app.appliedTime}</Text>
                <Text style={styles.appliedSub}>{app.appliedSub}</Text>
              </View>

              <View style={{ flex: 1.5 }}>
                <View
                  style={[
                    styles.auditPill,
                    app.auditResult.includes('✓') && styles.auditPass,
                    app.auditResult.includes('⚠️') && styles.auditWarn,
                    app.auditResult.includes('🚩') && styles.auditFlag,
                  ]}
                >
                  <Text
                    style={[
                      styles.auditPillText,
                      app.auditResult.includes('✓') && styles.auditPassText,
                      app.auditResult.includes('⚠️') && styles.auditWarnText,
                      app.auditResult.includes('🚩') && styles.auditFlagText,
                    ]}
                  >
                    {app.auditResult}
                  </Text>
                </View>
                <Text style={styles.auditNote}>{app.auditNote}</Text>
              </View>

              <View style={{ flex: 1.2 }}>
                <View style={[styles.stagePill, { backgroundColor: app.stageBg }]}>
                  <Text style={[styles.stagePillText, { color: app.stageText }]}>
                    {app.stage}
                  </Text>
                </View>
              </View>

              <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                <Pressable style={styles.actBtnOutline}>
                  <Text style={styles.actBtnOutlineText}>
                    {app.stage === 'Shortlisted' ? 'Profile' : 'Report'}
                  </Text>
                </Pressable>
                <Pressable style={styles.actBtnTeal}>
                  <Text style={styles.actBtnTealText}>
                    {app.stage === 'Shortlisted' ? 'Schedule R2' : 'Shortlist'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}

          {/* Table Footer */}
          <View style={styles.tableFooterRow}>
            <Text style={styles.tableFooterText}>
              Showing 1 to 4 of 86 student applicants
            </Text>
            <View style={styles.paginationRow}>
              <Text style={styles.pageBtn}>Previous</Text>
              <Text style={[styles.pageBtn, styles.pageBtnActive]}>1</Text>
              <Text style={styles.pageBtn}>2</Text>
              <Text style={styles.pageBtn}>3</Text>
              <Text style={styles.pageBtn}>...</Text>
              <Text style={styles.pageBtn}>9</Text>
              <Text style={styles.pageBtn}>Next</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 6. SkillSetu AI Screening & Auto-Evaluation Engine */}
      <View style={styles.aiEngineCard}>
        <View style={styles.aiEngineHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>✨</Text>
            <View>
              <Text style={styles.aiEngineTitle}>
                SkillSetu AI Screening & Auto-Evaluation Engine
              </Text>
              <Text style={styles.aiEngineSub}>
                Autonomous multi-dimensional verification evaluating student capabilities before they reach your interview desk.
              </Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLbl}>Auto-Screening: Enabled</Text>
            <Pressable
              onPress={() => setAutoScreeningEnabled(!autoScreeningEnabled)}
              style={[
                styles.toggleSwitch,
                autoScreeningEnabled && styles.toggleSwitchActive,
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  autoScreeningEnabled && styles.toggleKnobActive,
                ]}
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.weightsTitle}>CONFIGURABLE EVALUATION WEIGHTS (SUM: 100%)</Text>
        <View style={styles.weightsGrid}>
          {/* Weight 1 */}
          <View style={styles.weightCard}>
            <View style={styles.weightHeader}>
              <Text style={styles.weightName}>Required Skills</Text>
              <Text style={styles.weightPct}>40%</Text>
            </View>
            <Text style={styles.weightDesc}>
              Python, SQL, FastAPI & System Architecture questions
            </Text>
          </View>

          {/* Weight 2 */}
          <View style={styles.weightCard}>
            <View style={styles.weightHeader}>
              <Text style={styles.weightName}>Resume & ATS</Text>
              <Text style={styles.weightPct}>20%</Text>
            </View>
            <Text style={styles.weightDesc}>
              Semantic parsing of projects, coursework and past roles
            </Text>
          </View>

          {/* Weight 3 */}
          <View style={styles.weightCard}>
            <View style={styles.weightHeader}>
              <Text style={styles.weightName}>GitHub Proof</Text>
              <Text style={styles.weightPct}>15%</Text>
            </View>
            <Text style={styles.weightDesc}>
              Commit patterns, pull requests, repository structure & code cleanliness
            </Text>
          </View>

          {/* Weight 4 */}
          <View style={styles.weightCard}>
            <View style={styles.weightHeader}>
              <Text style={styles.weightName}>Project Quality</Text>
              <Text style={styles.weightPct}>15%</Text>
            </View>
            <Text style={styles.weightDesc}>
              Execution depth, deployment URLs, production readiness
            </Text>
          </View>

          {/* Weight 5 */}
          <View style={styles.weightCard}>
            <View style={styles.weightHeader}>
              <Text style={styles.weightName}>Academics</Text>
              <Text style={styles.weightPct}>10%</Text>
            </View>
            <Text style={styles.weightDesc}>
              Accredited institution, CS/STEM branch, minimum CGPA 7.5
            </Text>
          </View>
        </View>

        {/* Threshold Callout Card */}
        <View style={styles.thresholdCalloutCard}>
          <View style={styles.thresholdBadge}>
            <Text style={styles.thresholdBadgeVal}>70%</Text>
            <Text style={styles.thresholdBadgeLbl}>CUTOFF</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.thresholdTitle}>Minimum Auto-Shortlist Threshold</Text>
            <Text style={styles.thresholdSub}>
              Students scoring under 70% are automatically diverted to manual review, preventing false negatives.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={styles.activeStatusTag}>
              <Text style={styles.activeStatusTagText}>Rule status: Active & Enforcing</Text>
            </View>
            <Pressable style={styles.configBtn}>
              <Text style={styles.configBtnText}>Configure Logic</Text>
            </Pressable>
          </View>
        </View>

        {/* Real-time Pipeline Lifecycle */}
        <Text style={styles.lifecycleTitle}>REAL-TIME VERIFICATION LIFECYCLE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pipelineScroll}>
          {[
            { step: '1. Submission', desc: 'Student applies' },
            { step: '2. Eligibility', desc: 'Degree & year' },
            { step: '3. Resume ATS', desc: 'Keyword match' },
            { step: '4. Skill Metric', desc: 'Weight matching' },
            { step: '5. Code & Proof', desc: 'GitHub API check' },
            { step: '6. Match Score', desc: '0 - 100 Index' },
            { step: '7. Recruiter Desk', desc: 'Ready for review', active: true },
          ].map((item, i) => (
            <View
              key={i}
              style={[styles.lifecycleStepCard, item.active && styles.lifecycleStepActive]}
            >
              <Text style={[styles.stepTitle, item.active && styles.stepTitleActive]}>
                {item.step}
              </Text>
              <Text style={[styles.stepDesc, item.active && styles.stepDescActive]}>
                {item.desc}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 7. Bottom Banner: Posting an Internship on SkillSetu */}
      <View style={styles.bottomBanner}>
        <View style={styles.bottomBannerHeader}>
          <View>
            <Text style={styles.bottomBannerTag}>🚀 Documented 6-Step Workflow</Text>
            <Text style={styles.bottomBannerTitle}>Posting an Internship on SkillSetu</Text>
            <Text style={styles.bottomBannerSub}>
              SkillSetu combines academic credentials with verified proof of work so you meet candidates who can actually deliver from day one.
            </Text>
          </View>
          <Pressable onPress={onOpenPostModal} style={styles.startPostingBtn}>
            <Text style={styles.startPostingText}>Start New Posting →</Text>
          </Pressable>
        </View>

        <View style={styles.stepperRow}>
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>✓ Step 1</Text>
            <Text style={styles.stepName}>Basic Info</Text>
            <Text style={styles.stepDetail}>Title, Dept, Openings</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>✓ Step 2</Text>
            <Text style={styles.stepName}>Role Description</Text>
            <Text style={styles.stepDetail}>Objectives & Stipend</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>✓ Step 3</Text>
            <Text style={styles.stepName}>Required Skills</Text>
            <Text style={styles.stepDetail}>Tags & Mandatory</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>✓ Step 4</Text>
            <Text style={styles.stepName}>Eligibility Criteria</Text>
            <Text style={styles.stepDetail}>Degree & Graduation Year</Text>
          </View>
          <View style={[styles.stepItem, styles.stepItemActive]}>
            <Text style={[styles.stepNum, styles.stepNumActive]}>● Step 5 (Active)</Text>
            <Text style={[styles.stepName, styles.stepNameActive]}>AI Screening</Text>
            <Text style={[styles.stepDetail, styles.stepDetailActive]}>Weights & Cutoff</Text>
          </View>
          <View style={styles.stepItem}>
            <Text style={styles.stepNum}>6. Step 6</Text>
            <Text style={styles.stepName}>Review & Publish</Text>
            <Text style={styles.stepDetail}>Go Live to Students</Text>
          </View>
        </View>
      </View>

      {/* 8. Footer */}
      <View style={styles.footerBar}>
        <Text style={styles.copyrightText}>
          © 2026 SkillSetu Career Intelligence Platform. Empowering verified student engineering talent.
        </Text>
        <View style={styles.footerLinksRow}>
          <Text style={styles.footerLink}>Recruiter Guidelines</Text>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerLink}>Support & Documentation</Text>
        </View>
      </View>
    </ScrollView>
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
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportSummaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exportSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  primaryPostBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryPostText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricVal: {
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
  controlsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    flex: 1,
    minWidth: 260,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
  },
  statusTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusTabBtnActive: {
    backgroundColor: COLORS.mintBg,
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  statusTabTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 2,
    marginLeft: 6,
  },
  viewToggleActive: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  viewToggleInactive: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dropdownsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  dropdownBtn: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dropdownBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  showingText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  clearFilters: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  sectionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  postingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  postingCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
    position: 'relative',
  },
  postingCardSelected: {
    borderColor: COLORS.primaryTeal,
    borderWidth: 2,
  },
  inspectingBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 12,
  },
  inspectingBannerText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  postingBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  draftPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  draftPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  tagGrey: {
    backgroundColor: '#F1F5F9',
    fontSize: 10,
    color: COLORS.textMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPurple: {
    backgroundColor: '#F3E8FF',
    fontSize: 10,
    color: '#6B21A8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
  },
  postingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  postingDept: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  postingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  infoCol: {},
  infoLbl: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 2,
  },
  metricsBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  mCol: {
    alignItems: 'center',
  },
  mVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  mLbl: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  skillTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  skillChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillChipText: {
    fontSize: 10,
    color: COLORS.textDark,
  },
  postingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAppTealBtn: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewAppTealText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  manageBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  manageBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  setupProgressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  setupProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setupProgressLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  setupProgressPct: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  setupTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginVertical: 6,
  },
  setupFill: {
    height: '100%',
    backgroundColor: COLORS.primaryTeal,
    borderRadius: 3,
  },
  setupSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  continueSetupBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  continueSetupText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteDraftBtn: {
    paddingHorizontal: 8,
  },
  deleteDraftText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },

  // Inspection Panel
  inspectionPanel: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.primaryTeal,
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
  },
  inspectionTopBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  livePostingPill: {
    backgroundColor: COLORS.greenPillBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  livePostingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenPillText,
  },
  roleIdText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  inspectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 6,
  },
  inspectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  inspectionTopActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  btnOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  btnDanger: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  inspectionNavTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginVertical: 14,
    gap: 20,
  },
  inspectionTabItem: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  inspectionTabItemActive: {},
  inspectionTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  inspectionTabTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primaryTeal,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  applicantFiltersBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
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
  bulkActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulkLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginRight: 4,
  },
  bulkBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  bulkBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  applicantTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  athRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  athCheckbox: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  athText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  atdRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  appAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.mintBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  verifiedTag: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primaryTeal,
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  appDegree: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  appSkills: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  matchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    maxWidth: 60,
  },
  matchFill: {
    height: '100%',
    borderRadius: 3,
  },
  matchPct: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  matchLbl: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  appliedTime: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  appliedSub: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  auditPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  auditPass: {
    backgroundColor: COLORS.greenPillBg,
  },
  auditWarn: {
    backgroundColor: COLORS.orangePillBg,
  },
  auditFlag: {
    backgroundColor: COLORS.redPillBg,
  },
  auditPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  auditPassText: {
    color: COLORS.greenPillText,
  },
  auditWarnText: {
    color: COLORS.orangePillText,
  },
  auditFlagText: {
    color: COLORS.redPillText,
  },
  auditNote: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stagePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  stagePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actBtnOutline: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actBtnOutlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  actBtnTeal: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actBtnTealText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tableFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  tableFooterText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageBtn: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: COLORS.textMuted,
  },
  pageBtnActive: {
    backgroundColor: COLORS.primaryTeal,
    color: '#FFFFFF',
    fontWeight: '700',
    borderRadius: 4,
  },

  // AI Screening Section
  aiEngineCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
  },
  aiEngineHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aiEngineTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  aiEngineSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  toggleSwitch: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    padding: 2,
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.primaryTeal,
  },
  toggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    marginLeft: 16,
  },
  weightsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  weightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  weightCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weightName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  weightPct: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  weightDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  thresholdCalloutCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: COLORS.mintBg,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    gap: 14,
  },
  thresholdBadge: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  thresholdBadgeVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  thresholdBadgeLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5EEAD4',
  },
  thresholdTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  thresholdSub: {
    fontSize: 11,
    color: COLORS.primaryTeal,
    marginTop: 2,
  },
  activeStatusTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeStatusTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  configBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  configBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lifecycleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  pipelineScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  lifecycleStepCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 110,
    marginRight: 8,
  },
  lifecycleStepActive: {
    backgroundColor: COLORS.primaryTeal,
    borderColor: COLORS.primaryTeal,
  },
  stepTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  stepTitleActive: {
    color: '#FFFFFF',
  },
  stepDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  stepDescActive: {
    color: '#5EEAD4',
  },

  // Bottom Banner
  bottomBanner: {
    backgroundColor: COLORS.darkBannerBg,
    borderRadius: 16,
    padding: 20,
  },
  bottomBannerHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  bottomBannerTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5EEAD4',
  },
  bottomBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  bottomBannerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    maxWidth: 500,
  },
  startPostingBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startPostingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  stepItem: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 10,
  },
  stepItemActive: {
    backgroundColor: 'rgba(94,234,212,0.15)',
    borderWidth: 1,
    borderColor: '#5EEAD4',
  },
  stepNum: {
    fontSize: 10,
    color: '#94A3B8',
  },
  stepNumActive: {
    color: '#5EEAD4',
    fontWeight: '700',
  },
  stepName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  stepNameActive: {
    color: '#FFFFFF',
  },
  stepDetail: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  stepDetailActive: {
    color: '#5EEAD4',
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
