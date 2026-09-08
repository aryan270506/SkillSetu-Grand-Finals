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
  goldStar: '#F59E0B',
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

const INTERVIEWS_LIST = [
  {
    id: 'INT-101',
    time: '10:30 AM',
    dateLabel: 'Today',
    name: 'Rahul Sharma',
    college: 'IIT Roorkee \'27 • CSE',
    matchPct: '94%',
    role: 'Backend Dev Intern',
    dept: 'TechNova Eng',
    round: 'R2: Architecture & System',
    mode: '📹 Meet + Sandbox',
    status: '● Starts 25m',
    statusBg: '#DCFCE7',
    statusText: '#15803D',
    actionText: 'Inspect / Join',
    avatar: 'RS',
  },
  {
    id: 'INT-102',
    time: '02:00 PM',
    dateLabel: 'Today',
    name: 'Priya Patil',
    college: 'VJTI Mumbai \'27 • IT',
    matchPct: '91%',
    role: 'AI / ML Intern',
    dept: 'Applied AI Lab',
    round: 'R1: Python & Algorithmic',
    mode: '💻 Live Video Sandbox',
    status: 'Upcoming',
    statusBg: '#F1F5F9',
    statusText: '#475569',
    actionText: 'Inspect',
    avatar: 'PP',
  },
  {
    id: 'INT-103',
    time: '04:30 PM',
    dateLabel: 'Today',
    name: 'Sneha Joshi',
    college: 'COEP Pune \'27 • CSE',
    matchPct: '83%',
    role: 'Frontend Dev Intern',
    dept: 'Web Experience',
    round: 'R2: React Perf & State',
    mode: '📹 Google Meet',
    status: 'Upcoming',
    statusBg: '#F1F5F9',
    statusText: '#475569',
    actionText: 'Inspect',
    avatar: 'SJ',
  },
  {
    id: 'INT-104',
    time: '03:00 PM',
    dateLabel: 'Yesterday',
    name: 'Aditya Singh',
    college: 'BITS Pilani \'27 • CSE',
    matchPct: '87%',
    role: 'Backend Dev Intern',
    dept: 'Platform Infra',
    round: 'R1: System Design & APIs',
    mode: '📍 In-person',
    status: '🔔 Needs Feedback',
    statusBg: '#FEF3C7',
    statusText: '#D97706',
    actionText: 'Score Now',
    avatar: 'AS',
  },
  {
    id: 'INT-105',
    time: '11:00 AM',
    dateLabel: '05 Sep',
    name: 'Tanvi Deshmukh',
    college: 'NIT Trichy \'26 • ECE',
    matchPct: '92%',
    role: 'AI / ML Intern',
    dept: 'Founder Final',
    round: 'Final Founder Round',
    mode: '💻 Online',
    status: '✓ 92/100 (Selected)',
    statusBg: '#DCFCE7',
    statusText: '#15803D',
    actionText: 'Review Dossier',
    avatar: 'TD',
  },
  {
    id: 'INT-106',
    time: '04:00 PM',
    dateLabel: '07 Sep',
    name: 'Rohan Verma',
    college: 'COEP Pune \'26 • IT',
    matchPct: '69%',
    role: 'Backend Dev Intern',
    dept: 'TechNova Eng',
    round: 'R1: Coding & Logic',
    mode: '💻 Online',
    status: 'Archived (Rejected)',
    statusBg: '#F1F5F9',
    statusText: '#94A3B8',
    actionText: 'Archive',
    avatar: 'RV',
  },
];

