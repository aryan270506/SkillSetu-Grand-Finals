import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { CLAY_COLORS, ensureClayGlobalStyles } from './components/DesignTokens';
import AmbientBackground from './components/AmbientBackground';
import ResumeHeader from './components/ResumeHeader';
import RoleCalibrationCard from './components/RoleCalibrationCard';
import VerifiedSkillsLedger from './components/VerifiedSkillsLedger';
import SkillGapsCard from './components/SkillGapsCard';
import ATSScoreMetricsCard from './components/ATSScoreMetricsCard';
import ResumePreview from './components/ResumePreview';
import BottomActionBar from './components/BottomActionBar';
import ResumeFooter from './components/ResumeFooter';
import ResumeLoadingSkeleton from './components/ResumeLoadingSkeleton';
import ResumeErrorState from './components/ResumeErrorState';

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

  // Inject Google Fonts and Claymorphism CSS keyframes once
  useEffect(() => {
    ensureClayGlobalStyles();
  }, []);

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
      const url = `http://127.0.0.1:8000/api/v1/student/tailored-resume?email=${emailQuery}${careerParam}`;

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
      alert(`Generating print-ready ${type} document...\nDownload initiated.`);
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

  return (
    <View style={styles.outerContainer}>
      <AmbientBackground />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="clay-page-enter" style={styles.centerConstrainedContainer}>
          {/* TOP HERO / HEADER CARD */}
          <ResumeHeader
            activeTargetRole={activeTargetRole}
            isGenerating={isGenerating}
            onRegenerate={handleRegenerate}
            onDownloadPdf={() => handleDownload('PDF')}
            isEditing={isEditing}
            onToggleEdit={() => (isEditing ? cancelEditing() : startEditing())}
          />

          {error && (
            <ResumeErrorState
              message={error}
              onRetry={() => fetchTailoredResume(activeTargetRole)}
            />
          )}

          {/* MAIN 2-COLUMN WORKSPACE (40% LEFT / 60% RIGHT) */}
          <View style={[styles.mainGrid, !isWide && styles.flexCol]}>
            {/* LEFT COLUMN (approx 40%) */}
            <View style={styles.leftCol}>
              {/* 1. Role Calibration */}
              <RoleCalibrationCard
                activeTargetRole={activeTargetRole}
                targetCareers={targetCareers}
                onSelectRole={handleRoleChange}
                matchScore={typeof profileMatch.overall === 'number' ? profileMatch.overall : null}
                requirements={keyRequirements}
                hiringStandard={tailoredData?.hiring_standard}
                taxonomy={tailoredData?.taxonomy}
              />

              {/* 2. Verified Skills Ledger */}
              <VerifiedSkillsLedger requirements={keyRequirements} />

              {/* 3. Skill Gaps Affecting Resume */}
              <SkillGapsCard skillGaps={skillGaps} />
            </View>

            {/* RIGHT COLUMN (approx 60%) */}
            <View style={styles.rightCol}>
              {/* 1. ATS Score & 4 Dynamic Metrics (Format, Keyword, Impact, UTF-8) */}
              <ATSScoreMetricsCard
                atsData={atsAnalysis}
                profileMatch={profileMatch}
                resumeData={currentResumeData}
                careerRequirements={keyRequirements}
                loading={loading || isGenerating}
              />

              {/* 2. Large Dominating Resume Preview Sheet */}
              {loading || isGenerating ? (
                <ResumeLoadingSkeleton />
              ) : (
                <ResumePreview
                  resumeData={resumePayload}
                  editedBuffer={editedResumeBuffer}
                  isEditing={isEditing}
                  onUpdateBuffer={setEditedResumeBuffer}
                  activeTargetRole={activeTargetRole}
                  zoom={zoom}
                />
              )}
            </View>
          </View>

          {/* BOTTOM FLOATING ACTION / STATUS BAR */}
          <BottomActionBar
            isEditing={isEditing}
            onStartEdit={startEditing}
            onSaveEdit={saveEdits}
            onCancelEdit={cancelEditing}
            onDownloadPdf={() => handleDownload('PDF')}
            zoom={zoom}
            setZoom={setZoom}
          />

          {/* FOOTER */}
          <ResumeFooter />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: CLAY_COLORS.canvas,
    position: 'relative',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    paddingBottom: 40,
    zIndex: 1,
  },
  centerConstrainedContainer: {
    width: '100%',
    maxWidth: 1380,
    alignSelf: 'center',
    gap: 16,
  },
  mainGrid: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  flexCol: {
    flexDirection: 'column',
  },
  leftCol: {
    flex: 4.2,
    minWidth: 320,
    gap: 16,
  },
  rightCol: {
    flex: 5.8,
    minWidth: 360,
    gap: 16,
  },
});
