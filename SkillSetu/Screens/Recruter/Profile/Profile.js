import React, { useRef, useState } from 'react';
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

export default function RecruterProfile() {
  const { width } = useWindowDimensions();
  const isCompact = width < 1000;

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState('Company Profile');

  // Company Profile Dynamic Data
  const [companyInfo, setCompanyInfo] = useState({
    name: 'ABC Technologies',
    industry: 'Information Technology & Software',
    location: 'Pune, Maharashtra',
    founded: '2015',
    employees: '500-1,000 employees',
    website: 'abctechnologies.io',
    email: 'careers@abctechnologies.io',
    companyType: 'Private Ltd',
    workLocations: 'Pune, Bangalore, Mumbai, Hyderabad',
  });

  const [aboutData, setAboutData] = useState({
    description:
      'Founded in 2015, ABC Technologies is an enterprise digital engineering and high-performance cloud acceleration firm headquartered in Pune, India. We architect resilient microservices platforms, intelligent enterprise data pipelines, and scalable cloud-native architectures that power Fortune 500 fintech and logistics systems worldwide.\n\nOur university talent initiative, the ABC NextGen Engineering Academy, bridges the campus-to-industry transition by pairing top-tier undergraduate engineering students with staff architects. Interns write production-grade code, deploy automated CI/CD microservices, and gain hands-on experience in distributed systems from day one.',
    mission:
      'To build reliable, scalable cloud solutions that empower global enterprises while mentoring tomorrow\'s tech leaders through impactful internship opportunities.',
    vision:
      'To be the most innovative and student-friendly technology engineering employer recognized for world-class mentorship.',
  });

  const [cultureData, setCultureData] = useState({
    cultureTags: [
      'Collaborative',
      'Innovation-driven',
      'Learning-focused',
      'Growth-oriented',
      'Inclusive',
      'Flexible',
    ],
    perks: [
      'Monthly Stipend',
      '1:1 Mentorship',
      'Internship Certificate',
      'Flexible Working',
      'Training & Learning',
      'PPO Opportunities',
      'High-End Work Equipment Provided (MacBook Pro)',
    ],
  });

  const [preferencesData, setPreferencesData] = useState({
    domains: [
      'Software Development',
      'AI / ML',
      'Data Science',
      'Web Development',
      'Cybersecurity',
    ],
    skills: ['React', 'Node.js', 'Python', 'Java', 'Machine Learning'],
    workMode: 'Hybrid',
    duration: '3-6 Months',
  });

  const [hiringProcessSteps, setHiringProcessSteps] = useState([
    { id: '01', title: 'Application', desc: 'Via platform' },
    { id: '02', title: 'Resume Screening', desc: 'AI verified criteria' },
    { id: '03', title: 'Online Assessment', desc: 'DSA & core skills' },
    { id: '04', title: 'Technical Interview', desc: 'System design & live coding' },
    { id: '05', title: 'HR Interview', desc: 'Culture & expectations' },
    { id: '06', title: 'Final Selection', desc: 'Offer roll-out' },
  ]);

  const [socialLinks, setSocialLinks] = useState({
    website: 'abctechnologies.io',
    linkedin: 'linkedin.com/company/abc-tech',
    github: 'github.com/abc-technologies',
    instagram: '@abctechnologies',
    twitter: '@ABCTechnologies',
  });

  // Edit Modal State
  const [editModalSection, setEditModalSection] = useState(null); // 'about' | 'company' | 'culture' | 'preferences' | 'process' | 'social'
  const [modalForm, setModalForm] = useState({});

  // Open Edit Modal for a card
  const handleOpenEdit = (section) => {
    setEditModalSection(section);
    if (section === 'about') {
      setModalForm({ ...aboutData });
    } else if (section === 'company') {
      setModalForm({ ...companyInfo });
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
    } else if (section === 'social') {
      setModalForm({ ...socialLinks });
    }
  };

  // Save Modal Edits
  const handleSaveModal = () => {
    if (editModalSection === 'about') {
      setAboutData({
        description: modalForm.description || aboutData.description,
        mission: modalForm.mission || aboutData.mission,
        vision: modalForm.vision || aboutData.vision,
      });
    } else if (editModalSection === 'company') {
      setCompanyInfo({
        ...companyInfo,
        ...modalForm,
      });
    } else if (editModalSection === 'culture') {
      setCultureData({
        cultureTags: modalForm.cultureTags
          ? modalForm.cultureTags.split(',').map((s) => s.trim())
          : cultureData.cultureTags,
        perks: modalForm.perks
          ? modalForm.perks.split(',').map((s) => s.trim())
          : cultureData.perks,
      });
    } else if (editModalSection === 'preferences') {
      setPreferencesData({
        domains: modalForm.domains
          ? modalForm.domains.split(',').map((s) => s.trim())
          : preferencesData.domains,
        skills: modalForm.skills
          ? modalForm.skills.split(',').map((s) => s.trim())
          : preferencesData.skills,
        workMode: modalForm.workMode || preferencesData.workMode,
        duration: modalForm.duration || preferencesData.duration,
      });
    } else if (editModalSection === 'social') {
      setSocialLinks({
        ...socialLinks,
        ...modalForm,
      });
    }
    setEditModalSection(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sub Navigation Bar */}


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
              <Text style={styles.completionLabel}>Profile Completion</Text>
              <Text style={styles.completionValue}>80%</Text>
            </View>
            <HoverButton
              style={styles.editProfileMainBtn}
              onPress={() => handleOpenEdit('company')}
            >
              <Text style={styles.editProfileMainBtnText}>✏️ Edit Profile</Text>
            </HoverButton>
          </View>
        </View>

        {/* Hero Card */}
        <HoverCard style={styles.heroCard}>
          <View style={styles.heroContentRow}>
            <View style={styles.logoSquare}>
              <Text style={styles.logoSquareText}>ABC</Text>
              <Text style={styles.logoSquareSub}>Tech</Text>
            </View>
            <View style={styles.heroInfoColumn}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.companyNameText}>{companyInfo.name}</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>✓ Verified Company</Text>
                </View>
                <View style={styles.activeProfileBadge}>
                  <View style={styles.greenDotSmall} />
                  <Text style={styles.activeProfileBadgeText}>Company Profile Active</Text>
                </View>
              </View>
              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMetaItem}>🏢 {companyInfo.industry}</Text>
                <Text style={styles.heroMetaDot}>•</Text>
                <Text style={styles.heroMetaItem}>📍 {companyInfo.location}</Text>
                <Text style={styles.heroMetaDot}>•</Text>
                <Text style={styles.heroMetaItem}>📅 Founded: {companyInfo.founded}</Text>
                <Text style={styles.heroMetaDot}>•</Text>
                <Text style={styles.heroMetaItem}>👥 {companyInfo.employees}</Text>
                <Text style={styles.heroMetaDot}>•</Text>
                <Text style={styles.heroMetaLink}>🌐 {companyInfo.website}</Text>
              </View>
            </View>
            <View style={styles.heroRightActions}>
              <HoverButton style={styles.previewBtn} onPress={() => { }}>
                <Text style={styles.previewBtnText}>👁️ Preview Student View</Text>
              </HoverButton>
              <HoverButton style={styles.shareBtn} onPress={() => { }}>
                <Text style={styles.shareBtnText}>🔗 Share Public Profile</Text>
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
            <Text style={styles.metricValue}>24</Text>

            <Text style={styles.metricSub}>🌱 3 posted this week</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>TOTAL APPLICATIONS</Text>
              <View style={styles.metricIconBgBlue}>
                <Text style={styles.metricIcon}>👥</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>356</Text>
            <Text style={styles.metricSubBlue}>📈 +26% vs last cycle</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>INTERNS HIRED</Text>
              <View style={styles.metricIconBgGreen}>
                <Text style={styles.metricIcon}>🎓</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>48</Text>
            <Text style={styles.metricSub}>Across 14 leading institutes</Text>
          </HoverCard>

          <HoverCard style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>PPOS OFFERED</Text>
              <View style={styles.metricIconBgAmber}>
                <Text style={styles.metricIcon}>🏆</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>17</Text>
            <Text style={styles.metricSubAmber}>🏆 35.4% conversion rate</Text>
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
              <Text style={styles.aboutParagraph}>{aboutData.description}</Text>
              <View style={styles.missionVisionRow}>
                <View style={styles.missionCard}>
                  <Text style={styles.mvTitle}>💡 OUR MISSION</Text>
                  <Text style={styles.mvText}>"{aboutData.mission}"</Text>
                </View>
                <View style={styles.visionCard}>
                  <Text style={styles.mvTitle}>👁️ OUR VISION</Text>
                  <Text style={styles.mvText}>"{aboutData.vision}"</Text>
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
                The core values shaping our day-to-day engineering and intern experience.
              </Text>
              <View style={styles.tagsFlexRow}>
                {cultureData.cultureTags.map((tag, idx) => (
                  <View key={idx} style={styles.culturePill}>
                    <Text style={styles.culturePillText}>💡 {tag}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.sectionSubTitle, { marginTop: 20 }]}>BENEFITS & PERKS</Text>
              <View style={styles.perksGrid}>
                {cultureData.perks.map((perk, idx) => (
                  <View key={idx} style={styles.perkBox}>
                    <Text style={styles.perkBoxText}>✓ {perk}</Text>
                  </View>
                ))}
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
                    {preferencesData.domains.map((dom, idx) => (
                      <View key={idx} style={styles.grayTag}>
                        <Text style={styles.grayTagText}>{dom}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.prefLabel, { marginTop: 16 }]}>PREFERRED WORK MODE</Text>
                  <View style={styles.tagsFlexRow}>
                    {['Remote', 'Hybrid', 'On-site'].map((mode) => {
                      const isSel = preferencesData.workMode.includes(mode);
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
                  <Text style={styles.prefLabel}>PREFERRED SKILLS</Text>
                  <View style={styles.tagsFlexRow}>
                    {preferencesData.skills.map((sk, idx) => (
                      <View key={idx} style={styles.mintTag}>
                        <Text style={styles.mintTagText}>{sk}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.prefLabel, { marginTop: 16 }]}>PREFERRED DURATION</Text>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationBadgeText}>
                      ⏱️ {preferencesData.duration} <Text style={styles.durationSubText}>(Full-time semester & summer cohorts)</Text>
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
                  onPress={() => {
                    alert('Hiring Process Stepper edit feature opened.');
                  }}
                >
                  <Text style={styles.pencilEditBtnText}>✏️ Edit Hiring Process</Text>
                </HoverButton>
              </View>
              <Text style={styles.sectionDescText}>
                Standardized candidate selection funnel for technical internships.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.processScroll}>
                <View style={styles.processStepsRow}>
                  {hiringProcessSteps.map((step, index) => (
                    <View key={step.id} style={styles.processStepCard}>
                      <View style={styles.stepHeaderRow}>
                        <Text style={styles.stepNumText}>{step.id}</Text>
                        <Text style={styles.stepCheckIcon}>
                          {index === hiringProcessSteps.length - 1 ? '✓' : '•'}
                        </Text>
                      </View>
                      <Text style={styles.stepTitleText}>{step.title}</Text>
                      <Text style={styles.stepDescText}>{step.desc}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </HoverCard>

            {/* Card 5: Active Internships */}
            <HoverCard style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleRow}>
                  <Text style={styles.cardHeaderIcon}>💼</Text>
                  <Text style={styles.cardHeaderTitle}>Active Internships</Text>
                </View>
                <HoverButton style={styles.postNewBtn} onPress={() => { }}>
                  <Text style={styles.postNewBtnText}>+ Post New Role</Text>
                </HoverButton>
              </View>
              <Text style={styles.sectionDescText}>
                Currently published opportunities open for university applicants.
              </Text>

              {[
                { title: 'Software Developer Intern', mode: 'Hybrid', loc: 'Pune', stipend: '₹35,000/month', dur: '6 Months', apps: '43 Applications' },
                { title: 'AI/ML Intern', mode: 'On-site', loc: 'Bangalore', stipend: '₹40,000/month', dur: '6 Months', apps: '27 Applications' },
                { title: 'Cloud Platform Intern', mode: 'Remote', loc: 'Pune (Remote)', stipend: '₹38,000/month', dur: '6 Months', apps: '38 Applications' },
              ].map((role, idx) => (
                <View key={idx} style={styles.roleItemCard}>
                  <View style={styles.roleItemInfo}>
                    <View style={styles.roleTitleRow}>
                      <Text style={styles.roleItemTitle}>{role.title}</Text>
                      <View style={styles.roleModeTag}>
                        <Text style={styles.roleModeTagText}>{role.mode}</Text>
                      </View>
                    </View>
                    <Text style={styles.roleItemMeta}>
                      📍 {role.loc}  •  💰 {role.stipend}  •  ⏱️ {role.dur}  •  👥 {role.apps}
                    </Text>
                  </View>
                  <HoverButton style={styles.viewInternshipBtn} onPress={() => { }}>
                    <Text style={styles.viewInternshipBtnText}>View Internship ›</Text>
                  </HoverButton>
                </View>
              ))}

              <HoverButton style={styles.viewAllInternshipsBtn} onPress={() => { }}>
                <Text style={styles.viewAllInternshipsBtnText}>View All 24 Internships ➔</Text>
              </HoverButton>
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
                  <Text style={styles.trustSub}>✓ Verified Company</Text>
                </View>
              </View>
              <Text style={styles.trustDesc}>
                Your company has been successfully verified by SkillSetu.
              </Text>
              <View style={styles.trustItem}>
                <Text style={styles.trustItemText}>✓ Company Email Verified</Text>
                <Text style={styles.trustBadgeGreen}>Active</Text>
              </View>
              <View style={styles.trustItem}>
                <Text style={styles.trustItemText}>✓ Website Verified</Text>
                <Text style={styles.trustBadgeGreen}>SSL OK</Text>
              </View>
              <View style={styles.trustItem}>
                <Text style={styles.trustItemText}>✓ Business Information Verified</Text>
                <Text style={styles.trustBadgeGreen}>CIN Confirmed</Text>
              </View>
              <View style={styles.trustItem}>
                <Text style={styles.trustItemText}>✓ Recruiter Identity Verified</Text>
                <Text style={styles.trustBadgeGreen}>Govt ID</Text>
              </View>
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
                <Text style={styles.detailLabel}>Work Locations</Text>
                <Text style={styles.detailValue}>{companyInfo.workLocations}</Text>
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
                  <Text style={styles.teamCountBadge}>4</Text>
                </View>
                <HoverButton style={styles.addRecruiterBtn} onPress={() => { }}>
                  <Text style={styles.addRecruiterBtnText}>+ Add Recruiter</Text>
                </HoverButton>
              </View>

              {[
                { avatar: 'NS', name: 'Neha Sharma', role: 'Talent Lead • Admin', tag: 'You' },
                { avatar: 'PS', name: 'Priya Sharma', role: 'HR Manager', tag: 'Active' },
                { avatar: 'RM', name: 'Rahul Mehta', role: 'Technical Recruiter', tag: 'Active' },
                { avatar: 'NP', name: 'Neha Patil', role: 'Talent Acquisition Specialist', tag: 'Active' },
              ].map((member, idx) => (
                <View key={idx} style={styles.teamMemberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{member.avatar}</Text>
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
                <HoverButton style={styles.addLocationBtn} onPress={() => { }}>
                  <Text style={styles.addLocationBtnText}>+ Add Location</Text>
                </HoverButton>
              </View>

              {[
                { title: 'Pune, Maharashtra', sub: 'Hinjawadi Phase 3, Tech Park', badge: 'HQ' },
                { title: 'Bangalore, Karnataka', sub: 'Koramangala 4th Block', badge: 'R&D Center' },
                { title: 'Mumbai, Maharashtra', sub: 'BKC Financial Hub', badge: 'Branch' },
                { title: 'Hyderabad, Telangana', sub: 'HITEC City Cyber Towers', badge: 'Branch' },
              ].map((loc, idx) => (
                <View key={idx} style={styles.locationCard}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <View style={styles.locationTextCol}>
                    <Text style={styles.locationTitle}>{loc.title}</Text>
                    <Text style={styles.locationSub}>{loc.sub}</Text>
                  </View>
                  <View style={styles.locationBadge}>
                    <Text style={styles.locationBadgeText}>{loc.badge}</Text>
                  </View>
                </View>
              ))}
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
                <Text style={styles.socialLabel}>Company Website</Text>
                <Text style={styles.socialValue}>{socialLinks.website}</Text>
              </View>

              <View style={styles.socialLinkRow}>
                <Text style={styles.socialIcon}>💼</Text>
                <Text style={styles.socialLabel}>LinkedIn</Text>
                <Text style={styles.socialValue}>{socialLinks.linkedin}</Text>
              </View>

              <View style={styles.socialLinkRow}>
                <Text style={styles.socialIcon}>💻</Text>
                <Text style={styles.socialLabel}>GitHub</Text>
                <Text style={styles.socialValue}>{socialLinks.github}</Text>
              </View>

              <View style={styles.socialLinkRow}>
                <Text style={styles.socialIcon}>📸</Text>
                <Text style={styles.socialLabel}>Instagram</Text>
                <Text style={styles.socialValue}>{socialLinks.instagram}</Text>
              </View>

              <View style={styles.socialLinkRow}>
                <Text style={styles.socialIcon}>🐦</Text>
                <Text style={styles.socialLabel}>X (Twitter)</Text>
                <Text style={styles.socialValue}>{socialLinks.twitter}</Text>
              </View>
            </HoverCard>
          </View>
        </View>
      </ScrollView>

      {/* Dynamic Section Pencil Edit Modal */}
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
                ✏️ Edit {editModalSection === 'about' ? 'About Company' : editModalSection === 'company' ? 'Company Details' : editModalSection === 'culture' ? 'Culture & Benefits' : editModalSection === 'preferences' ? 'Internship Preferences' : 'Social & External Links'}
              </Text>
              <Pressable onPress={() => setEditModalSection(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {editModalSection === 'about' && (
                <>
                  <Text style={styles.inputLabel}>Company Overview & Story</Text>
                  <TextInput
                    style={[styles.input, { height: 120 }]}
                    multiline
                    value={modalForm.description}
                    onChangeText={(text) => setModalForm({ ...modalForm, description: text })}
                  />

                  <Text style={styles.inputLabel}>Our Mission</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.mission}
                    onChangeText={(text) => setModalForm({ ...modalForm, mission: text })}
                  />

                  <Text style={styles.inputLabel}>Our Vision</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.vision}
                    onChangeText={(text) => setModalForm({ ...modalForm, vision: text })}
                  />
                </>
              )}

              {editModalSection === 'company' && (
                <>
                  <Text style={styles.inputLabel}>Company Name</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.name}
                    onChangeText={(text) => setModalForm({ ...modalForm, name: text })}
                  />

                  <Text style={styles.inputLabel}>Industry</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.industry}
                    onChangeText={(text) => setModalForm({ ...modalForm, industry: text })}
                  />

                  <Text style={styles.inputLabel}>Headquarters Location</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.location}
                    onChangeText={(text) => setModalForm({ ...modalForm, location: text })}
                  />

                  <Text style={styles.inputLabel}>Company Size</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.employees}
                    onChangeText={(text) => setModalForm({ ...modalForm, employees: text })}
                  />

                  <Text style={styles.inputLabel}>Founded Year</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.founded}
                    onChangeText={(text) => setModalForm({ ...modalForm, founded: text })}
                  />
                </>
              )}

              {editModalSection === 'culture' && (
                <>
                  <Text style={styles.inputLabel}>Company Culture Tags (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.cultureTags}
                    onChangeText={(text) => setModalForm({ ...modalForm, cultureTags: text })}
                  />

                  <Text style={styles.inputLabel}>Benefits & Perks (comma separated)</Text>
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    multiline
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
                    value={modalForm.domains}
                    onChangeText={(text) => setModalForm({ ...modalForm, domains: text })}
                  />

                  <Text style={styles.inputLabel}>Preferred Skills (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.skills}
                    onChangeText={(text) => setModalForm({ ...modalForm, skills: text })}
                  />

                  <Text style={styles.inputLabel}>Preferred Work Mode</Text>
                  <TextInput
                    style={styles.input}
                    value={modalForm.workMode}
                    onChangeText={(text) => setModalForm({ ...modalForm, workMode: text })}
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
              <Pressable style={styles.saveModalBtn} onPress={handleSaveModal}>
                <Text style={styles.saveModalBtnText}>Save Changes</Text>
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
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },

  // Sub Nav Bar
  subNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  subTabsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  subTabItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  subTabActive: {
    backgroundColor: COLORS.mintBg,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  subTabActiveText: {
    color: COLORS.primaryTeal,
  },
  subTabsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.mintBadge,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentGreen,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mintBadgeText,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Header Section
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
  shareBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareBtnText: {
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
    gap: 24,
  },
  rightColumn: {
    flex: 1,
    minWidth: 300,
    gap: 24,
  },

  // Section Card
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
    marginBottom: 14,
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
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  pencilEditBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  pencilEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },

  // About Company Content
  aboutParagraph: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  missionVisionRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  missionCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  visionCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mvTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryTeal,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  mvText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textMain,
    lineHeight: 18,
  },

  // Culture Content
  sectionSubTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionDescText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  tagsFlexRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  culturePill: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  culturePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryTeal,
  },
  perksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  perkBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 140,
  },
  perkBoxText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },

  // Preferences Content
  prefTwoCol: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  prefCol: {
    flex: 1,
    minWidth: 200,
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
    paddingVertical: 4,
    borderRadius: 6,
  },
  grayTagText: {
    fontSize: 12,
    color: COLORS.grayTagText,
    fontWeight: '600',
  },
  mintTag: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mintTagText: {
    fontSize: 12,
    color: COLORS.primaryTeal,
    fontWeight: '700',
  },
  modeTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeTagActive: {
    backgroundColor: COLORS.mintBg,
  },
  modeTagText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  modeTagActiveText: {
    color: COLORS.primaryTeal,
    fontWeight: '700',
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
  durationSubText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#78350F',
  },

  // Hiring Process Content
  processScroll: {
    marginTop: 8,
  },
  processStepsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  processStepCard: {
    width: 130,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepNumText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primaryTeal,
  },
  stepCheckIcon: {
    fontSize: 12,
    color: COLORS.accentGreen,
  },
  stepTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  stepDescText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  // Active Internships Card
  postNewBtn: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  postNewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  roleItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 10,
  },
  roleItemInfo: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  roleModeTag: {
    backgroundColor: COLORS.mintBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleModeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  roleItemMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  viewInternshipBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewInternshipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  viewAllInternshipsBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  viewAllInternshipsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },

  // Trust Card
  trustCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  trustShieldIcon: {
    fontSize: 24,
  },
  trustTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: 0.5,
  },
  trustSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  trustDesc: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 12,
  },
  trustItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  trustItemText: {
    fontSize: 12,
    color: '#166534',
  },
  trustBadgeGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trustFooterBadge: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
  },
  trustFooterText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },

  // Sidebar General
  sidebarCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  detailRowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
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

  // Team Sidebar
  teamCountBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addRecruiterBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addRecruiterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
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
    borderRadius: 10,
  },
  tagYouText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  tagActive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },

  // Location Sidebar
  addLocationBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addLocationBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
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
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  locationSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  locationBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  locationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  // Social Links
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  socialIcon: {
    fontSize: 14,
  },
  socialLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  socialValue: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  modalCloseText: {
    fontSize: 18,
    color: COLORS.textMuted,
    padding: 4,
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textMain,
    backgroundColor: '#F8FAFC',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
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
