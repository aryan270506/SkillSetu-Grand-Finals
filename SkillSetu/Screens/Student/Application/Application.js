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
import { fetchStudentApplications } from '../services/applicationService';

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

export default function Application({ user, profileData }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const studentEmail = user?.email || profileData?.personalInfo?.email || 'abhoge27@gmail.com';

  const [activeTab, setActiveTab] = useState('All Applications');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

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
      return all.filter((a) => a.status === 'UNDER_REVIEW' || a.status === 'APPLIED');
    } else if (activeTab === 'Shortlisted / Accepted') {
      return all.filter((a) => a.status === 'SHORTLISTED' || a.status === 'ACCEPTED');
    }
    return all;
  }, [appData, activeTab]);

  const handleCardClick = (app) => {
    setSelectedApp(app);
    setShowDrawer(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACCEPTED':
        return { text: '#047857', bg: '#d1fae5' };
      case 'SHORTLISTED':
        return { text: COLORS.teal, bg: COLORS.mint };
      case 'UNDER_REVIEW':
      case 'APPLIED':
        return { text: COLORS.amber, bg: COLORS.amberLight };
      case 'REJECTED':
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
                const badge = getStatusColor(item.status);
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
                          {item.organization} • {item.type === 'internship' ? 'Internship' : 'Scholarship'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                          {item.status || 'APPLIED'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.appCardMeta}>
                      <Text style={styles.appliedDateText}>Applied on: {item.appliedDate}</Text>
                      {item.portalUrl && (
                        <Pressable
                          style={styles.portalLink}
                          onPress={() => Linking.openURL(item.portalUrl)}
                        >
                          <Text style={styles.portalLinkText}>Open Portal ↗</Text>
                        </Pressable>
                      )}
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
  },
  drawerPortalBtnText: {
    color: COLORS.paper,
    fontWeight: '700',
    fontSize: 13.5,
  },
});
