import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
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
import Dashboard from '../Dashboard/Dashboard';
import Profile, { DEFAULT_MOCK_PROFILE } from '../Profile/Profile';
import { createInitialProfile, fetchCompleteStudentProfile } from '../services/profileService';
import Resume from '../Resume/Resume';
import MentorModal from '../Mentor/MentorModal';
import Skill from '../Skill/Skill';
import Internship from '../Internship/Internship';
import Application from '../Application/Application';
import Scolarship from '../Scolarships/Scolarship';
import Learning from '../Learning/Learning';
import Rounds from '../Rounds/Rounds';
import { clearOpportunitySessionCache } from '../services/internshipService';

const COLORS = {
  headerBg: '#F4F1FA',        // Very light lavender-white header background
  pillBg: 'rgba(255, 255, 255, 0.85)',
  pillBorder: 'rgba(255, 255, 255, 0.95)',
  activePillBg: '#EDE9FE',    // Soft lavender active background
  activeText: '#7C3AED',      // Primary Violet
  inactiveText: '#635F69',    // Muted slate gray
  textDark: '#1E1B2E',        // Deep indigo-black
  textMuted: '#74707E',
  borderSubtle: 'rgba(124, 58, 237, 0.08)',
  profileBorder: 'rgba(124, 58, 237, 0.15)',
  dropdownBg: '#FFFFFF',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  
  // Exact SkillSetu Logo Colors
  brandNavy: '#171D35',
  brandGreen: '#1E7654',
  brandTeal: '#2C6370',
  brandAmber: '#F59E0B',
};

// ALL EXISTING APPLICATION TABS — PRESERVED 100%
const EXISTING_TABS = [
  { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'Profile', label: 'My Profile', icon: '👤' },
  { id: 'Resume', label: 'Resume', icon: '📄' },
  { id: 'Skills', label: 'Skills', icon: '⚡' },
  { id: 'Learning', label: 'Learning', icon: '📚' },
  { id: 'Opportunities', label: 'Opportunities', icon: '💼' },
  { id: 'Applications', label: 'Applications', icon: '📝' },
  { id: 'Scholarships', label: 'Scholarships', icon: '🎓' },
  { id: 'Rounds', label: 'Rounds', icon: '🎯' },
];

