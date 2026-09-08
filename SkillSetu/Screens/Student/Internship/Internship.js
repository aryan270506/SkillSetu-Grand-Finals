import React, { useState, useRef } from 'react';
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
  Modal,
} from 'react-native';

const COLORS = {
  canvas: '#f9f9f8',       // Warm off-white canvas
  panel: '#f3f4f3',        // Light gray background
  paper: '#ffffff',        // Card white
  ink: '#1a1c1c',          // Dark charcoal text
  muted: '#3d4947',        // Muted gray text
  subtle: '#bcc9c6',       // Border color
  green: '#00685f',        // Primary Teal Green (SkillSetu Green)
  greenLight: '#f4fffc',   // Very light primary green
  teal: '#008378',         // Deep Teal accent
  mint: '#f0fdfa',         // Light mint tint
  amber: '#825100',        // Amber
  amberLight: '#ffddb8',   // Light Amber
  rose: '#ba1a1a',         // Error Red
  roseLight: '#ffdad6',    // Light Red
  blue: '#545f73',         // Slate Blue
  blueLight: '#d5e0f8',    // Light Blue
};

// Reusable HoverableCard helper for desktop/web animations
function HoverableCard({ children, style, containerStyle, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.02,
          friction: 8,
          tension: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shadow, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === 'web') {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.0,
          friction: 8,
          tension: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shadow, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  const shadowOpacity = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.03, 0.1],
  });

  const shadowRadius = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 16],
  });

  const flatStyle = StyleSheet.flatten(style);
  const containerLayout = {};
  if (flatStyle) {
    if (flatStyle.flex !== undefined) containerLayout.flex = flatStyle.flex;
    if (flatStyle.width !== undefined) containerLayout.width = flatStyle.width;
    if (flatStyle.margin !== undefined) containerLayout.margin = flatStyle.margin;
    if (flatStyle.marginTop !== undefined) containerLayout.marginTop = flatStyle.marginTop;
    if (flatStyle.marginBottom !== undefined) containerLayout.marginBottom = flatStyle.marginBottom;
    if (flatStyle.marginLeft !== undefined) containerLayout.marginLeft = flatStyle.marginLeft;
    if (flatStyle.marginRight !== undefined) containerLayout.marginRight = flatStyle.marginRight;
  }

  const animatedStyle = {
    transform: [{ scale }],
    shadowColor: '#1e293b',
    shadowOpacity,
    shadowRadius,
    shadowOffset: { width: 0, height: 4 },
  };

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={[containerLayout, containerStyle]}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const MOCK_INTERNSHIPS = [
  {
    id: 1,
    title: 'Backend Developer Intern',
    company: 'TechNova Solutions',
    location: 'Bangalore',
    type: 'Hybrid',
    duration: '3 mo',
    stipend: '₹25,000 / month',
    stipendVal: 25000,
    matchRate: 92,
    status: 'Eligible',
    logoText: 'TN',
    logoBg: '#e6f4ea',
    logoColor: '#0e4f34',
    description: 'We are looking for a backend developer intern with hands-on experience in building microservices and RESTful APIs using Python and FastAPI.',
    whyMatches: [
      'Strong alignment with your Python & FastAPI skill endorsements.',
      'Your recent project "E-commerce API" validates required SQL competency.'
    ],
    skills: ['Python', 'FastAPI', 'SQL'],
    missingSkills: [],
    featured: true,
    posted: '3 days ago',
    postedDays: 3,
  },
  {
    id: 2,
    title: 'Data Analyst Intern',
    company: 'FinFlow Analytics',
    location: 'Remote',
    type: 'Remote',
    duration: '6 mo',
    stipend: '₹30,000 / month',
    stipendVal: 30000,
    matchRate: 81,
    status: 'Almost Eligible',
    logoText: 'FF',
    logoBg: '#fef3c7',
    logoColor: '#b45309',
    description: 'Analyze user data, create dashboards, and work closely with product teams. Great Python base, but lacks basic Tableau exposure.',
    whyMatches: [
      'Great fit for your Pandas and Data Visualization skills.',
    ],
    gapWarning: 'Missing required Tableau certification. Complete short course to qualify.',
    skills: ['Pandas', 'Data Viz'],
    missingSkills: ['Tableau'],
    featured: true,
    posted: '4 days ago',
    postedDays: 4,
  },
  {
    id: 3,
    title: 'Frontend Intern',
    company: 'Nexus E-commerce',
    location: 'Bangalore',
    type: 'Hybrid',
    duration: '3 mo',
    stipend: '₹20,000 / month',
    stipendVal: 20000,
    matchRate: 88,
    status: 'Eligible',
    logoText: 'NX',
    logoBg: '#e0f2fe',
    logoColor: '#0369a1',
    description: 'Strong match for your React and Tailwind CSS projects. Prior e-commerce experience is highly valued.',
    skills: ['React', 'Tailwind', 'Figma'],
    missingSkills: [],
    featured: false,
    posted: '2 days ago',
    postedDays: 2,
  },
  {
    id: 4,
    title: 'ML Engineering Intern',
    company: 'NeuroSys AI',
    location: 'Remote',
    type: 'Remote',
    duration: '6 mo',
    stipend: '₹35,000 / month',
    stipendVal: 35000,
    matchRate: 72,
    status: 'Almost Eligible',
    logoText: 'NS',
    logoBg: '#f5f3ff',
    logoColor: '#6d28d9',
    description: 'Good Python base, but lacks basic AWS exposure required for deployment tasks and cloud pipelining.',
    skills: ['Python', 'PyTorch'],
    missingSkills: ['AWS'],
    featured: false,
    posted: '5 days ago',
    postedDays: 5,
  },
  {
    id: 5,
    title: 'Cybersecurity Intern',
    company: 'Global Bank',
    location: 'Mumbai',
    type: 'On-site',
    duration: '6 mo',
    stipend: '₹40,000 / month',
    stipendVal: 40000,
    matchRate: 45,
    status: 'Skill Gap',
    logoText: 'GB',
    logoBg: '#fee2e2',
    logoColor: '#b91c1c',
    description: 'Significant gaps in required security certifications (CEH) and hands-on Linux system administration.',
    skills: ['Networking'],
    missingSkills: ['CEH', 'Linux'],
    featured: false,
    posted: '1 week ago',
    postedDays: 7,
  },
  {
    id: 6,
    title: 'UI/UX Design Intern',
    company: 'PixelCraft Agency',
    location: 'Remote',
    type: 'Remote',
    duration: '3 mo',
    stipend: '₹22,000 / month',
    stipendVal: 22000,
    matchRate: 90,
    status: 'Eligible',
    logoText: 'PC',
    logoBg: '#fce7f3',
    logoColor: '#be185d',
    description: 'Outstanding design portfolio matches wireframing and prototyping expectations. Collaboration with engineers.',
    skills: ['Figma', 'Prototyping', 'Wireframing'],
    missingSkills: [],
    featured: false,
    posted: 'Just now',
    postedDays: 0,
  },
];

