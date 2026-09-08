import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  canvas: '#f8f9fa',       // Soft Off-white Background
  panel: '#f1f5f9',        // Slate light background
  paper: '#ffffff',        // Clean White Cards
  ink: '#0f172a',          // Deep Slate Black
  navy: '#1e293b',         // Navy Dark Gray
  muted: '#64748b',        // Muted Blue-Gray
  subtle: '#e2e8f0',       // Border Gray
  green: '#0e4f34',        // Primary Deep Green (SkillSetu Green)
  greenLight: '#e6f4ea',   // Very Light Green for badges
  teal: '#0d9488',         // Teal Accent
  mint: '#ccfbf1',         // Soft Mint Background
  amber: '#f59e0b',        // Amber/Yellow
  amberLight: '#fef3c7',   // Light Amber
  rose: '#f43f5e',         // Rose/Red
  roseLight: '#ffe4e6',    // Light Rose
  blue: '#2563eb',         // Link Blue
  blueLight: '#dbeafe',    // Light Blue
};

// HoverableCard component for web interactions
function HoverableCard({ children, style, containerStyle, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.01,
          friction: 8,
          tension: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shadow, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  const handleHoverOut = () => {
    if (Platform.OS === 'web') {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.0,
          friction: 8,
          tension: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shadow, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  const shadowOpacity = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.03, 0.12],
  });

  const shadowRadius = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 16],
  });

  const flatStyle = StyleSheet.flatten(style);
  const containerLayout = {};
  if (flatStyle) {
    if (flatStyle.flex !== undefined) containerLayout.flex = flatStyle.flex;
    if (flatStyle.width !== undefined) containerLayout.width = flatStyle.width;
    if (flatStyle.margin !== undefined) containerLayout.margin = flatStyle.margin;
    if (flatStyle.marginTop !== undefined) containerLayout.marginTop = flatStyle.marginTop;
    if (flatStyle.marginBottom !== undefined) containerLayout.marginBottom = flatStyle.marginBottom;
    if (flatStyle.marginLeft !== undefined) containerLayout.marginLeft = flatStyle.marginLeft;
    if (flatStyle.marginRight !== undefined) containerLayout.marginRight = flatStyle.marginRight;
    if (flatStyle.marginHorizontal !== undefined) containerLayout.marginHorizontal = flatStyle.marginHorizontal;
    if (flatStyle.marginVertical !== undefined) containerLayout.marginVertical = flatStyle.marginVertical;
  }

  const animatedStyle = {
    transform: [{ scale }],
    shadowColor: '#1e293b',
    shadowOpacity,
    shadowRadius,
    shadowOffset: { width: 0, height: 4 },
  };

  return (
    <Pressable
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      style={[containerLayout, containerStyle]}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const ROLES_DATA = {
  'Backend Developer': {
    requirements: [
      { name: 'Python', target: 80 },
      { name: 'SQL', target: 85 },
      { name: 'FastAPI', target: 80 },
      { name: 'Docker', target: 80 },
      { name: 'AWS', target: 70 },
    ],
    experienceLevel: 'Intermediate',
    match: {
      overall: 82,
      skills: 82,
      projects: 86,
      experience: 74,
    },
    gaps: [
      { name: 'Docker', current: 42, target: 80, priority: 'High Priority' },
      { name: 'FastAPI', current: 54, target: 80, priority: 'Medium Priority' },
    ],
    ats: {
      score: 87,
      matched: ['Python', 'SQL'],
      missing: ['AWS', 'CI/CD'],
    },
    resume: {
      summary: 'Detail-oriented Backend Developer with a strong foundation in Python, SQL, and API development. Proven ability to design and implement efficient, scalable server-side applications. Adept at collaborating in agile environments to deliver high-quality software solutions. Actively expanding knowledge in cloud infrastructure to enhance deployment workflows.',
      skills: [
        { label: 'Languages', value: 'Python, SQL, JavaScript, HTML/CSS' },
        { label: 'Frameworks', value: 'FastAPI, Django, Flask' },
        { label: 'Tools/Tech', value: 'Docker, Git, PostgreSQL, RESTful APIs' },
      ],
      experience: [
        {
          title: 'Junior Backend Developer',
          company: 'TechSolutions Inc.',
          period: 'Jun 2022 - Present',
          bullets: [
            'Developed and maintained RESTful APIs using Python and FastAPI, improving data retrieval speeds by 20%.',
            'Collaborated with frontend teams to integrate user-facing elements with server-side logic.',
            'Optimized complex SQL queries to enhance database performance for high-traffic endpoints.',
            'Assisted in containerizing legacy applications using Docker, streamlining local development setups.',
          ],
        },
      ],
      projects: [
        {
          title: 'Inventory Management API',
          type: 'Academic Project',
          description: 'Built a comprehensive inventory tracking API using Django REST Framework. Implemented JWT authentication, role-based access control, and complex filtering logic. Deployed utilizing Docker compose.',
        },
      ],
    },
  },
  'Frontend Engineer': {
    requirements: [
      { name: 'React', target: 90 },
      { name: 'TypeScript', target: 85 },
      { name: 'CSS/Tailwind', target: 80 },
      { name: 'GraphQL', target: 70 },
      { name: 'Jest', target: 70 },
    ],
    experienceLevel: 'Intermediate',
    match: {
      overall: 89,
      skills: 92,
      projects: 88,
      experience: 85,
    },
    gaps: [
      { name: 'GraphQL', current: 50, target: 70, priority: 'Medium Priority' },
      { name: 'Jest', current: 40, target: 70, priority: 'Medium Priority' },
    ],
    ats: {
      score: 94,
      matched: ['React', 'TypeScript', 'CSS/Tailwind'],
      missing: ['GraphQL'],
    },
    resume: {
      summary: 'Passionate Frontend Engineer with 3 years of React/TypeScript experience. Dedicated to crafting fluid interfaces with responsive layouts and robust state management. Strong visual eye for design systems and clean component lifecycles.',
      skills: [
        { label: 'Languages', value: 'TypeScript, JavaScript, CSS/HTML, Python' },
        { label: 'Frameworks', value: 'React, Next.js, Vue' },
        { label: 'Tools/Tech', value: 'TailwindCSS, Git, GraphQL, Jest, webpack' },
      ],
      experience: [
        {
          title: 'Frontend Engineer',
          company: 'SaaS Corp',
          period: 'Jun 2021 - Present',
          bullets: [
            'Architected a modular design system using Tailwind and React, reducing page load times by 30%.',
            'Implemented custom React hook stores for unified state across distributed micro-frontends.',
            'Refactored legacy vanilla JS modules into scalable TypeScript components.',
            'Conducted unit testing suites utilizing Jest and React Testing Library.',
          ],
        },
      ],
      projects: [
        {
          title: 'Fintech Analytics Dashboard',
          type: 'Production Project',
          description: 'Developed a real-time data visualizer in React with dynamic chart animations and secure OAuth integrations.',
        },
      ],
    },
  },
  'Full Stack Developer': {
    requirements: [
      { name: 'React', target: 85 },
      { name: 'Node.js', target: 80 },
      { name: 'SQL', target: 80 },
      { name: 'Docker', target: 75 },
      { name: 'System Design', target: 75 },
    ],
    experienceLevel: 'Advanced',
    match: {
      overall: 84,
      skills: 85,
      projects: 90,
      experience: 78,
    },
    gaps: [
      { name: 'System Design', current: 40, target: 75, priority: 'High Priority' },
      { name: 'Docker', current: 42, target: 75, priority: 'Medium Priority' },
    ],
    ats: {
      score: 89,
      matched: ['React', 'Node.js', 'SQL'],
      missing: ['System Design'],
    },
    resume: {
      summary: 'Versatile Full Stack Developer experienced in both frontend React architectures and backend Node/SQL APIs. Solid capability in designing scalable databases, implementing user security, and deploying containerized environments.',
      skills: [
        { label: 'Languages', value: 'JavaScript, TypeScript, Python, SQL, HTML/CSS' },
        { label: 'Frameworks', value: 'React, Node.js, Express, FastAPI' },
        { label: 'Tools/Tech', value: 'PostgreSQL, Docker, Git, RESTful APIs, AWS' },
      ],
      experience: [
        {
          title: 'Full Stack Engineer',
          company: 'WebSphere Solutions',
          period: 'Jan 2022 - Present',
          bullets: [
            'Created client-facing features in React and backend services in Node/Express for real-time portals.',
            'Designed relational database schemas in PostgreSQL with complex indexing configurations.',
            'Secured backend REST paths with JSON Web Tokens and granular user roles.',
          ],
        },
      ],
      projects: [
        {
          title: 'E-commerce Engine API',
          type: 'Academic Project',
          description: 'Fully responsive retail store interface connected to an inventory microservice with Stripe integrations.',
        },
      ],
    },
  },
  'DevOps Engineer': {
    requirements: [
      { name: 'Docker', target: 85 },
      { name: 'Kubernetes', target: 80 },
      { name: 'AWS', target: 80 },
      { name: 'Terraform', target: 75 },
      { name: 'Bash', target: 75 },
    ],
    experienceLevel: 'Specialist',
    match: {
      overall: 58,
      skills: 50,
      projects: 60,
      experience: 65,
    },
    gaps: [
      { name: 'Kubernetes', current: 20, target: 80, priority: 'High Priority' },
      { name: 'Terraform', current: 10, target: 75, priority: 'High Priority' },
      { name: 'AWS', current: 30, target: 80, priority: 'Medium Priority' },
    ],
    ats: {
      score: 62,
      matched: ['Docker', 'Bash'],
      missing: ['Kubernetes', 'Terraform', 'AWS'],
    },
    resume: {
      summary: 'Systems and DevOps specialist centered on automation, shell scripting, and container configurations. Experienced in orchestrating dev environments using Docker and maintaining version control structures.',
      skills: [
        { label: 'Languages', value: 'Bash, Python, YAML, SQL' },
        { label: 'Frameworks', value: 'Docker Compose, Linux Shell' },
        { label: 'Tools/Tech', value: 'Git, Docker, Jenkins CI/CD, basic Linux SysAdmin' },
      ],
      experience: [
        {
          title: 'Systems & CI Assistant',
          company: 'CloudWorks',
          period: 'Mar 2023 - Present',
          bullets: [
            'Automated server deployment scripts using Bash, reducing rollout cycles by 15%.',
            'Implemented Git workflow branches and webhook triggers for automated staging test flows.',
            'Maintained Docker container nodes for engineering dev environments.',
          ],
        },
      ],
      projects: [
        {
          title: 'Deploy Pipelines Dashboard',
          type: 'Internal Automation',
          description: 'Custom notification pipeline reporting Jenkins stages directly to Discord channels.',
        },
      ],
    },
  },
};

export default function Resume({ user, profileData }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;

  const [targetRole, setTargetRole] = useState('Backend Developer');
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [isGenerated, setIsGenerated] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Custom Zoom simulator
  const [zoom, setZoom] = useState(100);

  // Editable Resume Data state (local copies for editing)
  const [editedSummary, setEditedSummary] = useState('');
  const [editedSkills, setEditedSkills] = useState([]);
  const [editedExpBullets, setEditedExpBullets] = useState([]);

  // Active Role Configuration
  const roleInfo = ROLES_DATA[targetRole] || ROLES_DATA['Backend Developer'];

  // Synchronize dynamic profile data details
  const studentName = profileData?.personalInfo?.fullName || user?.name || 'Alex Chen';
  const studentEmail = profileData?.personalInfo?.email || 'alex.chen@gmail.com';
  const studentPhone = profileData?.personalInfo?.phone || '+1 (555) 019-2834';
  const studentLocation = profileData?.personalInfo?.location || 'San Francisco, CA';
  const studentGithub = profileData?.githubLinks?.githubUsername || 'alexchen-dev';

  // Synchronize education list
  const educationList = profileData?.education?.list && profileData.education.list.length > 0
    ? profileData.education.list
    : [
        {
          degree: 'B.S. Computer Science',
          university: 'Tech University',
          graduationYear: '2021',
        },
      ];

  // Initialize editing buffers when entering edit mode
  const startEditing = () => {
    setEditedSummary(roleInfo.resume.summary);
    setEditedSkills(JSON.parse(JSON.stringify(roleInfo.resume.skills)));
    setEditedExpBullets([...roleInfo.resume.experience[0].bullets]);
    setIsEditing(true);
  };

  const saveEdits = () => {
    // In a live environment, this would save to a database. 
    // We update local state in roleInfo to preserve edits during the session.
    roleInfo.resume.summary = editedSummary;
    roleInfo.resume.skills = editedSkills;
    roleInfo.resume.experience[0].bullets = editedExpBullets;
    setIsEditing(false);
    alert('Resume modifications saved successfully!');
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
      setIsEditing(false);
    }, 1200);
  };

  const handleRoleChange = (roleName) => {
    setTargetRole(roleName);
    setShowRolePicker(false);
    // Auto-regenerate on role change
    setIsGenerating(true);
    setIsEditing(false);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
    }, 800);
  };

  const simulateDownload = (type) => {
    alert(`Generating print-ready ${type} bundle...\nDownload successful!`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      {/* Header Title with verified Profile Badge */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Resume Builder</Text>
          <Text style={styles.subtitle}>Create a resume tailored to the role you're targeting.</Text>
        </View>
        
        <View style={styles.profileBadgeCard}>
          <View style={styles.profileBadgeTextCol}>
            <View style={styles.readyRow}>
              <Text style={styles.readyText}>Profile Ready</Text>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
            <Text style={styles.profileBadgeDesc}>Using your verified profile data</Text>
          </View>
        </View>
      </View>

      {/* Grid Layout Container */}
      <View style={[styles.mainGrid, !isWide && styles.flexCol]}>
        
        {/* Left Column - Configurations & Match Gaps */}
        <View style={styles.leftCol}>
          
          {/* 1. Target Role Card */}
          <HoverableCard style={styles.card}>
            <Text style={styles.cardHeaderLabel}>Target Role</Text>
            <View style={styles.targetRoleHeaderRow}>
              <Text style={styles.targetRoleText}>{targetRole}</Text>
              <Pressable style={styles.changeBtn} onPress={() => setShowRolePicker(!showRolePicker)}>
                <Text style={styles.changeBtnText}>✏️ Change</Text>
              </Pressable>
            </View>

            {/* Dropdown list for changing target role */}
            {showRolePicker && (
              <View style={styles.dropdownPicker}>
                {Object.keys(ROLES_DATA).map((roleName) => (
                  <Pressable
                    key={roleName}
                    style={[styles.dropdownItem, roleName === targetRole && styles.dropdownItemActive]}
                    onPress={() => handleRoleChange(roleName)}
                  >
                    <Text style={[styles.dropdownItemText, roleName === targetRole && styles.dropdownItemTextActive]}>
                      {roleName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </HoverableCard>

          {/* 2. Key Requirements Card */}
          <HoverableCard style={styles.card}>
            <Text style={styles.cardTitle}>Key Requirements</Text>
            <View style={styles.requirementsContainer}>
              {roleInfo.requirements.map((req, index) => (
                <View key={index} style={styles.requirementBadge}>
                  <Text style={styles.requirementName}>{req.name}</Text>
                  <Text style={styles.requirementTarget}>{req.target}</Text>
                </View>
              ))}
            </View>
            <View style={styles.experienceRow}>
              <Text style={styles.expIcon}>💼</Text>
              <Text style={styles.expText}>Experience: {roleInfo.experienceLevel}</Text>
            </View>
          </HoverableCard>

          {/* 3. Profile Match Gauge Card */}
          <HoverableCard style={[styles.card, styles.mintCard]}>
            <Text style={styles.mintCardTitle}>Profile Match</Text>
            <View style={styles.matchStatsRow}>
              
              {/* Circular Gauge Representation */}
              <View style={styles.circularGauge}>
                <View style={styles.circularRing}>
                  <Text style={styles.gaugeValText}>{roleInfo.match.overall}%</Text>
                  <Text style={styles.gaugeLabelText}>READY</Text>
                </View>
              </View>

              {/* Progress bars list */}
              <View style={styles.progressBarList}>
                <View style={styles.progressItem}>
                  <View style={styles.progressTextRow}>
                    <Text style={styles.progressLabel}>Skills</Text>
                    <Text style={styles.progressValText}>{roleInfo.match.skills}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBarFill, { width: `${roleInfo.match.skills}%` }]} />
                  </View>
                </View>

                <View style={styles.progressItem}>
                  <View style={styles.progressTextRow}>
                    <Text style={styles.progressLabel}>Projects</Text>
                    <Text style={styles.progressValText}>{roleInfo.match.projects}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBarFill, { width: `${roleInfo.match.projects}%` }]} />
                  </View>
                </View>

                <View style={styles.progressItem}>
                  <View style={styles.progressTextRow}>
                    <Text style={styles.progressLabel}>Experience</Text>
                    <Text style={[styles.progressValText, { color: COLORS.amber }]}>{roleInfo.match.experience}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBarFill, { width: `${roleInfo.match.experience}%`, backgroundColor: COLORS.amber }]} />
                  </View>
                </View>
              </View>

            </View>
          </HoverableCard>

          {/* 4. Skill Gaps Card */}
          <HoverableCard style={styles.card}>
            <View style={styles.warningTitleRow}>
              <Text style={styles.warningEmoji}>⚠️</Text>
              <Text style={styles.cardTitle}>Skill Gaps Affecting Resume</Text>
            </View>

            <View style={styles.gapsList}>
              {roleInfo.gaps.map((gap, index) => (
                <View key={index} style={styles.gapItemBox}>
                  <View style={styles.gapHeaderRow}>
                    <Text style={styles.gapItemName}>{gap.name}</Text>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityBadgeText}>{gap.priority}</Text>
                    </View>
                  </View>
                  <View style={styles.gapProgressRow}>
                    <View style={styles.gapProgressTrack}>
                      <View style={[styles.gapProgressFilled, { width: `${(gap.current / gap.target) * 100}%` }]} />
                    </View>
                    <Text style={styles.gapProgressLabel}>{gap.current}/{gap.target}</Text>
                  </View>
                </View>
              ))}
            </View>
          </HoverableCard>

          {/* 5. Tailor / Generate Action button */}
          <HoverableCard style={[styles.card, styles.actionPanelCard]}>
            <Pressable
              style={styles.generateBtn}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color={COLORS.paper} size="small" />
              ) : (
                <>
                  <Text style={styles.generateBtnIcon}>🪄</Text>
                  <Text style={styles.generateBtnText}>Generate Tailored Resume</Text>
                </>
              )}
            </Pressable>
            <View style={styles.simSyncRow}>
              <Text style={styles.simSyncItem}>✓ Skills</Text>
              <Text style={styles.simSyncItem}>✓ Projects</Text>
              <Text style={styles.simSyncItem}>✓ Experience</Text>
            </View>
          </HoverableCard>

        </View>

        {/* Right Column - ATS Score Analysis & Resume Preview Canvas */}
        <View style={styles.rightCol}>
          
          {/* 1. ATS Compatibility Card */}
          {isGenerated && !isGenerating && (
            <HoverableCard style={styles.atsCard}>
              <View style={styles.atsLeft}>
                <View style={styles.atsScoreCircle}>
                  <Text style={styles.atsScoreText}>{roleInfo.ats.score}</Text>
                </View>
                <View>
                  <Text style={styles.atsTitle}>Strong ATS Compatibility</Text>
                  <Text style={styles.atsSubtitle}>Score out of 100 based on target role keywords.</Text>
                </View>
              </View>

              <View style={[styles.atsKeywordsRow, !isTablet && styles.flexCol]}>
                <View style={styles.keywordsBlock}>
                  <Text style={styles.keywordsLabel}>Matched</Text>
                  <View style={styles.keywordsGrid}>
                    {roleInfo.ats.matched.map((kw, index) => (
                      <View key={index} style={[styles.keywordTag, styles.keywordMatched]}>
                        <Text style={styles.keywordMatchedText}>{kw}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.keywordsBlock}>
                  <Text style={styles.keywordsLabel}>Missing</Text>
                  <View style={styles.keywordsGrid}>
                    {roleInfo.ats.missing.map((kw, index) => (
                      <View key={index} style={[styles.keywordTag, styles.keywordMissing]}>
                        <Text style={styles.keywordMissingText}>{kw}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </HoverableCard>
          )}

          {/* 2. Resume Preview Canvas Container */}
          <View style={styles.canvasContainer}>
            {/* Canvas Sub-Header */}
            <View style={styles.canvasHeader}>
              <View style={styles.canvasHeaderLeft}>
                <Text style={styles.canvasHeaderIcon}>📄</Text>
                <Text style={styles.canvasHeaderTitle}>Resume Preview</Text>
              </View>
              <View style={styles.zoomControls}>
                <Pressable onPress={() => setZoom(Math.max(50, zoom - 10))}>
                  <Text style={styles.zoomText}>➖</Text>
                </Pressable>
                <Text style={styles.zoomPercentText}>{zoom}%</Text>
                <Pressable onPress={() => setZoom(Math.min(150, zoom + 10))}>
                  <Text style={styles.zoomText}>➕</Text>
                </Pressable>
              </View>
            </View>

            {/* Document preview container wrapper */}
            {isGenerating ? (
              <View style={styles.loadingCanvas}>
                <ActivityIndicator color={COLORS.teal} size="large" />
                <Text style={styles.loadingText}>Tailoring resume modules for {targetRole}...</Text>
              </View>
            ) : !isGenerated ? (
              <View style={styles.emptyCanvas}>
                <Text style={styles.emptyIcon}>📄</Text>
                <Text style={styles.emptyTitle}>No tailored resume generated</Text>
                <Text style={styles.emptySubtitle}>Click "Generate Tailored Resume" to apply your profile data.</Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                contentContainerStyle={styles.canvasScrollContent}
                showsHorizontalScrollIndicator={false}
              >
                {/* Paper sheet document */}
                <View style={[styles.paperDocument, { transform: [{ scale: zoom / 100 }] }]}>
                  
                  {/* Resume Header Details */}
                  <View style={styles.docHeader}>
                    <View style={styles.docHeaderLeft}>
                      <View style={styles.docAvatarCircle}>
                        <Text style={styles.docAvatarText}>
                          {studentName ? studentName.slice(0, 2).toUpperCase() : '??'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.docNameText}>{studentName}</Text>
                        <Text style={styles.docRoleText}>{targetRole}</Text>
                      </View>
                    </View>

                    <View style={styles.docHeaderRight}>
                      <Text style={styles.docContactText}>📧 {studentEmail}</Text>
                      <Text style={styles.docContactText}>📞 {studentPhone}</Text>
                      <Text style={styles.docContactText}>💻 github.com/{studentGithub}</Text>
                      <Text style={styles.docContactText}>📍 {studentLocation}</Text>
                    </View>
                  </View>

                  {/* 1. Professional Summary Section */}
                  <View style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>Professional Summary</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.textInput, styles.editTextArea]}
                        value={editedSummary}
                        onChangeText={setEditedSummary}
                        multiline
                      />
                    ) : (
                      <Text style={styles.docSectionBody}>
                        {roleInfo.resume.summary}
                      </Text>
                    )}
                  </View>

                  {/* 2. Technical Skills Section */}
                  <View style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>Technical Skills</Text>
                    
                    {isEditing ? (
                      <View style={styles.editSkillsList}>
                        {editedSkills.map((sk, index) => (
                          <View key={index} style={styles.editSkillRow}>
                            <Text style={styles.editSkillLabel}>{sk.label}:</Text>
                            <TextInput
                              style={[styles.textInput, { flex: 1 }]}
                              value={sk.value}
                              onChangeText={(val) => {
                                const newSkills = [...editedSkills];
                                newSkills[index].value = val;
                                setEditedSkills(newSkills);
                              }}
                            />
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.docSkillsGrid}>
                        {roleInfo.resume.skills.map((skill, idx) => (
                          <View key={idx} style={styles.docSkillItem}>
                            <Text style={styles.docSkillLabel}>{skill.label}:</Text>
                            <Text style={styles.docSkillValue}>{skill.value}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* 3. Experience Section */}
                  <View style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>Work Experience</Text>
                    
                    {roleInfo.resume.experience.map((exp, expIdx) => (
                      <View key={expIdx} style={styles.experienceBlock}>
                        <View style={styles.expHeaderRow}>
                          <Text style={styles.expJobTitle}>{exp.title}</Text>
                          <Text style={styles.expCompanyPeriod}>{exp.company} | {exp.period}</Text>
                        </View>

                        {isEditing ? (
                          <View style={styles.editBulletsList}>
                            {editedExpBullets.map((bullet, bullIdx) => (
                              <TextInput
                                key={bullIdx}
                                style={[styles.textInput, styles.editBulletInput]}
                                value={bullet}
                                onChangeText={(val) => {
                                  const newBullets = [...editedExpBullets];
                                  newBullets[bullIdx] = val;
                                  setEditedExpBullets(newBullets);
                                }}
                              />
                            ))}
                          </View>
                        ) : (
                          <View style={styles.expBulletsContainer}>
                            {exp.bullets.map((bullet, bullIdx) => (
                              <View key={bullIdx} style={styles.bulletRow}>
                                <Text style={styles.bulletSymbol}>•</Text>
                                <Text style={styles.bulletText}>{bullet}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* 4. Projects Section */}
                  <View style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>Key Projects</Text>
                    {roleInfo.resume.projects.map((proj, idx) => (
                      <View key={idx} style={styles.projectBlock}>
                        <View style={styles.expHeaderRow}>
                          <Text style={styles.projTitle}>{proj.title}</Text>
                          <Text style={styles.projType}>{proj.type}</Text>
                        </View>
                        <Text style={styles.projDesc}>{proj.description}</Text>
                      </View>
                    ))}
                  </View>

                  {/* 5. Education Section */}
                  <View style={styles.docSection}>
                    <Text style={styles.docSectionTitle}>Education</Text>
                    {educationList.map((edu, idx) => (
                      <View key={idx} style={styles.eduBlock}>
                        <View style={styles.expHeaderRow}>
                          <Text style={styles.eduDegreeText}>{edu.degree} {edu.branch ? `- ${edu.branch}` : ''}</Text>
                          <Text style={styles.eduPeriod}>{edu.university} | {edu.graduationYear}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                </View>
              </ScrollView>
            )}

            {/* Document Preview Floating Actions Bar Overlay */}
            {isGenerated && !isGenerating && (
              <View style={[styles.floatingActionBar, !isTablet && styles.floatingActionBarCompact]}>
                {!isEditing ? (
                  <>
                    <Pressable style={styles.actionItem} onPress={startEditing}>
                      <Text style={styles.actionIcon}>📝</Text>
                      <Text style={styles.actionText}>Edit</Text>
                    </Pressable>
                    
                    <View style={styles.actionBarDivider} />
                    
                    <Pressable style={styles.actionItem} onPress={handleGenerate}>
                      <Text style={styles.actionIcon}>🔄</Text>
                      <Text style={styles.actionText}>Regenerate</Text>
                    </Pressable>

                    <View style={styles.actionBarDivider} />

                    <Pressable style={styles.actionItem} onPress={() => simulateDownload('DOCX')}>
                      <Text style={styles.actionIcon}>📄</Text>
                      <Text style={styles.actionText}>DOCX</Text>
                    </Pressable>

                    <Pressable style={styles.solidDownloadBtn} onPress={() => simulateDownload('PDF')}>
                      <Text style={styles.solidDownloadBtnText}>⬇️ Download PDF</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable style={styles.actionItem} onPress={() => setIsEditing(false)}>
                      <Text style={styles.actionIcon}>❌</Text>
                      <Text style={styles.actionText}>Cancel</Text>
                    </Pressable>
                    
                    <View style={styles.actionBarDivider} />

                    <Pressable style={styles.solidDownloadBtn} onPress={saveEdits}>
                      <Text style={styles.solidDownloadBtnText}>💾 Save Resume</Text>
                    </Pressable>
                  </>
                )}
              </View>
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
  // Header section
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
    minWidth: 280,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 6,
  },
  profileBadgeCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  profileBadgeTextCol: {
    alignItems: 'flex-end',
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readyText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  checkIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.green,
  },
  profileBadgeDesc: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  // Main Grid
  mainGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  flexCol: {
    flexDirection: 'column',
  },
  leftCol: {
    flex: 4,
    minWidth: 280,
    gap: 16,
  },
  rightCol: {
    flex: 8,
    minWidth: 320,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    padding: 20,
    gap: 12,
    position: 'relative',
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ink,
  },
  targetRoleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetRoleText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.ink,
  },
  changeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  // Role Picker Dropdown
  dropdownPicker: {
    backgroundColor: COLORS.canvas,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.greenLight,
  },
  dropdownItemText: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '600',
  },
  dropdownItemTextActive: {
    color: COLORS.green,
    fontWeight: '800',
  },
  // Requirements
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 6,
  },
  requirementName: {
    fontSize: 11,
    color: COLORS.ink,
    fontWeight: '700',
  },
  requirementTarget: {
    fontSize: 11,
    color: COLORS.green,
    fontWeight: '800',
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  expIcon: {
    fontSize: 14,
  },
  expText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  // Mint Gauge Card
  mintCard: {
    backgroundColor: COLORS.mint,
    borderColor: '#bbf7d0',
  },
  mintCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.ink,
  },
  matchStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  circularGauge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.paper,
    borderWidth: 4,
    borderColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.navy,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  circularRing: {
    alignItems: 'center',
  },
  gaugeValText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.ink,
  },
  gaugeLabelText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.teal,
    marginTop: 1,
  },
  progressBarList: {
    flex: 1,
    gap: 8,
  },
  progressItem: {
    gap: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  progressValText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.green,
  },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.paper,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  // Warning gaps
  warningTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningEmoji: {
    fontSize: 16,
  },
  gapsList: {
    gap: 12,
  },
  gapItemBox: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  gapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gapItemName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  priorityBadge: {
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#92400e',
    textTransform: 'uppercase',
  },
  gapProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gapProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gapProgressFilled: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  gapProgressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
    width: 34,
    textAlign: 'right',
  },
  // Generate panel
  actionPanelCard: {
    borderWidth: 1.5,
    borderColor: COLORS.green,
    shadowColor: COLORS.green,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  generateBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateBtnIcon: {
    fontSize: 16,
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.paper,
  },
  simSyncRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  simSyncItem: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
  },
  // Right Column ATS Card
  atsCard: {
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  atsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  atsScoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  atsScoreText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#065f46',
  },
  atsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  atsSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  atsKeywordsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  keywordsBlock: {
    gap: 4,
  },
  keywordsLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
  },
  keywordsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  keywordTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  keywordMatched: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  keywordMatchedText: {
    fontSize: 9,
    fontWeight: '850',
    color: '#065f46',
  },
  keywordMissing: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  keywordMissingText: {
    fontSize: 9,
    fontWeight: '850',
    color: '#991b1b',
  },
  actionBarDivider: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.subtle,
  },
  // Canvas preview
  canvasContainer: {
    backgroundColor: COLORS.paper,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    overflow: 'hidden',
    flexGrow: 1,
    minHeight: 600,
    position: 'relative',
    paddingBottom: 64, // Floating bar overlay space
  },
  canvasHeader: {
    backgroundColor: COLORS.panel,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  canvasHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  canvasHeaderIcon: {
    fontSize: 16,
  },
  canvasHeaderTitle: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '700',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoomText: {
    fontSize: 12,
  },
  zoomPercentText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '700',
  },
  loadingCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
  },
  emptyCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  emptyIcon: {
    fontSize: 48,
    color: COLORS.subtle,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
  canvasScrollContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.subtle,
    flexGrow: 1,
  },
  // Paper sheet styles
  paperDocument: {
    width: 620,
    backgroundColor: COLORS.paper,
    padding: 30,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: COLORS.navy,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    alignSelf: 'center',
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  docHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docAvatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.green,
  },
  docNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.ink,
    textTransform: 'uppercase',
  },
  docRoleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 2,
  },
  docHeaderRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  docContactText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  // Document sections
  docSection: {
    marginBottom: 16,
  },
  docSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.green,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    paddingBottom: 4,
    marginBottom: 8,
    letterSpacing: 1.5,
  },
  docSectionBody: {
    fontSize: 11,
    color: COLORS.ink,
    lineHeight: 16,
  },
  docSkillsGrid: {
    gap: 4,
  },
  docSkillItem: {
    flexDirection: 'row',
  },
  docSkillLabel: {
    width: 90,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
  docSkillValue: {
    flex: 1,
    fontSize: 11,
    color: COLORS.ink,
  },
  experienceBlock: {
    marginBottom: 10,
  },
  expHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  expJobTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ink,
  },
  expCompanyPeriod: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
  },
  expBulletsContainer: {
    gap: 2,
    marginLeft: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 6,
  },
  bulletSymbol: {
    fontSize: 11,
    color: COLORS.muted,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.ink,
    lineHeight: 15,
  },
  projectBlock: {
    marginBottom: 8,
  },
  projTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ink,
  },
  projType: {
    fontSize: 10,
    color: COLORS.muted,
  },
  projDesc: {
    fontSize: 11,
    color: COLORS.ink,
    lineHeight: 14,
  },
  eduBlock: {
    marginBottom: 6,
  },
  eduDegreeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ink,
  },
  eduPeriod: {
    fontSize: 10,
    color: COLORS.muted,
  },
  // Floating Action Bar overlay on preview
  floatingActionBar: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    zIndex: 100,
  },
  floatingActionBarCompact: {
    flexDirection: 'column',
    borderRadius: 20,
    gap: 8,
    padding: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionIcon: {
    fontSize: 14,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  solidDownloadBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  solidDownloadBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.paper,
  },
  // Editable Mode elements
  textInput: {
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 6,
    padding: 8,
    fontSize: 11,
    color: COLORS.ink,
    backgroundColor: COLORS.canvas,
  },
  editTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  editSkillsList: {
    gap: 8,
  },
  editSkillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editSkillLabel: {
    width: 80,
    fontSize: 11,
    fontWeight: '700',
  },
  editBulletsList: {
    gap: 6,
    marginLeft: 6,
  },
  editBulletInput: {
    height: 34,
  },
});
