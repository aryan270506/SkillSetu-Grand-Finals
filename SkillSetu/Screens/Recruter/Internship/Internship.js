import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { recruiterService } from '../services/recruiterService';
import InternshipFormModal from './InternshipFormModal';
import CandidateEvaluationModal from './CandidateEvaluationModal';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  FeatureCard,
  IconButton,
  Page,
  Pill,
  ProgressBar,
  Row,
  SearchField,
  SectionTitle,
  SegmentedTabs,
  Skeleton,
  Stack,
  StatTile,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';

import { tl } from '../../../i18n/tl';

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
      alert(tl('Failed to update status: {{message}}', {
        message: err.message
      }));
    }
  };

  const handleDeleteOrArchive = async (postingId) => {
    if (!confirm('Are you sure you want to archive/remove this internship?')) return;
    try {
      await recruiterService.deleteInternship(token, postingId);
      await loadInternships(true);
    } catch (err) {
      alert(tl('Failed to delete/archive: {{message}}', {
        message: err.message
      }));
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

  const statusTone = (st = '') => {
    const v = st.toLowerCase();
    if (v === 'active' || v === 'published') return 'success';
    if (v === 'draft' || v === 'unpublished') return 'neutral';
    if (v === 'paused' || v === 'hold') return 'warning';
    return 'danger';
  };
  const isActive = (st = '') => ['active', 'published'].includes(String(st).toLowerCase());
  const tabs = [
    { id: 'All', label: 'All', badge: internships.length },
    { id: 'Active', label: 'Active', badge: counts.active },
    { id: 'Draft', label: 'Drafts', badge: counts.draft },
    { id: 'Paused', label: 'Paused', badge: counts.paused },
    { id: 'Closed', label: 'Closed', badge: counts.closed },
  ];
  const job = selectedDetail && selectedDetail.id === selectedPosting?.id ? { ...selectedPosting, ...selectedDetail } : selectedPosting;

  const list = (
    <Stack gap={space.sm}>
      {filteredInternships.map((p) => {
        const sel = p.id === selectedPosting?.id;
        const body = (
          <>
            <Row justify="space-between" align="flex-start" gap={8}>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="title" tone="ink" numberOfLines={2}>{p.title}</Txt>
                <Txt variant="caption" tone="muted" numberOfLines={1}>{[p.department, p.work_mode || p.location, p.stipend].filter(Boolean).join(' · ')}</Txt>
              </Stack>
              <Pill label={p.status || 'Active'} tone={statusTone(p.status)} size="sm" />
            </Row>
            <Row wrap gap={6} style={{ marginTop: space.sm }}>
              <Pill label={tl('{{v0}} applied', {
                v0: p.applied_count ?? 0
              })} tone="info" size="sm" />
              <Pill label={tl('{{v0}} shortlisted', {
                v0: p.shortlisted_count ?? 0
              })} tone="accent" size="sm" />
              <Pill label={tl('{{v0}} selected', {
                v0: p.selected_count ?? 0
              })} tone="success" size="sm" />
            </Row>
          </>
        );
        return sel ? (
          <FeatureCard key={p.id} onPress={() => setSelectedInternshipId(p.id)} style={{ padding: space.lg }}>{body}</FeatureCard>
        ) : (
          <Card key={p.id} padding={space.lg} onPress={() => setSelectedInternshipId(p.id)}>{body}</Card>
        );
      })}
    </Stack>
  );

  const detail = job ? (
    <Card padding={isDesktop ? space.xxl : space.lg}>
      <Row justify="space-between" align="flex-start" wrap gap={space.sm}>
        <Stack gap={4} style={{ flex: 1, minWidth: 240 }}>
          <Txt variant="overline" tone="subtle">Role #{job.id}</Txt>
          <Txt variant="h1" tone="ink">{job.title}</Txt>
          <Row wrap gap={6} style={{ marginTop: 4 }}>
            {job.department ? <Pill label={job.department} icon="Building" size="sm" /> : null}
            {job.work_mode || job.location ? <Pill label={job.work_mode || job.location} icon="MapPin" size="sm" /> : null}
            {job.stipend ? <Pill label={job.stipend} icon="Wallet" tone="warning" size="sm" /> : null}
            {job.openings ? <Pill label={tl('{{openings}} openings', {
              openings: job.openings
            })} icon="Users" size="sm" /> : null}
            <Pill label={tl('Min match {{v0}}%', {
              v0: job.application_threshold ?? 80
            })} icon="Target" tone="accent" size="sm" />
          </Row>
        </Stack>
        <Row gap={6}>
          <Button label="Edit" icon="Pencil" size="sm" variant="secondary" onPress={() => handleOpenEditModal(job)} />
          {isActive(job.status) ? (
            <Button label="Pause" size="sm" variant="secondary" onPress={() => handleToggleStatus(job, 'Paused')} />
          ) : (
            <Button label="Activate" size="sm" onPress={() => handleToggleStatus(job, 'Active')} />
          )}
          <IconButton icon="Trash" onPress={() => handleDeleteOrArchive(job.id)} accessibilityLabel="Archive internship" />
        </Row>
      </Row>
      {Array.isArray(job.required_skills) && job.required_skills.length ? (
        <Row wrap gap={6} style={{ marginTop: space.md }}>
          {job.required_skills.map((s) => <Pill key={String(s)} label={String(s)} tone="info" size="sm" />)}
        </Row>
      ) : null}
      <View style={styles.metricRow}>
        {[
          ['Applied', job.applied_count ?? applicantList.length, 'info'],
          ['Shortlisted', job.shortlisted_count ?? 0, 'accent'],
          ['Interviews', job.interview_count ?? 0, 'warning'],
          ['Selected', job.selected_count ?? 0, 'success'],
        ].map(([label, v, tone]) => (
          <StatTile key={label} value={v} label={label} tone={tone} style={styles.metric} />
        ))}
      </View>

      <Row justify="space-between" style={{ marginTop: space.lg, marginBottom: space.sm }}>
        <Txt variant="h2" tone="ink">Applicants</Txt>
        {detailLoading ? <Txt variant="caption" tone="muted">Refreshing…</Txt> : null}
      </Row>
      {applicantList.length ? (
        <Stack gap={8}>
          {applicantList.map((app) => {
            const score = Math.round(app.match_score_num ?? parseFloat(app.match_score) ?? 0);
            const skills = app.top_skills || app.skills_list || [];
            return (
              <Pressable key={app.id} onPress={() => handleOpenCandidateEvaluation(app)} style={({ hovered }) => [styles.appRow, hovered ? { backgroundColor: colors.surfaceSunken } : null, webOnly({ cursor: 'pointer' })]}>
                <Avatar name={app.name} uri={app.profile_image || app.avatar || undefined} size={42} />
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{app.name}</Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>{[app.degree, app.branch, app.university, app.cgpa ? `CGPA ${app.cgpa}` : null].filter(Boolean).join(' · ')}</Txt>
                  {Array.isArray(skills) && skills.length ? (
                    <Row wrap gap={4} style={{ marginTop: 2 }}>
                      {skills.slice(0, 4).map((s) => <Pill key={String(s)} label={String(s)} size="sm" />)}
                    </Row>
                  ) : null}
                </Stack>
                {isDesktop ? (
                  <Stack gap={4} style={{ width: 120 }}>
                    <Txt variant="caption" weight={700} tone="ink" align="right">{score}% match</Txt>
                    <ProgressBar value={score} tone={score >= (job.application_threshold ?? 80) ? 'success' : 'warning'} height={6} />
                  </Stack>
                ) : null}
                <Pill label={app.stage || 'Applied'} tone="neutral" size="sm" />
                <IconButton icon="ArrowRight" variant="dark" size={32} onPress={() => handleOpenCandidateEvaluation(app)} accessibilityLabel="Evaluate candidate" />
              </Pressable>
            );
          })}
        </Stack>
      ) : (
        <EmptyState icon="Users" title="No applicants yet" message="Students who meet your match threshold can apply to this role." />
      )}
    </Card>
  ) : null;

  return (
    (<Page>
      <SectionTitle
        title="Internships"
        emoji="💼"
        subtitle={tl(
          '{{active}} active · {{totalApps}} applications · {{totalSelected}} selected',
          {
            active: counts.active,
            totalApps: counts.totalApps,
            totalSelected: counts.totalSelected
          }
        )}
        right={
          <Row gap={8}>
            <SearchField value={searchQuery} onChangeText={setSearchQuery} placeholder="Title, team or skill" style={{ width: isDesktop ? 240 : '100%' }} />
            <Button label="Post internship" icon="Plus" onPress={handleOpenCreateModal} />
          </Row>
        }
      />
      <SegmentedTabs options={tabs} value={statusFilter} onChange={setStatusFilter} scrollable={!isDesktop} />
      {loading ? (
        <Row gap={space.md} align="flex-start">
          <Stack gap={space.sm} style={{ flex: 1 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={110} radius={radii.xl} />)}</Stack>
          {isDesktop ? <Skeleton height={420} radius={radii.xl} style={{ flex: 1.6 }} /> : null}
        </Row>
      ) : error ? (
        <Card><EmptyState icon="CircleAlert" tone="danger" title="Couldn't load internships" message={error} action={<Button label="Retry" onPress={() => loadInternships()} />} /></Card>
      ) : !internships.length ? (
        <Card>
          <EmptyState icon="Briefcase" title="Post your first internship" message="Set the skills and minimum match score — SkillSetu only lets qualified students apply." action={<Button label="Post internship" icon="Plus" onPress={handleOpenCreateModal} />} />
        </Card>
      ) : (
        <View style={[styles.split, isDesktop ? styles.splitRow : null]}>
          <View style={isDesktop ? { width: 360 } : null}>{filteredInternships.length ? list : <Card><EmptyState icon="Funnel" title="No postings in this view" /></Card>}</View>
          <View style={isDesktop ? { flex: 1, minWidth: 0 } : null}>{detail}</View>
        </View>
      )}
      <InternshipFormModal
        visible={formModalVisible}
        mode={formModalMode}
        internship={editingJob}
        token={token}
        onClose={() => setFormModalVisible(false)}
        onSuccess={handleFormSuccess}
      />
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
    </Page>)
  );
}

const styles = StyleSheet.create({
  split: {
    gap: space.lg,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.lg,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 110,
    minHeight: 84,
    paddingVertical: space.md,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
});
