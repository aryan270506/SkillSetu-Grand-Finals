import React, { useState, useEffect, useMemo } from 'react';
import { Linking, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  fetchStudentApplications,
  checkApplicationAssessment,
  startApplicationAssessment,
} from '../services/applicationService';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  EventCard,
  Icon,
  IconButton,
  Inset,
  Page,
  Pill,
  Row,
  SectionTitle,
  SegmentedTabs,
  Sheet,
  Skeleton,
  Stack,
  StatTile,
  Timeline,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';

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
      title: item.internship?.title || item.title || item.role || 'Internship application',
      organization: item.internship?.company || item.company || 'Employer',
      appliedDate: item.applied_at ? new Date(item.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : item.dateApplied || 'Recently',
      portalUrl: item.internship?.application_url || item.internship?.source_url || item.apply_url,
    }));

    const schList = (appData.scholarships || []).map((item) => ({
      ...item,
      type: 'scholarship',
      title: item.scholarship?.name || item.name || item.role || 'Scholarship',
      organization: item.scholarship?.provider || item.provider || item.company || 'Provider',
      appliedDate: item.applied_at ? new Date(item.applied_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : item.dateApplied || 'Recently',
      portalUrl: item.scholarship?.application_url || item.scholarship?.source_url || item.apply_url,
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

  const openUrl = (url) => {
    if (!url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
    else Linking.openURL(url).catch(() => {});
  };
  const statusOf = (a) => (a.application_status || a.statusClass || a.status || 'APPLIED').toUpperCase();
  const toneFor = (s) => {
    if (['SELECTED', 'ACCEPTED', 'OFFERED'].includes(s)) return 'success';
    if (s === 'SHORTLISTED' || s.startsWith('ROUND')) return 'accent';
    if (s === 'UNDER_REVIEW' || s === 'APPLIED') return 'warning';
    if (s === 'REJECTED' || s === 'NOT_SELECTED') return 'danger';
    return 'neutral';
  };
  const labelFor = (s) => s.toLowerCase().replace(/_/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const roundTone = (st) => (st === 'COMPLETED' ? 'success' : st === 'IN_PROGRESS' ? 'info' : st === 'AVAILABLE' ? 'accent' : st === 'EXPIRED' ? 'danger' : 'warning');
  const roundLabel = (r) =>
    r.status === 'COMPLETED' ? 'Completed'
      : r.status === 'IN_PROGRESS' ? `In progress · ${Math.ceil((r.remaining_seconds || 0) / 60)}m left`
      : r.status === 'AVAILABLE' ? 'Available now'
      : r.status === 'EXPIRED' ? 'Closed'
      : r.starts_in_seconds != null ? `Starts in ${Math.ceil(r.starts_in_seconds / 60)}m` : 'Scheduled';

  const stats = appData.stats || {};
  const tabs = ['All Applications', 'Internships', 'Scholarships', 'Under Review', 'Shortlisted / Accepted'].map((t) => ({ id: t, label: t === 'All Applications' ? 'All' : t }));
  const roundsUpcoming = (appData.internships || []).filter((a) => a.current_round_name || a.has_pipeline);

  const aside = (
    <>
      <SectionTitle title="Next steps" emoji="🧭" />
      {roundsUpcoming.slice(0, 4).map((a) => (
        <EventCard
          key={`r-${a.id}`}
          tone="accent"
          icon="Target"
          type={a.current_round_name || 'Assessment rounds'}
          date={a.pipeline_status && a.pipeline_status !== 'NO_PIPELINE' ? labelFor(a.pipeline_status) : ''}
          title={`${a.role || a.title || 'Internship'} · ${a.company || ''}`}
          body={a.nextAction}
          footer={
            <Pressable onPress={() => onNavigate && onNavigate('Rounds', { applicationId: a.application_id })} style={[styles.footerBtn, webOnly({ cursor: 'pointer' })]}>
              <Icon name="ArrowRight" size={14} color={colors.ink} />
              <Txt variant="small" weight={600} tone="ink">Open rounds</Txt>
            </Pressable>
          }
        />
      ))}
      {[...(appData.internships || []), ...(appData.scholarships || [])]
        .filter((a) => !a.current_round_name && a.nextAction)
        .slice(0, 4)
        .map((a) => (
          <EventCard key={`n-${a.type}-${a.id}`} tone={a.type === 'scholarship' ? 'warning' : 'info'} icon={a.type === 'scholarship' ? 'GraduationCap' : 'Briefcase'} type={a.type === 'scholarship' ? 'Scholarship' : 'Internship'} date={a.dateApplied ? a.dateApplied.replace(/, \d{4}$/, '') : ''} title={a.role || a.name || a.title} body={a.nextAction} />
        ))}
      {!stats.total && !loading ? (
        <View style={styles.emptyEvents}>
          <EmptyState icon="Send" title="Nothing to track yet" message="Apply to internships or scholarships to see next steps here." action={<Button label="Find internships" size="sm" onPress={() => onNavigate && onNavigate('Opportunities')} />} />
        </View>
      ) : null}
    </>
  );

  const sel = selectedApp;
  const selStatus = sel ? statusOf(sel) : '';
  const timeline = sel?.timeline || [];

  return (
    <Page aside={aside}>
      <SectionTitle
        title="Applications"
        emoji="📝"
        subtitle="Every internship and scholarship you've applied to, in one place."
        right={<IconButton icon="RefreshCw" size={46} onPress={() => loadApplications(true)} disabled={refreshing} accessibilityLabel="Refresh" />}
      />

      <View style={styles.statsRow}>
        <StatTile value={stats.total || 0} label="Total" tone="info" style={styles.stat} />
        <StatTile value={stats.under_review || 0} label="Under review" tone="warning" style={styles.stat} />
        <StatTile value={stats.shortlisted || 0} label="Shortlisted" tone="accent" style={styles.stat} />
        <StatTile value={stats.accepted || 0} label="Accepted" tone="success" style={styles.stat} />
      </View>

      <SegmentedTabs options={tabs} value={activeTab} onChange={setActiveTab} scrollable={!isDesktop} />

      {loading ? (
        <Stack gap={space.md}>{[0, 1, 2].map((i) => <Skeleton key={i} height={150} radius={radii.xl} />)}</Stack>
      ) : error ? (
        <Card><EmptyState icon="CircleAlert" tone="danger" title="Couldn't load applications" message={error} action={<Button label="Retry" icon="RefreshCw" onPress={() => loadApplications(true)} />} /></Card>
      ) : filteredList.length ? (
        <Timeline
          gap={space.md}
          items={filteredList.map((item) => {
            const s = statusOf(item);
            const tone = toneFor(s);
            const isInternship = item.type === 'internship';
            return {
              key: `${item.type}-${item.id}`,
              done: tone === 'success',
              content: (
                <Card onPress={() => handleCardClick(item)} badge={{ icon: isInternship ? 'Briefcase' : 'GraduationCap', tone: isInternship ? 'info' : 'warning' }}>
                  <Row gap={space.sm} align="flex-start">
                    <Avatar name={item.organization} size={44} />
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Txt variant="h3" tone="ink" numberOfLines={2}>{item.title}</Txt>
                      <Txt variant="small" tone="muted" numberOfLines={1}>{item.organization} · {isInternship ? 'Internship' : 'Scholarship'} · Applied {item.appliedDate}</Txt>
                    </Stack>
                  </Row>
                  {tone === 'success' ? (
                    <Inset tone="success" padding={space.sm} style={{ marginTop: space.md }}>
                      <Txt variant="small" weight={600} color={colors.mintInk}>🎉 Congratulations — you've been selected.</Txt>
                    </Inset>
                  ) : tone === 'danger' ? (
                    <Inset tone="danger" padding={space.sm} style={{ marginTop: space.md }}>
                      <Txt variant="small" color="#B4232A">{item.rejection_reason || 'This application was not taken to the next stage.'}</Txt>
                    </Inset>
                  ) : item.nextAction || item.current_round_name ? (
                    <Inset tone="neutral" padding={space.sm} style={{ marginTop: space.md }}>
                      <Txt variant="small" tone="default">
                        {item.current_round_name ? <Txt variant="small" weight={700} tone="ink">{item.current_round_name} · </Txt> : null}
                        {item.nextAction}
                      </Txt>
                    </Inset>
                  ) : null}
                  <Row justify="space-between" style={{ marginTop: space.md }} wrap gap={8}>
                    <Pill label={labelFor(s)} tone={tone} />
                    <Row gap={8}>
                      {item.portalUrl ? <IconButton icon="ExternalLink" onPress={() => openUrl(item.portalUrl)} accessibilityLabel="Open portal" /> : null}
                      {isInternship && onNavigate ? <Button label="Rounds" size="sm" variant="secondary" icon="Target" onPress={() => onNavigate('Rounds', { applicationId: item.application_id })} /> : null}
                      <IconButton icon="ArrowRight" variant="dark" onPress={() => handleCardClick(item)} accessibilityLabel="View application" />
                    </Row>
                  </Row>
                </Card>
              ),
            };
          })}
        />
      ) : (
        <Card>
          <EmptyState icon="Inbox" title="No applications here" message="Explore internships and scholarships to start applying." action={<Button label="Find internships" onPress={() => onNavigate && onNavigate('Opportunities')} />} />
        </Card>
      )}

      <Sheet
        visible={showDrawer && !!sel}
        onClose={() => setShowDrawer(false)}
        title={sel?.title}
        subtitle={sel ? `${sel.organization} · Applied ${sel.appliedDate}` : ''}
        icon={sel?.type === 'scholarship' ? 'GraduationCap' : 'Briefcase'}
        tone={sel?.type === 'scholarship' ? 'warning' : 'info'}
        width={680}
        footer={sel?.portalUrl ? <Button label="Open official portal" iconRight="ExternalLink" variant="secondary" onPress={() => openUrl(sel.portalUrl)} /> : null}
      >
        {sel ? (
          <>
            <Row wrap gap={6}>
              <Pill label={labelFor(selStatus)} tone={toneFor(selStatus)} />
              {sel.matchRate != null ? <Pill label={`${sel.matchRate}% match`} tone="success" icon="Target" /> : null}
              {sel.atsScore != null ? <Pill label={`ATS ${sel.atsScore}`} tone="info" icon="FileText" /> : null}
              {sel.resumeUsed ? <Pill label={sel.resumeUsed} icon="FileText" /> : null}
            </Row>

            {timeline.length ? (
              <Card padding={space.lg}>
                <Txt variant="h3" tone="ink" style={{ marginBottom: space.sm }}>Status timeline</Txt>
                <Timeline
                  gap={space.xs}
                  items={timeline.map((t, i) => ({
                    key: `${t.title}-${i}`,
                    done: !!t.done,
                    content: (
                      <View style={styles.tlRow}>
                        <Txt variant="small" weight={700} tone={t.done ? 'ink' : 'muted'}>{t.title}</Txt>
                        <Txt variant="caption" tone="muted">{t.date}</Txt>
                      </View>
                    ),
                  }))}
                />
              </Card>
            ) : null}

            {assessmentChecking ? (
              <Skeleton height={90} radius={radii.lg} />
            ) : assessmentInfo?.has_assessment ? (
              <Card padding={space.lg} tone="accent">
                <Row justify="space-between">
                  <Row gap={8}>
                    <Icon name="Bot" size={18} color={colors.lilacInk} />
                    <Txt variant="h3" tone="ink">AI assessment</Txt>
                  </Row>
                  <Pill
                    label={assessmentInfo.overall_status === 'COMPLETED' ? 'Completed' : assessmentInfo.overall_status === 'EXPIRED' ? 'Expired' : assessmentInfo.can_start ? 'Available now' : 'Scheduled'}
                    tone={assessmentInfo.overall_status === 'EXPIRED' ? 'danger' : assessmentInfo.overall_status === 'COMPLETED' || assessmentInfo.can_start ? 'success' : 'warning'}
                    size="sm"
                  />
                </Row>
                <Txt variant="small" color={colors.lilacInk} style={{ marginTop: 4 }}>Multi-round, AI-proctored evaluation. Each round has its own schedule and time limit.</Txt>
                {assessmentInfo.progression ? (
                  <Inset tone="accent" style={{ marginTop: space.sm }}>
                    <Txt variant="small" weight={700} tone="ink">Current: {assessmentInfo.progression.current_round_name || 'Round'} · {assessmentInfo.progression.status || 'In assessment'}</Txt>
                    {assessmentInfo.progression.next_round_name ? (
                      <Txt variant="caption" tone="muted">
                        Next: {assessmentInfo.progression.next_round_name}
                        {assessmentInfo.progression.next_round_schedule ? ` · ${assessmentInfo.progression.next_round_schedule.scheduled_date || 'Date TBD'} ${assessmentInfo.progression.next_round_schedule.scheduled_time || ''}` : ''}
                      </Txt>
                    ) : null}
                  </Inset>
                ) : null}
                {(assessmentInfo.round_schedules || []).length ? (
                  <Stack gap={8} style={{ marginTop: space.sm }}>
                    {assessmentInfo.round_schedules.map((r) => (
                      <Inset key={r.round_id} tone="neutral" padding={space.sm}>
                        <Row justify="space-between">
                          <Txt variant="small" weight={700} tone="ink">{r.round_name}</Txt>
                          <Pill label={roundLabel(r)} tone={roundTone(r.status)} size="sm" />
                        </Row>
                        <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                          {r.scheduled_date || r.start_date || 'Date TBD'}
                          {r.display_time ? ` · ${r.display_time}` : r.start_time ? ` · ${r.start_time}–${r.end_time || ''}` : ''}
                          {r.timezone ? ` (${r.timezone})` : ''}{r.duration_min ? ` · ${r.duration_min} min` : ''}
                        </Txt>
                      </Inset>
                    ))}
                  </Stack>
                ) : null}
                {assessmentInfo.overall_status === 'COMPLETED' ? (
                  <Inset tone="success" style={{ marginTop: space.sm }}>
                    <Txt variant="small" weight={700} color={colors.mintInk}>Verified score: {assessmentInfo.session?.overall_score ?? '—'}%</Txt>
                  </Inset>
                ) : assessmentInfo.overall_status !== 'EXPIRED' ? (
                  <Button
                    label={assessmentInfo.session?.status === 'IN_PROGRESS' ? 'Resume assessment' : assessmentInfo.can_start ? 'Start assessment' : 'Scheduled'}
                    icon="Play"
                    onPress={handleLaunchAssessment}
                    loading={assessmentLaunching}
                    disabled={!assessmentInfo.can_start}
                    style={{ marginTop: space.md }}
                  />
                ) : null}
                {assessmentError ? <Txt variant="small" tone="danger" style={{ marginTop: 6 }}>{assessmentError}</Txt> : null}
              </Card>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 140,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyEvents: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
  },
  tlRow: {
    paddingVertical: 4,
    paddingTop: 18,
  },
});
