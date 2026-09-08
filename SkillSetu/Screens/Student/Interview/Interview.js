import React, { useState } from 'react';
import {
  Linking,
  Modal,
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
  bgSurface: '#f8faf9',
  surfaceCard: '#ffffff',
  textMain: '#0f172a',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  primaryTeal: '#0d9488',
  primaryTealDark: '#0f766e',
  tealLightBg: '#ccfbf1',
  tealSubtleBg: '#f0fdfa',
  greenSuccess: '#059669',
  greenSuccessBg: '#d1fae5',
  amberWarning: '#d97706',
  amberWarningBg: '#fef3c7',
  roseError: '#e11d48',
  roseErrorBg: '#ffe4e6',
  blueInfo: '#2563eb',
  blueInfoBg: '#dbeafe',
  purpleAccent: '#7c3aed',
  purpleLightBg: '#f3e8ff',
  borderGray: '#e2e8f0',
  navyDark: '#0f172a',
};

export default function Interview({ user }) {
  const { width } = useWindowDimensions();
  
  // State for Accordion & Interactive Modals
  const [expandedQuestion, setExpandedQuestion] = useState('q1');
  const [activeModal, setActiveModal] = useState(null); // 'practice' | 'details' | 'startMock'
  const [modalData, setModalData] = useState(null);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [selectedTimelineFilter, setSelectedTimelineFilter] = useState('All (3)');
  const [questionBankFilter, setQuestionBankFilter] = useState('DSA & Algorithms (12)');

  // Data Models matching exact UI screenshot
  const UPCOMING_INTERVIEWS = [
    {
      id: 'ui_1',
      company: 'Google',
      role: 'Software Engineer Intern',
      badge: 'In 2 days',
      badgeColor: COLORS.amberWarning,
      badgeBg: COLORS.amberWarningBg,
      dateTime: '24 September 2026, 11:00 AM IST',
      round: 'Technical Round 1 (Data Structures & Systems)',
      linkText: 'Google Meet (Link active 15m prior)',
      linkUrl: 'https://meet.google.com',
      prepProgress: 75,
      skills: ['DSA', 'Java', 'SQL / System Design'],
      actionText: 'Prepare Now',
      secondaryBtn: 'Details'
    },
    {
      id: 'ui_2',
      company: 'TechNova Solutions',
      role: 'Backend Developer Intern',
      badge: 'Tomorrow',
      badgeColor: '#e11d48',
      badgeBg: '#ffe4e6',
      dateTime: 'Tomorrow, 2:30 PM IST',
      round: 'Round 2: OS Architecture & Database (Schema)',
      linkText: 'SkillSetu Live Video Sandbox',
      linkUrl: 'https://skillsetu.com/sandbox',
      prepProgress: 64,
      skills: ['Python 3.11', 'REST APIs', 'PostgreSQL', 'Docker: 82%'],
      actionText: 'Prepare Now',
      secondaryBtn: 'Join Room (Test)'
    },
    {
      id: 'ui_3',
      company: 'FinFlow Analytics',
      role: 'Data Engineer Intern',
      badge: 'Scheduled',
      badgeColor: COLORS.blueInfo,
      badgeBg: COLORS.blueInfoBg,
      dateTime: '29 September 2026, 4:00 PM IST',
      round: 'Technical Assessment Review + HR',
      linkText: 'Zoom Conference (Link provided)',
      linkUrl: 'https://zoom.us',
      prepProgress: 42,
      isNeedsPrep: true,
      skills: ['Python', 'Data Pipelines', 'DDL Queries'],
      actionText: 'Start Prep Plan',
      secondaryBtn: 'Details'
    }
  ];

  const TIMELINE_ROWS = [
    {
      id: 't1',
      company: 'TechNova Solutions',
      role: 'Backend Developer Intern',
      date: 'Tomorrow, 2:30 PM\nLive Sandbox',
      round: 'Round 2: Architecture',
      type: 'Technical',
      typeBg: COLORS.tealLightBg,
      typeColor: COLORS.primaryTealDark,
      readiness: 64,
      status: 'Tomorrow',
      statusBg: COLORS.amberWarningBg,
      statusColor: COLORS.amberWarning
    },
    {
      id: 't2',
      company: 'Google',
      role: 'Software Engineer Intern',
      date: '24 Sept, 11:00 AM\nGoogle Meet',
      round: 'Round 1: DSA & Systems',
      type: 'Technical',
      typeBg: COLORS.tealLightBg,
      typeColor: COLORS.primaryTealDark,
      readiness: 75,
      status: 'Upcoming',
      statusBg: COLORS.blueInfoBg,
      statusColor: COLORS.blueInfo
    },
    {
      id: 't3',
      company: 'FinFlow Analytics',
      role: 'Data Engineer Intern',
      date: '29 Sept, 4:00 PM\nZoom Video',
      round: 'Assessment + HR',
      type: 'Mixed',
      typeBg: '#f3e8ff',
      typeColor: COLORS.purpleAccent,
      readiness: 42,
      status: 'Scheduled',
      statusBg: COLORS.borderGray,
      statusColor: COLORS.textMuted
    }
  ];

  const VERIFIED_SKILL_MATRIX = [
    { skill: 'Python (Data Structures & Backend)', percent: 88, status: 'Verified', color: COLORS.greenSuccess },
    { skill: 'React & Frontend State', percent: 75, status: 'Verified', color: COLORS.greenSuccess },
    { skill: 'Node.js / Express Architecture', percent: 59, status: 'Learning', color: COLORS.primaryTeal },
    { skill: 'SQL & Relational Schemas', percent: 55, status: 'Needs Improvement', color: COLORS.amberWarning },
    { skill: 'Docker / Containerization', percent: 43, status: 'Gap', color: COLORS.roseError },
  ];

  const PROJECT_QUESTIONS = [
    {
      id: 'pq1',
      tag: 'Architecture',
      question: '1. "Why did you choose PostgreSQL over MongoDB for the Student Management System?"',
      desc: 'Interviewer evaluates relational integrity, ACID compliance, and foreign key cascading across course registrations.',
      recommendation: 'Recommended STAR Focus: Schema migration & indexing',
    },
    {
      id: 'pq2',
      tag: 'Security',
      question: '2. "How did you implement JWT authentication middleware and handle token revocation?"',
      desc: 'Assesses your stateless auth implementation, refresh tokens, and Redis blacklisting approach.',
      recommendation: 'Recommended STAR Focus: Middleware intercepts in Express',
    },
    {
      id: 'pq3',
      tag: 'High Frequency',
      question: '3. "Explain how you solved the database schema indexing bottleneck under test load."',
      desc: 'Focuses on EXPLAIN ANALYZE reports, composite B-tree indexes on enrollment timestamp fields.',
      recommendation: 'Recommended STAR Focus: Latency dropped from 480ms to 12ms',
    }
  ];

  const QUESTION_BANK = [
    {
      id: 'q1',
      badge: 'DSA #14',
      title: 'Given a stream of integers, how do you find the median dynamically?',
      expectedConcepts: [
        'Dual Heap approach: Max-Heap for lower half, Min-Heap for upper half',
        'Heap balance invariant: size diff <= 1',
        'Time Complexity: O(log N) insertion, O(1) median lookup',
        'Space Complexity: O(N) memory overhead'
      ],
      starTip: 'Start with naive sorting (O(N log N)), explain why real-time streaming makes that inefficient, then introduce the dual heap balancing mechanism before coding.'
    },
    {
      id: 'q2',
      badge: 'SQL #03',
      title: 'How do you eliminate N+1 query problems in an ORM architecture?',
      expectedConcepts: [
        'Eager loading using JOINs vs Lazy loading deferred queries',
        'Batch fetching with WHERE IN (id_1, id_2, ...)',
        'DataLoader pattern for GraphQL or REST sub-resource resolvers'
      ],
      starTip: 'Illustrate SQL log comparison showing 101 query executions reduced to 2 queries using eager relational preload.'
    },
    {
      id: 'q3',
      badge: 'HR #05',
      title: 'Tell me about a time you faced a serious technical roadblock and how you resolved it.',
      expectedConcepts: [
        'Situation & Context clarity',
        'Task target definition',
        'Action steps taken empirically',
        'Result quantify percentage improvement'
      ],
      starTip: 'Focus heavily on diagnostic debugging methodology rather than just the final fix.'
    }
  ];

  const PAST_HISTORY = [
    { company: 'Tata Consultancy Services', role: 'Software Developer - Technical', score: '78%', decision: 'Selected', decisionBg: COLORS.greenSuccessBg, decisionColor: COLORS.greenSuccess, feedback: 'Great OOP core fundamentals' },
    { company: 'Infosys', role: 'Systems Engineer - HR & Leadership', score: '84%', decision: 'Selected', decisionBg: COLORS.greenSuccessBg, decisionColor: COLORS.greenSuccess, feedback: 'Confident communication & clear project vision' },
    { company: 'Dataspark AI', role: 'ML Engineering Intern - Technical 1', score: '61%', decision: 'Rejected', decisionBg: COLORS.roseErrorBg, decisionColor: COLORS.roseError, feedback: 'Needs deeper concurrency & thread safety review' }
  ];

  // Helper actions
  const handleStartPracticeModal = (questionTitle) => {
    setModalData({ title: questionTitle });
    setActiveModal('practice');
    setPracticeAnswer('');
    setAiFeedback(null);
  };

  const handleSimulateAudioRecord = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setPracticeAnswer(
        'To find the median dynamically in a streaming dataset, we maintain two heaps: a Max-Heap for the lower half of elements and a Min-Heap for the upper half. Upon each insertion, we balance the heap sizes so their absolute difference is at most 1. The median is computed in O(1) time.'
      );
    }, 1800);
  };

  const handleEvaluateAI = () => {
    if (!practiceAnswer.trim()) return;
    setAiFeedback({
      score: 94,
      verdict: 'Excellent Technical Response',
      strengths: 'Accurately articulated dual-heap invariants, time complexity O(log N) insertion, and O(1) retrieval.',
      starTip: 'Structure speech with an explicit Situation-Action-Result format for technical phone screens.'
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1. TOP HEADER BANNER */}
      <View style={styles.topBanner}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerBadgeRow}>
            <Text style={styles.headerTagPill}>VERIFIED CAREER TRACK</Text>
            <Text style={styles.headerTagSub}>• Targeted: Full Stack / Backend Engineer</Text>
          </View>
          <Text style={styles.headerTitle}>Interviews</Text>
          <Text style={styles.headerSubtitle}>
            Prepare smarter, practice confidently, and track your interview performance with AI tailored to your verified SkillSetu profile.
          </Text>
        </View>

        <View style={styles.headerRightGroup}>
          <View style={styles.headerStatPillBox}>
            <Text style={styles.headerStatPillLabel}>PIPELINE</Text>
            <Text style={styles.headerStatPillValue}>3 Upcoming</Text>
          </View>
          <View style={styles.headerStatPillBox}>
            <Text style={styles.headerStatPillLabel}>THIS WEEK</Text>
            <Text style={styles.headerStatPillValue}>2 Active</Text>
          </View>
          <View style={styles.headerStatPillBox}>
            <Text style={styles.headerStatPillLabel}>AI AVG</Text>
            <Text style={[styles.headerStatPillValue, { color: COLORS.greenSuccess }]}>78%</Text>
          </View>
          <Pressable
            style={styles.startMockBtn}
            onPress={() => handleStartPracticeModal('General Technical & Architecture Practice Mock')}
          >
            <Text style={styles.startMockBtnText}>🎙️ Start Mock</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. 6 METRIC SUMMARY CARDS ROW */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricLabel}>UPCOMING</Text>
            <Text style={styles.metricIcon}>📅</Text>
          </View>
          <Text style={styles.metricBigNum}>3</Text>
          <Text style={styles.metricSub}>Active interview pipeline</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricLabel}>THIS WEEK</Text>
            <Text style={styles.metricIcon}>🏢</Text>
          </View>
          <Text style={styles.metricBigNum}>2</Text>
          <Text style={styles.metricSub}>TechNova & Google</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricLabel}>PREP PROGRESS</Text>
            <Text style={styles.metricIcon}>⏳</Text>
          </View>
          <Text style={[styles.metricBigNum, { color: COLORS.primaryTeal }]}>72%</Text>
          <Text style={styles.metricSub}>Across active rounds</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricLabel}>MOCKS TAKEN</Text>
            <Text style={styles.metricIcon}>📝</Text>
          </View>
          <Text style={styles.metricBigNum}>6</Text>
          <Text style={styles.metricSub}>Proctored AI sessions</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricLabel}>AVERAGE SCORE</Text>
            <Text style={styles.metricIcon}>📈</Text>
          </View>
          <Text style={[styles.metricBigNum, { color: COLORS.greenSuccess }]}>78%</Text>
          <Text style={[styles.metricSub, { color: COLORS.greenSuccess }]}>+10% past 30 days</Text>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricLabel}>PAST RECORDS</Text>
            <Text style={styles.metricIcon}>🗂️</Text>
          </View>
          <Text style={styles.metricBigNum}>8</Text>
          <Text style={styles.metricSub}>4 Selected • 2 Expected</Text>
        </View>
      </View>

      {/* 3. UPCOMING INTERVIEWS SECTION */}
      <View style={{ gap: 8 }}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionTitle}>Upcoming Interviews</Text>
            <Text style={styles.sectionSub}>Critical milestones sorted by chronological priority and preparation readiness.</Text>
          </View>
          <View style={styles.pillBadgeContainer}>
            <Text style={styles.pillBadgeText}>2 Actions Pending</Text>
          </View>
        </View>

        <View style={styles.upcomingGrid}>
          {UPCOMING_INTERVIEWS.map((item) => (
            <View key={item.id} style={styles.upcomingCard}>
              <View style={styles.rowBetween}>
                <View style={styles.companyLogoRow}>
                  <View style={styles.logoBox}>
                    <Text style={styles.logoText}>{item.company.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.companyName}>{item.company}</Text>
                    <Text style={styles.roleTitle}>{item.role}</Text>
                  </View>
                </View>
                <View style={[styles.badgeTag, { backgroundColor: item.badgeBg }]}>
                  <Text style={[styles.badgeTagText, { color: item.badgeColor }]}>{item.badge}</Text>
                </View>
              </View>

              <View style={styles.detailsGroup}>
                <Text style={styles.detailText}>📅 {item.dateTime}</Text>
                <Text style={styles.detailText}>🎯 {item.round}</Text>
                <Pressable onPress={() => Linking.openURL(item.linkUrl)}>
                  <Text style={styles.linkText}>🔗 {item.linkText}</Text>
                </Pressable>
              </View>

              {/* Progress Bar */}
              <View style={{ gap: 4 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.prepLabel}>Preparation Progress</Text>
                  <Text style={[styles.prepPercent, item.isNeedsPrep && { color: COLORS.roseError }]}>
                    {item.prepProgress}% {item.isNeedsPrep ? '(Needs Prep)' : ''}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${item.prepProgress}%` },
                      item.isNeedsPrep ? { backgroundColor: COLORS.roseError } : { backgroundColor: COLORS.primaryTeal }
                    ]}
                  />
                </View>
              </View>

              {/* Skill Tags */}
              <View style={styles.chipRow}>
                {item.skills.map((sk, i) => (
                  <View key={i} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{sk}</Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.upcomingCardActions}>
                <Pressable
                  style={styles.primaryTealBtn}
                  onPress={() => handleStartPracticeModal(`${item.company} - ${item.role}`)}
                >
                  <Text style={styles.primaryTealBtnText}>{item.actionText}</Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => alert(`Details for ${item.company}`)}
                >
                  <Text style={styles.secondaryBtnText}>{item.secondaryBtn}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 4. SCHEDULE & TIMELINE SECTION */}
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionTitle}>📅 Schedule & Timeline</Text>
            <Text style={styles.sectionSub}>Manage your interview stages and synchronise deadlines with your study plan.</Text>
          </View>
          <View style={styles.toggleGroup}>
            <Pressable style={styles.toggleBtnActive}><Text style={styles.toggleBtnTextActive}>📋 List View</Text></Pressable>
            <Pressable style={styles.toggleBtn}><Text style={styles.toggleBtnText}>🗓️ Calendar</Text></Pressable>
          </View>
        </View>

        {/* Timeline Pills Filter Header */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['All (3)', 'Upcoming (2)', 'Today (0)', 'This Week (1)', 'Complete (0)'].map((filter) => (
              <Pressable
                key={filter}
                style={[styles.filterPill, selectedTimelineFilter === filter && styles.filterPillActive]}
                onPress={() => setSelectedTimelineFilter(filter)}
              >
                <Text style={[styles.filterPillText, selectedTimelineFilter === filter && styles.filterPillTextActive]}>{filter}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Calendar Strip Row */}
        <View style={styles.calendarStrip}>
          <View style={styles.calendarDayBox}>
            <Text style={styles.calDayName}>Sun 21</Text>
            <Text style={styles.calSub}>-</Text>
          </View>
          <View style={styles.calendarDayBox}>
            <Text style={styles.calDayName}>Mon 22</Text>
            <Text style={styles.calSub}>-</Text>
          </View>
          <View style={[styles.calendarDayBox, styles.calActiveAmber]}>
            <Text style={styles.calDayName}>Tue 23</Text>
            <Text style={styles.calEventTitle}>TechNova Prep</Text>
          </View>
          <View style={[styles.calendarDayBox, styles.calActiveGreen]}>
            <Text style={styles.calDayName}>Wed 24</Text>
            <Text style={styles.calEventTitle}>Google SWE</Text>
          </View>
          <View style={styles.calendarDayBox}>
            <Text style={styles.calDayName}>Thu 25</Text>
            <Text style={styles.calSub}>Mock Review</Text>
          </View>
          <View style={styles.calendarDayBox}>
            <Text style={styles.calDayName}>Fri 26</Text>
            <Text style={styles.calSub}>DSA Drill</Text>
          </View>
          <View style={styles.calendarDayBox}>
            <Text style={styles.calDayName}>Sat 27</Text>
            <Text style={styles.calSub}>FinFlow Prep</Text>
          </View>
        </View>

        {/* Data Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableCol, { flex: 2, fontWeight: '700' }]}>COMPANY & ROLE</Text>
            <Text style={[styles.tableCol, { flex: 1.5 }]}>DATE & TIME</Text>
            <Text style={[styles.tableCol, { flex: 1.5 }]}>ROUND</Text>
            <Text style={styles.tableCol}>TYPE</Text>
            <Text style={styles.tableCol}>READINESS</Text>
            <Text style={styles.tableCol}>STATUS</Text>
            <Text style={styles.tableCol}>ACTIONS</Text>
          </View>

          {TIMELINE_ROWS.map((row) => (
            <View key={row.id} style={styles.tableRow}>
              <View style={[styles.tableCol, { flex: 2 }]}>
                <Text style={styles.tableTextBold}>{row.company}</Text>
                <Text style={styles.tableTextSub}>{row.role}</Text>
              </View>
              <Text style={[styles.tableCol, styles.tableTextSub, { flex: 1.5 }]}>{row.date}</Text>
              <Text style={[styles.tableCol, styles.tableTextMain, { flex: 1.5 }]}>{row.round}</Text>
              <View style={styles.tableCol}>
                <View style={[styles.badgeTag, { backgroundColor: row.typeBg }]}>
                  <Text style={[styles.badgeTagText, { color: row.typeColor }]}>{row.type}</Text>
                </View>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableTextBold}>{row.readiness}%</Text>
              </View>
              <View style={styles.tableCol}>
                <View style={[styles.badgeTag, { backgroundColor: row.statusBg }]}>
                  <Text style={[styles.badgeTagText, { color: row.statusColor }]}>{row.status}</Text>
                </View>
              </View>
              <View style={styles.tableCol}>
                <Pressable style={styles.tableActionBtn} onPress={() => alert(`Details for ${row.company}`)}>
                  <Text style={styles.tableActionBtnText}>Details</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 5. VERIFIED SKILL MATRIX & QUESTIONS FROM VERIFIED PROJECTS (2-COLUMN GRID) */}
      <View style={styles.twoColumnGrid}>
        {/* Left Column: Verified Skill Matrix */}
        <View style={styles.columnCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.columnCardTitle}>🛡️ Verified Skill Matrix</Text>
              <Text style={styles.sectionSub}>Profile match with Google SWE intern requirements.</Text>
            </View>
          </View>

          <View style={{ gap: 12, marginTop: 10 }}>
            {VERIFIED_SKILL_MATRIX.map((item, idx) => (
              <View key={idx} style={{ gap: 4 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.skillMatrixName}>{item.skill}</Text>
                  <Text style={[styles.skillMatrixPercent, { color: item.color }]}>
                    {item.percent}% {item.status}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.shieldFooterBox}>
            <Text style={styles.shieldText}>SkillSetu Career Verification Shield: Active 🛡️</Text>
          </View>
        </View>

        {/* Right Column: Questions From Your Verified Projects */}
        <View style={styles.columnCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.columnCardTitle}>💻 Questions From Your Verified Projects</Text>
              <Text style={styles.sectionSub}>
                AI-generated from GitHub: <Text style={{ fontWeight: '700', color: COLORS.primaryTeal }}>aryanbhoge/student-management-system</Text>
              </Text>
            </View>
            <View style={styles.verifiedCodeTag}>
              <Text style={styles.verifiedCodeTagText}>Code Proof Verified</Text>
            </View>
          </View>

          <View style={{ gap: 12, marginTop: 10 }}>
            {PROJECT_QUESTIONS.map((pq) => (
              <View key={pq.id} style={styles.projectQuestionCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.pqTitle}>{pq.question}</Text>
                  <View style={styles.tagBadgeSmall}><Text style={styles.tagBadgeSmallText}>{pq.tag}</Text></View>
                </View>
                <Text style={styles.pqDesc}>{pq.desc}</Text>

                <View style={styles.rowBetween}>
                  <Text style={styles.pqRec}>{pq.recommendation}</Text>
                  <Pressable onPress={() => handleStartPracticeModal(pq.question)}>
                    <Text style={styles.practiceAiLink}>Practice with AI ➔</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 6. CURATED TECHNICAL & HR QUESTION BANK */}
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionTitle}>Curated Technical & HR Question Bank</Text>
            <Text style={styles.sectionSub}>Filter by topic, study the recommended STAR format, and get automated AI evaluation.</Text>
          </View>
          <Pressable style={styles.expandAllBtn}><Text style={styles.expandAllBtnText}>Expand All</Text></Pressable>
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['DSA & Algorithms (12)', 'SQL & Database Systems (08)', 'System Architecture (06)', 'REST APIs & Security (05)', 'HR & Behavioral (09)'].map((cat) => (
              <Pressable
                key={cat}
                style={[styles.filterPill, questionBankFilter === cat && styles.filterPillActive]}
                onPress={() => setQuestionBankFilter(cat)}
              >
                <Text style={[styles.filterPillText, questionBankFilter === cat && styles.filterPillTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Accordion Questions */}
        <View style={{ gap: 10, marginTop: 4 }}>
          {QUESTION_BANK.map((qb) => {
            const isExpanded = expandedQuestion === qb.id;
            return (
              <View key={qb.id} style={styles.accordionContainer}>
                <Pressable
                  style={styles.accordionHeader}
                  onPress={() => setExpandedQuestion(isExpanded ? null : qb.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={styles.qbBadge}><Text style={styles.qbBadgeText}>{qb.badge}</Text></View>
                    <Text style={styles.qbTitle}>{qb.title}</Text>
                  </View>
                  <Text style={styles.chevronText}>{isExpanded ? '▲' : '▼'}</Text>
                </Pressable>

                {isExpanded && (
                  <View style={styles.accordionBody}>
                    <View style={styles.twoColumnGrid}>
                      <View style={styles.conceptBox}>
                        <Text style={styles.boxHeaderTitle}>EXPECTED CONCEPTS</Text>
                        {qb.expectedConcepts.map((cp, idx) => (
                          <Text key={idx} style={styles.bulletText}>• {cp}</Text>
                        ))}
                      </View>

                      <View style={styles.starBox}>
                        <Text style={styles.boxHeaderTitle}>STAR STRUCTURING TIP</Text>
                        <Text style={styles.starTipText}>{qb.starTip}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* 7. PAST INTERVIEW HISTORY & TRAJECTORY ANALYTICS (2-COLUMN FOOTER) */}
      <View style={styles.twoColumnGrid}>
        {/* Left: Past Interview History */}
        <View style={styles.columnCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.columnCardTitle}>Past Interview History</Text>
              <Text style={styles.sectionSub}>Archived interview transcripts and verified outcomes.</Text>
            </View>
            <Text style={styles.recordsText}>8 Records Total</Text>
          </View>

          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableCol, { flex: 1.5, fontWeight: '700' }]}>COMPANY</Text>
              <Text style={[styles.tableCol, { flex: 2 }]}>ROLE & ROUND</Text>
              <Text style={styles.tableCol}>AI SCORE</Text>
              <Text style={styles.tableCol}>DECISION</Text>
              <Text style={[styles.tableCol, { flex: 2 }]}>KEY FEEDBACK</Text>
            </View>

            {PAST_HISTORY.map((h, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCol, styles.tableTextBold, { flex: 1.5 }]}>{h.company}</Text>
                <Text style={[styles.tableCol, styles.tableTextSub, { flex: 2 }]}>{h.role}</Text>
                <Text style={[styles.tableCol, styles.tableTextBold]}>{h.score}</Text>
                <View style={styles.tableCol}>
                  <View style={[styles.badgeTag, { backgroundColor: h.decisionBg }]}>
                    <Text style={[styles.badgeTagText, { color: h.decisionColor }]}>{h.decision}</Text>
                  </View>
                </View>
                <Text style={[styles.tableCol, styles.tableTextSub, { flex: 2 }]}>{h.feedback}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Right: Trajectory Analytics */}
        <View style={styles.columnCard}>
          <Text style={styles.columnCardTitle}>Trajectory Analytics</Text>
          <Text style={styles.sectionSub}>Month-over-month score improvement through AI sandbox repetitions.</Text>

          <View style={styles.growthHeroBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.growthLabel}>Historical Score Lift</Text>
              <Text style={styles.growthValue}>+10% Growth</Text>
            </View>
            <Text style={styles.growthSub}>August 2026 (Baseline): 68% ➔ September 2026 (Current): 78%</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.detailText}>Strongest Competency: <Text style={{ fontWeight: '800', color: COLORS.greenSuccess }}>Problem Solving (88%)</Text></Text>
            <Text style={styles.detailText}>Highest Growth Area: <Text style={{ fontWeight: '800', color: COLORS.primaryTeal }}>System Design (+18%)</Text></Text>
          </View>

          <Pressable style={styles.downloadPdfBtn} onPress={() => alert('Downloading Evaluation Dossier PDF...')}>
            <Text style={styles.downloadPdfBtnText}>Download Full Evaluation Dossier (PDF)</Text>
          </Pressable>
        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>© 2026 SkillSetu Career Intelligence Platform. Empowering next-generation engineers.</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerLink}>Support Center</Text>
        </View>
      </View>

      {/* INTERACTIVE PRACTICE MODAL */}
      {activeModal === 'practice' && modalData && (
        <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => setActiveModal(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, width < 768 && { width: '100%' }]}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.modalDomain}>AI PRACTICE SANDBOX</Text>
                  <Text style={styles.modalTitle}>{modalData.title}</Text>
                </View>
                <Pressable onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕ Close Room</Text>
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ gap: 12 }}>
                <View style={styles.questionBox}>
                  <Text style={styles.aiLabel}>🤖 AI INTERVIEWER ASKED:</Text>
                  <Text style={styles.questionText}>"{modalData.title}"</Text>
                </View>

                <View style={styles.rowBetween}>
                  <Text style={styles.prepLabel}>YOUR SPEECH OR TEXT RESPONSE:</Text>
                  <Pressable
                    style={[styles.recordBtn, isRecording && { backgroundColor: COLORS.roseError }]}
                    onPress={handleSimulateAudioRecord}
                  >
                    <Text style={styles.recordBtnText}>
                      {isRecording ? '🔴 Listening... (Simulating Speech)' : '🎙️ Dictate Answer'}
                    </Text>
                  </Pressable>
                </View>

                <TextInput
                  style={styles.answerInput}
                  multiline
                  numberOfLines={5}
                  value={practiceAnswer}
                  onChangeText={setPracticeAnswer}
                  placeholder="Dictate or type your STAR response..."
                />

                <Pressable
                  style={[styles.primaryTealBtnFull, !practiceAnswer.trim() && { opacity: 0.5 }]}
                  disabled={!practiceAnswer.trim()}
                  onPress={handleEvaluateAI}
                >
                  <Text style={styles.primaryTealBtnText}>Evaluate with AI Engine ⚡</Text>
                </Pressable>

                {aiFeedback && (
                  <View style={styles.feedbackBox}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.feedbackTitle}>{aiFeedback.verdict}</Text>
                      <Text style={styles.scoreText}>Score: {aiFeedback.score}%</Text>
                    </View>
                    <Text style={styles.detailText}><Text style={{ fontWeight: '800' }}>Strengths: </Text>{aiFeedback.strengths}</Text>
                    <Text style={styles.detailText}><Text style={{ fontWeight: '800' }}>STAR Tip: </Text>{aiFeedback.starTip}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSurface,
  },
  contentContainer: {
    padding: 16,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  topBanner: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  headerTagPill: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    backgroundColor: COLORS.tealLightBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headerTagSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerStatPillBox: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    alignItems: 'center',
  },
  headerStatPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  headerStatPillValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  startMockBtn: {
    backgroundColor: COLORS.blueInfoBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.blueInfo,
  },
  startMockBtnText: {
    color: COLORS.blueInfo,
    fontSize: 12,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  metricIcon: {
    fontSize: 12,
  },
  metricBigNum: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  pillBadgeContainer: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  upcomingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  upcomingCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    gap: 12,
  },
  companyLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  roleTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  badgeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailsGroup: {
    backgroundColor: COLORS.bgSurface,
    padding: 10,
    borderRadius: 6,
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: COLORS.textMain,
  },
  linkText: {
    fontSize: 11,
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  prepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  prepPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  barTrack: {
    height: 6,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.primaryTeal,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  skillChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  upcomingCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryTealBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryTealBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  secondaryBtnText: {
    color: COLORS.textMain,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    gap: 10,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSurface,
    borderRadius: 6,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  toggleBtnText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  toggleBtnTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryTeal,
    borderColor: COLORS.primaryTeal,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  calendarStrip: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  calendarDayBox: {
    flex: 1,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  calActiveAmber: {
    backgroundColor: COLORS.amberWarningBg,
    borderColor: COLORS.amberWarning,
  },
  calActiveGreen: {
    backgroundColor: COLORS.tealLightBg,
    borderColor: COLORS.primaryTeal,
  },
  calDayName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  calSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  calEventTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 2,
  },
  tableContainer: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSurface,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    alignItems: 'center',
  },
  tableCol: {
    flex: 1,
    fontSize: 11,
  },
  tableTextBold: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  tableTextSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  tableTextMain: {
    fontSize: 11,
    color: COLORS.textMain,
  },
  tableActionBtn: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  tableActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  columnCard: {
    flex: 1,
    minWidth: 340,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    gap: 10,
  },
  columnCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  skillMatrixName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  skillMatrixPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  shieldFooterBox: {
    backgroundColor: COLORS.tealSubtleBg,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  shieldText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTealDark,
  },
  verifiedCodeTag: {
    backgroundColor: COLORS.greenSuccessBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedCodeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.greenSuccess,
  },
  projectQuestionCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  pqTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMain,
    flex: 1,
  },
  tagBadgeSmall: {
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  tagBadgeSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  pqDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  pqRec: {
    fontSize: 10,
    color: COLORS.primaryTeal,
    fontWeight: '600',
  },
  practiceAiLink: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  expandAllBtn: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  expandAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  accordionContainer: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  qbBadge: {
    backgroundColor: COLORS.tealLightBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qbBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryTealDark,
  },
  qbTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  chevronText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  accordionBody: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
    backgroundColor: COLORS.surfaceCard,
  },
  conceptBox: {
    flex: 1,
    backgroundColor: COLORS.bgSurface,
    padding: 10,
    borderRadius: 6,
    gap: 4,
  },
  starBox: {
    flex: 1,
    backgroundColor: COLORS.amberWarningBg,
    padding: 10,
    borderRadius: 6,
    gap: 4,
  },
  boxHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 11,
    color: COLORS.textMain,
    lineHeight: 15,
  },
  starTipText: {
    fontSize: 11,
    color: COLORS.textMain,
    lineHeight: 15,
    fontStyle: 'italic',
  },
  recordsText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  growthHeroBox: {
    backgroundColor: COLORS.tealLightBg,
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  growthLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTealDark,
  },
  growthValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.greenSuccess,
  },
  growthSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  downloadPdfBtn: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  downloadPdfBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footerLink: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 700,
    maxHeight: '90%',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 14,
    padding: 20,
  },
  modalDomain: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  closeBtn: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  questionBox: {
    backgroundColor: COLORS.tealLightBg,
    padding: 12,
    borderRadius: 6,
    gap: 4,
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  questionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  recordBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  recordBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  answerInput: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderRadius: 6,
    padding: 10,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  primaryTealBtnFull: {
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  feedbackBox: {
    backgroundColor: COLORS.greenSuccessBg,
    padding: 12,
    borderRadius: 6,
    gap: 6,
    marginTop: 6,
  },
  feedbackTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.greenSuccess,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.greenSuccess,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