const MOCK_APPLICATIONS = [
  {
    id: 1,
    role: 'Frontend Developer Intern',
    company: 'WebSolutions Inc.',
    appliedOn: 'Oct 12, 2023',
    status: 'Interview Scheduled',
    statusBadgeColor: '#e6f4ea',
    statusTextColor: '#0e4f34',
    timeline: [
      { title: 'Submitted', date: 'Oct 12', done: true },
      { title: 'Shortlisted', date: 'Oct 15', done: true },
      { title: 'Interview', date: 'Oct 20', done: true, active: true },
      { title: 'Decision', date: '', done: false },
    ],
  },
  {
    id: 2,
    role: 'Junior Data Analyst',
    company: 'MetricsCorp',
    appliedOn: 'Oct 08, 2023',
    status: 'Shortlisted',
    statusBadgeColor: '#fef3c7',
    statusTextColor: '#b45309',
    timeline: [
      { title: 'Submitted', date: 'Oct 08', done: true },
      { title: 'Shortlisted', date: 'Oct 12', done: true, active: true },
      { title: 'Interview', date: '', done: false },
      { title: 'Decision', date: '', done: false },
    ],
  },
  {
    id: 3,
    role: 'Software Engineer Intern',
    company: 'InnoTech',
    appliedOn: 'Oct 01, 2023',
    status: 'Applied',
    statusBadgeColor: '#f3f4f3',
    statusTextColor: '#3d4947',
    timeline: [
      { title: 'Submitted', date: 'Oct 01', done: true, active: true },
      { title: 'Shortlisted', date: '', done: false },
      { title: 'Interview', date: '', done: false },
      { title: 'Decision', date: '', done: false },
    ],
  },
];

