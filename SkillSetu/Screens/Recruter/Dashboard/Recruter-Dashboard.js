import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { recruiterService } from '../services/recruiterService';

function HoverCard({ children, style, hoverScale = 1.03, onPress }) {
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
    grayBg: '#F1F5F9',
};

const INITIAL_APPLICATIONS = [
    {
        id: 'APP-1',
        student: 'Rahul Sharma',
        college: 'IIT Roorkee',
        internship: 'Backend Dev',
        skillMatch: '84%',
        appliedTime: 'Today, 10:15 AM',
        status: 'Shortlisted',
        statusBg: '#E0F2FE',
        statusText: '#0284C7',
    },
    {
        id: 'APP-2',
        student: 'Priya Patil',
        college: 'VJTI Mumbai',
        internship: 'Frontend Dev',
        skillMatch: '81%',
        appliedTime: 'Today, 09:30 AM',
        status: 'Under Review',
        statusBg: '#F1F5F9',
        statusText: '#475569',
    },
    {
        id: 'APP-3',
        student: 'Aditya Singh',
        college: 'BITS Pilani',
        internship: 'AI / ML Intern',
        skillMatch: '87%',
        appliedTime: 'Yesterday',
        status: 'New',
        statusBg: '#DCFCE7',
        statusText: '#15803D',
    },
    {
        id: 'APP-4',
        student: 'Sneha Kulkarni',
        college: 'COEP Pune',
        internship: 'Backend Dev',
        skillMatch: '80%',
        appliedTime: 'Yesterday',
        status: 'Interview',
        statusBg: '#FEF3C7',
        statusText: '#D97706',
    },
];

