import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = {
  canvas: '#f9f9f8',
  panel: '#f3f4f3',
  paper: '#ffffff',
  ink: '#1a1c1c',
  muted: '#3d4947',
  subtle: '#bcc9c6',
  green: '#00685f',
  greenLight: '#f4fffc',
  teal: '#008378',
  mint: '#f0fdfa',
  mintBorder: '#ccfbf1',
  amber: '#b45309',
  amberLight: '#fef3c7',
  rose: '#ba1a1a',
  roseLight: '#ffdad6',
  blue: '#545f73',
  blueLight: '#d5e0f8',
  gray: '#eeeeed',
};

const MOCK_APPLICATIONS_DATA = [
  {
    id: 1,
    company: 'TechNova Solutions',
    role: 'Backend Developer Intern',
    status: 'Under Review',
    statusClass: 'UNDER REVIEW',
    statusColor: COLORS.amber,
    statusBg: COLORS.amberLight,
    matchRate: 92,
    dateApplied: 'Aug 24, 2023',
    deadline: 'Sep 12, 2023',
    resumeUsed: 'Backend Resume v2.pdf',
    atsScore: 91,
    nextAction: 'Waiting for employer review',
    logoText: 'TN',
    logoBg: '#e6f4ea',
    logoColor: '#0e4f34',
    timeline: [
      { title: 'Saved', date: 'Aug 18', done: true },
      { title: 'Application Submitted', date: 'Aug 24', done: true },
      { title: 'Resume Viewed', date: 'Aug 26', done: true },
      { title: 'Under Review', date: 'Aug 28', done: true, active: true },
      { title: 'Shortlisted', date: '', done: false },
      { title: 'Assessment', date: '', done: false },
      { title: 'Interview', date: '', done: false },
    ],
  },
  {
    id: 2,
    company: 'FinFlow Analytics',
    role: 'Data Analyst Intern',
    status: 'Shortlisted',
    statusClass: 'SHORTLISTED',
    statusColor: COLORS.amber,
    statusBg: COLORS.amberLight,
    matchRate: 81,
    dateApplied: 'Aug 21, 2023',
    deadline: 'Sep 05, 2023',
    resumeUsed: 'Data Analyst Resume.pdf',
    atsScore: 85,
    nextAction: 'Complete assessment',
    logoText: 'FF',
    logoBg: '#fffbeb',
    logoColor: '#b45309',
    timeline: [
      { title: 'Saved', date: 'Aug 17', done: true },
      { title: 'Application Submitted', date: 'Aug 21', done: true },
      { title: 'Resume Viewed', date: 'Aug 23', done: true },
      { title: 'Under Review', date: 'Aug 24', done: true },
      { title: 'Shortlisted', date: 'Aug 25', done: true, active: true },
      { title: 'Assessment', date: 'Pending', done: false, required: true },
      { title: 'Interview', date: '', done: false },
    ],
    assessment: {
      title: 'Backend Technical Assessment',
      duration: '45 mins',
      questions: '30 questions',
    },
  },
  {
    id: 3,
    company: 'InnovateLabs',
    role: 'Software Engineer Intern',
    status: 'Rejected',
    statusClass: 'REJECTED',
    statusColor: COLORS.rose,
    statusBg: COLORS.roseLight,
    matchRate: 78,
    dateApplied: 'Aug 15, 2023',
    deadline: 'Aug 30, 2023',
    resumeUsed: 'Software Engineer Resume.pdf',
    atsScore: 88,
    nextAction: 'View Feedback',
    logoText: 'IL',
    logoBg: '#fee2e2',
    logoColor: '#b91c1c',
    timeline: [
      { title: 'Saved', date: 'Aug 12', done: true },
      { title: 'Application Submitted', date: 'Aug 15', done: true },
      { title: 'Resume Viewed', date: 'Aug 18', done: true },
      { title: 'Rejected', date: 'Aug 22', done: true, failed: true },
    ],
  },
  {
    id: 4,
    company: 'DataSphere',
    role: 'ML Intern',
    status: 'Selected',
    statusClass: 'SELECTED',
    statusColor: '#059669',
    statusBg: '#d1fae5',
    matchRate: 94,
    dateApplied: 'Aug 10, 2023',
    deadline: 'Aug 25, 2023',
    resumeUsed: 'Machine Learning Resume.pdf',
    atsScore: 94,
    nextAction: 'View Onboarding',
    logoText: 'DS',
    logoBg: '#ecfdf5',
    logoColor: '#047857',
    timeline: [
      { title: 'Saved', date: 'Aug 08', done: true },
      { title: 'Application Submitted', date: 'Aug 10', done: true },
      { title: 'Resume Viewed', date: 'Aug 12', done: true },
      { title: 'Under Review', date: 'Aug 14', done: true },
      { title: 'Shortlisted', date: 'Aug 18', done: true },
      { title: 'Assessment Completed', date: 'Aug 20', done: true },
      { title: 'Interview Scheduled', date: 'Aug 24', done: true },
      { title: 'Offer Extended', date: 'Aug 28', done: true },
      { title: 'Selected', date: 'Aug 29', done: true, active: true },
    ],
  },
];

