import React, { useRef, useState } from 'react';
import {
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
          toValue: 1.02,
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

// Default initial state representing the full prefilled mockup profile matching the 6th step review screenshot exactly
export const DEFAULT_MOCK_PROFILE = {
  // Step 1: Personal Info
  personalInfo: {
    fullName: 'Alex Chen',
    email: 'alex.chen@gmail.com',
    phone: '+1 (555) 019-2834',
    headline: 'Senior Frontend Engineer',
    location: 'San Francisco, CA',
    yearsOfExperience: '3 Years',
    bio: 'Experienced frontend developer specializing in responsive React applications, TypeScript architectures, and clean modular designs.',
  },
  // Step 2: Education
  education: {
    hasExtractedMarksheet: true,
    marksheetFileName: 'academic_transcript.pdf',
    cgpaDetected: '3.9 / 4.0',
    universityDetected: 'Tech University',
    academicYearDetected: '2017 - 2021',
    list: [
      {
        id: 'edu_1',
        degree: 'B.S. Computer Science',
        branch: 'Computer Science',
        university: 'Tech University',
        startYear: '2017',
        graduationYear: '2021',
      },
    ],
  },
  // Step 3: Career Goals & Preferences
  careerGoals: {
    targetCareer: 'Senior Frontend Engineer',
    preferredLocations: ['San Francisco, CA'],
    careerInterests: ['Web Development', 'UI/UX', 'Node.js'],
    opportunityTypes: ['Full-time'],
    workPreferences: ['Hybrid', 'Remote'],
    industry: 'FinTech / SaaS',
    timeline: '6-12 Months',
    careerGoal: 'Seeking to leverage my 3 years of React/TypeScript experience to build performant web platforms in the SaaS/FinTech space.',
  },
  // Step 4: Resume & AI Analysis
  resumeAnalysis: {
    resumeFile: 'Alex_Chen_Resume.pdf',
    parseTime: 'Parsed 2 mins ago',
    score: 82,
    scoreText: 'Strong technical alignment. Adding more measurable metrics to projects could increase impact.',
    extractedData: {
      projects: ['Fintech Dashboard', 'SaaS Design System', 'E-commerce Engine'],
      experience: [
        { title: 'Frontend Engineer', company: 'SaaS Corp', period: '2021-Present' },
      ],
      coreTechnologies: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
      identifiedSkillDomains: [
        { name: 'Frontend Architecture', value: 88 },
        { name: 'TypeScript / State Management', value: 85 },
      ],
    },
  },
  // Step 5: GitHub & Professional Links
  githubLinks: {
    linkedinUrl: 'https://linkedin.com/in/alexchen',
    portfolioUrl: 'https://alexchen.dev',
    githubUsername: 'alexchen-dev',
    githubConnected: true,
    githubMetrics: {
      reposAnalyzed: 18,
      projectsDetected: 8,
    },
    githubSkills: [
      { name: 'React', percentage: 92, rating: 'Expert' },
      { name: 'TypeScript', percentage: 88, rating: 'Strong' },
      { name: 'Node.js', percentage: 76, rating: 'Good' },
    ],
    repositories: [
      { id: 'repo_1', name: 'react-design-system', description: 'A custom high-performance component library built in React and Tailwind.', tags: ['React', 'TypeScript'], selected: true },
      { id: 'repo_2', name: 'typescript-state-manager', description: 'Lightweight reactive state store for TypeScript applications.', tags: ['TypeScript'], selected: true },
    ],
  },
  verified: false,
};

// Initial state representing empty first-time setup
export const EMPTY_PROFILE = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    headline: '',
    location: '',
    yearsOfExperience: '',
    bio: '',
  },
  education: {
    hasExtractedMarksheet: false,
    marksheetFileName: '',
    cgpaDetected: '',
    universityDetected: '',
    academicYearDetected: '',
    list: [],
  },
  careerGoals: {
    targetCareer: '',
    preferredLocations: [],
    careerInterests: [],
    opportunityTypes: [],
    workPreferences: [],
    industry: '',
    timeline: '',
    careerGoal: '',
  },
  resumeAnalysis: {
    resumeFile: '',
    parseTime: '',
    score: 0,
    scoreText: '',
    extractedData: {
      projects: [],
      experience: [],
      coreTechnologies: [],
      identifiedSkillDomains: [],
    },
  },
  githubLinks: {
    linkedinUrl: '',
    portfolioUrl: '',
    githubUsername: '',
    githubConnected: false,
    githubMetrics: {
      reposAnalyzed: 0,
      projectsDetected: 0,
    },
    githubSkills: [],
    repositories: [],
  },
  verified: false,
};