export default function Internship() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  // Calculate dynamic card width for responsive layout
  const cardWidth = isDesktop ? '20%' : isTablet ? '48%' : '100%';

  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('Bangalore');
  const [typeFilter, setTypeFilter] = useState('Hybrid');
  const [sortOption, setSortOption] = useState('Best Match');
  const [showAppliedModal, setShowAppliedModal] = useState(false);
  const [appliedJob, setAppliedJob] = useState(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Interactive expansion for active applications timeline
  const [expandedAppId, setExpandedAppId] = useState(null);

  const handleApply = (job) => {
    setAppliedJob(job);
    setShowAppliedModal(true);
  };

  const handleViewDetails = (job) => {
    setSelectedDetailJob(job);
    setShowDetailsModal(true);
  };

  const handleClearFilters = () => {
    setLocationFilter(null);
    setTypeFilter(null);
  };

  // Filter and sort logic
  const filteredJobs = MOCK_INTERNSHIPS.filter((job) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(query);
      const matchCompany = job.company.toLowerCase().includes(query);
      const matchSkills = job.skills.some((s) => s.toLowerCase().includes(query));
      if (!matchTitle && !matchCompany && !matchSkills) {
        return false;
      }
    }
    // 2. Location filter
    if (locationFilter && job.location !== locationFilter) {
      return false;
    }
    // 3. Type filter
    if (typeFilter && job.type !== typeFilter) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortOption === 'Best Match') {
      return b.matchRate - a.matchRate;
    } else if (sortOption === 'Stipend (High to Low)') {
      return b.stipendVal - a.stipendVal;
    } else if (sortOption === 'Newest') {
      return a.postedDays - b.postedDays;
    }
    return 0;
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        
        {/* 1. Header Bento Section */}
        <View style={[styles.bentoRow, isDesktop ? styles.rowLayout : styles.columnLayout]}>
          
          {/* Left Column: Heading and Intro */}
          <View style={[styles.bentoLeft, isDesktop ? { flex: 7 } : {}]}>
            <Text style={styles.displayHeading}>
              Find Internships{'\n'}That <Text style={styles.textGreenUnderline}>Match You</Text>
            </Text>
            <Text style={styles.bentoSubtext}>
              SkillSetu analyzes your skills, education, projects, and career goals to surface the highest-converting internship opportunities tailored for your unique profile.
            </Text>
          </View>

          {/* Right Column: Match Profile Card */}
          <View style={[styles.bentoRight, isDesktop ? { flex: 5 } : {}]}>
            <View style={styles.profileCard}>
              <View style={styles.profileCardHeader}>
                <View>
                  <Text style={styles.profileCardTitle}>Your Match Profile</Text>
                  <Text style={styles.profileCardSubtitle}>Based on 14 data points</Text>
                </View>
                {/* Circular gauge representation */}
                <View style={styles.gaugeContainer}>
                  <Text style={styles.gaugeVal}>76%</Text>
                </View>
              </View>

              <View style={styles.profileStatsRow}>
                <View style={[styles.statBox, styles.statBoxTeal]}>
                  <Text style={[styles.statValue, { color: COLORS.teal }]}>12</Text>
                  <Text style={styles.statLabel}>Eligible</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxAmber]}>
                  <Text style={[styles.statValue, { color: COLORS.amber }]}>8</Text>
                  <Text style={styles.statLabel}>Almost{'\n'}Eligible</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxRose]}>
                  <Text style={[styles.statValue, { color: COLORS.rose }]}>4</Text>
                  <Text style={styles.statLabel}>Skill{'\n'}Gaps</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Recommended for You (Featured) */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>⭐</Text>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
          </View>

          <View style={[styles.featuredGrid, isTablet ? styles.rowLayout : styles.columnLayout]}>
            
            {/* Featured Card 1 */}
            <HoverableCard style={[styles.featuredCard, { backgroundColor: '#f0fdfa', borderColor: COLORS.subtle }]}>
              <View style={styles.featuredBadgeRow}>
                <View style={styles.eligibleBadge}>
                  <Text style={styles.eligibleBadgeText}>✓ Eligible (92% Match)</Text>
                </View>
                <View style={styles.rowTags}>
                  <View style={styles.tagLabel}><Text style={styles.tagLabelText}>Hybrid</Text></View>
                  <View style={styles.tagLabel}><Text style={styles.tagLabelText}>3 mo</Text></View>
                </View>
              </View>

              <View style={styles.companyRow}>
                <View style={[styles.logoSquare, { backgroundColor: '#e6f4ea' }]}>
                  <Text style={[styles.logoText, { color: '#0e4f34' }]}>TN</Text>
                </View>
                <View style={styles.companyInfo}>
                  <Text style={styles.featuredJobTitle}>Backend Developer Intern</Text>
                  <Text style={styles.featuredCompany}>TechNova Solutions • Bangalore</Text>
                </View>
              </View>

              <View style={styles.stipendRow}>
                <Text style={styles.stipendIcon}>💵</Text>
                <Text style={styles.stipendText}>₹25,000 / month</Text>
              </View>

              <View style={styles.whyMatchesBlock}>
                <Text style={styles.whyMatchesTitle}>🧠 Why this matches you:</Text>
                <View style={styles.matchBullets}>
                  <Text style={styles.bulletItem}>• Strong alignment with your Python & FastAPI skill endorsements.</Text>
                  <Text style={styles.bulletItem}>• Your recent project "E-commerce API" validates SQL competency.</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={styles.btnSecondary}><Text style={styles.btnSecondaryText}>View Details</Text></Pressable>
                <Pressable onPress={() => handleApply(MOCK_INTERNSHIPS[0])} style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Apply Now</Text>
                </Pressable>
              </View>
            </HoverableCard>

            {/* Featured Card 2 */}
            <HoverableCard style={[styles.featuredCard, { backgroundColor: '#fffbf2', borderColor: COLORS.subtle }]}>
              <View style={styles.featuredBadgeRow}>
                <View style={styles.almostBadge}>
                  <Text style={styles.almostBadgeText}>⚠ Almost Eligible (81%)</Text>
                </View>
                <View style={styles.rowTags}>
                  <View style={styles.tagLabel}><Text style={styles.tagLabelText}>Remote</Text></View>
                  <View style={styles.tagLabel}><Text style={styles.tagLabelText}>6 mo</Text></View>
                </View>
              </View>

              <View style={styles.companyRow}>
                <View style={[styles.logoSquare, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.logoText, { color: '#b45309' }]}>FF</Text>
                </View>
                <View style={styles.companyInfo}>
                  <Text style={styles.featuredJobTitle}>Data Analyst Intern</Text>
                  <Text style={styles.featuredCompany}>FinFlow Analytics • Remote</Text>
                </View>
              </View>

              <View style={styles.stipendRow}>
                <Text style={styles.stipendIcon}>💵</Text>
                <Text style={styles.stipendText}>₹30,000 / month</Text>
              </View>

              <View style={styles.whyMatchesBlock}>
                <Text style={styles.whyMatchesTitle}>📊 Bridge the Gap:</Text>
                <View style={styles.matchBullets}>
                  <Text style={styles.bulletItem}>• Great fit for your Pandas and Data Viz skills.</Text>
                  <Text style={[styles.bulletItem, { color: COLORS.amber, fontWeight: '600' }]}>
                    ⚠ Missing Tableau certification. Complete course to qualify.
                  </Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={styles.btnSecondary}><Text style={styles.btnSecondaryText}>View Details</Text></Pressable>
                <Pressable style={[styles.btnPrimary, { backgroundColor: COLORS.amber }]}>
                  <Text style={styles.btnPrimaryText}>⚡ Upskill Now</Text>
                </Pressable>
              </View>
            </HoverableCard>

          </View>
        </View>

        {/* 3. NEW: Personalized Match Analysis */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>📈</Text>
            <Text style={styles.sectionTitle}>Personalized Match Analysis</Text>
          </View>

          <View style={[styles.gridTwoCol, isTablet ? styles.rowLayout : styles.columnLayout]}>
            {/* Left Panel: Metrics Breakdown */}
            <View style={[styles.panelCard, { flex: 1 }]}>
              <Text style={styles.panelCardTitle}>Metrics Breakdown</Text>
              
              <View style={styles.metricItem}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>Skills</Text>
                  <Text style={styles.metricPercent}>82%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: '82%', backgroundColor: COLORS.green }]} />
                </View>
              </View>

              <View style={styles.metricItem}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>Education</Text>
                  <Text style={styles.metricPercent}>95%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: '95%', backgroundColor: COLORS.green }]} />
                </View>
              </View>

              <View style={styles.metricItem}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>Projects</Text>
                  <Text style={styles.metricPercent}>70%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: '70%', backgroundColor: COLORS.amber }]} />
                </View>
              </View>

              <View style={styles.metricItem}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>Experience</Text>
                  <Text style={styles.metricPercent}>40%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: '40%', backgroundColor: COLORS.rose }]} />
                </View>
              </View>
            </View>

            {/* Right Panel: Primary Skill Gap Warning */}
            <View style={[styles.panelCard, styles.panelCardWarning, { flex: 1 }]}>
              <View style={styles.gapHeaderRow}>
                <Text style={styles.warningIcon}>⚠</Text>
                <Text style={styles.gapTitle}>Primary Skill Gap</Text>
              </View>
              <Text style={styles.gapText}>
                Your profile falls short in <Text style={styles.boldText}>Docker (42/80)</Text>. Improving this skill could significantly boost your match rate for backend developer roles.
              </Text>
              
              <View style={styles.comparisonBox}>
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonValue}>81%</Text>
                  <Text style={styles.comparisonLabel}>Current</Text>
                </View>
                <Text style={styles.comparisonArrow}>➔</Text>
                <View style={styles.comparisonItem}>
                  <Text style={[styles.comparisonValue, { color: COLORS.green }]}>94%</Text>
                  <Text style={styles.comparisonLabel}>Potential</Text>
                </View>
              </View>
              
              <Pressable style={styles.btnFindCourse}>
                <Text style={styles.btnFindCourseText}>Find Docker Courses</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 4. NEW: Eligibility & Readiness / AI Insights */}
        <View style={styles.section}>
          <View style={[styles.gridTwoCol, isTablet ? styles.rowLayout : styles.columnLayout]}>
            {/* Left Panel: Application Readiness & Resume */}
            <View style={[styles.panelCard, { flex: 1 }]}>
              <Text style={styles.panelCardTitle}>Application Readiness</Text>
              <View style={styles.readinessList}>
                <View style={styles.readinessItem}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.readinessText}>Profile Complete (100%)</Text>
                </View>
                <View style={styles.readinessItem}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.readinessText}>Resume Uploaded</Text>
                </View>
                <View style={styles.readinessItem}>
                  <Text style={styles.pendingIcon}>⧗</Text>
                  <Text style={styles.readinessText}>Skills Verified (2 pending)</Text>
                </View>
              </View>

              <View style={styles.innerOptimizationBox}>
                <Text style={styles.innerTitle}>Resume Optimization</Text>
                <Text style={styles.innerSubtitle}>Optimize your resume for specific roles using AI to improve your match score.</Text>
                
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>General Resume</Text>
                  <Text style={styles.scoreValue}>76%</Text>
                </View>
                <View style={[styles.scoreRow, styles.scoreRowOptimized]}>
                  <Text style={[styles.scoreLabel, { color: COLORS.green }]}>AI Optimized</Text>
                  <Text style={[styles.scoreValue, { color: COLORS.green }]}>91%</Text>
                </View>

                <Pressable style={styles.btnOptimizeNow}>
                  <Text style={styles.btnOptimizeNowText}>✦ Optimize Now</Text>
                </Pressable>
              </View>
            </View>

            {/* Right Panel: AI Insights */}
            <View style={[styles.panelCard, styles.panelCardInsights, { flex: 1 }]}>
              <View style={styles.insightHeaderRow}>
                <View style={styles.lightbulbCircle}>
                  <Text style={styles.lightbulbText}>💡</Text>
                </View>
                <Text style={styles.panelCardTitle}>AI Insights</Text>
              </View>
              
              <Text style={styles.insightsMainText}>
                Improving your <Text style={[styles.boldText, { color: COLORS.green }]}>Docker</Text> and <Text style={[styles.boldText, { color: COLORS.green }]}>AWS</Text> skills could unlock <Text style={[styles.boldText, { color: COLORS.amber }]}>8 additional internships</Text> currently categorized as 'Almost Eligible'.
              </Text>

              <View style={styles.insightTagsRow}>
                <View style={styles.insightTag}><Text style={styles.insightTagText}>Cloud Computing</Text></View>
                <View style={styles.insightTag}><Text style={styles.insightTagText}>DevOps Basics</Text></View>
              </View>
            </View>
          </View>
        </View>

        {/* 5. NEW: Active Applications & Timeline tracking */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🎯</Text>
            <Text style={styles.sectionTitle}>Active Applications</Text>
          </View>

          <View style={styles.tableCard}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Role</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Company</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Applied On</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Status</Text>
            </View>

            {/* Table Body */}
            {MOCK_APPLICATIONS.map((app) => {
              const isExpanded = expandedAppId === app.id;
              return (
                <View key={app.id} style={styles.tableRowContainer}>
                  <Pressable 
                    style={styles.tableBodyRow}
                    onPress={() => setExpandedAppId(isExpanded ? null : app.id)}
                  >
                    <Text style={[styles.tableCell, styles.boldCellText, { flex: 2 }]}>{app.role}</Text>
                    <Text style={[styles.tableCell, { flex: 2 }]}>{app.company}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]}>{app.appliedOn}</Text>
                    <View style={[{ flex: 2 }, styles.statusBadgeWrapper]}>
                      <View style={[styles.appStatusBadge, { backgroundColor: app.statusBadgeColor }]}>
                        <Text style={[styles.appStatusBadgeText, { color: app.statusTextColor }]}>{app.status}</Text>
                      </View>
                    </View>
                  </Pressable>

                  {/* Expandable Timeline details */}
                  {isExpanded && (
                    <View style={styles.timelineDetailsBox}>
                      <Text style={styles.timelineTitle}>Application Timeline</Text>
                      <View style={styles.timelineTrackRow}>
                        {app.timeline.map((step, idx) => (
                          <View key={idx} style={styles.timelineStep}>
                            <View style={[
                              styles.timelineIndicatorCircle,
                              step.done && styles.timelineCircleDone,
                              step.active && styles.timelineCircleActive
                            ]}>
                              {step.done && <Text style={styles.timelineCheckText}>✓</Text>}
                            </View>
                            <Text style={[
                              styles.timelineStepLabel,
                              step.active && { fontWeight: '750', color: COLORS.green }
                            ]}>
                              {step.title}
                            </Text>
                            {step.date ? <Text style={styles.timelineStepDate}>{step.date}</Text> : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* 6. Explore Opportunities Listings */}
        <View style={styles.section}>
          <View style={[styles.listingsHeader, !isTablet && styles.columnLayout]}>
            <Text style={styles.listingsTitle}>Explore Opportunities</Text>

            {/* Quick Filters Bar */}
            <View style={[styles.filtersContainer, !isTablet && { width: '100%' }]}>
              <View style={styles.searchWrapper}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search roles, skills..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              {/* Filter Toggle and Sort */}
              <View style={styles.filterControls}>
                <Pressable style={styles.filterBtn} onPress={() => {}}>
                  <Text style={styles.filterBtnText}>⚙ Filters</Text>
                </Pressable>
                
                <View style={styles.selectWrapper}>
                  <Pressable
                    style={styles.selectBox}
                    onPress={() => {
                      const options = ['Best Match', 'Stipend (High to Low)', 'Newest'];
                      const nextIndex = (options.indexOf(sortOption) + 1) % options.length;
                      setSortOption(options[nextIndex]);
                    }}
                  >
                    <Text style={styles.selectBoxText}>Sort: {sortOption}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Active Filter Chips */}
          {(locationFilter || typeFilter) ? (
            <View style={styles.activeChipsRow}>
              {locationFilter && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Location: {locationFilter}</Text>
                  <Pressable onPress={() => setLocationFilter(null)} style={styles.chipClose}>
                    <Text style={styles.chipCloseText}>×</Text>
                  </Pressable>
                </View>
              )}
              {typeFilter && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Type: {typeFilter}</Text>
                  <Pressable onPress={() => setTypeFilter(null)} style={styles.chipClose}>
                    <Text style={styles.chipCloseText}>×</Text>
                  </Pressable>
                </View>
              )}
              <Pressable onPress={handleClearFilters} style={styles.clearFiltersBtn}>
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Listings Grid */}
          <View style={styles.listingsGrid}>
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => {
                const isEligible = job.status === 'Eligible';
                const isAlmost = job.status === 'Almost Eligible';

                return (
                  <HoverableCard key={job.id} style={[styles.jobCard, { width: cardWidth }]}>
                    <View style={styles.jobCardHeader}>
                      <View style={[styles.logoSquareCompact, { backgroundColor: job.logoBg }]}>
                        <Text style={[styles.logoTextCompact, { color: job.logoColor }]}>{job.logoText}</Text>
                      </View>
                      <View style={styles.jobBadgeWrap}>
                        <View style={[
                          styles.miniBadge,
                          isEligible && styles.miniBadgeGreen,
                          isAlmost && styles.miniBadgeAmber,
                          job.status === 'Skill Gap' && styles.miniBadgeRose
                        ]}>
                          <Text style={[
                            styles.miniBadgeText,
                            isEligible && { color: COLORS.green },
                            isAlmost && { color: COLORS.amber },
                            job.status === 'Skill Gap' && { color: COLORS.rose }
                          ]}>
                            {job.matchRate}% Match
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.jobCompany}>{job.company} • {job.location} ({job.type})</Text>

                    {/* NEW: Job Card Short Description */}
                    <Text style={styles.jobDescription} numberOfLines={2}>
                      {job.description}
                    </Text>

                    {/* Skills tags list */}
                    <View style={styles.skillsTagRow}>
                      {job.skills.map((s, idx) => (
                        <View key={idx} style={styles.skillTag}>
                          <Text style={styles.skillTagText}>{s}</Text>
                        </View>
                      ))}
                      {job.missingSkills && job.missingSkills.map((s, idx) => (
                        <View key={idx} style={[styles.skillTag, { backgroundColor: COLORS.roseLight }]}>
                          <Text style={[styles.skillTagText, { color: COLORS.rose }]}>Missing: {s}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.jobCardFooter}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.jobStipend} numberOfLines={1}>{job.stipend.split(' ')[0]} • {job.duration}</Text>
                        <Text style={styles.jobPosted}>{job.posted}</Text>
                      </View>
                      
                      <View style={styles.jobCardFooterRight}>
                        <Pressable
                          style={({ pressed }) => [styles.btnCardDetails, pressed && styles.pressed]}
                          onPress={() => handleViewDetails(job)}
                        >
                          <Text style={styles.btnCardDetailsText}>Details</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [styles.btnCardApply, pressed && styles.pressed]}
                          onPress={() => handleApply(job)}
                        >
                          <Text style={styles.btnCardApplyText}>Apply</Text>
                        </Pressable>
                      </View>
                    </View>
                  </HoverableCard>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyStateTitle}>No Opportunities Found</Text>
                <Text style={styles.emptyStateSubtitle}>
                  No listings match your search query or filters. Clear filters to see all available internships.
                </Text>
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    handleClearFilters();
                  }}
                  style={styles.emptyStateBtn}
                >
                  <Text style={styles.emptyStateBtnText}>Reset Filters</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Confirmation Modal */}
      {appliedJob && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showAppliedModal}
          onRequestClose={() => setShowAppliedModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalSuccessIcon}>🚀</Text>
              <Text style={styles.modalTitle}>Application Submitted!</Text>
              <Text style={styles.modalMessage}>
                Your application for <Text style={styles.bold}>{appliedJob.title}</Text> at <Text style={styles.bold}>{appliedJob.company}</Text> has been successfully sent.
              </Text>
              <View style={styles.modalDetails}>
                <Text style={styles.modalDetailsLabel}>Match Strength: {appliedJob.matchRate}%</Text>
                <Text style={styles.modalDetailsLabel}>Stipend: {appliedJob.stipend}</Text>
              </View>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowAppliedModal(false)}>
                <Text style={styles.modalCloseBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* Details Modal */}
      {selectedDetailJob && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showDetailsModal}
          onRequestClose={() => setShowDetailsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, styles.detailsModalCard]}>
              {/* Header with Close */}
              <View style={styles.detailsModalHeader}>
                <View style={[styles.logoSquareCompact, { backgroundColor: selectedDetailJob.logoBg }]}>
                  <Text style={[styles.logoTextCompact, { color: selectedDetailJob.logoColor }]}>
                    {selectedDetailJob.logoText}
                  </Text>
                </View>
                <Pressable style={styles.closeModalCross} onPress={() => setShowDetailsModal(false)}>
                  <Text style={styles.closeModalCrossText}>×</Text>
                </Pressable>
              </View>

              {/* Job Title and Info */}
              <Text style={styles.detailsModalTitle}>{selectedDetailJob.title}</Text>
              <Text style={styles.detailsModalCompany}>
                {selectedDetailJob.company} • {selectedDetailJob.location} ({selectedDetailJob.type})
              </Text>
              
              <View style={styles.detailsModalMetaRow}>
                <View style={styles.detailsMetaItem}>
                  <Text style={styles.detailsMetaLabel}>STIPEND</Text>
                  <Text style={styles.detailsMetaValue}>{selectedDetailJob.stipend}</Text>
                </View>
                <View style={styles.detailsMetaItem}>
                  <Text style={styles.detailsMetaLabel}>DURATION</Text>
                  <Text style={styles.detailsMetaValue}>{selectedDetailJob.duration}</Text>
                </View>
                <View style={styles.detailsMetaItem}>
                  <Text style={styles.detailsMetaLabel}>MATCH SCORE</Text>
                  <Text style={[styles.detailsMetaValue, { color: COLORS.green }]}>
                    {selectedDetailJob.matchRate}% Match
                  </Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.detailsModalSectionTitle}>Job Description</Text>
              <Text style={styles.detailsModalDescription}>{selectedDetailJob.description}</Text>

              {/* Skills */}
              <Text style={styles.detailsModalSectionTitle}>Skills Checklist</Text>
              <View style={styles.detailsModalSkillsList}>
                {selectedDetailJob.skills.map((s, idx) => (
                  <View key={idx} style={styles.detailSkillRow}>
                    <Text style={styles.detailCheckIcon}>✓</Text>
                    <Text style={styles.detailSkillName}>{s} (Possessed)</Text>
                  </View>
                ))}
                {selectedDetailJob.missingSkills && selectedDetailJob.missingSkills.map((s, idx) => (
                  <View key={idx} style={styles.detailSkillRow}>
                    <Text style={styles.detailWarningIcon}>⚠</Text>
                    <Text style={[styles.detailSkillName, { color: COLORS.rose }]}>{s} (Missing)</Text>
                  </View>
                ))}
              </View>

              {/* Match reason or gaps */}
              {selectedDetailJob.whyMatches && selectedDetailJob.whyMatches.length > 0 && (
                <View style={styles.detailWhyBox}>
                  <Text style={styles.detailWhyTitle}>Why you match this role:</Text>
                  {selectedDetailJob.whyMatches.map((m, idx) => (
                    <Text key={idx} style={styles.detailWhyText}>• {m}</Text>
                  ))}
                </View>
              )}

              {selectedDetailJob.gapWarning && (
                <View style={[styles.detailWhyBox, { backgroundColor: '#fffbe8', borderColor: '#fef3c7' }]}>
                  <Text style={[styles.detailWhyTitle, { color: COLORS.amber }]}>Bridge the Gap:</Text>
                  <Text style={styles.detailWhyText}>{selectedDetailJob.gapWarning}</Text>
                </View>
              )}

              {/* Modal Actions */}
              <View style={styles.detailsModalActions}>
                <Pressable 
                  style={styles.detailsModalCloseBtn} 
                  onPress={() => setShowDetailsModal(false)}
                >
                  <Text style={styles.detailsModalCloseBtnText}>Close</Text>
                </Pressable>
                <Pressable 
                  style={styles.detailsModalApplyBtn} 
                  onPress={() => {
                    setShowDetailsModal(false);
                    handleApply(selectedDetailJob);
                  }}
                >
                  <Text style={styles.detailsModalApplyBtnText}>Apply Now</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
  },
  rowLayout: {
    flexDirection: 'row',
  },
  columnLayout: {
    flexDirection: 'column',
  },
  bentoRow: {
    gap: 24,
    marginBottom: 32,
    marginTop: 8,
  },
  bentoLeft: {
    justifyContent: 'center',
    paddingRight: 16,
  },
  displayHeading: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.ink,
    lineHeight: 46,
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  textGreenUnderline: {
    color: COLORS.green,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.green,
  },
  bentoSubtext: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.muted,
    maxWidth: 580,
  },
  bentoRight: {
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  profileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  profileCardSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  gaugeContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.green,
  },
  gaugeVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.green,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    backgroundColor: COLORS.panel,
  },
  statBoxTeal: {
    borderTopColor: COLORS.teal,
  },
  statBoxAmber: {
    borderTopColor: COLORS.amber,
  },
  statBoxRose: {
    borderTopColor: COLORS.rose,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 14,
  },
  section: {
    marginBottom: 36,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.ink,
  },
  featuredGrid: {
    gap: 20,
  },
  featuredCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    position: 'relative',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eligibleBadge: {
    backgroundColor: COLORS.paper,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  eligibleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
  },
  almostBadge: {
    backgroundColor: COLORS.paper,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.amber,
  },
  almostBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.amber,
  },
  rowTags: {
    flexDirection: 'row',
    gap: 6,
  },
  tagLabel: {
    backgroundColor: COLORS.paper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  tagLabelText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  logoSquare: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
  },
  companyInfo: {
    flex: 1,
  },
  featuredJobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
  },
  featuredCompany: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  stipendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stipendIcon: {
    fontSize: 16,
  },
  stipendText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.ink,
  },
  whyMatchesBlock: {
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    marginBottom: 20,
    flex: 1,
  },
  whyMatchesTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 8,
  },
  matchBullets: {
    gap: 6,
  },
  bulletItem: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.paper,
  },
  btnSecondaryText: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: COLORS.paper,
    fontSize: 14,
    fontWeight: '600',
  },
  gridTwoCol: {
    gap: 20,
  },
  panelCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  panelCardWarning: {
    backgroundColor: '#fff5f5',
    borderColor: '#fca5a5',
  },
  panelCardInsights: {
    backgroundColor: '#f0fdfa',
    borderColor: COLORS.subtle,
  },
  panelCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 16,
  },
  metricItem: {
    marginBottom: 16,
  },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  metricPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  gapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningIcon: {
    fontSize: 20,
    color: COLORS.rose,
  },
  gapTitle: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.ink,
  },
  gapText: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
    marginBottom: 16,
  },
  boldText: {
    fontWeight: '750',
  },
  comparisonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 16,
    marginBottom: 16,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
  },
  comparisonLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  comparisonArrow: {
    fontSize: 18,
    color: COLORS.muted,
  },
  btnFindCourse: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFindCourseText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  readinessList: {
    gap: 12,
    marginBottom: 20,
  },
  readinessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIcon: {
    fontSize: 16,
    color: COLORS.green,
    fontWeight: 'bold',
  },
  pendingIcon: {
    fontSize: 16,
    color: COLORS.amber,
    fontWeight: 'bold',
  },
  readinessText: {
    fontSize: 14.5,
    color: COLORS.ink,
    fontWeight: '550',
  },
  innerOptimizationBox: {
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
  },
  innerTitle: {
    fontSize: 15,
    fontWeight: '750',
    color: COLORS.ink,
    marginBottom: 4,
  },
  innerSubtitle: {
    fontSize: 12.5,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  scoreRowOptimized: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLight,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '750',
    color: COLORS.ink,
  },
  btnOptimizeNow: {
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnOptimizeNowText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.paper,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  lightbulbCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  lightbulbText: {
    fontSize: 18,
  },
  insightsMainText: {
    fontSize: 17,
    color: COLORS.ink,
    lineHeight: 26,
    marginBottom: 20,
  },
  insightTagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  insightTag: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  insightTagText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '550',
  },
  tableCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.panel,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    padding: 16,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tableRowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
  },
  tableBodyRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 14,
    color: COLORS.muted,
  },
  boldCellText: {
    fontWeight: '650',
    color: COLORS.ink,
  },
  statusBadgeWrapper: {
    alignItems: 'flex-start',
  },
  appStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineDetailsBox: {
    backgroundColor: COLORS.canvas,
    borderTopWidth: 1,
    borderTopColor: COLORS.subtle,
    padding: 16,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
    marginLeft: 8,
  },
  timelineTrackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    position: 'relative',
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
  },
  timelineIndicatorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    zIndex: 2,
  },
  timelineCircleDone: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  timelineCircleActive: {
    backgroundColor: COLORS.paper,
    borderColor: COLORS.green,
  },
  timelineCheckText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: 'bold',
  },
  timelineStepLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    textAlign: 'center',
  },
  timelineStepDate: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  jobDescription: {
    fontSize: 13.5,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.subtle,
    marginVertical: 32,
  },
  listingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  listingsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.ink,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
    minWidth: 200,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.ink,
    padding: 0,
    outlineStyle: 'none',
  },
  filterControls: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  selectWrapper: {
    position: 'relative',
  },
  selectBox: {
    height: 40,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  selectBoxText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  activeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.panel,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 5,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12.5,
    color: COLORS.muted,
    fontWeight: '500',
  },
  chipClose: {
    marginLeft: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCloseText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    lineHeight: 13,
  },
  clearFiltersBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    fontSize: 12.5,
    color: COLORS.green,
    fontWeight: '600',
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 24,
  },
  jobCard: {
    minWidth: 280,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'column',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logoSquareCompact: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  logoTextCompact: {
    fontSize: 14,
    fontWeight: '800',
  },
  jobBadgeWrap: {
    alignItems: 'flex-end',
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniBadgeGreen: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.green,
  },
  miniBadgeAmber: {
    backgroundColor: COLORS.amberLight,
    borderColor: COLORS.amber,
  },
  miniBadgeRose: {
    backgroundColor: COLORS.roseLight,
    borderColor: COLORS.rose,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.ink,
    lineHeight: 20,
    marginBottom: 4,
  },
  jobCompany: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
  },
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  skillTag: {
    backgroundColor: COLORS.panel,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillTagText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: COLORS.muted,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.panel,
    paddingTop: 12,
    marginTop: 'auto',
  },
  jobCardFooterRight: {
    flexDirection: 'row',
    gap: 6,
  },
  jobStipend: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  jobPosted: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  btnCardDetails: {
    borderWidth: 1,
    borderColor: COLORS.subtle,
    backgroundColor: COLORS.paper,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCardDetailsText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  btnCardApply: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCardApplyText: {
    color: COLORS.paper,
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Details Modal styles
  detailsModalCard: {
    maxWidth: 520,
    padding: 24,
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  closeModalCross: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalCrossText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.muted,
    lineHeight: 24,
  },
  detailsModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  detailsModalCompany: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  detailsModalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.panel,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  detailsMetaItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailsMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    marginBottom: 2,
  },
  detailsMetaValue: {
    fontSize: 13.5,
    fontWeight: '750',
    color: COLORS.ink,
  },
  detailsModalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  detailsModalDescription: {
    fontSize: 13.5,
    color: COLORS.muted,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  detailsModalSkillsList: {
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  detailSkillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailCheckIcon: {
    fontSize: 14,
    color: COLORS.green,
    fontWeight: 'bold',
  },
  detailWarningIcon: {
    fontSize: 14,
    color: COLORS.amber,
    fontWeight: 'bold',
  },
  detailSkillName: {
    fontSize: 13.5,
    color: COLORS.ink,
  },
  detailWhyBox: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  detailWhyTitle: {
    fontSize: 13,
    fontWeight: '750',
    color: COLORS.green,
    marginBottom: 6,
  },
  detailWhyText: {
    fontSize: 12.5,
    color: COLORS.muted,
    lineHeight: 18,
    textAlign: 'left',
  },
  detailsModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  detailsModalCloseBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    backgroundColor: COLORS.paper,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsModalCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  detailsModalApplyBtn: {
    flex: 1,
    backgroundColor: COLORS.green,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsModalApplyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.paper,
  },
  pressed: {
    opacity: 0.8,
  },
  emptyState: {
    width: '100%',
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyStateBtnText: {
    color: COLORS.paper,
    fontSize: 13.5,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 28, 28, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.subtle,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalSuccessIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.ink,
  },
  modalDetails: {
    backgroundColor: COLORS.panel,
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 20,
    gap: 4,
  },
  modalDetailsLabel: {
    fontSize: 12.5,
    color: COLORS.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCloseBtn: {
    backgroundColor: COLORS.green,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: COLORS.paper,
    fontSize: 14,
    fontWeight: '600',
  },
});
