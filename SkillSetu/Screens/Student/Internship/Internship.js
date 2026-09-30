import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import {
  fetchRecommendedInternships,
  toggleSaveInternship,
  applyToInternship,
} from '../services/internshipService';
import { fetchStudentApplications } from '../services/applicationService';

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
          toValue: 1.015,
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
    shadowRadius: 10,
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

export default function Internship({ user, profileData, onNavigate }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;

  const cardWidth = isDesktop ? '31%' : isTablet ? '48%' : '100%';
  const studentEmail = user?.email || profileData?.personalInfo?.email || 'abhoge27@gmail.com';

  // API State
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortOption, setSortOption] = useState('Best Match');

  // Modals & UI State
  const [selectedDetailJob, setSelectedDetailJob] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAppliedModal, setShowAppliedModal] = useState(false);
  const [appliedJob, setAppliedJob] = useState(null);
  const [expandedAppId, setExpandedAppId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  // Initial load
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [recRes, appRes] = await Promise.all([
        fetchRecommendedInternships({
          email: studentEmail,
          page: 1,
          pageSize: 50,
          search: searchQuery,
          location: locationFilter,
          workMode: typeFilter,
        }),
        fetchStudentApplications(studentEmail),
      ]);

      if (recRes && recRes.status === 'success') {
        setInternships(recRes.items || []);
      } else {
        setError(recRes?.message || 'Unable to load recommended internships');
      }

      if (appRes && appRes.internships) {
        setApplications(appRes.internships);
      }
    } catch (err) {
      console.error('[Internship Screen] Error loading data:', err);
      setError(err.message || 'Failed to connect to opportunities server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentEmail, locationFilter, typeFilter]);

  // Handle Search submit
  const handleSearchSubmit = () => {
    loadData(true);
  };

  // Dynamic Metrics derived from real matching results
  const metrics = useMemo(() => {
    if (!internships.length) {
      return { eligibleCount: 0, almostCount: 0, gapCount: 0, avgMatch: 0 };
    }
    let eligible = 0;
    let almost = 0;
    let gap = 0;
    let totalScore = 0;

    internships.forEach((job) => {
      const score = Number(job.match_score || 0);
      totalScore += score;
      if (job.eligibility_status === 'ELIGIBLE' && score >= 75) {
        eligible++;
      } else if (score >= 50 || job.eligibility_status === 'POSSIBLY_ELIGIBLE') {
        almost++;
      } else {
        gap++;
      }
    });

    return {
      eligibleCount: eligible,
      almostCount: almost,
      gapCount: gap,
      avgMatch: Math.round(totalScore / internships.length),
    };
  }, [internships]);

  // Featured recommendations
  const featuredJobs = useMemo(() => {
    return internships.slice(0, 2);
  }, [internships]);

  // Filtered & Sorted Listings
  const filteredJobs = useMemo(() => {
    let list = [...internships];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((job) => {
        const titleMatch = job.title?.toLowerCase().includes(q);
        const compMatch = job.company?.toLowerCase().includes(q);
        const skillMatch = (job.skills || []).some((s) => s.toLowerCase().includes(q));
        const locMatch = job.location?.toLowerCase().includes(q);
        return titleMatch || compMatch || skillMatch || locMatch;
      });
    }

    return list.sort((a, b) => {
      if (sortOption === 'Best Match') {
        return (b.match_score || 0) - (a.match_score || 0);
      } else if (sortOption === 'Stipend (High to Low)') {
        const sA = a.stipend_max || a.stipend_min || 0;
        const sB = b.stipend_max || b.stipend_min || 0;
        return sB - sA;
      } else if (sortOption === 'Newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return 0;
    });
  }, [internships, searchQuery, sortOption]);

  // Apply Handler
  const handleApply = async (job) => {
    setApplyingId(job.id);
    try {
      // 1. Record application on backend
      const res = await applyToInternship(job.id, studentEmail);
      
      // 2. Open official portal if application URL exists
      const targetUrl = job.application_url || job.source_url || res?.data?.application_url;
      if (targetUrl) {
        Linking.openURL(targetUrl).catch((err) => {
          console.warn('Could not open external URL:', err);
        });
      }

      setAppliedJob(job);
      setShowAppliedModal(true);

      // Refresh applications table
      const appRes = await fetchStudentApplications(studentEmail);
      if (appRes && appRes.internships) {
        setApplications(appRes.internships);
      }
    } catch (err) {
      console.error('Apply error:', err);
    } finally {
      setApplyingId(null);
    }
  };

  // Save / Bookmark Handler
  const handleToggleSave = async (job) => {
    setSavingId(job.id);
    const willSave = !job.is_saved;
    try {
      await toggleSaveInternship(job.id, studentEmail, willSave);
      // Update local state
      setInternships((prev) =>
        prev.map((item) => (item.id === job.id ? { ...item, is_saved: willSave } : item))
      );
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleViewDetails = (job) => {
    setSelectedDetailJob(job);
    setShowDetailsModal(true);
  };

  const handleClearFilters = () => {
    setLocationFilter('');
    setTypeFilter('');
    setSearchQuery('');
  };

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
              SkillSetu analyzes your verified ESCO skills, career trajectory, projects, and eligibility rules to surface authentic, source-verified internships tailored for your exact profile.
            </Text>
          </View>

          {/* Right Column: Match Profile Card */}
          <View style={[styles.bentoRight, isDesktop ? { flex: 5 } : {}]}>
            <View style={styles.profileCard}>
              <View style={styles.profileCardHeader}>
                <View>
                  <Text style={styles.profileCardTitle}>Your Match Profile</Text>
                  <Text style={styles.profileCardSubtitle}>Deterministic AI & ESCO Match</Text>
                </View>
                <View style={styles.gaugeContainer}>
                  <Text style={styles.gaugeVal}>{metrics.avgMatch}%</Text>
                </View>
              </View>

              <View style={styles.profileStatsRow}>
                <View style={[styles.statBox, styles.statBoxTeal]}>
                  <Text style={[styles.statValue, { color: COLORS.teal }]}>{metrics.eligibleCount}</Text>
                  <Text style={styles.statLabel}>Eligible</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxAmber]}>
                  <Text style={[styles.statValue, { color: COLORS.amber }]}>{metrics.almostCount}</Text>
                  <Text style={styles.statLabel}>Almost{'\n'}Eligible</Text>
                </View>
                <View style={[styles.statBox, styles.statBoxRose]}>
                  <Text style={[styles.statValue, { color: COLORS.rose }]}>{metrics.gapCount}</Text>
                  <Text style={styles.statLabel}>Skill{'\n'}Gaps</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.green} />
            <Text style={styles.loadingText}>Evaluating verified internships & matching algorithms...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Load Internships</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => loadData(true)}>
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* 2. Recommended for You (Featured) */}
            {featuredJobs.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionIcon}>⭐</Text>
                  <Text style={styles.sectionTitle}>Top Recommended Opportunities</Text>
                </View>

                <View style={[styles.featuredGrid, isTablet ? styles.rowLayout : styles.columnLayout]}>
                  {featuredJobs.map((job) => {
                    const isEligible = job.eligibility_status === 'ELIGIBLE';
                    const matchPercent = Math.round(job.match_score || 0);

                    return (
                      <HoverableCard
                        key={job.id}
                        style={[
                          styles.featuredCard,
                          {
                            backgroundColor: isEligible ? '#f0fdfa' : '#fffbf2',
                            borderColor: COLORS.subtle,
                          },
                        ]}
                      >
                        <View style={styles.featuredBadgeRow}>
                          <View style={isEligible ? styles.eligibleBadge : styles.almostBadge}>
                            <Text style={isEligible ? styles.eligibleBadgeText : styles.almostBadgeText}>
                              {isEligible ? `✓ Eligible (${matchPercent}% Match)` : `⚠ ${job.eligibility_status} (${matchPercent}%)`}
                            </Text>
                          </View>
                          <View style={styles.rowTags}>
                            <View style={styles.tagLabel}>
                              <Text style={styles.tagLabelText}>{job.work_mode || (job.is_remote ? 'Remote' : 'On-site')}</Text>
                            </View>
                            {job.duration && (
                              <View style={styles.tagLabel}>
                                <Text style={styles.tagLabelText}>{job.duration}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.companyRow}>
                          <View style={[styles.logoSquare, { backgroundColor: '#e6f4ea' }]}>
                            <Text style={[styles.logoText, { color: '#0e4f34' }]}>
                              {job.company ? job.company.substring(0, 2).toUpperCase() : 'IN'}
                            </Text>
                          </View>
                          <View style={styles.companyInfo}>
                            <Text style={styles.featuredJobTitle}>{job.title}</Text>
                            <Text style={styles.featuredCompany}>
                              {job.company} • {job.location || 'Pan-India'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.stipendRow}>
                          <Text style={styles.stipendIcon}>💵</Text>
                          <Text style={styles.stipendText}>{job.stipend || 'Stipend Disclosed Upon Selection'}</Text>
                        </View>

                        {/* Why this matches */}
                        <View style={styles.whyMatchesBlock}>
                          <Text style={styles.whyMatchesTitle}>🧠 Why this matches you:</Text>
                          <View style={styles.matchBullets}>
                            {job.match_reasons && job.match_reasons.length > 0 ? (
                              job.match_reasons.slice(0, 2).map((reason, idx) => (
                                <Text key={idx} style={styles.bulletItem}>• {reason}</Text>
                              ))
                            ) : (
                              <Text style={styles.bulletItem}>• Evaluated against your active verified competencies and target career.</Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.actionsRow}>
                          <Pressable style={styles.btnSecondary} onPress={() => handleViewDetails(job)}>
                            <Text style={styles.btnSecondaryText}>View Details</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleApply(job)}
                            style={styles.btnPrimary}
                            disabled={applyingId === job.id}
                          >
                            <Text style={styles.btnPrimaryText}>
                              {applyingId === job.id ? 'Applying...' : 'Apply on Portal'}
                            </Text>
                          </Pressable>
                        </View>
                      </HoverableCard>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 3. Active Applications Section */}
            {applications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionIcon}>🎯</Text>
                  <Text style={styles.sectionTitle}>Your Tracked Applications</Text>
                </View>

                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Role</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Company</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Applied On</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Status</Text>
                  </View>

                  {applications.map((app) => {
                    const isExpanded = expandedAppId === app.id;
                    const appliedDate = app.applied_at ? new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';

                    return (
                      <View key={app.id} style={styles.tableRowContainer}>
                        <Pressable 
                          style={styles.tableBodyRow}
                          onPress={() => setExpandedAppId(isExpanded ? null : app.id)}
                        >
                          <Text style={[styles.tableCell, styles.boldCellText, { flex: 2 }]}>
                            {app.internship?.title || app.title || 'Internship Application'}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 2 }]}>
                            {app.internship?.company || app.company || 'Direct'}
                          </Text>
                          <Text style={[styles.tableCell, { flex: 1.5 }]}>{appliedDate}</Text>
                          <View style={[{ flex: 2 }, styles.statusBadgeWrapper]}>
                            <View style={[styles.appStatusBadge, { backgroundColor: COLORS.greenLight }]}>
                              <Text style={[styles.appStatusBadgeText, { color: COLORS.green }]}>
                                {app.status || 'APPLIED'}
                              </Text>
                            </View>
                          </View>
                        </Pressable>

                        {isExpanded && (
                          <View style={styles.timelineDetailsBox}>
                            <Text style={styles.timelineTitle}>Application Timeline</Text>
                            <View style={styles.timelineTrackRow}>
                              <View style={styles.timelineStep}>
                                <View style={[styles.timelineIndicatorCircle, styles.timelineCircleDone]}>
                                  <Text style={styles.timelineCheckText}>✓</Text>
                                </View>
                                <Text style={[styles.timelineStepLabel, { fontWeight: '700', color: COLORS.green }]}>
                                  Portal Launched
                                </Text>
                                <Text style={styles.timelineStepDate}>{appliedDate}</Text>
                              </View>
                              <View style={styles.timelineStep}>
                                <View style={[styles.timelineIndicatorCircle, styles.timelineCircleActive]}>
                                  <Text style={styles.timelineCheckText}>⧗</Text>
                                </View>
                                <Text style={styles.timelineStepLabel}>Under Review</Text>
                                <Text style={styles.timelineStepDate}>In Progress</Text>
                              </View>
                              <View style={styles.timelineStep}>
                                <View style={styles.timelineIndicatorCircle}>
                                  <Text style={styles.timelineCheckText}>•</Text>
                                </View>
                                <Text style={styles.timelineStepLabel}>Shortlisted / Decision</Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.divider} />

            {/* 4. Explore Opportunities Listings */}
            <View style={styles.section}>
              <View style={[styles.listingsHeader, !isTablet && styles.columnLayout]}>
                <Text style={styles.listingsTitle}>All Verified Opportunities ({filteredJobs.length})</Text>

                {/* Filters */}
                <View style={[styles.filtersContainer, !isTablet && { width: '100%' }]}>
                  <View style={styles.searchWrapper}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search roles, skills, companies..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onSubmitEditing={handleSearchSubmit}
                      placeholderTextColor={COLORS.muted}
                    />
                  </View>

                  <View style={styles.filterControls}>
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
              {(locationFilter || typeFilter || searchQuery) ? (
                <View style={styles.activeChipsRow}>
                  {searchQuery ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>Query: {searchQuery}</Text>
                      <Pressable onPress={() => setSearchQuery('')} style={styles.chipClose}>
                        <Text style={styles.chipCloseText}>×</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {locationFilter ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>Location: {locationFilter}</Text>
                      <Pressable onPress={() => setLocationFilter('')} style={styles.chipClose}>
                        <Text style={styles.chipCloseText}>×</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {typeFilter ? (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>Type: {typeFilter}</Text>
                      <Pressable onPress={() => setTypeFilter('')} style={styles.chipClose}>
                        <Text style={styles.chipCloseText}>×</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  <Pressable onPress={handleClearFilters} style={styles.clearFiltersBtn}>
                    <Text style={styles.clearFiltersText}>Clear All</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Listings Grid */}
              <View style={styles.listingsGrid}>
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => {
                    const isEligible = job.eligibility_status === 'ELIGIBLE';
                    const isAlmost = job.eligibility_status === 'POSSIBLY_ELIGIBLE';
                    const matchPercent = Math.round(job.match_score || 0);

                    return (
                      <HoverableCard key={job.id} style={[styles.jobCard, { width: cardWidth }]}>
                        <View style={styles.jobCardHeader}>
                          <View style={[styles.logoSquareCompact, { backgroundColor: '#e0f2fe' }]}>
                            <Text style={[styles.logoTextCompact, { color: '#0369a1' }]}>
                              {job.company ? job.company.substring(0, 2).toUpperCase() : 'IN'}
                            </Text>
                          </View>
                          <View style={styles.jobBadgeWrap}>
                            <View style={[
                              styles.miniBadge,
                              isEligible && styles.miniBadgeGreen,
                              isAlmost && styles.miniBadgeAmber,
                              !isEligible && !isAlmost && styles.miniBadgeRose
                            ]}>
                              <Text style={[
                                styles.miniBadgeText,
                                isEligible && { color: COLORS.green },
                                isAlmost && { color: COLORS.amber },
                                !isEligible && !isAlmost && { color: COLORS.rose }
                              ]}>
                                {matchPercent}% Match
                              </Text>
                            </View>
                          </View>
                        </View>

                        <Text style={styles.jobTitle}>{job.title}</Text>
                        <Text style={styles.jobCompany}>
                          {job.company} • {job.location || 'India'} ({job.work_mode || (job.is_remote ? 'Remote' : 'On-site')})
                        </Text>

                        {/* Attribution */}
                        <Text style={styles.jobSourceText}>
                          Source: <Text style={{ fontWeight: '700' }}>{job.source || 'Verified Source'}</Text>
                        </Text>

                        {/* Short Description */}
                        <Text style={styles.jobDescription} numberOfLines={2}>
                          {job.description}
                        </Text>

                        {/* Skills tags list */}
                        <View style={styles.skillsTagRow}>
                          {(job.skills || []).slice(0, 3).map((s, idx) => (
                            <View key={idx} style={styles.skillTag}>
                              <Text style={styles.skillTagText}>{s}</Text>
                            </View>
                          ))}
                          {(job.missing_skills || []).slice(0, 2).map((s, idx) => (
                            <View key={idx} style={[styles.skillTag, { backgroundColor: COLORS.roseLight }]}>
                              <Text style={[styles.skillTagText, { color: COLORS.rose }]}>Gap: {s}</Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.jobCardFooter}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.jobStipend} numberOfLines={1}>
                              {job.stipend || 'Competitive'}
                            </Text>
                            {job.application_deadline && (
                              <Text style={styles.jobPosted}>
                                Deadline: {new Date(job.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </Text>
                            )}
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
                              disabled={applyingId === job.id}
                            >
                              <Text style={styles.btnCardApplyText}>
                                {applyingId === job.id ? '...' : 'Apply'}
                              </Text>
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
                      No active listings match your filters. Try resetting your search or filter parameters.
                    </Text>
                    <Pressable
                      onPress={handleClearFilters}
                      style={styles.emptyStateBtn}
                    >
                      <Text style={styles.emptyStateBtnText}>Reset Filters</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

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
              <Text style={styles.modalTitle}>Official Portal Launched</Text>
              <Text style={styles.modalMessage}>
                We tracked your interest for <Text style={styles.bold}>{appliedJob.title}</Text> at <Text style={styles.bold}>{appliedJob.company}</Text> and opened the official listing portal.
              </Text>
              <View style={styles.modalDetails}>
                <Text style={styles.modalDetailsLabel}>Match Score: {Math.round(appliedJob.match_score || 0)}%</Text>
                <Text style={styles.modalDetailsLabel}>Source: {appliedJob.source}</Text>
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
              <View style={styles.detailsModalHeader}>
                <View style={[styles.logoSquareCompact, { backgroundColor: '#e0f2fe' }]}>
                  <Text style={[styles.logoTextCompact, { color: '#0369a1' }]}>
                    {selectedDetailJob.company ? selectedDetailJob.company.substring(0, 2).toUpperCase() : 'IN'}
                  </Text>
                </View>
                <Pressable style={styles.closeModalCross} onPress={() => setShowDetailsModal(false)}>
                  <Text style={styles.closeModalCrossText}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.detailsModalTitle}>{selectedDetailJob.title}</Text>
              <Text style={styles.detailsModalCompany}>
                {selectedDetailJob.company} • {selectedDetailJob.location || 'India'} ({selectedDetailJob.work_mode || (selectedDetailJob.is_remote ? 'Remote' : 'On-site')})
              </Text>
              
              <View style={styles.detailsModalMetaRow}>
                <View style={styles.detailsMetaItem}>
                  <Text style={styles.detailsMetaLabel}>STIPEND</Text>
                  <Text style={styles.detailsMetaValue}>{selectedDetailJob.stipend || 'Competitive'}</Text>
                </View>
                <View style={styles.detailsMetaItem}>
                  <Text style={styles.detailsMetaLabel}>SOURCE</Text>
                  <Text style={styles.detailsMetaValue}>{selectedDetailJob.source}</Text>
                </View>
                <View style={styles.detailsMetaItem}>
                  <Text style={styles.detailsMetaLabel}>MATCH SCORE</Text>
                  <Text style={[styles.detailsMetaValue, { color: COLORS.green }]}>
                    {Math.round(selectedDetailJob.match_score || 0)}% Match
                  </Text>
                </View>
              </View>

              <Text style={styles.detailsModalSectionTitle}>Role Description</Text>
              <ScrollView style={{ maxHeight: 150, width: '100%', marginBottom: 12 }}>
                <Text style={styles.detailsModalDescription}>{selectedDetailJob.description}</Text>
              </ScrollView>

              <Text style={styles.detailsModalSectionTitle}>Skill Alignment</Text>
              <View style={styles.detailsModalSkillsList}>
                {(selectedDetailJob.skills || []).map((s, idx) => (
                  <View key={idx} style={styles.detailSkillRow}>
                    <Text style={styles.detailCheckIcon}>✓</Text>
                    <Text style={styles.detailSkillName}>{s} (Matched)</Text>
                  </View>
                ))}
                {(selectedDetailJob.missing_skills || []).map((s, idx) => (
                  <View key={idx} style={styles.detailSkillRow}>
                    <Text style={styles.detailWarningIcon}>⚠</Text>
                    <Text style={[styles.detailSkillName, { color: COLORS.rose }]}>{s} (Gap)</Text>
                  </View>
                ))}
              </View>

              {/* Match Reasons */}
              {selectedDetailJob.match_reasons && selectedDetailJob.match_reasons.length > 0 && (
                <View style={styles.detailWhyBox}>
                  <Text style={styles.detailWhyTitle}>Why you match this role:</Text>
                  {selectedDetailJob.match_reasons.map((m, idx) => (
                    <Text key={idx} style={styles.detailWhyText}>• {m}</Text>
                  ))}
                </View>
              )}

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
                  <Text style={styles.detailsModalApplyBtnText}>Apply on Portal</Text>
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
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.muted,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginVertical: 20,
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.rose,
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: COLORS.paper,
    fontWeight: '600',
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
    marginBottom: 4,
  },
  jobSourceText: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
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
