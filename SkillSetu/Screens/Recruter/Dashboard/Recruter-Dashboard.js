import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { recruiterService } from '../services/recruiterService';
import {
    Avatar,
    Button,
    Card,
    ChipGroup,
    EmptyState,
    EventCard,
    FeatureCard,
    Icon,
    Inset,
    Page,
    Pill,
    ProgressBar,
    Ring,
    Row,
    SectionTitle,
    Stack,
    StatTile,
    Timeline,
    Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';

import { tl } from '../../../i18n/tl';

export default function RecruterDashboard({
    user,
    profileData,
    completion,
    activeTab,
    onNavigateTab,
    onOpenPostModal,
}) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768;

    const token = user?.token || user?.access_token || '';
    const [applications, setApplications] = useState([]);
    const [internships, setInternships] = useState([]);
    const [dashboardMetrics, setDashboardMetrics] = useState({
        active_roles: 0,
        total_applications: 0,
        shortlisted_students: 0,
        interviews: 0,
        selected_students: 0,
        avg_match_score: null,
    });
    const [selectionFunnel, setSelectionFunnel] = useState({
        total_applications: 0,
        shortlisted: 0,
        interviews: 0,
        selected: 0,
        shortlisted_percentage: 0,
        interviews_percentage: 0,
        selected_percentage: 0,
        efficiency_rate: '0%',
        avg_turnaround_days: null,
    });
    const [upcomingInterviews, setUpcomingInterviews] = useState([]);
    const [recommendedStudents, setRecommendedStudents] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [applicationActivity, setApplicationActivity] = useState({
        peak_label: 'Activity Synced',
        total: 0,
    });
    const [loadingData, setLoadingData] = useState(false);
    const [interviewFilter, setInterviewFilter] = useState('Today');

    const isComplete = completion?.is_complete || false;
    const completionPct = completion?.percentage || 0;
    const companyName = profileData?.company?.name || user?.companyName || user?.company_name || 'Organization';
    const rawName = user?.name || profileData?.recruiter?.name || 'Recruiter';
    const userName = typeof rawName === 'string' && rawName.trim() ? rawName.trim().split(' ')[0] : 'Recruiter';

    const fetchDashboardData = async () => {
        if (!token) return;
        setLoadingData(true);
        try {
            // 1. Authoritative Recruiter Dashboard Data
            const dashRes = await recruiterService.getDashboard(token);
            if (dashRes && dashRes.data) {
                const d = dashRes.data;
                if (d.stats) {
                    setDashboardMetrics({
                        active_roles: d.stats.active_jobs ?? 0,
                        total_applications: d.stats.total_applicants ?? 0,
                        shortlisted_students: d.stats.shortlisted_students ?? 0,
                        interviews: d.stats.interviews_scheduled ?? 0,
                        selected_students: d.stats.selected_students ?? 0,
                        avg_match_score: d.stats.avg_match_score ?? null,
                    });
                }
                if (Array.isArray(d.active_internships)) {
                    setInternships(d.active_internships);
                }
                if (Array.isArray(d.recent_applications)) {
                    setApplications(d.recent_applications);
                }
                if (Array.isArray(d.upcoming_interviews)) {
                    setUpcomingInterviews(d.upcoming_interviews);
                }
                if (Array.isArray(d.recommended_students)) {
                    setRecommendedStudents(d.recommended_students);
                }
                if (Array.isArray(d.recent_activity)) {
                    setRecentActivity(d.recent_activity);
                }
                if (d.selection_funnel) {
                    setSelectionFunnel(d.selection_funnel);
                }
                if (d.application_activity) {
                    setApplicationActivity(d.application_activity);
                }
            }

            // 2. Fallback/Enrichment: fetch full internships list if needed
            try {
                const intRes = await recruiterService.getInternships(token);
                if (intRes && Array.isArray(intRes.internships) && intRes.internships.length > 0) {
                    setInternships(intRes.internships);
                }
            } catch (e) {
                // Ignore if dashboard already populated
            }

            // 3. Fallback/Enrichment: fetch applications if dashboard didn't include enough
            try {
                const appRes = await recruiterService.getApplications(token, { page_size: 10 });
                if (appRes && Array.isArray(appRes.applications) && appRes.applications.length > 0) {
                    setApplications((prev) => (prev.length > 0 ? prev : appRes.applications));
                }
            } catch (e) {
                // Ignore if dashboard already populated
            }
        } catch (err) {
            console.warn('Dashboard live data fetch error:', err);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [token]);

    // Funnel calculations derived safely from live metrics
    const fTotal = selectionFunnel.total_applications ?? dashboardMetrics.total_applications ?? 0;
    const fShort = selectionFunnel.shortlisted ?? dashboardMetrics.shortlisted_students ?? 0;
    const fIntv = selectionFunnel.interviews ?? dashboardMetrics.interviews ?? 0;
    const fSel = selectionFunnel.selected ?? dashboardMetrics.selected_students ?? 0;

    const fShortPct = fTotal > 0 ? Math.min(100, Math.round((fShort / fTotal) * 100)) : 0;
    const fIntvPct = fTotal > 0 ? Math.min(100, Math.round((fIntv / fTotal) * 100)) : 0;
    const fSelPct = fTotal > 0 ? Math.min(100, Math.round((fSel / fTotal) * 100)) : 0;

    // Filter upcoming interviews
    const filteredInterviews = upcomingInterviews.filter((item) => {
        if (interviewFilter === 'Today') {
            return !item.filter_day || item.filter_day === 'Today' || (item.day && item.day.includes('TODAY'));
        }
        if (interviewFilter === 'Tomorrow') {
            return item.filter_day === 'Tomorrow' || (item.day && item.day.includes('TOMORROW'));
        }
        return true; // 'This Week'
    });


    const go = (tab) => onNavigateTab && onNavigateTab(tab);
    const statusTone = (s = '') => {
        const v = String(s).toLowerCase();
        if (v.includes('select')) return 'success';
        if (v.includes('shortlist')) return 'info';
        if (v.includes('assess') || v.includes('interview')) return 'accent';
        if (v.includes('not selected') || v.includes('reject')) return 'danger';
        return 'neutral';
    };
    const funnel = [
        { label: 'Applied', value: fTotal, pct: fTotal ? 100 : 0, tone: 'info' },
        { label: 'Shortlisted', value: fShort, pct: fShortPct, tone: 'accent' },
        { label: 'Interviews', value: fIntv, pct: fIntvPct, tone: 'warning' },
        { label: 'Selected', value: fSel, pct: fSelPct, tone: 'success' },
    ];

    const aside = (
        <>
            <SectionTitle title="Today" emoji="📅" />
            <ChipGroup options={['Today', 'Tomorrow', 'This Week']} value={interviewFilter} multiple={false} tone="accent" onChange={setInterviewFilter} />
            {filteredInterviews.slice(0, 5).map((iv) => (
                <EventCard
                    key={iv.id}
                    tone={iv.action_type === 'ASSESSMENT' ? 'accent' : 'info'}
                    icon={iv.action_type === 'ASSESSMENT' ? 'Code' : 'Video'}
                    type={iv.round_name || 'Interview'}
                    date={iv.time ? `${iv.time} ${String(iv.day || '').split('•')[0].trim()}` : ''}
                    title={iv.candidate_name || iv.student}
                    body={`${iv.role_title || iv.role}${iv.college ? ` · ${iv.college}` : ''}`}
                    footer={
                        <Pressable onPress={() => go('Assessments')} style={[styles.footerBtn, webOnly({ cursor: 'pointer' })]}>
                            <Icon name="ArrowRight" size={14} color={colors.ink} />
                            <Txt variant="small" weight={600} tone="ink">{iv.status === 'In Progress' ? 'Monitor session' : 'Open'}</Txt>
                        </Pressable>
                    }
                />
            ))}
            {!filteredInterviews.length ? (
                <View style={styles.emptyEvents}>
                    <EmptyState icon="Calendar" title="Nothing scheduled" message="Assessment sessions and interviews show up here." />
                </View>
            ) : null}
            {recentActivity.length ? (
                <Card padding={space.lg}>
                    <Txt variant="h3" tone="ink">Activity</Txt>
                    <Stack gap={10} style={{ marginTop: space.sm }}>
                        {recentActivity.slice(0, 6).map((a) => (
                            <Row key={a.id} gap={10} align="flex-start">
                                <View style={styles.actDot} />
                                <Stack gap={0} style={{ flex: 1 }}>
                                    <Txt variant="small" tone="ink">{a.description}</Txt>
                                    <Txt variant="caption" tone="subtle">{a.time}</Txt>
                                </Stack>
                            </Row>
                        ))}
                    </Stack>
                </Card>
            ) : null}
        </>
    );

    return (
        (<Page aside={aside}>
            <SectionTitle
                title={tl('Welcome back, {{userName}}', {
                    userName: userName
                })}
                emoji="👋"
                subtitle={tl('{{companyName}} hiring workspace', {
                    companyName: companyName
                })}
                right={
                    isComplete ? (
                        <Button label="Post internship" icon="Plus" onPress={onOpenPostModal} />
                    ) : (
                        <Button label="Complete profile" icon="Building" onPress={() => go('My Profile')} />
                    )
                }
            />
            {!isComplete ? (
                <FeatureCard tone="warning">
                    <Row justify="space-between" align="flex-start" gap={space.md} wrap>
                        <Stack gap={6} style={{ flex: 1, minWidth: 240 }}>
                            <Txt variant="overline" color={colors.butterInk}>Finish setting up</Txt>
                            <Txt variant="h2" tone="ink">Your company profile is {completionPct}% complete</Txt>
                            <Txt variant="small" color={colors.butterInk}>Reach 80% with all required sections to publish internships and review candidates.</Txt>
                        </Stack>
                        <Ring value={completionPct} size={76} stroke={8} tone="dark" track="rgba(255,255,255,0.6)">
                            <Txt variant="title" tone="ink">{completionPct}%</Txt>
                        </Ring>
                    </Row>
                    <Button label="Complete company profile" iconRight="ArrowRight" onPress={() => go('My Profile')} style={{ marginTop: space.md }} />
                </FeatureCard>
            ) : null}
            <View style={styles.statsRow}>
                <StatTile value={loadingData ? '…' : dashboardMetrics.active_roles} label="Active roles" tone="info" style={styles.stat} onPress={() => go('Internships')} />
                <StatTile value={loadingData ? '…' : dashboardMetrics.total_applications} label="Applicants" tone="accent" style={styles.stat} onPress={() => go('Applications')} />
                <StatTile value={loadingData ? '…' : dashboardMetrics.shortlisted_students} label="Shortlisted" tone="warning" style={styles.stat} onPress={() => go('Applications')} />
                <StatTile value={loadingData ? '…' : dashboardMetrics.selected_students} label="Selected" tone="success" style={styles.stat} />
                {dashboardMetrics.avg_match_score && dashboardMetrics.avg_match_score !== '—' ? (
                    <StatTile value={loadingData ? '…' : dashboardMetrics.avg_match_score} label="Avg match" tone="accent" style={styles.stat} />
                ) : null}
            </View>
            <Card>
                <Row justify="space-between">
                    <Txt variant="h2" tone="ink">Selection funnel</Txt>
                    <Pill label={tl('{{v0}}% conversion', {
                        v0: fTotal ? Math.round((fSel / fTotal) * 100) : 0
                    })} tone="success" size="sm" />
                </Row>
                <Stack gap={12} style={{ marginTop: space.md }}>
                    {funnel.map((f) => (
                        <Row key={f.label} gap={12}>
                            <Txt variant="small" weight={600} tone="ink" style={{ width: 90 }}>{f.label}</Txt>
                            <ProgressBar value={f.pct} tone={f.tone} height={12} style={{ flex: 1 }} />
                            <Txt variant="small" weight={700} tone="ink" style={{ width: 70, textAlign: 'right' }}>{f.value} · {f.pct}%</Txt>
                        </Row>
                    ))}
                </Stack>
            </Card>
            <View style={[styles.grid, isDesktop ? styles.gridRow : null]}>
                <View style={isDesktop ? { flex: 1.1, minWidth: 0 } : null}>
                    <SectionTitle title="Active internships" size="h2" right={<Button label="Manage" size="sm" variant="secondary" onPress={() => go('Internships')} />} />
                    <View style={{ height: space.md }} />
                    {internships.length ? (
                        <Timeline
                            gap={space.md}
                            items={internships.slice(0, 5).map((p) => ({
                                key: p.id,
                                done: (p.selected_count || 0) > 0,
                                content: (
                                    <Card padding={space.lg} badge={{ icon: 'Briefcase', tone: 'info' }} onPress={() => go('Internships')}>
                                        <Txt variant="h3" tone="ink" numberOfLines={1}>{p.title}</Txt>
                                        <Txt variant="small" tone="muted" numberOfLines={1}>{[p.department, p.work_mode || p.location, p.stipend].filter(Boolean).join(' · ')}</Txt>
                                        <Row wrap gap={6} style={{ marginTop: space.sm }}>
                                            <Pill label={tl('{{v0}} applied', {
                                                v0: p.applied_count ?? p.applicants_count ?? 0
                                            })} tone="info" size="sm" />
                                            <Pill label={tl('{{v0}} shortlisted', {
                                                v0: p.shortlisted_count ?? 0
                                            })} tone="accent" size="sm" />
                                            <Pill label={tl('{{v0}} selected', {
                                                v0: p.selected_count ?? 0
                                            })} tone="success" size="sm" />
                                            {p.application_threshold ? <Pill label={tl('Min match {{application_threshold}}%', {
                                                application_threshold: p.application_threshold
                                            })} icon="Target" size="sm" /> : null}
                                        </Row>
                                    </Card>
                                ),
                            }))}
                        />
                    ) : (
                        <Card>
                            <EmptyState icon="Briefcase" title="No active internships" message="Publish your first role to start receiving verified applicants." action={isComplete ? <Button label="Post internship" icon="Plus" size="sm" onPress={onOpenPostModal} /> : null} />
                        </Card>
                    )}
                </View>
                <View style={isDesktop ? { flex: 1, minWidth: 0, gap: space.md } : { gap: space.md }}>
                    <Card>
                        <Row justify="space-between">
                            <Txt variant="h3" tone="ink">Recent applications</Txt>
                            <Button label="All" size="sm" variant="ghost" iconRight="ArrowRight" onPress={() => go('Applications')} />
                        </Row>
                        <Stack gap={4} style={{ marginTop: space.sm }}>
                            {applications.length ? (
                                applications.slice(0, 6).map((a) => (
                                    <Pressable key={a.id} onPress={() => go('Applications')} style={({ hovered }) => [styles.appRow, hovered ? { backgroundColor: colors.surfaceMuted } : null, webOnly({ cursor: 'pointer' })]}>
                                        <Avatar name={a.student_name || a.student || a.name} size={36} />
                                        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                            <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{a.student_name || a.student || a.name}</Txt>
                                            <Txt variant="caption" tone="muted" numberOfLines={1}>{a.internship_title || a.internship} · {a.appliedTime}</Txt>
                                        </Stack>
                                        {a.match_score != null ? <Pill label={`${a.match_score}%`} tone="success" size="sm" /> : null}
                                        <Pill label={a.status} tone={statusTone(a.status)} size="sm" />
                                    </Pressable>
                                ))
                            ) : (
                                <Txt variant="small" tone="subtle">No applications yet.</Txt>
                            )}
                        </Stack>
                    </Card>
                    {recommendedStudents.length ? (
                        <Card tone="info">
                            <Txt variant="h3" tone="ink">Students to discover</Txt>
                            <Txt variant="caption" color={colors.skyInk}>Highest resume scores on SkillSetu</Txt>
                            <Stack gap={8} style={{ marginTop: space.sm }}>
                                {recommendedStudents.slice(0, 4).map((s) => {
                                    const skills = s.skills || [];
                                    return (
                                        <Inset key={s.id} tone="info" padding={space.sm}>
                                            <Row gap={10}>
                                                <Avatar name={s.name} size={34} />
                                                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                                    <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{s.name}</Txt>
                                                    <Txt variant="caption" tone="muted" numberOfLines={1}>{s.headline}</Txt>
                                                </Stack>
                                            </Row>
                                            {skills.length ? (
                                                <Row wrap gap={4} style={{ marginTop: 6 }}>
                                                    {skills.map((k) => <Pill key={k} label={k.replace(' ✓', '')} size="sm" />)}
                                                </Row>
                                            ) : null}
                                        </Inset>
                                    );
                                })}
                            </Stack>
                        </Card>
                    ) : null}
                </View>
            </View>
        </Page>)
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
        flexBasis: 150,
    },
    grid: {
        gap: space.xl,
    },
    gridRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    appRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: radii.md,
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
    actDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.connector,
        marginTop: 6,
    },
});