export default function StudentHeader({ user, onLogout, onUpdateUser }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 820;

  const [profileData, setProfileData] = useState(() => createInitialProfile(user));
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [navigationParams, setNavigationParams] = useState({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [hoveredTabId, setHoveredTabId] = useState(null);

  // Auto-fetch complete student profile on user session start
  useEffect(() => {
    if (user && user.email) {
      setProfileData(prev => createInitialProfile(user, prev));
      fetchCompleteStudentProfile(user, setProfileData);
    }
  }, [user]);

  // Inject Web fonts and custom styling for smooth hover lifts and clay effects
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontLinkId = 'skillsetu-header-google-fonts';
      if (!document.getElementById(fontLinkId)) {
        const link = document.createElement('link');
        link.id = fontLinkId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,700&display=swap';
        document.head.appendChild(link);
      }

      const styleId = 'skillsetu-header-interactive-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .skillsetu-nav-pill-scroll::-webkit-scrollbar {
            display: none;
          }
          .skillsetu-nav-item {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
          }
          .skillsetu-nav-item:hover {
            transform: translateY(-1px);
          }
          .skillsetu-nav-item:active {
            transform: scale(0.96);
          }
          .skillsetu-profile-pill {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .skillsetu-profile-pill:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(124, 58, 237, 0.12);
          }
          .skillsetu-profile-pill:active {
            transform: scale(0.98);
          }
          .skillsetu-mentor-fab {
            transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 250ms ease !important;
            cursor: pointer !important;
          }
          .skillsetu-mentor-fab:hover {
            transform: translateY(-4px) scale(1.04) !important;
            box-shadow: 0 10px 28px rgba(124, 58, 237, 0.45) !important;
          }
          .skillsetu-mentor-fab:active {
            transform: translateY(1px) scale(0.96) !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const handleNavigate = (tabName, params = {}) => {
    setNavigationParams(params || {});
    setActiveTab(tabName);
    setShowDropdown(false);
    setShowMobileMenu(false);
  };

  // AI Mentor state
  const [showMentor, setShowMentor] = useState(false);

  const calculateProfileCompletion = () => {
    let score = 0;
    const totalSteps = 5;
    if (profileData?.personalInfo && profileData.personalInfo.fullName && profileData.personalInfo.email) score += 1;
    if (profileData?.education && profileData.education.list && profileData.education.list.length > 0) score += 1;
    if (profileData?.careerGoals && (profileData.careerGoals.targetCareer || (profileData.careerGoals.targetCareerIds && profileData.careerGoals.targetCareerIds.length > 0))) score += 1;
    if (profileData?.resumeAnalysis && profileData.resumeAnalysis.resumeFile) score += 1;
    if (profileData?.githubLinks && (profileData.githubLinks.githubUsername || profileData.githubLinks.linkedinUrl)) score += 1;

    let percent = Math.round((score / totalSteps) * 80);
    if (profileData?.verified) {
      percent = 100;
    } else {
      if (score === 5) percent = 80;
    }
    return percent;
  };

  // Extract real dynamic student info
  const studentName = profileData?.personalInfo?.fullName || user?.name || user?.full_name || 'Student';
  const studentUniversity = (
    profileData?.education?.universityDetected ||
    profileData?.education?.list?.[0]?.university ||
    user?.university ||
    user?.college ||
    'SkillSetu Student'
  );
  const studentEmail = user?.email || profileData?.personalInfo?.email || 'student@skillsetu.com';
  const studentAvatarUri = profileData?.personalInfo?.profileImage || user?.profile_image;
  const avatarLetter = (studentName || 'S').charAt(0).toUpperCase();

  const handleLogout = () => {
    setShowDropdown(false);
    setShowMobileMenu(false);
    clearOpportunitySessionCache(null, user?.email);
    if (onLogout) onLogout();
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <Dashboard
            user={user}
            profileCompletion={calculateProfileCompletion()}
            onNavigateToProfile={() => handleNavigate('Profile')}
            profileData={profileData}
            setProfileData={setProfileData}
            onNavigate={handleNavigate}
          />
        );
      case 'Profile':
        return (
          <Profile
            user={user}
            updateUser={onUpdateUser}
            profileData={profileData}
            setProfileData={setProfileData}
            onFinish={() => handleNavigate('Dashboard')}
          />
        );
      case 'Resume':
        return (
          <Resume
            user={user}
            profileData={profileData}
          />
        );
      case 'Skills':
        return (
          <Skill
            user={user}
            profileData={profileData}
            setProfileData={setProfileData}
            navigationParams={navigationParams}
            onNavigate={handleNavigate}
          />
        );
      case 'Learning':
        return (
          <Learning
            user={user}
            profileData={profileData}
            navigationParams={navigationParams}
            onNavigate={handleNavigate}
          />
        );
      case 'Opportunities':
        return (
          <Internship
            user={user}
            profileData={profileData}
            onNavigate={handleNavigate}
          />
        );
      case 'Applications':
        return (
          <Application
            user={user}
            profileData={profileData}
            onNavigate={handleNavigate}
          />
        );
      case 'Scholarships':
        return (
          <Scolarship
            user={user}
            profileData={profileData}
          />
        );
      case 'Rounds':
        return (
          <Rounds
            user={user}
            onNavigate={handleNavigate}
            navigationParams={navigationParams}
          />
        );
      default:
        return (
          <Dashboard
            user={user}
            profileCompletion={calculateProfileCompletion()}
            onNavigateToProfile={() => handleNavigate('Profile')}
            profileData={profileData}
            setProfileData={setProfileData}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Navigation Bar */}
      <View style={[styles.headerContainer, isMobile && styles.headerContainerMobile]}>
        <View style={styles.headerInner}>
          
          {/* LEFT: Existing SkillSetu Logo */}
          <Pressable
            onPress={() => handleNavigate('Dashboard')}
            style={({ pressed }) => [styles.logoWrapper, pressed && styles.pressedLogo]}
            accessibilityRole="button"
            accessibilityLabel="SkillSetu Home"
          >
            <View style={styles.logoMark}>
              <View style={styles.bridgeDeck} />
              <View style={styles.bridgePillarLeft} />
              <View style={styles.bridgePillarRight} />
              <View style={styles.logoNodeTop} />
              <View style={styles.logoNodeLeft} />
              <View style={styles.logoNodeRight} />
            </View>
            <Text style={styles.brandText}>SkillSetu</Text>
          </Pressable>

          {/* CENTER: Main Navigation Pill with ALL EXISTING TABS (Desktop & Tablet) */}
          {!isMobile && (
            <View style={styles.navCenterWrapper}>
              <View style={styles.navPillContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.navScrollContent}
                  style={Platform.OS === 'web' ? { overflow: 'hidden' } : null}
                >
                  {EXISTING_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const isHovered = hoveredTabId === tab.id;

                    return (
                      <Pressable
                        key={tab.id}
                        onPress={() => handleNavigate(tab.id)}
                        onHoverIn={() => {
                          if (Platform.OS === 'web') setHoveredTabId(tab.id);
                        }}
                        onHoverOut={() => {
                          if (Platform.OS === 'web') setHoveredTabId(null);
                        }}
                        style={[
                          styles.navItem,
                          isActive && styles.navItemActive,
                          isHovered && !isActive && styles.navItemHovered,
                        ]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                      >
                        <Text
                          style={[
                            styles.navText,
                            isActive && styles.navTextActive,
                            isHovered && !isActive && styles.navTextHovered,
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* RIGHT: Student Profile Pill & Mobile Menu Toggle */}
          <View style={styles.rightWrapper}>
            {/* Student Profile Pill */}
            <Pressable
              onPress={() => setShowDropdown(prev => !prev)}
              style={({ pressed }) => [
                styles.profilePill,
                showDropdown && styles.profilePillActive,
                pressed && styles.pressedProfile,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Student Profile Menu"
            >
              {/* Profile Avatar */}
              {studentAvatarUri ? (
                <Image
                  source={{ uri: studentAvatarUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{avatarLetter}</Text>
                </View>
              )}

              {/* Student Name & University (Desktop & Tablet) */}
              {!isMobile && (
                <View style={styles.profileTextColumn}>
                  <Text style={styles.profileStudentName} numberOfLines={1}>
                    {studentName}
                  </Text>
                  <Text style={styles.profileUniversity} numberOfLines={1}>
                    {studentUniversity}
                  </Text>
                </View>
              )}

              {/* Dropdown Caret */}
              <Text style={[styles.profileCaret, showDropdown && styles.profileCaretActive]}>
                {showDropdown ? '▴' : '▾'}
              </Text>
            </Pressable>

            {/* Mobile Hamburger Menu Button */}
            {isMobile && (
              <Pressable
                onPress={() => setShowMobileMenu(prev => !prev)}
                style={({ pressed }) => [styles.mobileMenuBtn, pressed && styles.pressedMobileMenu]}
                accessibilityRole="button"
                accessibilityLabel="Open Navigation Menu"
              >
                <Text style={styles.mobileMenuIcon}>{showMobileMenu ? '✕' : '☰'}</Text>
              </Pressable>
            )}

            {/* Profile Dropdown Menu */}
            {showDropdown && (
              <View style={[styles.dropdownCard, isMobile && styles.dropdownCardMobile]}>
                {/* User Summary Header */}
                <View style={styles.dropdownUserInfo}>
                  <View style={styles.dropdownUserRow}>
                    {studentAvatarUri ? (
                      <Image source={{ uri: studentAvatarUri }} style={styles.dropdownAvatar} />
                    ) : (
                      <View style={styles.dropdownAvatarFallback}>
                        <Text style={styles.dropdownAvatarLetter}>{avatarLetter}</Text>
                      </View>
                    )}
                    <View style={styles.dropdownUserMeta}>
                      <Text style={styles.dropdownUserName} numberOfLines={1}>{studentName}</Text>
                      <Text style={styles.dropdownUserEmail} numberOfLines={1}>{studentEmail}</Text>
                      <Text style={styles.dropdownUserUni} numberOfLines={1}>{studentUniversity}</Text>
                    </View>
                  </View>
                  
                  {/* Profile Completion Bar */}
                  <View style={styles.dropdownProgressWrapper}>
                    <View style={styles.dropdownProgressHeader}>
                      <Text style={styles.dropdownProgressLabel}>Profile Readiness</Text>
                      <Text style={styles.dropdownProgressValue}>{calculateProfileCompletion()}%</Text>
                    </View>
                    <View style={styles.dropdownProgressTrack}>
                      <View
                        style={[
                          styles.dropdownProgressBar,
                          { width: `${calculateProfileCompletion()}%` }
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.dropdownDivider} />

                {/* All Nav Links inside Dropdown */}
                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  {EXISTING_TABS.map((tab) => (
                    <Pressable
                      key={tab.id}
                      onPress={() => handleNavigate(tab.id)}
                      style={({ pressed }) => [
                        styles.dropdownItem,
                        activeTab === tab.id && styles.dropdownItemActiveTab,
                        pressed && styles.dropdownItemHover,
                      ]}
                    >
                      <Text style={styles.dropdownItemIcon}>{tab.icon}</Text>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          activeTab === tab.id && styles.dropdownItemTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={styles.dropdownDivider} />

                {/* Logout Button */}
                <Pressable
                  onPress={handleLogout}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    styles.dropdownLogoutItem,
                    pressed && styles.dropdownLogoutHover,
                  ]}
                >
                  <Text style={styles.dropdownLogoutIcon}>🚪</Text>
                  <Text style={styles.dropdownLogoutText}>Logout</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Backdrop for profile dropdown */}
        {showDropdown && (
          <Pressable
            style={styles.dropdownBackdrop}
            onPress={() => setShowDropdown(false)}
          />
        )}
      </View>

      {/* Mobile Navigation Drawer with ALL EXISTING TABS */}
      {isMobile && showMobileMenu && (
        <View style={styles.mobileNavOverlay}>
          <Pressable style={styles.mobileNavBackdrop} onPress={() => setShowMobileMenu(false)} />
          <View style={styles.mobileNavDrawer}>
            <View style={styles.mobileNavHeader}>
              <View style={styles.mobileNavUserRow}>
                {studentAvatarUri ? (
                  <Image source={{ uri: studentAvatarUri }} style={styles.mobileAvatar} />
                ) : (
                  <View style={styles.mobileAvatarFallback}>
                    <Text style={styles.mobileAvatarText}>{avatarLetter}</Text>
                  </View>
                )}
                <View style={styles.mobileUserMeta}>
                  <Text style={styles.mobileUserName} numberOfLines={1}>{studentName}</Text>
                  <Text style={styles.mobileUserUni} numberOfLines={1}>{studentUniversity}</Text>
                </View>
              </View>
              <Pressable
                style={styles.mobileCloseBtn}
                onPress={() => setShowMobileMenu(false)}
              >
                <Text style={styles.mobileCloseIcon}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.mobileDivider} />

            <ScrollView contentContainerStyle={styles.mobileNavList} style={{ maxHeight: 360 }}>
              {EXISTING_TABS.map((route) => {
                const isActive = activeTab === route.id;
                return (
                  <Pressable
                    key={route.id}
                    onPress={() => handleNavigate(route.id)}
                    style={[
                      styles.mobileNavItem,
                      isActive && styles.mobileNavItemActive,
                    ]}
                  >
                    <Text style={styles.mobileNavIcon}>{route.icon}</Text>
                    <Text
                      style={[
                        styles.mobileNavText,
                        isActive && styles.mobileNavTextActive,
                      ]}
                    >
                      {route.label}
                    </Text>
                    {isActive && <View style={styles.mobileActiveDot} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.mobileDivider} />

            <Pressable
              onPress={handleLogout}
              style={styles.mobileLogoutBtn}
            >
              <Text style={styles.mobileLogoutText}>🚪 Logout</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Main Screen Content Wrapper */}
      <View style={styles.contentArea}>
        {renderActiveScreen()}
      </View>

      {/* Global Floating AI Mentor Button */}
      <Pressable
        testID="skill-ask-ai-mentor"
        dataSet={{ testid: 'skill-ask-ai-mentor' }}
        className="skillsetu-mentor-fab"
        style={({ hovered, pressed }) => [
          styles.floatingMentorBtn,
          Platform.OS === 'web' && {
            cursor: 'pointer',
            userSelect: 'none',
            transform: [
              { translateY: pressed ? 1 : hovered ? -4 : 0 },
              { scale: pressed ? 0.96 : hovered ? 1.04 : 1 },
            ],
            transitionDuration: '220ms',
            transitionProperty: 'transform, box-shadow',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: hovered
              ? '0 14px 32px rgba(124, 58, 237, 0.45)'
              : '0 8px 24px rgba(124, 58, 237, 0.35)',
          },
          pressed && styles.pressedMentorBtn,
        ]}
        onPress={() => setShowMentor(!showMentor)}
        accessibilityRole="button"
        accessibilityLabel="Open AI Career Mentor"
      >
        <Text style={styles.floatingMentorBtnText}>
          ✨ {width >= 768 ? 'Ask AI Mentor' : 'AI Mentor'}
        </Text>
      </Pressable>

      {/* Redesigned Claymorphic Personal AI Career Mentor Modal */}
      <MentorModal
        visible={showMentor}
        onClose={() => setShowMentor(false)}
        user={user}
        profileData={profileData}
        activeTab={activeTab}
        onNavigate={handleNavigate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.headerBg,
  },

  // Header Main Bar
  headerContainer: {
    height: 84,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    zIndex: 100,
    justifyContent: 'center',
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        boxShadow: '0 4px 20px -2px rgba(99, 95, 105, 0.05)',
      },
      default: {
        shadowColor: '#635F69',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }
    }),
  },
  headerContainerMobile: {
    height: 72,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? '2.5vw' : 14,
    maxWidth: 1680,
    width: '100%',
    alignSelf: 'center',
  },

  // LEFT: Logo & Brand
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 14,
    flexShrink: 0,
    cursor: 'pointer',
  },
  pressedLogo: {
    opacity: 0.85,
  },
  logoMark: {
    width: 30,
    height: 30,
    marginRight: 9,
    position: 'relative',
  },
  bridgeDeck: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 13,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: COLORS.brandGreen,
    transform: [{ rotate: '-7deg' }],
  },
  bridgePillarLeft: {
    position: 'absolute',
    left: 6,
    top: 16,
    width: 4.5,
    height: 11,
    borderRadius: 3,
    backgroundColor: COLORS.brandNavy,
  },
  bridgePillarRight: {
    position: 'absolute',
    right: 6,
    top: 16,
    width: 4.5,
    height: 11,
    borderRadius: 3,
    backgroundColor: COLORS.brandNavy,
  },
  logoNodeTop: {
    position: 'absolute',
    top: 2,
    left: 10,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.brandAmber,
  },
  logoNodeLeft: {
    position: 'absolute',
    bottom: 0,
    left: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brandTeal,
  },
  logoNodeRight: {
    position: 'absolute',
    right: 1,
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brandGreen,
  },
  brandText: {
    color: COLORS.textDark,
    fontSize: 21,
    fontWeight: '900',
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    letterSpacing: -0.5,
  },

  // CENTER: Navigation Pill with ALL EXISTING TABS
  navCenterWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  navPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pillBg,
    borderRadius: 9999,
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.pillBorder,
    maxWidth: '100%',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 2px 14px rgba(124, 58, 237, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
      },
      default: {
        shadowColor: '#7C3AED',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }
    }),
  },
  navScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItem: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 9999,
    marginHorizontal: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    ...Platform.select({
      web: {
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
    }),
  },
  navItemActive: {
    backgroundColor: COLORS.activePillBg,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(124, 58, 237, 0.14)',
      },
      default: {
        shadowColor: '#7C3AED',
        shadowOpacity: 0.14,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }
    }),
  },
  navItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  navText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.inactiveText,
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    textAlign: 'center',
  },
  navTextActive: {
    color: COLORS.activeText,
    fontWeight: '700',
  },
  navTextHovered: {
    color: COLORS.textDark,
  },

  // RIGHT: Student Profile Pill
  rightWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    zIndex: 110,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 9999,
    paddingVertical: 4,
    paddingLeft: 5,
    paddingRight: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    cursor: 'pointer',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(124, 58, 237, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      default: {
        shadowColor: '#7C3AED',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }
    }),
  },
  profilePillActive: {
    borderColor: COLORS.activeText,
    backgroundColor: '#FFFFFF',
  },
  pressedProfile: {
    transform: [{ scale: 0.98 }],
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.activeText,
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
  },
  profileTextColumn: {
    marginLeft: 9,
    marginRight: 5,
    maxWidth: 130,
    justifyContent: 'center',
  },
  profileStudentName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textDark,
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    lineHeight: 17,
  },
  profileUniversity: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.inactiveText,
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    marginTop: 1,
    lineHeight: 13,
  },
  profileCaret: {
    fontSize: 11,
    color: COLORS.inactiveText,
    marginLeft: 2,
    fontWeight: '700',
  },
  profileCaretActive: {
    color: COLORS.activeText,
  },

  // Profile Dropdown Card
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -5000,
    zIndex: 105,
    backgroundColor: 'transparent',
  },
  dropdownCard: {
    position: 'absolute',
    top: 54,
    right: 0,
    width: 270,
    backgroundColor: COLORS.dropdownBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EDE9FE',
    zIndex: 120,
    paddingVertical: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 32px rgba(124, 58, 237, 0.14), 0 2px 6px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#7C3AED',
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }
    }),
  },
  dropdownCardMobile: {
    right: -10,
    width: 260,
  },
  dropdownUserInfo: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  dropdownUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
  },
  dropdownAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownAvatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.activeText,
  },
  dropdownUserMeta: {
    flex: 1,
  },
  dropdownUserName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textDark,
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
  },
  dropdownUserEmail: {
    fontSize: 11.5,
    color: COLORS.inactiveText,
    marginTop: 1,
  },
  dropdownUserUni: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.activeText,
    marginTop: 2,
  },
  dropdownProgressWrapper: {
    marginTop: 10,
    backgroundColor: '#F9F8FD',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1EEF8',
  },
  dropdownProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropdownProgressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.inactiveText,
  },
  dropdownProgressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.activeText,
  },
  dropdownProgressTrack: {
    height: 5,
    backgroundColor: '#EAE6F3',
    borderRadius: 3,
    overflow: 'hidden',
  },
  dropdownProgressBar: {
    height: '100%',
    backgroundColor: COLORS.activeText,
    borderRadius: 3,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#F1EEF8',
    marginVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    cursor: 'pointer',
  },
  dropdownItemActiveTab: {
    backgroundColor: '#F3E8FF',
  },
  dropdownItemHover: {
    backgroundColor: '#F8F6FD',
  },
  dropdownItemIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
  },
  dropdownItemTextActive: {
    color: COLORS.activeText,
    fontWeight: '700',
  },
  dropdownLogoutItem: {
    marginTop: 2,
  },
  dropdownLogoutHover: {
    backgroundColor: COLORS.dangerBg,
  },
  dropdownLogoutIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  dropdownLogoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
  },

  // Mobile Menu Button & Drawer
  mobileMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    cursor: 'pointer',
  },
  pressedMobileMenu: {
    opacity: 0.8,
  },
  mobileMenuIcon: {
    fontSize: 19,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  mobileNavOverlay: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 990,
  },
  mobileNavBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 27, 46, 0.4)',
  },
  mobileNavDrawer: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: '82%',
    ...Platform.select({
      web: {
        boxShadow: '0 16px 36px rgba(124, 58, 237, 0.2)',
      },
      default: {
        elevation: 8,
      }
    }),
  },
  mobileNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  mobileNavUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mobileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
  },
  mobileAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.activeText,
  },
  mobileUserMeta: {
    flex: 1,
  },
  mobileUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  mobileUserUni: {
    fontSize: 12,
    color: COLORS.inactiveText,
    marginTop: 2,
  },
  mobileCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F1FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCloseIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.inactiveText,
  },
  mobileDivider: {
    height: 1,
    backgroundColor: '#EDE9FE',
    marginVertical: 10,
  },
  mobileNavList: {
    paddingVertical: 4,
    gap: 4,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  mobileNavItemActive: {
    backgroundColor: '#EDE9FE',
  },
  mobileNavIcon: {
    fontSize: 17,
    marginRight: 12,
  },
  mobileNavText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.inactiveText,
    flex: 1,
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
  },
  mobileNavTextActive: {
    color: COLORS.activeText,
    fontWeight: '700',
  },
  mobileActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.activeText,
  },
  mobileLogoutBtn: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    marginTop: 6,
  },
  mobileLogoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
  },

  // Main Page Content
  contentArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Floating AI Mentor Button
  floatingMentorBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: COLORS.activeText,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9999,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 999,
    cursor: 'pointer',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(124, 58, 237, 0.35)',
      }
    }),
  },
  pressedMentorBtn: {
    transform: [{ scale: 0.96 }],
  },
  floatingMentorBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
  },
});
