import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Linking, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  fetchEligibleScholarships,
  toggleSaveScholarship,
  applyToScholarship,
  simulateScholarshipEligibility,
} from '../services/scholarshipService';
import { fetchStudentApplications } from '../services/applicationService';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  EventCard,
  Icon,
  IconButton,
  Inset,
  Page,
  Pill,
  Row,
  SearchField,
  SectionTitle,
  SegmentedTabs,
  Sheet,
  Skeleton,
  Stack,
  Txt,
} from '../../../ui/components';
import { colors, radii, space } from '../../../ui/theme';

import { tl } from '../../../i18n/tl';
import { formatCurrency, formatDate } from '../../../i18n/format';

export default function Scolarship({ user, profileData }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  const studentEmail = user?.email || profileData?.personalInfo?.email || '';

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
        setSimulationResult(null);
        alert(res?.error || 'Simulation is unavailable right now.');
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

  const [sim, setSim] = useState({ cgpa: 8.5, income: 450000, category: 'General', domicile: 'All India', gender: 'any' });
  const eligTone = (s) => (s === 'ELIGIBLE' ? 'success' : s === 'POSSIBLY_ELIGIBLE' ? 'info' : s === 'NOT_ELIGIBLE' ? 'danger' : 'neutral');
  const eligLabel = (s) => (s === 'ELIGIBLE' ? 'Eligible' : s === 'POSSIBLY_ELIGIBLE' ? 'Possibly eligible' : s === 'NOT_ELIGIBLE' ? 'Not eligible' : 'Check eligibility');
  const fmtDate = (d) => (d ? formatDate(d, { day: 'numeric', month: 'short' }) : null);
  const checkpointsOf = (sch) => sch.checkpoints || sch.evaluation_checkpoints || [];

  const tabs = [
    { id: 'All', label: 'All', badge: counts.all },
    { id: 'Eligible', label: 'Eligible', badge: counts.eligible },
    { id: 'ClosingSoon', label: 'Closing soon', badge: counts.closingSoon },
    { id: 'Saved', label: 'Saved', icon: 'Bookmark' },
  ];

  const renderCard = (sch) => {
    const cps = checkpointsOf(sch);
    const passed = cps.filter((c) => c.passed === true).length;
    const urgent = sch.days_remaining != null && sch.days_remaining <= 30;
    return (
      (<Card key={sch.id || sch.name} style={styles.card} badge={{ icon: 'GraduationCap', tone: eligTone(sch.eligibility_status) === 'neutral' ? 'warning' : eligTone(sch.eligibility_status) }}>
        <Stack gap={4}>
          <Txt variant="overline" tone="subtle" numberOfLines={1}>{sch.provider}</Txt>
          <Txt variant="h3" tone="ink" numberOfLines={2}>{sch.name}</Txt>
          <Txt variant="small" tone="muted" numberOfLines={2}>{sch.description}</Txt>
        </Stack>
        <Row wrap gap={6} style={{ marginTop: space.md }}>
          {sch.award_description || sch.award_amount ? <Pill label={sch.award_description || formatCurrency(sch.award_amount)} tone="warning" icon="Wallet" size="sm" /> : null}
          {sch.application_deadline ? <Pill label={`${fmtDate(sch.application_deadline)}${sch.days_remaining != null ? tl('· {{days_remaining}}d left', {
            days_remaining: sch.days_remaining
          }) : ''}`} tone={urgent ? 'danger' : 'neutral'} icon="Clock" size="sm" /> : null}
        </Row>
        {cps.length ? (
          <Inset tone="neutral" padding={space.sm} style={{ marginTop: space.md }}>
            <Row justify="space-between" style={{ marginBottom: 6 }}>
              <Txt variant="caption" weight={700} tone="ink">Eligibility checks</Txt>
              <Txt variant="caption" tone="muted">{passed}/{cps.length} passed</Txt>
            </Row>
            {cps.slice(0, 3).map((c) => (
              <Row key={c.criterion} gap={8} style={{ marginTop: 4 }} align="flex-start">
                <Icon name={c.passed === true ? 'CircleCheck' : c.passed === false ? 'X' : 'CircleAlert'} size={14} color={c.passed === true ? colors.mintInk : c.passed === false ? '#B4232A' : colors.butterInk} />
                <Txt variant="caption" tone="default" style={{ flex: 1 }} numberOfLines={1}>{c.criterion}: {c.student_value} ({c.required})</Txt>
              </Row>
            ))}
          </Inset>
        ) : null}
        <Row justify="space-between" style={{ marginTop: space.lg }} wrap gap={8}>
          <Pill label={`${eligLabel(sch.eligibility_status)}${sch.match_percentage != null ? ` · ${Math.round(sch.match_percentage)}%` : ''}`} tone={eligTone(sch.eligibility_status)} />
          <Row gap={8}>
            <IconButton icon="Bookmark" variant={sch.is_saved ? 'dark' : 'soft'} onPress={() => handleToggleSave(sch)} disabled={savingId === sch.id} accessibilityLabel="Save" />
            <IconButton icon="Ellipsis" onPress={() => handleViewDetails(sch)} accessibilityLabel="Details" />
            <Button label="Apply" size="sm" iconRight="ArrowUpRight" onPress={() => handleApply(sch)} loading={applyingId === sch.id} />
          </Row>
        </Row>
      </Card>)
    );
  };

  const aside = (
    <>
      <SectionTitle title="Deadlines" emoji="⏳" />
      {deadlineRadar.slice(0, 5).map((sch) => (
        <EventCard
          key={`d-${sch.id}`}
          tone={sch.days_remaining != null && sch.days_remaining <= 14 ? 'pink' : 'warning'}
          icon="Clock"
          type={sch.days_remaining != null ? tl('{{days_remaining}} days left', {
            days_remaining: sch.days_remaining
          }) : 'Deadline'}
          date={fmtDate(sch.application_deadline)}
          title={sch.name}
          body={sch.award_description}
          onPress={() => handleViewDetails(sch)}
        />
      ))}
      {!deadlineRadar.length && !loading ? (
        <View style={styles.emptyEvents}>
          <EmptyState icon="Calendar" title="No urgent deadlines" message="Schemes closing within 45 days show up here." />
        </View>
      ) : null}

      <Card tone="info">
        <Row gap={8}>
          <Icon name="Sparkles" size={18} color={colors.skyInk} />
          <Txt variant="h3" tone="ink">Eligibility simulator</Txt>
        </Row>
        <Txt variant="small" color={colors.skyInk} style={{ marginTop: 4 }}>See how CGPA, income or category change what you qualify for.</Txt>
        <Stack gap={10} style={{ marginTop: space.md }}>
          <Txt variant="caption" weight={700} tone="ink">CGPA</Txt>
          <ChipGroup options={[6.5, 7.5, 8.5, 9, 9.5].map((v) => ({ id: v, label: String(v) }))} value={sim.cgpa} multiple={false} tone="info" onChange={(v) => setSim((p) => ({ ...p, cgpa: v }))} />
          <Txt variant="caption" weight={700} tone="ink">Family income</Txt>
          <ChipGroup options={[{ id: 250000, label: '₹2.5L' }, { id: 450000, label: '₹4.5L' }, { id: 600000, label: '₹6L' }, { id: 800000, label: '₹8L' }]} value={sim.income} multiple={false} tone="info" onChange={(v) => setSim((p) => ({ ...p, income: v }))} />
          <Txt variant="caption" weight={700} tone="ink">Category</Txt>
          <ChipGroup options={['General', 'EWS', 'OBC-NCL', 'SC', 'ST']} value={sim.category} multiple={false} tone="info" onChange={(v) => setSim((p) => ({ ...p, category: v }))} />
          <Txt variant="caption" weight={700} tone="ink">Gender</Txt>
          <ChipGroup options={[{ id: 'female', label: 'Female' }, { id: 'male', label: 'Male' }, { id: 'any', label: 'Prefer not to say' }]} value={sim.gender} multiple={false} tone="info" onChange={(v) => setSim((p) => ({ ...p, gender: v }))} />
          <Button
            label="Run simulation"
            icon="Play"
            loading={isSimulating}
            onPress={() => handleRunSimulation({ cgpa: sim.cgpa, annual_family_income: sim.income, social_category: sim.category.toUpperCase(), state_domicile: sim.domicile, gender: sim.gender })}
          />
          {simulationResult ? (
            <Inset tone="info">
              <Row justify="space-between">
                <Txt variant="small" weight={700} tone="ink">Eligibility score</Txt>
                <Txt variant="small" weight={700} tone="ink">{simulationResult.overall_eligibility_score ?? '—'}%</Txt>
              </Row>
              <Txt variant="caption" tone="muted" style={{ marginTop: 4 }}>{simulationResult.eligible_count ?? 0} schemes would match this profile.</Txt>
            </Inset>
          ) : null}
        </Stack>
      </Card>
    </>
  );

  const detail = selectedDetail;
  return (
    (<Page aside={aside}>
      <SectionTitle
        title="Scholarships"
        emoji="🎓"
        subtitle={loading ? 'Checking schemes against your profile…' : tl(
          '{{all}} live schemes · {{eligible}} you may qualify for · {{applied}} applied',
          {
            all: counts.all,
            eligible: counts.eligible,
            applied: counts.applied
          }
        )}
        right={
          <Row gap={8}>
            <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Scheme or provider" style={{ width: isMobile ? '100%' : 250 }} />
            <IconButton icon="RefreshCw" size={46} onPress={() => loadData(true)} disabled={refreshing} accessibilityLabel="Refresh" />
          </Row>
        }
      />
      <SegmentedTabs options={tabs} value={activeTab} onChange={setActiveTab} scrollable={isMobile} />
      <Row wrap gap={8}>
        {['Best Match', 'Deadline (Soonest)', 'Award (Highest)', 'Scheme Name (A-Z)'].map((s) => (
          <Chip key={s} label={s} icon="Funnel" tone="accent" selected={sortBy === s} onPress={() => setSortBy(s)} />
        ))}
      </Row>
      {availableProviders.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Chip label="All providers" selected={selectedProvider === 'All'} onPress={() => setSelectedProvider('All')} />
          {availableProviders.map((p) => (
            <Chip key={p.name} label={`${p.name} · ${p.count}`} tone="warning" selected={selectedProvider === p.name} onPress={() => setSelectedProvider(selectedProvider === p.name ? 'All' : p.name)} />
          ))}
        </ScrollView>
      ) : null}
      {loading ? (
        <View style={styles.grid}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={260} radius={radii.xl} style={styles.card} />)}</View>
      ) : error ? (
        <Card><EmptyState icon="CircleAlert" tone="danger" title="Couldn't load scholarships" message={error} action={<Button label="Retry" icon="RefreshCw" onPress={() => loadData(true)} />} /></Card>
      ) : filteredScholarships.length ? (
        <View style={styles.grid}>{filteredScholarships.map(renderCard)}</View>
      ) : (
        <Card><EmptyState icon="GraduationCap" title="No schemes match" message="Try another tab, provider or search term." action={<Button label="Reset filters" onPress={handleResetFilters} />} /></Card>
      )}
      <Sheet
        visible={showDetailModal && !!detail}
        onClose={() => setShowDetailModal(false)}
        title={detail?.name}
        subtitle={detail?.provider}
        icon="GraduationCap"
        tone="warning"
        width={720}
        footer={
          detail ? (
            <>
              <Button label={detail.is_saved ? 'Saved' : 'Save'} icon="Bookmark" variant="secondary" onPress={() => handleToggleSave(detail)} />
              <Button label="Apply on portal" iconRight="ArrowUpRight" onPress={() => { setShowDetailModal(false); handleApply(detail); }} />
            </>
          ) : null
        }
      >
        {detail ? (
          <>
            <Row wrap gap={6}>
              <Pill label={eligLabel(detail.eligibility_status)} tone={eligTone(detail.eligibility_status)} />
              {detail.award_description ? <Pill label={detail.award_description} tone="warning" icon="Wallet" /> : null}
              {detail.application_deadline ? <Pill label={tl('Deadline {{v0}}', {
                v0: fmtDate(detail.application_deadline)
              })} icon="Calendar" /> : null}
              {detail.academic_year ? <Pill label={detail.academic_year} /> : null}
            </Row>
            <Txt variant="body" tone="default">{detail.description}</Txt>
            {checkpointsOf(detail).length ? (
              <Card padding={space.lg}>
                <Txt variant="h3" tone="ink">Eligibility checks</Txt>
                <Stack gap={10} style={{ marginTop: space.sm }}>
                  {checkpointsOf(detail).map((c) => (
                    <Row key={c.criterion} gap={10} align="flex-start">
                      <Icon name={c.passed === true ? 'CircleCheck' : c.passed === false ? 'X' : 'CircleAlert'} size={18} color={c.passed === true ? colors.mintInk : c.passed === false ? '#B4232A' : colors.butterInk} />
                      <Stack gap={1} style={{ flex: 1 }}>
                        <Txt variant="small" weight={700} tone="ink">{c.criterion}</Txt>
                        <Txt variant="caption" tone="muted">Required {c.required} · You: {c.student_value}</Txt>
                        {c.reason ? <Txt variant="caption" tone="subtle">{c.reason}</Txt> : null}
                      </Stack>
                    </Row>
                  ))}
                </Stack>
              </Card>
            ) : null}
          </>
        ) : null}
      </Sheet>
      <Sheet
        visible={showAppliedModal && !!appliedItem}
        onClose={() => setShowAppliedModal(false)}
        title="Application started"
        subtitle={appliedItem?.name}
        icon="Send"
        tone="success"
        width={520}
        footer={<Button label="Done" onPress={() => setShowAppliedModal(false)} />}
      >
        <Txt variant="body" tone="muted">We opened the official portal in a new tab. Complete the application there — it's tracked under Applications.</Txt>
      </Sheet>
    </Page>)
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  card: {
    flexGrow: 1,
    flexBasis: 360,
  },
  emptyEvents: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
  },
});
