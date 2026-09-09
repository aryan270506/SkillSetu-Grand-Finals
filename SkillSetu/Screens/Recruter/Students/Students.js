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
  purpleBg: '#F3E8FF',
  purpleText: '#6B21A8',
};

// Hover Animated Card
function HoverCard({ children, style, onPress, isSelected }) {
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
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          style,
          isSelected && styles.cardSelectedBorder,
          { transform: [{ scale: scaleAnim }] },
        ]}
        // @ts-ignore - Web hover events
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Hover Animated Button
function HoverButton({ children, style, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleMouseEnter = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.03,
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
        // @ts-ignore - Web hover events
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const STUDENTS_DATA = [
  {
    id: 'rahul',
    name: 'Rahul Sharma',
    avatar: 'RS',
    avatarBg: '#004D40',
    verified: true,
    degree: 'B.Tech CSE • IIT Roorkee \'27',
    cgpa: '8.9 / 10',
    matchScore: '96%',
    matchTag: 'AI Top Match',
    matchQuality: '96% Skill Match (Excellent)',
    skills: [
      { name: 'Python', level: 'Adv' },
      { name: 'SQL', level: 'Adv' },
      { name: 'Node.js', level: 'Int' },
      { name: 'Docker', level: 'Int' },
    ],
    projectsCount: 3,
    certificationsCount: 1,
    availability: 'Available Now • Remote / Hybrid',
    bookmarked: true,
    rank: '#1 Candidate',
    requiredSkillsAudit: '98%',
    resumeScore: '92/100',
    projectsQuality: '95%',
    githubEvidence: '90%',
    recommendationNote:
      'Exceptional fit for Core Backend. Demonstrated hands-on schema optimization and automated test suites in distributed systems.',
    skillBreakdown: [
      { skill: 'Python', pct: 100, label: '100% (Verified)' },
      { skill: 'SQL & PostgreSQL', pct: 95, label: '95% (Verified)' },
      { skill: 'Node.js & Express', pct: 90, label: '90% (Verified)' },
      { skill: 'Docker', pct: 80, label: '80% (Intermediate)' },
      { skill: 'AWS Cloud', pct: 65, label: '65% (Developing Gap)' },
    ],
    verifiedProjects: [
      {
        title: 'Student Management System',
        stars: 12,
        desc: 'FastAPI + PostgreSQL backend architecture with JWT authentication and RBAC.',
        stats: '142 commits  •  92% code-test coverage',
      },
      {
        title: 'Distributed Cache Service',
        stars: 8,
        desc: 'Redis + Python lightweight in-memory key-value eviction simulator.',
        stats: 'Concurrency tested',
      },
    ],
    resumeFileName: 'Rahul_Sharma_Resume.pdf',
    resumeSize: '1.2 MB • Updated 4 days ago',
  },
  {
    id: 'priya',
    name: 'Priya Patil',
    avatar: 'PP',
    avatarBg: '#7C3AED',
    verified: true,
    degree: 'B.Tech IT • VJTI Mumbai \'27',
    cgpa: '9.1 / 10',
    matchScore: '93%',
    matchTag: 'Recommended',
    matchQuality: '93% Skill Match (Strong)',
    skills: [
      { name: 'Python', level: 'Adv' },
      { name: 'PyTorch', level: 'Int' },
      { name: 'Machine Learning', level: 'Int' },
      { name: 'FastAPI', level: 'Adv' },
    ],
    projectsCount: 4,
    certificationsCount: 2,
    availability: 'Available Now • Hybrid',
    bookmarked: false,
    rank: '#2 Candidate',
    requiredSkillsAudit: '94%',
    resumeScore: '95/100',
    projectsQuality: '96%',
    githubEvidence: '92%',
    recommendationNote:
      'Strong Machine Learning background with production FastAPI integration experience. Excellent academic standing.',
    skillBreakdown: [
      { skill: 'Python', pct: 100, label: '100% (Verified)' },
      { skill: 'PyTorch & ML', pct: 94, label: '94% (Verified)' },
      { skill: 'FastAPI', pct: 90, label: '90% (Verified)' },
      { skill: 'SQL', pct: 85, label: '85% (Verified)' },
      { skill: 'Docker', pct: 70, label: '70% (Intermediate)' },
    ],
    verifiedProjects: [
      {
        title: 'AI Resume Screener Pipeline',
        stars: 24,
        desc: 'Transformers + PyTorch NLP pipeline for candidate automated score auditing.',
        stats: '89 commits  •  95% accuracy metric',
      },
    ],
    resumeFileName: 'Priya_Patil_Resume.pdf',
    resumeSize: '1.4 MB • Updated 2 days ago',
  },
  {
    id: 'aditya',
    name: 'Aditya Singh',
    avatar: 'AS',
    avatarBg: '#D97706',
    verified: true,
    degree: 'B.Tech CSE • BITS Pilani \'27',
    cgpa: '8.4 / 10',
    matchScore: '91%',
    matchTag: 'Strong Fit',
    matchQuality: '91% Skill Match (Strong)',
    skills: [
      { name: 'Go', level: 'Adv' },
      { name: 'Python', level: 'Adv' },
      { name: 'PostgreSQL', level: 'Adv' },
      { name: 'Kubernetes', level: 'Int' },
    ],
    projectsCount: 3,
    certificationsCount: 1,
    availability: 'Available in 2 Weeks • Remote',
    bookmarked: false,
    rank: '#3 Candidate',
    requiredSkillsAudit: '92%',
    resumeScore: '89/100',
    projectsQuality: '91%',
    githubEvidence: '88%',
    recommendationNote:
      'Go and Microservices specialist. Proficient in container orchestration and backend API design.',
    skillBreakdown: [
      { skill: 'Go (Golang)', pct: 95, label: '95% (Verified)' },
      { skill: 'PostgreSQL', pct: 90, label: '90% (Verified)' },
      { skill: 'Docker & K8s', pct: 82, label: '82% (Intermediate)' },
      { skill: 'Python', pct: 80, label: '80% (Verified)' },
    ],
    verifiedProjects: [
      {
        title: 'High-Throughput Go Rate Limiter',
        stars: 18,
        desc: 'Token bucket rate limiting middleware engineered in Go for gRPC services.',
        stats: '64 commits  •  Benchmark verified',
      },
    ],
    resumeFileName: 'Aditya_Singh_Resume.pdf',
    resumeSize: '1.1 MB • Updated 1 week ago',
  },
  {
    id: 'sneha',
    name: 'Sneha Joshi',
    avatar: 'SJ',
    avatarBg: '#2563EB',
    verified: true,
    degree: 'B.Tech CSE • COEP Pune \'27',
    cgpa: '8.8 / 10',
    matchScore: '89%',
    matchTag: 'Good Fit',
    matchQuality: '89% Skill Match (Good)',
    skills: [
      { name: 'React 18', level: 'Adv' },
      { name: 'TypeScript', level: 'Adv' },
      { name: 'Next.js', level: 'Int' },
      { name: 'Tailwind CSS', level: 'Adv' },
    ],
    projectsCount: 5,
    certificationsCount: 2,
    availability: 'Available Now • On-site (Pune)',
    bookmarked: false,
    rank: '#4 Candidate',
    requiredSkillsAudit: '89%',
    resumeScore: '90/100',
    projectsQuality: '94%',
    githubEvidence: '86%',
    recommendationNote:
      'Frontend & UI engineering talent with multiple hackathon wins and responsive web system design.',
    skillBreakdown: [
      { skill: 'React & TS', pct: 96, label: '96% (Verified)' },
      { skill: 'Next.js', pct: 88, label: '88% (Verified)' },
      { skill: 'Tailwind CSS', pct: 95, label: '95% (Verified)' },
      { skill: 'State Management', pct: 85, label: '85% (Verified)' },
    ],
    verifiedProjects: [
      {
        title: 'Realtime Analytics Dashboard UI',
        stars: 31,
        desc: 'Component design system with live WebSocket chart updates and Tailwind dark mode.',
        stats: '198 commits  •  Hackathon Winner',
      },
    ],
    resumeFileName: 'Sneha_Joshi_Resume.pdf',
    resumeSize: '1.5 MB • Updated 3 days ago',
  },
  {
    id: 'tanvi',
    name: 'Tanvi Deshmukh',
    avatar: 'TD',
    avatarBg: '#059669',
    verified: true,
    degree: 'B.Tech ECE • NIT Trichy \'26',
    cgpa: '9.0 / 10',
    matchScore: '92%',
    matchTag: 'Strong Fit',
    matchQuality: '92% Skill Match (Strong)',
    skills: [
      { name: 'Django', level: 'Adv' },
      { name: 'REST APIs', level: 'Adv' },
      { name: 'PostgreSQL', level: 'Adv' },
      { name: 'AWS', level: 'Int' },
    ],
    projectsCount: 3,
    certificationsCount: 1,
    availability: 'Available Now • Remote / BLR',
    bookmarked: false,
    rank: '#5 Candidate',
    requiredSkillsAudit: '91%',
    resumeScore: '93/100',
    projectsQuality: '88%',
    githubEvidence: '87%',
    recommendationNote:
      'Consistent top academic scorer with AWS Cloud Practitioner certification and Django REST framework experience.',
    skillBreakdown: [
      { skill: 'Python & Django', pct: 92, label: '92% (Verified)' },
      { skill: 'PostgreSQL', pct: 90, label: '90% (Verified)' },
      { skill: 'AWS Cloud', pct: 80, label: '80% (AWS Certified)' },
    ],
    verifiedProjects: [
      {
        title: 'E-Commerce Microservices Backend',
        stars: 15,
        desc: 'Django REST + Celery async task queue for order fulfillment.',
        stats: '76 commits',
      },
    ],
    resumeFileName: 'Tanvi_Deshmukh_Resume.pdf',
    resumeSize: '1.0 MB • Updated 5 days ago',
  },
  {
    id: 'rohan',
    name: 'Rohan Varma',
    avatar: 'RV',
    avatarBg: '#DC2626',
    verified: true,
    degree: 'B.Tech EE • IIT Delhi \'26',
    cgpa: '8.5 / 10',
    matchScore: '86%',
    matchTag: 'Good Fit',
    matchQuality: '86% Skill Match (Good)',
    skills: [
      { name: 'C++', level: 'Adv' },
      { name: 'Python', level: 'Int' },
      { name: 'Data Structures', level: 'Adv' },
      { name: 'System Design', level: 'Int' },
    ],
    projectsCount: 2,
    certificationsCount: 1,
    availability: 'Available from June • Hybrid',
    bookmarked: false,
    rank: '#6 Candidate',
    requiredSkillsAudit: '86%',
    resumeScore: '88/100',
    projectsQuality: '85%',
    githubEvidence: '84%',
    recommendationNote:
      'Competitive coding specialist with strong problem solving logic and algorithmic foundation.',
    skillBreakdown: [
      { skill: 'C++ & DSA', pct: 98, label: '98% (Competitive Coder)' },
      { skill: 'Python', pct: 80, label: '80% (Verified)' },
      { skill: 'System Design', pct: 75, label: '75% (Intermediate)' },
    ],
    verifiedProjects: [
      {
        title: 'Algorithmic Trading Backtester',
        stars: 9,
        desc: 'C++ order book match engine simulator for quantitative backtesting.',
        stats: '54 commits',
      },
    ],
    resumeFileName: 'Rohan_Varma_Resume.pdf',
    resumeSize: '1.3 MB • Updated 1 week ago',
  },
];

export default function Students() {
  const { width } = useWindowDimensions();
  const isCompact = width < 1100;

  // Selected Student for Right Inspection Drawer
  const [selectedStudent, setSelectedStudent] = useState(STUDENTS_DATA[0]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Page Header */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.breadcrumb}>RECRUITER WORKSPACE • Candidate Search & AI Recommendations</Text>
            <Text style={styles.pageTitle}>Students</Text>
            <Text style={styles.pageSub}>
              Discover talented students based on their skills, education, projects and internship preferences.
            </Text>
          </View>
          <View style={styles.headerActionsRight}>
            <View style={styles.savedStudentsBadge}>
              <Text style={styles.savedStudentsBadgeText}>🔖 Saved Students  <Text style={styles.savedCount}>46</Text></Text>
            </View>
            <HoverButton style={styles.findMatchesBtn} onPress={() => {}}>
              <Text style={styles.findMatchesBtnText}>⚡ Find Best Matches</Text>
            </HoverButton>
          </View>
        </View>

        {/* Top Summary Metrics */}
        <View style={styles.metricsRow}>
          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Total Students</Text>
              <Text style={styles.metricIcon}>👥</Text>
            </View>
            <Text style={styles.metricValue}>12,450</Text>
            <Text style={styles.metricSubGreen}>📈 +18% active across verified campuses</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Available for Internship</Text>
              <View style={styles.immediateTag}>
                <Text style={styles.immediateTagText}>Immediate</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>4,820</Text>
            <Text style={styles.metricSub}>Ready to join within 2 weeks</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Top Skill Matches</Text>
              <View style={styles.scoreBadgePurple}>
                <Text style={styles.scoreBadgePurpleText}>&gt;90% Score</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>328</Text>
            <Text style={styles.metricSub}>High-confidence fits for active roles</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Saved Students</Text>
              <Text style={styles.metricIcon}>🔖</Text>
            </View>
            <Text style={styles.metricValue}>46</Text>
            <Text style={styles.metricSub}>Bookmarked candidates across teams</Text>
          </HoverCard>
        </View>

        {/* AI Recommendation Engine Card */}
        <HoverCard style={styles.aiBannerCard}>
          <View style={styles.aiBannerRow}>
            <View style={styles.aiBannerLeft}>
              <View style={styles.aiBannerTitleRow}>
                <Text style={styles.aiIcon}>✨</Text>
                <Text style={styles.aiBannerTitle}>Find Students for Your Internship</Text>
              </View>
              <Text style={styles.aiBannerDesc}>
                SkillSetu recommends top students by evaluating verified skills, GitHub repos, project evidence, and internship preferences.
              </Text>
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>
                  ✓ Showing top recommendations for Backend Development Intern (6 Openings • ₹35,000/mo)
                </Text>
              </View>
            </View>
            <View style={styles.aiBannerRight}>
              <View style={styles.roleDropdownSelector}>
                <Text style={styles.roleDropdownText}>Backend Development Intern (6)  ▼</Text>
              </View>
              <HoverButton style={styles.findBestMatchesBtn} onPress={() => {}}>
                <Text style={styles.findBestMatchesBtnText}>Find Best Matches ➔</Text>
              </HoverButton>
            </View>
          </View>
        </HoverCard>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <View style={styles.searchIconBox}>
            <Text style={styles.searchIconText}>🔍</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterPillsRow}>
              {['Skills (All)', 'Skill Level', 'Degree & Branch', 'Graduation Year', 'Availability', 'Work Mode', 'Skill Match: 80%+'].map((filter, idx) => (
                <View key={idx} style={[styles.filterDropdownPill, filter.includes('80%') && styles.filterDropdownPillActive]}>
                  <Text style={[styles.filterDropdownPillText, filter.includes('80%') && styles.filterDropdownPillActiveText]}>
                    {filter} {filter.includes('80%') ? '✕' : '▼'}
                  </Text>
                </View>
              ))}
              <Pressable style={styles.clearFiltersBtn}>
                <Text style={styles.clearFiltersBtnText}>✕ Clear Filters</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderTitleRow}>
            <Text style={styles.sectionTitle}>Recommended & Discovered Students</Text>
            <Text style={styles.verifiedCountBadge}>12,450 verified</Text>
          </View>
          <View style={styles.sortToggleRow}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            <View style={styles.sortDropdown}>
              <Text style={styles.sortDropdownText}>Best Match (AI Ranked) ▼</Text>
            </View>
            <View style={styles.viewModeToggle}>
              <View style={styles.viewModeActive}>
                <Text style={styles.viewModeTextActive}>▦ Cards</Text>
              </View>
              <View style={styles.viewModeInactive}>
                <Text style={styles.viewModeTextInactive}>≡ List</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2-Column Workspace Grid */}
        <View style={[styles.workspaceGrid, isCompact && styles.workspaceGridCompact]}>
          {/* Left Students Cards Grid */}
          <View style={styles.leftStudentsColumn}>
            <View style={styles.cardsGridTwoCol}>
              {STUDENTS_DATA.map((student) => {
                const isSelected = selectedStudent.id === student.id;
                return (
                  <HoverCard
                    key={student.id}
                    style={styles.studentCard}
                    isSelected={isSelected}
                    onPress={() => setSelectedStudent(student)}
                  >
                    <View style={styles.studentCardHeader}>
                      <View style={styles.studentAvatarCol}>
                        <View style={[styles.avatarCircle, { backgroundColor: student.avatarBg }]}>
                          <Text style={styles.avatarText}>{student.avatar}</Text>
                        </View>
                      </View>

                      <View style={styles.studentNameCol}>
                        <View style={styles.studentNameRow}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          {student.verified && <Text style={styles.verifiedCheck}>✓</Text>}
                        </View>
                        <Text style={styles.studentDegree}>{student.degree}</Text>
                        <Text style={styles.studentCgpa}>CGPA: {student.cgpa}</Text>
                      </View>

                      <Pressable style={styles.bookmarkIconBtn}>
                        <Text style={styles.bookmarkIconText}>{student.bookmarked ? '🔖' : '🔖'}</Text>
                      </Pressable>
                    </View>

                    {/* Match Badges */}
                    <View style={styles.matchBadgesRow}>
                      <View style={styles.aiMatchTag}>
                        <Text style={styles.aiMatchTagText}>✨ {student.matchTag}</Text>
                      </View>
                      <View style={styles.matchPctTag}>
                        <Text style={styles.matchPctTagText}>{student.matchQuality}</Text>
                      </View>
                    </View>

                    {/* Skills Tags */}
                    <View style={styles.skillsRow}>
                      {student.skills.map((sk, idx) => (
                        <View key={idx} style={styles.skillPill}>
                          <Text style={styles.skillPillText}>{sk.name} ({sk.level})</Text>
                        </View>
                      ))}
                    </View>

                    {/* Stats & Availability */}
                    <View style={styles.studentCardMeta}>
                      <Text style={styles.metaItem}>
                        <Text style={styles.metaBold}>{student.projectsCount}</Text> Projects  •  <Text style={styles.metaBold}>{student.certificationsCount}</Text> Certification
                      </Text>
                      <Text style={styles.metaAvailability}>• {student.availability}</Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.cardActionsRow}>
                      <HoverButton
                        style={styles.viewProfileBtn}
                        onPress={() => setSelectedStudent(student)}
                      >
                        <Text style={styles.viewProfileBtnText}>👁️ View Profile</Text>
                      </HoverButton>
                      <HoverButton style={styles.shortlistBtn} onPress={() => {}}>
                        <Text style={styles.shortlistBtnText}>+ Shortlist</Text>
                      </HoverButton>
                    </View>
                  </HoverCard>
                );
              })}
            </View>

            {/* Pagination Bar */}
            <View style={styles.paginationRow}>
              <Text style={styles.paginationShowing}>Showing 1-6 of 12,450 verified students</Text>
              <View style={styles.paginationControls}>
                <Pressable style={styles.pageArrowBtn}>
                  <Text style={styles.pageArrowText}>‹</Text>
                </Pressable>
                <View style={styles.pageNumActive}>
                  <Text style={styles.pageNumActiveText}>1</Text>
                </View>
                <View style={styles.pageNum}>
                  <Text style={styles.pageNumText}>2</Text>
                </View>
                <View style={styles.pageNum}>
                  <Text style={styles.pageNumText}>3</Text>
                </View>
                <Text style={styles.pageDots}>...</Text>
                <View style={styles.pageNum}>
                  <Text style={styles.pageNumText}>208</Text>
                </View>
                <Pressable style={styles.pageArrowBtn}>
                  <Text style={styles.pageArrowText}>›</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Right Selected Candidate Details Dossier Sidebar */}
          <View style={styles.rightDossierColumn}>
            <View style={styles.dossierCard}>
              {/* Dossier Header */}
              <View style={styles.dossierHeaderRow}>
                <View style={[styles.dossierAvatarCircle, { backgroundColor: selectedStudent.avatarBg }]}>
                  <Text style={styles.dossierAvatarText}>{selectedStudent.avatar}</Text>
                </View>
                <View style={styles.dossierHeaderInfo}>
                  <View style={styles.dossierNameRow}>
                    <Text style={styles.dossierName}>{selectedStudent.name}</Text>
                    {selectedStudent.verified && <Text style={styles.verifiedCheck}>✓</Text>}
                  </View>
                  <Text style={styles.dossierDegree}>{selectedStudent.degree}</Text>
                  <Text style={styles.dossierCgpa}>CGPA: {selectedStudent.cgpa}</Text>
                </View>
                <Pressable style={styles.dossierBookmarkBtn}>
                  <Text style={styles.bookmarkIconText}>🔖</Text>
                </Pressable>
              </View>

              {/* Match Banner */}
              <View style={styles.roleMatchBanner}>
                <View style={styles.roleMatchLeft}>
                  <Text style={styles.roleMatchLabel}>MATCH FOR ACTIVE ROLE</Text>
                  <Text style={styles.roleMatchTitle}>Backend Development Intern</Text>
                  <Text style={styles.roleMatchSub}>TechNova Engineering • ₹35,000/mo</Text>
                </View>
                <View style={styles.roleMatchScoreBadge}>
                  <Text style={styles.roleMatchScoreText}>{selectedStudent.matchScore} Match</Text>
                </View>
              </View>

              {/* AI Match Audit Box */}
              <View style={styles.aiAuditCard}>
                <View style={styles.aiAuditHeader}>
                  <View style={styles.aiAuditTitleRow}>
                    <Text style={styles.aiAuditIcon}>✨</Text>
                    <Text style={styles.aiAuditTitle}>AI Match Audit</Text>
                  </View>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>{selectedStudent.rank}</Text>
                  </View>
                </View>

                <View style={styles.auditGrid}>
                  <Text style={styles.auditItem}>Required Skills: <Text style={styles.auditVal}>{selectedStudent.requiredSkillsAudit}</Text></Text>
                  <Text style={styles.auditItem}>Resume Score: <Text style={styles.auditVal}>{selectedStudent.resumeScore}</Text></Text>
                  <Text style={styles.auditItem}>Projects Quality: <Text style={styles.auditVal}>{selectedStudent.projectsQuality}</Text></Text>
                  <Text style={styles.auditItem}>GitHub Evidence: <Text style={styles.auditVal}>{selectedStudent.githubEvidence}</Text></Text>
                </View>
                <Text style={styles.auditCutoff}>Academics: <Text style={styles.auditCutoffVal}>Meets 8.0+ Cutoff ({selectedStudent.cgpa})</Text></Text>

                <View style={styles.recommendationNoteBox}>
                  <Text style={styles.recommendationNoteText}>
                    <Text style={styles.recBold}>Recommendation Note:</Text> {selectedStudent.recommendationNote}
                  </Text>
                </View>
              </View>

              {/* Skill Match Breakdown */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.dossierSectionTitle}>Skill Match Breakdown</Text>
                  <Text style={styles.dossierOverallPct}>{selectedStudent.matchScore} Overall</Text>
                </View>

                {selectedStudent.skillBreakdown.map((item, idx) => (
                  <View key={idx} style={styles.skillBarItem}>
                    <View style={styles.skillBarLabelRow}>
                      <Text style={styles.skillBarName}>{item.skill}</Text>
                      <Text style={styles.skillBarPctText}>{item.label}</Text>
                    </View>
                    <View style={styles.skillBarTrack}>
                      <View style={[styles.skillBarFill, { width: `${item.pct}%` }]} />
                    </View>
                  </View>
                ))}
              </View>

              {/* Verified Projects */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.dossierSectionTitle}>Verified Projects (Code Proof)</Text>
                  <Text style={styles.codeIcon}>&lt;&gt;</Text>
                </View>

                {selectedStudent.verifiedProjects.map((proj, idx) => (
                  <View key={idx} style={styles.projectCardItem}>
                    <View style={styles.projectCardTitleRow}>
                      <Text style={styles.projectCardTitle}>{proj.title} 🔗</Text>
                      <Text style={styles.projectStarCount}>⭐ {proj.stars}</Text>
                    </View>
                    <Text style={styles.projectCardDesc}>{proj.desc}</Text>
                    <Text style={styles.projectCardStats}>{proj.stats}</Text>
                  </View>
                ))}
              </View>

              {/* Verified Resume Card */}
              <View style={styles.resumeCardItem}>
                <Text style={styles.pdfIcon}>📄</Text>
                <View style={styles.resumeTextCol}>
                  <Text style={styles.resumeFileName}>{selectedStudent.resumeFileName}</Text>
                  <Text style={styles.resumeMeta}>{selectedStudent.resumeSize}</Text>
                </View>
                <View style={styles.resumeActions}>
                  <Text style={styles.resumeActionBtn}>👁️</Text>
                  <Text style={styles.resumeActionBtn}>📥</Text>
                </View>
              </View>

              {/* Action CTAs */}
              <HoverButton style={styles.primaryShortlistBtn} onPress={() => {}}>
                <Text style={styles.primaryShortlistBtnText}>✓ Shortlist to Internship</Text>
              </HoverButton>

              <View style={styles.secondaryActionsRow}>
                <HoverButton style={styles.messageBtn} onPress={() => {}}>
                  <Text style={styles.messageBtnText}>✉ Send Message</Text>
                </HoverButton>
                <HoverButton style={styles.scheduleRoundBtn} onPress={() => {}}>
                  <Text style={styles.scheduleRoundBtnText}>📅 Schedule Round</Text>
                </HoverButton>
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
    marginBottom: 20,
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
  savedStudentsBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  savedStudentsBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  savedCount: {
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  findMatchesBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  findMatchesBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Metric Row
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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  metricIcon: {
    fontSize: 16,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  metricSubGreen: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accentGreen,
  },
  immediateTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  immediateTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  scoreBadgePurple: {
    backgroundColor: COLORS.purpleBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scoreBadgePurpleText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.purpleText,
  },

  // AI Banner Card
  aiBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  aiBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  aiBannerLeft: {
    flex: 1,
    minWidth: 300,
  },
  aiBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  aiIcon: {
    fontSize: 18,
  },
  aiBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  aiBannerDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  activeFilterPill: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  activeFilterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  aiBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleDropdownSelector: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  findBestMatchesBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  findBestMatchesBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    gap: 10,
  },
  searchIconBox: {
    paddingLeft: 8,
  },
  searchIconText: {
    fontSize: 16,
  },
  filterScroll: {
    flex: 1,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterDropdownPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterDropdownPillActive: {
    backgroundColor: COLORS.mintBg,
  },
  filterDropdownPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  filterDropdownPillActiveText: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  clearFiltersBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearFiltersBtnText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  verifiedCountBadge: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sortToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sortDropdown: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortDropdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    padding: 2,
  },
  viewModeActive: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  viewModeTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  viewModeInactive: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewModeTextInactive: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // 2-Column Grid
  workspaceGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  workspaceGridCompact: {
    flexDirection: 'column',
  },
  leftStudentsColumn: {
    flex: 3,
  },
  rightDossierColumn: {
    flex: 2,
    minWidth: 320,
  },

  // Student Card
  cardsGridTwoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  studentCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardSelectedBorder: {
    borderColor: COLORS.primaryTeal,
    borderWidth: 2,
    backgroundColor: '#FAFCFC',
  },
  studentCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  studentAvatarCol: {},
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  studentNameCol: {
    flex: 1,
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  verifiedCheck: {
    fontSize: 13,
    color: COLORS.primaryTeal,
    fontWeight: '900',
  },
  studentDegree: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  studentCgpa: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  bookmarkIconBtn: {
    padding: 2,
  },
  bookmarkIconText: {
    fontSize: 16,
  },

  // Badges
  matchBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  aiMatchTag: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiMatchTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  matchPctTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchPctTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMain,
  },

  // Skills
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillPillText: {
    fontSize: 11,
    color: COLORS.textMain,
    fontWeight: '600',
  },

  // Card Meta
  studentCardMeta: {
    marginBottom: 14,
  },
  metaItem: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  metaBold: {
    fontWeight: '800',
    color: COLORS.textMain,
  },
  metaAvailability: {
    fontSize: 11,
    color: COLORS.accentGreen,
    fontWeight: '600',
    marginTop: 2,
  },

  // Card Actions
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewProfileBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewProfileBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  shortlistBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  shortlistBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  paginationShowing: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageArrowText: {
    fontSize: 14,
    color: COLORS.textMain,
  },
  pageNumActive: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumActiveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pageNum: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumText: {
    fontSize: 12,
    color: COLORS.textMain,
  },
  pageDots: {
    color: COLORS.textMuted,
    paddingHorizontal: 4,
  },

  // Dossier Sidebar
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dossierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  dossierAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dossierAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  dossierHeaderInfo: {
    flex: 1,
  },
  dossierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dossierName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  dossierDegree: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  dossierCgpa: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 2,
  },
  dossierBookmarkBtn: {
    padding: 4,
  },

  // Role Match Banner
  roleMatchBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  roleMatchLeft: {
    flex: 1,
  },
  roleMatchLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  roleMatchTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 2,
  },
  roleMatchSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  roleMatchScoreBadge: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleMatchScoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // AI Audit Card
  aiAuditCard: {
    backgroundColor: COLORS.mintBg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  aiAuditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiAuditTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiAuditIcon: {
    fontSize: 16,
  },
  aiAuditTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  rankBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  auditGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  auditItem: {
    fontSize: 11,
    color: COLORS.primaryTeal,
  },
  auditVal: {
    fontWeight: '800',
  },
  auditCutoff: {
    fontSize: 11,
    color: COLORS.primaryTeal,
    marginBottom: 10,
  },
  auditCutoffVal: {
    fontWeight: '800',
  },
  recommendationNoteBox: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
  },
  recommendationNoteText: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textMain,
  },
  recBold: {
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },

  // Sections
  sectionBox: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dossierSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  dossierOverallPct: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  skillBarItem: {
    marginBottom: 8,
  },
  skillBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  skillBarName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  skillBarPctText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  skillBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    backgroundColor: COLORS.primaryTeal,
  },
  codeIcon: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  projectCardItem: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  projectCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  projectStarCount: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  projectCardDesc: {
    fontSize: 11,
    color: COLORS.textMain,
    lineHeight: 16,
    marginBottom: 4,
  },
  projectCardStats: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  // Resume Card
  resumeCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  pdfIcon: {
    fontSize: 20,
  },
  resumeTextCol: {
    flex: 1,
  },
  resumeFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  resumeMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  resumeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  resumeActionBtn: {
    fontSize: 16,
    padding: 4,
  },

  // Dossier CTAs
  primaryShortlistBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryShortlistBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  messageBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  scheduleRoundBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  scheduleRoundBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
});
