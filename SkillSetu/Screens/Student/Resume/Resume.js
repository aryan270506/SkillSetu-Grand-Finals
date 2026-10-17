import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  calculateFormatScore,
  calculateImpactScore,
  calculateKeywordScore,
  calculateUtf8Score,
} from './components/atsEvaluator';
import {
  Avatar,
  Button,
  Card,
  Field,
  Icon,
  Inset,
  Page,
  Pill,
  ProgressBar,
  Row,
  SectionTitle,
  SegmentedTabs,
  Skeleton,
  Stack,
  StatTrio,
  Txt,
} from '../../../ui/components';
import { colors, radii, shadows, space, toneOf } from '../../../ui/theme';
import { API_BASE } from '../../../ui/config';

import { tl } from '../../../i18n/tl';

export default function Resume({ user, profileData }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 1024;

  const studentEmail = user?.email || profileData?.personalInfo?.email || '';

  // Data Loading & Tailored Resume state from Backend
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [tailoredData, setTailoredData] = useState(null);
  const [activeTargetRole, setActiveTargetRole] = useState('');

  // Custom Zoom simulator
  const [zoom, setZoom] = useState(100);

  // Edit Mode state (Local editing buffer)
  const [isEditing, setIsEditing] = useState(false);
  const [editedResumeBuffer, setEditedResumeBuffer] = useState({
    summary: '',
    skills: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
  });


  // Fetch Tailored Resume Payload from Backend API
  const fetchTailoredResume = useCallback(async (careerToFetch = null) => {
    if (!studentEmail) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const emailQuery = encodeURIComponent(studentEmail.trim());
      const careerParam = careerToFetch ? `&target_career=${encodeURIComponent(careerToFetch.trim())}` : '';
      const url = `${API_BASE}/student/tailored-resume?email=${emailQuery}${careerParam}`;

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.status === 'success' && data.data) {
        const payload = data.data;
        setTailoredData(payload);
        setActiveTargetRole(payload.active_target_career || '');
        setEditedResumeBuffer(JSON.parse(JSON.stringify(payload.resume || {})));
      } else {
        setError(data.detail || 'Failed to generate tailored resume data.');
      }
    } catch (err) {
      console.error('Error fetching tailored resume:', err);
      setError('Network error connecting to SkillSetu backend.');
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  }, [studentEmail]);

  useEffect(() => {
    fetchTailoredResume();
  }, [fetchTailoredResume]);

  // Role Change Handler
  const handleRoleChange = (selectedRole) => {
    setActiveTargetRole(selectedRole);
    fetchTailoredResume(selectedRole);
  };

  // Regenerate Handler
  const handleRegenerate = () => {
    setIsGenerating(true);
    fetchTailoredResume(activeTargetRole);
  };

  // Edit Mode Handlers
  const startEditing = () => {
    if (tailoredData?.resume) {
      setEditedResumeBuffer(JSON.parse(JSON.stringify(tailoredData.resume)));
    }
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (tailoredData?.resume) {
      setEditedResumeBuffer(JSON.parse(JSON.stringify(tailoredData.resume)));
    }
    setIsEditing(false);
  };

  const saveEdits = () => {
    if (tailoredData) {
      setTailoredData((prev) => ({
        ...prev,
        resume: {
          ...prev.resume,
          ...editedResumeBuffer,
        },
      }));
    }
    setIsEditing(false);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      alert('Resume modifications saved to local preview buffer!');
    }
  };

  // Dedicated Semantic HTML Resume Builder for ATS-grade A4 PDF Export
  const generateResumeHtml = ({
    studentName,
    activeTargetRole,
    studentPhotoUrl,
    studentEmailDisplay,
    studentPhoneDisplay,
    studentGithubDisplay,
    studentLocationDisplay,
    summaryText,
    skillsList,
    experienceList,
    projectsList,
    educationList,
    certificationsList,
  }) => {
    const esc = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const initials = studentName
      ? studentName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : 'AB';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(studentName)} - Resume</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.36;
      -webkit-font-smoothing: antialiased;
    }
    .resume-sheet {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 14mm 10mm 14mm;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* HEADER */
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 2px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar-img {
      width: 54px;
      height: 54px;
      border-radius: 8px;
      object-fit: cover;
      display: block;
      border: 1px solid #e2e8f0;
    }
    .avatar-box {
      width: 54px;
      height: 54px;
      border-radius: 8px;
      background: #7c3aed;
      color: #ffffff;
      font-size: 18px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .name-role-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .full-name {
      font-size: 16.5pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.8px;
      margin: 0;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .target-role {
      font-size: 10pt;
      font-weight: 700;
      color: #7c3aed;
      margin: 0;
    }
    .contact-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .contact-item {
      font-size: 8.2pt;
      color: #475569;
      font-weight: 500;
      text-decoration: none;
    }
    .contact-item a {
      color: #475569;
      text-decoration: none;
    }
    .header-divider {
      height: 1.5px;
      background: #e2e8f0;
      width: 100%;
      margin: 0 0 2px 0;
    }

    /* SECTIONS */
    .section-block {
      display: flex;
      flex-direction: column;
      gap: 3px;
      page-break-inside: auto;
      break-inside: auto;
    }
    .section-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #7c3aed;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
      margin: 0 0 3px 0;
      text-transform: uppercase;
      page-break-after: avoid;
      break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .summary-text {
      font-size: 8.6pt;
      line-height: 1.38;
      color: #1e293b;
      margin: 0;
      text-align: justify;
    }

    /* SKILLS TABLE */
    .skills-table {
      display: flex;
      flex-direction: column;
      gap: 2.5px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .skill-row {
      display: flex;
      font-size: 8.6pt;
      line-height: 1.34;
    }
    .skill-label {
      font-weight: 700;
      color: #0f172a;
      width: 85px;
      flex-shrink: 0;
    }
    .skill-value {
      color: #334155;
      flex: 1;
    }

    /* EXPERIENCE & PROJECTS */
    .exp-item, .project-item, .edu-item {
      display: flex;
      flex-direction: column;
      gap: 1.5px;
      margin-bottom: 5px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .item-title {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
    }
    .item-meta {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
    }
    .bullets-list {
      margin: 1px 0 0 0;
      padding-left: 14px;
    }
    .bullet-item {
      font-size: 8.4pt;
      line-height: 1.3;
      color: #334155;
      margin-bottom: 1px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .technologies-line {
      font-size: 8.2pt;
      color: #7c3aed;
      font-weight: 600;
      margin-top: 1px;
    }
    .github-link {
      font-size: 8.2pt;
      color: #2563eb;
      text-decoration: none;
      margin-top: 1px;
      display: inline-block;
    }
    .coursework-text {
      font-size: 8.2pt;
      color: #64748b;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="resume-sheet">
    <!-- HEADER -->
    <div class="header-container">
      <div class="header-left">
        ${studentPhotoUrl ? `
          <img src="${esc(studentPhotoUrl)}" class="avatar-img" alt="Profile" />
        ` : `
          <div class="avatar-box">${esc(initials)}</div>
        `}
        <div class="name-role-col">
          <h1 class="full-name">${esc(studentName || 'Candidate')}</h1>
          <p class="target-role">${esc(activeTargetRole || 'Software Engineer')}</p>
        </div>
      </div>
      <div class="contact-col">
        ${studentEmailDisplay ? `<div class="contact-item"><a href="mailto:${esc(studentEmailDisplay)}">✉ ${esc(studentEmailDisplay)}</a></div>` : ''}
        ${studentPhoneDisplay ? `<div class="contact-item">📞 ${esc(studentPhoneDisplay)}</div>` : ''}
        ${studentGithubDisplay ? `<div class="contact-item"><a href="https://github.com/${esc(studentGithubDisplay)}" target="_blank">🔗 github.com/${esc(studentGithubDisplay)}</a></div>` : ''}
        ${studentLocationDisplay ? `<div class="contact-item">📍 ${esc(studentLocationDisplay)}</div>` : ''}
      </div>
    </div>
    
    <div class="header-divider"></div>

    <!-- 1. PROFESSIONAL SUMMARY -->
    ${summaryText ? `
      <div class="section-block">
        <div class="section-title">PROFESSIONAL SUMMARY</div>
        <p class="summary-text">${esc(summaryText)}</p>
      </div>
    ` : ''}

    <!-- 2. TECHNICAL SKILLS -->
    ${skillsList && skillsList.length > 0 ? `
      <div class="section-block">
        <div class="section-title">TECHNICAL SKILLS</div>
        <div class="skills-table">
          ${skillsList.map((s) => `
            <div class="skill-row">
              <span class="skill-label">${esc(s.label || s.category || 'Skills')}:</span>
              <span class="skill-value">${esc(s.value || (Array.isArray(s.skills) ? s.skills.join(', ') : ''))}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- 3. EXPERIENCE -->
    ${experienceList && experienceList.length > 0 ? `
      <div class="section-block">
        <div class="section-title">EXPERIENCE</div>
        ${experienceList.map((exp) => `
          <div class="exp-item">
            <div class="item-header">
              <span class="item-title">${esc(exp.title)}</span>
              <span class="item-meta">${esc(exp.company)}${exp.period ? ' | ' + esc(exp.period) : ''}</span>
            </div>
            ${exp.bullets && exp.bullets.length > 0 ? `
              <ul class="bullets-list">
                ${exp.bullets.map((b) => `<li class="bullet-item">${esc(b)}</li>`).join('')}
              </ul>
            ` : (exp.description ? `<p class="summary-text">${esc(exp.description)}</p>` : '')}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- 4. KEY PROJECTS -->
    ${projectsList && projectsList.length > 0 ? `
      <div class="section-block">
        <div class="section-title">KEY PROJECTS</div>
        ${projectsList.map((proj) => `
          <div class="project-item">
            <div class="item-header">
              <span class="item-title">${esc(proj.title)}</span>
              <span class="item-meta">${esc(proj.type || 'GitHub Repository')}</span>
            </div>
            ${proj.bullets && proj.bullets.length > 0 ? `
              <ul class="bullets-list">
                ${proj.bullets.map((b) => `<li class="bullet-item">${esc(b)}</li>`).join('')}
              </ul>
            ` : (proj.description ? `<p class="summary-text">${esc(proj.description)}</p>` : '')}
            ${proj.technologies && proj.technologies.length > 0 ? `
              <div class="technologies-line">Technologies: ${esc(Array.isArray(proj.technologies) ? proj.technologies.join(' · ') : proj.technologies)}</div>
            ` : ''}
            ${proj.github_url ? `
              <div><a href="${esc(proj.github_url)}" target="_blank" class="github-link">🔗 ${esc(proj.github_url)}</a></div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- 5. EDUCATION -->
    ${educationList && educationList.length > 0 ? `
      <div class="section-block">
        <div class="section-title">EDUCATION</div>
        ${educationList.map((edu) => `
          <div class="edu-item">
            <div class="item-header">
              <span class="item-title">${esc(edu.degree)}</span>
              <span class="item-meta">${esc(edu.university)}${edu.graduationYear ? ' / ' + esc(edu.graduationYear) : ''}</span>
            </div>
            <div class="coursework-text">Relevant Coursework: Data Structures, Algorithms, Database Systems</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- 6. CERTIFICATIONS / ACHIEVEMENTS -->
    ${certificationsList && certificationsList.length > 0 ? `
      <div class="section-block">
        <div class="section-title">CERTIFICATIONS</div>
        ${certificationsList.map((cert) => `
          <div class="edu-item">
            <span class="item-title">${esc(typeof cert === 'string' ? cert : (cert.title || cert.name))}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}
  </div>
</body>
</html>`;
  };

  // PDF Print Handler
  const handleDownload = (type = 'PDF') => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const summaryText = editedResumeBuffer.summary || resumePayload.summary || '';
      const skillsList = editedResumeBuffer.skills || resumePayload.skills || [];
      const experienceList = editedResumeBuffer.experience || resumePayload.experience || [];
      const projectsList = editedResumeBuffer.projects || resumePayload.projects || [];
      const educationList = editedResumeBuffer.education || resumePayload.education || [];
      const certificationsList = editedResumeBuffer.certifications || resumePayload.certifications || [];

      const htmlContent = generateResumeHtml({
        studentName,
        activeTargetRole,
        studentPhotoUrl,
        studentEmailDisplay,
        studentPhoneDisplay,
        studentGithubDisplay,
        studentLocationDisplay,
        summaryText,
        skillsList,
        experienceList,
        projectsList,
        educationList,
        certificationsList,
      });

      let printIframe = document.getElementById('skillsetu-print-iframe');
      if (printIframe) {
        printIframe.remove();
      }
      printIframe = document.createElement('iframe');
      printIframe.id = 'skillsetu-print-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = 'none';
      printIframe.style.visibility = 'hidden';
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      const iframeImages = iframeDoc.getElementsByTagName('img');
      let loadedCount = 0;
      const totalImages = iframeImages.length;

      const triggerPrint = () => {
        setTimeout(() => {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        }, 150);
      };

      if (totalImages === 0) {
        triggerPrint();
      } else {
        for (let i = 0; i < totalImages; i++) {
          if (iframeImages[i].complete) {
            loadedCount++;
            if (loadedCount === totalImages) triggerPrint();
          } else {
            iframeImages[i].onload = () => {
              loadedCount++;
              if (loadedCount === totalImages) triggerPrint();
            };
            iframeImages[i].onerror = () => {
              loadedCount++;
              if (loadedCount === totalImages) triggerPrint();
            };
          }
        }
      }
    } else {
      alert(tl('Generating print-ready {{type}} document...\nDownload initiated.', {
        type: type
      }));
    }
  };

  // Extract dynamic values from backend response
  const targetCareers = tailoredData?.target_careers || (activeTargetRole ? [activeTargetRole] : []);
  const profileMatch = tailoredData?.profile_match || {};
  const atsAnalysis = tailoredData?.ats || {};
  const keyRequirements = tailoredData?.career_requirements || [];
  const skillGaps = tailoredData?.skill_gaps || [];
  const resumePayload = tailoredData?.resume || {};
  const headerData = resumePayload.header || {};

  const studentName = headerData.name || user?.name || profileData?.personalInfo?.fullName || 'Candidate';
  const studentEmailDisplay = headerData.email || studentEmail;
  const studentPhoneDisplay = headerData.phone || profileData?.personalInfo?.phone || '';
  const studentGithubDisplay = headerData.github || profileData?.githubLinks?.githubUsername || '';
  const studentLocationDisplay = headerData.location || profileData?.personalInfo?.location || '';
  const studentPhotoUrl = headerData.photo_url || headerData.profile_image || profileData?.personalInfo?.profileImage || profileData?.personalInfo?.photoUrl || user?.profile_image || user?.profileImage || null;

  // Real effective resume data (reflecting local edit buffer if editing)
  const currentResumeData = isEditing ? { ...resumePayload, ...editedResumeBuffer } : resumePayload;


  const busy = loading || isGenerating;
  const formatScore = calculateFormatScore(currentResumeData);
  const keywordScore = calculateKeywordScore(atsAnalysis, keyRequirements, profileMatch);
  const impactScore = calculateImpactScore(currentResumeData);
  const utf8Score = calculateUtf8Score(currentResumeData);
  const metrics = [
    { label: 'Format', value: formatScore, tone: 'info', icon: 'LayoutGrid' },
    { label: 'Keywords', value: keywordScore, tone: 'accent', icon: 'Search' },
    { label: 'Impact', value: impactScore, tone: 'success', icon: 'TrendingUp' },
    { label: 'Encoding', value: utf8Score, tone: 'warning', icon: 'FileText' },
  ];
  const matchedReqs = keyRequirements.filter((r) => r.matched).length;

  const insights = (
    <Stack gap={space.md}>
      <StatTrio
        items={[
          { value: busy ? '…' : atsAnalysis.score ?? '—', label: 'ATS score', tone: 'info' },
          { value: busy ? '…' : typeof profileMatch.overall === 'number' ? `${profileMatch.overall}%` : '—', label: 'Role match', tone: 'success' },
          { value: busy ? '…' : skillGaps.length, label: 'Skill gaps', dashed: true },
        ]}
      />

      <Card>
        <Txt variant="h3" tone="ink">ATS checks</Txt>
        <View style={styles.metricGrid}>
          {metrics.map((m) => (
            <View key={m.label} style={[styles.metricCell, { backgroundColor: toneOf(m.tone).bg }]}>
              <Row justify="space-between">
                <Row gap={6}>
                  <Icon name={m.icon} size={14} color={toneOf(m.tone).ink} />
                  <Txt variant="small" weight={600} tone="ink">{m.label}</Txt>
                </Row>
                <Txt variant="small" weight={700} tone="ink">{busy ? '…' : m.value != null ? `${m.value}%` : 'N/A'}</Txt>
              </Row>
              <ProgressBar value={m.value || 0} tone={m.tone} track="rgba(255,255,255,0.7)" height={6} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
        {(atsAnalysis.matched_keywords || []).length ? (
          <Stack gap={6} style={{ marginTop: space.md }}>
            <Txt variant="overline" tone="subtle">Matched keywords</Txt>
            <Row wrap gap={6}>
              {atsAnalysis.matched_keywords.map((k) => <Pill key={k} label={k} tone="success" size="sm" />)}
            </Row>
          </Stack>
        ) : null}
        {(atsAnalysis.missing_keywords || []).length ? (
          <Stack gap={6} style={{ marginTop: space.md }}>
            <Txt variant="overline" tone="subtle">Missing keywords</Txt>
            <Row wrap gap={6}>
              {atsAnalysis.missing_keywords.map((k) => <Pill key={k} label={k} tone="warning" size="sm" />)}
            </Row>
          </Stack>
        ) : null}
        {(atsAnalysis.recommendations || []).length ? (
          <Inset tone="info" style={{ marginTop: space.md }}>
            <Stack gap={6}>
              {atsAnalysis.recommendations.map((r, i) => (
                <Row key={i} gap={8} align="flex-start">
                  <Icon name="Sparkles" size={15} color={colors.skyInk} />
                  <Txt variant="small" color={colors.skyInk} style={{ flex: 1 }}>{r}</Txt>
                </Row>
              ))}
            </Stack>
          </Inset>
        ) : null}
      </Card>

      <Card badge={{ icon: 'ShieldCheck', tone: 'success' }}>
        <Txt variant="h3" tone="ink">Role requirements</Txt>
        <Txt variant="small" tone="muted" style={{ marginBottom: space.md }}>
          {tailoredData?.hiring_standard || 'Competency benchmark'} · {matchedReqs}/{keyRequirements.length} met
        </Txt>
        {busy ? (
          <Stack gap={8}>
            <Skeleton height={36} />
            <Skeleton height={36} />
          </Stack>
        ) : keyRequirements.length ? (
          <Stack gap={12}>
            {keyRequirements.map((r) => (
              <Stack key={r.skill_id || r.skill_name} gap={6}>
                <Row justify="space-between">
                  <Row gap={8} style={{ flex: 1 }}>
                    <Icon name={r.matched ? 'CircleCheck' : 'Circle'} size={16} color={r.matched ? colors.mintInk : colors.textSubtle} />
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1} style={{ flex: 1 }}>{r.skill_name}</Txt>
                  </Row>
                  <Txt variant="caption" tone="muted">{r.student_level ?? 0}% / {r.required_level ?? 0}%</Txt>
                </Row>
                <ProgressBar value={r.student_level || 0} tone={r.matched ? 'success' : 'warning'} height={6} />
              </Stack>
            ))}
          </Stack>
        ) : (
          <Txt variant="small" tone="subtle">Set a target career to see requirements.</Txt>
        )}
      </Card>

      {skillGaps.length ? (
        <Card tone="warning">
          <Txt variant="h3" tone="ink">Gaps holding your resume back</Txt>
          <Stack gap={8} style={{ marginTop: space.md }}>
            {skillGaps.map((g) => (
              <Inset key={g.skill_id || g.skill_name} tone="warning" padding={space.sm}>
                <Row justify="space-between">
                  <Txt variant="small" weight={700} tone="ink">{g.skill_name}</Txt>
                  <Pill label={g.priority || 'Gap'} tone="peach" size="sm" />
                </Row>
                <Txt variant="caption" color={colors.butterInk}>Currently {g.student_level ?? 0}% · needs {g.required_level ?? 0}%</Txt>
              </Inset>
            ))}
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );

  return (
    (<Page>
      <SectionTitle
        title="Resume builder"
        emoji="📄"
        subtitle={activeTargetRole ? tl('Tailored for {{activeTargetRole}}', {
          activeTargetRole: activeTargetRole
        }) : 'Generated from your verified profile'}
        right={
          <Row gap={8} wrap>
            <Button label="Regenerate" icon="RefreshCw" variant="secondary" onPress={handleRegenerate} loading={isGenerating} />
            {isEditing ? (
              <>
                <Button label="Cancel" variant="secondary" onPress={cancelEditing} />
                <Button label="Save" icon="Check" variant="secondary" onPress={saveEdits} />
              </>
            ) : (
              <Button label="Edit" icon="Pencil" variant="secondary" onPress={startEditing} disabled={busy || !tailoredData} />
            )}
            <Button label="Download PDF" icon="Download" onPress={() => handleDownload('PDF')} disabled={busy || !tailoredData} />
          </Row>
        }
      />
      {targetCareers.length > 1 ? (
        <SegmentedTabs
          options={targetCareers.map((c) => ({ id: c, label: c, icon: 'Target' }))}
          value={activeTargetRole}
          onChange={handleRoleChange}
          scrollable={!isWide}
        />
      ) : null}
      {error ? (
        <Card tone="danger">
          <Row justify="space-between" wrap gap={space.sm}>
            <Row gap={8} style={{ flex: 1 }}>
              <Icon name="CircleAlert" size={18} color="#B4232A" />
              <Txt variant="small" weight={600} color="#B4232A" style={{ flex: 1 }}>{error}</Txt>
            </Row>
            <Button label="Retry" size="sm" variant="light" onPress={() => fetchTailoredResume(activeTargetRole)} />
          </Row>
        </Card>
      ) : null}
      <View style={[styles.grid, isWide ? styles.gridWide : null]}>
        <View style={isWide ? { flex: 1, minWidth: 0 } : null}>{insights}</View>
        <View style={isWide ? { flex: 1.45, minWidth: 0 } : null}>
          {busy ? (
            <Card padding={space.xxl}>
              <Stack gap={12}>
                <Skeleton height={28} width="50%" />
                <Skeleton height={14} width="35%" />
                <Skeleton height={80} />
                <Skeleton height={14} width="30%" />
                <Skeleton height={120} />
              </Stack>
            </Card>
          ) : (
            <ResumeSheet
              data={currentResumeData}
              name={studentName}
              role={activeTargetRole}
              photo={studentPhotoUrl}
              contact={[studentEmailDisplay, studentPhoneDisplay, studentLocationDisplay, studentGithubDisplay ? `github.com/${studentGithubDisplay}` : null].filter(Boolean)}
              isEditing={isEditing}
              onSummary={(val) => setEditedResumeBuffer((prev) => ({ ...prev, summary: val }))}
            />
          )}
        </View>
      </View>
    </Page>)
  );
}

function Section({ title, children }) {
  return (
    <Stack gap={8}>
      <Row gap={8}>
        <Txt variant="overline" tone="ink">{title}</Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </Row>
      {children}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// ResumeSheet — paper-style preview of the generated resume.
// ---------------------------------------------------------------------------
function ResumeSheet({ data, name, role, photo, contact, isEditing, onSummary }) {
  const skills = data.skills || [];
  const experience = data.experience || [];
  const projects = data.projects || [];
  const education = data.education || [];
  const certifications = data.certifications || [];
  return (
    <Card padding={space.xxl} style={shadows.raised}>
      <Stack gap={space.lg}>
        <Row gap={space.md} align="center" wrap>
          <Avatar name={name} uri={photo || undefined} size={64} tone="accent" />
          <Stack gap={2} style={{ flex: 1, minWidth: 200 }}>
            <Txt variant="h1" tone="ink">{name}</Txt>
            {role ? <Txt variant="title" color={colors.lilacInk}>{role}</Txt> : null}
            <Txt variant="caption" tone="muted">{contact.join('  ·  ')}</Txt>
          </Stack>
        </Row>

        <Section title="Summary">
          {isEditing ? (
            <Field multiline value={data.summary || ''} onChangeText={onSummary} placeholder="Write a short professional summary…" />
          ) : (
            <Txt variant="small" tone="default" style={{ lineHeight: 20 }}>{data.summary || 'No summary yet.'}</Txt>
          )}
        </Section>

        {skills.length ? (
          <Section title="Skills">
            <Stack gap={4}>
              {skills.map((s, i) => (
                <Row key={i} gap={10} align="flex-start">
                  <Txt variant="small" weight={700} tone="ink" style={{ width: 110 }}>{s.label}</Txt>
                  <Txt variant="small" tone="default" style={{ flex: 1 }}>{s.value}</Txt>
                </Row>
              ))}
            </Stack>
          </Section>
        ) : null}

        {experience.length ? (
          <Section title="Experience">
            <Stack gap={space.sm}>
              {experience.map((e, i) => (
                <Stack key={i} gap={2}>
                  <Row justify="space-between" wrap>
                    <Txt variant="small" weight={700} tone="ink">{e.title}</Txt>
                    <Txt variant="caption" tone="muted">{e.period}</Txt>
                  </Row>
                  <Txt variant="caption" tone="muted">{e.company}</Txt>
                  {(e.bullets || []).map((b, j) => (
                    <Txt key={j} variant="small" tone="default">• {b}</Txt>
                  ))}
                </Stack>
              ))}
            </Stack>
          </Section>
        ) : null}

        {projects.length ? (
          <Section title="Projects">
            <Stack gap={space.sm}>
              {projects.map((p, i) => (
                <Stack key={i} gap={3}>
                  <Row gap={8} wrap>
                    <Txt variant="small" weight={700} tone="ink">{p.title}</Txt>
                    {p.verified ? <Pill label="Verified" tone="success" icon="ShieldCheck" size="sm" /> : null}
                    {p.type ? <Txt variant="caption" tone="muted">{p.type}</Txt> : null}
                  </Row>
                  {(p.bullets && p.bullets.length ? p.bullets : p.description ? [p.description] : []).map((b, j) => (
                    <Txt key={j} variant="small" tone="default">• {b}</Txt>
                  ))}
                  {(p.technologies || []).length ? (
                    <Row wrap gap={4} style={{ marginTop: 2 }}>
                      {p.technologies.map((t) => <Pill key={t} label={t} size="sm" />)}
                    </Row>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </Section>
        ) : null}

        {education.length ? (
          <Section title="Education">
            {education.map((e, i) => (
              <Row key={i} justify="space-between" align="flex-start" wrap>
                <Stack gap={1} style={{ flex: 1, minWidth: 200 }}>
                  <Txt variant="small" weight={700} tone="ink">{e.degree}</Txt>
                  <Txt variant="caption" tone="muted">{e.university}{e.cgpa ? ` · CGPA ${e.cgpa}` : ''}</Txt>
                </Stack>
                <Txt variant="caption" tone="muted">{e.graduationYear}</Txt>
              </Row>
            ))}
          </Section>
        ) : null}

        {certifications.length ? (
          <Section title="Certifications">
            {certifications.map((c, i) => (
              <Txt key={i} variant="small" tone="default">• {typeof c === 'string' ? c : c.name || c.title}</Txt>
            ))}
          </Section>
        ) : null}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: space.xl,
  },
  gridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.md,
  },
  metricCell: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: radii.md,
    padding: space.sm,
  },
});