export default function Interviews() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;

  const [interviews, setInterviews] = useState(INTERVIEWS_LIST);
  const [selectedId, setSelectedId] = useState('INT-101');
  const [verdict, setVerdict] = useState('Strongly Recommend');
  const [ratings, setRatings] = useState({
    techDepth: 5,
    problemSolving: 4,
    sysDesign: 5,
    communication: 4,
    teamFit: 5,
  });

  const selectedCandidate =
    interviews.find((i) => i.id === selectedId) || interviews[0];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      {/* 1. Breadcrumb & Title Bar */}
      <View style={styles.topHeaderRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.breadcrumbText}>
            ● RECRUITER WORKSPACE • <Text style={styles.breadcrumbHighlight}>CANDIDATE EVALUATION & INTERVIEWS</Text>
          </Text>
          <Text style={styles.pageTitle}>Interviews</Text>
          <Text style={styles.pageSubtitle}>
            Manage your upcoming and completed student interviews, live evaluation rooms, and feedback scoring.
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <Pressable style={styles.calendarMasterBtn}>
            <Text style={styles.calendarMasterText}>📅 View Master Calendar</Text>
          </Pressable>
          <Pressable style={styles.scheduleInterviewPrimaryBtn}>
            <Text style={styles.scheduleInterviewPrimaryText}>+ Schedule Interview</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Top Summary Metric Cards (5 Cards) */}
      <View style={styles.metricsGrid}>
        {/* Card 1 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>UPCOMING</Text>
            <Text style={{ fontSize: 13 }}>🔄</Text>
          </View>
          <Text style={styles.metricValue}>12</Text>
          <Text style={styles.metricSub}>Across all active postings</Text>
        </HoverCard>

        {/* Card 2 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>TODAY</Text>
            <View style={styles.nextPill}>
              <Text style={styles.nextPillText}>● Next in 25 min</Text>
            </View>
          </View>
          <Text style={styles.metricValue}>4</Text>
          <Text style={styles.metricSub}>2 Technical + 2 Final</Text>
        </HoverCard>

        {/* Card 3 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>COMPLETED</Text>
            <Text style={{ fontSize: 13 }}>📋</Text>
          </View>
          <Text style={styles.metricValue}>28</Text>
          <Text style={styles.metricSub}>Archived transcripts & evals</Text>
        </HoverCard>

        {/* Card 4 */}
        <HoverCard hoverScale={1.03} style={[styles.metricCard, styles.warningMetricCard]}>
          <View style={styles.metricHeader}>
            <Text style={[styles.metricLabel, { color: '#B45309' }]}>AWAITING FEEDBACK</Text>
            <Text style={{ fontSize: 13 }}>⚠️</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#B45309' }]}>5</Text>
          <Text style={[styles.metricSub, { color: '#B45309' }]}>Requires immediate rating</Text>
        </HoverCard>

        {/* Card 5 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricLabel}>SELECTED</Text>
            <Text style={{ fontSize: 13 }}>🛡️</Text>
          </View>
          <Text style={styles.metricValue}>8</Text>
          <Text style={styles.metricSub}>Offers extended • 4.3% conv.</Text>
        </HoverCard>
      </View>

      {/* 3. Today's Scheduled Interviews Section (3 Live Session Cards) */}
      <View style={styles.todaySectionCard}>
        <View style={styles.todaySectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionTitle}>Today's Scheduled Interviews (4)</Text>
            <View style={styles.liveIntegrationPill}>
              <Text style={styles.liveIntegrationText}>📹 Live Google Meet / Sandbox Integration</Text>
            </View>
          </View>
          <Pressable>
            <Text style={styles.linkText}>View Calendar →</Text>
          </Pressable>
        </View>

        <View style={styles.todayCardsGrid}>
          {/* Card 1 */}
          <HoverCard hoverScale={1.02} style={styles.todayLiveCard}>
            <View style={styles.todayCardTop}>
              <Text style={styles.todayTimeText}>10:30 AM IST</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={styles.startsSoonPill}>
                  <Text style={styles.startsSoonText}>● Starts in 25 min</Text>
                </View>
                <View style={styles.matchPill}>
                  <Text style={styles.matchPillText}>94% Skill Match</Text>
                </View>
              </View>
            </View>

            <Text style={styles.todayCandidateName}>Rahul Sharma</Text>
            <Text style={styles.todayCandidateSub}>B.Tech CSE • IIT Roorkee '27</Text>

            <View style={styles.todayDetailsGrid}>
              <Text style={styles.todayDetailLbl}>Role: <Text style={styles.todayDetailVal}>Backend Dev Intern</Text></Text>
              <Text style={styles.todayDetailLbl}>Round: <Text style={styles.todayDetailVal}>R2: Architecture & System</Text></Text>
              <Text style={styles.todayDetailLbl}>Mode: <Text style={styles.todayDetailVal}>📹 Meet + Code Sandbox</Text></Text>
            </View>

            <View style={styles.todayActionsRow}>
              <Pressable style={styles.joinLiveRoomBtn}>
                <Text style={styles.joinLiveRoomText}>🟢 Join Live Room</Text>
              </Pressable>
              <Pressable style={styles.viewSessionBtn}>
                <Text style={styles.viewSessionText}>View</Text>
              </Pressable>
            </View>
          </HoverCard>

          {/* Card 2 */}
          <HoverCard hoverScale={1.02} style={styles.todaySessionCard}>
            <View style={styles.todayCardTop}>
              <Text style={styles.todayTimeText}>02:00 PM IST</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={styles.laterTodayText}>Later Today</Text>
                <View style={styles.matchPill}>
                  <Text style={styles.matchPillText}>91% Skill Match</Text>
                </View>
              </View>
            </View>

            <Text style={styles.todayCandidateName}>Priya Patil</Text>
            <Text style={styles.todayCandidateSub}>B.Tech IT • VJTI Mumbai '27</Text>

            <View style={styles.todayDetailsGrid}>
              <Text style={styles.todayDetailLbl}>Role: <Text style={styles.todayDetailVal}>AI / ML Intern</Text></Text>
              <Text style={styles.todayDetailLbl}>Round: <Text style={styles.todayDetailVal}>R1: Python & Algorithmic</Text></Text>
              <Text style={styles.todayDetailLbl}>Mode: <Text style={styles.todayDetailVal}>💻 Live Video Sandbox</Text></Text>
            </View>

            <View style={styles.todayActionsRow}>
              <Pressable style={styles.prepareSessionBtn}>
                <Text style={styles.prepareSessionText}>💼 Prepare Session</Text>
              </Pressable>
              <Pressable style={styles.viewSessionBtn}>
                <Text style={styles.viewSessionText}>View</Text>
              </Pressable>
            </View>
          </HoverCard>

          {/* Card 3 */}
          <HoverCard hoverScale={1.02} style={styles.todaySessionCard}>
            <View style={styles.todayCardTop}>
              <Text style={styles.todayTimeText}>04:30 PM IST</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={styles.laterTodayText}>Evening Slot</Text>
                <View style={styles.matchPill}>
                  <Text style={styles.matchPillText}>83% Skill Match</Text>
                </View>
              </View>
            </View>

            <Text style={styles.todayCandidateName}>Sneha Joshi</Text>
            <Text style={styles.todayCandidateSub}>B.Tech CSE • COEP Pune '27</Text>

            <View style={styles.todayDetailsGrid}>
              <Text style={styles.todayDetailLbl}>Role: <Text style={styles.todayDetailVal}>Frontend Dev Intern</Text></Text>
              <Text style={styles.todayDetailLbl}>Round: <Text style={styles.todayDetailVal}>R2: React Perf & State</Text></Text>
              <Text style={styles.todayDetailLbl}>Mode: <Text style={styles.todayDetailVal}>📹 Google Meet</Text></Text>
            </View>

            <View style={styles.todayActionsRow}>
              <Pressable style={styles.prepareSessionBtn}>
                <Text style={styles.prepareSessionText}>💼 Prepare Session</Text>
              </Pressable>
              <Pressable style={styles.viewSessionBtn}>
                <Text style={styles.viewSessionText}>View</Text>
              </Pressable>
            </View>
          </HoverCard>
        </View>
      </View>

      {/* 4. Filter & Search Controls Bar */}
      <View style={styles.controlsBar}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search student, internship, skill, interviewer..."
            placeholderTextColor="#64748B"
          />
        </View>

        <View style={styles.viewToggleRow}>
          <Pressable style={styles.viewToggleBtnActive}>
            <Text style={styles.viewToggleTextActive}>☰ List View</Text>
          </Pressable>
          <Pressable style={styles.viewToggleBtn}>
            <Text style={styles.viewToggleText}>📅 Calendar</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.dropdownsFilterRow}>
        <Pressable style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>All Internships (5 Active) ▾</Text>
        </Pressable>
        <Pressable style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>All Statuses ▾</Text>
        </Pressable>
        <Pressable style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>All Rounds ▾</Text>
        </Pressable>
        <Pressable style={styles.filterDropBtn}>
          <Text style={styles.filterDropText}>Online & In-Person ▾</Text>
        </Pressable>
        <Pressable style={styles.resetBtn}>
          <Text style={styles.resetText}>⟲ Reset</Text>
        </Pressable>
      </View>

      {/* 5. Alert Banner: 5 Completed Interviews Require Scorecard Feedback */}
      <View style={styles.alertBanner}>
        <Text style={{ fontSize: 16 }}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>5 Completed Interviews Require Scorecard Feedback</Text>
          <Text style={styles.alertSub}>
            Submit evaluations to ensure timely candidate communication and release next stage decisions.
          </Text>
        </View>
        <Pressable style={styles.reviewListBtn}>
          <Text style={styles.reviewListText}>Review List</Text>
        </Pressable>
      </View>

      {/* 6. Main Split View Layout (Left: Scheduled Table, Right: Candidate Dossier / Live Console Workspace) */}
      <View style={[styles.mainSplitLayout, !isDesktop && styles.stackedLayout]}>
        {/* Left Column: Scheduled Interviews Table */}
        <View style={[styles.card, { flex: 1.2 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              Scheduled Interviews <Text style={styles.countBadge}>44</Text>
            </Text>
          </View>

          {/* Table Header */}
          <View style={styles.thRow}>
            <Text style={[styles.thCell, { flex: 1.2 }]}>TIME • DATE</Text>
            <Text style={[styles.thCell, { flex: 2.2 }]}>CANDIDATE</Text>
            <Text style={[styles.thCell, { flex: 2 }]}>INTERNSHIP • ROUND</Text>
            <Text style={[styles.thCell, { flex: 1.5 }]}>STATUS</Text>
            <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>ACTIONS</Text>
          </View>

          {/* Table Rows */}
          {interviews.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedId(item.id)}
                style={[styles.tdRow, isSelected && styles.tdRowSelected]}
              >
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.timeVal}>{item.time}</Text>
                  <Text style={[styles.dateLbl, item.dateLabel === 'Today' && styles.todayDateLbl]}>
                    {item.dateLabel}
                  </Text>
                </View>

                <View style={{ flex: 2.2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{item.avatar}</Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.candName}>{item.name}</Text>
                      <View style={styles.matchBadge}>
                        <Text style={styles.matchBadgeText}>{item.matchPct}</Text>
                      </View>
                    </View>
                    <Text style={styles.candCollege}>{item.college}</Text>
                  </View>
                </View>

                <View style={{ flex: 2 }}>
                  <Text style={styles.roleTitle}>{item.role}</Text>
                  <Text style={styles.roundTitle}>{item.round}</Text>
                  <Text style={styles.modeText}>{item.mode}</Text>
                </View>

                <View style={{ flex: 1.5 }}>
                  <View style={[styles.statusPill, { backgroundColor: item.statusBg }]}>
                    <Text style={[styles.statusPillText, { color: item.statusText }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                  <Pressable
                    style={[
                      styles.actionBtn,
                      item.actionText.includes('Inspect / Join') && styles.actionBtnTeal,
                      item.actionText.includes('Score Now') && styles.actionBtnOrange,
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        (item.actionText.includes('Inspect / Join') || item.actionText.includes('Score Now')) &&
                          styles.actionBtnTextWhite,
                      ]}
                    >
                      {item.actionText}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.tableFooter}>
            <Text style={styles.tableFooterText}>Showing 1 to 6 of 44 scheduled interviews</Text>
            <View style={styles.paginationRow}>
              <Text style={styles.pageBtn}>‹</Text>
              <Text style={[styles.pageBtn, styles.pageBtnActive]}>1</Text>
              <Text style={styles.pageBtn}>2</Text>
              <Text style={styles.pageBtn}>3</Text>
              <Text style={styles.pageBtn}>...</Text>
              <Text style={styles.pageBtn}>8</Text>
              <Text style={styles.pageBtn}>›</Text>
            </View>
          </View>
        </View>

        {/* Right Column: Candidate Dossier + Live Console Workspace */}
        <View style={[styles.card, styles.workspaceCard]}>
          <View style={styles.workspaceTopTagRow}>
            <Text style={styles.workspaceTag}>CANDIDATE DOSSIER + LIVE CONSOLE</Text>
            <View style={styles.todaySlotBadge}>
              <Text style={styles.todaySlotBadgeText}>● Today, 10:30 AM</Text>
            </View>
          </View>

          <Text style={styles.workspaceHeading}>Interview Workspace</Text>

          {/* Candidate Top Profile Box */}
          <View style={styles.candHeaderBox}>
            <View style={styles.candAvatarLarge}>
              <Text style={styles.candAvatarLargeText}>{selectedCandidate.avatar}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.candNameLarge}>{selectedCandidate.name}</Text>
                <View style={styles.verifiedGreenBadge}>
                  <Text style={styles.verifiedGreenBadgeText}>94% Verified</Text>
                </View>
              </View>
              <Text style={styles.candDegreeLarge}>
                B.Tech Computer Science • Class of 2027 • IIT Roorkee • CGPA: 8.9 / 10
              </Text>
            </View>
          </View>

          <Text style={styles.sectionSubHeading}>TOP VERIFIED COMPETENCIES</Text>
          <View style={styles.competenciesChipsRow}>
            {['Python (100%)', 'SQL (95%)', 'FastAPI (92%)', 'Docker (80%)', 'Redis'].map((c, i) => (
              <View key={i} style={styles.compChip}>
                <Text style={styles.compChipText}>{c}</Text>
              </View>
            ))}
          </View>

          <View style={styles.quickLinksRow}>
            <Text style={styles.quickLink}>View Profile ↗️</Text>
            <Text style={styles.quickLink}>Resume PDF ↗️</Text>
            <Text style={styles.quickLink}>Verified Repos (2) ↗️</Text>
          </View>

          {/* Session Info Grid Box */}
          <View style={styles.sessionInfoGrid}>
            <View style={styles.sCol}>
              <Text style={styles.sLbl}>Role & Team</Text>
              <Text style={styles.sVal}>Backend Dev (TechNova Eng)</Text>
            </View>
            <View style={styles.sCol}>
              <Text style={styles.sLbl}>Round Focus</Text>
              <Text style={styles.sVal}>Architecture & Concurrency</Text>
            </View>
            <View style={styles.sCol}>
              <Text style={styles.sLbl}>Duration & Mode</Text>
              <Text style={styles.sVal}>45 Mins + Sandbox + Meet</Text>
            </View>
            <View style={styles.sCol}>
              <Text style={styles.sLbl}>Assigned Panel</Text>
              <Text style={styles.sVal}>Neha Sharma, Aryan Mehta</Text>
            </View>
          </View>

          {/* Big Join Room Button */}
          <Pressable style={styles.bigJoinRoomBtn}>
            <Text style={styles.bigJoinRoomText}>🚀 Join Interview Sandbox & Video Room</Text>
          </Pressable>

          <View style={styles.sessionOptionsRow}>
            <Pressable style={styles.sessionOptBtn}>
              <Text style={styles.sessionOptText}>Reschedule Slot</Text>
            </Pressable>
            <Pressable style={styles.sessionOptDangerBtn}>
              <Text style={styles.sessionOptDangerText}>Cancel</Text>
            </Pressable>
          </View>

          {/* Candidate Scoring & Rubric Section */}
          <View style={styles.scoringSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.rubricTitle}>Candidate Scoring & Rubric</Text>
              <View style={styles.liveAutoSaveBadge}>
                <Text style={styles.liveAutoSaveText}>Live Auto-Save</Text>
              </View>
            </View>

            <View style={styles.ratingsList}>
              <RatingRow label="Technical Competency & Depth" stars={5} score="5 / 5" />
              <RatingRow label="Problem Solving & Logic" stars={4} score="4 / 5" />
              <RatingRow label="System Architecture & Database Design" stars={5} score="5 / 5" />
              <RatingRow label="Communication & Structural Clarity" stars={4} score="4 / 5" />
              <RatingRow label="Role & Startup Team Fit" stars={5} score="5 / 5" />
            </View>

            {/* Composite Score Card */}
            <View style={styles.compositeScoreCard}>
              <Text style={{ fontSize: 18 }}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.compositeLbl}>Composite Score</Text>
                <Text style={styles.compositeSub}>Weighted technical + soft skills</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.compositeVal}>89 / 100</Text>
                <Text style={styles.compositeBadge}>HIGH CAPABILITY</Text>
              </View>
            </View>

            {/* Strengths & Highlights */}
            <Text style={styles.rubricSubHeader}>Strengths & Highlights</Text>
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackText}>
                Demonstrated exceptional grasp of Redis caching layers and PostgreSQL connection pool sizing. Answered indexing bottlenecks effortlessly and wrote clean async Python code.
              </Text>
            </View>

            {/* Areas for Improvement */}
            <Text style={styles.rubricSubHeader}>Areas for Improvement / Probing</Text>
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackText}>
                Needs more practical familiarity with Kubernetes cluster manifests and CI/CD pipelines. Can be ramped up quickly during month 1.
              </Text>
            </View>

            {/* Recommendation Verdict Selectors */}
            <Text style={styles.rubricSubHeader}>Recommendation Verdict</Text>
            <View style={styles.verdictGrid}>
              {['Strongly Recommend', 'Recommend', 'Maybe / Borderline', 'Do Not Recommend'].map((v) => {
                const isVActive = verdict === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setVerdict(v)}
                    style={[
                      styles.verdictBtn,
                      isVActive && v === 'Strongly Recommend' && styles.verdictActiveGreen,
                      isVActive && v === 'Recommend' && styles.verdictActiveTeal,
                      isVActive && v === 'Do Not Recommend' && styles.verdictActiveRed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.verdictText,
                        isVActive && styles.verdictTextActive,
                      ]}
                    >
                      {isVActive ? `✓ ${v}` : v}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Main Stage Progression Button */}
            <Pressable style={styles.moveRoundBtn}>
              <Text style={styles.moveRoundText}>Move to Round 3: Culture & Founder →</Text>
            </Pressable>

            <View style={styles.bottomSecondaryActionsRow}>
              <Pressable style={styles.offerBtn}>
                <Text style={styles.offerBtnText}>Extend Internship Offer</Text>
              </Pressable>
              <Pressable style={styles.rejectFeedbackBtn}>
                <Text style={styles.rejectFeedbackText}>Reject with Feedback</Text>
              </Pressable>
            </View>
          </View>

          {/* Evaluation Journey Log */}
          <View style={styles.journeySection}>
            <Text style={styles.rubricSubHeader}>EVALUATION JOURNEY</Text>
            <View style={styles.journeyList}>
              <JourneyStep text="Sep 04: Applied to TechNova Backend Internship" />
              <JourneyStep text="Sep 04: Automated AI Screening Passed (82/100)" />
              <JourneyStep text="Sep 05: Recruiter Neha Sharma Shortlisted" />
              <JourneyStep text="Sep 06: Round 1 DSA & Coding Cleared (88/100)" />
              <JourneyStep text="Today 10:30 AM: Round 2 Architecture & Database (In Progress)" active />
              <JourneyStep text="Pending: Final Founder Review & Offer Rollout" pending />
            </View>
          </View>
        </View>
      </View>

      {/* 7. Fast-Track Scheduling Engine Section */}
      <View style={styles.schedulingEngineCard}>
        <View style={styles.schedulingEngineHeaderRow}>
          <View>
            <Text style={styles.engineSubTag}>FAST-TRACK SCHEDULING ENGINE</Text>
            <Text style={styles.engineTitle}>Standard 5-Step Recruiter Interview Workflow</Text>
            <Text style={styles.engineSub}>
              Seamlessly sync Google Meet, Code Sandbox environments, and evaluation rubrics for shortlisted applicants.
            </Text>
          </View>

          <Pressable style={styles.launchWizardBtn}>
            <Text style={styles.launchWizardText}>Launch Scheduling Wizard →</Text>
          </Pressable>
        </View>

        <View style={styles.stepperRow}>
          <View style={styles.stepBox}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
            <Text style={styles.stepTitle}>Select Student</Text>
            <Text style={styles.stepDesc}>Filter from shortlisted applicants</Text>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
            <Text style={styles.stepTitle}>Role & Round</Text>
            <Text style={styles.stepDesc}>Technical, Behavioral, or Final</Text>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
            <Text style={styles.stepTitle}>Slot & Mode</Text>
            <Text style={styles.stepDesc}>Live Sandbox or Video Call</Text>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>4</Text></View>
            <Text style={styles.stepTitle}>Assign Panel</Text>
            <Text style={styles.stepDesc}>Add engineers & talent leads</Text>
          </View>

          <View style={styles.stepBox}>
            <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>5</Text></View>
            <Text style={styles.stepTitle}>Send Invites</Text>
            <Text style={styles.stepDesc}>Auto-generates Google Calendar</Text>
          </View>
        </View>
      </View>

      {/* 8. Footer */}
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

function RatingRow({ label, stars, score }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingLbl}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles.starText}>
          {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
        </Text>
        <Text style={styles.scoreText}>{score}</Text>
      </View>
    </View>
  );
}

