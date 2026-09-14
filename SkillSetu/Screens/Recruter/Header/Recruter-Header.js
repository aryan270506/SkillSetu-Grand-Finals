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
import RecruterProfile from '../Profile/Profile';

const COLORS = {
    headerBg: '#FFFFFF',
    border: '#E2E8F0',
    textMain: '#0F172A',
    textMuted: '#64748B',
    primaryTeal: '#004D40',
    primaryTealLight: '#005C4B',
    mintBg: '#E6F4F1',
    avatarBg: '#004D40',
    badgeRed: '#EF4444',
    pageBg: '#F8FAFC',
};

export default function RecruterHeader({ user, onLogout }) {
    const { width } = useWindowDimensions();
    const isCompact = width < 900;
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [hoveredTabId, setHoveredTabId] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);

    // New Internship Form State
    const [roleTitle, setRoleTitle] = useState('');
    const [department, setDepartment] = useState('TechNova Engineering');
    const [location, setLocation] = useState('Bengaluru (Hybrid)');
    const [stipend, setStipend] = useState('₹35,000/mo');
    const [postSuccess, setPostSuccess] = useState(false);

    const tabs = [
        'Dashboard',
        'My Profile',
        'Internships',
        'Students',
        'Applications',
        'Interviews',
        'Analytics',
    ];

    // Initialize scale animations for each tab
    const scaleAnims = useRef({}).current;
    tabs.forEach((tab) => {
        if (!scaleAnims[tab]) {
            scaleAnims[tab] = new Animated.Value(1);
        }
    });

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

    const handlePublishInternship = () => {
        if (!roleTitle.trim()) return;
        setPostSuccess(true);
        setTimeout(() => {
            setPostSuccess(false);
            setShowPostModal(false);
            setRoleTitle('');
        }, 1000);
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

                {/* Navigation Tabs - Centered with Spring Scale Hover Animation */}
                {!isCompact && (
                    <View style={styles.headerCenter}>
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab;
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
                                            ]}
                                        >
                                            {tab}
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
                    {/* Search Icon */}
                    <Pressable style={styles.iconButton}>
                        <Text style={styles.iconText}>🔍</Text>
                    </Pressable>

                    {/* Notification Bell */}
                    <Pressable
                        onPress={() => setShowNotifications(!showNotifications)}
                        style={styles.iconButton}
                    >
                        <Text style={styles.iconText}>🔔</Text>
                        <View style={styles.bellBadge}>
                            <Text style={styles.bellBadgeText}>1</Text>
                        </View>
                    </Pressable>

                    {/* User Profile */}
                    <Pressable
                        onPress={() => setShowDropdown(!showDropdown)}
                        style={styles.userProfileRow}
                    >
                        <View style={styles.userAvatar}>
                            <Text style={styles.userAvatarText}>
                                {user?.name ? user.name.charAt(0) : 'N'}
                            </Text>
                        </View>
                        {!isCompact && (
                            <View style={styles.userInfoText}>
                                <Text style={styles.userName} numberOfLines={1}>
                                    {user?.name || 'Neha Sharma'}
                                </Text>
                                <Text style={styles.userRole} numberOfLines={1}>
                                    {user?.companyName
                                        ? `Talent Lead • ${user.companyName}`
                                        : 'Talent Lead • TechNova'}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                </View>
            </View>

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
                        return (
                            <Pressable
                                key={tab}
                                onPress={() => setActiveTab(tab)}
                                style={[styles.tabItem, isActive && styles.tabItemActive]}
                            >
                                <Text
                                    style={[styles.tabText, isActive && styles.tabTextActive]}
                                >
                                    {tab}
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
                            Rahul Sharma applied for Backend Development Intern.
                        </Text>
                        <Text style={styles.notifTime}>10m ago</Text>
                    </View>
                    <View style={styles.notifItem}>
                        <Text style={styles.notifText}>
                            Interview scheduled with Aditya Singh for tomorrow.
                        </Text>
                        <Text style={styles.notifTime}>3h ago</Text>
                    </View>
                </View>
            )}

            {/* Profile Dropdown */}
            {showDropdown && (
                <View style={styles.dropdownPopover}>
                    <Text style={styles.dropdownName}>
                        {user?.name || 'Neha Sharma'}
                    </Text>
                    <Text style={styles.dropdownSub}>
                        {user?.email || 'neha.sharma@technova.com'}
                    </Text>
                    <View style={styles.dropdownDivider} />
                    <Pressable
                        onPress={() => {
                            setShowDropdown(false);
                            setActiveTab('My Profile');
                        }}
                        style={styles.dropdownItem}
                    >
                        <Text style={styles.dropdownItemText}>👤 My Profile</Text>
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

            {/* Screen Body */}
            <View style={styles.screenBody}>
                {activeTab === 'My Profile' ? (
                    <RecruterProfile />
                ) : activeTab === 'Internships' ? (
                    <Internship onOpenPostModal={() => setShowPostModal(true)} />
                ) : activeTab === 'Applications' ? (
                    <Applications />
                ) : activeTab === 'Interviews' ? (
                    <Interviews />
                ) : (
                    <RecruiterDashboard
                        user={user}
                        activeTab={activeTab}
                        onNavigateTab={(tab) => setActiveTab(tab)}
                        onOpenPostModal={() => setShowPostModal(true)}
                    />
                )}
            </View>

            {/* Post New Internship Modal */}
            <Modal
                visible={showPostModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPostModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Post New Internship</Text>
                            <Pressable onPress={() => setShowPostModal(false)}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </Pressable>
                        </View>

                        {postSuccess && (
                            <View style={styles.successBanner}>
                                <Text style={styles.successBannerText}>
                                    ✓ Internship published successfully!
                                </Text>
                            </View>
                        )}

                        <ScrollView style={styles.modalForm}>
                            <Text style={styles.label}>Role Title *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Backend Development Intern"
                                value={roleTitle}
                                onChangeText={setRoleTitle}
                            />

                            <Text style={styles.label}>Department / Team</Text>
                            <TextInput
                                style={styles.input}
                                value={department}
                                onChangeText={setDepartment}
                            />

                            <Text style={styles.label}>Location</Text>
                            <TextInput
                                style={styles.input}
                                value={location}
                                onChangeText={setLocation}
                            />

                            <Text style={styles.label}>Monthly Stipend</Text>
                            <TextInput
                                style={styles.input}
                                value={stipend}
                                onChangeText={setStipend}
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Pressable
                                onPress={() => setShowPostModal(false)}
                                style={styles.cancelBtn}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handlePublishInternship}
                                style={styles.publishBtn}
                            >
                                <Text style={styles.publishBtnText}>Publish Opening</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
        backgroundColor: '#f59e0b',
    },
    logoNodeLeft: {
        position: 'absolute',
        bottom: 0,
        left: 1,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#2c6370',
    },
    logoNodeRight: {
        position: 'absolute',
        right: 1,
        bottom: 0,
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: COLORS.primaryTeal,
    },
    logoTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.primaryTeal,
        letterSpacing: -0.5,
    },
    logoTitleAccent: {
        color: COLORS.primaryTeal,
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    tabItem: {
        paddingVertical: 20,
        position: 'relative',
    },
    tabItemActive: {},
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.primaryTeal,
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: COLORS.primaryTeal,
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    iconText: {
        fontSize: 15,
    },
    bellBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: COLORS.badgeRed,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bellBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '800',
    },
    userProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 8,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primaryTeal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    userInfoText: {
        justifyContent: 'center',
    },
    userName: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMain,
    },
    userRole: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    compactTabsScroll: {
        backgroundColor: COLORS.headerBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    compactTabsContainer: {
        paddingHorizontal: 16,
        gap: 16,
    },
    notifPopover: {
        position: 'absolute',
        top: 64,
        right: 80,
        width: 280,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
        zIndex: 200,
    },
    notifTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMain,
        marginBottom: 8,
    },
    notifItem: {
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    notifText: {
        fontSize: 12,
        color: COLORS.textMain,
    },
    notifTime: {
        fontSize: 10,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    dropdownPopover: {
        position: 'absolute',
        top: 64,
        right: 24,
        width: 220,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
        zIndex: 200,
    },
    dropdownName: {
        fontSize: 14,
        fontWeight: '700',
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
        marginVertical: 10,
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
        color: COLORS.badgeRed,
    },
    screenBody: {
        flex: 1,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textMain,
    },
    modalCloseText: {
        fontSize: 18,
        color: COLORS.textMuted,
    },
    successBanner: {
        backgroundColor: COLORS.mintBg,
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    successBannerText: {
        color: COLORS.primaryTeal,
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
    modalForm: {
        maxHeight: 300,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMain,
        marginTop: 10,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: COLORS.textMain,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cancelBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    publishBtn: {
        backgroundColor: COLORS.primaryTeal,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
    },
    publishBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
