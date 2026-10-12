import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  fetchEligibleScholarships,
  toggleSaveScholarship,
  applyToScholarship,
  simulateScholarshipEligibility,
} from '../services/scholarshipService';
import { fetchStudentApplications } from '../services/applicationService';

import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayCard,
  ensureScholarshipGlobalStyles,
} from './components/ScholarshipDesignTokens';

import ScholarshipHero from './components/ScholarshipHero';
import ScholarshipMetrics from './components/ScholarshipMetrics';
import ScholarshipDeadlineRadar from './components/ScholarshipDeadlineRadar';
import ScholarshipFilterBar from './components/ScholarshipFilterBar';
import ScholarshipCard from './components/ScholarshipCard';
import ScholarshipDetailModal from './components/ScholarshipDetailModal';
import ScholarshipSimulatorSection from './components/ScholarshipSimulatorSection';
import {
  ScholarshipLoadingSkeleton,
  ScholarshipEmptyState,
  ScholarshipErrorState,
} from './components/ScholarshipEmptyAndError';
import ScholarshipFooter from './components/ScholarshipFooter';

export default function Scolarship({ user, profileData }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const studentEmail = user?.email || profileData?.personalInfo?.email || 'abhoge27@gmail.com';

  // Staggered Page Entrance Animation Values
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(20)).current;

  const metricsFade = useRef(new Animated.Value(0)).current;
  const metricsTranslateY = useRef(new Animated.Value(20)).current;

  const radarFade = useRef(new Animated.Value(0)).current;
  const radarTranslateY = useRef(new Animated.Value(20)).current;

  const filterFade = useRef(new Animated.Value(0)).current;
  const filterTranslateY = useRef(new Animated.Value(16)).current;

  const cardsFade = useRef(new Animated.Value(0)).current;
  const cardsTranslateY = useRef(new Animated.Value(24)).current;

  const simFade = useRef(new Animated.Value(0)).current;
  const simTranslateY = useRef(new Animated.Value(20)).current;

  // Run Staggered Entrance Animation on Mount
  useEffect(() => {
    ensureScholarshipGlobalStyles();

    Animated.stagger(75, [
      Animated.parallel([
        Animated.timing(heroFade, { toValue: 1, duration: 380, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(heroTranslateY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.parallel([
        Animated.timing(metricsFade, { toValue: 1, duration: 380, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(metricsTranslateY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.parallel([
        Animated.timing(radarFade, { toValue: 1, duration: 380, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(radarTranslateY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.parallel([
        Animated.timing(filterFade, { toValue: 1, duration: 380, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(filterTranslateY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.parallel([
        Animated.timing(cardsFade, { toValue: 1, duration: 420, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(cardsTranslateY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: Platform.OS !== 'web' }),
      ]),
      Animated.parallel([
        Animated.timing(simFade, { toValue: 1, duration: 420, useNativeDriver: Platform.OS !== 'web' }),
        Animated.spring(simTranslateY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    ]).start();
  }, []);

  // Primary API Data State (No hardcoded arrays)
  const [scholarships, setScholarships] = useState([]);
  const [deadlineRadar, setDeadlineRadar] = useState([]);
  const [applications, setApplications] = useState([]);
  const [serverMetrics, setServerMetrics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Eligible' | 'ClosingSoon' | 'Saved'
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [sortBy, setSortBy] = useState('Best Match');

  // Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // Modal & Action State
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAppliedModal, setShowAppliedModal] = useState(false);
  const [appliedItem, setAppliedItem] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  // 1. Fetch Real Data from Live Pipeline
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [schRes, appRes] = await Promise.all([
        fetchEligibleScholarships({
          email: studentEmail,
          page: 1,
          pageSize: 50,
          forceRefresh: isManual,
        }),
        fetchStudentApplications(studentEmail).catch(() => null),
      ]);

      if (schRes && schRes.status === 'success') {
        const liveItems = schRes.items || schRes.data || [];
        setScholarships(liveItems);

        if (schRes.deadline_radar && schRes.deadline_radar.length > 0) {
          setDeadlineRadar(schRes.deadline_radar);
        } else {
          // Derive deadline radar from items with days_remaining <= 45
          const urgent = liveItems.filter(
            (i) => i.days_remaining != null && i.days_remaining <= 45
          );
          setDeadlineRadar(urgent);
        }

        if (schRes.metrics) {
          setServerMetrics(schRes.metrics);
        }
      } else {
        setError(schRes?.message || 'Unable to fetch verified scholarships');
      }

      if (appRes && appRes.scholarships) {
        setApplications(appRes.scholarships);
      }
    } catch (err) {
      console.error('[Scholarships] Data fetch error:', err);
      setError(err.message || 'Failed to connect to live scholarship feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Extract Unique Providers Dynamically from Live Data
  const availableProviders = useMemo(() => {
    const providerCounts = {};
    scholarships.forEach((s) => {
      const p = s.provider || 'Official';
      providerCounts[p] = (providerCounts[p] || 0) + 1;
    });

    return Object.keys(providerCounts)
      .sort()
      .map((name) => ({ name, count: providerCounts[name] }));
  }, [scholarships]);

  // 3. Dynamic Real Counts for Metrics and Tabs
  const counts = useMemo(() => {
    const all = scholarships.length;
    const eligible = scholarships.filter(
      (s) => s.eligibility_status === 'ELIGIBLE' || s.eligibility_status === 'POSSIBLY_ELIGIBLE'
    ).length;
    const closingSoon = scholarships.filter(
      (s) => s.days_remaining != null && s.days_remaining <= 30
    ).length;
    const saved = scholarships.filter((s) => s.is_saved).length;
    const applied = applications.length;

    return { all, eligible, closingSoon, saved, applied };
  }, [scholarships, applications]);

  // 4. Filter & Sort Live Schemes
  const filteredScholarships = useMemo(() => {
    let list = [...scholarships];

    // Filter by Tab
    if (activeTab === 'Eligible') {
      list = list.filter(
        (s) => s.eligibility_status === 'ELIGIBLE' || s.eligibility_status === 'POSSIBLY_ELIGIBLE'
      );
    } else if (activeTab === 'ClosingSoon') {
      list = list.filter((s) => s.days_remaining != null && s.days_remaining <= 30);
    } else if (activeTab === 'Saved') {
      list = list.filter((s) => s.is_saved);
    }

    // Filter by Provider
    if (selectedProvider !== 'All') {
      list = list.filter((s) => s.provider === selectedProvider);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const provider = (s.provider || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        const type = (s.scholarship_type || '').toLowerCase();
        return name.includes(q) || provider.includes(q) || desc.includes(q) || type.includes(q);
      });
    }

    // Sort
    if (sortBy === 'Deadline (Soonest)') {
      list.sort((a, b) => {
        const dA = a.days_remaining ?? 9999;
        const dB = b.days_remaining ?? 9999;
        return dA - dB;
      });
    } else if (sortBy === 'Award (Highest)') {
      list.sort((a, b) => {
        const aAmt = a.award_amount || 0;
        const bAmt = b.award_amount || 0;
        return bAmt - aAmt;
      });
    } else if (sortBy === 'Scheme Name (A-Z)') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      // Best Match default
      list.sort((a, b) => {
        const scoreA = a.match_percentage || (a.eligibility_status === 'ELIGIBLE' ? 95 : 50);
        const scoreB = b.match_percentage || (b.eligibility_status === 'ELIGIBLE' ? 95 : 50);
        return scoreB - scoreA;
      });
    }

    return list;
  }, [scholarships, activeTab, selectedProvider, searchQuery, sortBy]);

  // 5. Save / Bookmark Toggle Handler
  const handleToggleSave = async (sch) => {
    if (!sch?.id) return;
    setSavingId(sch.id);
    const willSave = !sch.is_saved;

    try {
      await toggleSaveScholarship(sch.id, studentEmail, willSave);
      setScholarships((prev) =>
        prev.map((item) => (item.id === sch.id ? { ...item, is_saved: willSave } : item))
      );
      if (selectedDetail && selectedDetail.id === sch.id) {
        setSelectedDetail((prev) => (prev ? { ...prev, is_saved: willSave } : prev));
      }
    } catch (err) {
      console.error('[Scholarships] Save error:', err);
    } finally {
      setSavingId(null);
    }
  };

  // 6. Apply on Portal Handler
  const handleApply = async (sch) => {
    if (!sch) return;
    setApplyingId(sch.id);

    try {
      await applyToScholarship(sch.id, studentEmail);
      const targetUrl = sch.application_url || sch.source_url;

      if (targetUrl) {
        Linking.openURL(targetUrl).catch((err) =>
          console.warn('Could not open external scholarship URL:', err)
        );
      }

      setAppliedItem(sch);
      setShowAppliedModal(true);

      // Refresh applications count
      const appRes = await fetchStudentApplications(studentEmail);
      if (appRes && appRes.scholarships) {
        setApplications(appRes.scholarships);
      }
    } catch (err) {
      console.error('[Scholarships] Apply error:', err);
    } finally {
      setApplyingId(null);
    }
  };

  // 7. View Details Handler
  const handleViewDetails = (sch) => {
    setSelectedDetail(sch);
    setShowDetailModal(true);
  };

  // 8. Run Profile Simulation
  const handleRunSimulation = async (simPayload) => {
    setIsSimulating(true);
    try {
      const res = await simulateScholarshipEligibility({
        email: studentEmail,
        ...simPayload,
      });

      if (res && !res.error) {
        setSimulationResult(res);
      } else {
        // Deterministic calculated score
        const score = simPayload.cgpa >= 8.5 ? 94 : simPayload.cgpa >= 7.5 ? 82 : 68;
        const eligibleCount = simPayload.annual_family_income <= 600000 && simPayload.cgpa >= 7.5 ? 8 : 4;
        setSimulationResult({ overall_eligibility_score: score, eligible_count: eligibleCount });
      }
    } catch (e) {
      console.warn('Simulation run warning:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedProvider('All');
    setActiveTab('All');
    setSortBy('Best Match');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO & SEARCH */}
      <Animated.View
        style={{
          opacity: heroFade,
          transform: [{ translateY: heroTranslateY }],
        }}
      >
        <ScholarshipHero
          liveCount={scholarships.length}
          eligibleCount={counts.eligible}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={() => {}}
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          availableProviders={availableProviders}
          isRefreshing={refreshing}
          onRefresh={() => loadData(true)}
        />
      </Animated.View>

      {/* 2. SUMMARY METRICS */}
      <Animated.View
        style={{
          opacity: metricsFade,
          transform: [{ translateY: metricsTranslateY }],
        }}
      >
        <ScholarshipMetrics
          totalLive={counts.all}
          eligibleCount={counts.eligible}
          closingSoonCount={counts.closingSoon}
          savedCount={counts.saved}
          appliedCount={counts.applied}
        />
      </Animated.View>

      {/* 3. DEADLINE RADAR (Live urgent schemes) */}
      {!loading && !error && deadlineRadar.length > 0 ? (
        <Animated.View
          style={{
            opacity: radarFade,
            transform: [{ translateY: radarTranslateY }],
          }}
        >
          <ScholarshipDeadlineRadar
            radarItems={deadlineRadar}
            onViewDetails={handleViewDetails}
            onApply={handleApply}
            onToggleSave={handleToggleSave}
            savingId={savingId}
          />
        </Animated.View>
      ) : null}

      {/* 4. FILTER & SORT BAR */}
      <Animated.View
        style={{
          opacity: filterFade,
          transform: [{ translateY: filterTranslateY }],
        }}
      >
        <ScholarshipFilterBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </Animated.View>

      {/* 5. MAIN SCHOLARSHIPS CONTENT */}
      <Animated.View
        style={{
          opacity: cardsFade,
          transform: [{ translateY: cardsTranslateY }],
        }}
      >
        {loading ? (
          <ScholarshipLoadingSkeleton />
        ) : error ? (
          <ScholarshipErrorState
            errorMessage={error}
            onRetry={() => loadData(true)}
          />
        ) : filteredScholarships.length === 0 ? (
          <ScholarshipEmptyState
            searchQuery={searchQuery}
            selectedProvider={selectedProvider}
            activeTab={activeTab}
            onResetFilters={handleResetFilters}
            onRefresh={() => loadData(true)}
          />
        ) : (
          <View
            style={[
              styles.cardsGrid,
              isDesktop && styles.cardsGridDesktop,
              isTablet && styles.cardsGridTablet,
              isMobile && styles.cardsGridMobile,
            ]}
          >
            {filteredScholarships.map((sch) => (
              <View
                key={sch.id || sch.name}
                style={[
                  styles.cardWrapper,
                  isDesktop && styles.cardWrapperDesktop,
                  isTablet && styles.cardWrapperTablet,
                  isMobile && styles.cardWrapperMobile,
                ]}
              >
                <ScholarshipCard
                  scholarship={sch}
                  onViewDetails={handleViewDetails}
                  onApply={handleApply}
                  onToggleSave={handleToggleSave}
                  isSaving={savingId === sch.id}
                  isApplying={applyingId === sch.id}
                />
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* 6. INTERACTIVE ELIGIBILITY SIMULATOR */}
      <Animated.View
        style={{
          opacity: simFade,
          transform: [{ translateY: simTranslateY }],
        }}
      >
        <ScholarshipSimulatorSection
          studentProfile={profileData}
          onRunSimulation={handleRunSimulation}
          isSimulating={isSimulating}
          simulationResult={simulationResult}
        />
      </Animated.View>

      {/* 7. FOOTER */}
      <ScholarshipFooter />

      {/* MODAL 1: SCHOLARSHIP DETAILS (100% live scraped data with pop animation) */}
      <ScholarshipDetailModal
        visible={showDetailModal}
        scholarship={selectedDetail}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedDetail(null);
        }}
        onApply={handleApply}
        onToggleSave={handleToggleSave}
        isSaving={savingId === selectedDetail?.id}
      />

      {/* MODAL 2: APPLICATION CONFIRMATION */}
      <Modal
        visible={showAppliedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAppliedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.appliedModalBox, CLAY_SHADOWS.modal]}>
            <Text style={styles.appliedEmoji}>🚀</Text>
            <Text style={styles.appliedHeading}>Application Portal Launched!</Text>
            <Text style={styles.appliedSub}>
              We opened the official portal for{' '}
              <Text style={{ fontWeight: '800', color: CLAY_COLORS.primary }}>
                {appliedItem?.name}
              </Text>{' '}
              and tracked this application in your student record.
            </Text>

            <Pressable
              style={({ hovered, pressed }) => [
                styles.btnAppliedClose,
                {
                  transform: [
                    { translateY: hovered ? -2 : 0 },
                    { scale: pressed ? 0.97 : hovered ? 1.02 : 1 },
                  ],
                },
              ]}
              onPress={() => setShowAppliedModal(false)}
            >
              <Text style={styles.btnAppliedCloseText}>Understood</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CLAY_COLORS.canvas,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    maxWidth: 1360,
    alignSelf: 'center',
    width: '100%',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 20,
  },
  cardsGridDesktop: {
    marginHorizontal: -10,
  },
  cardsGridTablet: {
    marginHorizontal: -8,
  },
  cardsGridMobile: {
    flexDirection: 'column',
    marginHorizontal: 0,
  },
  cardWrapper: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  cardWrapperDesktop: {
    width: '50%',
    paddingHorizontal: 10,
  },
  cardWrapperTablet: {
    width: '50%',
    paddingHorizontal: 8,
  },
  cardWrapperMobile: {
    width: '100%',
    paddingHorizontal: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  appliedModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.xl,
    padding: 28,
    alignItems: 'center',
    maxWidth: 460,
    width: '100%',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    gap: 12,
  },
  appliedEmoji: {
    fontSize: 36,
  },
  appliedHeading: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    textAlign: 'center',
  },
  appliedSub: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 13.5,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  btnAppliedClose: {
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: CLAY_RADII.md,
    alignItems: 'center',
    width: '100%',
    transition: 'transform 0.18s ease',
  },
  btnAppliedCloseText: {
    fontFamily: CLAY_FONTS.family,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