const RECOMMENDED_STUDENTS = [
    {
        id: 'REC-1',
        name: 'Rahul Sharma',
        degree: 'CS (CGPA 8.9)',
        match: '96% Match',
        skills: ['Python ✓', 'Machine Learning ✓', 'SQL ✓', 'Docker ✓'],
    },
    {
        id: 'REC-2',
        name: 'Priya Patil',
        degree: 'IT (CGPA 9.1)',
        match: '93% Match',
        skills: ['React ✓', 'JavaScript ✓', 'Node.js ✓', 'MongoDB ✓'],
    },
    {
        id: 'REC-3',
        name: 'Arshad Khan',
        degree: 'Data Sci (CGPA 8.7)',
        match: '91% Match',
        skills: ['Python ✓', 'PyTorch ✓', 'REST APIs ✓', 'FastAPI ✓'],
    },
];

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
        avg_match_score: '88%',
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
        avg_turnaround_days: '2.4',
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
                        avg_match_score: d.stats.avg_match_score ?? '88%',
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

    const displayRecStudents = recommendedStudents.length > 0 ? recommendedStudents : RECOMMENDED_STUDENTS;
    const displayActivity = recentActivity.length > 0 ? recentActivity : [
        {
            id: 'ACT-INIT-1',
            icon: '👤',
            description: `${userName} logged in to ${companyName} Recruiter Portal.`,
            time: 'Today',
        },
    ];

    return (
        <ScrollView style={styles.page} contentContainerStyle={styles.container}>
            {/* 1. Welcome Header Banner */}
            <View style={styles.welcomeRow}>
                <View style={styles.welcomeTextGroup}>
                    <Text style={styles.welcomeHeading}>
                        Welcome back, {userName} 👋
                    </Text>
                    <Text style={styles.welcomeSubheading}>
                        {isComplete
                            ? `Here is a live snapshot of ${companyName}'s internship activities today.`
                            : `Before you start hiring, complete your company profile to unlock all features.`}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Pressable
                        style={[styles.completeProfileBtn, { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 8 }]}
                        onPress={fetchDashboardData}
                    >
                        <Text style={[styles.completeProfileText, { color: '#0F172A' }]}>
                            {loadingData ? '⏳ Syncing...' : '🔄 Refresh Data'}
                        </Text>
                    </Pressable>

                    <View style={[styles.profileProgressCard, isComplete && { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
                        <Text style={styles.shieldIcon}>{isComplete ? '✅' : '🛡️'}</Text>
                        <Text style={styles.profileProgressText}>
                            Company Profile: <Text style={{ fontWeight: '800', color: isComplete ? '#065F46' : COLORS.textDark }}>{completionPct}% {isComplete ? 'Completed' : 'Complete'}</Text>
                        </Text>
                        <Pressable
                            style={[styles.completeProfileBtn, isComplete && { backgroundColor: '#065F46' }]}
                            onPress={() => onNavigateTab && onNavigateTab('My Profile')}
                        >
                            <Text style={styles.completeProfileText}>
                                {isComplete ? 'View Profile →' : 'Complete Profile →'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* 2. Top 4 Metric Summary Cards */}
            <View style={styles.metricsGrid}>
                {/* Card 1 */}
                <HoverCard hoverScale={1.04} style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                        <Text style={styles.metricLabel}>ACTIVE INTERNSHIPS</Text>
                        <View style={styles.metricIconCircle}>
                            <Text style={{ fontSize: 13 }}>📋</Text>
                        </View>
                    </View>
                    <Text style={styles.metricNumber}>{dashboardMetrics.active_roles}</Text>
                    <Text style={styles.metricSub}>Currently accepting applications</Text>
                    <View style={[styles.pill, { backgroundColor: COLORS.orangePillBg }]}>
                        <Text style={[styles.pillText, { color: COLORS.orangePillText }]}>
                            {dashboardMetrics.active_roles > 0 ? `● ${dashboardMetrics.active_roles} Active Roles` : 'No active postings'}
                        </Text>
                    </View>
                </HoverCard>

                {/* Card 2 */}
                <HoverCard hoverScale={1.04} style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                        <Text style={styles.metricLabel}>TOTAL APPLICATIONS</Text>
                        <View style={styles.metricIconCircle}>
                            <Text style={{ fontSize: 13 }}>👥</Text>
                        </View>
                    </View>
                    <Text style={styles.metricNumber}>{dashboardMetrics.total_applications}</Text>
                    <Text style={styles.metricSub}>Across all company postings</Text>
                    <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
                        <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
                            Verified submissions
                        </Text>
                    </View>
                </HoverCard>

                {/* Card 3 */}
                <HoverCard hoverScale={1.04} style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                        <Text style={styles.metricLabel}>SHORTLISTED STUDENTS</Text>
                        <View style={styles.metricIconCircle}>
                            <Text style={{ fontSize: 13 }}>🎓</Text>
                        </View>
                    </View>
                    <Text style={styles.metricNumber}>{dashboardMetrics.shortlisted_students}</Text>
                    <Text style={styles.metricSub}>Ready for evaluation & tests</Text>
                    <View style={[styles.pill, { backgroundColor: COLORS.bluePillBg }]}>
                        <Text style={[styles.pillText, { color: COLORS.bluePillText }]}>
                            Active shortlists
                        </Text>
                    </View>
                </HoverCard>

                {/* Card 4 */}
                <HoverCard hoverScale={1.04} style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                        <Text style={styles.metricLabel}>INTERVIEWS & ROUNDS</Text>
                        <View style={styles.metricIconCircle}>
                            <Text style={{ fontSize: 13 }}>📅</Text>
                        </View>
                    </View>
                    <Text style={styles.metricNumber}>{dashboardMetrics.interviews}</Text>
                    <Text style={styles.metricSub}>Upcoming interviews & rounds</Text>
                    <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
                        <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
                            Active evaluation
                        </Text>
                    </View>
                </HoverCard>
            </View>

            {/* 4. Internship Overview: Activity Graph & Selection Funnel */}
            <View style={[styles.splitRow, !isDesktop && styles.stackedRow]}>
                {/* Left: Application Activity Graph */}
                <View style={[styles.card, { flex: 2 }]}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Application Activity</Text>
                            <Text style={styles.cardSubtitle}>
                                Track applications and student selection across your internships.
                            </Text>
                        </View>
                        <View style={styles.peakBadge}>
                            <Text style={styles.peakBadgeText}>{applicationActivity.peak_label || `Peak: ${dashboardMetrics.total_applications} applications`}</Text>
                        </View>
                    </View>

                    {/* Graph Legend */}
                    <View style={styles.graphLegendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#004D40' }]} />
                            <Text style={styles.legendText}>Applications Received ({dashboardMetrics.total_applications})</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.legendText}>Students Shortlisted ({dashboardMetrics.shortlisted_students})</Text>
                        </View>
                    </View>

                    {/* Visual Curve Representation */}
                    <View style={styles.graphContainer}>
                        <View style={styles.graphLineReceived} />
                        <View style={styles.graphLineShortlisted} />

                        {/* Peak Dot */}
                        <View style={styles.graphPeakDot} />

                        {/* Timeline X-Axis */}
                        <View style={styles.xAxisRow}>
                            <Text style={styles.xAxisLabel}>Week 1</Text>
                            <Text style={styles.xAxisLabel}>Week 2</Text>
                            <Text style={styles.xAxisLabel}>Week 3</Text>
                            <Text style={styles.xAxisLabel}>Current Week</Text>
                        </View>
                    </View>
                </View>

                {/* Right: Selection Funnel */}
                <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Selection Funnel</Text>
                            <Text style={styles.cardSubtitle}>
                                Cumulative metrics across all active postings
                            </Text>
                        </View>
                        <Text style={{ fontSize: 16 }}>🌪️</Text>
                    </View>

                    <View style={styles.funnelList}>
                        {/* Step 1 */}
                        <View style={styles.funnelItem}>
                            <View style={styles.funnelHeader}>
                                <Text style={styles.funnelLabel}>1. Applications Received</Text>
                                <Text style={styles.funnelVal}>{fTotal} (100%)</Text>
                            </View>
                            <View style={styles.funnelTrack}>
                                <View style={[styles.funnelFill, { width: '100%', backgroundColor: '#004D40' }]} />
                            </View>
                        </View>

                        {/* Step 2 */}
                        <View style={styles.funnelItem}>
                            <View style={styles.funnelHeader}>
                                <Text style={styles.funnelLabel}>2. Shortlisted Students</Text>
                                <Text style={styles.funnelVal}>{fShort} ({fShortPct}%)</Text>
                            </View>
                            <View style={styles.funnelTrack}>
                                <View style={[styles.funnelFill, { width: `${Math.max(10, fShortPct)}%`, backgroundColor: '#0D9488' }]} />
                            </View>
                        </View>

                        {/* Step 3 */}
                        <View style={styles.funnelItem}>
                            <View style={styles.funnelHeader}>
                                <Text style={styles.funnelLabel}>3. Interviews / Assessments</Text>
                                <Text style={styles.funnelVal}>{fIntv} ({fIntvPct}%)</Text>
                            </View>
                            <View style={styles.funnelTrack}>
                                <View style={[styles.funnelFill, { width: `${Math.max(8, fIntvPct)}%`, backgroundColor: '#14B8A6' }]} />
                            </View>
                        </View>

                        {/* Step 4 */}
                        <View style={styles.funnelItem}>
                            <View style={styles.funnelHeader}>
                                <Text style={styles.funnelLabel}>4. Internship Selection</Text>
                                <Text style={styles.funnelVal}>{fSel} ({fSelPct}%)</Text>
                            </View>
                            <View style={styles.funnelTrack}>
                                <View style={[styles.funnelFill, { width: `${Math.max(6, fSelPct)}%`, backgroundColor: '#5EEAD4' }]} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.funnelFooter}>
                        <Text style={styles.funnelFooterText}>
                            ⚡ {fSelPct}% overall selection efficiency • {selectionFunnel.avg_turnaround_days || '2.4'} days avg turnaround
                        </Text>
                    </View>
                </View>
            </View>

            {/* 5. Your Active Internships Grid */}
            <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                    <View>
                        <Text style={styles.sectionTitle}>Your Active Internships</Text>
                        <Text style={styles.sectionSubtitle}>
                            Manage your current active roles and track applicant flow.
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Pressable onPress={() => onNavigateTab && onNavigateTab('Internships')}>
                            <Text style={styles.linkText}>View All Internships →</Text>
                        </Pressable>
                        <Pressable onPress={onOpenPostModal} style={styles.postSmallBtn}>
                            <Text style={styles.postSmallBtnText}>+ Post Internship</Text>
                        </Pressable>
                    </View>
                </View>

                {loadingData && internships.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={COLORS.primaryTeal} />
                        <Text style={{ marginTop: 8, color: COLORS.textMuted }}>Loading postings from database...</Text>
                    </View>
                ) : internships.length === 0 ? (
                    <View style={[styles.card, { padding: 36, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textDark }}>
                            No active internships created yet
                        </Text>
                        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, marginBottom: 16, textAlign: 'center', maxWidth: 400 }}>
                            Create your first internship posting to begin accepting applications from verified student candidates.
                        </Text>
                        <Pressable onPress={onOpenPostModal} style={styles.postSmallBtn}>
                            <Text style={styles.postSmallBtnText}>+ Post First Internship</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.internshipsGrid}>
                        {internships.slice(0, 6).map((job) => (
                            <HoverCard
                                key={job.id}
                                hoverScale={1.03}
                                style={styles.internshipCard}
                                onPress={() => onNavigateTab && onNavigateTab('Internships')}
                            >
                                <View style={styles.internshipTagRow}>
                                    <View style={styles.activeDotBadge}>
                                        <View style={styles.greenDot} />
                                        <Text style={styles.activeDotText}>{job.status || 'Active'}</Text>
                                    </View>
                                    <View style={styles.deadlinePillNormal}>
                                        <Text style={styles.deadlinePillNormalText}>
                                            Match Cutoff: {job.application_threshold ?? 80}%
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.internshipTitle}>{job.title}</Text>
                                <Text style={styles.internshipMeta}>
                                    {job.company_name || companyName} • {job.location || 'Hybrid'}
                                </Text>
                                <Text style={styles.stipendText}>Stipend: {job.stipend || '₹35,000/mo'}</Text>

                                <View style={styles.internshipStatsRow}>
                                    <View style={styles.statCol}>
                                        <Text style={styles.statVal}>{job.applied_count || 0}</Text>
                                        <Text style={styles.statLbl}>Applied</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statCol}>
                                        <Text style={styles.statVal}>{job.shortlisted_count || 0}</Text>
                                        <Text style={styles.statLbl}>Shortlisted</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statCol}>
                                        <Text style={styles.statVal}>{job.interview_count || 0}</Text>
                                        <Text style={styles.statLbl}>Interview</Text>
                                    </View>
                                </View>

                                <Pressable
                                    style={styles.viewAppBtn}
                                    onPress={() => onNavigateTab && onNavigateTab('Applications')}
                                >
                                    <Text style={styles.viewAppBtnText}>
                                        View Applications ({job.applied_count || 0}) →
                                    </Text>
                                </Pressable>
                            </HoverCard>
                        ))}
                    </View>
                )}
            </View>

            {/* 6. Recent Applications & Recommended Students Row */}
            <View style={[styles.splitRow, !isDesktop && styles.stackedRow]}>
                {/* Recent Applications Table */}
                <View style={[styles.card, { flex: 3 }]}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Recent Applications</Text>
                            <Text style={styles.cardSubtitle}>
                                Review newly arrived student applications from verified talent.
                            </Text>
                        </View>
                        <Pressable onPress={() => onNavigateTab && onNavigateTab('Applications')}>
                            <Text style={styles.linkText}>View All →</Text>
                        </Pressable>
                    </View>

                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.th, { flex: 2 }]}>Student</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>Internship</Text>
                        <Text style={[styles.th, { flex: 1 }]}>Skill Match</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>Applied</Text>
                        <Text style={[styles.th, { flex: 1.2 }]}>Status</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Action</Text>
                    </View>

                    {/* Rows */}
                    {applications.length === 0 ? (
                        <View style={{ padding: 32, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 28, marginBottom: 8 }}>👥</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 }}>
                                No applications yet
                            </Text>
                            <Text style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center' }}>
                                Verified candidates applying to your active postings will appear here in real-time.
                            </Text>
                        </View>
                    ) : (
                        applications.slice(0, 6).map((app) => {
                            const studentName = app.name || app.student || app.student_name || app.candidate_name || 'Applicant';
                            const collegeName = app.university || app.college || app.candidate_college || 'University';
                            const roleName = app.internship_title || app.internship || app.role || app.title || 'Internship';
                            
                            const rawScore = app.match_score_num ?? (
                                typeof app.match_score === 'number' 
                                    ? app.match_score 
                                    : (typeof app.match_score === 'string' && !isNaN(parseFloat(app.match_score)) ? parseFloat(app.match_score) : null)
                            );
                            const matchText = app.skillMatch || (rawScore != null ? `${Math.round(rawScore)}%` : (app.matchPct || '85%'));
                            const appliedText = app.appliedTime || (app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Recently');
                            const statusVal = app.status || 'Applied';
                            const initials = (studentName || 'ST')
                                .split(' ')
                                .filter(Boolean)
                                .map((n) => n[0] || '')
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || 'ST';

                            return (
                                <View key={app.id || app.application_id} style={styles.tableRow}>
                                    <View style={[styles.td, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                                        <View style={[styles.avatarCircle, { overflow: 'hidden' }]}>
                                            {(app.profile_image && typeof app.profile_image === 'string' && app.profile_image.startsWith('http')) ? (
                                                <Image
                                                    source={{ uri: app.profile_image }}
                                                    style={{ width: 32, height: 32, borderRadius: 16 }}
                                                />
                                            ) : (
                                                <Text style={styles.avatarText}>{initials}</Text>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.studentName} numberOfLines={1}>{studentName}</Text>
                                            <Text style={styles.collegeName} numberOfLines={1}>{collegeName}</Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.tdText, { flex: 1.5 }]} numberOfLines={1}>{roleName}</Text>

                                    <View style={[styles.td, { flex: 1 }]}>
                                        <View style={styles.skillMatchBadge}>
                                            <Text style={styles.skillMatchText}>{matchText}</Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.tdMuted, { flex: 1.5 }]}>{appliedText}</Text>

                                    <View style={[styles.td, { flex: 1.2 }]}>
                                        <View style={[styles.statusPill, { backgroundColor: app.statusBg || '#DCFCE7' }]}>
                                            <Text style={[styles.statusPillText, { color: app.statusText || '#15803D' }]}>
                                                {statusVal}
                                            </Text>
                                        </View>
                                    </View>

                                    <Pressable
                                        onPress={() => onNavigateTab && onNavigateTab('Applications')}
                                        style={[styles.td, { flex: 1, alignItems: 'flex-end' }]}
                                    >
                                        <Text style={styles.reviewLink}>Review →</Text>
                                    </Pressable>
                                </View>
                            );
                        })
                    )}

                    <View style={styles.tableFooter}>
                        <Text style={styles.tableFooterText}>
                            Showing {Math.min(applications.length, 6)} of {applications.length} student applications
                        </Text>
                        <Pressable onPress={() => onNavigateTab && onNavigateTab('Applications')}>
                            <Text style={styles.linkText}>Go to Application Tracker →</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Recommended Students Cards */}
                <View style={[styles.card, { flex: 2 }]}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Recommended Students</Text>
                            <Text style={styles.cardSubtitle}>
                                Verified talent matched to your company requirements.
                            </Text>
                        </View>
                        <View style={styles.aiBadge}>
                            <Text style={styles.aiBadgeText}>AI Match Engine</Text>
                        </View>
                    </View>

                    <View style={styles.recommendedList}>
                        {displayRecStudents.map((rec) => (
                            <HoverCard key={rec.id} hoverScale={1.02} style={styles.recCard}>
                                <View style={styles.recCardTop}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recName} numberOfLines={1}>
                                            {rec.name} <Text style={styles.recDegree}>• {rec.degree}</Text>
                                        </Text>
                                        {rec.college ? (
                                            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{rec.college}</Text>
                                        ) : null}
                                    </View>
                                    <View style={styles.matchGreenPill}>
                                        <Text style={styles.matchGreenPillText}>{rec.match || '90% Match'}</Text>
                                    </View>
                                </View>

                                <View style={styles.skillTagsRow}>
                                    {(rec.skills || ['React ✓', 'Python ✓', 'SQL ✓']).map((s, i) => (
                                        <View key={i} style={styles.skillTag}>
                                            <Text style={styles.skillTagText}>{s}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.recActionsRow}>
                                    <Pressable
                                        style={styles.viewProfileOutlineBtn}
                                        onPress={() => onNavigateTab && onNavigateTab('Students')}
                                    >
                                        <Text style={styles.viewProfileOutlineText}>View Profile</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.shortlistTealBtn}
                                        onPress={() => onNavigateTab && onNavigateTab('Applications')}
                                    >
                                        <Text style={styles.shortlistTealText}>
                                            Shortlist Candidate
                                        </Text>
                                    </Pressable>
                                </View>
                            </HoverCard>
                        ))}
                    </View>

                    <Pressable style={{ marginTop: 14 }} onPress={() => onNavigateTab && onNavigateTab('Students')}>
                        <Text style={styles.linkText}>Explore All Verified Student Profiles →</Text>
                    </Pressable>
                </View>
            </View>

            {/* 7. Upcoming Interviews & Recent Activity Row */}
            <View style={[styles.splitRow, !isDesktop && styles.stackedRow]}>
                {/* Upcoming Interviews */}
                <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Upcoming Interviews & Rounds</Text>
                            <Text style={styles.cardSubtitle}>
                                Active assessment sessions and rounds with students.
                            </Text>
                        </View>

                        <View style={styles.filterTabsSmall}>
                            {['Today', 'Tomorrow', 'This Week'].map((f) => (
                                <Pressable
                                    key={f}
                                    onPress={() => setInterviewFilter(f)}
                                    style={[
                                        styles.filterTabItem,
                                        interviewFilter === f && styles.filterTabItemActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.filterTabText,
                                            interviewFilter === f && styles.filterTabTextActive,
                                        ]}
                                    >
                                        {f}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View style={styles.interviewList}>
                        {filteredInterviews.length === 0 ? (
                            <View style={{ padding: 28, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 24, marginBottom: 6 }}>📅</Text>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 }}>
                                    No interviews scheduled for {interviewFilter.toLowerCase()}
                                </Text>
                                <Text style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center' }}>
                                    Students progressing through assessment rounds will appear here.
                                </Text>
                            </View>
                        ) : (
                            filteredInterviews.map((intv) => {
                                const cName = intv.candidate_name || intv.student || 'Candidate';
                                const rText = intv.round || `${intv.role || 'Intern'} • ${intv.round_name || 'Round 1'}`;
                                const timeStr = intv.time || '10:30';
                                const dayStr = intv.day || 'AM • TODAY';
                                const modeStr = intv.mode || '📹 Live Sandbox Active';

                                return (
                                    <HoverCard key={intv.id} hoverScale={1.02} style={styles.interviewCard}>
                                        <View style={styles.interviewTimeCol}>
                                            <Text style={styles.interviewTime}>{timeStr}</Text>
                                            <Text style={styles.interviewDay}>{dayStr}</Text>
                                        </View>
                                        <View style={styles.interviewInfo}>
                                            <Text style={styles.interviewStudent}>{cName}</Text>
                                            <Text style={styles.interviewRound}>
                                                {rText}
                                            </Text>
                                            <Text style={styles.interviewSubText}>
                                                {modeStr}
                                            </Text>
                                        </View>
                                        <Pressable
                                            style={styles.joinSandboxBtn}
                                            onPress={() => onNavigateTab && onNavigateTab('Assessments')}
                                        >
                                            <Text style={styles.joinSandboxText}>{intv.action_label || 'View Round'}</Text>
                                        </Pressable>
                                    </HoverCard>
                                );
                            })
                        )}
                    </View>

                    <View style={styles.cardFooterRow}>
                        <Pressable onPress={() => onNavigateTab && onNavigateTab('Assessments')}>
                            <Text style={styles.linkText}>View All Assessment Rounds →</Text>
                        </Pressable>
                        <Text style={styles.footerNoteText}>
                            Synced live with AI Assessment Engine
                        </Text>
                    </View>
                </View>

                {/* Recent Activity */}
                <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Recent Activity</Text>
                        <View style={styles.liveSyncBadge}>
                            <Text style={styles.liveSyncText}>● Live Sync</Text>
                        </View>
                    </View>

                    <View style={styles.activityList}>
                        {displayActivity.map((act) => (
                            <View key={act.id} style={styles.activityRow}>
                                <View style={styles.activityIconCircle}>
                                    <Text style={{ fontSize: 11 }}>{act.icon || '👤'}</Text>
                                </View>
                                <View style={styles.activityBody}>
                                    <Text style={styles.activityText}>
                                        {act.description || `${act.student_name} applied for ${act.internship_title}`}
                                    </Text>
                                    <Text style={styles.activityTime}>{act.time || 'Recently'}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={styles.cardFooterRow}>
                        <Pressable onPress={() => onNavigateTab && onNavigateTab('Applications')}>
                            <Text style={styles.linkText}>View Full Applicant Audit Log →</Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* 8. Page Footer */}
            <View style={styles.footerBar}>
                <Text style={styles.copyrightText}>
                    © 2026 SkillSetu Career Intelligence Platform. Empowering next-generation talent.
                </Text>
                <View style={styles.footerLinksRow}>
                    <Text style={styles.footerLink}>Privacy Policy</Text>
                    <Text style={styles.footerLink}>Terms of Service</Text>
                    <Text style={styles.footerLink}>Support Center</Text>
                </View>
            </View>
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
    welcomeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
    },
    welcomeTextGroup: {},
    welcomeHeading: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.textDark,
    },
    welcomeSubheading: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    profileProgressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.mintBg,
        borderWidth: 1,
        borderColor: COLORS.mintBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
    },
    shieldIcon: {
        fontSize: 16,
    },
    profileProgressText: {
        fontSize: 12,
        color: COLORS.primaryTeal,
    },
    completeProfileBtn: {
        marginLeft: 6,
    },
    completeProfileText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    metricCard: {
        flex: 1,
        minWidth: 200,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 16,
    },
    metricTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    metricIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.mintBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricNumber: {
        fontSize: 32,
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
        marginTop: 10,
    },
    pillText: {
        fontSize: 10,
        fontWeight: '700',
    },
    actionButtonsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    primaryActionBtn: {
        backgroundColor: COLORS.primaryTeal,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    primaryActionText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    secondaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },
    secondaryActionIcon: {
        fontSize: 14,
    },
    secondaryActionText: {
        color: COLORS.textDark,
        fontSize: 13,
        fontWeight: '600',
    },
    splitRow: {
        flexDirection: 'row',
        gap: 20,
    },
    stackedRow: {
        flexDirection: 'column',
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textDark,
    },
    cardSubtitle: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    peakBadge: {
        backgroundColor: COLORS.mintBg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    peakBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    graphLegendRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    graphContainer: {
        height: 140,
        backgroundColor: '#FAFDFD',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        position: 'relative',
        justifyContent: 'flex-end',
        padding: 10,
    },
    graphLineReceived: {
        position: 'absolute',
        left: 10,
        right: 10,
        top: 30,
        height: 3,
        backgroundColor: '#004D40',
        borderRadius: 2,
    },
    graphLineShortlisted: {
        position: 'absolute',
        left: 10,
        right: 10,
        top: 75,
        height: 3,
        backgroundColor: '#F59E0B',
        borderRadius: 2,
    },
    graphPeakDot: {
        position: 'absolute',
        top: 26,
        left: '60%',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#004D40',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    xAxisRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    xAxisLabel: {
        fontSize: 10,
        color: COLORS.textMuted,
    },
    funnelList: {
        gap: 12,
        marginVertical: 10,
    },
    funnelItem: {},
    funnelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    funnelLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    funnelVal: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    funnelTrack: {
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    funnelFill: {
        height: '100%',
        borderRadius: 4,
    },
    funnelFooter: {
        marginTop: 14,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    funnelFooterText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primaryTeal,
    },
    sectionBlock: {
        gap: 14,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textDark,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    linkText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    postSmallBtn: {
        backgroundColor: COLORS.primaryTeal,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    postSmallBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    internshipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    internshipCard: {
        flex: 1,
        minWidth: 280,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        padding: 18,
    },
    internshipTagRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    activeDotBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
    activeDotText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    deadlinePillWarning: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    deadlinePillWarningText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#D97706',
    },
    deadlinePillNormal: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    deadlinePillNormalText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    internshipTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textDark,
    },
    internshipMeta: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    stipendText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textDark,
        marginTop: 4,
    },
    internshipStatsRow: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 10,
        marginVertical: 14,
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statCol: {
        alignItems: 'center',
    },
    statVal: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.textDark,
    },
    statLbl: {
        fontSize: 10,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: COLORS.border,
    },
    viewAppBtn: {
        backgroundColor: COLORS.mintBg,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    viewAppBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    tableHeaderRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    th: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    td: {},
    avatarCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.mintBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    studentName: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    collegeName: {
        fontSize: 10,
        color: COLORS.textMuted,
    },
    tdText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    tdMuted: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    skillMatchBadge: {
        backgroundColor: COLORS.mintBg,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    skillMatchText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '700',
    },
    reviewLink: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    tableFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    tableFooterText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    aiBadge: {
        backgroundColor: COLORS.mintBg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    aiBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    recommendedList: {
        gap: 12,
    },
    recCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
    },
    recCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recName: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    recDegree: {
        fontSize: 11,
        fontWeight: '500',
        color: COLORS.textMuted,
    },
    matchGreenPill: {
        backgroundColor: COLORS.mintBg,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    matchGreenPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    skillTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginVertical: 8,
    },
    skillTag: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    skillTagText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    recActionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    viewProfileOutlineBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        paddingVertical: 6,
        alignItems: 'center',
    },
    viewProfileOutlineText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    shortlistTealBtn: {
        flex: 1.5,
        backgroundColor: COLORS.primaryTeal,
        borderRadius: 6,
        paddingVertical: 6,
        alignItems: 'center',
    },
    shortlistTealText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    filterTabsSmall: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        padding: 2,
    },
    filterTabItem: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    filterTabItemActive: {
        backgroundColor: COLORS.primaryTeal,
    },
    filterTabText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    filterTabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    interviewList: {
        gap: 10,
        marginVertical: 10,
    },
    interviewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
        gap: 12,
    },
    interviewTimeCol: {
        alignItems: 'center',
        minWidth: 50,
    },
    interviewTime: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.textDark,
    },
    interviewDay: {
        fontSize: 9,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    interviewInfo: {
        flex: 1,
    },
    interviewStudent: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    interviewRound: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    interviewSubText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.primaryTeal,
        marginTop: 3,
    },
    joinSandboxBtn: {
        backgroundColor: COLORS.primaryTeal,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    joinSandboxText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    detailsOutlineBtn: {
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    detailsOutlineText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    cardFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    footerNoteText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    liveSyncBadge: {
        backgroundColor: COLORS.mintBg,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    liveSyncText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primaryTeal,
    },
    activityList: {
        gap: 12,
        marginVertical: 10,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    activityIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.mintBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityBody: {
        flex: 1,
    },
    activityText: {
        fontSize: 12,
        color: COLORS.textDark,
        lineHeight: 16,
    },
    activityTime: {
        fontSize: 10,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    footerBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 10,
    },
    copyrightText: {
        fontSize: 11,
        color: COLORS.textMuted,
    },
    footerLinksRow: {
        flexDirection: 'row',
        gap: 16,
    },
    footerLink: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
});
