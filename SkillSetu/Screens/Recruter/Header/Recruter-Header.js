import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import RecruiterDashboard from '../Dashboard/Recruter-Dashboard';
import Internship from '../Internship/Internship';
import Applications from '../Applications/Applications';
import Interviews from '../Interviews/Interviews';
import Analytics from '../Analytics/Analytics';
import RecruterProfile from '../Profile/Profile';
import { recruiterService } from '../services/recruiterService';
import InternshipFormModal from '../Internship/InternshipFormModal';

const COLORS = {
    headerBg: '#FFFFFF',
    border: '#E2E8F0',
    textMain: '#0F172A',
    textMuted: '#64748B',
    primaryTeal: '#004D40',
    primaryTealLight: '#005C4B',
    mintBg: '#E6F4F1',
    mintBadge: '#D1FAE5',
    mintBadgeText: '#065F46',
    avatarBg: '#004D40',
    badgeRed: '#EF4444',
    pageBg: '#F8FAFC',
    amberBg: '#FEF3C7',
    amberText: '#92400E',
    accentGreen: '#10B981',
};

export default function RecruterHeader({ user, onLogout }) {
    const { width } = useWindowDimensions();
    const isCompact = width < 900;
    const token = user?.token || user?.access_token || '';

    const [activeTab, setActiveTab] = useState('Dashboard');
    const [hoveredTabId, setHoveredTabId] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);

    // Live Authoritative Profile & Completion State from Backend
    const [profileData, setProfileData] = useState(null);
    const [completion, setCompletion] = useState({
        percentage: user?.completion_percentage || 0,
        is_complete: !!user?.profile_completed,
        missing_required_sections: [],
    });

    // New Internship Form State
    const [roleTitle, setRoleTitle] = useState('');
    const [department, setDepartment] = useState('Engineering');
    const [location, setLocation] = useState('Pune (Hybrid)');
    const [stipend, setStipend] = useState('₹35,000/mo');
    const [skillsText, setSkillsText] = useState('React, Python, Docker');
    const [applicationThreshold, setApplicationThreshold] = useState(80);
    const [postLoading, setPostLoading] = useState(false);
    const [postSuccess, setPostSuccess] = useState(false);
    const [postError, setPostError] = useState('');

    const tabs = [
        'Dashboard',
        'My Profile',
        'Internships',
        'Students',
        'Applications',
        'Assessments',
        'Analytics',
    ];

    // Initialize scale animations for each tab
    const scaleAnims = useRef({}).current;
    tabs.forEach((tab) => {
        if (!scaleAnims[tab]) {
            scaleAnims[tab] = new Animated.Value(1);
        }
    });

    // Fetch initial authoritative profile from PostgreSQL
    const loadProfileData = async () => {
        try {
            const data = await recruiterService.getProfile(token);
            if (data) {
                setProfileData(data);
                if (data.completion) {
                    setCompletion(data.completion);
                }
            }
        } catch (err) {
            console.warn('Recruiter header profile check:', err);
        }
    };

    useEffect(() => {
        loadProfileData();
    }, [token]);

    const handleProfileUpdated = (updatedData) => {
        if (updatedData) {
            setProfileData(updatedData);
            if (updatedData.completion) {
                setCompletion(updatedData.completion);
            }
        }
    };

    // Animate tab scales on hoveredTabId changes
    useEffect(() => {
        tabs.forEach((tab) => {
            let targetScale = 1.0;
            if (hoveredTabId !== null) {
                if (hoveredTabId === tab) {
                    targetScale = 1.08;
                } else {
                    const hoveredIndex = tabs.indexOf(hoveredTabId);
                    const currentIndex = tabs.indexOf(tab);
                    const dist = Math.abs(hoveredIndex - currentIndex);
                    if (dist === 1) {
                        targetScale = 0.98;
                    } else {
                        targetScale = 0.96;
                    }
                }
            }

            if (scaleAnims[tab]) {
                Animated.spring(scaleAnims[tab], {
                    toValue: targetScale,
                    friction: 8,
                    tension: 80,
                    useNativeDriver: Platform.OS !== 'web',
                }).start();
            }
        });
    }, [hoveredTabId]);

    const handlePublishInternship = async () => {
        if (!roleTitle.trim()) {
            setPostError('Role title is required.');
            return;
        }
        setPostLoading(true);
        setPostError('');
        try {
            const skillsArr = skillsText.split(',').map((s) => s.trim()).filter(Boolean);
            const threshVal = parseInt(applicationThreshold, 10) || 80;
            await recruiterService.createInternship(token, {
                title: roleTitle.trim(),
                department: department.trim(),
                location: location.trim(),
                stipend: stipend.trim(),
                required_skills: skillsArr,
                application_threshold: threshVal,
            });
            setPostSuccess(true);
            setTimeout(() => {
                setPostSuccess(false);
                setShowPostModal(false);
                setRoleTitle('');
                setApplicationThreshold(80);
                loadProfileData();
            }, 1200);
        } catch (err) {
            setPostError(err.message || 'Failed to publish opening. Complete your company profile first.');
        } finally {
            setPostLoading(false);
        }
    };

    const isLockedTab = (tab) => {
        if (completion.is_complete) return false;
        if (tab === 'My Profile') return false;
        return true;
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Top Header Bar */}
            <View style={styles.headerBar}>
                {/* Logo */}
                <Pressable
                    onPress={() => setActiveTab('Dashboard')}
                    style={styles.logoRow}
                >
                    <View style={styles.logoMark}>
                        <View style={styles.bridgeDeck} />
                        <View style={styles.bridgePillarLeft} />
                        <View style={styles.bridgePillarRight} />
                        <View style={styles.logoNodeTop} />
                        <View style={styles.logoNodeLeft} />
                        <View style={styles.logoNodeRight} />
                    </View>
                    <Text style={styles.logoTitle}>
                        Skill<Text style={styles.logoTitleAccent}>Setu</Text>
                    </Text>
                </Pressable>

                {/* Navigation Tabs */}
                {!isCompact && (
                    <View style={styles.headerCenter}>
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab;
                            const locked = isLockedTab(tab);
                            const scaleAnim = scaleAnims[tab] || new Animated.Value(1);

                            return (
                                <Pressable
                                    key={tab}
                                    onPress={() => setActiveTab(tab)}
                                    onHoverIn={() => {
                                        if (Platform.OS === 'web') setHoveredTabId(tab);
                                    }}
                                    onHoverOut={() => {
                                        if (Platform.OS === 'web') setHoveredTabId(null);
                                    }}
                                >
                                    <Animated.View
                                        style={[
                                            styles.tabItem,
                                            isActive && styles.tabItemActive,
                                            { transform: [{ scale: scaleAnim }] },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.tabText,
                                                isActive && styles.tabTextActive,
                                                locked && tab !== 'Dashboard' && styles.tabTextLocked,
                                            ]}
                                        >
                                            {tab} {locked && tab !== 'Dashboard' ? '🔒' : ''}
                                        </Text>
                                        {isActive && <View style={styles.activeIndicator} />}
                                    </Animated.View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                {/* Header Right Actions */}
                <View style={styles.headerRight}>
                    {/* Completion Status Pill */}
                    <Pressable
                        onPress={() => setActiveTab('My Profile')}
                        style={[
                            styles.headerCompletionPill,
                            completion.is_complete ? styles.completionPillDone : styles.completionPillPending,
                        ]}
                    >
                        <Text style={[
                            styles.headerCompletionText,
                            completion.is_complete ? styles.completionTextDone : styles.completionTextPending,
                        ]}>
                            {completion.is_complete
                                ? '✓ Profile Complete'
                                : `Company Profile: ${completion.percentage}% Complete`}
                        </Text>
                    </Pressable>

                    {/* Notification Bell */}
                    <Pressable
                        onPress={() => setShowNotifications(!showNotifications)}
                        style={styles.iconButton}
                    >
                        <Text style={styles.iconText}>🔔</Text>
                    </Pressable>

                    {/* User Profile Dropdown */}
                    <Pressable
                        onPress={() => setShowDropdown(!showDropdown)}
                        style={styles.userProfileRow}
                    >
                        <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
                            </Text>
                        </View>
                        {!isCompact && (
                            <View style={styles.userInfoText}>
                                <Text style={styles.userName} numberOfLines={1}>
                                    {user?.name || profileData?.recruiter?.name || 'Recruiter'}
                                </Text>
                                <Text style={styles.userRole} numberOfLines={1}>
                                    {profileData?.company?.name
                                        ? `${profileData.recruiter?.designation || 'Lead'} • ${profileData.company.name}`
                                        : (user?.companyName ? `Lead • ${user.companyName}` : 'Recruiter Workspace')}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>

            {/* Mandatory Company Profile Completion Banner (Shown on every tab until complete) */}
            {!completion.is_complete && (
                <View style={styles.mandatoryBanner}>
                    <View style={styles.bannerLeft}>
                        <Text style={styles.bannerShieldIcon}>🛡️</Text>
                        <View>
                            <Text style={styles.bannerTitle}>
                                Complete your company profile to unlock recruiter features.
                            </Text>
                            <Text style={styles.bannerSub}>
                                Company profile is currently <Text style={{ fontWeight: '800' }}>{completion.percentage}% complete</Text>. Required threshold is 80%+ with all mandatory sections.
                            </Text>
                        </View>
                    </View>
                    <View style={styles.bannerRight}>
                        <View style={styles.bannerProgressBar}>
                            <View style={[styles.bannerProgressFill, { width: `${Math.max(5, completion.percentage)}%` }]} />
                        </View>
                        <Pressable
                            style={styles.bannerActionBtn}
                            onPress={() => setActiveTab('My Profile')}
                        >
                            <Text style={styles.bannerActionBtnText}>Complete Profile →</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Compact View Tab Bar */}
            {isCompact && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.compactTabsScroll}
                    contentContainerStyle={styles.compactTabsContainer}
                >
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab;
                        const locked = isLockedTab(tab);
                        return (
                            <Pressable
                                key={tab}
                                onPress={() => setActiveTab(tab)}
                                style={[styles.tabItem, isActive && styles.tabItemActive]}
                            >
                                <Text
                                    style={[
                                        styles.tabText,
                                        isActive && styles.tabTextActive,
                                        locked && tab !== 'Dashboard' && styles.tabTextLocked,
                                    ]}
                                >
                                    {tab} {locked && tab !== 'Dashboard' ? '🔒' : ''}
                                </Text>
                                {isActive && <View style={styles.activeIndicator} />}
                            </Pressable>
                        );
                    })}
                </ScrollView>
            )}

            {/* Notifications Popover */}
            {showNotifications && (
                <View style={styles.notifPopover}>
                    <Text style={styles.notifTitle}>Notifications</Text>
                    <View style={styles.notifItem}>
                        <Text style={styles.notifText}>
                            {completion.is_complete
                                ? 'Your company workspace is active on SkillSetu.'
                                : 'Complete your company profile to start publishing openings.'}
                        </Text>
                        <Text style={styles.notifTime}>Live</Text>
                    </View>
                </View>
            )}

            {/* Profile Dropdown */}
            {showDropdown && (
                <View style={styles.dropdownPopover}>
                    <Text style={styles.dropdownName}>
                        {user?.name || profileData?.recruiter?.name || 'Recruiter'}
                    </Text>
                    <Text style={styles.dropdownSub}>
                        {user?.email || profileData?.recruiter?.email || ''}
                    </Text>
                    <View style={styles.dropdownDivider} />
                    <Pressable
                        onPress={() => {
                            setShowDropdown(false);
                            setActiveTab('My Profile');
                        }}
                        style={styles.dropdownItem}
                    >
                        <Text style={styles.dropdownItemText}>👤 My Profile & Organization</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            setShowDropdown(false);
                            onLogout && onLogout();
                        }}
                        style={[styles.dropdownItem, styles.dropdownLogout]}
                    >
                        <Text style={styles.dropdownLogoutText}>🚪 Sign Out</Text>
                    </Pressable>
                </View>
            )}

            {/* Screen Body with Route Guard */}
            <View style={styles.screenBody}>
                {activeTab === 'My Profile' ? (
                    <RecruterProfile
                        user={user}
                        onProfileUpdated={handleProfileUpdated}
                        onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                ) : !completion.is_complete && activeTab !== 'Dashboard' ? (
                    /* Locked State Feature Gate Overlay for Incomplete Profiles */
                    <View style={styles.lockedFeatureContainer}>
                        <View style={styles.lockedFeatureCard}>
                            <View style={styles.lockedIconCircle}>
                                <Text style={styles.lockedIconEmoji}>🔒</Text>
                            </View>
                            <Text style={styles.lockedFeatureTitle}>
                                {activeTab} Feature Locked
                            </Text>
                            <Text style={styles.lockedFeatureDesc}>
                                Complete your company profile to unlock candidate discovery, internship publishing, application tracking, interview scheduling, and analytics.
                            </Text>

                            <View style={styles.lockedProgressBox}>
                                <View style={styles.lockedProgressRow}>
                                    <Text style={styles.lockedProgressLabel}>Company Profile Progress</Text>
                                    <Text style={styles.lockedProgressVal}>{completion.percentage}%</Text>
                                </View>
                                <View style={styles.lockedTrack}>
                                    <View style={[styles.lockedFill, { width: `${Math.max(5, completion.percentage)}%` }]} />
                                </View>
                            </View>

                            {completion.missing_required_sections?.length > 0 && (
                                <View style={styles.missingBox}>
                                    <Text style={styles.missingBoxTitle}>Required sections remaining:</Text>
                                    {completion.missing_required_sections.map((sec, idx) => (
                                        <Text key={idx} style={styles.missingItemText}>• {sec}</Text>
                                    ))}
                                </View>
                            )}

                            <Pressable
                                style={styles.unlockActionBtn}
                                onPress={() => setActiveTab('My Profile')}
                            >
                                <Text style={styles.unlockActionBtnText}>Complete Company Profile Now →</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : activeTab === 'Internships' ? (
                    <Internship
                        user={user}
                        onOpenPostModal={() => setShowPostModal(true)}
                    />
                ) : activeTab === 'Applications' ? (
                    <Applications user={user} />
                ) : activeTab === 'Assessments' || activeTab === 'Interviews' ? (
                    <Interviews user={user} />
                ) : activeTab === 'Analytics' ? (
                    <Analytics user={user} onNavigateTab={(tab) => setActiveTab(tab)} />
                ) : (
                    <RecruiterDashboard
                        user={user}
                        profileData={profileData}
                        completion={completion}
                        activeTab={activeTab}
                        onNavigateTab={(tab) => setActiveTab(tab)}
                        onOpenPostModal={() => setShowPostModal(true)}
                    />
                )}
            </View>

            {/* Post New Internship Modal (Create Mode) */}
            <InternshipFormModal
                visible={showPostModal}
                mode="create"
                token={token}
                onClose={() => setShowPostModal(false)}
                onSuccess={() => {
                    loadProfileData();
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.pageBg,
    },
    headerBar: {
        height: 64,
        backgroundColor: COLORS.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        zIndex: 100,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logoMark: {
        width: 28,
        height: 28,
        marginRight: 2,
        position: 'relative',
    },
    bridgeDeck: {
        position: 'absolute',
        left: 3,
        right: 3,
        top: 12,
        height: 4,
        borderRadius: 3,
        backgroundColor: COLORS.primaryTeal,
        transform: [{ rotate: '-7deg' }],
    },
    bridgePillarLeft: {
        position: 'absolute',
        left: 6,
        top: 15,
        width: 4,
        height: 10,
        borderRadius: 3,
        backgroundColor: '#171d35',
    },
    bridgePillarRight: {
        position: 'absolute',
        right: 6,
        top: 15,
        width: 4,
        height: 10,
        borderRadius: 3,
        backgroundColor: '#171d35',
    },
    logoNodeTop: {
        position: 'absolute',
        top: 2,
        left: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00BFA5',
    },
    logoNodeLeft: {
        position: 'absolute',
        top: 10,
        left: 0,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primaryTeal,
    },
    logoNodeRight: {
        position: 'absolute',
        top: 6,
        right: 0,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.primaryTeal,
    },
    logoTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#171d35',
    },
    logoTitleAccent: {
        color: '#00BFA5',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tabItem: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        position: 'relative',
    },
    tabItemActive: {
        backgroundColor: COLORS.mintBg,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.primaryTeal,
        fontWeight: '700',
    },
    tabTextLocked: {
        color: '#94A3B8',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -2,
        left: 14,
        right: 14,
        height: 2,
        backgroundColor: COLORS.primaryTeal,
        borderRadius: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerCompletionPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    completionPillPending: {
        backgroundColor: COLORS.amberBg,
        borderColor: '#FDE68A',
    },
    completionPillDone: {
        backgroundColor: COLORS.mintBadge,
        borderColor: '#A7F3D0',
    },
    headerCompletionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    completionTextPending: {
        color: COLORS.amberText,
    },
    completionTextDone: {
        color: COLORS.mintBadgeText,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 15,
    },
    userProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 4,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.avatarBg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    userInfoText: {
        maxWidth: 160,
    },
    userName: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    userRole: {
        fontSize: 11,
        color: COLORS.textMuted,
    },

    // Mandatory Banner
    mandatoryBanner: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 24,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
    },
    bannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 300,
    },
    bannerShieldIcon: {
        fontSize: 22,
    },
    bannerTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    bannerSub: {
        fontSize: 12,
        color: '#94A3B8',
    },
    bannerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    bannerProgressBar: {
        width: 120,
        height: 8,
        backgroundColor: '#334155',
        borderRadius: 4,
        overflow: 'hidden',
    },
    bannerProgressFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 4,
    },
    bannerActionBtn: {
        backgroundColor: '#00BFA5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    bannerActionBtnText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0F172A',
    },

    // Compact Bar
    compactTabsScroll: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        maxHeight: 48,
    },
    compactTabsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        gap: 8,
    },

    // Notif Popover
    notifPopover: {
        position: 'absolute',
        top: 68,
        right: 80,
        width: 300,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        zIndex: 200,
        elevation: 8,
    },
    notifTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.textMain,
        marginBottom: 10,
    },
    notifItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    notifText: {
        fontSize: 12,
        color: COLORS.textMain,
        lineHeight: 16,
    },
    notifTime: {
        fontSize: 10,
        color: COLORS.textMuted,
        marginTop: 4,
    },

    // Dropdown Popover
    dropdownPopover: {
        position: 'absolute',
        top: 68,
        right: 24,
        width: 240,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        zIndex: 200,
        elevation: 8,
    },
    dropdownName: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.textMain,
    },
    dropdownSub: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    dropdownDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    dropdownItem: {
        paddingVertical: 8,
    },
    dropdownItemText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMain,
    },
    dropdownLogout: {
        marginTop: 4,
    },
    dropdownLogoutText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#EF4444',
    },

    // Screen Body
    screenBody: {
        flex: 1,
    },

    // Locked Feature Gate
    lockedFeatureContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    lockedFeatureCard: {
        maxWidth: 520,
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    lockedIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.amberBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    lockedIconEmoji: {
        fontSize: 28,
    },
    lockedFeatureTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textMain,
        marginBottom: 8,
        textAlign: 'center',
    },
    lockedFeatureDesc: {
        fontSize: 13,
        lineHeight: 20,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginBottom: 20,
    },
    lockedProgressBox: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        padding: 14,
        borderRadius: 10,
        marginBottom: 16,
    },
    lockedProgressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    lockedProgressLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    lockedProgressVal: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.primaryTeal,
    },
    lockedTrack: {
        width: '100%',
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    lockedFill: {
        height: '100%',
        backgroundColor: COLORS.primaryTeal,
        borderRadius: 4,
    },
    missingBox: {
        width: '100%',
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
    },
    missingBoxTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.amberText,
        marginBottom: 4,
    },
    missingItemText: {
        fontSize: 12,
        color: '#92400E',
        lineHeight: 18,
    },
    unlockActionBtn: {
        width: '100%',
        backgroundColor: COLORS.primaryTeal,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    unlockActionBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 540,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textMain,
    },
    modalCloseText: {
        fontSize: 18,
        color: COLORS.textMuted,
        fontWeight: '700',
    },
    successBanner: {
        backgroundColor: COLORS.mintBadge,
        padding: 12,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 8,
    },
    successBannerText: {
        color: COLORS.mintBadgeText,
        fontSize: 13,
        fontWeight: '700',
    },
    errorBanner: {
        backgroundColor: '#FEE2E2',
        padding: 12,
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 8,
    },
    errorBannerText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '600',
    },
    modalForm: {
        padding: 20,
        maxHeight: 400,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMain,
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: '#F8FAFC',
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#FFFFFF',
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    publishBtn: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: COLORS.primaryTeal,
    },
    publishBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    thresholdSection: {
        marginTop: 18,
        padding: 14,
        backgroundColor: '#F0FDFA',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#99F6E4',
    },
    thresholdHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    thresholdSectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0F766E',
        letterSpacing: 0.5,
    },
    thresholdCurrentBadge: {
        backgroundColor: '#CCFBF1',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#5EEAD4',
    },
    thresholdCurrentBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#0F766E',
    },
    thresholdDesc: {
        fontSize: 12,
        color: '#334155',
        lineHeight: 16,
        marginBottom: 10,
    },
    thresholdPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    thresholdPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    thresholdPillActive: {
        backgroundColor: '#0F766E',
        borderColor: '#0F766E',
    },
    thresholdPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    thresholdPillTextActive: {
        color: '#FFFFFF',
    },
    customThresholdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    customThresholdLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#334155',
    },
    customThresholdInput: {
        width: 60,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#99F6E4',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 13,
        fontWeight: '700',
        color: '#0F766E',
        textAlign: 'center',
    },
    thresholdHelpText: {
        fontSize: 11,
        fontStyle: 'italic',
        color: '#0D9488',
        lineHeight: 15,
    },
});