function JourneyStep({ text, active, pending }) {
  return (
    <View style={styles.journeyRow}>
      <View
        style={[
          styles.journeyDot,
          active && styles.journeyDotActive,
          pending && styles.journeyDotPending,
        ]}
      />
      <Text
        style={[
          styles.journeyText,
          active && styles.journeyTextActive,
          pending && styles.journeyTextPending,
        ]}
      >
        {text}
      </Text>
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
  calendarMasterBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  calendarMasterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  scheduleInterviewPrimaryBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scheduleInterviewPrimaryText: {
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
  warningMetricCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
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
    letterSpacing: 0.5,
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
  nextPill: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  nextPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  todaySectionCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
  },
  todaySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  liveIntegrationPill: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveIntegrationText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  todayCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  todayLiveCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FAFDFD',
    borderWidth: 2,
    borderColor: COLORS.primaryTeal,
    borderRadius: 12,
    padding: 14,
  },
  todaySessionCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  todayCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  startsSoonPill: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  startsSoonText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  laterTodayText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  matchPill: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  todayCandidateName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 6,
  },
  todayCandidateSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  todayDetailsGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginVertical: 10,
    gap: 2,
  },
  todayDetailLbl: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  todayDetailVal: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  todayActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinLiveRoomBtn: {
    flex: 2,
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  joinLiveRoomText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  prepareSessionBtn: {
    flex: 2,
    backgroundColor: COLORS.grayBg,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  prepareSessionText: {
    color: COLORS.textDark,
    fontSize: 11,
    fontWeight: '700',
  },
  viewSessionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewSessionText: {
    color: COLORS.textDark,
    fontSize: 11,
    fontWeight: '600',
  },
  controlsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  viewToggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  viewToggleBtnActive: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.primaryTeal,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewToggleTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  viewToggleBtn: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  dropdownsFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  filterDropBtn: {
    backgroundColor: COLORS.cardBg,
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
  resetBtn: {
    paddingHorizontal: 8,
  },
  resetText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B45309',
  },
  alertSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  reviewListBtn: {
    backgroundColor: '#B45309',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reviewListText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mainSplitLayout: {
    flexDirection: 'row',
    gap: 20,
  },
  stackedLayout: {
    flexDirection: 'column',
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
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  countBadge: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  thRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
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
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdRowSelected: {
    backgroundColor: COLORS.mintBg,
  },
  timeVal: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  dateLbl: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  todayDateLbl: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
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
  matchBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  matchBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  candCollege: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  roleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  roundTitle: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  modeText: {
    fontSize: 9,
    color: COLORS.primaryTeal,
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
  actionBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionBtnTeal: {
    backgroundColor: COLORS.primaryTeal,
    borderColor: COLORS.primaryTeal,
  },
  actionBtnOrange: {
    backgroundColor: '#B45309',
    borderColor: '#B45309',
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  actionBtnTextWhite: {
    color: '#FFFFFF',
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

  // Workspace Right Console
  workspaceCard: {
    flex: 1,
    minWidth: 320,
    borderColor: COLORS.primaryTeal,
  },
  workspaceTopTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workspaceTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  todaySlotBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  todaySlotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  workspaceHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4,
    marginBottom: 12,
  },
  candHeaderBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  candAvatarLarge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  candAvatarLargeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  candNameLarge: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  verifiedGreenBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedGreenBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  candDegreeLarge: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionSubHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  competenciesChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  compChip: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  compChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  quickLinksRow: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 10,
  },
  quickLink: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  sessionInfoGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sLbl: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  sVal: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  bigJoinRoomBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  bigJoinRoomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  sessionOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  sessionOptBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  sessionOptText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  sessionOptDangerBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  sessionOptDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  scoringSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rubricTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  liveAutoSaveBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveAutoSaveText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  ratingsList: {
    marginVertical: 10,
    gap: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingLbl: {
    fontSize: 11,
    color: COLORS.textDark,
  },
  starText: {
    color: COLORS.goldStar,
    fontSize: 12,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  compositeScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mintBg,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    marginVertical: 10,
  },
  compositeLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  compositeSub: {
    fontSize: 10,
    color: COLORS.primaryTeal,
  },
  compositeVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  compositeBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  rubricSubHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 10,
    marginBottom: 4,
  },
  feedbackBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  feedbackText: {
    fontSize: 10,
    color: COLORS.textDark,
    lineHeight: 14,
  },
  verdictGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  verdictBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  verdictActiveGreen: {
    backgroundColor: COLORS.greenPillBg,
    borderColor: COLORS.greenPillText,
  },
  verdictActiveTeal: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.primaryTeal,
  },
  verdictActiveRed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  verdictText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  verdictTextActive: {
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  moveRoundBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  moveRoundText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomSecondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  offerBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  offerBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  rejectFeedbackBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  rejectFeedbackText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  journeySection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  journeyList: {
    gap: 6,
    marginTop: 6,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  journeyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryTeal,
  },
  journeyDotActive: {
    backgroundColor: '#10B981',
  },
  journeyDotPending: {
    backgroundColor: COLORS.textMuted,
  },
  journeyText: {
    fontSize: 10,
    color: COLORS.textDark,
  },
  journeyTextActive: {
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  journeyTextPending: {
    color: COLORS.textMuted,
  },
  schedulingEngineCard: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 20,
  },
  schedulingEngineHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  engineSubTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  engineTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 2,
  },
  engineSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  launchWizardBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  launchWizardText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stepBox: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  stepDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
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