export default function Profile({ user, profileData, setProfileData, onFinish }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;

  const [activeStep, setActiveStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});

  // Helper inputs for adding interest, locations, new education
  const [newInterest, setNewInterest] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // Editing extracted data inline helper
  const [isEditingExtracted, setIsEditingExtracted] = useState(false);
  const [tempProjects, setTempProjects] = useState('');
  const [tempCoreTechs, setTempCoreTechs] = useState('');

  // Step 2 add education form
  const [eduDegree, setEduDegree] = useState('Bachelor of Technology (B.Tech)');
  const [eduBranch, setEduBranch] = useState('');
  const [eduUniv, setEduUniv] = useState('');
  const [eduStart, setEduStart] = useState('');
  const [eduGrad, setEduGrad] = useState('');

  // Checkbox confirmation in step 6
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Initialize simulation switcher
  const handleSimulationMode = (mode) => {
    if (mode === 'edit') {
      setProfileData({ ...DEFAULT_MOCK_PROFILE, verified: true });
    } else {
      setProfileData(JSON.parse(JSON.stringify(EMPTY_PROFILE)));
      setActiveStep(1);
      setIsConfirmed(false);
    }
  };

  const currentProfile = profileData || DEFAULT_MOCK_PROFILE;

  const stepsList = [
    { id: 1, name: 'Personal Info' },
    { id: 2, name: 'Education' },
    { id: 3, name: 'Career Goals' },
    { id: 4, name: 'Resume + AI' },
    { id: 5, name: 'GitHub + Links' },
    { id: 6, name: 'Review & Verify' },
  ];

  // Validation logic per step
  const validateStep = (step) => {
    const errors = {};
    if (step === 1) {
      if (!currentProfile.personalInfo.fullName.trim()) errors.fullName = 'Full Name is required';
      if (!currentProfile.personalInfo.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(currentProfile.personalInfo.email)) {
        errors.email = 'Email address is invalid';
      }
      if (!currentProfile.personalInfo.phone.trim()) errors.phone = 'Phone number is required';
    } else if (step === 2) {
      if (currentProfile.education.list.length === 0) {
        errors.educationList = 'Please add at least one education entry';
      }
    } else if (step === 3) {
      if (!currentProfile.careerGoals.targetCareer.trim()) errors.targetCareer = 'Target Career is required';
      if (!currentProfile.careerGoals.careerGoal.trim()) errors.careerGoal = 'Career Goal description is required';
    } else if (step === 4) {
      if (!currentProfile.resumeAnalysis.resumeFile) errors.resumeFile = 'Please upload/select a resume file';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      if (activeStep < 6) {
        setActiveStep(activeStep + 1);
      } else {
        // Step 6 submit
        if (!isConfirmed) {
          alert('Please check the confirmation box to verify your profile information.');
          return;
        }
        setProfileData(prev => ({ ...prev, verified: true }));
        alert('Profile verified and successfully submitted! Check the dashboard completion score.');
        if (onFinish) onFinish();
      }
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1);
    }
  };

  // State Updates helpers
  const updatePersonalInfo = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }));
  };

  const updateEducationField = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      education: {
        ...prev.education,
        [field]: value,
      },
    }));
  };

  const addEducationItem = () => {
    if (!eduBranch.trim() || !eduUniv.trim() || !eduStart.trim() || !eduGrad.trim()) {
      alert('Please fill out all education fields before adding.');
      return;
    }
    const newItem = {
      id: 'edu_' + Date.now(),
      degree: eduDegree,
      branch: eduBranch,
      university: eduUniv,
      startYear: eduStart,
      graduationYear: eduGrad,
    };
    setProfileData(prev => ({
      ...prev,
      education: {
        ...prev.education,
        list: [...prev.education.list, newItem],
      },
    }));
    setEduBranch('');
    setEduUniv('');
    setEduStart('');
    setEduGrad('');
  };

  const removeEducationItem = (id) => {
    setProfileData(prev => ({
      ...prev,
      education: {
        ...prev.education,
        list: prev.education.list.filter(item => item.id !== id),
      },
    }));
  };

  const updateCareerGoalsField = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      careerGoals: {
        ...prev.careerGoals,
        [field]: value,
      },
    }));
  };

  const toggleArrayOption = (field, option) => {
    const list = currentProfile.careerGoals[field];
    const newList = list.includes(option) ? list.filter(o => o !== option) : [...list, option];
    updateCareerGoalsField(field, newList);
  };

  const addTag = (field, value, setter) => {
    if (!value.trim()) return;
    const currentTags = currentProfile.careerGoals[field];
    if (!currentTags.includes(value.trim())) {
      updateCareerGoalsField(field, [...currentTags, value.trim()]);
    }
    setter('');
  };

  const removeTag = (field, value) => {
    const currentTags = currentProfile.careerGoals[field];
    updateCareerGoalsField(field, currentTags.filter(t => t !== value));
  };

  const updateGithubLinksField = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      githubLinks: {
        ...prev.githubLinks,
        [field]: value,
      },
    }));
  };

  const toggleRepositorySelected = (id) => {
    setProfileData(prev => {
      const repos = prev.githubLinks.repositories.map(repo => {
        if (repo.id === id) {
          return { ...repo, selected: !repo.selected };
        }
        return repo;
      });
      return {
        ...prev,
        githubLinks: {
          ...prev.githubLinks,
          repositories: repos,
        },
      };
    });
  };

  // Resume File Upload Simulation
  const simulateResumeUpload = () => {
    setProfileData(prev => ({
      ...prev,
      resumeAnalysis: {
        resumeFile: 'Alex_Chen_Resume.pdf',
        parseTime: 'Parsed just now',
        score: 82,
        scoreText: 'Strong technical alignment. Adding more measurable metrics to projects could increase impact.',
        extractedData: {
          projects: ['Fintech Dashboard', 'SaaS Design System', 'E-commerce Engine'],
          experience: [
            { title: 'Frontend Engineer', company: 'SaaS Corp', period: '2021-Present' },
          ],
          coreTechnologies: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
          identifiedSkillDomains: [
            { name: 'Frontend Architecture', value: 88 },
            { name: 'TypeScript / State Management', value: 85 },
          ],
        },
      },
    }));
  };

  const deleteResume = () => {
    setProfileData(prev => ({
      ...prev,
      resumeAnalysis: {
        ...EMPTY_PROFILE.resumeAnalysis,
      },
    }));
  };

  // Marksheet upload simulation
  const simulateMarksheetUpload = () => {
    setProfileData(prev => ({
      ...prev,
      education: {
        ...prev.education,
        hasExtractedMarksheet: true,
        marksheetFileName: 'academic_transcript.pdf',
        cgpaDetected: '3.9 / 4.0',
        universityDetected: 'Tech University',
        academicYearDetected: '2017 - 2021',
        list: [
          {
            id: 'edu_1',
            degree: 'B.S. Computer Science',
            branch: 'Computer Science',
            university: 'Tech University',
            startYear: '2017',
            graduationYear: '2021',
          },
        ],
      },
    }));
  };

  // GitHub Account simulation
  const simulateGithubConnection = () => {
    setProfileData(prev => ({
      ...prev,
      githubLinks: {
        ...prev.githubLinks,
        githubUsername: 'alexchen-dev',
        githubConnected: true,
        githubMetrics: {
          reposAnalyzed: 18,
          projectsDetected: 8,
        },
        githubSkills: [
          { name: 'React', percentage: 92, rating: 'Expert' },
          { name: 'TypeScript', percentage: 88, rating: 'Strong' },
          { name: 'Node.js', percentage: 76, rating: 'Good' },
        ],
        repositories: [
          { id: 'repo_1', name: 'react-design-system', description: 'A custom high-performance component library built in React and Tailwind.', tags: ['React', 'TypeScript'], selected: true },
          { id: 'repo_2', name: 'typescript-state-manager', description: 'Lightweight reactive state store for TypeScript applications.', tags: ['TypeScript'], selected: true },
        ],
      },
    }));
  };

  // Inline Review & Edit Extracted data handler
  const saveExtractedEdits = () => {
    const listProjects = tempProjects.split(',').map(p => p.trim()).filter(Boolean);
    const listTechs = tempCoreTechs.split(',').map(t => t.trim()).filter(Boolean);
    
    setProfileData(prev => ({
      ...prev,
      resumeAnalysis: {
        ...prev.resumeAnalysis,
        extractedData: {
          ...prev.resumeAnalysis.extractedData,
          projects: listProjects.length > 0 ? listProjects : prev.resumeAnalysis.extractedData.projects,
          coreTechnologies: listTechs.length > 0 ? listTechs : prev.resumeAnalysis.extractedData.coreTechnologies,
        },
      },
    }));
    setIsEditingExtracted(false);
  };

  const calculateStepCompletionPercent = () => {
    let score = 0;
    const totalSteps = 5;
    if (currentProfile.personalInfo && currentProfile.personalInfo.fullName && currentProfile.personalInfo.email) score += 1;
    if (currentProfile.education && currentProfile.education.list && currentProfile.education.list.length > 0) score += 1;
    if (currentProfile.careerGoals && currentProfile.careerGoals.targetCareer && currentProfile.careerGoals.careerGoal) score += 1;
    if (currentProfile.resumeAnalysis && currentProfile.resumeAnalysis.resumeFile) score += 1;
    if (currentProfile.githubLinks && (currentProfile.githubLinks.githubUsername || currentProfile.githubLinks.linkedinUrl)) score += 1;
    
    let percent = Math.round((score / totalSteps) * 80);
    if (currentProfile.verified || isConfirmed) {
      percent = 100;
    } else {
      if (score === 5) percent = 80;
    }
    return percent;
  };

  // Rendering step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.sectionSubtitle}>Add your personal contact details and basic introduction.</Text>

            <View style={styles.avatarUploadRow}>
              <View style={styles.avatarInitials}>
                <Text style={styles.avatarInitialsText}>
                  {currentProfile.personalInfo.fullName ? currentProfile.personalInfo.fullName.slice(0, 2).toUpperCase() : '??'}
                </Text>
              </View>
              <View>
                <Pressable style={styles.uploadBtn}>
                  <Text style={styles.uploadBtnText}>📸 Simulate Image Upload</Text>
                </Pressable>
                <Text style={styles.inputHelpText}>Supported files: JPG, PNG. Max 2MB.</Text>
              </View>
            </View>

            <View style={styles.rowLayout}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.fullName && styles.inputErrorBorder]}
                  placeholder="e.g. Alex Chen"
                  value={currentProfile.personalInfo.fullName}
                  onChangeText={(val) => updatePersonalInfo('fullName', val)}
                />
                {validationErrors.fullName && <Text style={styles.errorText}>{validationErrors.fullName}</Text>}
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.email && styles.inputErrorBorder]}
                  placeholder="hello@example.com"
                  value={currentProfile.personalInfo.email}
                  onChangeText={(val) => updatePersonalInfo('email', val)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}
              </View>
            </View>

            <View style={styles.rowLayout}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.phone && styles.inputErrorBorder]}
                  placeholder="+1 (555) 019-2834"
                  value={currentProfile.personalInfo.phone}
                  onChangeText={(val) => updatePersonalInfo('phone', val)}
                  keyboardType="phone-pad"
                />
                {validationErrors.phone && <Text style={styles.errorText}>{validationErrors.phone}</Text>}
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Headline / Short Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Senior Frontend Engineer"
                  value={currentProfile.personalInfo.headline}
                  onChangeText={(val) => updatePersonalInfo('headline', val)}
                />
              </View>
            </View>

            <View style={styles.rowLayout}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. San Francisco, CA"
                  value={currentProfile.personalInfo.location}
                  onChangeText={(val) => updatePersonalInfo('location', val)}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Years of Experience</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 3 Years"
                  value={currentProfile.personalInfo.yearsOfExperience}
                  onChangeText={(val) => updatePersonalInfo('yearsOfExperience', val)}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Bio / About Yourself</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Brief summary of your professional skills and aspirations..."
                value={currentProfile.personalInfo.bio}
                onChangeText={(val) => updatePersonalInfo('bio', val)}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Education</Text>
            <Text style={styles.sectionSubtitle}>Add your academic background so SkillSetu can understand your educational profile.</Text>

            {/* AI Marksheet Extraction Box */}
            <HoverableCard style={styles.extractedBoxCard}>
              {!currentProfile.education.hasExtractedMarksheet ? (
                <View style={styles.simulationUploadBox}>
                  <Text style={styles.extractBadgeText}>✨ AI Academic Extractor</Text>
                  <Text style={styles.extractionDescription}>Upload your university marksheet to automatically extract academic data and verify your grades.</Text>
                  <Pressable style={styles.extractBtn} onPress={simulateMarksheetUpload}>
                    <Text style={styles.extractBtnText}>📄 Simulate Marksheet Upload (academic_transcript.pdf)</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.extractedFlexRow, !isTablet && styles.flexCol]}>
                  {/* Left part */}
                  <View style={styles.extractedFileLeft}>
                    <View style={styles.pdfThumbnail}>
                      <Text style={styles.pdfIcon}>📄</Text>
                      <View style={styles.pdfCheckedCircle}>
                        <Text style={styles.pdfCheckedText}>✓</Text>
                      </View>
                    </View>
                    <Text style={styles.pdfFileName}>{currentProfile.education.marksheetFileName}</Text>
                    <Pressable style={styles.replaceBtn} onPress={simulateMarksheetUpload}>
                      <Text style={styles.replaceBtnText}>🔄 Replace</Text>
                    </Pressable>
                  </View>

                  {/* Right part */}
                  <View style={styles.extractedChecklistRight}>
                    <View style={styles.extractedBadge}>
                      <Text style={styles.extractedBadgeText}>✨ Extracted from Marksheet</Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Text style={styles.greenCheck}>✓</Text>
                      <Text style={styles.checkText}>CGPA detected: <Text style={styles.boldText}>{currentProfile.education.cgpaDetected}</Text></Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Text style={styles.greenCheck}>✓</Text>
                      <Text style={styles.checkText}>University detected: <Text style={styles.boldText}>{currentProfile.education.universityDetected}</Text></Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Text style={styles.greenCheck}>✓</Text>
                      <Text style={styles.checkText}>Academic year detected: <Text style={styles.boldText}>{currentProfile.education.academicYearDetected}</Text></Text>
                    </View>
                  </View>
                </View>
              )}
            </HoverableCard>

            {/* List of Education entries */}
            {currentProfile.education.list.map((item) => (
              <View key={item.id} style={styles.educationCard}>
                <View style={styles.eduHeader}>
                  <Text style={styles.eduDegreeText}>{item.degree}</Text>
                  <Pressable onPress={() => removeEducationItem(item.id)}>
                    <Text style={styles.trashIcon}>🗑️</Text>
                  </Pressable>
                </View>
                <Text style={styles.eduInfoLine}><Text style={styles.boldText}>Branch/Major:</Text> {item.branch}</Text>
                <Text style={styles.eduInfoLine}><Text style={styles.boldText}>University:</Text> {item.university}</Text>
                <Text style={styles.eduInfoLine}><Text style={styles.boldText}>Duration:</Text> {item.startYear} - {item.graduationYear}</Text>
              </View>
            ))}

            {/* Manual Form for Education Entry */}
            <View style={styles.manualEduForm}>
              <Text style={styles.formSectionTitle}>Add / Edit Education Entry</Text>
              
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Degree *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. B.S. Computer Science"
                  value={eduDegree}
                  onChangeText={setEduDegree}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Branch / Major *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Computer Science"
                  value={eduBranch}
                  onChangeText={setEduBranch}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>University / Institution *</Text>
                <View style={styles.iconInputRow}>
                  <Text style={styles.inputIconEmoji}>🏛️</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    placeholder="e.g. Tech University"
                    value={eduUniv}
                    onChangeText={setEduUniv}
                  />
                </View>
              </View>

              <View style={styles.rowLayout}>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Start Year *</Text>
                  <View style={styles.iconInputRow}>
                    <Text style={styles.inputIconEmoji}>📅</Text>
                    <TextInput
                      style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                      placeholder="e.g. 2017"
                      value={eduStart}
                      onChangeText={setEduStart}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Graduation Year *</Text>
                  <View style={styles.iconInputRow}>
                    <Text style={styles.inputIconEmoji}>📅</Text>
                    <TextInput
                      style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                      placeholder="e.g. 2021"
                      value={eduGrad}
                      onChangeText={setEduGrad}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <Pressable style={styles.addEduBtn} onPress={addEducationItem}>
                <Text style={styles.addEduBtnText}>➕ Add Education</Text>
              </Pressable>
            </View>

            {validationErrors.educationList && <Text style={[styles.errorText, { marginTop: 12 }]}>{validationErrors.educationList}</Text>}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Career Goals & Preferences</Text>
            <Text style={styles.sectionSubtitle}>Tell SkillSetu where you want your career to go.</Text>

            <View style={[styles.gridTwoColumns, !isTablet && styles.flexCol]}>
              {/* Target Career Card */}
              <HoverableCard style={styles.prefCard}>
                <Text style={styles.cardHeaderTitle}>Target Career</Text>
                <View style={styles.iconInputRow}>
                  <Text style={styles.inputIconEmoji}>🔍</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    placeholder="e.g. Senior Frontend Engineer"
                    value={currentProfile.careerGoals.targetCareer}
                    onChangeText={(val) => updateCareerGoalsField('targetCareer', val)}
                  />
                </View>
                {validationErrors.targetCareer && <Text style={styles.errorText}>{validationErrors.targetCareer}</Text>}
              </HoverableCard>

              {/* Preferred Locations Card */}
              <HoverableCard style={styles.prefCard}>
                <Text style={styles.cardHeaderTitle}>Preferred Locations</Text>
                <View style={styles.tagsContainer}>
                  {currentProfile.careerGoals.preferredLocations.map((loc) => (
                    <View key={loc} style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{loc}</Text>
                      <Pressable onPress={() => removeTag('preferredLocations', loc)}>
                        <Text style={styles.closeTagEmoji}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
                <View style={styles.iconInputRow}>
                  <Text style={styles.inputIconEmoji}>📍</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    placeholder="Add location and press enter..."
                    value={newLocation}
                    onChangeText={setNewLocation}
                    onSubmitEditing={() => addTag('preferredLocations', newLocation, setNewLocation)}
                  />
                </View>
              </HoverableCard>
            </View>

            {/* Target Industry & Timeline */}
            <View style={[styles.gridTwoColumns, !isTablet && styles.flexCol]}>
              <HoverableCard style={styles.prefCard}>
                <Text style={styles.cardHeaderTitle}>Target Industry</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. FinTech / SaaS"
                  value={currentProfile.careerGoals.industry}
                  onChangeText={(val) => updateCareerGoalsField('industry', val)}
                />
              </HoverableCard>

              <HoverableCard style={styles.prefCard}>
                <Text style={styles.cardHeaderTitle}>Timeline</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 6-12 Months"
                  value={currentProfile.careerGoals.timeline}
                  onChangeText={(val) => updateCareerGoalsField('timeline', val)}
                />
              </HoverableCard>
            </View>

            {/* Career Interests Card */}
            <HoverableCard style={styles.fullWidthCard}>
              <Text style={styles.cardHeaderTitle}>Career Interests</Text>
              <View style={styles.tagsContainer}>
                {currentProfile.careerGoals.careerInterests.map((interest) => (
                  <View key={interest} style={[styles.tagBadge, { backgroundColor: COLORS.mint }]}>
                    <Text style={[styles.tagBadgeText, { color: COLORS.teal }]}>{interest}</Text>
                    <Pressable onPress={() => removeTag('careerInterests', interest)}>
                      <Text style={[styles.closeTagEmoji, { color: COLORS.teal }]}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.rowLayout}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="e.g. Web Development"
                  value={newInterest}
                  onChangeText={setNewInterest}
                />
                <Pressable
                  style={styles.addTagBtn}
                  onPress={() => addTag('careerInterests', newInterest, setNewInterest)}
                >
                  <Text style={styles.addTagBtnText}>+ Add Interest</Text>
                </Pressable>
              </View>
            </HoverableCard>

            <View style={[styles.gridTwoColumns, !isTablet && styles.flexCol]}>
              {/* Opportunity Type */}
              <HoverableCard style={styles.prefCard}>
                <Text style={styles.cardHeaderTitle}>Opportunity Type</Text>
                <View style={styles.choicesGrid}>
                  {['Internship', 'Full-time', 'Part-time', 'Contract'].map((type) => {
                    const selected = currentProfile.careerGoals.opportunityTypes.includes(type);
                    return (
                      <Pressable
                        key={type}
                        onPress={() => toggleArrayOption('opportunityTypes', type)}
                        style={[styles.choiceBtn, selected && styles.choiceBtnSelected]}
                      >
                        <Text style={styles.choiceBtnIcon}>💼</Text>
                        <Text style={[styles.choiceBtnLabel, selected && styles.choiceBtnLabelSelected]}>{type}</Text>
                        {selected && <View style={styles.checkedBadge}><Text style={styles.checkedTextMini}>✓</Text></View>}
                      </Pressable>
                    );
                  })}
                </View>
              </HoverableCard>

              {/* Work Preference */}
              <HoverableCard style={styles.prefCard}>
                <Text style={styles.cardHeaderTitle}>Work Preference</Text>
                <View style={styles.choicesGrid}>
                  {['Remote', 'Hybrid', 'On-site'].map((pref) => {
                    const selected = currentProfile.careerGoals.workPreferences.includes(pref);
                    const icon = pref === 'Remote' ? '🏠' : pref === 'Hybrid' ? '🔄' : '🏢';
                    return (
                      <Pressable
                        key={pref}
                        onPress={() => toggleArrayOption('workPreferences', pref)}
                        style={[styles.choiceBtn, selected && styles.choiceBtnSelected]}
                      >
                        <Text style={styles.choiceBtnIcon}>{icon}</Text>
                        <Text style={[styles.choiceBtnLabel, selected && styles.choiceBtnLabelSelected]}>{pref}</Text>
                        {selected && <View style={styles.checkedBadge}><Text style={styles.checkedTextMini}>✓</Text></View>}
                      </Pressable>
                    );
                  })}
                </View>
              </HoverableCard>
            </View>

            {/* Career Goal Textarea */}
            <HoverableCard style={styles.fullWidthCard}>
              <Text style={styles.cardHeaderTitle}>Career Goal</Text>
              <Text style={styles.inputHelpText}>Describe your long-term professional aspirations in a few sentences.</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, validationErrors.careerGoal && styles.inputErrorBorder]}
                placeholder="I aim to build scalable applications and eventually transition into..."
                value={currentProfile.careerGoals.careerGoal}
                onChangeText={(val) => updateCareerGoalsField('careerGoal', val)}
                multiline
                numberOfLines={4}
              />
              {validationErrors.careerGoal && <Text style={styles.errorText}>{validationErrors.careerGoal}</Text>}
            </HoverableCard>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Upload Your Resume</Text>
            <Text style={styles.sectionSubtitle}>Let SkillSetu analyze your resume and automatically build your professional profile.</Text>

            <View style={[styles.rowLayout, !isTablet && styles.flexCol]}>
              {/* Left Column: Resume Score Card & File */}
              <View style={styles.leftColResume}>
                {currentProfile.resumeAnalysis.resumeFile ? (
                  <HoverableCard style={styles.resumeScoreCard}>
                    <Text style={styles.scoreHeaderTitle}>✨ Resume Score</Text>
                    
                    {/* Circle Score Ring */}
                    <View style={styles.circleContainer}>
                      <View style={[styles.progressRingLarge, { borderTopColor: COLORS.teal, borderLeftColor: COLORS.teal }]}>
                        <Text style={styles.ringValueText}>{currentProfile.resumeAnalysis.score}</Text>
                        <Text style={styles.ringTotalText}>/100</Text>
                      </View>
                    </View>

                    <Text style={styles.scoreTextDescription}>{currentProfile.resumeAnalysis.scoreText}</Text>

                    <Pressable style={styles.viewAnalysisBtn} onPress={() => alert('Detailed ATS checklist:\n1. Keywords match: 88%\n2. Typography: 92%\n3. Layout verification: OK\n4. Quantified impacts check: Good')}>
                      <Text style={styles.viewAnalysisBtnText}>👁️ View Full Analysis</Text>
                    </Pressable>
                  </HoverableCard>
                ) : (
                  <View style={styles.noResumeCard}>
                    <Text style={styles.noResumeIcon}>📄</Text>
                    <Text style={styles.noResumeText}>No resume uploaded yet</Text>
                    <Pressable style={styles.uploadResumeBtn} onPress={simulateResumeUpload}>
                      <Text style={styles.uploadResumeBtnText}>➕ Simulate Resume Upload</Text>
                    </Pressable>
                  </View>
                )}

                {/* Uploaded File representation */}
                {currentProfile.resumeAnalysis.resumeFile && (
                  <View style={styles.fileRepCard}>
                    <Text style={styles.fileRepIcon}>📄</Text>
                    <View style={styles.fileRepDetails}>
                      <Text style={styles.fileRepName}>{currentProfile.resumeAnalysis.resumeFile}</Text>
                      <Text style={styles.fileRepTime}>{currentProfile.resumeAnalysis.parseTime}</Text>
                    </View>
                    <Pressable onPress={deleteResume}>
                      <Text style={styles.trashIcon}>🗑️</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Right Column: Extracted Profile Data */}
              <View style={styles.rightColResume}>
                <HoverableCard style={styles.extractedProfileDataCard}>
                  <View style={styles.extractedHeaderRow}>
                    <Text style={styles.extractedHeaderTitle}>Extracted Profile Data</Text>
                    {!isEditingExtracted ? (
                      <Pressable style={styles.editExtractedBtn} onPress={() => {
                        setTempProjects(currentProfile.resumeAnalysis.extractedData.projects.join(', '));
                        setTempCoreTechs(currentProfile.resumeAnalysis.extractedData.coreTechnologies.join(', '));
                        setIsEditingExtracted(true);
                      }}>
                        <Text style={styles.editExtractedBtnText}>📝 Review & Edit</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={styles.saveExtractedBtn} onPress={saveExtractedEdits}>
                        <Text style={styles.saveExtractedBtnText}>💾 Save Edits</Text>
                      </Pressable>
                    )}
                  </View>

                  {!isEditingExtracted ? (
                    <View style={styles.extractedDataList}>
                      {/* Projects */}
                      <View style={styles.extractedSection}>
                        <View style={styles.sectionHeaderWrap}>
                          <Text style={styles.extractedSectionLabel}>📁 PROJECTS</Text>
                          <View style={styles.extractedCountBadge}>
                            <Text style={styles.extractedCountText}>{currentProfile.resumeAnalysis.extractedData.projects.length} Detected</Text>
                          </View>
                        </View>
                        {currentProfile.resumeAnalysis.extractedData.projects.map((proj, idx) => (
                          <View key={idx} style={styles.extractedItemRow}>
                            <Text style={styles.checkedBullet}>✓</Text>
                            <Text style={styles.extractedItemText}>{proj}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Experience */}
                      <View style={styles.extractedSection}>
                        <View style={styles.sectionHeaderWrap}>
                          <Text style={styles.extractedSectionLabel}>💼 EXPERIENCE</Text>
                          <View style={styles.extractedCountBadge}>
                            <Text style={styles.extractedCountText}>{currentProfile.resumeAnalysis.extractedData.experience.length} Detected</Text>
                          </View>
                        </View>
                        {currentProfile.resumeAnalysis.extractedData.experience.map((exp, idx) => (
                          <View key={idx} style={styles.extractedItemRow}>
                            <Text style={styles.checkedBullet}>✓</Text>
                            <View>
                              <Text style={styles.extractedItemTextBold}>{exp.title}</Text>
                              <Text style={styles.extractedItemSubtext}>{exp.company} • {exp.period}</Text>
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* Core Technologies */}
                      <View style={styles.extractedSection}>
                        <Text style={styles.extractedSectionLabel}>⚙️ CORE TECHNOLOGIES</Text>
                        <View style={styles.tagsContainer}>
                          {currentProfile.resumeAnalysis.extractedData.coreTechnologies.map((tech, idx) => (
                            <View key={idx} style={[styles.tagBadge, { backgroundColor: COLORS.mint }]}>
                              <Text style={[styles.tagBadgeText, { color: COLORS.teal }]}>{tech}</Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Identified Skill Domains */}
                      <View style={styles.extractedSection}>
                        <Text style={styles.extractedSectionLabel}>🔬 IDENTIFIED SKILL DOMAINS</Text>
                        {currentProfile.resumeAnalysis.extractedData.identifiedSkillDomains.map((domain, idx) => (
                          <View key={idx} style={styles.domainItem}>
                            <View style={styles.domainInfoRow}>
                              <Text style={styles.domainName}>{domain.name}</Text>
                              <Text style={styles.domainVal}>{domain.value}%</Text>
                            </View>
                            <View style={styles.domainProgressTrack}>
                              <View style={[styles.domainProgressBar, { width: `${domain.value}%` }]} />
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.extractedDataList}>
                      <Text style={styles.inputHelpText}>Edit extracted comma-separated lists below:</Text>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Projects</Text>
                        <TextInput
                          style={styles.textInput}
                          value={tempProjects}
                          onChangeText={setTempProjects}
                        />
                      </View>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Core Technologies</Text>
                        <TextInput
                          style={styles.textInput}
                          value={tempCoreTechs}
                          onChangeText={setTempCoreTechs}
                        />
                      </View>
                    </View>
                  )}
                </HoverableCard>
              </View>
            </View>

            {validationErrors.resumeFile && <Text style={styles.errorText}>{validationErrors.resumeFile}</Text>}
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Professional Links & GitHub</Text>
            <Text style={styles.sectionSubtitle}>Connect your professional profiles so SkillSetu can verify your skills through real project evidence.</Text>

            <View style={[styles.rowLayout, !isTablet && styles.flexCol]}>
              {/* Left Column: Link Inputs */}
              <View style={styles.leftColLinks}>
                <HoverableCard style={styles.linksCard}>
                  <Text style={styles.cardHeaderTitle}>Professional Profiles</Text>

                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>LinkedIn URL</Text>
                    <View style={styles.iconInputRow}>
                      <Text style={styles.inputIconEmoji}>🔗</Text>
                      <TextInput
                        style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                        placeholder="https://linkedin.com/in/alexchen"
                        value={currentProfile.githubLinks.linkedinUrl}
                        onChangeText={(val) => updateGithubLinksField('linkedinUrl', val)}
                      />
                    </View>
                  </View>

                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>Personal Portfolio</Text>
                    <View style={styles.iconInputRow}>
                      <Text style={styles.inputIconEmoji}>🌐</Text>
                      <TextInput
                        style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                        placeholder="https://alexchen.dev"
                        value={currentProfile.githubLinks.portfolioUrl}
                        onChangeText={(val) => updateGithubLinksField('portfolioUrl', val)}
                      />
                    </View>
                  </View>
                </HoverableCard>
              </View>

              {/* Right Column: GitHub Connection & Repository Selector */}
              <View style={styles.rightColLinks}>
                {!currentProfile.githubLinks.githubConnected ? (
                  <View style={styles.noGithubCard}>
                    <Text style={styles.githubIconEmoji}>💻</Text>
                    <Text style={styles.githubHeaderTitle}>GitHub Account</Text>
                    <Text style={styles.githubDescription}>Verify your technical prowess by linking your GitHub profile and analyzing public repos.</Text>
                    <Pressable style={styles.connectGithubBtn} onPress={simulateGithubConnection}>
                      <Text style={styles.connectGithubBtnText}>🔗 Simulate GitHub Connection</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    {/* GitHub Connected Card */}
                    <HoverableCard style={styles.githubCard}>
                      <View style={styles.githubCardHeader}>
                        <View style={styles.githubInfoLeft}>
                          <Text style={styles.githubAvatarIcon}>💻</Text>
                          <View>
                            <Text style={styles.githubTitleText}>GitHub Account</Text>
                            <Text style={styles.githubSubText}>@{currentProfile.githubLinks.githubUsername}</Text>
                          </View>
                        </View>
                        <View style={styles.connectedBadge}>
                          <Text style={styles.connectedBadgeText}>✓ Connected</Text>
                        </View>
                      </View>

                      {/* Repos Analyzed Grid */}
                      <View style={styles.githubMetricsRow}>
                        <View style={styles.metricSquare}>
                          <Text style={styles.metricLabelText}>REPOSITORIES ANALYZED</Text>
                          <Text style={styles.metricValueTextLarge}>{currentProfile.githubLinks.githubMetrics.reposAnalyzed}</Text>
                        </View>
                        <View style={styles.metricSquare}>
                          <Text style={styles.metricLabelText}>PROJECTS DETECTED</Text>
                          <Text style={styles.metricValueTextLarge}>{currentProfile.githubLinks.githubMetrics.projectsDetected}</Text>
                        </View>
                      </View>

                      {/* AI Skill Evidence */}
                      <View style={styles.aiEvidenceSection}>
                        <Text style={styles.evidenceHeaderTitle}>🛡️ AI Skill Evidence</Text>
                        {currentProfile.githubLinks.githubSkills.map((skill, index) => (
                          <View key={index} style={styles.evidenceSkillItem}>
                            <View style={styles.evidenceInfoRow}>
                              <Text style={styles.evidenceSkillName}>{skill.name}</Text>
                              <Text style={styles.evidenceSkillPercentage}>{skill.percentage}% ({skill.rating})</Text>
                            </View>
                            <View style={styles.evidenceProgressTrack}>
                              <View style={[styles.evidenceProgressBar, { width: `${skill.percentage}%` }]} />
                            </View>
                          </View>
                        ))}
                      </View>
                    </HoverableCard>

                    {/* Repository Inclusion Card */}
                    <HoverableCard style={styles.reposSelectionCard}>
                      <Text style={styles.cardHeaderTitle}>Include Repositories</Text>
                      <Text style={styles.inputHelpText}>Select the projects that best showcase your skills to potential employers.</Text>

                      <View style={styles.reposList}>
                        {currentProfile.githubLinks.repositories.map((repo) => (
                          <Pressable
                            key={repo.id}
                            style={[styles.repoListItem, repo.selected && styles.repoListItemSelected]}
                            onPress={() => toggleRepositorySelected(repo.id)}
                          >
                            <View style={styles.repoCheckbox}>
                              <Text style={styles.repoCheckboxText}>{repo.selected ? '✓' : ' '}</Text>
                            </View>
                            <View style={styles.repoDetails}>
                              <Text style={styles.repoNameText}>{repo.name}</Text>
                              <Text style={styles.repoDescText}>{repo.description}</Text>
                              <View style={styles.repoTagsRow}>
                                {repo.tags.map((tag) => (
                                  <View key={tag} style={styles.repoTag}>
                                    <Text style={styles.repoTagText}>{tag}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </HoverableCard>
                  </View>
                )}
              </View>
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.step6Wrapper}>
            {/* Header Titles */}
            <View style={styles.step6Header}>
              <Text style={styles.step6Title}>Review Your Profile</Text>
              <Text style={styles.step6Subtitle}>Review your information before SkillSetu starts generating your personalized career intelligence.</Text>
            </View>

            <View style={[styles.step6Layout, !isTablet && styles.flexCol]}>
              {/* Left Column: Profile Completion + 4 Grid Cards */}
              <View style={styles.step6LeftCol}>
                {/* Profile Completion Card */}
                <View style={styles.step6CompletionCard}>
                  <View style={styles.step6CompletionRow}>
                    <Text style={styles.completionLabelLarge}>Profile Completion</Text>
                    <Text style={styles.completionPercentLarge}>{calculateStepCompletionPercent()}%</Text>
                  </View>
                  <View style={styles.completionTrackLarge}>
                    <View style={[styles.completionBarLarge, { width: `${calculateStepCompletionPercent()}%` }]} />
                  </View>
                </View>

                {/* 4 Cards Grid */}
                <View style={styles.cardsGrid}>
                  {/* Card 1: Personal Info */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryCardHeader}>
                      <View style={styles.summaryCardTitleWrap}>
                        <View style={styles.checkIconCircle}>
                          <Text style={styles.checkIconText}>✓</Text>
                        </View>
                        <Text style={styles.summaryCardTitle}>Personal Info</Text>
                      </View>
                      <Pressable onPress={() => setActiveStep(1)} style={styles.pencilBtn}>
                        <Text style={styles.pencilIcon}>✏️</Text>
                      </Pressable>
                    </View>
                    <View style={styles.summaryCardContent}>
                      <Text style={styles.summaryText}><Text style={styles.boldLabel}>Name:</Text> {currentProfile.personalInfo.fullName || 'Not provided'}</Text>
                      <Text style={styles.summaryText}><Text style={styles.boldLabel}>Location:</Text> {currentProfile.personalInfo.location || 'Not provided'}</Text>
                      <Text style={styles.summaryText}><Text style={styles.boldLabel}>Experience:</Text> {currentProfile.personalInfo.yearsOfExperience || 'Not provided'}</Text>
                    </View>
                  </View>

                  {/* Card 2: Education */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryCardHeader}>
                      <View style={styles.summaryCardTitleWrap}>
                        <View style={styles.checkIconCircle}>
                          <Text style={styles.checkIconText}>✓</Text>
                        </View>
                        <Text style={styles.summaryCardTitle}>Education</Text>
                      </View>
                      <Pressable onPress={() => setActiveStep(2)} style={styles.pencilBtn}>
                        <Text style={styles.pencilIcon}>✏️</Text>
                      </Pressable>
                    </View>
                    <View style={styles.summaryCardContent}>
                      {currentProfile.education.list.length > 0 ? (
                        <>
                          <Text style={styles.summaryText}><Text style={styles.boldLabel}>Degree:</Text> {currentProfile.education.list[0].degree}</Text>
                          <Text style={styles.summaryText}><Text style={styles.boldLabel}>University:</Text> {currentProfile.education.list[0].university}</Text>
                          <Text style={styles.summaryText}><Text style={styles.boldLabel}>Graduation:</Text> {currentProfile.education.list[0].graduationYear}</Text>
                        </>
                      ) : (
                        <Text style={styles.summaryText}>No education listed</Text>
                      )}
                    </View>
                  </View>

                  {/* Card 3: Career Goals */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryCardHeader}>
                      <View style={styles.summaryCardTitleWrap}>
                        <View style={styles.checkIconCircle}>
                          <Text style={styles.checkIconText}>✓</Text>
                        </View>
                        <Text style={styles.summaryCardTitle}>Career Goals</Text>
                      </View>
                      <Pressable onPress={() => setActiveStep(3)} style={styles.pencilBtn}>
                        <Text style={styles.pencilIcon}>✏️</Text>
                      </Pressable>
                    </View>
                    <View style={styles.summaryCardContent}>
                      <Text style={styles.summaryText}><Text style={styles.boldLabel}>Target Role:</Text> {currentProfile.careerGoals.targetCareer || 'Not provided'}</Text>
                      <Text style={styles.summaryText}><Text style={styles.boldLabel}>Industry:</Text> {currentProfile.careerGoals.industry || 'Not provided'}</Text>
                      <Text style={styles.summaryText}><Text style={styles.boldLabel}>Timeline:</Text> {currentProfile.careerGoals.timeline || 'Not provided'}</Text>
                    </View>
                  </View>

                  {/* Card 4: Tech Stack & GitHub */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryCardHeader}>
                      <View style={styles.summaryCardTitleWrap}>
                        <View style={styles.checkIconCircle}>
                          <Text style={styles.checkIconText}>✓</Text>
                        </View>
                        <Text style={styles.summaryCardTitle}>Tech Stack & GitHub</Text>
                      </View>
                      <Pressable onPress={() => setActiveStep(5)} style={styles.pencilBtn}>
                        <Text style={styles.pencilIcon}>✏️</Text>
                      </Pressable>
                    </View>
                    <View style={styles.summaryCardContent}>
                      <View style={styles.techPillsRow}>
                        {currentProfile.resumeAnalysis.extractedData.coreTechnologies.slice(0, 4).map((tech, idx) => (
                          <View key={idx} style={styles.techPill}>
                            <Text style={styles.techPillText}>{tech}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Right Column: AI Pre-Analysis + Confirm Checkbox & Complete Button */}
              <View style={styles.step6RightCol}>
                {/* AI Pre-Analysis Card */}
                <View style={styles.aiPreAnalysisCard}>
                  <View style={styles.aiHeaderRow}>
                    <Text style={styles.sparkleIcon}>✨</Text>
                    <Text style={styles.aiPreAnalysisTitle}>AI Pre-Analysis</Text>
                  </View>

                  <View style={styles.aiMetricRow}>
                    <Text style={styles.aiMetricLabel}>Resume Score</Text>
                    <Text style={styles.aiMetricVal}>{currentProfile.resumeAnalysis.score || 82}<Text style={styles.aiMetricValTotal}>/100</Text></Text>
                  </View>

                  {/* Teal Progress bar for score */}
                  <View style={styles.aiProgressTrack}>
                    <View style={[styles.aiProgressBar, { width: `${currentProfile.resumeAnalysis.score || 82}%` }]} />
                  </View>

                  <View style={styles.aiMetricRow}>
                    <Text style={styles.aiMetricLabel}>Skills Detected</Text>
                    <Text style={styles.aiMetricVal}>{currentProfile.githubLinks.githubConnected ? '18' : '12'}</Text>
                  </View>

                  <View style={styles.aiMetricRow}>
                    <Text style={styles.aiMetricLabel}>Profile Confidence</Text>
                    <Text style={[styles.aiMetricVal, { color: COLORS.teal }]}>91%</Text>
                  </View>
                </View>

                {/* Confirm Card */}
                <View style={styles.confirmActionCard}>
                  <Pressable
                    style={styles.checkboxRow}
                    onPress={() => setIsConfirmed(!isConfirmed)}
                  >
                    <View style={[styles.customCheckbox, isConfirmed && styles.customCheckboxChecked]}>
                      {isConfirmed && <Text style={styles.checkedTickText}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>I confirm information is accurate.</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.completeProfileBtn, !isConfirmed && styles.disabledCompleteBtn]}
                    onPress={handleNext}
                  >
                    <Text style={styles.completeProfileBtnText}>Complete Profile ➔</Text>
                  </Pressable>

                  <Text style={styles.termsSubtext}>
                    By completing, you agree to our Terms of Service and Privacy Policy.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">

      {/* Profile Flow Header Banner */}
      {activeStep !== 6 && (
        <View style={styles.profileHeaderBanner}>
          <Text style={styles.bannerEmoji}>👤</Text>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>
              {currentProfile.verified ? 'Edit Your Professional Profile' : 'Set Up Your Professional Profile'}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {currentProfile.verified 
                ? 'Keep your academic transcripts, target career preferences, and portfolio links updated.' 
                : 'Complete the 6 simple steps below to unlock matches and get verified by our AI agent.'}
            </Text>
          </View>
        </View>
      )}

      {/* Stepper Steps Row */}
      <View style={styles.stepperContainer}>
        {stepsList.map((step) => {
          const isActive = step.id === activeStep;
          const isCompleted = step.id < activeStep || currentProfile.verified;
          return (
            <View key={step.id} style={[styles.stepItem, isWide && { flex: 1 }]}>
              {/* Stepper Circle */}
              <View style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted
              ]}>
                {isCompleted ? (
                  <Text style={styles.stepCircleTextCompleted}>✓</Text>
                ) : (
                  <Text style={[styles.stepCircleText, isActive && styles.stepCircleTextActive]}>{step.id}</Text>
                )}
              </View>
              {isWide && <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.name}</Text>}
            </View>
          );
        })}
      </View>

      {/* Step Progress Line for Mobile */}
      {!isWide && (
        <View style={styles.mobileStepperRow}>
          <Text style={styles.mobileStepperText}>Step {activeStep} of 6: <Text style={styles.boldText}>{stepsList[activeStep - 1].name}</Text></Text>
          <View style={styles.mobileProgressTrack}>
            <View style={[styles.mobileProgressBar, { width: `${(activeStep / 6) * 100}%` }]} />
          </View>
        </View>
      )}

      {/* Main Step Render Container */}
      <View style={styles.mainContentContainer}>
        {renderStepContent()}
      </View>

      {/* Bottom Actions Bar */}
      {activeStep !== 6 && (
        <View style={styles.actionsBar}>
          <Pressable
            style={[styles.backBtn, activeStep === 1 && styles.disabledBtn]}
            onPress={handleBack}
            disabled={activeStep === 1}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>

          <Pressable
            style={styles.saveBtn}
            onPress={handleNext}
          >
            <Text style={styles.saveBtnText}>
              Save & Continue ➔
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// Styling definitions
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 64,
  },
  // Simulation Tools Styles
  simulationHeader: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    marginBottom: 20,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  simulationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 12,
  },
  simulationButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  simBtn: {
    backgroundColor: COLORS.subtle,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  simBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  // Header Banner styles
  profileHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#071f14',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  bannerEmoji: {
    fontSize: 36,
    marginRight: 20,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.paper,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: COLORS.greenLight,
    marginTop: 6,
    lineHeight: 18,
  },
  // Stepper tracker
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    marginBottom: 24,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
  },
  stepCircleActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLight,
  },
  stepCircleCompleted: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  stepCircleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  stepCircleTextActive: {
    color: COLORS.green,
  },
  stepCircleTextCompleted: {
    fontSize: 13,
    fontWeight: '850',
    color: COLORS.paper,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.green,
  },
  // Mobile stepper styles
  mobileStepperRow: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 14,
    marginBottom: 24,
  },
  mobileStepperText: {
    fontSize: 13,
    color: COLORS.ink,
    marginBottom: 8,
  },
  mobileProgressTrack: {
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  mobileProgressBar: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  // Step Section Form Layout
  mainContentContainer: {
    backgroundColor: COLORS.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 24,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.02,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 24,
  },
  stepContainer: {
    gap: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.ink,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: -8,
    marginBottom: 8,
    lineHeight: 18,
  },
  // Inputs
  rowLayout: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  inputWrap: {
    flex: 1,
    minWidth: 220,
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
  },
  textInput: {
    height: 46,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.ink,
    backgroundColor: COLORS.canvas,
  },
  inputErrorBorder: {
    borderColor: COLORS.rose,
  },
  textArea: {
    height: 100,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  inputHelpText: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
  },
  errorText: {
    color: COLORS.rose,
    fontSize: 11,
    fontWeight: '700',
  },
  // Form Icons
  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    backgroundColor: COLORS.canvas,
    overflow: 'hidden',
  },
  inputIconEmoji: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.muted,
  },
  // Avatar Upload
  avatarUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  avatarInitials: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.greenLight,
    borderWidth: 2,
    borderColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.green,
  },
  uploadBtn: {
    backgroundColor: COLORS.panel,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  // Step 2 Education Marksheet Card
  extractedBoxCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
  },
  simulationUploadBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  extractBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.teal,
    backgroundColor: COLORS.mint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  extractionDescription: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  extractBtn: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.green,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  extractBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  extractedFlexRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  extractedFileLeft: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 20,
    borderRightWidth: Platform.OS === 'web' ? 1.5 : 0,
    borderRightColor: COLORS.subtle,
    minWidth: 150,
  },
  pdfThumbnail: {
    width: 60,
    height: 70,
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pdfIcon: {
    fontSize: 32,
  },
  pdfCheckedCircle: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.teal,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfCheckedText: {
    color: COLORS.paper,
    fontSize: 11,
    fontWeight: '900',
  },
  pdfFileName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
  },
  replaceBtn: {
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  replaceBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  extractedChecklistRight: {
    flex: 1,
    gap: 8,
  },
  extractedBadge: {
    backgroundColor: COLORS.mint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  extractedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.teal,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenCheck: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '900',
  },
  checkText: {
    fontSize: 13,
    color: COLORS.ink,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.ink,
  },
  // Education item Card
  educationCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  eduHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eduDegreeText: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.ink,
  },
  trashIcon: {
    fontSize: 16,
    padding: 4,
  },
  eduInfoLine: {
    fontSize: 13,
    color: COLORS.muted,
  },
  manualEduForm: {
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 16,
    padding: 18,
    backgroundColor: COLORS.canvas,
    gap: 12,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.navy,
  },
  addEduBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.paper,
  },
  addEduBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
  },
  // Step 3 Cards
  gridTwoColumns: {
    flexDirection: 'row',
    gap: 16,
  },
  flexCol: {
    flexDirection: 'column',
    gap: 16,
  },
  prefCard: {
    flex: 1,
    backgroundColor: COLORS.canvas,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    padding: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  fullWidthCard: {
    backgroundColor: COLORS.canvas,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    padding: 16,
    gap: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blueLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.blue,
  },
  closeTagEmoji: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.blue,
  },
  addTagBtn: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    minWidth: 110,
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    position: 'relative',
  },
  choiceBtnSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLight,
  },
  choiceBtnIcon: {
    fontSize: 16,
  },
  choiceBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
  },
  choiceBtnLabelSelected: {
    color: COLORS.green,
    fontWeight: '800',
  },
  checkedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.green,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedTextMini: {
    color: COLORS.paper,
    fontSize: 9,
    fontWeight: '900',
  },
  // Step 4: Resume
  leftColResume: {
    flex: 1,
    minWidth: 260,
    gap: 16,
  },
  rightColResume: {
    flex: 2,
    minWidth: 320,
  },
  resumeScoreCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  scoreHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  progressRingLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 8,
    borderColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTextDescription: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  viewAnalysisBtn: {
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.green,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  viewAnalysisBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  noResumeCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  noResumeIcon: {
    fontSize: 36,
  },
  noResumeText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  uploadResumeBtn: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.green,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  uploadResumeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  fileRepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  fileRepIcon: {
    fontSize: 24,
  },
  fileRepDetails: {
    flex: 1,
  },
  fileRepName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
  },
  fileRepTime: {
    fontSize: 10,
    color: COLORS.muted,
  },
  extractedProfileDataCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  extractedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  extractedHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
  },
  editExtractedBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.paper,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  editExtractedBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.teal,
  },
  saveExtractedBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.teal,
  },
  saveExtractedBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.paper,
  },
  extractedDataList: {
    gap: 14,
  },
  extractedSection: {
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    paddingBottom: 12,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  extractedSectionLabel: {
    fontSize: 11,
    fontWeight: '850',
    color: COLORS.muted,
  },
  extractedCountBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  extractedCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.green,
  },
  extractedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkedBullet: {
    color: COLORS.amber,
    fontSize: 12,
    fontWeight: '900',
  },
  extractedItemText: {
    fontSize: 13,
    color: COLORS.ink,
  },
  extractedItemTextBold: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  extractedItemSubtext: {
    fontSize: 11,
    color: COLORS.muted,
  },
  domainItem: {
    gap: 4,
  },
  domainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  domainName: {
    fontSize: 12,
    color: COLORS.ink,
  },
  domainVal: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  domainProgressTrack: {
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  domainProgressBar: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  // Step 5: Links
  leftColLinks: {
    flex: 1,
    minWidth: 260,
  },
  rightColLinks: {
    flex: 2,
    minWidth: 320,
  },
  linksCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  noGithubCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  githubIconEmoji: {
    fontSize: 36,
  },
  githubHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
  },
  githubDescription: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  connectGithubBtn: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.green,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  connectGithubBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  githubCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  githubCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  githubInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  githubAvatarIcon: {
    fontSize: 28,
  },
  githubTitleText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.ink,
  },
  githubSubText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  connectedBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.green,
  },
  githubMetricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricSquare: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  metricLabelText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.muted,
  },
  metricValueTextLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.ink,
  },
  aiEvidenceSection: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.subtle,
    paddingTop: 16,
  },
  evidenceHeaderTitle: {
    fontSize: 12,
    fontWeight: '850',
    color: COLORS.muted,
  },
  evidenceSkillItem: {
    gap: 4,
  },
  evidenceInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  evidenceSkillName: {
    fontSize: 12,
    color: COLORS.ink,
  },
  evidenceSkillPercentage: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  evidenceProgressTrack: {
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  evidenceProgressBar: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  reposSelectionCard: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  reposList: {
    gap: 10,
    marginTop: 6,
  },
  repoListItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  repoListItemSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLight,
  },
  repoCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.paper,
    marginTop: 2,
  },
  repoCheckboxText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.green,
  },
  repoDetails: {
    flex: 1,
    gap: 4,
  },
  repoNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  repoDescText: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 14,
  },
  repoTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  repoTag: {
    backgroundColor: COLORS.panel,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  repoTagText: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: '700',
  },
  // Step 6: Review Your Profile Design Layout
  step6Wrapper: {
    gap: 20,
  },
  step6Header: {
    marginBottom: 8,
  },
  step6Title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.ink,
  },
  step6Subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 6,
    lineHeight: 18,
  },
  step6Layout: {
    flexDirection: 'row',
    gap: 24,
  },
  step6LeftCol: {
    flex: 2,
    gap: 20,
  },
  step6RightCol: {
    flex: 1,
    minWidth: 280,
    gap: 20,
  },
  step6CompletionCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    padding: 20,
    gap: 12,
  },
  step6CompletionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionLabelLarge: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.ink,
  },
  completionPercentLarge: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.teal,
  },
  completionTrackLarge: {
    height: 8,
    backgroundColor: COLORS.subtle,
    borderRadius: 4,
    overflow: 'hidden',
  },
  completionBarLarge: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 4,
  },
  // Grid of 4 Cards
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryCard: {
    width: '48%',
    minWidth: 220,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    paddingBottom: 8,
  },
  summaryCardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  checkIconText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '900',
  },
  summaryCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.green,
  },
  pencilBtn: {
    padding: 2,
  },
  pencilIcon: {
    fontSize: 13,
    color: COLORS.muted,
  },
  summaryCardContent: {
    gap: 6,
  },
  summaryText: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
  },
  boldLabel: {
    fontWeight: '800',
    color: COLORS.ink,
  },
  techPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  techPill: {
    backgroundColor: COLORS.panel,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  techPillText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '700',
  },
  // AI Pre-Analysis Card
  aiPreAnalysisCard: {
    backgroundColor: COLORS.mint,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#bbf7d0', // Light green borders
    padding: 20,
    gap: 16,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleIcon: {
    fontSize: 16,
  },
  aiPreAnalysisTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.ink,
  },
  aiMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiMetricLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  aiMetricVal: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.ink,
  },
  aiMetricValTotal: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '600',
  },
  aiProgressTrack: {
    height: 6,
    backgroundColor: COLORS.paper,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: -8,
  },
  aiProgressBar: {
    height: '100%',
    backgroundColor: COLORS.teal,
    borderRadius: 3,
  },
  // Confirm action card
  confirmActionCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    padding: 20,
    gap: 16,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.muted,
    backgroundColor: COLORS.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCheckboxChecked: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLight,
  },
  checkedTickText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '950',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  completeProfileBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.teal,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  disabledCompleteBtn: {
    opacity: 0.5,
  },
  completeProfileBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.paper,
  },
  termsSubtext: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 14,
  },
  // Actions bottom bar
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  backBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: COLORS.paper,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
  },
  saveBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: COLORS.green,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.paper,
  },
});
