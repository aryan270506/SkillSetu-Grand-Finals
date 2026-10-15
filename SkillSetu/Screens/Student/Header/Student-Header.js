import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Dashboard from '../Dashboard/Dashboard';
import Profile from '../Profile/Profile';
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
import { AppFrame, SegmentedTabs, useLayout } from '../../../ui/components';
import { space } from '../../../ui/theme';

// Five hubs group the nine student screens. Screen ids are unchanged so every
// existing onNavigate('<ScreenId>') call keeps working.
const HUBS = [
  { id: 'home', label: 'Home', icon: 'House', screens: [{ id: 'Dashboard', label: 'Overview', icon: 'LayoutDashboard' }] },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'User',
    screens: [
      { id: 'Profile', label: 'My profile', icon: 'User' },
      { id: 'Resume', label: 'Resume', icon: 'FileText' },
    ],
  },
  {
    id: 'grow',
    label: 'Grow',
    icon: 'Sprout',
    screens: [
      { id: 'Skills', label: 'Skills', icon: 'Zap' },
      { id: 'Learning', label: 'Learning plan', icon: 'BookOpen' },
    ],
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    shortLabel: 'Jobs',
    icon: 'Briefcase',
    screens: [
      { id: 'Opportunities', label: 'Internships', icon: 'Briefcase' },
      { id: 'Scholarships', label: 'Scholarships', icon: 'GraduationCap' },
      { id: 'Applications', label: 'Applications', icon: 'Send' },
    ],
  },
  { id: 'assess', label: 'Assessments', shortLabel: 'Rounds', icon: 'Target', screens: [{ id: 'Rounds', label: 'Rounds', icon: 'Target' }] },
];

const SCREEN_ALIASES = { Internships: 'Opportunities', Internship: 'Opportunities', Skill: 'Skills', Scholarship: 'Scholarships' };
const hubForScreen = (screenId) => HUBS.find((h) => h.screens.some((s) => s.id === screenId)) || HUBS[0];

export default function StudentHeader({ user, onLogout, onUpdateUser }) {
  const { isCompact } = useLayout();
  const [profileData, setProfileData] = useState(() => createInitialProfile(user));
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [navigationParams, setNavigationParams] = useState({});
  const [showMentor, setShowMentor] = useState(false);
  // Remember the last sub-screen visited inside each hub.
  const [lastScreenByHub, setLastScreenByHub] = useState({});

  useEffect(() => {
    if (user && user.email) {
      setProfileData((prev) => createInitialProfile(user, prev));
      fetchCompleteStudentProfile(user, setProfileData);
    }
  }, [user]);

  const handleNavigate = (tabName, params = {}) => {
    const screenId = SCREEN_ALIASES[tabName] || tabName;
    const hub = hubForScreen(screenId);
    const valid = hub.screens.some((s) => s.id === screenId) ? screenId : hub.screens[0].id;
    setNavigationParams(params || {});
    setActiveTab(valid);
    setLastScreenByHub((m) => ({ ...m, [hub.id]: valid }));
  };

  const activeHub = hubForScreen(activeTab);

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
    } else if (score === 5) {
      percent = 80;
    }
    return percent;
  };

  const studentName = profileData?.personalInfo?.fullName || user?.name || user?.full_name || 'Student';
  const studentEmail = user?.email || profileData?.personalInfo?.email || '';
  const studentAvatarUri = profileData?.personalInfo?.profileImage || user?.profile_image;

  const handleLogout = () => {
    clearOpportunitySessionCache(null, user?.email);
    if (onLogout) onLogout();
  };

  const nav = useMemo(() => HUBS.map(({ id, label, shortLabel, icon }) => ({ id, label, shortLabel, icon })), []);

  const renderActiveScreen = () => {
    switch (activeTab) {
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
        return <Resume user={user} profileData={profileData} />;
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
        return <Learning user={user} profileData={profileData} navigationParams={navigationParams} onNavigate={handleNavigate} />;
      case 'Opportunities':
        return <Internship user={user} profileData={profileData} onNavigate={handleNavigate} />;
      case 'Applications':
        return <Application user={user} profileData={profileData} onNavigate={handleNavigate} />;
      case 'Scholarships':
        return <Scolarship user={user} profileData={profileData} />;
      case 'Rounds':
        return <Rounds user={user} onNavigate={handleNavigate} navigationParams={navigationParams} />;
      case 'Dashboard':
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

  const subNav =
    activeHub.screens.length > 1 ? (
      <View style={{ paddingHorizontal: isCompact ? space.md : space.xxl, paddingTop: isCompact ? space.md : space.xl }}>
        <SegmentedTabs
          options={activeHub.screens.map((s) => ({ id: s.id, label: s.label, icon: s.icon }))}
          value={activeTab}
          onChange={(id) => handleNavigate(id)}
          scrollable={isCompact}
        />
      </View>
    ) : null;

  return (
    <AppFrame
      nav={nav}
      activeId={activeHub.id}
      onNavigate={(hubId) => {
        const hub = HUBS.find((h) => h.id === hubId);
        handleNavigate(lastScreenByHub[hubId] || hub.screens[0].id);
      }}
      user={{ name: studentName, subtitle: studentEmail, email: studentEmail, avatarUri: studentAvatarUri }}
      menuItems={[
        { label: 'My profile', icon: 'User', onPress: () => handleNavigate('Profile') },
        { label: 'Resume', icon: 'FileText', onPress: () => handleNavigate('Resume') },
        { label: 'Applications', icon: 'Send', onPress: () => handleNavigate('Applications') },
        { label: 'Log out', icon: 'LogOut', danger: true, onPress: handleLogout },
      ]}
      dock={[
        { label: 'Ask AI mentor', icon: 'Sparkles', tone: 'accent', onPress: () => setShowMentor(true) },
        { label: 'Find internships', icon: 'Briefcase', tone: 'info', onPress: () => handleNavigate('Opportunities') },
        { label: 'Learning plan', icon: 'BookOpen', tone: 'pink', onPress: () => handleNavigate('Learning') },
        { label: 'Assessment rounds', icon: 'Target', tone: 'warning', onPress: () => handleNavigate('Rounds') },
        { label: 'Skills', icon: 'Zap', tone: 'success', onPress: () => handleNavigate('Skills') },
      ]}
      banner={subNav}
    >
      {renderActiveScreen()}
      <MentorModal
        visible={showMentor}
        onClose={() => setShowMentor(false)}
        user={user}
        profileData={profileData}
        activeTab={activeTab}
        onNavigate={handleNavigate}
      />
    </AppFrame>
  );
}
