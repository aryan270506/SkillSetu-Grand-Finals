import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
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
  fetchEligibleScholarships,
  toggleSaveScholarship,
  applyToScholarship,
  simulateScholarshipEligibility,
} from '../services/scholarshipService';
import { fetchStudentApplications } from '../services/applicationService';

const COLORS = {
  bgSurface: '#f9f9f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f3',
  surfaceContainer: '#eeeeed',
  surfaceContainerHigh: '#e8e8e7',
  surfaceContainerHighest: '#e2e2e2',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#3d4947',
  primary: '#00685f',
  primaryContainer: '#008378',
  onPrimaryContainer: '#f4fffc',
  primaryFixed: '#89f5e7',
  onPrimaryFixedVariant: '#005049',
  secondary: '#545f73',
  secondaryFixed: '#d8e3fb',
  onSecondaryFixed: '#111c2d',
  tertiary: '#825100',
  tertiaryFixed: '#ffddb8',
  onTertiaryFixedVariant: '#653e00',
  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',
  emerald800: '#065f46',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  outlineVariant: '#bcc9c6',
};

export default function Scolarship({ user, profileData }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const studentEmail = user?.email || profileData?.personalInfo?.email || 'abhoge27@gmail.com';

  // API State
  const [scholarships, setScholarships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Sub-Navigation Active Tab
  const [activeSubTab, setActiveSubTab] = useState('Overview');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // Simulator State
  const [simCgpa, setSimCgpa] = useState(String(user?.cgpa || 8.2));
  const [simIncome, setSimIncome] = useState(String(user?.annual_family_income || 450000));
  const [simCategory, setSimCategory] = useState(user?.social_category || 'GENERAL');
  const [simResults, setSimResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Modals
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAppliedModal, setShowAppliedModal] = useState(false);
  const [appliedItem, setAppliedItem] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  // Fetch Scholarships & Applications
  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [schRes, appRes] = await Promise.all([
        fetchEligibleScholarships({
          email: studentEmail,
          page: 1,
          pageSize: 50,
          search: searchQuery,
          category: categoryFilter,
          state: stateFilter,
        }),
        fetchStudentApplications(studentEmail),
      ]);

      if (schRes && schRes.status === 'success') {
        setScholarships(schRes.items || []);
      } else {
        setError(schRes?.message || 'Unable to load eligible scholarships');
      }

      if (appRes && appRes.scholarships) {
        setApplications(appRes.scholarships);
      }
    } catch (err) {
      console.error('[Scholarship Screen] Error loading data:', err);
      setError(err.message || 'Failed to connect to scholarship service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentEmail, categoryFilter, stateFilter]);

  // Dynamic Dashboard Metrics
  const metrics = useMemo(() => {
    let eligible = 0;
    let possiblyEligible = 0;
    let openIntake = 0;
    let saved = 0;
    const now = new Date();

    scholarships.forEach((s) => {
      if (s.eligibility_status === 'ELIGIBLE') eligible++;
      if (s.eligibility_status === 'POSSIBLY_ELIGIBLE') possiblyEligible++;
      if (s.is_saved) saved++;
      if (s.application_deadline) {
        const dl = new Date(s.application_deadline);
        if (dl >= now) openIntake++;
      } else {
        openIntake++;
      }
    });

    return {
      total: scholarships.length,
      eligible,
      possiblyEligible,
      openIntake,
      saved,
      applied: applications.length,
    };
  }, [scholarships, applications]);

  // Real Deadline Radar (Sorted by deadline ASC, non-expired)
  const deadlineRadar = useMemo(() => {
    const now = new Date();
    return scholarships
      .filter((s) => s.application_deadline && new Date(s.application_deadline) >= now)
      .sort((a, b) => new Date(a.application_deadline) - new Date(b.application_deadline))
      .slice(0, 4)
      .map((s) => {
        const diffMs = new Date(s.application_deadline) - now;
        const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return {
          ...s,
          daysLeft: diffDays,
        };
      });
  }, [scholarships]);

  // Run Real Simulator on backend
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await simulateScholarshipEligibility({
        email: studentEmail,
        cgpa: parseFloat(simCgpa) || undefined,
        annual_family_income: parseFloat(simIncome) || undefined,
        social_category: simCategory || undefined,
      });

      if (res && res.evaluated_scholarships) {
        setSimResults(res.evaluated_scholarships);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Apply Handler
  const handleApply = async (sch) => {
    setApplyingId(sch.id);
    try {
      // 1. Record application on backend
      const res = await applyToScholarship(sch.id, studentEmail);

      // 2. Open official portal
      const targetUrl = sch.application_url || sch.source_url || res?.data?.application_url;
      if (targetUrl) {
        Linking.openURL(targetUrl).catch((err) => {
          console.warn('Could not open external URL:', err);
        });
      }

      setAppliedItem(sch);
      setShowAppliedModal(true);

      // Refresh applications
      const appRes = await fetchStudentApplications(studentEmail);
      if (appRes && appRes.scholarships) {
        setApplications(appRes.scholarships);
      }
    } catch (err) {
      console.error('Scholarship apply error:', err);
    } finally {
      setApplyingId(null);
    }
  };

  // Save Handler
  const handleToggleSave = async (sch) => {
    setSavingId(sch.id);
    const willSave = !sch.is_saved;
    try {
      await toggleSaveScholarship(sch.id, studentEmail, willSave);
      setScholarships((prev) =>
        prev.map((item) => (item.id === sch.id ? { ...item, is_saved: willSave } : item))
      );
    } catch (err) {
      console.error('Scholarship save error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleViewDetails = (sch) => {
    setSelectedDetail(sch);
    setShowDetailModal(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* SECTION 1: HEADER & SUB-NAVIGATION */}
      <View style={styles.headerSection}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.tagRowHeader}>
              <View style={styles.tagBadge}>
                <View style={styles.dot} />
                <Text style={styles.tagBadgeText}>Deterministic Eligibility Framework</Text>
              </View>
              <Text style={styles.subtextDossier}>Academic Profile Synced</Text>
            </View>
            <Text style={styles.headerTitle}>Scholarship & Financial Aid Intelligence</Text>
            <Text style={styles.headerSubtitle}>
              Rule-based eligibility verification across Central, State, AICTE, and Corporate foundation grants.
            </Text>
          </View>
        </View>

        {/* Sub-Navigation Tabs */}
        <View style={styles.subNavBar}>
          {['Overview', 'Eligible Grants', 'Deadline Radar', 'Academic Simulator'].map((tab) => (
            <Pressable
              key={tab}
              style={[styles.subNavItem, activeSubTab === tab && styles.subNavItemActive]}
              onPress={() => setActiveSubTab(tab)}
            >
              <Text style={[styles.subNavItemText, activeSubTab === tab && styles.subNavItemTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* SECTION 2: METRICS DASHBOARD */}
      <View style={[styles.metricsGrid, isMobile && styles.metricsGridMobile]}>
        <View style={[styles.metricCard, { borderLeftColor: COLORS.primary }]}>
          <Text style={styles.metricLabel}>Eligible Schemes</Text>
          <Text style={[styles.metricValue, { color: COLORS.primary }]}>{metrics.eligible}</Text>
          <Text style={styles.metricSub}>100% Rules Met</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: COLORS.tertiary }]}>
          <Text style={styles.metricLabel}>Possibly Eligible</Text>
          <Text style={[styles.metricValue, { color: COLORS.tertiary }]}>{metrics.possiblyEligible}</Text>
          <Text style={styles.metricSub}>Profile Info Needed</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: COLORS.secondary }]}>
          <Text style={styles.metricLabel}>Open Intake</Text>
          <Text style={[styles.metricValue, { color: COLORS.secondary }]}>{metrics.openIntake}</Text>
          <Text style={styles.metricSub}>Active Deadlines</Text>
        </View>
        <View style={[styles.metricCard, { borderLeftColor: COLORS.emerald800 }]}>
          <Text style={styles.metricLabel}>Applications</Text>
          <Text style={[styles.metricValue, { color: COLORS.emerald800 }]}>{metrics.applied}</Text>
          <Text style={styles.metricSub}>Tracked Grants</Text>
        </View>
      </View>

      {/* LOADING / ERROR STATES */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Verifying scholarship rules & eligibility criteria...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Failed to Load Scholarships</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => loadData(true)}>
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & ELIGIBLE GRANTS */}
          {(activeSubTab === 'Overview' || activeSubTab === 'Eligible Grants') && (
            <View style={styles.contentLayout}>
              {/* Main List */}
              <View style={[styles.mainListCol, isDesktop ? { flex: 7 } : {}]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    {activeSubTab === 'Eligible Grants' ? 'All Verified Schemes' : 'Top Matched Schemes'} ({scholarships.length})
                  </Text>
                  <View style={styles.searchBox}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search provider, scheme, state..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onSubmitEditing={() => loadData(true)}
                      placeholderTextColor={COLORS.onSurfaceVariant}
                    />
                  </View>
                </View>

                {scholarships.length > 0 ? (
                  scholarships.map((sch) => {
                    const isEligible = sch.eligibility_status === 'ELIGIBLE';
                    const isPossible = sch.eligibility_status === 'POSSIBLY_ELIGIBLE';

                    return (
                      <View key={sch.id} style={styles.schemeCard}>
                        <View style={styles.schemeHeader}>
                          <View style={styles.providerBadge}>
                            <Text style={styles.providerBadgeText}>
                              {sch.provider ? sch.provider.substring(0, 2).toUpperCase() : 'SC'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.schemeTitle}>{sch.name}</Text>
                            <Text style={styles.schemeProvider}>{sch.provider} • {sch.academic_year || 'Current'}</Text>
                          </View>
                          <View style={[
                            styles.statusTagBadge,
                            isEligible && styles.tagBadgeGreen,
                            isPossible && styles.tagBadgeAmber,
                            !isEligible && !isPossible && styles.tagBadgeRose
                          ]}>
                            <Text style={[
                              styles.statusTagText,
                              isEligible && { color: COLORS.primary },
                              isPossible && { color: COLORS.tertiary },
                              !isEligible && !isPossible && { color: COLORS.error }
                            ]}>
                              {sch.eligibility_status}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.schemeDesc} numberOfLines={3}>{sch.description}</Text>

                        {/* Missing information prompt if POSSIBLY_ELIGIBLE */}
                        {isPossible && sch.missing_profile_fields && sch.missing_profile_fields.length > 0 && (
                          <View style={styles.missingInfoBox}>
                            <Text style={styles.missingInfoTitle}>ℹ Missing Profile Data to Confirm:</Text>
                            <Text style={styles.missingInfoText}>
                              {sch.missing_profile_fields.map((f) => f.replace(/_/g, ' ')).join(', ')}
                            </Text>
                          </View>
                        )}

                        <View style={styles.schemeMetaRow}>
                          <View>
                            <Text style={styles.awardLabel}>Award Grant</Text>
                            <Text style={styles.awardVal}>{sch.award_amount || 'Grant Disclosed by Portal'}</Text>
                          </View>
                          <View>
                            <Text style={styles.awardLabel}>Deadline</Text>
                            <Text style={styles.deadlineVal}>
                              {sch.application_deadline ? new Date(sch.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Open Intake'}
                            </Text>
                          </View>
                          <View style={styles.actionsRow}>
                            <Pressable style={styles.btnSec} onPress={() => handleViewDetails(sch)}>
                              <Text style={styles.btnSecText}>Details & Rules</Text>
                            </Pressable>
                            <Pressable
                              style={styles.btnPri}
                              onPress={() => handleApply(sch)}
                              disabled={applyingId === sch.id}
                            >
                              <Text style={styles.btnPriText}>
                                {applyingId === sch.id ? 'Launching...' : 'Apply on Portal'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>🎓</Text>
                    <Text style={styles.emptyTitle}>No Scholarships Found</Text>
                    <Text style={styles.emptySub}>No scholarships match your current search query.</Text>
                  </View>
                )}
              </View>

              {/* Sidebar: Deadline Radar & Source Attribution */}
              <View style={[styles.sideCol, isDesktop ? { flex: 4 } : {}]}>
                <View style={styles.radarCard}>
                  <View style={styles.radarHeader}>
                    <Text style={styles.radarIcon}>⏰</Text>
                    <Text style={styles.radarTitle}>Closing Soon</Text>
                  </View>
                  <Text style={styles.radarSub}>Schemes requiring immediate application submission.</Text>

                  {deadlineRadar.length > 0 ? (
                    deadlineRadar.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.radarItem}
                        onPress={() => handleViewDetails(item)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.radarItemTitle} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.radarItemProvider}>{item.provider}</Text>
                        </View>
                        <View style={styles.daysBadge}>
                          <Text style={styles.daysBadgeText}>{item.daysLeft}d left</Text>
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={styles.noRadarText}>No urgent schemes closing within 30 days.</Text>
                  )}
                </View>

                {/* Source Verification Banner */}
                <View style={styles.sourceCard}>
                  <Text style={styles.sourceTitle}>🛡 Verified Grant Sources</Text>
                  <Text style={styles.sourceText}>
                    All schemes in SkillSetu are sourced from National Scholarship Portal (NSP), AICTE, and verified philanthropic trusts. No synthetic listings.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: DEADLINE RADAR FULL VIEW */}
          {activeSubTab === 'Deadline Radar' && (
            <View style={styles.radarFullSection}>
              <Text style={styles.sectionTitle}>Urgent Scholarship Deadlines</Text>
              <Text style={styles.sectionSubtitle}>Tracked by chronological application closing date.</Text>
              <View style={styles.radarGrid}>
                {deadlineRadar.map((item) => (
                  <View key={item.id} style={styles.radarGridCard}>
                    <View style={styles.radarBadgeRow}>
                      <View style={styles.daysBadgeLarge}>
                        <Text style={styles.daysBadgeLargeText}>{item.daysLeft} Days Remaining</Text>
                      </View>
                      <Text style={styles.radarAward}>{item.award_amount || 'Merit Grant'}</Text>
                    </View>
                    <Text style={styles.radarGridTitle}>{item.name}</Text>
                    <Text style={styles.radarGridProvider}>{item.provider}</Text>
                    <Text style={styles.radarGridDesc} numberOfLines={2}>{item.description}</Text>
                    <Pressable style={styles.btnPri} onPress={() => handleApply(item)}>
                      <Text style={styles.btnPriText}>Apply Now</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 3: ACADEMIC SIMULATOR */}
          {activeSubTab === 'Academic Simulator' && (
            <View style={styles.simContainer}>
              <View style={styles.simCard}>
                <Text style={styles.simTitle}>Academic & Income Eligibility Simulator</Text>
                <Text style={styles.simSubtitle}>
                  Test different CGPA, income ceilings, and category parameters against the deterministic backend rule engine.
                </Text>

                <View style={[styles.simFormRow, isMobile && { flexDirection: 'column' }]}>
                  <View style={styles.simInputGroup}>
                    <Text style={styles.simLabel}>CGPA / Percentage</Text>
                    <TextInput
                      style={styles.simInput}
                      value={simCgpa}
                      onChangeText={setSimCgpa}
                      keyboardType="numeric"
                      placeholder="e.g. 8.5"
                    />
                  </View>
                  <View style={styles.simInputGroup}>
                    <Text style={styles.simLabel}>Annual Family Income (₹)</Text>
                    <TextInput
                      style={styles.simInput}
                      value={simIncome}
                      onChangeText={setSimIncome}
                      keyboardType="numeric"
                      placeholder="e.g. 450000"
                    />
                  </View>
                  <View style={styles.simInputGroup}>
                    <Text style={styles.simLabel}>Category</Text>
                    <TextInput
                      style={styles.simInput}
                      value={simCategory}
                      onChangeText={setSimCategory}
                      placeholder="GENERAL / OBC / SC / ST / EWS"
                    />
                  </View>
                </View>

                <Pressable
                  style={styles.simSubmitBtn}
                  onPress={handleRunSimulation}
                  disabled={isSimulating}
                >
                  <Text style={styles.simSubmitBtnText}>
                    {isSimulating ? 'Simulating Engine...' : 'Run Eligibility Simulation'}
                  </Text>
                </Pressable>
              </View>

              {/* Simulation Results */}
              {simResults && (
                <View style={styles.simResultsSection}>
                  <Text style={styles.simResultsHeading}>Simulation Outcomes ({simResults.length} Schemes Evaluated)</Text>
                  {simResults.map((res) => (
                    <View key={res.scholarship_id} style={styles.simResultCard}>
                      <View style={styles.simResultHeader}>
                        <Text style={styles.simResultTitle}>{res.name}</Text>
                        <View style={[
                          styles.statusTagBadge,
                          res.eligibility_status === 'ELIGIBLE' && styles.tagBadgeGreen,
                          res.eligibility_status === 'POSSIBLY_ELIGIBLE' && styles.tagBadgeAmber,
                          res.eligibility_status === 'NOT_ELIGIBLE' && styles.tagBadgeRose
                        ]}>
                          <Text style={[
                            styles.statusTagText,
                            res.eligibility_status === 'ELIGIBLE' && { color: COLORS.primary },
                            res.eligibility_status === 'POSSIBLY_ELIGIBLE' && { color: COLORS.tertiary },
                            res.eligibility_status === 'NOT_ELIGIBLE' && { color: COLORS.error }
                          ]}>
                            {res.eligibility_status}
                          </Text>
                        </View>
                      </View>

                      {/* Evaluated Checkpoints */}
                      <View style={styles.checkpointList}>
                        {res.evaluation_checkpoints && res.evaluation_checkpoints.map((cp, idx) => (
                          <View key={idx} style={styles.checkpointRow}>
                            <Text style={cp.passed ? styles.checkPass : styles.checkFail}>
                              {cp.passed ? '✓' : '✗'}
                            </Text>
                            <Text style={styles.checkpointText}>
                              <Text style={{ fontWeight: '700' }}>{cp.criterion}:</Text> Required: {String(cp.required)} | Evaluated: {String(cp.student_value ?? 'N/A')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* DETAILS & RULES MODAL */}
      {selectedDetail && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showDetailModal}
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedDetail.name}</Text>
                <Pressable onPress={() => setShowDetailModal(false)}>
                  <Text style={styles.modalCloseText}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.modalProvider}>{selectedDetail.provider}</Text>
              
              <View style={styles.modalMetaBox}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>AWARD AMOUNT</Text>
                  <Text style={styles.metaValue}>{selectedDetail.award_amount || 'Disclosed by Portal'}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>DEADLINE</Text>
                  <Text style={styles.metaValue}>
                    {selectedDetail.application_deadline ? new Date(selectedDetail.application_deadline).toLocaleDateString() : 'Open'}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>STATUS</Text>
                  <Text style={[styles.metaValue, { color: COLORS.primary }]}>{selectedDetail.eligibility_status}</Text>
                </View>
              </View>

              <Text style={styles.modalSectionTitle}>SCHEME DESCRIPTION</Text>
              <ScrollView style={{ maxHeight: 120, marginBottom: 16 }}>
                <Text style={styles.modalDesc}>{selectedDetail.description}</Text>
              </ScrollView>

              <Text style={styles.modalSectionTitle}>DETERMINISTIC RULE EVALUATION</Text>
              <View style={styles.checkpointList}>
                {selectedDetail.evaluation_checkpoints && selectedDetail.evaluation_checkpoints.map((cp, idx) => (
                  <View key={idx} style={styles.checkpointRow}>
                    <Text style={cp.passed ? styles.checkPass : styles.checkFail}>
                      {cp.passed ? '✓' : '✗'}
                    </Text>
                    <Text style={styles.checkpointText}>
                      <Text style={{ fontWeight: '700' }}>{cp.criterion}:</Text> Required: {String(cp.required)} (Your Profile: {String(cp.student_value ?? 'N/A')})
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Pressable style={styles.btnSec} onPress={() => setShowDetailModal(false)}>
                  <Text style={styles.btnSecText}>Close</Text>
                </Pressable>
                <Pressable
                  style={styles.btnPri}
                  onPress={() => {
                    setShowDetailModal(false);
                    handleApply(selectedDetail);
                  }}
                >
                  <Text style={styles.btnPriText}>Apply on Official Portal</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* CONFIRMATION MODAL */}
      {appliedItem && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showAppliedModal}
          onRequestClose={() => setShowAppliedModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmIcon}>🎓</Text>
              <Text style={styles.confirmTitle}>Official Scholarship Portal Opened</Text>
              <Text style={styles.confirmMessage}>
                We tracked your application for <Text style={{ fontWeight: '700' }}>{appliedItem.name}</Text> and opened the official scheme application URL.
              </Text>
              <Pressable style={styles.btnPri} onPress={() => setShowAppliedModal(false)}>
                <Text style={styles.btnPriText}>Done</Text>
              </Pressable>
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
    padding: 24,
    paddingBottom: 48,
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
  },
  headerSection: {
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tagRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.emerald50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.emerald100,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald800,
    marginRight: 6,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.emerald800,
  },
  subtextDossier: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.onSurface,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.onSurfaceVariant,
    maxWidth: 680,
    lineHeight: 22,
  },
  subNavBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    marginTop: 16,
    gap: 16,
  },
  subNavItem: {
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subNavItemActive: {
    borderBottomColor: COLORS.primary,
  },
  subNavItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
  },
  subNavItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  metricsGridMobile: {
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
  errorCard: {
    backgroundColor: COLORS.errorContainer,
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
    color: COLORS.onErrorContainer,
  },
  errorSub: {
    fontSize: 13,
    color: COLORS.onErrorContainer,
    marginVertical: 6,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  contentLayout: {
    flexDirection: 'row',
    gap: 24,
  },
  mainListCol: {
    flex: 1,
  },
  sideCol: {
    minWidth: 320,
    gap: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '750',
    color: COLORS.onSurface,
  },
  sectionSubtitle: {
    fontSize: 13.5,
    color: COLORS.onSurfaceVariant,
    marginBottom: 16,
  },
  searchBox: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    minWidth: 220,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 13.5,
    color: COLORS.onSurface,
    padding: 0,
    outlineStyle: 'none',
  },
  schemeCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  schemeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  providerBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  providerBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  schemeTitle: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.onSurface,
  },
  schemeProvider: {
    fontSize: 12.5,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  statusTagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagBadgeGreen: {
    backgroundColor: COLORS.emerald50,
    borderColor: COLORS.emerald100,
  },
  tagBadgeAmber: {
    backgroundColor: COLORS.tertiaryFixed,
    borderColor: '#fde68a',
  },
  tagBadgeRose: {
    backgroundColor: COLORS.errorContainer,
    borderColor: '#fca5a5',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '750',
  },
  schemeDesc: {
    fontSize: 13.5,
    color: COLORS.onSurfaceVariant,
    lineHeight: 19,
    marginBottom: 14,
  },
  missingInfoBox: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.tertiary,
  },
  missingInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.tertiary,
    marginBottom: 2,
  },
  missingInfoText: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  schemeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceContainerHigh,
    paddingTop: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  awardLabel: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  awardVal: {
    fontSize: 14,
    fontWeight: '750',
    color: COLORS.onSurface,
  },
  deadlineVal: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnSec: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  btnSecText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  btnPri: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnPriText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  radarCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    padding: 20,
  },
  radarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  radarIcon: {
    fontSize: 18,
  },
  radarTitle: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.onSurface,
  },
  radarSub: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginBottom: 16,
  },
  radarItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainerLow,
  },
  radarItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  radarItemProvider: {
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
  },
  daysBadge: {
    backgroundColor: COLORS.tertiaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tertiary,
  },
  noRadarText: {
    fontSize: 12.5,
    color: COLORS.onSurfaceVariant,
    fontStyle: 'italic',
  },
  sourceCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    padding: 16,
  },
  sourceTitle: {
    fontSize: 13.5,
    fontWeight: '750',
    color: COLORS.onSurface,
    marginBottom: 6,
  },
  sourceText: {
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    lineHeight: 17,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.onSurface,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  radarFullSection: {
    gap: 16,
  },
  radarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  radarGridCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    padding: 20,
  },
  radarBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  daysBadgeLarge: {
    backgroundColor: COLORS.tertiaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysBadgeLargeText: {
    fontSize: 12,
    fontWeight: '750',
    color: COLORS.tertiary,
  },
  radarAward: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  radarGridTitle: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.onSurface,
    marginBottom: 4,
  },
  radarGridProvider: {
    fontSize: 12.5,
    color: COLORS.onSurfaceVariant,
    marginBottom: 10,
  },
  radarGridDesc: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 16,
  },
  simContainer: {
    gap: 20,
  },
  simCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    padding: 24,
  },
  simTitle: {
    fontSize: 18,
    fontWeight: '750',
    color: COLORS.onSurface,
    marginBottom: 4,
  },
  simSubtitle: {
    fontSize: 13.5,
    color: COLORS.onSurfaceVariant,
    marginBottom: 20,
  },
  simFormRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  simInputGroup: {
    flex: 1,
  },
  simLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    marginBottom: 6,
  },
  simInput: {
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.onSurface,
    backgroundColor: COLORS.surfaceContainerLow,
    outlineStyle: 'none',
  },
  simSubmitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  simSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  simResultsSection: {
    gap: 12,
  },
  simResultsHeading: {
    fontSize: 16,
    fontWeight: '750',
    color: COLORS.onSurface,
  },
  simResultCard: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 10,
    padding: 16,
  },
  simResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  simResultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  checkpointList: {
    gap: 6,
  },
  checkpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkPass: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  checkFail: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  checkpointText: {
    fontSize: 12.5,
    color: COLORS.onSurfaceVariant,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 28, 28, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.onSurface,
    flex: 1,
  },
  modalCloseText: {
    fontSize: 24,
    color: COLORS.onSurfaceVariant,
    paddingLeft: 12,
  },
  modalProvider: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    marginBottom: 16,
  },
  modalMetaBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.onSurfaceVariant,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '750',
    color: COLORS.onSurface,
    marginTop: 2,
  },
  modalSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  confirmIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 13.5,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
});
