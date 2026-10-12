import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { recruiterService } from '../services/recruiterService';

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
  pageBg: '#F8FAFC',
  amberBg: '#FEF3C7',
  amberText: '#92400E',
  blueBg: '#EFF6FF',
  blueText: '#1E40AF',
  cardBg: '#FFFFFF',
  grayTagBg: '#F1F5F9',
  grayTagText: '#334155',
  accentGreen: '#10B981',
  dangerRed: '#EF4444',
};

// Hover Animated Card Wrapper
function HoverCard({ children, style }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleMouseEnter = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.015,
      friction: 8,
      tension: 80,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handleMouseLeave = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 80,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Animated.View
      style={[style, { transform: [{ scale: scaleAnim }] }]}
      // @ts-ignore - Web interactive props
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </Animated.View>
  );
}

// Hover Animated Button
function HoverButton({ children, style, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleMouseEnter = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.04,
      friction: 7,
      tension: 90,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handleMouseLeave = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[style, { transform: [{ scale: scaleAnim }] }]}
        // @ts-ignore - Web interactive props
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function RecruterProfile({ user, onProfileUpdated, onNavigateTab }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 1000;
  const token = user?.token || user?.access_token || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // 1. Company Identity & Details
  const [companyInfo, setCompanyInfo] = useState({
    name: user?.companyName || user?.company_name || 'My Organization',
    industry: 'Information Technology & Software',
    location: 'Pune, Maharashtra',
    founded: '2015',
    employees: '500-1,000 employees',
    website: 'company.com',
    email: user?.email || 'careers@company.com',
    companyType: 'Private Ltd',
    workLocations: 'Pune, Maharashtra',
  });

  // 2. About Company
  const [aboutData, setAboutData] = useState({
    description: '',
    mission: '',
    vision: '',
  });

  // 3. Culture & Benefits
  const [cultureData, setCultureData] = useState({
    cultureTags: [],
    perks: [],
  });

  // 4. Internship Preferences
  const [preferencesData, setPreferencesData] = useState({
    domains: [],
    skills: [],
    workMode: 'Hybrid',
    duration: '3-6 Months',
  });

  // 5. Hiring Process Steps
  const [hiringProcessSteps, setHiringProcessSteps] = useState([]);

  // 6. Company Locations
  const [locationsList, setLocationsList] = useState([]);

  // 7. Hiring Team
  const [hiringTeam, setHiringTeam] = useState([]);

  // 8. Social Links
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    linkedin: '',
    github: '',
    instagram: '',
    twitter: '',
  });

  // 9. Trust & Safety Verification
  const [verificationData, setVerificationData] = useState({
    company_email_verified: true,
    website_verified: true,
    business_verified: true,
    recruiter_verified: true,
  });

  // 10. Active Postings
  const [activePostings, setActivePostings] = useState([]);

  // 11. Backend Calculated Completion
  const [completion, setCompletion] = useState({
    percentage: 0,
    is_complete: false,
    missing_required_sections: [],
  });

  // Edit Modals State
  const [editModalSection, setEditModalSection] = useState(null); // 'about' | 'company' | 'culture' | 'preferences' | 'process' | 'social' | 'location_add' | 'team_add' | 'verification'
  const [modalForm, setModalForm] = useState({});

  // Fetch full authoritative profile from PostgreSQL on mount
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await recruiterService.getProfile(token);
      applyProfileData(data);
    } catch (err) {
      console.warn('Error fetching recruiter profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const applyProfileData = (data) => {
    if (!data) return;

    if (data.company) {
      setCompanyInfo({
        name: data.company.name || '',
        industry: data.company.industry || '',
        location: data.company.headquarters || data.company.location || 'Pune, Maharashtra',
        founded: data.company.founded || '2015',
        employees: data.company.employees || data.company.company_size || '500-1,000 employees',
        website: data.company.website || '',
        email: data.company.email || '',
        companyType: data.company.company_type || 'Private Ltd',
        workLocations: data.company.work_locations || data.company.headquarters || 'Pune, Maharashtra',
      });
    }

    if (data.about) {
      setAboutData({
        description: data.about.description || '',
        mission: data.about.mission || '',
        vision: data.about.vision || '',
      });
    }

    if (data.culture) {
      setCultureData({
        cultureTags: Array.isArray(data.culture.culture_tags) ? data.culture.culture_tags : [],
        perks: Array.isArray(data.culture.perks) ? data.culture.perks : [],
      });
    }

    if (data.preferences) {
      setPreferencesData({
        domains: Array.isArray(data.preferences.domains) ? data.preferences.domains : [],
        skills: Array.isArray(data.preferences.skills) ? data.preferences.skills : [],
        workMode: data.preferences.work_mode || 'Hybrid',
        duration: data.preferences.duration || '3-6 Months',
      });
    }

    if (Array.isArray(data.hiring_process)) {
      setHiringProcessSteps(data.hiring_process);
    }

    if (Array.isArray(data.locations)) {
      setLocationsList(data.locations);
    }

    if (Array.isArray(data.hiring_team)) {
      setHiringTeam(data.hiring_team);
    }

    if (data.social_links) {
      setSocialLinks({
        website: data.social_links.website || '',
        linkedin: data.social_links.linkedin || '',
        github: data.social_links.github || '',
        instagram: data.social_links.instagram || '',
        twitter: data.social_links.twitter || '',
      });
    }

    if (data.verification) {
      setVerificationData({
        company_email_verified: !!data.verification.company_email_verified,
        website_verified: !!data.verification.website_verified,
        business_verified: !!data.verification.business_verified,
        recruiter_verified: !!data.verification.recruiter_verified,
      });
    }

    if (data.completion) {
      setCompletion(data.completion);
    }

    if (onProfileUpdated) {
      onProfileUpdated(data);
    }
  };

  const showSuccessFeedback = (msg) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 4000);
  };

  // Open Edit Modal for a card
  const handleOpenEdit = (section) => {
    setEditModalSection(section);
    if (section === 'about') {
      setModalForm({ ...aboutData });
    } else if (section === 'company') {
      setModalForm({
        name: companyInfo.name,
        industry: companyInfo.industry,
        companyType: companyInfo.companyType,
        employees: companyInfo.employees,
        founded: companyInfo.founded,
        location: companyInfo.location,
        website: companyInfo.website,
        email: companyInfo.email,
      });
    } else if (section === 'culture') {
      setModalForm({
        cultureTags: cultureData.cultureTags.join(', '),
        perks: cultureData.perks.join(', '),
      });
    } else if (section === 'preferences') {
      setModalForm({
        domains: preferencesData.domains.join(', '),
        skills: preferencesData.skills.join(', '),
        workMode: preferencesData.workMode,
        duration: preferencesData.duration,
      });
    } else if (section === 'process') {
      setModalForm({
        stagesText: hiringProcessSteps.map((st) => `${st.title} | ${st.desc}`).join('\n'),
      });
    } else if (section === 'social') {
      setModalForm({ ...socialLinks });
    } else if (section === 'location_add') {
      setModalForm({ title: '', sub: '', badge: 'Branch', is_primary: false });
    } else if (section === 'team_add') {
      setModalForm({ name: '', email: '', phone: '', designation: 'Recruiter' });
    }
  };

  // Save Modal Edits to PostgreSQL via backend APIs
  const handleSaveModal = async () => {
    setSaving(true);
    try {
      let updatedResponse = null;

      if (editModalSection === 'about') {
        updatedResponse = await recruiterService.updateCompanyAbout(token, {
          description: modalForm.description || '',
          mission: modalForm.mission || '',
          vision: modalForm.vision || '',
        });
        showSuccessFeedback('✓ About Company & Story saved to database.');
      } else if (editModalSection === 'company') {
        updatedResponse = await recruiterService.updateCompanyIdentity(token, {
          name: modalForm.name,
          industry: modalForm.industry,
          company_type: modalForm.companyType,
          company_size: modalForm.employees,
          founded_year: modalForm.founded,
          headquarters: modalForm.location,
          website: modalForm.website,
          email: modalForm.email,
        });
        showSuccessFeedback('✓ Company Details & Identity saved to database.');
      } else if (editModalSection === 'culture') {
        const tags = modalForm.cultureTags
          ? modalForm.cultureTags.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const perks = modalForm.perks
          ? modalForm.perks.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        updatedResponse = await recruiterService.updateCompanyCulture(token, {
          culture_tags: tags,
          perks: perks,
        });
        showSuccessFeedback('✓ Culture & Benefits saved to database.');
      } else if (editModalSection === 'preferences') {
        const domains = modalForm.domains
          ? modalForm.domains.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const skills = modalForm.skills
          ? modalForm.skills.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        updatedResponse = await recruiterService.updateCompanyPreferences(token, {
          domains: domains,
          skills: skills,
          work_mode: modalForm.workMode || 'Hybrid',
          duration: modalForm.duration || '3-6 Months',
        });
        showSuccessFeedback('✓ Internship Preferences & Canonical Skills saved.');
      } else if (editModalSection === 'process') {
        const lines = (modalForm.stagesText || '').split('\n').filter((l) => l.trim());
        const parsedStages = lines.map((line, idx) => {
          const parts = line.split('|');
          return {
            id: `${idx + 1 < 10 ? '0' : ''}${idx + 1}`,
            order: idx + 1,
            title: parts[0]?.trim() || `Stage ${idx + 1}`,
            desc: parts[1]?.trim() || '',
            type: 'interview',
            is_active: true,
          };
        });
        updatedResponse = await recruiterService.updateHiringProcess(token, parsedStages);
        showSuccessFeedback('✓ Hiring Process stages saved to database.');
      } else if (editModalSection === 'social') {
        updatedResponse = await recruiterService.updateSocialLinks(token, modalForm);
        showSuccessFeedback('✓ Social & External links saved to database.');
      } else if (editModalSection === 'location_add') {
        if (!modalForm.title?.trim()) {
          alert('Location title is required (e.g. Pune, Maharashtra)');
          setSaving(false);
          return;
        }
        updatedResponse = await recruiterService.addCompanyLocation(token, {
          title: modalForm.title.trim(),
          sub: modalForm.sub?.trim() || '',
          badge: modalForm.badge || 'Branch',
          is_primary: !!modalForm.is_primary,
        });
        showSuccessFeedback('✓ New location added to database.');
      } else if (editModalSection === 'team_add') {
        if (!modalForm.name?.trim() || !modalForm.email?.trim()) {
          alert('Name and Email are required.');
          setSaving(false);
          return;
        }
        updatedResponse = await recruiterService.addTeamMember(token, {
          name: modalForm.name.trim(),
          email: modalForm.email.trim(),
          phone: modalForm.phone?.trim() || '',
          designation: modalForm.designation?.trim() || 'Recruiter',
        });
        showSuccessFeedback('✓ Team member added to your company team.');
      }

      if (updatedResponse) {
        applyProfileData(updatedResponse);
      }
      setEditModalSection(null);
    } catch (err) {
      alert(err.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (locId) => {
    try {
      const res = await recruiterService.deleteCompanyLocation(token, locId);
      applyProfileData(res);
      showSuccessFeedback('✓ Location deleted from database.');
    } catch (err) {
      alert(err.message || 'Failed to delete location.');
    }
  };

  const handleToggleVerification = async (key) => {
    try {
      const payload = { [key]: !verificationData[key] };
      const res = await recruiterService.updateVerification(token, payload);
      applyProfileData(res);
      showSuccessFeedback('✓ Verification status updated in database.');
    } catch (err) {
      alert(err.message || 'Failed to update verification.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryTeal} />
          <Text style={styles.loadingText}>Restoring company profile from PostgreSQL...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Success Banner Notification */}
          {saveSuccessMsg ? (
            <View style={styles.successToast}>
              <Text style={styles.successToastText}>{saveSuccessMsg}</Text>
            </View>
          ) : null}

          {/* Page Header */}
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.breadcrumb}>
                RECRUITER WORKSPACE • Organization Settings & Public Showcase
              </Text>
              <Text style={styles.pageTitle}>Company Profile</Text>
              <Text style={styles.pageSub}>
                Manage your company's information, showcase culture, and configure hiring presence on SkillSetu.
              </Text>
            </View>
            <View style={styles.headerActionsRight}>
              <View style={styles.completionContainer}>
                <Text style={styles.completionLabel}>Authoritative DB Completion</Text>
                <Text style={[styles.completionValue, completion.is_complete && { color: COLORS.accentGreen }]}>
                  {completion.percentage}% {completion.is_complete ? '✓ Complete' : ''}
                </Text>
              </View>
              <HoverButton
                style={styles.editProfileMainBtn}
                onPress={() => handleOpenEdit('company')}
              >
                <Text style={styles.editProfileMainBtnText}>✏️ Edit Profile</Text>
              </HoverButton>
            </View>
          </View>

          {/* Checklist of Mandatory Sections */}
          <View style={styles.checklistCard}>
            <View style={styles.checklistHeader}>
              <Text style={styles.checklistTitle}>
                {completion.is_complete ? '🎉 Company Profile Complete & Verified' : '📋 Profile Completion Checklist'}
              </Text>
              <Text style={styles.checklistStatus}>
                {completion.is_complete ? 'Workspace Unlocked' : `${completion.percentage}% Completed (Required: 80%+)`}
              </Text>
            </View>
            <View style={styles.checklistGrid}>
              {[
                { title: 'Company Identity', key: 'company', done: !!(companyInfo.name && companyInfo.email && companyInfo.website) },
                { title: 'Company Description & Vision', key: 'about', done: !!(aboutData.description && aboutData.description.length >= 20) },
                { title: 'Details & Locations', key: 'location_add', done: !!(companyInfo.location && locationsList.length >= 1) },
                { title: 'Culture & Benefits', key: 'culture', done: cultureData.cultureTags.length >= 1 && cultureData.perks.length >= 1 },
                { title: 'Internship Preferences', key: 'preferences', done: preferencesData.domains.length >= 1 && preferencesData.skills.length >= 1 },
                { title: 'Hiring Process', key: 'process', done: hiringProcessSteps.length >= 1 },
                { title: 'Trust & Verification', key: 'verification', done: !!verificationData.company_email_verified },
              ].map((item, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleOpenEdit(item.key)}
                  style={[styles.checklistItem, item.done ? styles.checklistItemDone : styles.checklistItemPending]}
                >
                  <Text style={item.done ? styles.checkIconDone : styles.checkIconPending}>
                    {item.done ? '✓' : '○'}
                  </Text>
                  <Text style={[styles.checklistLabel, item.done && styles.checklistLabelDone]}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Hero Card */}
          <HoverCard style={styles.heroCard}>
            <View style={styles.heroContentRow}>
              <View style={styles.logoSquare}>
                <Text style={styles.logoSquareText}>
                  {companyInfo.name ? companyInfo.name.substring(0, 3).toUpperCase() : 'COM'}
                </Text>
                <Text style={styles.logoSquareSub}>
                  {companyInfo.companyType ? companyInfo.companyType.substring(0, 4) : 'Org'}
                </Text>
              </View>
              <View style={styles.heroInfoColumn}>
                <View style={styles.heroTitleRow}>
                  <Text style={styles.companyNameText}>{companyInfo.name || 'Your Company Name'}</Text>
                  {verificationData.company_email_verified && (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>✓ Verified Company</Text>
                    </View>
                  )}
                  <View style={styles.activeProfileBadge}>
                    <View style={styles.greenDotSmall} />
                    <Text style={styles.activeProfileBadgeText}>
                      {completion.is_complete ? 'Workspace Active' : 'Profile Setup In Progress'}
                    </Text>
                  </View>
                </View>
                <View style={styles.heroMetaRow}>
                  <Text style={styles.heroMetaItem}>🏢 {companyInfo.industry || 'Tech'}</Text>
                  <Text style={styles.heroMetaDot}>•</Text>
                  <Text style={styles.heroMetaItem}>📍 {companyInfo.location || 'Pune, India'}</Text>
                  <Text style={styles.heroMetaDot}>•</Text>
                  <Text style={styles.heroMetaItem}>📅 Founded: {companyInfo.founded}</Text>
                  <Text style={styles.heroMetaDot}>•</Text>
                  <Text style={styles.heroMetaItem}>👥 {companyInfo.employees}</Text>
                  <Text style={styles.heroMetaDot}>•</Text>
                  <Text style={styles.heroMetaLink}>🌐 {companyInfo.website || 'website.com'}</Text>
                </View>
              </View>
              <View style={styles.heroRightActions}>
                <HoverButton style={styles.previewBtn} onPress={() => handleOpenEdit('company')}>
                  <Text style={styles.previewBtnText}>✏️ Edit Identity</Text>
                </HoverButton>
              </View>
            </View>
          </HoverCard>

          {/* Metric Cards Grid */}
          <View style={styles.metricsRow}>
            <HoverCard style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>ACTIVE INTERNSHIPS</Text>
                <View style={styles.metricIconBgTeal}>
                  <Text style={styles.metricIcon}>💼</Text>
                </View>
              </View>
              <Text style={styles.metricValue}>{hiringProcessSteps.length >= 1 ? '1' : '0'}</Text>
              <Text style={styles.metricSub}>Accepting applicants</Text>
            </HoverCard>

            <HoverCard style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>TOTAL APPLICATIONS</Text>
                <View style={styles.metricIconBgBlue}>
                  <Text style={styles.metricIcon}>👥</Text>
                </View>
              </View>
              <Text style={styles.metricValue}>0</Text>
              <Text style={styles.metricSubBlue}>Connected to PostgreSQL</Text>
            </HoverCard>

            <HoverCard style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>HIRING TEAM MEMBERS</Text>
                <View style={styles.metricIconBgGreen}>
                  <Text style={styles.metricIcon}>🎓</Text>
                </View>
              </View>
              <Text style={styles.metricValue}>{hiringTeam.length}</Text>
              <Text style={styles.metricSub}>Recruiters in company</Text>
            </HoverCard>

            <HoverCard style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>OFFICES & LOCATIONS</Text>
                <View style={styles.metricIconBgAmber}>
                  <Text style={styles.metricIcon}>📍</Text>
                </View>
              </View>
              <Text style={styles.metricValue}>{locationsList.length}</Text>
              <Text style={styles.metricSubAmber}>Configured hubs</Text>
            </HoverCard>
          </View>

          {/* Main Content 2-Column Grid */}
          <View style={[styles.mainGrid, isCompact && styles.mainGridCompact]}>
            {/* Left Main Column */}
            <View style={styles.leftColumn}>
              {/* Card 1: About Company */}
              <HoverCard style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Text style={styles.cardHeaderIcon}>ℹ️</Text>
                    <Text style={styles.cardHeaderTitle}>About Company</Text>
                  </View>
                  <HoverButton
                    style={styles.pencilEditBtn}
                    onPress={() => handleOpenEdit('about')}
                  >
                    <Text style={styles.pencilEditBtnText}>✏️ Edit</Text>
                  </HoverButton>
                </View>
                <Text style={styles.aboutParagraph}>
                  {aboutData.description || 'Add your company overview and story to introduce your engineering organization to prospective interns.'}
                </Text>
                <View style={styles.missionVisionRow}>
                  <View style={styles.missionCard}>
                    <Text style={styles.mvTitle}>💡 OUR MISSION</Text>
                    <Text style={styles.mvText}>"{aboutData.mission || 'Define your company mission.'}"</Text>
                  </View>
                  <View style={styles.visionCard}>
                    <Text style={styles.mvTitle}>👁️ OUR VISION</Text>
                    <Text style={styles.mvText}>"{aboutData.vision || 'Define your company vision.'}"</Text>
                  </View>
                </View>
              </HoverCard>

              {/* Card 2: Culture & Benefits */}
              <HoverCard style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Text style={styles.cardHeaderIcon}>🌱</Text>
                    <Text style={styles.cardHeaderTitle}>Culture & Benefits</Text>
                  </View>
                  <HoverButton
                    style={styles.pencilEditBtn}
                    onPress={() => handleOpenEdit('culture')}
                  >
                    <Text style={styles.pencilEditBtnText}>✏️ Edit</Text>
                  </HoverButton>
                </View>
                <Text style={styles.sectionSubTitle}>COMPANY CULTURE</Text>
                <Text style={styles.sectionDescText}>
                  The core values shaping your engineering and intern experience.
                </Text>
                <View style={styles.tagsFlexRow}>
                  {cultureData.cultureTags.length > 0 ? (
                    cultureData.cultureTags.map((tag, idx) => (
                      <View key={idx} style={styles.culturePill}>
                        <Text style={styles.culturePillText}>💡 {tag}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyPromptText}>No culture tags added yet. Click Edit to add.</Text>
                  )}
                </View>

                <Text style={[styles.sectionSubTitle, { marginTop: 20 }]}>BENEFITS & PERKS</Text>
                <View style={styles.perksGrid}>
                  {cultureData.perks.length > 0 ? (
                    cultureData.perks.map((perk, idx) => (
                      <View key={idx} style={styles.perkBox}>
                        <Text style={styles.perkBoxText}>✓ {perk}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyPromptText}>No perks added yet. Click Edit to add.</Text>
                  )}
                </View>
              </HoverCard>

              {/* Card 3: Internship Preferences */}
              <HoverCard style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Text style={styles.cardHeaderIcon}>🎯</Text>
                    <Text style={styles.cardHeaderTitle}>Internship Preferences</Text>
                  </View>
                  <HoverButton
                    style={styles.pencilEditBtn}
                    onPress={() => handleOpenEdit('preferences')}
                  >
                    <Text style={styles.pencilEditBtnText}>✏️ Edit</Text>
                  </HoverButton>
                </View>
                <View style={styles.prefTwoCol}>
                  <View style={styles.prefCol}>
                    <Text style={styles.prefLabel}>PREFERRED DOMAINS</Text>
                    <View style={styles.tagsFlexRow}>
                      {preferencesData.domains.length > 0 ? (
                        preferencesData.domains.map((dom, idx) => (
                          <View key={idx} style={styles.grayTag}>
                            <Text style={styles.grayTagText}>{dom}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyPromptText}>Add preferred domains</Text>
                      )}
                    </View>
                    <Text style={[styles.prefLabel, { marginTop: 16 }]}>PREFERRED WORK MODE</Text>
                    <View style={styles.tagsFlexRow}>
                      {['Remote', 'Hybrid', 'On-site'].map((mode) => {
                        const isSel = (preferencesData.workMode || '').includes(mode);
                        return (
                          <View
                            key={mode}
                            style={[styles.modeTag, isSel && styles.modeTagActive]}
                          >
                            <Text style={[styles.modeTagText, isSel && styles.modeTagActiveText]}>
                              {isSel ? '✓ ' : ''}{mode}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.prefCol}>
                    <Text style={styles.prefLabel}>CANONICAL PREFERRED SKILLS</Text>
                    <View style={styles.tagsFlexRow}>
                      {preferencesData.skills.length > 0 ? (
                        preferencesData.skills.map((sk, idx) => (
                          <View key={idx} style={styles.mintTag}>
                            <Text style={styles.mintTagText}>⚡ {sk}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyPromptText}>Add canonical skills</Text>
                      )}
                    </View>
                    <Text style={[styles.prefLabel, { marginTop: 16 }]}>PREFERRED DURATION</Text>
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationBadgeText}>
                        ⏱️ {preferencesData.duration || '3-6 Months'}
                      </Text>
                    </View>
                  </View>
                </View>
              </HoverCard>

              {/* Card 4: Hiring Process */}
              <HoverCard style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Text style={styles.cardHeaderIcon}>⚙️</Text>
                    <Text style={styles.cardHeaderTitle}>Hiring Process</Text>
                  </View>
                  <HoverButton
                    style={styles.pencilEditBtn}
                    onPress={() => handleOpenEdit('process')}
                  >
                    <Text style={styles.pencilEditBtnText}>✏️ Edit Hiring Process</Text>
                  </HoverButton>
                </View>
                <Text style={styles.sectionDescText}>
                  Standardized candidate selection funnel for technical cohorts in PostgreSQL.
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.processScroll}>
                  <View style={styles.processStepsRow}>
                    {hiringProcessSteps.length > 0 ? (
                      hiringProcessSteps.map((step, index) => (
                        <View key={step.id || index} style={styles.processStepCard}>
                          <View style={styles.stepHeaderRow}>
                            <Text style={styles.stepNumText}>{step.id || `${index + 1}`}</Text>
                            <Text style={styles.stepCheckIcon}>
                              {index === hiringProcessSteps.length - 1 ? '✓' : '•'}
                            </Text>
                          </View>
                          <Text style={styles.stepTitleText}>{step.title}</Text>
                          <Text style={styles.stepDescText}>{step.desc}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyStepPrompt}>
                        <Text style={styles.emptyPromptText}>No stages configured. Click Edit to create your workflow.</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </HoverCard>
            </View>

            {/* Right Sidebar Column */}
            <View style={styles.rightColumn}>
              {/* Trust & Safety Box */}
              <View style={styles.trustCard}>
                <View style={styles.trustHeader}>
                  <Text style={styles.trustShieldIcon}>🛡️</Text>
                  <View>
                    <Text style={styles.trustTitle}>SKILLSETU TRUST & SAFETY</Text>
                    <Text style={styles.trustSub}>
                      {verificationData.company_email_verified ? '✓ Verified Company' : 'Verification Required'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.trustDesc}>
                  Authoritative verification records maintained in PostgreSQL.
                </Text>
                
                <Pressable onPress={() => handleToggleVerification('company_email_verified')} style={styles.trustItem}>
                  <Text style={styles.trustItemText}>
                    {verificationData.company_email_verified ? '✓' : '○'} Company Email Verified
                  </Text>
                  <Text style={verificationData.company_email_verified ? styles.trustBadgeGreen : styles.trustBadgePending}>
                    {verificationData.company_email_verified ? 'Active' : 'Verify'}
                  </Text>
                </Pressable>

                <Pressable onPress={() => handleToggleVerification('website_verified')} style={styles.trustItem}>
                  <Text style={styles.trustItemText}>
                    {verificationData.website_verified ? '✓' : '○'} Website Verified
                  </Text>
                  <Text style={verificationData.website_verified ? styles.trustBadgeGreen : styles.trustBadgePending}>
                    {verificationData.website_verified ? 'SSL OK' : 'Verify'}
                  </Text>
                </Pressable>

                <Pressable onPress={() => handleToggleVerification('business_verified')} style={styles.trustItem}>
                  <Text style={styles.trustItemText}>
                    {verificationData.business_verified ? '✓' : '○'} Business Information Verified
                  </Text>
                  <Text style={verificationData.business_verified ? styles.trustBadgeGreen : styles.trustBadgePending}>
                    {verificationData.business_verified ? 'CIN Confirmed' : 'Verify'}
                  </Text>
                </Pressable>

                <Pressable onPress={() => handleToggleVerification('recruiter_verified')} style={styles.trustItem}>
                  <Text style={styles.trustItemText}>
                    {verificationData.recruiter_verified ? '✓' : '○'} Recruiter Identity Verified
                  </Text>
                  <Text style={verificationData.recruiter_verified ? styles.trustBadgeGreen : styles.trustBadgePending}>
                    {verificationData.recruiter_verified ? 'Govt ID' : 'Verify'}
                  </Text>
                </Pressable>

                <View style={styles.trustFooterBadge}>
                  <Text style={styles.trustFooterText}>
                    🔒 Verified badge gives your internship postings up to 3.4x higher student trust & engagement.
                  </Text>
                </View>
              </View>

              {/* Company Details Sidebar */}
              <HoverCard style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.sidebarCardTitle}>Company Details</Text>
                  <HoverButton
                    style={styles.pencilEditBtn}
                    onPress={() => handleOpenEdit('company')}
                  >
                    <Text style={styles.pencilEditBtnText}>✏️</Text>
                  </HoverButton>
                </View>
                <View style={styles.detailRowGrid}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Industry</Text>
                    <Text style={styles.detailValue}>{companyInfo.industry}</Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Company Type</Text>
                    <Text style={styles.detailValue}>{companyInfo.companyType}</Text>
                  </View>
                </View>
                <View style={[styles.detailRowGrid, { marginTop: 12 }]}>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Company Size</Text>
                    <Text style={styles.detailValue}>{companyInfo.employees}</Text>
                  </View>
                  <View style={styles.detailCol}>
                    <Text style={styles.detailLabel}>Founded Year</Text>
                    <Text style={styles.detailValue}>{companyInfo.founded}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.detailLabel}>Headquarters</Text>
                  <Text style={styles.detailValue}>{companyInfo.location}</Text>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.detailLabel}>Official Website</Text>
                  <Text style={styles.detailLink}>{companyInfo.website}</Text>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.detailLabel}>Company Email</Text>
                  <Text style={styles.detailValue}>{companyInfo.email}</Text>
                </View>
              </HoverCard>

              {/* Hiring Team Sidebar */}
              <HoverCard style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderTitleRow}>
                    <Text style={styles.sidebarCardTitle}>Hiring Team</Text>
                    <Text style={styles.teamCountBadge}>{hiringTeam.length}</Text>
                  </View>
                  <HoverButton style={styles.addRecruiterBtn} onPress={() => handleOpenEdit('team_add')}>
                    <Text style={styles.addRecruiterBtnText}>+ Add Recruiter</Text>
                  </HoverButton>
                </View>

                {hiringTeam.map((member) => (
                  <View key={member.id} style={styles.teamMemberRow}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{member.avatar || 'R'}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberRole}>{member.role}</Text>
                    </View>
                    <View style={member.tag === 'You' ? styles.tagYou : styles.tagActive}>
                      <Text style={member.tag === 'You' ? styles.tagYouText : styles.tagActiveText}>
                        {member.tag}
                      </Text>
                    </View>
                  </View>
                ))}
              </HoverCard>

              {/* Company Locations */}
              <HoverCard style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.sidebarCardTitle}>Company Locations</Text>
                  <HoverButton style={styles.addLocationBtn} onPress={() => handleOpenEdit('location_add')}>
                    <Text style={styles.addLocationBtnText}>+ Add Location</Text>
                  </HoverButton>
                </View>

                {locationsList.length > 0 ? (
                  locationsList.map((loc) => (
                    <View key={loc.id} style={styles.locationCard}>
                      <Text style={styles.locationIcon}>📍</Text>
                      <View style={styles.locationTextCol}>
                        <Text style={styles.locationTitle}>{loc.title}</Text>
                        {loc.sub ? <Text style={styles.locationSub}>{loc.sub}</Text> : null}
                      </View>
                      <View style={styles.locationBadge}>
                        <Text style={styles.locationBadgeText}>{loc.badge}</Text>
                      </View>
                      <Pressable
                        onPress={() => handleDeleteLocation(loc.id)}
                        style={styles.deleteLocBtn}
                      >
                        <Text style={styles.deleteLocText}>✕</Text>
                      </Pressable>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyPromptText}>No additional locations added yet.</Text>
                )}
              </HoverCard>

              {/* Social & External Links */}
              <HoverCard style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.sidebarCardTitle}>Social & External Links</Text>
                  <HoverButton
                    style={styles.pencilEditBtn}
                    onPress={() => handleOpenEdit('social')}
                  >
                    <Text style={styles.pencilEditBtnText}>✏️</Text>
                  </HoverButton>
                </View>

                <View style={styles.socialLinkRow}>
                  <Text style={styles.socialIcon}>🌐</Text>
                  <Text style={styles.socialLabel}>Website</Text>
                  <Text style={styles.socialValue}>{socialLinks.website || 'Not set'}</Text>
                </View>

                <View style={styles.socialLinkRow}>
                  <Text style={styles.socialIcon}>💼</Text>
                  <Text style={styles.socialLabel}>LinkedIn</Text>
                  <Text style={styles.socialValue}>{socialLinks.linkedin || 'Not set'}</Text>
                </View>

                <View style={styles.socialLinkRow}>
                  <Text style={styles.socialIcon}>💻</Text>
                  <Text style={styles.socialLabel}>GitHub</Text>
                  <Text style={styles.socialValue}>{socialLinks.github || 'Not set'}</Text>
                </View>

                <View style={styles.socialLinkRow}>
                  <Text style={styles.socialIcon}>📸</Text>
                  <Text style={styles.socialLabel}>Instagram</Text>
                  <Text style={styles.socialValue}>{socialLinks.instagram || 'Not set'}</Text>
                </View>

                <View style={styles.socialLinkRow}>
                  <Text style={styles.socialIcon}>🐦</Text>
                  <Text style={styles.socialLabel}>X (Twitter)</Text>
                  <Text style={styles.socialValue}>{socialLinks.twitter || 'Not set'}</Text>
                </View>
              </HoverCard>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Dynamic Section Modal */}
      <Modal
        visible={editModalSection !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalSection(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                ✏️ Edit {
                  editModalSection === 'about' ? 'About Company' :
                  editModalSection === 'company' ? 'Company Details & Identity' :
                  editModalSection === 'culture' ? 'Culture & Benefits' :
                  editModalSection === 'preferences' ? 'Internship Preferences' :
                  editModalSection === 'process' ? 'Hiring Process Workflow' :
                  editModalSection === 'location_add' ? 'Add Company Location' :
                  editModalSection === 'team_add' ? 'Add Hiring Team Member' :
                  'Social & External Links'
                }
              </Text>
              <Pressable onPress={() => setEditModalSection(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {editModalSection === 'about' && (
                <>
                  <Text style={styles.inputLabel}>Company Overview & Story *</Text>
                  <TextInput
                    style={[styles.input, { height: 120 }]}
                    multiline
                    placeholder="Provide a comprehensive description of your company..."
                    value={modalForm.description}
                    onChangeText={(text) => setModalForm({ ...modalForm, description: text })}
                  />

                  <Text style={styles.inputLabel}>Our Mission</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Empowering developers with scalable cloud tools..."
                    value={modalForm.mission}
                    onChangeText={(text) => setModalForm({ ...modalForm, mission: text })}
                  />

                  <Text style={styles.inputLabel}>Our Vision</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. To be the leading engineering talent launchpad..."
                    value={modalForm.vision}
                    onChangeText={(text) => setModalForm({ ...modalForm, vision: text })}
                  />
                </>
              )}

              {editModalSection === 'company' && (
                <>
                  <Text style={styles.inputLabel}>Company Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.name}
                    onChangeText={(text) => setModalForm({ ...modalForm, name: text })}
                  />

                  <Text style={styles.inputLabel}>Industry *</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.industry}
                    onChangeText={(text) => setModalForm({ ...modalForm, industry: text })}
                  />

                  <Text style={styles.inputLabel}>Company Type</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Private Ltd, Public Ltd, Startup"
                    value={modalForm.companyType}
                    onChangeText={(text) => setModalForm({ ...modalForm, companyType: text })}
                  />

                  <Text style={styles.inputLabel}>Headquarters Location *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Pune, Maharashtra"
                    value={modalForm.location}
                    onChangeText={(text) => setModalForm({ ...modalForm, location: text })}
                  />

                  <Text style={styles.inputLabel}>Company Size *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 500-1,000 employees"
                    value={modalForm.employees}
                    onChangeText={(text) => setModalForm({ ...modalForm, employees: text })}
                  />

                  <Text style={styles.inputLabel}>Founded Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 2015"
                    value={modalForm.founded}
                    onChangeText={(text) => setModalForm({ ...modalForm, founded: text })}
                  />

                  <Text style={styles.inputLabel}>Official Website *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. abctechnologies.io"
                    value={modalForm.website}
                    onChangeText={(text) => setModalForm({ ...modalForm, website: text })}
                  />

                  <Text style={styles.inputLabel}>Company Careers Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. careers@abctechnologies.io"
                    value={modalForm.email}
                    onChangeText={(text) => setModalForm({ ...modalForm, email: text })}
                  />
                </>
              )}

              {editModalSection === 'culture' && (
                <>
                  <Text style={styles.inputLabel}>Company Culture Tags (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Collaborative, Fast-Paced, Mentorship-Driven"
                    value={modalForm.cultureTags}
                    onChangeText={(text) => setModalForm({ ...modalForm, cultureTags: text })}
                  />

                  <Text style={styles.inputLabel}>Benefits & Perks (comma separated)</Text>
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    multiline
                    placeholder="Monthly Stipend, 1:1 Mentorship, MacBook Pro, PPO Opportunities"
                    value={modalForm.perks}
                    onChangeText={(text) => setModalForm({ ...modalForm, perks: text })}
                  />
                </>
              )}

              {editModalSection === 'preferences' && (
                <>
                  <Text style={styles.inputLabel}>Preferred Domains (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Software Development, AI / ML, Data Science, Cloud Engineering"
                    value={modalForm.domains}
                    onChangeText={(text) => setModalForm({ ...modalForm, domains: text })}
                  />

                  <Text style={styles.inputLabel}>Canonical Skills (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="React, Node.js, Python, PostgreSQL, Docker, FastAPI"
                    value={modalForm.skills}
                    onChangeText={(text) => setModalForm({ ...modalForm, skills: text })}
                  />

                  <Text style={styles.inputLabel}>Preferred Work Mode</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Hybrid, Remote, or On-site"
                    value={modalForm.workMode}
                    onChangeText={(text) => setModalForm({ ...modalForm, workMode: text })}
                  />

                  <Text style={styles.inputLabel}>Preferred Duration</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="3-6 Months"
                    value={modalForm.duration}
                    onChangeText={(text) => setModalForm({ ...modalForm, duration: text })}
                  />
                </>
              )}

              {editModalSection === 'process' && (
                <>
                  <Text style={styles.inputLabel}>
                    Hiring Stages (One stage per line in format: Title | Description)
                  </Text>
                  <TextInput
                    style={[styles.input, { height: 160 }]}
                    multiline
                    placeholder="Application | Via platform&#10;Resume Screening | AI verified criteria&#10;Online Assessment | DSA & core skills&#10;Technical Interview | System design & live coding&#10;Final Selection | Offer roll-out"
                    value={modalForm.stagesText}
                    onChangeText={(text) => setModalForm({ ...modalForm, stagesText: text })}
                  />
                </>
              )}

              {editModalSection === 'location_add' && (
                <>
                  <Text style={styles.inputLabel}>Location Title (City, State) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Bangalore, Karnataka"
                    value={modalForm.title}
                    onChangeText={(text) => setModalForm({ ...modalForm, title: text })}
                  />

                  <Text style={styles.inputLabel}>Address / Hub Details</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Koramangala 4th Block, Tech Hub"
                    value={modalForm.sub}
                    onChangeText={(text) => setModalForm({ ...modalForm, sub: text })}
                  />

                  <Text style={styles.inputLabel}>Location Badge</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. HQ, R&D Center, Branch"
                    value={modalForm.badge}
                    onChangeText={(text) => setModalForm({ ...modalForm, badge: text })}
                  />
                </>
              )}

              {editModalSection === 'team_add' && (
                <>
                  <Text style={styles.inputLabel}>Recruiter Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Priya Sharma"
                    value={modalForm.name}
                    onChangeText={(text) => setModalForm({ ...modalForm, name: text })}
                  />

                  <Text style={styles.inputLabel}>Recruiter Work Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. priya.sharma@company.com"
                    value={modalForm.email}
                    onChangeText={(text) => setModalForm({ ...modalForm, email: text })}
                  />

                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +91 98765 43210"
                    value={modalForm.phone}
                    onChangeText={(text) => setModalForm({ ...modalForm, phone: text })}
                  />

                  <Text style={styles.inputLabel}>Designation / Role</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Technical Recruiter, HR Manager"
                    value={modalForm.designation}
                    onChangeText={(text) => setModalForm({ ...modalForm, designation: text })}
                  />
                </>
              )}

              {editModalSection === 'social' && (
                <>
                  <Text style={styles.inputLabel}>Company Website</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.website}
                    onChangeText={(text) => setModalForm({ ...modalForm, website: text })}
                  />

                  <Text style={styles.inputLabel}>LinkedIn Handle</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.linkedin}
                    onChangeText={(text) => setModalForm({ ...modalForm, linkedin: text })}
                  />

                  <Text style={styles.inputLabel}>GitHub Organization</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.github}
                    onChangeText={(text) => setModalForm({ ...modalForm, github: text })}
                  />

                  <Text style={styles.inputLabel}>Instagram</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.instagram}
                    onChangeText={(text) => setModalForm({ ...modalForm, instagram: text })}
                  />

                  <Text style={styles.inputLabel}>X (Twitter)</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.twitter}
                    onChangeText={(text) => setModalForm({ ...modalForm, twitter: text })}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelModalBtn}
                onPress={() => setEditModalSection(null)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveModalBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveModal}
                disabled={saving}
              >
                <Text style={styles.saveModalBtnText}>
                  {saving ? 'Saving to Database...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  successToast: {
    backgroundColor: COLORS.mintBadge,
    borderColor: COLORS.accentGreen,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  successToastText: {
    color: COLORS.mintBadgeText,
    fontSize: 14,
    fontWeight: '700',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 16,
  },
  breadcrumb: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: COLORS.primaryTeal,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  completionContainer: {
    alignItems: 'flex-end',
  },
  completionLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  completionValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  editProfileMainBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editProfileMainBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Checklist Card
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 20,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  checklistStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  checklistItemDone: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.accentGreen,
  },
  checklistItemPending: {
    backgroundColor: '#F8FAFC',
    borderColor: COLORS.border,
  },
  checkIconDone: {
    color: COLORS.accentGreen,
    fontWeight: '900',
    fontSize: 12,
  },
  checkIconPending: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  checklistLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  checklistLabelDone: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  logoSquare: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSquareText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoSquareSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  heroInfoColumn: {
    flex: 1,
    minWidth: 280,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  companyNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  verifiedBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  activeProfileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  greenDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentGreen,
  },
  activeProfileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroMetaItem: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  heroMetaDot: {
    color: COLORS.textMuted,
  },
  heroMetaLink: {
    fontSize: 13,
    color: COLORS.primaryTeal,
    fontWeight: '600',
  },
  heroRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  previewBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },

  // Metric Row
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  metricIconBgTeal: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.mintBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIconBgBlue: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.blueBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIconBgGreen: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIconBgAmber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.amberBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 14,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  metricSubBlue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.blueText,
  },
  metricSubAmber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.amberText,
  },

  // Main 2-Col Grid
  mainGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  mainGridCompact: {
    flexDirection: 'column',
  },
  leftColumn: {
    flex: 2,
    gap: 20,
  },
  rightColumn: {
    flex: 1,
    gap: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderIcon: {
    fontSize: 16,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  sidebarCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  pencilEditBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pencilEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryTeal,
  },
  aboutParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 16,
  },
  missionVisionRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  missionCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: COLORS.mintBg,
    padding: 14,
    borderRadius: 10,
  },
  visionCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: COLORS.blueBg,
    padding: 14,
    borderRadius: 10,
  },
  mvTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  mvText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#1E293B',
    fontStyle: 'italic',
  },
  sectionSubTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sectionDescText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  tagsFlexRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  culturePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  culturePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  perksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  perkBox: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  perkBoxText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryTeal,
  },
  emptyPromptText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  prefTwoCol: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  prefCol: {
    flex: 1,
    minWidth: 220,
  },
  prefLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  grayTag: {
    backgroundColor: COLORS.grayTagBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  grayTagText: {
    fontSize: 12,
    color: COLORS.grayTagText,
    fontWeight: '600',
  },
  modeTag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modeTagActive: {
    backgroundColor: COLORS.mintBg,
    borderColor: COLORS.primaryTeal,
  },
  modeTagText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modeTagActiveText: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  mintTag: {
    backgroundColor: COLORS.mintBadge,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  mintTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mintBadgeText,
  },
  durationBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  processScroll: {
    marginTop: 8,
  },
  processStepsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  processStepCard: {
    width: 160,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primaryTeal,
  },
  stepCheckIcon: {
    fontSize: 12,
    color: COLORS.accentGreen,
    fontWeight: '900',
  },
  stepTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  stepDescText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 14,
  },
  emptyStepPrompt: {
    padding: 16,
  },

  // Trust Card
  trustCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  trustShieldIcon: {
    fontSize: 20,
  },
  trustTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: COLORS.primaryTeal,
  },
  trustSub: {
    fontSize: 12,
    color: COLORS.accentGreen,
    fontWeight: '700',
  },
  trustDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  trustItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  trustItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  trustBadgeGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.mintBadgeText,
    backgroundColor: COLORS.mintBadge,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trustBadgePending: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.amberText,
    backgroundColor: COLORS.amberBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trustFooterBadge: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
  },
  trustFooterText: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },

  // Details
  detailRowGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  detailLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryTeal,
  },

  // Team
  teamCountBadge: {
    backgroundColor: COLORS.mintBg,
    color: COLORS.primaryTeal,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addRecruiterBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addRecruiterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  memberRole: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tagYou: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagYouText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  tagActive: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagActiveText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },

  // Locations
  addLocationBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addLocationBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  locationIcon: {
    fontSize: 14,
  },
  locationTextCol: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  locationSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  locationBadge: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  deleteLocBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteLocText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Social
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  socialIcon: {
    fontSize: 14,
  },
  socialLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    width: 90,
  },
  socialValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryTeal,
    flex: 1,
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
    maxWidth: 580,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#F8FAFC',
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
  modalBody: {
    padding: 20,
    maxHeight: 480,
  },
  inputLabel: {
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
    color: COLORS.textMain,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  saveModalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primaryTeal,
  },
  saveModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
