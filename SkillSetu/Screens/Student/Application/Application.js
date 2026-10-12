import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  fetchStudentApplications,
  checkApplicationAssessment,
  startApplicationAssessment,
} from '../services/applicationService';

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
    shadowRadius: 8,
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

export default function Application({ user, profileData, onNavigate }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const studentEmail = user?.email || profileData?.personalInfo?.email || '';

  const [activeTab, setActiveTab] = useState('All Applications');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // AI Assessment State
  const [assessmentInfo, setAssessmentInfo] = useState(null);
  const [assessmentChecking, setAssessmentChecking] = useState(false);
  const [assessmentLaunching, setAssessmentLaunching] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');

  // API State
  const [appData, setAppData] = useState({
    stats: { total: 0, active: 0, under_review: 0, shortlisted: 0, accepted: 0, rejected: 0 },
    internships: [],
    scholarships: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const slideAnim = useRef(new Animated.Value(width)).current;

  // Sync drawer slides
  useEffect(() => {
    if (showDrawer) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [showDrawer, width, slideAnim]);

  const loadApplications = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchStudentApplications(studentEmail);
      if (data) {
        setAppData(data);
      }
    } catch (err) {
      console.error('[Application Screen] Error loading applications:', err);
      setError(err.message || 'Failed to connect to application tracking server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [studentEmail]);

  // Combined and filtered application list
  const filteredList = useMemo(() => {
    const intList = (appData.internships || []).map((item) => ({
      ...item,
      type: 'internship',
      title: item.internship?.title || item.title || 'Internship Application',
      organization: item.internship?.company || item.company || 'Direct Employer',
      appliedDate: item.applied_at ? new Date(item.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
      portalUrl: item.internship?.application_url || item.internship?.source_url,
    }));

    const schList = (appData.scholarships || []).map((item) => ({
      ...item,
      type: 'scholarship',
      title: item.scholarship?.name || item.name || 'Scholarship Scheme',
      organization: item.scholarship?.provider || item.provider || 'Scholarship Provider',
      appliedDate: item.applied_at ? new Date(item.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
      portalUrl: item.scholarship?.application_url || item.scholarship?.source_url,
    }));

    let all = [...intList, ...schList];

    if (activeTab === 'Internships') {
      return all.filter((a) => a.type === 'internship');
    } else if (activeTab === 'Scholarships') {
      return all.filter((a) => a.type === 'scholarship');
    } else if (activeTab === 'Under Review') {
      return all.filter((a) => {
        const s = (a.application_status || a.status || '').toUpperCase();
        return s === 'UNDER_REVIEW' || s === 'APPLIED';
      });
    } else if (activeTab === 'Shortlisted / Accepted') {
      return all.filter((a) => {
        const s = (a.application_status || a.status || '').toUpperCase();
        return s === 'SHORTLISTED' || s === 'ACCEPTED' || s === 'SELECTED' || s === 'ROUND_IN_PROGRESS' || s === 'ROUND_COMPLETED';
      });
    }
    return all;
  }, [appData, activeTab]);

  const handleCardClick = async (app) => {
    setSelectedApp(app);
    setShowDrawer(true);
    setAssessmentInfo(null);
    setAssessmentError('');

    if (app.type === 'internship') {
      setAssessmentChecking(true);
      try {
        const info = await checkApplicationAssessment(app.id, studentEmail);
        setAssessmentInfo(info);
      } catch (err) {
        console.warn('Failed to check application assessment:', err);
      } finally {
        setAssessmentChecking(false);
      }
    }
  };

  const handleLaunchAssessment = async () => {
    if (!selectedApp) return;
    setAssessmentLaunching(true);
    setAssessmentError('');
    try {
      const res = await startApplicationAssessment(selectedApp.id, studentEmail);
      if (res?.assessment_url) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(res.assessment_url, '_blank');
        } else {
          Linking.openURL(res.assessment_url);
        }
        handleCardClick(selectedApp);
      }
    } catch (err) {
      setAssessmentError(err.message || 'Could not launch assessment session.');
    } finally {
      setAssessmentLaunching(false);
    }
  };

  const getStatusColor = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'SELECTED':
      case 'ACCEPTED':
      case 'OFFERED':
        return { text: '#047857', bg: '#d1fae5' };
      case 'SHORTLISTED':
        return { text: COLORS.teal, bg: COLORS.mint };
      case 'ROUND_IN_PROGRESS':
        return { text: '#0284c7', bg: '#e0f2fe' };
      case 'ROUND_COMPLETED':
        return { text: '#0d9488', bg: '#ccfbf1' };
      case 'UNDER_REVIEW':
      case 'APPLIED':
        return { text: COLORS.amber, bg: COLORS.amberLight };
      case 'REJECTED':
      case 'NOT_SELECTED':
        return { text: COLORS.rose, bg: COLORS.roseLight };
      default:
        return { text: COLORS.muted, bg: COLORS.panel };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Header Bento */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Application Tracker</Text>
          <Text style={styles.pageSubtitle}>
            Real-time status tracking for all your verified internship and scholarship submissions.
          </Text>
        </View>

        {/* Dynamic Metric Gauges */}
        <View style={[styles.statsRow, isTablet ? styles.rowLayout : styles.columnLayout]}>
          <View style={[styles.statCard, { borderTopColor: COLORS.teal }]}>
            <Text style={styles.statNumber}>{appData.stats?.total || 0}</Text>
            <Text style={styles.statLabel}>Total Tracked</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.amber }]}>
            <Text style={styles.statNumber}>{appData.stats?.under_review || 0}</Text>
            <Text style={styles.statLabel}>Under Review</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: COLORS.green }]}>
            <Text style={styles.statNumber}>{appData.stats?.shortlisted || 0}</Text>
            <Text style={styles.statLabel}>Shortlisted</Text>
          </View>
          <View style={[styles.statCard, { borderTopColor: '#059669' }]}>
            <Text style={styles.statNumber}>{appData.stats?.accepted || 0}</Text>
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabBar}>
          {['All Applications', 'Internships', 'Scholarships', 'Under Review', 'Shortlisted / Accepted'].map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Loading / Error States */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.green} />
            <Text style={styles.loadingText}>Fetching tracked applications...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Failed to Load Applications</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => loadApplications(true)}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.applicationsList}>
            {filteredList.length > 0 ? (
              filteredList.map((item) => {
                const badge = getStatusColor(item.application_status || item.statusClass || item.status);
                const isInternship = item.type === 'internship';
                const isSelected = (item.application_status || item.statusClass || '').toUpperCase() === 'SELECTED' || item.statusClass === 'ACCEPTED';
                const isRejected = (item.application_status || item.statusClass || '').toUpperCase() === 'REJECTED' || item.statusClass === 'NOT_SELECTED';

                return (
                  <HoverableCard
                    key={`${item.type}-${item.id}`}
                    style={styles.appCard}
                    onPress={() => handleCardClick(item)}
                  >
                    <View style={styles.appCardHeader}>
                      <View style={styles.appLogo}>
                        <Text style={styles.appLogoText}>
                          {item.organization ? item.organization.substring(0, 2).toUpperCase() : 'AP'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.appTitle}>{item.title}</Text>
                        <Text style={styles.appCompany}>
                          Company: <Text style={{ fontWeight: '700', color: COLORS.ink }}>{item.organization}</Text> • {isInternship ? 'Internship' : 'Scholarship'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                          {item.application_status || item.statusClass || item.status || 'APPLIED'}
                        </Text>
                      </View>
                    </View>

                    {/* Authoritative Details Block */}
                    <View style={styles.authoritativeDetailBox}>
                      <View style={styles.detailRowItem}>
                        <Text style={styles.detailLabel}>Application Status:</Text>
                        <Text style={[styles.detailValueBold, { color: badge.text }]}>
                          {item.application_status || item.statusClass || item.status}
                        </Text>
                      </View>

                      {isInternship && item.current_round_name && !isSelected && !isRejected && (
                        <View style={styles.detailRowItem}>
                          <Text style={styles.detailLabel}>Current Round:</Text>
                          <Text style={styles.detailValueBold}>{item.current_round_name}</Text>
                        </View>
                      )}

                      {isSelected && (
                        <View style={styles.selectedMessageBox}>
                          <Text style={styles.selectedPipelineText}>
                            Assessment Pipeline: <Text style={{ fontWeight: '800' }}>COMPLETED</Text>
                          </Text>
                          <Text style={styles.selectedCongratsText}>
                            🎉 Congratulations! You have been selected.
                          </Text>
                        </View>
                      )}

                      {isRejected && (
                        <View style={styles.rejectedMessageBox}>
                          <Text style={styles.rejectedReasonText}>
                            Reason: {item.rejection_reason || 'Your application was not selected for the next stage.'}
                          </Text>
                        </View>
                      )}

                      {!isSelected && !isRejected && item.nextAction && (
                        <View style={styles.detailRowItem}>
                          <Text style={styles.detailLabel}>Next Action:</Text>
                          <Text style={styles.nextActionHighlight}>{item.nextAction}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.appCardMeta}>
                      <Text style={styles.appliedDateText}>Applied on: {item.appliedDate}</Text>
                      
                      <View style={styles.cardActionsRow}>
                        {isInternship && onNavigate && (
                          <Pressable
                            style={styles.viewRoundsBtn}
                            onPress={() => onNavigate('Rounds', { applicationId: item.application_id })}
                          >
                            <Text style={styles.viewRoundsBtnText}>[ View Rounds ]</Text>
                          </Pressable>
                        )}

                        <Pressable
                          style={styles.viewAppBtn}
                          onPress={() => handleCardClick(item)}
                        >
                          <Text style={styles.viewAppBtnText}>[ View Application ]</Text>
                        </Pressable>

                        {item.portalUrl && (
                          <Pressable
                            style={styles.portalLink}
                            onPress={() => Linking.openURL(item.portalUrl)}
                          >
                            <Text style={styles.portalLinkText}>Open Portal ↗</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </HoverableCard>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No Applications Found</Text>
                <Text style={styles.emptySubtitle}>
                  You have not submitted or launched applications in this category yet. Explore verified internships and scholarships to apply!
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Slide-over Side Sheet Drawer for Application Details */}
      {selectedApp && (
        <Animated.View style={[styles.sideDrawer, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerHeading}>Application Progress</Text>
            <Pressable style={styles.closeDrawerBtn} onPress={() => setShowDrawer(false)}>
              <Text style={styles.closeDrawerText}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.drawerContent}>
            <Text style={styles.drawerTitle}>{selectedApp.title}</Text>
            <Text style={styles.drawerCompany}>{selectedApp.organization}</Text>

            <View style={styles.drawerMetaBox}>
              <View>
                <Text style={styles.drawerMetaLabel}>TYPE</Text>
                <Text style={styles.drawerMetaVal}>
                  {selectedApp.type === 'internship' ? 'Internship' : 'Scholarship'}
                </Text>
              </View>
              <View>
                <Text style={styles.drawerMetaLabel}>APPLIED DATE</Text>
                <Text style={styles.drawerMetaVal}>{selectedApp.appliedDate}</Text>
              </View>
              <View>
                <Text style={styles.drawerMetaLabel}>STATUS</Text>
                <Text style={[styles.drawerMetaVal, { color: COLORS.green }]}>
                  {selectedApp.status || 'APPLIED'}
                </Text>
              </View>
            </View>

            <Text style={styles.drawerSectionTitle}>STATUS TIMELINE</Text>
            <View style={styles.drawerTimeline}>
              <View style={styles.drawerStep}>
                <View style={[styles.stepCircle, styles.stepCircleDone]}>
                  <Text style={styles.stepCheck}>✓</Text>
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Application Launched</Text>
                  <Text style={styles.stepDate}>{selectedApp.appliedDate}</Text>
                </View>
              </View>
              <View style={styles.drawerStep}>
                <View style={[styles.stepCircle, styles.stepCircleActive]}>
                  <Text style={styles.stepCheck}>⧗</Text>
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Under Verification</Text>
                  <Text style={styles.stepDate}>In Progress</Text>
                </View>
              </View>
              <View style={styles.drawerStep}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepCheck}>•</Text>
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>Shortlisted / Final Decision</Text>
                  <Text style={styles.stepDate}>Pending review</Text>
                </View>
              </View>
            </View>

            {/* AI Assessment Section */}
            {assessmentChecking ? (
              <View style={styles.assessmentLoadingBox}>
                <ActivityIndicator size="small" color={COLORS.green} />
                <Text style={styles.assessmentCheckingText}>Checking assessment schedule...</Text>
              </View>
            ) : assessmentInfo?.has_assessment ? (
              <View style={styles.assessmentDrawerCard}>
                <View style={styles.assessmentCardHeader}>
                  <Text style={styles.assessmentCardTitle}>🤖 AI Assessment Pipeline</Text>
                  <View style={[
                    styles.assessmentBadgeActive,
                    assessmentInfo.overall_status === 'COMPLETED' ? { backgroundColor: '#d1fae5' } :
                    assessmentInfo.overall_status === 'EXPIRED' ? { backgroundColor: '#fee2e2' } :
                    assessmentInfo.can_start ? { backgroundColor: '#d1fae5' } : { backgroundColor: '#fef3c7' }
                  ]}>
                    <Text style={[
                      styles.assessmentBadgeActiveText,
                      assessmentInfo.overall_status === 'COMPLETED' ? { color: '#065f46' } :
                      assessmentInfo.overall_status === 'EXPIRED' ? { color: '#991b1b' } :
                      assessmentInfo.can_start ? { color: '#065f46' } : { color: '#b45309' }
                    ]}>
                      {assessmentInfo.overall_status === 'COMPLETED' ? 'Completed' :
                       assessmentInfo.overall_status === 'EXPIRED' ? 'Expired' :
                       assessmentInfo.can_start ? 'Available Now' : 'Scheduled'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.assessmentCardDesc}>
                  This opening requires an AI-proctored multi-round evaluation. Each round follows its individual schedule and time limit.
                </Text>

                {/* Authoritative Progression Banner */}
                {assessmentInfo.progression && (
                  <View style={styles.studentProgressionBox}>
                    <View style={styles.studentProgressionHeader}>
                      <Text style={styles.studentProgressionTitle}>
                        📍 Current Stage: <Text style={{ fontWeight: '800' }}>{assessmentInfo.progression.current_round_name || 'Round'}</Text>
                      </Text>
                      <View style={styles.studentProgressionBadge}>
                        <Text style={styles.studentProgressionBadgeText}>
                          {assessmentInfo.progression.status || 'In Assessment'}
                        </Text>
                      </View>
                    </View>

                    {assessmentInfo.progression.next_round_name && (
                      <View style={styles.studentNextRoundBox}>
                        <Text style={styles.studentNextRoundLabel}>
                          ⏩ Next Round: <Text style={{ fontWeight: '800' }}>{assessmentInfo.progression.next_round_name}</Text>
                        </Text>
                        {assessmentInfo.progression.next_round_schedule && (
                          <Text style={styles.studentNextRoundSchedule}>
                            📅 {assessmentInfo.progression.next_round_schedule.scheduled_date || 'Date TBD'} · ⏱ {assessmentInfo.progression.next_round_schedule.scheduled_time || 'Schedule confirmed'} ({assessmentInfo.progression.next_round_schedule.timezone || 'Asia/Kolkata'})
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Round-by-Round Scheduling Breakdown */}
                {assessmentInfo.round_schedules && assessmentInfo.round_schedules.length > 0 && (
                  <View style={styles.studentRoundList}>
                    {assessmentInfo.round_schedules.map((r) => {
                      const isAvail = r.status === 'AVAILABLE';
                      const isInProg = r.status === 'IN_PROGRESS';
                      const isSched = r.status === 'SCHEDULED';
                      const isComp = r.status === 'COMPLETED';
                      const isExp = r.status === 'EXPIRED';

                      return (
                        <View key={r.round_id} style={styles.studentRoundItem}>
                          <View style={styles.studentRoundHeader}>
                            <Text style={styles.studentRoundName}>{r.round_name}</Text>
                            <View style={[
                              styles.studentRoundStatusBadge,
                              isComp ? styles.srBadgeComp :
                              isInProg ? styles.srBadgeInProg :
                              isAvail ? styles.srBadgeAvail :
                              isExp ? styles.srBadgeExp : styles.srBadgeSched
                            ]}>
                              <Text style={[
                                styles.studentRoundStatusText,
                                isComp ? styles.srTextComp :
                                isInProg ? styles.srTextInProg :
                                isAvail ? styles.srTextAvail :
                                isExp ? styles.srTextExp : styles.srTextSched
                              ]}>
                                {isComp ? '✓ Completed' :
                                 isInProg ? `⏱ In Progress (${Math.ceil(r.remaining_seconds / 60)}m left)` :
                                 isAvail ? '🟢 Available' :
                                 isExp ? '⛔ Closed' :
                                 `⧗ Starts in ${Math.ceil(r.starts_in_seconds / 60)}m`}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.studentRoundScheduleText}>
                            📅 {r.scheduled_date || r.start_date || 'Date TBD'}{' '}
                            {r.schedule_mode === 'GEMINI_MANAGED'
                              ? `· ⏱ ${r.display_time || 'Time will be assigned automatically'}`
                              : r.schedule_mode === 'fixed_session'
                              ? `· ⏱ ${r.display_time || `${r.start_time || '16:00'} – ${r.end_time || '16:40'}`}`
                              : `· ⏱ ${r.start_time || '10:00'} – ${r.end_time || '22:00'}`}{' '}
                            ({r.timezone || 'Asia/Kolkata'})
                          </Text>
                          <Text style={styles.studentRoundDurationText}>
                            ⏱ Duration: {r.duration_min} min · {r.schedule_type || (r.schedule_mode === 'fixed_session' ? 'Fixed Session' : r.schedule_mode === 'GEMINI_MANAGED' ? 'Gemini Managed' : 'Flexible Window')}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {assessmentInfo.overall_status === 'COMPLETED' ? (
                  <View style={styles.assessmentScoreBox}>
                    <Text style={styles.assessmentScoreText}>
                      ✓ Assessment Completed — Verified Score: <Text style={{ fontWeight: '800' }}>{assessmentInfo.session?.overall_score}%</Text>
                    </Text>
                  </View>
                ) : assessmentInfo.overall_status === 'EXPIRED' ? (
                  <View style={[styles.assessmentScoreBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                    <Text style={[styles.assessmentScoreText, { color: '#b91c1c' }]}>
                      ⛔ Assessment availability window has closed.
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    style={[
                      styles.startAssessmentBtn,
                      (!assessmentInfo.can_start || assessmentLaunching) && { opacity: 0.6 }
                    ]}
                    onPress={handleLaunchAssessment}
                    disabled={!assessmentInfo.can_start || assessmentLaunching}
                  >
                    {assessmentLaunching ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.startAssessmentBtnText}>
                        {assessmentInfo.session?.status === 'IN_PROGRESS'
                          ? 'Resume AI Assessment →'
                          : assessmentInfo.can_start
                          ? 'Start AI Assessment →'
                          : 'Assessment Scheduled'}
                      </Text>
                    )}
                  </Pressable>
                )}

                {assessmentError ? (
                  <Text style={styles.assessmentErrorText}>{assessmentError}</Text>
                ) : null}
              </View>
            ) : null}

            {selectedApp.portalUrl && (
              <Pressable
                style={styles.drawerPortalBtn}
                onPress={() => Linking.openURL(selectedApp.portalUrl)}
              >
                <Text style={styles.drawerPortalBtnText}>Open Official Portal ↗</Text>
              </Pressable>
            )}
          </ScrollView>
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
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    maxWidth: 600,
    lineHeight: 22,
  },
  rowLayout: {
    flexDirection: 'row',
  },
  columnLayout: {
    flexDirection: 'column',
  },
  statsRow: {
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderTopWidth: 4,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 8,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.green,
  },
  tabText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.green,
    fontWeight: '750',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.muted,
  },
  errorContainer: {
    backgroundColor: COLORS.roseLight,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  errorIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.rose,
  },
  errorSubtitle: {
    fontSize: 13,
    color: COLORS.rose,
    marginVertical: 4,
  },
  retryBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  retryBtnText: {
    color: COLORS.paper,
    fontWeight: '600',
    fontSize: 13,
  },
  applicationsList: {
    gap: 16,
  },
  appCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 18,
  },
  appCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  appLogo: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.mint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  appLogoText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.green,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.ink,
  },
  appCompany: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '750',
  },
  appCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.panel,
    paddingTop: 10,
  },
  appliedDateText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  portalLink: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  portalLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.green,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '750',
    color: COLORS.ink,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: COLORS.muted,
    textAlign: 'center',
    maxWidth: 420,
    marginTop: 6,
    lineHeight: 19,
  },
  sideDrawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 380,
    backgroundColor: COLORS.paper,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.subtle,
    shadowColor: '#1e293b',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 999,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
  },
  drawerHeading: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.ink,
  },
  closeDrawerBtn: {
    padding: 4,
  },
  closeDrawerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.muted,
  },
  drawerContent: {
    padding: 20,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 4,
  },
  drawerCompany: {
    fontSize: 13.5,
    color: COLORS.muted,
    marginBottom: 16,
  },
  drawerMetaBox: {
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  drawerMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  drawerMetaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  drawerTimeline: {
    gap: 16,
    marginBottom: 24,
  },
  drawerStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.panel,
    borderWidth: 2,
    borderColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  stepCircleActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.paper,
  },
  stepCheck: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.paper,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  stepDate: {
    fontSize: 11,
    color: COLORS.muted,
  },
  drawerPortalBtn: {
    backgroundColor: COLORS.green,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  drawerPortalBtnText: {
    color: COLORS.paper,
    fontWeight: '700',
    fontSize: 13.5,
  },
  assessmentDrawerCard: {
    backgroundColor: COLORS.mint,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  assessmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assessmentCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.teal,
  },
  assessmentBadgeActive: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  assessmentBadgeActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065f46',
  },
  assessmentCardDesc: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
  },
  studentRoundList: {
    gap: 8,
    marginVertical: 4,
  },
  studentRoundItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  studentRoundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentRoundName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  studentRoundStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  studentRoundStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  srBadgeComp: { backgroundColor: '#d1fae5' },
  srTextComp: { color: '#065f46' },
  srBadgeInProg: { backgroundColor: '#dbeafe' },
  srTextInProg: { color: '#1d4ed8' },
  srBadgeAvail: { backgroundColor: '#ecfdf5' },
  srTextAvail: { color: '#047857' },
  srBadgeExp: { backgroundColor: '#fee2e2' },
  srTextExp: { color: '#b91c1c' },
  srBadgeSched: { backgroundColor: '#fef3c7' },
  srTextSched: { color: '#b45309' },
  studentRoundScheduleText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  studentRoundDurationText: {
    fontSize: 10.5,
    color: COLORS.muted,
  },
  startAssessmentBtn: {
    backgroundColor: COLORS.teal,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startAssessmentBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  assessmentScoreBox: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
  },
  assessmentScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
  },
  assessmentLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: COLORS.panel,
    borderRadius: 8,
    marginBottom: 12,
  },
  assessmentCheckingText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  assessmentErrorText: {
    fontSize: 11,
    color: COLORS.rose,
    fontWeight: '600',
    marginTop: 4,
  },
  studentProgressionBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  studentProgressionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentProgressionTitle: {
    fontSize: 12,
    color: '#0F766E',
  },
  studentProgressionBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  studentProgressionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  studentNextRoundBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#CCFBF1',
  },
  studentNextRoundLabel: {
    fontSize: 11,
    color: '#0F766E',
    marginBottom: 2,
  },
  studentNextRoundSchedule: {
    fontSize: 10.5,
    color: COLORS.muted,
    fontWeight: '600',
  },
  authoritativeDetailBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  detailRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  detailValueBold: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.ink,
  },
  nextActionHighlight: {
    fontSize: 13,
    fontWeight: '750',
    color: COLORS.teal,
  },
  selectedMessageBox: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
    gap: 2,
  },
  selectedPipelineText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
  },
  selectedCongratsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  rejectedMessageBox: {
    backgroundColor: '#ffe4e6',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
  },
  rejectedReasonText: {
    fontSize: 12.5,
    color: '#9f1239',
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  viewRoundsBtn: {
    backgroundColor: COLORS.mint,
    borderWidth: 1,
    borderColor: COLORS.mintBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewRoundsBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.teal,
  },
  viewAppBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewAppBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
});
