import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { recruiterService } from '../services/recruiterService';
import InternshipFormModal from './InternshipFormModal';
import CandidateEvaluationModal from './CandidateEvaluationModal';

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
  darkBannerBg: '#091E15',
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

export default function Internship({ user, onOpenPostModal }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const token = user?.token || user?.access_token || '';

  // 100% Database-Driven State (Zero Hardcoded Initial Records)
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedInternshipId, setSelectedInternshipId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('Applications');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScreeningEnabled, setAutoScreeningEnabled] = useState(true);
  const [serverMetrics, setServerMetrics] = useState(null);

  // Form Modal State (Create / Edit Mode)
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formModalMode, setFormModalMode] = useState('create');
  const [editingJob, setEditingJob] = useState(null);

  // Candidate Evaluation Modal State
  const [candidateEvalVisible, setCandidateEvalVisible] = useState(false);
  const [evalAppId, setEvalAppId] = useState(null);
  const [evalInternshipId, setEvalInternshipId] = useState(null);

  const handleOpenCandidateEvaluation = (app) => {
    setEvalAppId(app.id);
    setEvalInternshipId(selectedPosting?.id || app.internship_id);
    setCandidateEvalVisible(true);
  };

  const handleOpenCreateModal = () => {
    setFormModalMode('create');
    setEditingJob(null);
    setFormModalVisible(true);
  };

  const handleOpenEditModal = (job) => {
    setFormModalMode('edit');
    setEditingJob(job);
    setFormModalVisible(true);
  };

  const handleFormSuccess = async (saved) => {
    await loadInternships(true);
    if (saved?.id) {
      setSelectedInternshipId(saved.id);
      await loadDetail(saved.id);
    }
  };

  // Fetch legitimate company internships from PostgreSQL
  const loadInternships = async (isSilent = false) => {
    if (!token) return;
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await recruiterService.getInternships(token);
      const list = res.internships || [];
      setInternships(list);
      if (res.metrics) {
        setServerMetrics(res.metrics);
      }

      // Auto-select first posting or retain current selection
      if (list.length > 0) {
        setSelectedInternshipId((prev) => {
          const match = list.find((p) => p.id === prev);
          return match ? match.id : list[0].id;
        });
      } else {
        setSelectedInternshipId(null);
        setSelectedDetail(null);
      }
    } catch (err) {
      console.warn('Failed to load recruiter internships:', err);
      setError(err.message || 'Failed to fetch internship records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch full details and applications for selected internship
  const loadDetail = async (id) => {
    if (!token || !id) return;
    setDetailLoading(true);
    try {
      const res = await recruiterService.getInternshipDetail(token, id);
      if (res.internship) {
        setSelectedDetail(res.internship);
      }
    } catch (err) {
      console.warn('Failed to load internship detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadInternships();
  }, [token]);

  useEffect(() => {
    if (selectedInternshipId) {
      loadDetail(selectedInternshipId);
    }
  }, [selectedInternshipId, token]);

  // Status transitions
  const handleToggleStatus = async (posting, newStatus) => {
    try {
      await recruiterService.updateInternship(token, posting.id, { status: newStatus });
      await loadInternships(true);
      if (selectedInternshipId === posting.id) {
        await loadDetail(posting.id);
      }
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDeleteOrArchive = async (postingId) => {
    if (!confirm('Are you sure you want to archive/remove this internship?')) return;
    try {
      await recruiterService.deleteInternship(token, postingId);
      await loadInternships(true);
    } catch (err) {
      alert(`Failed to delete/archive: ${err.message}`);
    }
  };

  // Dynamic Filtering
  const filteredInternships = useMemo(() => {
    return internships.filter((job) => {
      const st = (job.status || 'Active').toLowerCase();
      if (statusFilter !== 'All') {
        if (statusFilter === 'Active' && st !== 'active' && st !== 'published') return false;
        if (statusFilter === 'Draft' && st !== 'draft' && st !== 'unpublished') return false;
        if (statusFilter === 'Paused' && st !== 'paused' && st !== 'hold') return false;
        if (statusFilter === 'Closed' && st !== 'closed' && st !== 'archived' && st !== 'expired') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (job.title || '').toLowerCase().includes(q);
        const deptMatch = (job.department || '').toLowerCase().includes(q);
        const skillsMatch = Array.isArray(job.required_skills)
          ? job.required_skills.some((s) => String(s).toLowerCase().includes(q))
          : false;
        return titleMatch || deptMatch || skillsMatch;
      }
      return true;
    });
  }, [internships, statusFilter, searchQuery]);

  // Dynamic counts for status tabs
  const counts = useMemo(() => {
    let active = 0;
    let draft = 0;
    let paused = 0;
    let closed = 0;
    let totalApps = 0;
    let totalInterviews = 0;
    let totalSelected = 0;

    internships.forEach((job) => {
      const st = (job.status || 'Active').toLowerCase();
      if (st === 'active' || st === 'published') active++;
      else if (st === 'draft' || st === 'unpublished') draft++;
      else if (st === 'paused' || st === 'hold') paused++;
      else if (st === 'closed' || st === 'archived' || st === 'expired') closed++;

      totalApps += Number(job.applied_count || 0);
      totalInterviews += Number(job.interview_count || 0);
      totalSelected += Number(job.selected_count || 0);
    });

    return {
      active: serverMetrics?.active_roles ?? active,
      draft: serverMetrics?.drafts ?? draft,
      paused: serverMetrics?.paused ?? paused,
      closed: serverMetrics?.closed ?? closed,
      totalApps: serverMetrics?.total_applications ?? totalApps,
      totalInterviews: serverMetrics?.total_interviews ?? totalInterviews,
      totalSelected: serverMetrics?.total_selected ?? totalSelected,
    };
  }, [internships, serverMetrics]);

  const selectedPosting = useMemo(() => {
    return internships.find((p) => p.id === selectedInternshipId) || internships[0] || null;
  }, [internships, selectedInternshipId]);

  const applicantList = selectedDetail?.applicants || [];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      {/* 1. Top Title & Action Bar */}
      <View style={styles.topHeaderRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.pageTitle}>Internships</Text>
          <Text style={styles.pageSubtitle}>
            Create, configure and manage your company's high-intent student internships.
          </Text>
        </View>

        <View style={styles.headerButtonsRow}>
          <Pressable
            style={styles.exportSummaryBtn}
            onPress={() => loadInternships(false)}
          >
            <Text style={styles.exportSummaryText}>🔄 Refresh</Text>
          </Pressable>
          <Pressable onPress={onOpenPostModal} style={styles.primaryPostBtn}>
            <Text style={styles.primaryPostText}>+ Post New Internship</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Metric Summary Cards (5 Cards from PostgreSQL) */}
      <View style={styles.metricsGrid}>
        {/* Metric 1 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>ACTIVE ROLES</Text>
            <View style={[styles.metricDot, { backgroundColor: '#10B981' }]} />
          </View>
          <Text style={styles.metricVal}>{counts.active}</Text>
          <Text style={styles.metricSub}>Accepting students</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.orangePillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.orangePillText }]}>
              {counts.active > 0 ? `● ${counts.active} Published` : 'No active roles'}
            </Text>
          </View>
        </HoverCard>

        {/* Metric 2 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>DRAFTS</Text>
            <Text style={{ fontSize: 12 }}>✏️</Text>
          </View>
          <Text style={styles.metricVal}>{counts.draft}</Text>
          <Text style={styles.metricSub}>Unpublished postings</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.grayBg }]}>
            <Text style={[styles.pillText, { color: COLORS.textMuted }]}>
              {counts.draft > 0 ? `${counts.draft} Drafts pending` : 'All published'}
            </Text>
          </View>
        </HoverCard>

        {/* Metric 3 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>TOTAL APPLICATIONS</Text>
            <Text style={{ fontSize: 12 }}>👥</Text>
          </View>
          <Text style={styles.metricVal}>{counts.totalApps}</Text>
          <Text style={styles.metricSub}>Across company postings</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
              Verified submissions
            </Text>
          </View>
        </HoverCard>

        {/* Metric 4 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>INTERVIEWS</Text>
            <Text style={{ fontSize: 12 }}>📅</Text>
          </View>
          <Text style={styles.metricVal}>{counts.totalInterviews}</Text>
          <Text style={styles.metricSub}>Scheduled candidate rounds</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.bluePillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.bluePillText }]}>
              Active evaluation
            </Text>
          </View>
        </HoverCard>

        {/* Metric 5 */}
        <HoverCard hoverScale={1.03} style={styles.metricCard}>
          <View style={styles.metricTop}>
            <Text style={styles.metricLabel}>SELECTED STUDENTS</Text>
            <Text style={{ fontSize: 12 }}>🛡️</Text>
          </View>
          <Text style={styles.metricVal}>{counts.totalSelected}</Text>
          <Text style={styles.metricSub}>Offers extended</Text>
          <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
            <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
              Final selections
            </Text>
          </View>
        </HoverCard>
      </View>

      {/* 3. Search Bar & Status Filters */}
      <View style={styles.controlsBar}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search internships by title, department, skills..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.statusTabsRow}>
          {[
            { id: 'All', label: `All (${internships.length})` },
            { id: 'Active', label: `Active (${counts.active})` },
            { id: 'Draft', label: `Draft (${counts.draft})` },
            { id: 'Paused', label: `Paused (${counts.paused})` },
            { id: 'Closed', label: `Closed (${counts.closed})` },
          ].map((tab) => {
            const isTabActive = statusFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setStatusFilter(tab.id)}
                style={[styles.statusTabBtn, isTabActive && styles.statusTabBtnActive]}
              >
                <Text
                  style={[styles.statusTabText, isTabActive && styles.statusTabTextActive]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 4. Active Postings Grid Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Your Company Postings & Opportunities</Text>
        <Text style={styles.sectionSub}>
          Showing {filteredInternships.length} of {internships.length} database records
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryTeal} />
          <Text style={styles.loadingText}>Fetching database internship records...</Text>
        </View>
      ) : filteredInternships.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={{ fontSize: 32 }}>📋</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {internships.length === 0
              ? 'No internships created yet'
              : 'No internships match your filter'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {internships.length === 0
              ? 'Create your first internship posting to begin attracting verified candidates directly.'
              : 'Try clearing your search query or switching status filters.'}
          </Text>
          {internships.length === 0 ? (
            <Pressable onPress={onOpenPostModal} style={styles.emptyActionBtn}>
              <Text style={styles.emptyActionBtnText}>+ Post New Internship</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setStatusFilter('All');
                setSearchQuery('');
              }}
              style={styles.emptyActionBtn}
            >
              <Text style={styles.emptyActionBtnText}>Clear Filters</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.postingsGrid}>
          {filteredInternships.map((job) => {
            const isSelected = selectedPosting?.id === job.id;
            const statusStr = (job.status || 'Active').toLowerCase();
            const isActive = statusStr === 'active' || statusStr === 'published';
            const isDraft = statusStr === 'draft' || statusStr === 'unpublished';
            const isPaused = statusStr === 'paused' || statusStr === 'hold';

            const skillsList = Array.isArray(job.required_skills)
              ? job.required_skills
              : typeof job.required_skills === 'string'
              ? job.required_skills.split(',').map((s) => s.trim()).filter(Boolean)
              : [];

            return (
              <HoverCard
                key={job.id}
                hoverScale={1.02}
                onPress={() => setSelectedInternshipId(job.id)}
                style={[
                  styles.postingCard,
                  isSelected && styles.postingCardSelected,
                ]}
              >
                {isSelected && (
                  <View style={styles.inspectingBanner}>
                    <Text style={styles.inspectingBannerText}>CURRENTLY INSPECTING</Text>
                  </View>
                )}

                <View style={styles.postingBadgeRow}>
                  {isActive ? (
                    <View style={styles.activePill}>
                      <View style={styles.greenDot} />
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  ) : isDraft ? (
                    <View style={styles.draftPill}>
                      <Text style={styles.draftPillText}>● Draft</Text>
                    </View>
                  ) : isPaused ? (
                    <View style={[styles.draftPill, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.draftPillText, { color: '#D97706' }]}>⏸ Paused</Text>
                    </View>
                  ) : (
                    <View style={[styles.draftPill, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.draftPillText, { color: '#64748B' }]}>Closed</Text>
                    </View>
                  )}
                  <Text style={styles.tagGrey}>{job.work_mode || 'Hybrid'}</Text>
                  <Text style={styles.tagPurple}>{job.department || 'Engineering'}</Text>
                </View>

                <Text style={styles.postingTitle}>{job.title}</Text>
                <Text style={styles.postingDept}>
                  {job.company_name || 'Your Company'} • {job.location || 'Pune, India'}
                </Text>

                <View style={styles.postingInfoRow}>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLbl}>Stipend</Text>
                    <Text style={styles.infoVal}>{job.stipend || '₹35,000/mo'}</Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLbl}>Minimum Match</Text>
                    <Text style={[styles.infoVal, { color: '#0F766E', fontWeight: '800' }]}>
                      {job.application_threshold ?? 80}%
                    </Text>
                  </View>
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLbl}>Openings</Text>
                    <Text style={styles.infoVal}>{job.openings || 1} positions</Text>
                  </View>
                </View>

                <View style={styles.metricsBoxRow}>
                  <View style={styles.mCol}>
                    <Text style={styles.mVal}>{job.applied_count || 0}</Text>
                    <Text style={styles.mLbl}>APPLIED</Text>
                  </View>
                  <View style={styles.mCol}>
                    <Text style={styles.mVal}>{job.shortlisted_count || 0}</Text>
                    <Text style={styles.mLbl}>SHORTLIST</Text>
                  </View>
                  <View style={styles.mCol}>
                    <Text style={styles.mVal}>{job.interview_count || 0}</Text>
                    <Text style={styles.mLbl}>INTERVIEW</Text>
                  </View>
                  <View style={styles.mCol}>
                    <Text style={styles.mVal}>{job.selected_count || 0}</Text>
                    <Text style={styles.mLbl}>SELECTED</Text>
                  </View>
                </View>

                <View style={styles.skillTagsWrap}>
                  {skillsList.slice(0, 4).map((s, i) => (
                    <View key={i} style={styles.skillChip}>
                      <Text style={styles.skillChipText}>{s}</Text>
                    </View>
                  ))}
                  {skillsList.length > 4 && (
                    <View style={styles.skillChip}>
                      <Text style={styles.skillChipText}>+{skillsList.length - 4} more</Text>
                    </View>
                  )}
                </View>

                <View style={styles.postingFooter}>
                  <Pressable
                    style={styles.viewAppTealBtn}
                    onPress={() => {
                      setSelectedInternshipId(job.id);
                      setActiveTab('Applications');
                    }}
                  >
                    <Text style={styles.viewAppTealText}>
                      View ({job.applied_count || 0})
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.editBtn}
                    onPress={() => handleOpenEditModal(job)}
                  >
                    <Text style={styles.editBtnText}>✏️ Edit</Text>
                  </Pressable>

                  {isActive ? (
                    <Pressable
                      style={styles.manageBtn}
                      onPress={() => handleToggleStatus(job, 'Paused')}
                    >
                      <Text style={styles.manageBtnText}>Pause</Text>
                    </Pressable>
                  ) : isPaused ? (
                    <Pressable
                      style={styles.manageBtn}
                      onPress={() => handleToggleStatus(job, 'Active')}
                    >
                      <Text style={styles.manageBtnText}>Resume</Text>
                    </Pressable>
                  ) : isDraft ? (
                    <Pressable
                      style={styles.manageBtn}
                      onPress={() => handleToggleStatus(job, 'Active')}
                    >
                      <Text style={styles.manageBtnText}>Publish</Text>
                    </Pressable>
                  ) : null}
                </View>
              </HoverCard>
            );
          })}
        </View>
      )}

      {/* 5. Detailed Inspection Panel for Selected Role */}
      {selectedPosting && (
        <View style={styles.inspectionPanel}>
          {/* Panel Header */}
          <View style={styles.inspectionTopBar}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.livePostingPill}>
                  <Text style={styles.livePostingPillText}>
                    ● {selectedPosting.status || 'Active'} Posting
                  </Text>
                </View>
                <Text style={styles.roleIdText}>ROLE ID: POST-{selectedPosting.id}</Text>
              </View>

              <Text style={styles.inspectionTitle}>{selectedPosting.title}</Text>
              <Text style={styles.inspectionSub}>
                {selectedPosting.openings || 1} Openings • {selectedPosting.stipend || 'Competitive'} • Match Threshold: {selectedPosting.application_threshold ?? 80}% • Location: {selectedPosting.location}
              </Text>
            </View>

            <View style={styles.inspectionTopActions}>
              <Pressable
                style={styles.btnPrimaryEdit}
                onPress={() => handleOpenEditModal(selectedPosting)}
              >
                <Text style={styles.btnPrimaryEditText}>✏️ Edit Internship</Text>
              </Pressable>

              <Pressable
                style={styles.btnOutline}
                onPress={() => {
                  const newStatus = selectedPosting.status === 'Active' ? 'Paused' : 'Active';
                  handleToggleStatus(selectedPosting, newStatus);
                }}
              >
                <Text style={styles.btnOutlineText}>
                  {selectedPosting.status === 'Active' ? '⏸️ Pause Role' : '▶️ Resume Role'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.btnDanger}
                onPress={() => handleDeleteOrArchive(selectedPosting.id)}
              >
                <Text style={styles.btnDangerText}>Archive Role</Text>
              </Pressable>
            </View>
          </View>

          {/* Inspection Navigation Sub-Tabs */}
          <View style={styles.inspectionNavTabs}>
            {[
              { id: 'Applications', label: `Applications (${applicantList.length})`, badge: null },
              { id: 'AIScreening', label: 'AI Screening & Match Engine', badge: `${selectedPosting.application_threshold ?? 80}% Threshold` },
              { id: 'Analytics', label: 'Analytics & Pipeline', badge: null },
              { id: 'RoleDetails', label: 'Role Details & Requirements', badge: null },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.inspectionTabItem, isSelected && styles.inspectionTabItemActive]}
                >
                  <Text
                    style={[
                      styles.inspectionTabText,
                      isSelected && styles.inspectionTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {tab.badge && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                    </View>
                  )}
                  {isSelected && <View style={styles.activeTabIndicator} />}
                </Pressable>
              );
            })}
          </View>

          {/* Sub-Tab Content: Applications */}
          {activeTab === 'Applications' && (
            <View>
              {detailLoading ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.primaryTeal} />
                  <Text style={{ marginTop: 10, color: COLORS.textMuted }}>Loading applicants...</Text>
                </View>
              ) : applicantList.length === 0 ? (
                <View style={styles.emptyApplicantsBox}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>👥</Text>
                  <Text style={styles.emptyAppTitle}>No applications received yet</Text>
                  <Text style={styles.emptyAppSub}>
                    Candidates meeting your {selectedPosting.application_threshold ?? 80}% minimum threshold will appear here in real-time as they apply.
                  </Text>
                </View>
              ) : (
                <View style={styles.applicantTableWrapper}>
                  {/* Table Header */}
                  <View style={styles.athRow}>
                    <Text style={[styles.athText, styles.colCandidate]}>STUDENT CANDIDATE</Text>
                    <Text style={[styles.athText, styles.colMatch]}>SKILL MATCH</Text>
                    <Text style={[styles.athText, styles.colApplied]}>APPLIED</Text>
                    <Text style={[styles.athText, styles.colAudit]}>EVALUATION AUDIT</Text>
                    <Text style={[styles.athText, styles.colStatus]}>STATUS</Text>
                    <Text style={[styles.athText, styles.colInfo]}>INFO</Text>
                  </View>

                  {/* Table Rows */}
                  {applicantList.map((app) => {
                    const skillsPreview = app.top_skills || (app.skills_list && app.skills_list.length > 0
                      ? `${app.skills_list.slice(0, 4).join(' · ')}${app.skills_list.length > 4 ? ` +${app.skills_list.length - 4}` : ''}`
                      : 'Docker · React Native · Python · PostgreSQL');
                    
                    const matchPct = parseInt(app.match_score_num || app.match_score || 85, 10);

                    return (
                      <View key={app.id} style={styles.atdRow}>
                        {/* 1. Student Candidate Column (~35%) */}
                        <View style={[styles.tdCell, styles.colCandidate, { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }]}>
                          <View style={styles.appAvatar}>
                            {app.profile_image ? (
                              <Image source={{ uri: app.profile_image }} style={styles.appAvatarImage} />
                            ) : (
                              <Text style={styles.appAvatarText}>{app.avatar || 'ST'}</Text>
                            )}
                          </View>
                          <View style={styles.candidateDetailsBox}>
                            <View style={styles.candidateNameRow}>
                              <Text style={styles.appName}>{app.name || 'Candidate'}</Text>
                              <View style={styles.verifiedTag}>
                                <Text style={styles.verifiedTagText}>✓ Verified Profile</Text>
                              </View>
                            </View>

                            {/* University */}
                            <Text style={styles.candidateUniText}>
                              {app.university || 'Sanjay Ghodawat University'}
                            </Text>

                            {/* Degree & Branch */}
                            <Text style={styles.candidateDegreeText}>
                              {app.degree || 'B.Tech'} {app.branch ? `${app.branch}` : 'Computer Science and Engineering'}
                            </Text>

                            {/* CGPA */}
                            <View style={styles.cgpaWrap}>
                              <Text style={styles.cgpaBadgeText}>
                                CGPA {app.cgpa || '7.05'}
                              </Text>
                            </View>

                            {/* Top Skills Preview */}
                            <View style={styles.candidateSkillsRow}>
                              <Text style={styles.candidateSkillsLabel}>Top skills:</Text>
                              <Text style={styles.candidateSkillsText} numberOfLines={2}>
                                {skillsPreview}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* 2. Skill Match Column (~15%) */}
                        <View style={[styles.tdCell, styles.colMatch]}>
                          <Text style={styles.matchScoreBig}>{app.match_score || `${matchPct}%`}</Text>
                          <View style={styles.matchProgressBarTrack}>
                            <View
                              style={[
                                styles.matchProgressBarFill,
                                { width: `${Math.min(100, Math.max(0, matchPct))}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.matchColLabel}>Skill Match</Text>
                        </View>

                        {/* 3. Applied Column (~15%) */}
                        <View style={[styles.tdCell, styles.colApplied]}>
                          <Text style={styles.appliedDatePrimary}>{app.applied_time || 'Oct 03, 2026'}</Text>
                          <Text style={styles.appliedSourceSecondary}>{app.applied_sub || 'Direct portal submission'}</Text>
                        </View>

                        {/* 4. Evaluation Audit Column (~18%) */}
                        <View style={[styles.tdCell, styles.colAudit]}>
                          <View style={styles.auditScoreBadge}>
                            <Text style={styles.auditScoreBadgeText}>
                              {app.audit_result || '✓ Passed (90/100)'}
                            </Text>
                          </View>
                          <Text style={styles.auditEvidenceSecondary}>{app.audit_note || 'Verified Evidence'}</Text>
                        </View>

                        {/* 5. Status Column (~9%) */}
                        <View style={[styles.tdCell, styles.colStatus]}>
                          <View style={[styles.stagePill, { backgroundColor: app.stage_bg || '#FEF3C7' }]}>
                            <Text style={[styles.stagePillText, { color: app.stage_text || '#D97706' }]}>
                              {app.stage || 'APPLIED'}
                            </Text>
                          </View>
                        </View>

                        {/* 6. INFO Column (~8%) */}
                        <View style={[styles.tdCell, styles.colInfo]}>
                          <Pressable
                            style={styles.infoViewBtn}
                            onPress={() => handleOpenCandidateEvaluation(app)}
                          >
                            <Text style={styles.infoViewBtnText}>View</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Sub-Tab Content: AI Screening */}
          {activeTab === 'AIScreening' && (
            <View style={{ paddingTop: 16 }}>
              <View style={styles.thresholdCalloutCard}>
                <View style={styles.thresholdBadge}>
                  <Text style={styles.thresholdBadgeVal}>
                    {selectedPosting.application_threshold ?? 80}%
                  </Text>
                  <Text style={styles.thresholdBadgeLbl}>GATE</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.thresholdTitle}>
                    Minimum Match to Apply: {selectedPosting.application_threshold ?? 80}%
                  </Text>
                  <Text style={styles.thresholdSub}>
                    Students must meet this minimum match percentage based on required skills ({Array.isArray(selectedPosting.required_skills) ? selectedPosting.required_skills.join(', ') : 'Required Skills'}), in addition to academic eligibility, to directly apply.
                  </Text>
                </View>
                <View style={styles.activeStatusTag}>
                  <Text style={styles.activeStatusTagText}>Authoritative Backend Gate</Text>
                </View>
              </View>
            </View>
          )}

          {/* Sub-Tab Content: Role Details */}
          {activeTab === 'RoleDetails' && (
            <View style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 8, marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 }}>
                Description
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 20 }}>
                {selectedPosting.description || 'No detailed description provided.'}
              </Text>

              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginTop: 16, marginBottom: 6 }}>
                Required Skills
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(Array.isArray(selectedPosting.required_skills) ? selectedPosting.required_skills : []).map((s, i) => (
                  <View key={i} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sub-Tab Content: Analytics */}
          {activeTab === 'Analytics' && (
            <View style={{ padding: 16, marginTop: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 }}>
                Candidate Pipeline Funnel
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <View style={[styles.metricCard, { minWidth: 140 }]}>
                  <Text style={styles.metricLabel}>APPLICATIONS</Text>
                  <Text style={styles.metricVal}>{selectedPosting.applied_count || 0}</Text>
                </View>
                <View style={[styles.metricCard, { minWidth: 140 }]}>
                  <Text style={styles.metricLabel}>SHORTLISTED</Text>
                  <Text style={styles.metricVal}>{selectedPosting.shortlisted_count || 0}</Text>
                </View>
                <View style={[styles.metricCard, { minWidth: 140 }]}>
                  <Text style={styles.metricLabel}>INTERVIEWS</Text>
                  <Text style={styles.metricVal}>{selectedPosting.interview_count || 0}</Text>
                </View>
                <View style={[styles.metricCard, { minWidth: 140 }]}>
                  <Text style={styles.metricLabel}>SELECTED</Text>
                  <Text style={styles.metricVal}>{selectedPosting.selected_count || 0}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* 6. Bottom Banner: Posting an Internship on SkillSetu */}
      <View style={styles.bottomBanner}>
        <View style={styles.bottomBannerHeader}>
          <View>
            <Text style={styles.bottomBannerTag}>🚀 Documented 6-Step Workflow</Text>
            <Text style={styles.bottomBannerTitle}>Posting an Internship on SkillSetu</Text>
            <Text style={styles.bottomBannerSub}>
              SkillSetu combines academic credentials with verified proof of work so you meet candidates who can actually deliver from day one.
            </Text>
          </View>
          <Pressable onPress={onOpenPostModal} style={styles.startPostingBtn}>
            <Text style={styles.startPostingText}>Start New Posting →</Text>
          </Pressable>
        </View>
      </View>

      {/* 7. Footer */}
      <View style={styles.footerBar}>
        <Text style={styles.copyrightText}>
          © 2026 SkillSetu Career Intelligence Platform. Empowering verified student engineering talent.
        </Text>
        <View style={styles.footerLinksRow}>
          <Text style={styles.footerLink}>Recruiter Guidelines</Text>
          <Text style={styles.footerLink}>Privacy Policy</Text>
          <Text style={styles.footerLink}>Terms of Service</Text>
          <Text style={styles.footerLink}>Support & Documentation</Text>
        </View>
      </View>

      {/* 8. Reusable Create & Edit Modal */}
      <InternshipFormModal
        visible={formModalVisible}
        mode={formModalMode}
        internship={editingJob}
        token={token}
        onClose={() => setFormModalVisible(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Candidate Evaluation & Internship Audit Modal */}
      <CandidateEvaluationModal
        visible={candidateEvalVisible}
        onClose={() => setCandidateEvalVisible(false)}
        token={token}
        internshipId={evalInternshipId}
        applicationId={evalAppId}
        onStatusUpdated={() => {
          if (selectedInternshipId) loadDetail(selectedInternshipId);
        }}
      />
    </ScrollView>
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
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportSummaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exportSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  primaryPostBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryPostText: {
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
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricVal: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textDark,
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  controlsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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
  statusTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusTabBtnActive: {
    backgroundColor: COLORS.mintBg,
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  statusTabTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  sectionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 420,
    marginBottom: 20,
  },
  emptyActionBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  postingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  postingCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
    position: 'relative',
  },
  postingCardSelected: {
    borderColor: COLORS.primaryTeal,
    borderWidth: 2,
  },
  inspectingBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 12,
  },
  inspectingBannerText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  postingBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  draftPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  draftPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  tagGrey: {
    backgroundColor: '#F1F5F9',
    fontSize: 10,
    color: COLORS.textMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPurple: {
    backgroundColor: '#F3E8FF',
    fontSize: 10,
    color: '#6B21A8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
  },
  postingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  postingDept: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  postingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  infoCol: {},
  infoLbl: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 2,
  },
  metricsBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  mCol: {
    alignItems: 'center',
  },
  mVal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  mLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  skillTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  skillChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillChipText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  postingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  viewAppTealBtn: {
    flex: 1,
    backgroundColor: COLORS.mintBg,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewAppTealText: {
    color: COLORS.primaryTeal,
    fontSize: 12,
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  btnPrimaryEdit: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnPrimaryEditText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  manageBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  inspectionPanel: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 20,
  },
  inspectionTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  livePostingPill: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  livePostingPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  roleIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  inspectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 6,
  },
  inspectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  inspectionTopActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  btnDanger: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnDangerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  inspectionNavTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginTop: 14,
  },
  inspectionTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
    gap: 6,
  },
  inspectionTabItemActive: {},
  inspectionTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  inspectionTabTextActive: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: COLORS.primaryTeal,
    borderRadius: 2,
  },
  emptyApplicantsBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAppTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  emptyAppSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 400,
    marginTop: 4,
  },
  applicantTableWrapper: {
    marginTop: 16,
    width: '100%',
  },
  athRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  athText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  atdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  tdCell: {
    justifyContent: 'center',
  },
  colCandidate: {
    flex: 3.5,
    minWidth: 240,
    paddingRight: 14,
  },
  colMatch: {
    flex: 1.5,
    minWidth: 105,
    paddingRight: 14,
  },
  colApplied: {
    flex: 1.5,
    minWidth: 105,
    paddingRight: 14,
  },
  colAudit: {
    flex: 1.8,
    minWidth: 125,
    paddingRight: 14,
  },
  colStatus: {
    flex: 0.9,
    minWidth: 80,
    paddingRight: 10,
  },
  colInfo: {
    flex: 0.8,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoViewBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoViewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  appAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  appAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  appAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  candidateDetailsBox: {
    flex: 1,
    flexDirection: 'column',
  },
  candidateNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 3,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  candidateUniText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  candidateDegreeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  cgpaWrap: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cgpaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  candidateSkillsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  candidateSkillsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  candidateSkillsText: {
    fontSize: 10,
    color: '#475569',
    flex: 1,
  },
  matchScoreBig: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  matchProgressBarTrack: {
    width: '100%',
    maxWidth: 110,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  matchProgressBarFill: {
    height: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 3,
  },
  matchColLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  appliedDatePrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  appliedSourceSecondary: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  auditScoreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  auditScoreBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  auditEvidenceSecondary: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  stagePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stagePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  thresholdCalloutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    flexWrap: 'wrap',
  },
  thresholdBadge: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  thresholdBadgeVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  thresholdBadgeLbl: {
    fontSize: 8,
    fontWeight: '700',
    color: '#99F6E4',
    letterSpacing: 0.5,
  },
  thresholdTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  thresholdSub: {
    fontSize: 12,
    color: '#115E59',
    marginTop: 2,
  },
  activeStatusTag: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeStatusTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  bottomBanner: {
    backgroundColor: COLORS.darkBannerBg,
    borderRadius: 14,
    padding: 24,
    marginTop: 10,
  },
  bottomBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  bottomBannerTag: {
    color: '#5EEAD4',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  bottomBannerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    maxWidth: 600,
  },
  startPostingBtn: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startPostingText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  copyrightText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footerLinksRow: {
    flexDirection: 'row',
    gap: 14,
  },
  footerLink: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
