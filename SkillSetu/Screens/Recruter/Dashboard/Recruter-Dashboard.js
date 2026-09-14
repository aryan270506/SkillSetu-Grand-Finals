import React, { useRef, useState } from 'react';
import {
    Animated,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

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
    activeTab,
    onNavigateTab,
    onOpenPostModal,
}) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768;

    const [applications, setApplications] = useState(INITIAL_APPLICATIONS);
    const [interviewFilter, setInterviewFilter] = useState('Today');

    return (
        <ScrollView style={styles.page} contentContainerStyle={styles.container}>
            {/* 1. Welcome Header Banner */}
            <View style={styles.welcomeRow}>
                <View style={styles.welcomeTextGroup}>
                    <Text style={styles.welcomeHeading}>
                        Welcome back, {user?.name ? user.name.split(' ')[0] : 'Neha'} 👋
                    </Text>
                    <Text style={styles.welcomeSubheading}>
                        Here is a snapshot of your internship activities today.
                    </Text>
                </View>

                <View style={styles.profileProgressCard}>
                    <Text style={styles.shieldIcon}>🛡️</Text>
                    <Text style={styles.profileProgressText}>
                        Company Profile: <Text style={{ fontWeight: '700' }}>85% Completed</Text>
                    </Text>
                    <Pressable style={styles.completeProfileBtn}>
                        <Text style={styles.completeProfileText}>Complete Profile →</Text>
                    </Pressable>
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
                    <Text style={styles.metricNumber}>5</Text>
                    <Text style={styles.metricSub}>Currently accepting applications</Text>
                    <View style={[styles.pill, { backgroundColor: COLORS.orangePillBg }]}>
                        <Text style={[styles.pillText, { color: COLORS.orangePillText }]}>
                            ⏰ 2 Closing Soon
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
                    <Text style={styles.metricNumber}>186</Text>
                    <Text style={styles.metricSub}>Across all active internships</Text>
                    <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
                        <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
                            📈 +24% this week
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
                    <Text style={styles.metricNumber}>32</Text>
                    <Text style={styles.metricSub}>Ready for evaluation & tests</Text>
                    <View style={[styles.pill, { backgroundColor: COLORS.bluePillBg }]}>
                        <Text style={[styles.pillText, { color: COLORS.bluePillText }]}>
                            📊 17% Conversion rate
                        </Text>
                    </View>
                </HoverCard>

                {/* Card 4 */}
                <HoverCard hoverScale={1.04} style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                        <Text style={styles.metricLabel}>INTERVIEWS</Text>
                        <View style={styles.metricIconCircle}>
                            <Text style={{ fontSize: 13 }}>📅</Text>
                        </View>
                    </View>
                    <Text style={styles.metricNumber}>12</Text>
                    <Text style={styles.metricSub}>Upcoming interviews scheduled</Text>
                    <View style={[styles.pill, { backgroundColor: COLORS.greenPillBg }]}>
                        <Text style={[styles.pillText, { color: COLORS.greenPillText }]}>
                            📷 3 Scheduled today
                        </Text>
                    </View>
                </HoverCard>
            </View>

            {/* 3. Quick Action Buttons Row */}
            <View style={styles.actionButtonsRow}>
                <HoverCard hoverScale={1.05} onPress={onOpenPostModal} style={styles.primaryActionBtn}>
                    <Text style={styles.primaryActionText}>+ Post New Internship</Text>
                </HoverCard>

                <HoverCard hoverScale={1.05} style={styles.secondaryActionBtn}>
                    <Text style={styles.secondaryActionIcon}>👤</Text>
                    <Text style={styles.secondaryActionText}>Find Verified Students</Text>
                </HoverCard>

                <HoverCard hoverScale={1.05} style={styles.secondaryActionBtn}>
                    <Text style={styles.secondaryActionIcon}>📄</Text>
                    <Text style={styles.secondaryActionText}>Review Applications</Text>
                </HoverCard>

                <HoverCard hoverScale={1.05} style={styles.secondaryActionBtn}>
                    <Text style={styles.secondaryActionIcon}>📅</Text>
                    <Text style={styles.secondaryActionText}>
                        Schedule Interview Round
                    </Text>
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
                            <Text style={styles.peakBadgeText}>Peak: 54 on Sep 12</Text>
                        </View>
                    </View>

                    {/* Graph Legend */}
                    <View style={styles.graphLegendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#004D40' }]} />
                            <Text style={styles.legendText}>Applications Received</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.legendText}>Students Shortlisted</Text>
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
                            <Text style={styles.xAxisLabel}>Week 1 (Aug 20 - 27)</Text>
                            <Text style={styles.xAxisLabel}>Week 2 (Aug 28 - Sep 4)</Text>
                            <Text style={styles.xAxisLabel}>Week 3 (Sep 5 - 12)</Text>
                            <Text style={styles.xAxisLabel}>Week 4 (Sep 13 - 20)</Text>
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
                                <Text style={styles.funnelVal}>186 (100%)</Text>
                            </View>
                            <View style={styles.funnelTrack}>
                                <View style={[styles.funnelFill, { width: '100%', backgroundColor: '#004D40' }]} />
                            </View>
                        </View>

                        {/* Step 2 */}
                        <View style={styles.funnelItem}>
                            <View style={styles.funnelHeader}>
                                <Text style={styles.funnelLabel}>2. Shortlisted Students</Text>
                                <Text style={styles.funnelVal}>32 (17.2%)</Text>
                            </View>
                            <View style={styles.funnelTrack}>
                                <View style={[styles.funnelFill, { width: '40%', backgroundColor: '#0D9488' }]} />
                            </View>
                        </View>

                        {/* Step 3 */}
                        <View style={styles.funnelItem}>
                            <View style={styles.funnelHeader}>
                                <Text style={styles.funnelLabel}>3. Interviews Scheduled</Text>
                                <Text style={styles.funnelVal}>12 (6.4%)</Text>
                            </View>
                            <View style={styles.funnelTrack}>
                                <View style={[styles.funnelFill, { width: '22%', backgroundColor: '#14B8A6' }]} />
                            </View>
                        </View>

                        {/* Step 4 */}
                        <View style={styles.funnelItem}>
                            <View style={styles.funnelHeader}>
                                <Text style={styles.funnelLabel}>4. Internship Selection</Text>
                                <Text style={styles.funnelVal}>8 (4.3%)</Text>
                            </View>
                            <View style={styles.funnelTrack}>
                                <View style={[styles.funnelFill, { width: '15%', backgroundColor: '#5EEAD4' }]} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.funnelFooter}>
                        <Text style={styles.funnelFooterText}>
                            ⚡ 4.3% overall selection efficiency • 2.4 days avg turnaround
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
                        <Pressable>
                            <Text style={styles.linkText}>View All Internships →</Text>
                        </Pressable>
                        <Pressable onPress={onOpenPostModal} style={styles.postSmallBtn}>
                            <Text style={styles.postSmallBtnText}>+ Post Internship</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.internshipsGrid}>
                    {/* Internship 1 */}
                    <HoverCard hoverScale={1.03} style={styles.internshipCard}>
                        <View style={styles.internshipTagRow}>
                            <View style={styles.activeDotBadge}>
                                <View style={styles.greenDot} />
                                <Text style={styles.activeDotText}>Active</Text>
                            </View>
                            <View style={styles.deadlinePillWarning}>
                                <Text style={styles.deadlinePillWarningText}>
                                    Deadline: 20 Sep (5 days left)
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.internshipTitle}>
                            Backend Development Intern
                        </Text>
                        <Text style={styles.internshipMeta}>
                            TechNova Engineering • Bengaluru (Hybrid)
                        </Text>
                        <Text style={styles.stipendText}>Stipend: ₹35,000/mo</Text>

                        <View style={styles.internshipStatsRow}>
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>86</Text>
                                <Text style={styles.statLbl}>Applied</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>15</Text>
                                <Text style={styles.statLbl}>Shortlisted</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>4</Text>
                                <Text style={styles.statLbl}>Interview</Text>
                            </View>
                        </View>

                        <Pressable style={styles.viewAppBtn}>
                            <Text style={styles.viewAppBtnText}>View Applications →</Text>
                        </Pressable>
                    </HoverCard>

                    {/* Internship 2 */}
                    <HoverCard hoverScale={1.03} style={styles.internshipCard}>
                        <View style={styles.internshipTagRow}>
                            <View style={styles.activeDotBadge}>
                                <View style={styles.greenDot} />
                                <Text style={styles.activeDotText}>Active</Text>
                            </View>
                            <View style={styles.deadlinePillNormal}>
                                <Text style={styles.deadlinePillNormalText}>
                                    Deadline: 28 Sep (13 days left)
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.internshipTitle}>
                            AI / Machine Learning Intern
                        </Text>
                        <Text style={styles.internshipMeta}>TechNova Labs • Remote</Text>
                        <Text style={styles.stipendText}>Stipend: ₹40,000/mo</Text>

                        <View style={styles.internshipStatsRow}>
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>64</Text>
                                <Text style={styles.statLbl}>Applied</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>11</Text>
                                <Text style={styles.statLbl}>Shortlisted</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>5</Text>
                                <Text style={styles.statLbl}>Interview</Text>
                            </View>
                        </View>

                        <Pressable style={styles.viewAppBtn}>
                            <Text style={styles.viewAppBtnText}>View Applications →</Text>
                        </Pressable>
                    </HoverCard>

                    {/* Internship 3 */}
                    <HoverCard hoverScale={1.03} style={styles.internshipCard}>
                        <View style={styles.internshipTagRow}>
                            <View style={styles.activeDotBadge}>
                                <View style={styles.greenDot} />
                                <Text style={styles.activeDotText}>Active</Text>
                            </View>
                            <View style={styles.deadlinePillNormal}>
                                <Text style={styles.deadlinePillNormalText}>
                                    Deadline: 05 Oct (20 days left)
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.internshipTitle}>
                            Frontend Development Intern
                        </Text>
                        <Text style={styles.internshipMeta}>
                            TechNova Product • Bengaluru (On-site)
                        </Text>
                        <Text style={styles.stipendText}>Stipend: ₹30,000/mo</Text>

                        <View style={styles.internshipStatsRow}>
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>36</Text>
                                <Text style={styles.statLbl}>Applied</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>6</Text>
                                <Text style={styles.statLbl}>Shortlisted</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statCol}>
                                <Text style={styles.statVal}>3</Text>
                                <Text style={styles.statLbl}>Interview</Text>
                            </View>
                        </View>

                        <Pressable style={styles.viewAppBtn}>
                            <Text style={styles.viewAppBtnText}>View Applications →</Text>
                        </Pressable>
                    </HoverCard>
                </View>
            </View>

            {/* 6. Recent Applications & Recommended Students Row */}
            <View style={[styles.splitRow, !isDesktop && styles.stackedRow]}>
                {/* Recent Applications Table */}
                <View style={[styles.card, { flex: 3 }]}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Recent Applications</Text>
                            <Text style={styles.cardSubtitle}>
                                Review newly arrived student applications.
                            </Text>
                        </View>
                        <Pressable>
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
                    {applications.map((app) => (
                        <View key={app.id} style={styles.tableRow}>
                            <View style={[styles.td, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>
                                        {app.student.split(' ').map((n) => n[0]).join('')}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.studentName}>{app.student}</Text>
                                    <Text style={styles.collegeName}>{app.college}</Text>
                                </View>
                            </View>

                            <Text style={[styles.tdText, { flex: 1.5 }]}>{app.internship}</Text>

                            <View style={[styles.td, { flex: 1 }]}>
                                <View style={styles.skillMatchBadge}>
                                    <Text style={styles.skillMatchText}>{app.skillMatch}</Text>
                                </View>
                            </View>

                            <Text style={[styles.tdMuted, { flex: 1.5 }]}>{app.appliedTime}</Text>

                            <View style={[styles.td, { flex: 1.2 }]}>
                                <View style={[styles.statusPill, { backgroundColor: app.statusBg }]}>
                                    <Text style={[styles.statusPillText, { color: app.statusText }]}>
                                        {app.status}
                                    </Text>
                                </View>
                            </View>

                            <Pressable style={[styles.td, { flex: 1, alignItems: 'flex-end' }]}>
                                <Text style={styles.reviewLink}>Review</Text>
                            </Pressable>
                        </View>
                    ))}

                    <View style={styles.tableFooter}>
                        <Text style={styles.tableFooterText}>
                            Showing 4 of 186 recent student applications
                        </Text>
                        <Pressable>
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
                                Students whose verified skills closely match your internship requirements.
                            </Text>
                        </View>
                        <View style={styles.aiBadge}>
                            <Text style={styles.aiBadgeText}>AI Match Engine</Text>
                        </View>
                    </View>

                    <View style={styles.recommendedList}>
                        {RECOMMENDED_STUDENTS.map((rec) => (
                            <HoverCard key={rec.id} hoverScale={1.02} style={styles.recCard}>
                                <View style={styles.recCardTop}>
                                    <Text style={styles.recName}>
                                        {rec.name} <Text style={styles.recDegree}>• {rec.degree}</Text>
                                    </Text>
                                    <View style={styles.matchGreenPill}>
                                        <Text style={styles.matchGreenPillText}>{rec.match}</Text>
                                    </View>
                                </View>

                                <View style={styles.skillTagsRow}>
                                    {rec.skills.map((s, i) => (
                                        <View key={i} style={styles.skillTag}>
                                            <Text style={styles.skillTagText}>{s}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.recActionsRow}>
                                    <Pressable style={styles.viewProfileOutlineBtn}>
                                        <Text style={styles.viewProfileOutlineText}>View Profile</Text>
                                    </Pressable>
                                    <Pressable style={styles.shortlistTealBtn}>
                                        <Text style={styles.shortlistTealText}>
                                            Shortlist for Interview
                                        </Text>
                                    </Pressable>
                                </View>
                            </HoverCard>
                        ))}
                    </View>

                    <Pressable style={{ marginTop: 14 }}>
                        <Text style={styles.linkText}>Explore 45+ Verified Student Profiles →</Text>
                    </Pressable>
                </View>
            </View>

            {/* 7. Upcoming Interviews & Recent Activity Row */}
            <View style={[styles.splitRow, !isDesktop && styles.stackedRow]}>
                {/* Upcoming Interviews */}
                <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardTitle}>Upcoming Interviews</Text>
                            <Text style={styles.cardSubtitle}>
                                Scheduled rounds with shortlisted students.
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
                        {/* Item 1 */}
                        <HoverCard hoverScale={1.02} style={styles.interviewCard}>
                            <View style={styles.interviewTimeCol}>
                                <Text style={styles.interviewTime}>10:30</Text>
                                <Text style={styles.interviewDay}>AM • TODAY</Text>
                            </View>
                            <View style={styles.interviewInfo}>
                                <Text style={styles.interviewStudent}>Rahul Sharma</Text>
                                <Text style={styles.interviewRound}>
                                    Backend Dev Intern • Round 2: Technical & Architecture
                                </Text>
                                <Text style={styles.interviewSubText}>
                                    📹 Google Meet Integration Active
                                </Text>
                            </View>
                            <Pressable style={styles.joinSandboxBtn}>
                                <Text style={styles.joinSandboxText}>Join Live Sandbox</Text>
                            </Pressable>
                        </HoverCard>

                        {/* Item 2 */}
                        <HoverCard hoverScale={1.02} style={styles.interviewCard}>
                            <View style={styles.interviewTimeCol}>
                                <Text style={styles.interviewTime}>02:00</Text>
                                <Text style={styles.interviewDay}>PM • TODAY</Text>
                            </View>
                            <View style={styles.interviewInfo}>
                                <Text style={styles.interviewStudent}>Priya Patil</Text>
                                <Text style={styles.interviewRound}>
                                    Frontend Dev Intern • Round 1: React & UI Systems
                                </Text>
                                <Text style={styles.interviewSubText}>
                                    💻 Code Sandbox Ready
                                </Text>
                            </View>
                            <Pressable style={styles.detailsOutlineBtn}>
                                <Text style={styles.detailsOutlineText}>View Details</Text>
                            </Pressable>
                        </HoverCard>

                        {/* Item 3 */}
                        <HoverCard hoverScale={1.02} style={styles.interviewCard}>
                            <View style={styles.interviewTimeCol}>
                                <Text style={styles.interviewTime}>11:00</Text>
                                <Text style={styles.interviewDay}>AM • TOMORROW</Text>
                            </View>
                            <View style={styles.interviewInfo}>
                                <Text style={styles.interviewStudent}>Aditya Singh</Text>
                                <Text style={styles.interviewRound}>
                                    Backend Dev Intern • Round 1: System Design & APIs
                                </Text>
                                <Text style={styles.interviewSubText}>
                                    ⏰ Automated Reminder Sent
                                </Text>
                            </View>
                            <Pressable style={styles.detailsOutlineBtn}>
                                <Text style={styles.detailsOutlineText}>View Details</Text>
                            </Pressable>
                        </HoverCard>
                    </View>

                    <View style={styles.cardFooterRow}>
                        <Text style={styles.linkText}>View All Interviews →</Text>
                        <Text style={styles.footerNoteText}>
                            All time slots synced with Google Calendar
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
                        <View style={styles.activityRow}>
                            <View style={styles.activityIconCircle}>
                                <Text style={{ fontSize: 11 }}>👤</Text>
                            </View>
                            <View style={styles.activityBody}>
                                <Text style={styles.activityText}>
                                    <Text style={{ fontWeight: '700' }}>Rahul Sharma</Text> applied for{' '}
                                    <Text style={{ color: COLORS.primaryTeal, fontWeight: '700' }}>
                                        Backend Development Intern
                                    </Text>
                                </Text>
                                <Text style={styles.activityTime}>10 mins ago</Text>
                            </View>
                        </View>

                        <View style={styles.activityRow}>
                            <View style={styles.activityIconCircle}>
                                <Text style={{ fontSize: 11 }}>📄</Text>
                            </View>
                            <View style={styles.activityBody}>
                                <Text style={styles.activityText}>
                                    <Text style={{ fontWeight: '700' }}>Priya Patil</Text> was shortlisted for{' '}
                                    <Text style={{ color: COLORS.primaryTeal, fontWeight: '700' }}>
                                        Frontend Development Intern
                                    </Text>
                                </Text>
                                <Text style={styles.activityTime}>1 hour ago</Text>
                            </View>
                        </View>

                        <View style={styles.activityRow}>
                            <View style={styles.activityIconCircle}>
                                <Text style={{ fontSize: 11 }}>📅</Text>
                            </View>
                            <View style={styles.activityBody}>
                                <Text style={styles.activityText}>
                                    Interview scheduled with{' '}
                                    <Text style={{ fontWeight: '700' }}>Aditya Singh</Text>
                                </Text>
                                <Text style={styles.activityTime}>3 hours ago</Text>
                            </View>
                        </View>

                        <View style={styles.activityRow}>
                            <View style={styles.activityIconCircle}>
                                <Text style={{ fontSize: 11 }}>👥</Text>
                            </View>
                            <View style={styles.activityBody}>
                                <Text style={styles.activityText}>
                                    <Text style={{ fontWeight: '700' }}>8 new student applications</Text>{' '}
                                    received across AI/ML Intern
                                </Text>
                                <Text style={styles.activityTime}>Yesterday</Text>
                            </View>
                        </View>

                        <View style={styles.activityRow}>
                            <View style={styles.activityIconCircle}>
                                <Text style={{ fontSize: 11 }}>📊</Text>
                            </View>
                            <View style={styles.activityBody}>
                                <Text style={styles.activityText}>
                                    Assessment completed by{' '}
                                    <Text style={{ fontWeight: '700' }}>Tanvi Deshmukh</Text> with{' '}
                                    <Text style={{ color: '#15803D', fontWeight: '700' }}>92% score</Text>
                                </Text>
                                <Text style={styles.activityTime}>Yesterday</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.cardFooterRow}>
                        <Text style={styles.linkText}>View Full Audit Log →</Text>
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
