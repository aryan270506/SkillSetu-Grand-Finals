import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import RecruiterDashboard from '../Dashboard/Recruter-Dashboard';
import Internship from '../Internship/Internship';
import Applications from '../Applications/Applications';
import Interviews from '../Interviews/Interviews';
import Analytics from '../Analytics/Analytics';
import RecruterProfile from '../Profile/Profile';
import { recruiterService } from '../services/recruiterService';
import InternshipFormModal from '../Internship/InternshipFormModal';
import { AppFrame, Button, Card, EmptyState, IconButton, Page, Pill, ProgressBar, Row, Stack, Txt } from '../../../ui/components';
import { space } from '../../../ui/theme';

import { tl } from '../../../i18n/tl';

const NAV = [
  { id: 'Dashboard', label: 'Dashboard', icon: 'House' },
  { id: 'Internships', label: 'Internships', icon: 'Briefcase' },
  { id: 'Applications', label: 'Candidates', icon: 'Users' },
  { id: 'Assessments', label: 'Assessments', shortLabel: 'Rounds', icon: 'Target' },
  { id: 'Analytics', label: 'Analytics', icon: 'ChartColumn' },
  { id: 'My Profile', label: 'Company', icon: 'Building' },
];
// Older screens still navigate with these ids.
const ALIASES = { Students: 'Applications', Interviews: 'Assessments' };

export default function RecruterHeader({ user, onLogout }) {
  const token = user?.token || user?.access_token || '';
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showPostModal, setShowPostModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [completion, setCompletion] = useState({
    percentage: user?.completion_percentage || 0,
    is_complete: !!user?.profile_completed,
    missing_required_sections: [],
  });

  const loadProfileData = async () => {
    try {
      const data = await recruiterService.getProfile(token);
      if (data) {
        setProfileData(data);
        if (data.completion) setCompletion(data.completion);
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
      if (updatedData.completion) setCompletion(updatedData.completion);
    }
  };

  const navigate = (tab) => setActiveTab(ALIASES[tab] || tab);
  const isLocked = (tab) => !completion.is_complete && tab !== 'My Profile' && tab !== 'Dashboard';

  const name = user?.name || profileData?.recruiter?.name || 'Recruiter';
  const companyName = profileData?.company?.name || user?.company_name || '';

  const renderScreen = () => {
    if (activeTab === 'My Profile') {
      return <RecruterProfile user={user} onProfileUpdated={handleProfileUpdated} onNavigateTab={navigate} />;
    }
    if (isLocked(activeTab)) {
      const pct = completion.percentage || 0;
      return (
        (<Page>
          <Card style={{ maxWidth: 640, alignSelf: 'center', width: '100%' }} badge={{ icon: 'Lock', tone: 'warning' }}>
            <EmptyState
              icon="Lock"
              tone="warning"
              title={tl('{{v0}} is locked', {
                v0: NAV.find((n) => n.id === activeTab)?.label || activeTab
              })}
              message="Complete your company profile to unlock publishing internships, reviewing candidates, assessments and analytics."
            />
            <Stack gap={8}>
              <Row justify="space-between">
                <Txt variant="small" weight={600} tone="ink">Company profile</Txt>
                <Txt variant="small" weight={700} tone="ink">{pct}%</Txt>
              </Row>
              <ProgressBar value={pct} tone="warning" height={10} />
              {completion.missing_required_sections?.length ? (
                <Row wrap gap={6} style={{ marginTop: 6 }}>
                  {completion.missing_required_sections.map((sec) => <Pill key={sec} label={sec} tone="peach" size="sm" />)}
                </Row>
              ) : null}
              <Button label="Complete company profile" iconRight="ArrowRight" onPress={() => setActiveTab('My Profile')} style={{ marginTop: space.md, alignSelf: 'center' }} />
            </Stack>
          </Card>
        </Page>)
      );
    }
    switch (activeTab) {
      case 'Internships':
        return <Internship user={user} onOpenPostModal={() => setShowPostModal(true)} />;
      case 'Applications':
        return <Applications user={user} />;
      case 'Assessments':
        return <Interviews user={user} />;
      case 'Analytics':
        return <Analytics user={user} onNavigateTab={navigate} />;
      default:
        return (
          <RecruiterDashboard
            user={user}
            profileData={profileData}
            completion={completion}
            activeTab={activeTab}
            onNavigateTab={navigate}
            onOpenPostModal={() => setShowPostModal(true)}
          />
        );
    }
  };

  return (
    <AppFrame
      nav={NAV.map((n) => ({ ...n, locked: isLocked(n.id) }))}
      activeId={activeTab}
      onNavigate={navigate}
      user={{ name, subtitle: companyName || user?.email, email: user?.email }}
      actions={
        completion.is_complete ? (
          <IconButton icon="Plus" variant="light" size={40} onPress={() => setShowPostModal(true)} accessibilityLabel="Post internship" />
        ) : null
      }
      menuItems={[
        { label: 'Company profile', icon: 'Building', onPress: () => setActiveTab('My Profile') },
        { label: 'Post internship', icon: 'Plus', onPress: () => (completion.is_complete ? setShowPostModal(true) : setActiveTab('My Profile')) },
        { label: 'Log out', icon: 'LogOut', danger: true, onPress: () => onLogout && onLogout() },
      ]}
      dock={
        completion.is_complete
          ? [
              { label: 'Post internship', icon: 'Plus', tone: 'accent', onPress: () => setShowPostModal(true) },
              { label: 'Candidates', icon: 'Users', tone: 'info', onPress: () => navigate('Applications') },
              { label: 'Assessments', icon: 'Target', tone: 'warning', onPress: () => navigate('Assessments') },
              { label: 'Analytics', icon: 'ChartColumn', tone: 'success', onPress: () => navigate('Analytics') },
            ]
          : []
      }
    >
      <View style={{ flex: 1 }}>{renderScreen()}</View>
      <InternshipFormModal
        visible={showPostModal}
        mode="create"
        token={token}
        onClose={() => setShowPostModal(false)}
        onSuccess={() => loadProfileData()}
      />
    </AppFrame>
  );
}
