import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { recruiterService } from '../services/recruiterService';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  ChipGroup,
  EventCard,
  Field,
  Icon,
  IconButton,
  Inset,
  Page,
  Pill,
  Ring,
  Row,
  SectionTitle,
  Sheet,
  Skeleton,
  Stack,
  Timeline,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, webOnly } from '../../../ui/theme';

export default function RecruterProfile({ user, onProfileUpdated, onNavigateTab }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 1000;
  const token = user?.token || user?.access_token || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // 1. Company Identity & Details
  const [companyInfo, setCompanyInfo] = useState({
    name: user?.companyName || user?.company_name || '',
    industry: '',
    location: '',
    founded: '',
    employees: '',
    website: '',
    email: '',
    companyType: '',
    workLocations: '',
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
    company_email_verified: false,
    website_verified: false,
    business_verified: false,
    recruiter_verified: false,
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
        location: data.company.headquarters || data.company.location || '',
        founded: data.company.founded || data.company.founded_year || '',
        employees: data.company.employees || data.company.company_size || '',
        website: data.company.website || '',
        email: data.company.email || '',
        companyType: data.company.company_type || '',
        workLocations: data.company.work_locations || data.company.headquarters || '',
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

  const setF = (key) => (v) => setModalForm((f) => ({ ...f, [key]: v }));
  const pct = completion.percentage || 0;
  const SECTION_EDIT = {
    'Company Identity': 'company',
    'About Company': 'about',
    'Company Details & Locations': 'location_add',
    'Culture & Benefits': 'culture',
    'Internship Preferences': 'preferences',
    'Hiring Process': 'process',
  };
  const editFor = (sec) => {
    const k = Object.keys(SECTION_EDIT).find((s) => String(sec).toLowerCase().includes(s.toLowerCase().split(' ')[0]));
    return k ? SECTION_EDIT[k] : 'company';
  };
  const openUrl = (u) => {
    if (!u) return;
    const url = /^https?:\/\//.test(u) ? u : `https://${u}`;
    if (Platform.OS === 'web') window.open(url, '_blank', 'noopener,noreferrer');
    else Linking.openURL(url).catch(() => {});
  };

  const sectionHeader = (title, section, icon, extra) => (
    <Row justify="space-between" style={{ marginBottom: space.md }}>
      <Row gap={8}>
        <Icon name={icon} size={18} color={colors.ink} />
        <Txt variant="h3" tone="ink">{title}</Txt>
      </Row>
      <Row gap={6}>
        {extra}
        {section ? <IconButton icon="Pencil" size={34} onPress={() => handleOpenEdit(section)} accessibilityLabel={`Edit ${title}`} /> : null}
      </Row>
    </Row>
  );
  const chips = (list, tone) =>
    list && list.length ? (
      <Row wrap gap={6}>{list.map((x) => <Pill key={x} label={x} tone={tone} size="sm" />)}</Row>
    ) : (
      <Txt variant="small" tone="subtle">Not added yet</Txt>
    );

  if (loading) {
    return (
      <Page>
        <Skeleton height={160} radius={radii.xl} />
        <Skeleton height={120} radius={radii.xl} />
        <Skeleton height={120} radius={radii.xl} />
      </Page>
    );
  }

  const verifyItems = [
    ['company_email_verified', 'Company email'],
    ['website_verified', 'Website'],
    ['business_verified', 'Business'],
    ['recruiter_verified', 'Recruiter'],
  ];
  const links = [
    ['website', 'Globe'],
    ['linkedin', 'Link'],
    ['github', 'GitBranch'],
    ['twitter', 'Link'],
    ['instagram', 'Link'],
  ].filter(([k]) => socialLinks[k]);

  const aside = (
    <>
      <SectionTitle title="Profile status" emoji="🏢" />
      <Card tone={completion.is_complete ? 'success' : 'warning'}>
        <Row justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Txt variant="h3" tone="ink">{completion.is_complete ? 'Workspace active' : 'Almost there'}</Txt>
            <Txt variant="small" tone="muted">{completion.is_complete ? 'You can publish internships and review candidates.' : 'Complete the required sections to unlock hiring.'}</Txt>
          </Stack>
          <Ring value={pct} size={68} stroke={7} tone="dark" track="rgba(255,255,255,0.6)">
            <Txt variant="small" weight={700} tone="ink">{pct}%</Txt>
          </Ring>
        </Row>
        {completion.missing_required_sections?.length ? (
          <Stack gap={6} style={{ marginTop: space.md }}>
            {completion.missing_required_sections.map((sec) => (
              <Pressable key={sec} onPress={() => handleOpenEdit(editFor(sec))} style={[styles.missingRow, webOnly({ cursor: 'pointer' })]}>
                <Icon name="CircleAlert" size={15} color={colors.butterInk} />
                <Txt variant="small" weight={600} tone="ink" style={{ flex: 1 }}>{sec}</Txt>
                <Icon name="ArrowRight" size={14} color={colors.textMuted} />
              </Pressable>
            ))}
          </Stack>
        ) : null}
        {completion.is_complete && onNavigateTab ? <Button label="Go to internships" size="sm" iconRight="ArrowRight" onPress={() => onNavigateTab('Internships')} style={{ marginTop: space.md }} /> : null}
      </Card>
      <EventCard
        tone="info"
        icon="ShieldCheck"
        type="Verification"
        body="Verification is reviewed by SkillSetu administrators."
        footer={
          <Row wrap gap={6} justify="center" style={{ width: '100%' }}>
            {verifyItems.map(([k, label]) => (
              <Pill key={k} label={label} tone={verificationData[k] ? 'success' : 'neutral'} icon={verificationData[k] ? 'Check' : 'Clock'} size="sm" />
            ))}
          </Row>
        }
      />
      <EventCard
        tone="accent"
        icon="Link"
        type="Links"
        title={links.length ? `${links.length} linked` : 'No links yet'}
        footer={
          links.length ? (
            <Row wrap gap={6} justify="center" style={{ width: '100%' }}>
              {links.map(([k, icon]) => (
                <Pressable key={k} onPress={() => openUrl(socialLinks[k])} style={[styles.linkChip, webOnly({ cursor: 'pointer' })]}>
                  <Icon name={icon} size={13} color={colors.ink} />
                  <Txt variant="caption" weight={600} tone="ink">{k}</Txt>
                </Pressable>
              ))}
              <Pressable onPress={() => handleOpenEdit('social')} style={[styles.linkChip, webOnly({ cursor: 'pointer' })]}>
                <Icon name="Pencil" size={13} color={colors.ink} />
              </Pressable>
            </Row>
          ) : (
            <Pressable onPress={() => handleOpenEdit('social')} style={[styles.footerBtn, webOnly({ cursor: 'pointer' })]}>
              <Icon name="Plus" size={14} color={colors.ink} />
              <Txt variant="small" weight={600} tone="ink">Add links</Txt>
            </Pressable>
          )
        }
      />
    </>
  );

  const editTitles = {
    about: 'About the company',
    company: 'Company details',
    culture: 'Culture & perks',
    preferences: 'Internship preferences',
    process: 'Hiring process',
    social: 'Links',
    location_add: 'Add location',
    team_add: 'Add team member',
  };

  return (
    <Page aside={aside}>
      {saveSuccessMsg ? (
        <Inset tone="success" padding={space.sm}>
          <Row gap={8}>
            <Icon name="CircleCheck" size={16} color={colors.mintInk} />
            <Txt variant="small" weight={600} color={colors.mintInk}>{saveSuccessMsg.replace(/^✓\s*/, '')}</Txt>
          </Row>
        </Inset>
      ) : null}

      <Card padding={isCompact ? space.lg : space.xxl}>
        <Row gap={space.lg} align="flex-start" wrap>
          <Avatar name={companyInfo.name} size={isCompact ? 72 : 96} tone="accent" />
          <Stack gap={8} style={{ flex: 1, minWidth: 240 }}>
            <Txt variant="display" tone="ink">{companyInfo.name || 'Your company'}</Txt>
            <Txt variant="title" tone="muted">{[companyInfo.industry, companyInfo.companyType].filter(Boolean).join(' · ') || 'Add your industry'}</Txt>
            <Row wrap gap={6}>
              {companyInfo.location ? <Pill label={companyInfo.location} icon="MapPin" size="sm" /> : null}
              {companyInfo.employees ? <Pill label={companyInfo.employees} icon="Users" size="sm" /> : null}
              {companyInfo.founded ? <Pill label={`Since ${companyInfo.founded}`} icon="Calendar" size="sm" /> : null}
              {companyInfo.website ? <Pill label={companyInfo.website} icon="Globe" size="sm" /> : null}
              {companyInfo.email ? <Pill label={companyInfo.email} icon="Mail" size="sm" /> : null}
            </Row>
          </Stack>
          <Button label="Edit details" icon="Pencil" onPress={() => handleOpenEdit('company')} />
        </Row>
      </Card>

      <Card>
        {sectionHeader('About', 'about', 'Info')}
        <Txt variant="body" tone={aboutData.description ? 'default' : 'subtle'}>{aboutData.description || 'Tell students what your company does (at least 20 characters).'}</Txt>
        {aboutData.mission || aboutData.vision ? (
          <View style={[styles.twoCol, isCompact ? null : { flexDirection: 'row' }]}>
            {aboutData.mission ? (
              <Inset tone="accent" style={{ flex: 1 }}>
                <Txt variant="overline" color={colors.lilacInk}>Mission</Txt>
                <Txt variant="small" tone="ink" style={{ marginTop: 4 }}>{aboutData.mission}</Txt>
              </Inset>
            ) : null}
            {aboutData.vision ? (
              <Inset tone="info" style={{ flex: 1 }}>
                <Txt variant="overline" color={colors.skyInk}>Vision</Txt>
                <Txt variant="small" tone="ink" style={{ marginTop: 4 }}>{aboutData.vision}</Txt>
              </Inset>
            ) : null}
          </View>
        ) : null}
      </Card>

      <View style={[styles.twoCol, isCompact ? null : { flexDirection: 'row' }]}>
        <Card style={{ flex: 1 }}>
          {sectionHeader('Culture & perks', 'culture', 'Sparkles')}
          <Txt variant="overline" tone="subtle" style={{ marginBottom: 6 }}>Culture</Txt>
          {chips(cultureData.cultureTags, 'accent')}
          <Txt variant="overline" tone="subtle" style={{ marginVertical: 6, marginTop: space.md }}>Perks</Txt>
          {chips(cultureData.perks, 'warning')}
        </Card>
        <Card style={{ flex: 1 }}>
          {sectionHeader('Internship preferences', 'preferences', 'Target')}
          <Txt variant="overline" tone="subtle" style={{ marginBottom: 6 }}>Domains</Txt>
          {chips(preferencesData.domains, 'info')}
          <Txt variant="overline" tone="subtle" style={{ marginVertical: 6, marginTop: space.md }}>Skills</Txt>
          {chips(preferencesData.skills, 'success')}
          <Row gap={6} style={{ marginTop: space.md }}>
            {preferencesData.workMode ? <Pill label={preferencesData.workMode} icon="House" size="sm" /> : null}
            {preferencesData.duration ? <Pill label={preferencesData.duration} icon="Clock" size="sm" /> : null}
          </Row>
        </Card>
      </View>

      <Card>
        {sectionHeader('Hiring process', 'process', 'Route')}
        {hiringProcessSteps.length ? (
          <Timeline
            gap={space.sm}
            items={hiringProcessSteps.map((st, i) => ({
              key: st.id || i,
              done: true,
              content: (
                <View style={styles.stepRow}>
                  <Txt variant="small" weight={700} tone="ink">{i + 1}. {st.title}</Txt>
                  {st.desc ? <Txt variant="caption" tone="muted">{st.desc}</Txt> : null}
                </View>
              ),
            }))}
          />
        ) : (
          <Txt variant="small" tone="subtle">Add the stages candidates go through.</Txt>
        )}
      </Card>

      <View style={[styles.twoCol, isCompact ? null : { flexDirection: 'row' }]}>
        <Card style={{ flex: 1 }}>
          {sectionHeader('Locations', null, 'MapPin', <IconButton icon="Plus" size={34} onPress={() => handleOpenEdit('location_add')} accessibilityLabel="Add location" />)}
          {locationsList.length ? (
            <Stack gap={8}>
              {locationsList.map((loc) => (
                <Inset key={loc.id} tone="neutral" padding={space.sm}>
                  <Row gap={10}>
                    <Stack gap={0} style={{ flex: 1 }}>
                      <Txt variant="small" weight={700} tone="ink">{loc.title}</Txt>
                      {loc.sub ? <Txt variant="caption" tone="muted">{loc.sub}</Txt> : null}
                    </Stack>
                    {loc.badge ? <Pill label={loc.badge} size="sm" tone={loc.badge === 'HQ' || loc.is_primary ? 'accent' : 'neutral'} /> : null}
                    <IconButton icon="Trash" size={30} variant="ghost" onPress={() => handleDeleteLocation(loc.id)} accessibilityLabel="Delete location" />
                  </Row>
                </Inset>
              ))}
            </Stack>
          ) : (
            <Txt variant="small" tone="subtle">At least one location is required.</Txt>
          )}
        </Card>
        <Card style={{ flex: 1 }}>
          {sectionHeader('Hiring team', null, 'Users', <IconButton icon="Plus" size={34} onPress={() => handleOpenEdit('team_add')} accessibilityLabel="Add team member" />)}
          {hiringTeam.length ? (
            <Stack gap={8}>
              {hiringTeam.map((m) => (
                <Row key={m.id || m.name} gap={10}>
                  <Avatar name={m.name} size={36} />
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Txt variant="small" weight={700} tone="ink">{m.name}</Txt>
                    <Txt variant="caption" tone="muted">{m.role}</Txt>
                  </Stack>
                  {m.tag ? <Pill label={m.tag} size="sm" /> : null}
                </Row>
              ))}
            </Stack>
          ) : (
            <Txt variant="small" tone="subtle">Only you so far.</Txt>
          )}
        </Card>
      </View>

      <Sheet
        visible={!!editModalSection}
        onClose={() => setEditModalSection(null)}
        title={editTitles[editModalSection] || 'Edit'}
        icon="Pencil"
        tone="accent"
        footer={
          <>
            <Button label="Cancel" variant="secondary" onPress={() => setEditModalSection(null)} />
            <Button label="Save" icon="Check" onPress={handleSaveModal} loading={saving} />
          </>
        }
      >
        {editModalSection === 'about' ? (
          <>
            <Field label="Description" multiline placeholder="What does your company do? (20+ characters)" value={modalForm.description || ''} onChangeText={setF('description')} />
            <Field label="Mission" multiline value={modalForm.mission || ''} onChangeText={setF('mission')} />
            <Field label="Vision" multiline value={modalForm.vision || ''} onChangeText={setF('vision')} />
          </>
        ) : null}
        {editModalSection === 'company' ? (
          <>
            <Field label="Company name" icon="Building" value={modalForm.name || ''} onChangeText={setF('name')} />
            <Field label="Industry" icon="Briefcase" placeholder="e.g. Information Technology" value={modalForm.industry || ''} onChangeText={setF('industry')} />
            <Stack gap={6}>
              <Txt variant="small" weight={600} tone="ink">Company type</Txt>
              <ChipGroup options={['Startup', 'Private Ltd', 'Public Ltd', 'MNC', 'Government', 'NGO']} value={modalForm.companyType} multiple={false} onChange={setF('companyType')} />
            </Stack>
            <Stack gap={6}>
              <Txt variant="small" weight={600} tone="ink">Company size</Txt>
              <ChipGroup options={['1-10', '11-50', '51-200', '201-500', '500-1,000 employees', '1,000+']} value={modalForm.employees} multiple={false} tone="info" onChange={setF('employees')} />
            </Stack>
            <Row gap={space.sm} align="flex-start">
              <Field style={{ flex: 1 }} label="Founded" placeholder="YYYY" keyboardType="number-pad" value={modalForm.founded || ''} onChangeText={setF('founded')} />
              <Field style={{ flex: 2 }} label="Headquarters" icon="MapPin" placeholder="City, State" value={modalForm.location || ''} onChangeText={setF('location')} />
            </Row>
            <Field label="Website" icon="Globe" autoCapitalize="none" value={modalForm.website || ''} onChangeText={setF('website')} />
            <Field label="Company email" icon="Mail" autoCapitalize="none" keyboardType="email-address" value={modalForm.email || ''} onChangeText={setF('email')} />
          </>
        ) : null}
        {editModalSection === 'culture' ? (
          <>
            <Field label="Culture tags" hint="Comma separated, e.g. Remote-first, Mentorship" multiline value={modalForm.cultureTags || ''} onChangeText={setF('cultureTags')} />
            <Field label="Perks" hint="Comma separated, e.g. Stipend, Certificate, PPO" multiline value={modalForm.perks || ''} onChangeText={setF('perks')} />
          </>
        ) : null}
        {editModalSection === 'preferences' ? (
          <>
            <Field label="Domains" hint="Comma separated, e.g. Web, AI/ML" value={modalForm.domains || ''} onChangeText={setF('domains')} />
            <Field label="Skills" hint="Comma separated, e.g. React, Python, SQL" multiline value={modalForm.skills || ''} onChangeText={setF('skills')} />
            <Stack gap={6}>
              <Txt variant="small" weight={600} tone="ink">Work mode</Txt>
              <ChipGroup options={['Remote', 'Hybrid', 'On-site']} value={modalForm.workMode} multiple={false} onChange={setF('workMode')} />
            </Stack>
            <Stack gap={6}>
              <Txt variant="small" weight={600} tone="ink">Duration</Txt>
              <ChipGroup options={['1-3 Months', '3-6 Months', '6+ Months']} value={modalForm.duration} multiple={false} tone="info" onChange={setF('duration')} />
            </Stack>
          </>
        ) : null}
        {editModalSection === 'process' ? (
          <Field
            label="Stages"
            hint="One stage per line: Title | short description"
            multiline
            inputStyle={{ minHeight: 160 }}
            placeholder={'Application review | We check your verified profile\nTechnical assessment | 40-minute coding round'}
            value={modalForm.stagesText || ''}
            onChangeText={setF('stagesText')}
          />
        ) : null}
        {editModalSection === 'social' ? (
          <>
            {['website', 'linkedin', 'github', 'twitter', 'instagram'].map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)} icon={k === 'website' ? 'Globe' : k === 'github' ? 'GitBranch' : 'Link'} autoCapitalize="none" value={modalForm[k] || ''} onChangeText={setF(k)} />
            ))}
          </>
        ) : null}
        {editModalSection === 'location_add' ? (
          <>
            <Field label="Location" icon="MapPin" placeholder="e.g. Pune, Maharashtra" value={modalForm.title || ''} onChangeText={setF('title')} />
            <Field label="Address / note" placeholder="Optional" value={modalForm.sub || ''} onChangeText={setF('sub')} />
            <Stack gap={6}>
              <Txt variant="small" weight={600} tone="ink">Type</Txt>
              <ChipGroup options={['HQ', 'Branch', 'Remote hub']} value={modalForm.badge} multiple={false} onChange={setF('badge')} />
            </Stack>
            <Checkbox checked={!!modalForm.is_primary} onChange={setF('is_primary')} label="Primary location" />
          </>
        ) : null}
        {editModalSection === 'team_add' ? (
          <>
            <Field label="Name" icon="User" value={modalForm.name || ''} onChangeText={setF('name')} />
            <Field label="Email" icon="Mail" autoCapitalize="none" keyboardType="email-address" value={modalForm.email || ''} onChangeText={setF('email')} />
            <Field label="Phone" icon="Phone" keyboardType="phone-pad" value={modalForm.phone || ''} onChangeText={setF('phone')} />
            <Field label="Designation" icon="Briefcase" value={modalForm.designation || ''} onChangeText={setF('designation')} />
          </>
        ) : null}
      </Sheet>
    </Page>
  );
}

const styles = StyleSheet.create({
  twoCol: {
    gap: space.md,
    marginTop: space.md,
  },
  stepRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: space.sm,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.sm,
    padding: 10,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