// Reusable HoverableCard helper for desktop/web animations
function HoverableCard({ children, style, containerStyle, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.01,
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
    outputRange: [0.03, 0.08],
  });

  const shadowRadius = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 12],
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

export default function Application() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const [activeTab, setActiveTab] = useState('All Applications');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Animated sliding value for side sheet drawer
  const slideAnim = useRef(new Animated.Value(width)).current;

  // Sync drawer slides
  useEffect(() => {
    if (showDrawer) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [showDrawer, width]);

  const handleOpenAppDetails = (app) => {
    setSelectedApp(app);
    setShowDrawer(true);
  };

  const handleCloseDrawer = () => {
    setShowDrawer(false);
  };

  const filteredApps = MOCK_APPLICATIONS_DATA.filter((app) => {
    if (activeTab === 'All Applications') return true;
    if (activeTab === 'Applied') return app.status === 'Applied' || app.status === 'Under Review' || app.status === 'Shortlisted';
    return app.status.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <View style={styles.container}>
      {/* Background dimmer overlay when drawer is open */}
      {showDrawer && (
        <Pressable style={styles.drawerBackdrop} onPress={handleCloseDrawer} />
      )}

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={[styles.mainGrid, isDesktop ? styles.rowLayout : styles.columnLayout]}>
          
          {/* Left / Center Column (Overview & Cards List) */}
          <View style={[styles.leftColumn, isDesktop ? { flex: 9 } : {}]}>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.displayHeading}>Applied Internships</Text>
              <Text style={styles.bentoSubtext}>
                Track your internship applications, deadlines, assessments, and outcomes in one place.
              </Text>
            </View>

            {/* Bento Statistics Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={[styles.statValue, { color: COLORS.green }]}>18</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>Applied</Text>
                <Text style={[styles.statValue, { color: COLORS.ink }]}>12</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>Under Review</Text>
                <Text style={[styles.statValue, { color: '#d97706' }]}>5</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>Shortlisted</Text>
                <Text style={[styles.statValue, { color: '#d97706' }]}>3</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>Assessment</Text>
                <Text style={[styles.statValue, { color: COLORS.teal }]}>2</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>Selected</Text>
                <Text style={[styles.statValue, { color: '#059669' }]}>1</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>Rejected</Text>
                <Text style={[styles.statValue, { color: COLORS.rose }]}>4</Text>
              </View>
              <View style={styles.statSquare}>
                <Text style={styles.statLabel}>Saved</Text>
                <Text style={[styles.statValue, { color: COLORS.blue }]}>6</Text>
              </View>
            </View>

            {/* Horizontal Filter Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.tabsRow}
              contentContainerStyle={styles.tabsRowContent}
            >
              {[
                'All Applications',
                'Applied',
                'Under Review',
                'Shortlisted',
                'Assessment',
                'Selected',
                'Rejected',
              ].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  >
                    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Applications List */}
            <View style={styles.listCard}>
              {filteredApps.map((app) => {
                return (
                  <HoverableCard 
                    key={app.id} 
                    style={styles.listRow}
                    onPress={() => handleOpenAppDetails(app)}
                  >
                    <View style={styles.rowLayout}>
                      <View style={styles.rowMainLeft}>
                        <View style={styles.rowHeader}>
                          <Text style={styles.companyName}>{app.company}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: app.statusBg }]}>
                            <Text style={[styles.statusBadgeText, { color: app.statusColor }]}>
                              {app.statusClass}
                            </Text>
                          </View>
                          <View style={styles.matchRateTag}>
                            <Text style={styles.matchRateTagText}>⚡ {app.matchRate}% Match</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.jobRole}>{app.role}</Text>

                        <View style={[styles.rowLayout, styles.metaStatsRow]}>
                          <Text style={styles.metaStatText}>📅 Applied: {app.dateApplied.split(',')[0]}</Text>
                          <Text style={[styles.metaStatText, { color: '#b45309' }]}>⏰ Deadline: {app.deadline.split(',')[0]}</Text>
                          <Text style={styles.metaStatText}>📄 {app.resumeUsed}</Text>
                        </View>
                      </View>

                      <View style={styles.rowMainRight}>
                        <Text style={styles.nextActionLabel}>Next Action:</Text>
                        {app.status === 'Shortlisted' ? (
                          <Pressable 
                            style={styles.actionBtnTakeAssessment}
                            onPress={() => handleOpenAppDetails(app)}
                          >
                            <Text style={styles.actionBtnText}>Take Assessment</Text>
                          </Pressable>
                        ) : app.status === 'Rejected' ? (
                          <Pressable 
                            style={styles.actionBtnFeedback}
                            onPress={() => handleOpenAppDetails(app)}
                          >
                            <Text style={styles.actionBtnFeedbackText}>View Feedback</Text>
                          </Pressable>
                        ) : app.status === 'Selected' ? (
                          <Pressable 
                            style={styles.actionBtnTakeAssessment}
                            onPress={() => handleOpenAppDetails(app)}
                          >
                            <Text style={styles.actionBtnText}>View Onboarding</Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.nextActionText}>{app.nextAction}</Text>
                        )}
                      </View>
                    </View>
                  </HoverableCard>
                );
              })}
            </View>

          </View>

          {/* Right Column (Sidebar Panels) */}
          <View style={[styles.rightColumn, isDesktop ? { flex: 3 } : {}]}>
            
            {/* AI Application Insights */}
            <View style={styles.sidebarPanelTeal}>
              <View style={styles.sidebarPanelHeader}>
                <Text style={styles.sidebarIcon}>✨</Text>
                <Text style={styles.sidebarPanelTitleTeal}>AI Application Insights</Text>
              </View>
              <View style={styles.insightsList}>
                <View style={styles.insightItem}>
                  <Text style={styles.insightBulletIcon}>ℹ</Text>
                  <Text style={styles.insightItemText}>
                    You have <Text style={styles.boldText}>3 applications</Text> currently under review.
                  </Text>
                </View>
                <View style={styles.insightItem}>
                  <Text style={[styles.insightBulletIcon, { color: '#d97706' }]}>⚠</Text>
                  <Text style={styles.insightItemText}>
                    <Text style={styles.boldText}>2 shortlisted applications</Text> require an assessment completion soon.
                  </Text>
                </View>
              </View>
            </View>

            {/* Upcoming Deadlines */}
            <View style={styles.sidebarPanelCard}>
              <Text style={styles.sidebarPanelTitle}>Upcoming Deadlines</Text>
              <View style={styles.deadlinesList}>
                <View style={[styles.deadlineStripe, { borderLeftColor: COLORS.rose }]}>
                  <Text style={[styles.deadlineDateLabel, { color: COLORS.rose }]}>Deadline Tomorrow</Text>
                  <Text style={styles.deadlineTitle}>Docker Backend Intern</Text>
                </View>
                <View style={[styles.deadlineStripe, { borderLeftColor: '#d97706' }]}>
                  <Text style={[styles.deadlineDateLabel, { color: '#d97706' }]}>Sep 2</Text>
                  <Text style={styles.deadlineTitle}>FinFlow Assessment</Text>
                </View>
              </View>
            </View>

            {/* Application Analytics */}
            <View style={styles.sidebarPanelCard}>
              <Text style={styles.sidebarPanelTitle}>Application Analytics</Text>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticBox}>
                  <Text style={styles.analyticLabel}>Selection Rate</Text>
                  <Text style={styles.analyticValue}>5.5%</Text>
                </View>
                <View style={styles.analyticBox}>
                  <Text style={styles.analyticLabel}>Avg Match</Text>
                  <Text style={styles.analyticValue}>84%</Text>
                </View>
              </View>
            </View>

          </View>

        </View>
      </ScrollView>

      {/* Slide-out Side Drawer Details Panel */}
      {selectedApp && (
        <Animated.View 
          style={[
            styles.drawerContainer, 
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Application Details</Text>
            <Pressable style={styles.drawerCloseBtn} onPress={handleCloseDrawer}>
              <Text style={styles.drawerCloseBtnText}>×</Text>
            </Pressable>
          </View>

          {/* Scrollable details */}
          <ScrollView contentContainerStyle={styles.drawerContentScroll}>
            
            {/* Company Info Box */}
            <View style={styles.drawerCompanyBlock}>
              <View style={[styles.logoSquare, { backgroundColor: selectedApp.logoBg }]}>
                <Text style={[styles.logoText, { color: selectedApp.logoColor }]}>{selectedApp.logoText}</Text>
              </View>
              <View style={styles.drawerTitleBlock}>
                <View style={styles.rowLayout}>
                  <Text style={styles.drawerJobTitle} numberOfLines={1}>{selectedApp.role}</Text>
                  <View style={styles.drawerMatchTag}>
                    <Text style={styles.drawerMatchTagText}>⚡ {selectedApp.matchRate}% Match</Text>
                  </View>
                </View>
                <Text style={styles.drawerCompanyName}>{selectedApp.company}</Text>
              </View>
            </View>

            {/* Info Grid Card */}
            <View style={styles.drawerInfoCard}>
              <View style={styles.infoCardRow}>
                <View style={styles.infoCardItem}>
                  <Text style={styles.infoCardLabel}>Date Applied</Text>
                  <Text style={styles.infoCardVal}>{selectedApp.dateApplied}</Text>
                </View>
                <View style={styles.infoCardItem}>
                  <Text style={styles.infoCardLabel}>Deadline</Text>
                  <Text style={styles.infoCardVal}>{selectedApp.deadline}</Text>
                </View>
              </View>
              <View style={styles.infoCardDivider} />
              <View style={styles.infoCardFileItem}>
                <Text style={styles.infoCardLabel}>Resume Used</Text>
                <View style={styles.resumeInfoBox}>
                  <View style={styles.rowLayout}>
                    <Text style={styles.resumeIcon}>📄</Text>
                    <Text style={styles.resumeNameText} numberOfLines={1}>{selectedApp.resumeUsed}</Text>
                  </View>
                  <View style={styles.atsBadge}>
                    <Text style={styles.atsBadgeText}>{selectedApp.atsScore} ATS Score</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Status Timeline */}
            <View style={styles.drawerSection}>
              <Text style={styles.drawerSectionTitle}>Status Timeline</Text>
              <View style={styles.timelineVerticalTrack}>
                <View style={styles.verticalLine} />
                <View style={styles.timelineList}>
                  {selectedApp.timeline.map((step, idx) => {
                    const isDone = step.done;
                    const isActive = step.active;
                    const isFailed = step.failed;
                    return (
                      <View key={idx} style={styles.timelineRow}>
                        <View style={[
                          styles.timelineCircle,
                          isDone && styles.timelineCircleDone,
                          isActive && styles.timelineCircleActive,
                          isFailed && styles.timelineCircleFailed,
                        ]}>
                          {isDone && <Text style={styles.timelineCheckIcon}>✓</Text>}
                        </View>
                        <View style={styles.timelineLabelBox}>
                          <Text style={[
                            styles.timelineLabelText,
                            isActive && { fontWeight: '750', color: COLORS.green }
                          ]}>
                            {step.title}
                          </Text>
                          <Text style={styles.timelineDateText}>{step.date || 'Pending'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Assessment block if needed */}
            {selectedApp.assessment && (
              <View style={styles.assessmentPanel}>
                <View style={styles.rowLayout}>
                  <Text style={styles.assessmentIcon}>✍</Text>
                  <Text style={styles.assessmentPanelTitle}>Assessment Required</Text>
                </View>
                <Text style={styles.assessmentJobTitle}>{selectedApp.assessment.title}</Text>
                <View style={[styles.rowLayout, styles.assessmentDetailsRow]}>
                  <Text style={styles.assessmentDetailText}>⏱ {selectedApp.assessment.duration}</Text>
                  <Text style={styles.assessmentDetailText}>📋 {selectedApp.assessment.questions}</Text>
                </View>
                <Pressable style={styles.btnStartAssessment}>
                  <Text style={styles.btnStartAssessmentText}>Start Assessment ➔</Text>
                </Pressable>
              </View>
            )}

            {/* Interview Prep box */}
            {!selectedApp.assessment && selectedApp.status !== 'Rejected' && (
              <View style={styles.dottedPrepCard}>
                <View style={styles.dottedIconCircle}>
                  <Text style={styles.dottedIcon}>🎙</Text>
                </View>
                <Text style={styles.dottedTitle}>Interview Prep Available</Text>
                <Text style={styles.dottedSubtitle}>
                  You will be notified once the recruiter initiates the next phase. Start prep workspace.
                </Text>
              </View>
            )}

          </ScrollView>

          {/* Sticky footer actions */}
          <View style={styles.drawerFooter}>
            <Pressable style={styles.btnWithdraw}>
              <Text style={styles.btnWithdrawText}>Withdraw Application</Text>
            </Pressable>
            <Pressable style={styles.btnPrepare}>
              <Text style={styles.btnPrepareText}>🎙 Prepare for Interview</Text>
            </Pressable>
          </View>
        </Animated.View>
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
  mainGrid: {
    gap: 24,
  },
  leftColumn: {
    gap: 24,
  },
  rightColumn: {
    gap: 24,
  },
  header: {
    marginBottom: 8,
  },
  displayHeading: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  bentoSubtext: {
    fontSize: 15,
    color: COLORS.muted,
    lineHeight: 22,
    maxWidth: 680,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statSquare: {
    flex: 1,
    minWidth: 100,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'capitalize',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  tabsRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    marginTop: 8,
  },
  tabsRowContent: {
    paddingBottom: 1,
    gap: 16,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.green,
  },
  tabButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabButtonTextActive: {
    color: COLORS.green,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 16,
    overflow: 'hidden',
  },
  listRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
    padding: 20,
  },
  rowMainLeft: {
    flex: 7,
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.ink,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  matchRateTag: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchRateTagText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  jobRole: {
    fontSize: 14.5,
    fontWeight: '550',
    color: COLORS.muted,
  },
  metaStatsRow: {
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  metaStatText: {
    fontSize: 12.5,
    color: COLORS.muted,
  },
  rowMainRight: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 12,
  },
  nextActionLabel: {
    fontSize: 11.5,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 6,
  },
  nextActionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.ink,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  actionBtnTakeAssessment: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    color: COLORS.paper,
    fontSize: 12.5,
    fontWeight: '600',
  },
  actionBtnFeedback: {
    borderWidth: 1,
    borderColor: COLORS.green,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnFeedbackText: {
    color: COLORS.green,
    fontSize: 12.5,
    fontWeight: '600',
  },
  sidebarPanelTeal: {
    backgroundColor: COLORS.mint,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  sidebarPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sidebarIcon: {
    fontSize: 18,
  },
  sidebarPanelTitleTeal: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.green,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    gap: 10,
  },
  insightBulletIcon: {
    fontSize: 15,
    color: COLORS.green,
    fontWeight: 'bold',
  },
  insightItemText: {
    fontSize: 13.5,
    color: COLORS.muted,
    lineHeight: 18,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.ink,
  },
  sidebarPanelCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 20,
  },
  sidebarPanelTitle: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.ink,
    marginBottom: 16,
  },
  deadlinesList: {
    gap: 16,
  },
  deadlineStripe: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 2,
  },
  deadlineDateLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  deadlineTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  analyticBox: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  analyticLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 4,
  },
  analyticValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.green,
  },
  drawerBackdrop: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(26, 28, 28, 0.3)',
    zIndex: 99,
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: Platform.OS === 'web' ? 460 : '100%',
    maxWidth: '100%',
    backgroundColor: COLORS.paper,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.subtle,
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    zIndex: 100,
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    backgroundColor: COLORS.paper,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '750',
    color: COLORS.ink,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerCloseBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.muted,
    lineHeight: 22,
  },
  drawerContentScroll: {
    padding: 24,
    gap: 24,
  },
  drawerCompanyBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoSquare: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
  },
  drawerTitleBlock: {
    flex: 1,
  },
  drawerJobTitle: {
    fontSize: 18,
    fontWeight: '750',
    color: COLORS.ink,
    maxWidth: '65%',
  },
  drawerMatchTag: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  drawerMatchTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green,
  },
  drawerCompanyName: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  drawerInfoCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    padding: 16,
    gap: 16,
  },
  infoCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCardItem: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoCardVal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
  infoCardDivider: {
    height: 1,
    backgroundColor: COLORS.subtle,
  },
  infoCardFileItem: {
    width: '100%',
  },
  resumeInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
  },
  resumeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  resumeNameText: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '550',
    maxWidth: 160,
  },
  atsBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  atsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green,
  },
  drawerSection: {
    width: '100%',
  },
  drawerSectionTitle: {
    fontSize: 15,
    fontWeight: '750',
    color: COLORS.ink,
    marginBottom: 16,
  },
  timelineVerticalTrack: {
    position: 'relative',
    paddingLeft: 12,
  },
  verticalLine: {
    position: 'absolute',
    top: 10,
    bottom: 24,
    left: 21,
    width: 2,
    backgroundColor: COLORS.gray,
  },
  timelineList: {
    gap: 20,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  timelineCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gray,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.gray,
    zIndex: 2,
    marginTop: 2,
  },
  timelineCircleDone: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  timelineCircleActive: {
    backgroundColor: COLORS.paper,
    borderColor: COLORS.green,
    borderWidth: 3.5,
    width: 20,
    height: 20,
  },
  timelineCircleFailed: {
    backgroundColor: COLORS.rose,
    borderColor: COLORS.rose,
  },
  timelineCheckIcon: {
    color: COLORS.paper,
    fontSize: 10,
    fontWeight: 'bold',
  },
  timelineLabelBox: {
    flex: 1,
  },
  timelineLabelText: {
    fontSize: 13.5,
    color: COLORS.ink,
    fontWeight: '600',
  },
  timelineDateText: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  assessmentPanel: {
    backgroundColor: COLORS.mint,
    borderWidth: 1,
    borderColor: COLORS.green,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  assessmentIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  assessmentPanelTitle: {
    fontSize: 13.5,
    fontWeight: '750',
    color: COLORS.green,
  },
  assessmentJobTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
  assessmentDetailsRow: {
    gap: 16,
  },
  assessmentDetailText: {
    fontSize: 12.5,
    color: COLORS.muted,
  },
  btnStartAssessment: {
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStartAssessmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.paper,
  },
  dottedPrepCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.canvas,
  },
  dottedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dottedIcon: {
    fontSize: 20,
  },
  dottedTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  dottedSubtitle: {
    fontSize: 12.5,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.subtle,
    backgroundColor: COLORS.paper,
    flexDirection: 'row',
    gap: 12,
  },
  btnWithdraw: {
    flex: 1.2,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    backgroundColor: COLORS.paper,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnWithdrawText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  btnPrepare: {
    flex: 1.8,
    backgroundColor: COLORS.green,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrepareText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.paper,
  },
});
