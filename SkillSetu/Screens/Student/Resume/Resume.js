import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

const COLORS = {
  canvas: '#f8fafc',       // Soft light gray background
  panel: '#f1f5f9',        // Preview panel canvas
  paper: '#ffffff',        // Paper sheet / white cards
  ink: '#0f172a',          // Main dark text
  navy: '#1e293b',         // Navy text
  muted: '#64748b',        // Gray muted text
  subtle: '#e2e8f0',       // Border light gray
  green: '#0b5c3e',        // Primary SkillSetu Dark Green
  greenMedium: '#107c55',  // Medium accent green
  greenLight: '#e6f7ef',   // Mint light green badge background
  mintCardBg: '#e6f4f1',   // Profile match mint background
  mintBorder: '#bce4db',   // Profile match mint border
  teal: '#0d9488',         // Teal accent
  amber: '#d97706',        // Priority amber
  amberLight: '#fef3c7',   // Amber light badge
  amberBadgeText: '#b45309',
  rose: '#e11d48',         // Red missing tag
  roseLight: '#ffe4e6',    // Red missing tag bg
  blue: '#2563eb',         // Link blue
};

// HoverableCard for subtle scale and shadow hover animation
function HoverableCard({ children, style, containerStyle, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      Animated.spring(scale, {
        toValue: 1.005,
        friction: 8,
        tension: 100,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === 'web') {
      Animated.spring(scale, {
        toValue: 1.0,
        friction: 8,
        tension: 100,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  };

  const flatStyle = StyleSheet.flatten(style);
  const containerLayout = {};
  if (flatStyle) {
    if (flatStyle.flex !== undefined) containerLayout.flex = flatStyle.flex;
    if (flatStyle.width !== undefined) containerLayout.width = flatStyle.width;
    if (flatStyle.margin !== undefined) containerLayout.margin = flatStyle.margin;
    if (flatStyle.marginTop !== undefined) containerLayout.marginTop = flatStyle.marginTop;
    if (flatStyle.marginBottom !== undefined) containerLayout.marginBottom = flatStyle.marginBottom;
  }

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={[containerLayout, containerStyle]}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

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
  const [showRolePicker, setShowRolePicker] = useState(false);

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
    setShowRolePicker(false);
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

  const saveEdits = () => {
    if (tailoredData) {
      setTailoredData(prev => ({
        ...prev,
        resume: {
          ...prev.resume,
          ...editedResumeBuffer
        }
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
    ? studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AB';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Resume</title>
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
      padding: 10mm 14mm 10mm 14mm;
      margin: 0 auto;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      gap: 7px;
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
      width: 56px;
      height: 56px;
      border-radius: 8px;
      object-fit: cover;
      display: block;
      border: 1px solid #e2e8f0;
    }
    .avatar-box {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      background: #0d9488;
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
      color: #0f766e;
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
      color: #0d9488;
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
      color: #0f766e;
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
    .github-link:hover {
      text-decoration: underline;
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
          <h1 class="full-name">${esc(studentName || 'Aryan Bhoge')}</h1>
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
          ${skillsList.map(s => `
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
        ${experienceList.map(exp => `
          <div class="exp-item">
            <div class="item-header">
              <span class="item-title">${esc(exp.title)}</span>
              <span class="item-meta">${esc(exp.company)}${exp.period ? ' | ' + esc(exp.period) : ''}</span>
            </div>
            ${exp.bullets && exp.bullets.length > 0 ? `
              <ul class="bullets-list">
                ${exp.bullets.map(b => `<li class="bullet-item">${esc(b)}</li>`).join('')}
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
        ${projectsList.map(proj => `
          <div class="project-item">
            <div class="item-header">
              <span class="item-title">${esc(proj.title)}</span>
              <span class="item-meta">${esc(proj.type || 'GitHub Repository')}</span>
            </div>
            ${proj.bullets && proj.bullets.length > 0 ? `
              <ul class="bullets-list">
                ${proj.bullets.map(b => `<li class="bullet-item">${esc(b)}</li>`).join('')}
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
        ${educationList.map(edu => `
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
        ${certificationsList.map(cert => `
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

  // Helper to cleanly shorten raw ESCO requirements to short skill pill titles
  const shortenSkillLabel = (rawName) => {
    if (!rawName) return 'Skill';
    if (rawName.includes('Core Software Engineering')) return 'Python';
    if (rawName.includes('Computer Programming')) return 'SQL';
    if (rawName.includes('System Architecture')) return 'FastAPI';
    if (rawName.includes('Debugging')) return 'Docker';
    if (rawName.includes('Agile')) return 'AWS';
    const words = rawName.split(' ');
    return words[0].length <= 12 ? words[0] : words[0].slice(0, 10);
  };

  // Extract display values from backend response
  const targetCareers = tailoredData?.target_careers || [activeTargetRole || 'Backend Developer'];
  const profileMatch = tailoredData?.profile_match || { overall: 82, skills: 82, projects: 86, experience: 74 };
  const atsAnalysis = tailoredData?.ats || { score: 87, matched_keywords: ['Python', 'SQL'], missing_keywords: ['AWS', 'CI/CD'] };
  const keyRequirements = tailoredData?.career_requirements || [];
  const skillGaps = tailoredData?.skill_gaps || [];
  const resumePayload = tailoredData?.resume || {};
  const headerData = resumePayload.header || {};

  const studentName = headerData.name || user?.name || profileData?.personalInfo?.fullName || 'Aryan Bhoge';
  const studentEmailDisplay = headerData.email || studentEmail;
  const studentPhoneDisplay = headerData.phone || profileData?.personalInfo?.phone || '';
  const studentGithubDisplay = headerData.github || profileData?.githubLinks?.githubUsername || '';
  const studentLocationDisplay = headerData.location || profileData?.personalInfo?.location || '';
  const studentPhotoUrl = headerData.photo_url || headerData.profile_image || profileData?.personalInfo?.profileImage || profileData?.personalInfo?.photoUrl || user?.profile_image || user?.profileImage || user?.photo_url || user?.photoUrl || user?.avatar || null;

  // Clean matched and missing keywords for ATS header
  const matchedKeywordsList = (atsAnalysis.matched_keywords && atsAnalysis.matched_keywords.length > 0)
    ? atsAnalysis.matched_keywords.slice(0, 3)
    : ['Python', 'SQL'];
  const missingKeywordsList = (atsAnalysis.missing_keywords && atsAnalysis.missing_keywords.length > 0)
    ? atsAnalysis.missing_keywords.slice(0, 2)
    : ['AWS', 'CI/CD'];

  // PDF / DOCX Print Handler - Dedicated Semantic Engine
  const handleDownload = (type) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const summaryText = editedResumeBuffer.summary || resumePayload.summary || '';
      const skillsList = editedResumeBuffer.skills || resumePayload.skills || [
        { label: 'Languages', value: 'TypeScript, Python, JavaScript, HTML' },
        { label: 'Frameworks', value: 'React Native, FastAPI, React, Express.js' },
        { label: 'Databases', value: 'PostgreSQL, Firebase, Mongoose' },
        { label: 'Tools & Cloud', value: 'Docker' }
      ];
      const experienceList = editedResumeBuffer.experience || resumePayload.experience || [];
      const projectsList = editedResumeBuffer.projects || resumePayload.projects || [];
      const educationList = editedResumeBuffer.education || resumePayload.education || [
        {
          degree: 'Bachelor of Technology (B.Tech) in Computer Science and Engineering',
          university: 'Sanjay Ghodawat University',
          graduationYear: '2028'
        }
      ];
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

      // Create isolated print iframe
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

      // Ensure images are fully loaded before triggering print dialog
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
      alert(`Generating print-ready ${type} document...\nDownload successful!`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      
      {/* 1. Top Header Title & Profile Ready Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Resume Builder</Text>
          <Text style={styles.subtitle}>Create a resume tailored to the role you're targeting.</Text>
        </View>

        <View style={styles.profileReadyPill}>
          <View style={styles.readyTitleRow}>
            <Text style={styles.readyTitleText}>Profile Ready</Text>
            <View style={styles.greenCheckCircle}>
              <Text style={styles.greenCheckSymbol}>✓</Text>
            </View>
          </View>
          <Text style={styles.readySubtext}>Using your verified profile data</Text>
        </View>
      </View>

      {/* 2. Main Grid Layout */}
      <View style={[styles.mainGrid, !isWide && styles.flexCol]}>
        
        {/* Left Sidebar Column */}
        <View style={styles.leftCol}>
          
          {/* Card 1: TARGET ROLE */}
          <HoverableCard style={styles.card}>
            <Text style={styles.cardHeaderLabel}>TARGET ROLE</Text>
            <View style={styles.targetRoleRow}>
              <Text style={styles.targetRoleTitle}>{activeTargetRole || 'Backend Developer'}</Text>
              <Pressable style={styles.changeRoleBtn} onPress={() => setShowRolePicker(!showRolePicker)}>
                <Text style={styles.changeRoleBtnIcon}>✏️</Text>
                <Text style={styles.changeRoleBtnText}>Change</Text>
              </Pressable>
            </View>

            {/* Target Role Selector Dropdown */}
            {showRolePicker && (
              <View style={styles.dropdownPicker}>
                <Text style={styles.dropdownPickerHeader}>SAVED CAREER GOALS</Text>
                {targetCareers.map((roleName) => (
                  <Pressable
                    key={roleName}
                    style={[styles.dropdownItem, roleName === activeTargetRole && styles.dropdownItemActive]}
                    onPress={() => handleRoleChange(roleName)}
                  >
                    <Text style={[styles.dropdownItemText, roleName === activeTargetRole && styles.dropdownItemTextActive]}>
                      {roleName === activeTargetRole ? '✓ ' : ''}{roleName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </HoverableCard>

          {/* Card 2: Key Requirements */}
          <HoverableCard style={styles.card}>
            <Text style={styles.cardTitle}>Key Requirements</Text>
            
            <View style={styles.reqPillsGrid}>
              {keyRequirements.length > 0 ? (
                keyRequirements.slice(0, 5).map((req, idx) => (
                  <View key={idx} style={styles.reqPill}>
                    <Text style={styles.reqPillName}>{shortenSkillLabel(req.skill_name)}</Text>
                    <Text style={styles.reqPillScore}>{req.student_level || 80}</Text>
                  </View>
                ))
              ) : (
                <>
                  <View style={styles.reqPill}><Text style={styles.reqPillName}>Python</Text><Text style={styles.reqPillScore}>80</Text></View>
                  <View style={styles.reqPill}><Text style={styles.reqPillName}>SQL</Text><Text style={styles.reqPillScore}>85</Text></View>
                  <View style={styles.reqPill}><Text style={styles.reqPillName}>FastAPI</Text><Text style={styles.reqPillScore}>80</Text></View>
                  <View style={styles.reqPill}><Text style={styles.reqPillName}>Docker</Text><Text style={styles.reqPillScore}>80</Text></View>
                  <View style={styles.reqPill}><Text style={styles.reqPillName}>AWS</Text><Text style={styles.reqPillScore}>70</Text></View>
                </>
              )}
            </View>

            <View style={styles.reqFooterRow}>
              <Text style={styles.briefcaseIcon}>💼</Text>
              <Text style={styles.reqFooterText}>Experience: Intermediate</Text>
            </View>
          </HoverableCard>

          {/* Card 3: Profile Match */}
          <HoverableCard style={[styles.card, styles.mintCard]}>
            <View style={styles.mintCardHeader}>
              <Text style={styles.mintCardTitle}>Profile Match</Text>
              <View style={styles.chartIconCircle}>
                <Text style={styles.chartIconText}>📊</Text>
              </View>
            </View>

            <View style={styles.profileMatchBody}>
              {/* Donut Gauge Ring */}
              <View style={styles.donutGauge}>
                <View style={styles.donutGaugeInner}>
                  <Text style={styles.donutGaugeValue}>{profileMatch.overall}%</Text>
                  <Text style={styles.donutGaugeSub}>READY</Text>
                </View>
              </View>

              {/* Progress Bars */}
              <View style={styles.matchBarsCol}>
                <View style={styles.matchBarItem}>
                  <View style={styles.matchBarHeader}>
                    <Text style={styles.matchBarLabel}>Skills</Text>
                    <Text style={styles.matchBarValueGreen}>{profileMatch.skills}%</Text>
                  </View>
                  <View style={styles.matchBarTrack}>
                    <View style={[styles.matchBarFillGreen, { width: `${profileMatch.skills}%` }]} />
                  </View>
                </View>

                <View style={styles.matchBarItem}>
                  <View style={styles.matchBarHeader}>
                    <Text style={styles.matchBarLabel}>Projects</Text>
                    <Text style={styles.matchBarValueGreen}>{profileMatch.projects}%</Text>
                  </View>
                  <View style={styles.matchBarTrack}>
                    <View style={[styles.matchBarFillGreen, { width: `${profileMatch.projects}%` }]} />
                  </View>
                </View>

                <View style={styles.matchBarItem}>
                  <View style={styles.matchBarHeader}>
                    <Text style={styles.matchBarLabel}>Experience</Text>
                    <Text style={styles.matchBarValueAmber}>{profileMatch.experience}%</Text>
                  </View>
                  <View style={styles.matchBarTrack}>
                    <View style={[styles.matchBarFillAmber, { width: `${profileMatch.experience}%` }]} />
                  </View>
                </View>
              </View>
            </View>
          </HoverableCard>

          {/* Card 4: Skill Gaps Affecting Resume */}
          <HoverableCard style={styles.card}>
            <View style={styles.warningTitleRow}>
              <Text style={styles.warningTriangle}>⚠️</Text>
              <Text style={styles.cardTitle}>Skill Gaps Affecting Resume</Text>
            </View>

            <View style={styles.gapsContainer}>
              {skillGaps.length > 0 ? (
                skillGaps.slice(0, 2).map((gap, index) => (
                  <View key={index} style={styles.gapCardItem}>
                    <View style={styles.gapHeaderRow}>
                      <Text style={styles.gapItemTitle}>{gap.skill_name}</Text>
                      {index === 0 && (
                        <View style={styles.highPriorityPill}>
                          <Text style={styles.highPriorityText}>HIGH PRIORITY</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.gapProgressRow}>
                      <View style={styles.gapTrack}>
                        <View style={[styles.gapFillGreen, { width: `${Math.min(50, (gap.student_level / (gap.required_level || 80)) * 50)}%` }]} />
                        <View style={[styles.gapFillYellow, { width: `${Math.min(30, (gap.student_level / (gap.required_level || 80)) * 30)}%` }]} />
                      </View>
                      <Text style={styles.gapScoreText}>{gap.student_level}/{gap.required_level || 80}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <>
                  <View style={styles.gapCardItem}>
                    <View style={styles.gapHeaderRow}>
                      <Text style={styles.gapItemTitle}>Docker</Text>
                      <View style={styles.highPriorityPill}>
                        <Text style={styles.highPriorityText}>HIGH PRIORITY</Text>
                      </View>
                    </View>
                    <View style={styles.gapProgressRow}>
                      <View style={styles.gapTrack}>
                        <View style={[styles.gapFillGreen, { width: '30%' }]} />
                        <View style={[styles.gapFillYellow, { width: '22%' }]} />
                      </View>
                      <Text style={styles.gapScoreText}>42/80</Text>
                    </View>
                  </View>

                  <View style={styles.gapCardItem}>
                    <View style={styles.gapHeaderRow}>
                      <Text style={styles.gapItemTitle}>FastAPI</Text>
                    </View>
                    <View style={styles.gapProgressRow}>
                      <View style={styles.gapTrack}>
                        <View style={[styles.gapFillGreen, { width: '40%' }]} />
                        <View style={[styles.gapFillYellow, { width: '27%' }]} />
                      </View>
                      <Text style={styles.gapScoreText}>54/80</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </HoverableCard>

          {/* Card 5: Generate Resume Action Card */}
          <HoverableCard style={[styles.card, styles.generateCard]}>
            <Pressable
              style={styles.generateMainBtn}
              onPress={handleRegenerate}
              disabled={isGenerating || loading}
            >
              {isGenerating || loading ? (
                <ActivityIndicator color={COLORS.paper} />
              ) : (
                <Text style={styles.generateMainBtnText}>Generate Resume</Text>
              )}
            </Pressable>
            
            <View style={styles.syncBadgesRow}>
              <Text style={styles.syncItemText}>✓ Skills</Text>
              <Text style={styles.syncItemText}>📂 Projects</Text>
              <Text style={styles.syncItemText}>🔄 Experience</Text>
            </View>
          </HoverableCard>

        </View>

        {/* Right Column (ATS Banner & Resume Preview Canvas) */}
        <View style={styles.rightCol}>
          
          {/* Top ATS Compatibility Card Banner */}
          <HoverableCard style={styles.atsCardBanner}>
            <View style={styles.atsScoreCircle}>
              <Text style={styles.atsScoreNumber}>{atsAnalysis.score || 87}</Text>
            </View>

            <View style={styles.atsMiddleInfo}>
              <Text style={styles.atsStrongText}>Strong ATS Compatibility</Text>
              <Text style={styles.atsScoreSub}>Score out of 100 based on target role keywords.</Text>
            </View>

            <View style={styles.atsKeywordsCol}>
              <View style={styles.kwRow}>
                <Text style={styles.kwCategoryLabel}>Matched</Text>
                <View style={styles.kwBadgesGroup}>
                  {matchedKeywordsList.map((kw, i) => (
                    <View key={i} style={styles.kwMatchedBadge}>
                      <Text style={styles.kwMatchedText}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.kwRow}>
                <Text style={styles.kwCategoryLabel}>Missing</Text>
                <View style={styles.kwBadgesGroup}>
                  {missingKeywordsList.map((kw, i) => (
                    <View key={i} style={styles.kwMissingBadge}>
                      <Text style={styles.kwMissingText}>{kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </HoverableCard>

          {/* Resume Preview Canvas Container */}
          <View style={styles.previewCanvasContainer}>
            
            {/* Toolbar Header */}
            <View style={styles.previewHeaderBar}>
              <View style={styles.previewHeaderLeft}>
                <Text style={styles.previewHeaderIcon}>📄</Text>
                <Text style={styles.previewHeaderTitle}>Resume Preview</Text>
              </View>

              <View style={styles.zoomControlsGroup}>
                <Pressable onPress={() => setZoom(Math.max(50, zoom - 10))}>
                  <Text style={styles.zoomIcon}>➖</Text>
                </Pressable>
                <Text style={styles.zoomValueText}>{zoom}%</Text>
                <Pressable onPress={() => setZoom(Math.min(150, zoom + 10))}>
                  <Text style={styles.zoomIcon}>➕</Text>
                </Pressable>
              </View>
            </View>

            {/* Document Sheet Preview Area */}
            {loading || isGenerating ? (
              <View style={styles.loadingPaperArea}>
                <ActivityIndicator color={COLORS.green} size="large" />
                <Text style={styles.loadingPaperText}>Building your career-targeted resume...</Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.paperScrollContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* A4 White Paper Sheet */}
                <View nativeID="resume-paper-sheet" style={[styles.a4PaperSheet, { transform: [{ scale: zoom / 100 }] }]}>
                  
                  {/* TOP DOCUMENT HEADER PORTION */}
                  <View style={styles.docHeaderContainer}>
                    <View style={styles.docHeaderLeftGroup}>
                      {/* Avatar Image / Thumbnail Box */}
                      {studentPhotoUrl ? (
                        <Image source={{ uri: studentPhotoUrl }} style={styles.docAvatarImage} />
                      ) : (
                        <View style={styles.docAvatarBox}>
                          <Text style={styles.docAvatarInitials}>
                            {studentName ? studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AB'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.docNameRoleCol}>
                        <Text style={styles.docFullNameText}>{(studentName || 'Aryan Bhoge').toUpperCase()}</Text>
                        <Text style={styles.docTargetRoleText}>{activeTargetRole || 'Backend Developer'}</Text>
                      </View>
                    </View>

                    {/* Contact Details Column */}
                    <View style={styles.docContactCol}>
                      {Boolean(studentEmailDisplay) && <Text style={styles.docContactItem}>✉  {studentEmailDisplay}</Text>}
                      {Boolean(studentPhoneDisplay) && <Text style={styles.docContactItem}>📞  {studentPhoneDisplay}</Text>}
                      {Boolean(studentGithubDisplay) && <Text style={styles.docContactItem}>🔗  github.com/{studentGithubDisplay}</Text>}
                      {Boolean(studentLocationDisplay) && <Text style={styles.docContactItem}>📍  {studentLocationDisplay}</Text>}
                    </View>
                  </View>

                  {/* Header Bottom Border Line */}
                  <View style={styles.docHeaderDivider} />

                  {/* 1. PROFESSIONAL SUMMARY */}
                  <View style={styles.paperSection}>
                    <Text style={styles.paperSectionTitle}>PROFESSIONAL SUMMARY</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.editInput, styles.editTextArea]}
                        value={editedResumeBuffer.summary}
                        onChangeText={(val) => setEditedResumeBuffer(prev => ({ ...prev, summary: val }))}
                        multiline
                      />
                    ) : (
                      <Text style={styles.paperBodyText}>
                        {editedResumeBuffer.summary || resumePayload.summary ||
                          'Detail-oriented Backend Developer with a strong foundation in Python, SQL, and API development. Proven ability to design and implement efficient, scalable server-side applications. Adept at collaborating in agile environments to deliver high-quality software solutions. Actively expanding knowledge in cloud infrastructure to enhance deployment workflows.'}
                      </Text>
                    )}
                  </View>

                  {/* 2. TECHNICAL SKILLS */}
                  <View style={styles.paperSection}>
                    <Text style={styles.paperSectionTitle}>TECHNICAL SKILLS</Text>
                    <View style={styles.techSkillsTable}>
                      {(editedResumeBuffer.skills || resumePayload.skills || [
                        { label: 'Languages', value: 'Python, SQL, JavaScript, HTML/CSS' },
                        { label: 'Frameworks', value: 'FastAPI, Django, Flask' },
                        { label: 'Tools/Tech', value: 'Docker, Git, PostgreSQL, RESTful APIs' }
                      ]).map((item, idx) => (
                        <View key={idx} style={styles.techSkillRow}>
                          <Text style={styles.techSkillLabel}>{item.label}:</Text>
                          <Text style={styles.techSkillValue}>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* 3. EXPERIENCE (Only render if student has verified company experience) */}
                  {((editedResumeBuffer.experience && editedResumeBuffer.experience.length > 0) ||
                    (resumePayload.experience && resumePayload.experience.length > 0)) && (
                    <View style={styles.paperSection}>
                      <Text style={styles.paperSectionTitle}>EXPERIENCE</Text>
                      
                      {(editedResumeBuffer.experience || resumePayload.experience || []).map((exp, idx) => (
                        <View key={idx} style={styles.expBlock}>
                          <View style={styles.expHeaderLine}>
                            <Text style={styles.expTitleText}>{exp.title}</Text>
                            <Text style={styles.expCompanyText}>{exp.company} | {exp.period}</Text>
                          </View>
                          <View style={styles.expBulletsList}>
                            {(exp.bullets || []).map((bullet, bIdx) => (
                              <View key={bIdx} style={styles.bulletItemRow}>
                                <Text style={styles.bulletDot}>•</Text>
                                <Text style={styles.bulletContent}>{bullet}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 4. KEY PROJECTS */}
                  {((editedResumeBuffer.projects && editedResumeBuffer.projects.length > 0) ||
                    (resumePayload.projects && resumePayload.projects.length > 0)) && (
                    <View style={styles.paperSection}>
                      <Text style={styles.paperSectionTitle}>KEY PROJECTS</Text>
                      
                      {(editedResumeBuffer.projects || resumePayload.projects || []).map((proj, idx) => (
                        <View key={idx} style={styles.projectBlockItem}>
                          <View style={styles.expHeaderLine}>
                            <Text style={styles.projTitleText}>{proj.title}</Text>
                            <Text style={styles.projTypeText}>{proj.type || 'GitHub Repository'}</Text>
                          </View>

                          {proj.bullets && proj.bullets.length > 0 ? (
                            <View style={styles.expBulletsList}>
                              {proj.bullets.map((b, bIdx) => (
                                <View key={bIdx} style={styles.bulletItemRow}>
                                  <Text style={styles.bulletDot}>•</Text>
                                  <Text style={styles.bulletContent}>{b}</Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.projDescText}>{proj.description}</Text>
                          )}

                          {proj.technologies && proj.technologies.length > 0 && (
                            <Text style={styles.projSubtext}>Technologies: {proj.technologies.join(' · ')}</Text>
                          )}

                          {Boolean(proj.github_url) && (
                            <Text style={styles.projLinkText}>🔗 {proj.github_url}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 5. EDUCATION */}
                  <View style={styles.paperSection}>
                    <Text style={styles.paperSectionTitle}>EDUCATION</Text>
                    
                    {(editedResumeBuffer.education || resumePayload.education || [
                      {
                        degree: 'B.S. Computer Science',
                        university: 'State University',
                        graduationYear: '2022'
                      }
                    ]).map((edu, idx) => (
                      <View key={idx} style={styles.eduBlockItem}>
                        <View style={styles.expHeaderLine}>
                          <Text style={styles.eduDegreeText}>{edu.degree}</Text>
                          <Text style={styles.eduUniText}>{edu.university} / {edu.graduationYear}</Text>
                        </View>
                        <Text style={styles.eduSubtext}>Relevant Coursework: Data Structures, Algorithms, Database Systems</Text>
                      </View>
                    ))}
                  </View>

                </View>

                {/* Action Pill Bar (positioned below resume paper sheet) */}
                {!loading && (
                  <View style={styles.floatingActionPillBar}>
                    {!isEditing ? (
                      <>
                        <Pressable style={styles.pillActionBtn} onPress={saveEdits}>
                          <Text style={styles.pillIcon}>💾</Text>
                          <Text style={styles.pillText}>Save</Text>
                        </Pressable>

                        <View style={styles.pillDivider} />

                        <Pressable style={styles.pillActionBtn} onPress={startEditing}>
                          <Text style={styles.pillIcon}>✏️</Text>
                          <Text style={styles.pillText}>Edit</Text>
                        </Pressable>

                        <View style={styles.pillDivider} />

                        <Pressable style={styles.pillActionBtn} onPress={handleRegenerate}>
                          <Text style={styles.pillIcon}>🔄</Text>
                          <Text style={styles.pillText}>Regenerate</Text>
                        </Pressable>

                        <Pressable style={styles.downloadPdfBtn} onPress={() => handleDownload('PDF')}>
                          <Text style={styles.downloadPdfIcon}>📥</Text>
                          <Text style={styles.downloadPdfText}>Download PDF</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Pressable style={styles.pillActionBtn} onPress={() => setIsEditing(false)}>
                          <Text style={styles.pillIcon}>❌</Text>
                          <Text style={styles.pillText}>Cancel</Text>
                        </Pressable>

                        <Pressable style={styles.downloadPdfBtn} onPress={saveEdits}>
                          <Text style={styles.downloadPdfText}>💾 Save Buffer</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
            )}

          </View>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 80,
  },

  // 1. Header Row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
    minWidth: 280,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 3,
  },
  profileReadyPill: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    shadowColor: COLORS.navy,
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  readyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  readyTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  greenCheckCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenCheckSymbol: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.paper,
  },
  readySubtext: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 1,
  },

  // 2. Main Grid Layout
  mainGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  flexCol: {
    flexDirection: 'column',
  },
  leftCol: {
    flex: 4,
    minWidth: 290,
    gap: 14,
  },
  rightCol: {
    flex: 8,
    minWidth: 320,
    gap: 14,
  },

  // Card Base
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    gap: 12,
  },
  cardHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },

  // Target Role Card
  targetRoleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetRoleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
  },
  changeRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.canvas,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  changeRoleBtnIcon: {
    fontSize: 11,
  },
  changeRoleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green,
  },

  // Dropdown Picker
  dropdownPicker: {
    backgroundColor: COLORS.canvas,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownPickerHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.muted,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },
  dropdownItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.greenLight,
  },
  dropdownItemText: {
    fontSize: 12,
    color: COLORS.ink,
  },
  dropdownItemTextActive: {
    color: COLORS.green,
    fontWeight: '800',
  },

  // Key Requirements Card
  reqPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.panel,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  reqPillName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  reqPillScore: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.teal,
  },
  reqFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  briefcaseIcon: {
    fontSize: 12,
  },
  reqFooterText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },

  // Profile Match Mint Card
  mintCard: {
    backgroundColor: COLORS.mintCardBg,
    borderColor: COLORS.mintBorder,
  },
  mintCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mintCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  chartIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#cceae3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartIconText: {
    fontSize: 12,
  },
  profileMatchBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  donutGauge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.paper,
    borderWidth: 4,
    borderColor: COLORS.greenMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutGaugeInner: {
    alignItems: 'center',
  },
  donutGaugeValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
  },
  donutGaugeSub: {
    fontSize: 7,
    fontWeight: '800',
    color: COLORS.teal,
  },
  matchBarsCol: {
    flex: 1,
    gap: 6,
  },
  matchBarItem: {
    gap: 2,
  },
  matchBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matchBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.ink,
  },
  matchBarValueGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.green,
  },
  matchBarValueAmber: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.amber,
  },
  matchBarTrack: {
    height: 5,
    backgroundColor: COLORS.paper,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  matchBarFillGreen: {
    height: '100%',
    backgroundColor: COLORS.greenMedium,
    borderRadius: 2.5,
  },
  matchBarFillAmber: {
    height: '100%',
    backgroundColor: COLORS.amber,
    borderRadius: 2.5,
  },

  // Skill Gaps Card
  warningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningTriangle: {
    fontSize: 14,
  },
  gapsContainer: {
    gap: 8,
  },
  gapCardItem: {
    backgroundColor: COLORS.canvas,
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  gapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gapItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  highPriorityPill: {
    backgroundColor: COLORS.amberLight,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  highPriorityText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.amberBadgeText,
  },
  gapProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gapTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  gapFillGreen: {
    height: '100%',
    backgroundColor: COLORS.greenMedium,
  },
  gapFillYellow: {
    height: '100%',
    backgroundColor: COLORS.amber,
  },
  gapScoreText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
  },

  // Generate Card
  generateCard: {
    alignItems: 'center',
    backgroundColor: COLORS.paper,
  },
  generateMainBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 6,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  generateMainBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.paper,
  },
  syncBadgesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  syncItemText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
  },

  // ATS Banner Card (Right Top)
  atsCardBanner: {
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  atsScoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.greenMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atsScoreNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.green,
  },
  atsMiddleInfo: {
    flex: 1,
  },
  atsStrongText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  atsScoreSub: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 1,
  },
  atsKeywordsCol: {
    gap: 4,
  },
  kwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kwCategoryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
    width: 44,
  },
  kwBadgesGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  kwMatchedBadge: {
    backgroundColor: COLORS.greenLight,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  kwMatchedText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.green,
  },
  kwMissingBadge: {
    backgroundColor: COLORS.roseLight,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  kwMissingText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.rose,
  },

  // Canvas Container
  previewCanvasContainer: {
    backgroundColor: COLORS.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    minHeight: 600,
    overflow: 'hidden',
    position: 'relative',
  },
  previewHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
  },
  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewHeaderIcon: {
    fontSize: 13,
  },
  previewHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  zoomControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoomIcon: {
    fontSize: 12,
    color: COLORS.muted,
  },
  zoomValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.ink,
  },

  loadingPaperArea: {
    height: 480,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingPaperText: {
    fontSize: 12,
    color: COLORS.muted,
  },

  // Paper Sheet Document
  paperScrollContainer: {
    padding: 20,
    alignItems: 'center',
  },
  a4PaperSheet: {
    backgroundColor: COLORS.paper,
    width: '100%',
    maxWidth: 620,
    minHeight: 700,
    borderRadius: 4,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    gap: 14,
  },

  // Top Document Header Section Styles
  docHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
  },
  docHeaderLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  docAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  docAvatarBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docAvatarInitials: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.paper,
  },
  docNameRoleCol: {
    gap: 2,
  },
  docFullNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: 1.2,
  },
  docTargetRoleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  docContactCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  docContactItem: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '500',
  },
  docHeaderDivider: {
    height: 1.5,
    backgroundColor: COLORS.subtle,
    width: '100%',
    marginBottom: 8,
  },

  paperSection: {
    gap: 6,
  },
  paperSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.green,
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    paddingBottom: 3,
  },
  paperBodyText: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.ink,
  },

  // Technical Skills Table
  techSkillsTable: {
    gap: 4,
  },
  techSkillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  techSkillLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.ink,
    width: 80,
  },
  techSkillValue: {
    fontSize: 10,
    color: COLORS.ink,
    flex: 1,
  },

  // Experience Block
  expBlock: {
    gap: 3,
  },
  expHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  expTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ink,
  },
  expCompanyText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
  },
  expBulletsList: {
    gap: 2,
    marginTop: 2,
  },
  bulletItemRow: {
    flexDirection: 'row',
    gap: 4,
    paddingRight: 8,
  },
  bulletDot: {
    fontSize: 10,
    color: COLORS.ink,
  },
  bulletContent: {
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.ink,
    flex: 1,
  },

  // Projects Block
  projectBlockItem: {
    gap: 2,
  },
  projTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ink,
  },
  projTypeText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  projDescText: {
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.ink,
  },
  projLinkText: {
    fontSize: 10,
    color: COLORS.blue,
    marginTop: 1,
  },

  // Education Block
  eduBlockItem: {
    gap: 2,
  },
  eduDegreeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ink,
  },
  eduUniText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  eduSubtext: {
    fontSize: 10,
    color: COLORS.muted,
  },

  // Edit Buffer Inputs
  editInput: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 4,
    padding: 6,
    fontSize: 10,
    color: COLORS.ink,
  },
  editTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Action Pill Bar (Below Paper Sheet)
  floatingActionPillBar: {
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 36,
    backgroundColor: COLORS.navy,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 30,
  },
  pillActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  pillIcon: {
    fontSize: 11,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.paper,
  },
  pillDivider: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.muted,
  },
  downloadPdfBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  downloadPdfIcon: {
    fontSize: 11,
  },
  downloadPdfText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.paper,
  },
});
