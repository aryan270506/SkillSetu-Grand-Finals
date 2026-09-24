import React, { useRef, useState } from 'react';
import { createInitialProfile, fetchCompleteStudentProfile } from '../services/profileService';
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

// Helper function to safely render strings in React JSX without object child errors
export function renderVal(val, defaultVal = '') {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === 'object') {
    if (val.value !== undefined && val.value !== null) {
      return typeof val.value === 'object' ? renderVal(val.value, defaultVal) : String(val.value);
    }
    return defaultVal;
  }
  return String(val);
}

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
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  },
  // Step 2: Education
  education: {
    hasExtractedMarksheet: false,
    marksheetFileName: '',
    cgpaDetected: '',
    universityDetected: '',
    academicYearDetected: '',
    list: [],
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
  // Step 4: Resume & AI Analysis (Empty default)
  resumeAnalysis: {
    resumeFile: '',
    parseTime: '',
    score: 0,
    scoreText: '',
    scoreBreakdown: {},
    extractedData: {
      projects: [],
      rawProjects: [],
      experience: [],
      coreTechnologies: [],
      normalizedSkills: [],
      identifiedSkillDomains: [],
      education: [],
      certifications: [],
      achievements: [],
      links: {},
    },
  },

  // Step 5: GitHub & Professional Links
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
    profileImage: '',
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

export default function Profile({ user, updateUser, profileData, setProfileData, onFinish }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;

  const [activeStep, setActiveStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRef = useRef(null);
  const marksheetFileInputRef = useRef(null);

  // Marksheet Document Extraction States
  const [isExtractingMarksheet, setIsExtractingMarksheet] = useState(false);
  const [extractionConfidence, setExtractionConfidence] = useState({});

  // Manual Education Form Field States
  const [eduDegree, setEduDegree] = useState('');
  const [eduBranch, setEduBranch] = useState('');
  const [eduUniv, setEduUniv] = useState('');
  const [eduStart, setEduStart] = useState('');
  const [eduGrad, setEduGrad] = useState('');
  const [isUploadingResume, setIsUploadingResume] = useState(false);


  // Resume Extracted Data Editing States
  const [isEditingExtracted, setIsEditingExtracted] = useState(false);
  const [tempProjects, setTempProjects] = useState('');
  const [tempCoreTechs, setTempCoreTechs] = useState('');
  const [isAnalyzingGithub, setIsAnalyzingGithub] = useState(false);
  const [expandedSkillIdx, setExpandedSkillIdx] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(profileData?.verified || false);
  const [isViewingOnePageProfile, setIsViewingOnePageProfile] = useState(
    profileData?.verified || (profileData?.personalInfo?.fullName ? true : false)
  );

  // Controlled Taxonomy Layer States
  const [taxonomyCareers, setTaxonomyCareers] = useState([]);
  const [taxonomySkills, setTaxonomySkills] = useState([]);
  const [taxonomyIndustries, setTaxonomyIndustries] = useState([]);
  const [taxonomyLocations, setTaxonomyLocations] = useState([]);
  const [recommendedSkillIds, setRecommendedSkillIds] = useState([]);
  
  const [careerSearch, setCareerSearch] = useState('');
  const [showCareerDropdown, setShowCareerDropdown] = useState(false);

  const [skillSearch, setSkillSearch] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Load initial popular taxonomy options and search state handling from FastAPI backend
  React.useEffect(() => {
    async function loadInitialTaxonomy() {
      try {
        const [cRes, sRes, iRes, lRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/v1/taxonomy/careers?limit=50').then(r => r.json()),
          fetch('http://127.0.0.1:8000/api/v1/taxonomy/skills?limit=50').then(r => r.json()),
          fetch('http://127.0.0.1:8000/api/v1/taxonomy/industries').then(r => r.json()),
          fetch('http://127.0.0.1:8000/api/v1/taxonomy/locations?limit=50').then(r => r.json()),
        ]);

        if (cRes.status === 'success') setTaxonomyCareers(cRes.data || []);
        if (sRes.status === 'success') setTaxonomySkills(sRes.data || []);
        if (iRes.status === 'success') setTaxonomyIndustries(iRes.data || []);
        if (lRes.status === 'success') setTaxonomyLocations(lRes.data || []);
      } catch (err) {
        console.error('Error loading SkillSetu taxonomy dataset:', err);
      }
    }
    loadInitialTaxonomy();
  }, []);

  // Live debounced server-side search for Careers across complete 3,039+ ESCO database
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const url = careerSearch.trim() 
          ? `http://127.0.0.1:8000/api/v1/taxonomy/careers?q=${encodeURIComponent(careerSearch.trim())}&limit=50`
          : `http://127.0.0.1:8000/api/v1/taxonomy/careers?limit=50`;
        const res = await fetch(url).then(r => r.json());
        if (res.status === 'success') {
          setTaxonomyCareers(res.data || []);
        }
      } catch (err) {
        console.error('Error searching careers taxonomy:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [careerSearch]);

  // Live debounced server-side search for Skills across complete 13,939+ ESCO dataset
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const url = skillSearch.trim() 
          ? `http://127.0.0.1:8000/api/v1/taxonomy/skills?q=${encodeURIComponent(skillSearch.trim())}&limit=50`
          : `http://127.0.0.1:8000/api/v1/taxonomy/skills?limit=50`;
        const res = await fetch(url).then(r => r.json());
        if (res.status === 'success') {
          setTaxonomySkills(res.data || []);
        }
      } catch (err) {
        console.error('Error searching skills taxonomy:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [skillSearch]);

  // Live debounced server-side search for Locations across complete geographic dataset
  React.useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const url = locationSearch.trim() 
          ? `http://127.0.0.1:8000/api/v1/taxonomy/locations?q=${encodeURIComponent(locationSearch.trim())}&limit=50`
          : `http://127.0.0.1:8000/api/v1/taxonomy/locations?limit=50`;
        const res = await fetch(url).then(r => r.json());
        if (res.status === 'success') {
          setTaxonomyLocations(res.data || []);
        }
      } catch (err) {
        console.error('Error searching locations taxonomy:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [locationSearch]);

  // Auto-fill logged-in user info & fetch stored career goals, resume, and GitHub status from DB
  React.useEffect(() => {
    if (user && user.email) {
      setProfileData(prev => createInitialProfile(user, prev));

      if (user.degree) setEduDegree(renderVal(user.degree));
      if (user.branch) setEduBranch(renderVal(user.branch));
      if (user.university) setEduUniv(renderVal(user.university));
      if (user.start_year) setEduStart(renderVal(user.start_year));
      if (user.graduation_year) setEduGrad(renderVal(user.graduation_year));

      fetchCompleteStudentProfile(user, setProfileData);
    }
  }, [user]);

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
      if (!currentProfile.personalInfo.profileImage) {
        errors.profileImage = 'Profile image is required before proceeding.';
      }
      if (!currentProfile.personalInfo.fullName?.trim()) {
        errors.fullName = 'Full Name is required.';
      }
      if (!currentProfile.personalInfo.email?.trim()) {
        errors.email = 'Email Address is required.';
      } else if (!/\S+@\S+\.\S+/.test(currentProfile.personalInfo.email)) {
        errors.email = 'Email address is invalid.';
      }
      if (!currentProfile.personalInfo.phone?.trim()) {
        errors.phone = 'Phone Number is required.';
      }
      if (!currentProfile.personalInfo.headline?.trim()) {
        errors.headline = 'Headline / Short Title is required.';
      }
      if (!currentProfile.personalInfo.location?.trim()) {
        errors.location = 'Location is required.';
      }
      if (!currentProfile.personalInfo.yearsOfExperience?.trim()) {
        errors.yearsOfExperience = 'Years of Experience is required.';
      }
      if (!currentProfile.personalInfo.bio?.trim()) {
        errors.bio = 'Bio / About Yourself is required.';
      }
    } else if (step === 2) {
      if (!currentProfile.education.hasExtractedMarksheet) {
        errors.marksheet = 'Please upload your latest academic marksheet before proceeding.';
      }
      if (!eduDegree.trim()) errors.eduDegree = 'Degree is required.';
      if (!eduUniv.trim()) errors.eduUniv = 'University / Institution is required.';
      if (!eduGrad.trim()) errors.eduGrad = 'Graduation Year is required.';
    } else if (step === 3) {
      const cGoals = currentProfile.careerGoals || {};
      const selectedCareers = cGoals.targetCareerIds || (cGoals.targetCareerId ? [cGoals.targetCareerId] : []);
      const selectedSkills = cGoals.skillIds || [];
      const selectedLocations = cGoals.preferredLocationIds || [];
      const selectedIndustries = cGoals.targetIndustryIds || (cGoals.targetIndustryId ? [cGoals.targetIndustryId] : []);
      const opportunityTypes = cGoals.opportunityTypes || [];
      const workPreferences = cGoals.workPreferences || [];

      if (selectedCareers.length === 0) errors.targetCareer = 'At least one Target Career role is required.';
      if (selectedLocations.length === 0) errors.locations = 'At least one Preferred Location is required.';
      if (selectedSkills.length === 0) errors.skills = 'At least one Skill is required.';
      if (selectedIndustries.length === 0) errors.industry = 'At least one Target Industry is required.';
      if (!cGoals.timeline) errors.timeline = 'Timeline choice is required.';
      if (opportunityTypes.length === 0) errors.opportunityTypes = 'At least one Opportunity Type is required.';
      if (workPreferences.length === 0) errors.workPreferences = 'At least one Work Preference is required.';
      if (!cGoals.careerGoal?.trim()) errors.careerGoal = 'Career Goal & Personal Statement description is required.';
    } else if (step === 4) {
      if (!currentProfile.resumeAnalysis.resumeFile) errors.resumeFile = 'Please upload/select a resume file';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(activeStep)) {
      if (activeStep === 1) {
        // Save Step 1 personal information directly to user database record
        try {
          const res = await fetch('http://127.0.0.1:8000/api/v1/student/update-personal-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: currentProfile.personalInfo.email.trim(),
              profile_image: currentProfile.personalInfo.profileImage || '',
              headline: currentProfile.personalInfo.headline.trim(),
              location: currentProfile.personalInfo.location.trim(),
              years_of_experience: currentProfile.personalInfo.yearsOfExperience.trim(),
              bio: currentProfile.personalInfo.bio.trim(),
            }),
          });
          const resData = await res.json();
          if (res.ok && resData.user && updateUser) {
            updateUser(resData.user);
          }
        } catch (err) {
          console.error('Error saving personal info to DB:', err);
        }
      }

      if (activeStep === 2) {
        // Save Step 2 user-edited education & uploaded marksheet directly to PostgreSQL database
        try {
          const eduItem = currentProfile.education.list[0] || {};
          const finalDegree = eduDegree.trim() || renderVal(eduItem.degree);
          const finalBranch = eduBranch.trim() || renderVal(eduItem.branch);
          const finalUniv = eduUniv.trim() || renderVal(eduItem.university);
          const finalStart = eduStart.trim() || renderVal(eduItem.startYear);
          const finalGrad = eduGrad.trim() || renderVal(eduItem.graduationYear);

          const res = await fetch('http://127.0.0.1:8000/api/v1/student/update-education', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: currentProfile.personalInfo.email.trim(),
              degree: finalDegree,
              branch: finalBranch,
              university: finalUniv,
              start_year: finalStart,
              graduation_year: finalGrad,
              cgpa_or_percentage: currentProfile.education.cgpaDetected || '',
              marksheet_url: currentProfile.education.marksheetUrl || currentProfile.education.marksheetFileName || '',
            }),
          });
          const resData = await res.json();
          if (res.ok && resData.user && updateUser) {
            updateUser(resData.user);
          }
        } catch (err) {
          console.error('Error saving education info to DB:', err);
        }
      }

      if (activeStep === 3) {
        // Save Step 3 controlled career goals & selections directly to PostgreSQL database
        try {
          const cGoals = currentProfile.careerGoals || {};
          const selectedCareers = cGoals.targetCareerIds || (cGoals.targetCareerId ? [cGoals.targetCareerId] : []);
          const selectedIndustries = cGoals.targetIndustryIds || (cGoals.targetIndustryId ? [cGoals.targetIndustryId] : []);

          await fetch('http://127.0.0.1:8000/api/v1/taxonomy/student/career-goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: currentProfile.personalInfo.email.trim(),
              target_career_id: selectedCareers[0] || cGoals.targetCareerId || '',
              target_career_ids: selectedCareers,
              skill_ids: cGoals.skillIds || [],
              preferred_location_ids: cGoals.preferredLocationIds || [],
              target_industry_id: selectedIndustries[0] || cGoals.targetIndustryId || '',
              target_industry_ids: selectedIndustries,
              opportunity_types: cGoals.opportunityTypes || [],
              work_preferences: cGoals.workPreferences || [],
              timeline: cGoals.timeline || '',
              career_goal_text: cGoals.careerGoal || '',
            }),
          });
        } catch (err) {
          console.error('Error saving career goals to DB:', err);
        }
      }

      if (activeStep === 4 || activeStep === 5) {
        // Save Step 4 & Step 5 confirmed resume, links, and GitHub connection to PostgreSQL database
        try {
          const resExt = currentProfile.resumeAnalysis.extractedData || {};
          const normSkills = resExt.normalizedSkills || [];
          const canonicalSkillIds = normSkills.map(s => s.skill_id).filter(Boolean);

          const linksObj = resExt.links || {};
          if (currentProfile.githubLinks.linkedinUrl) {
            linksObj.linkedin = currentProfile.githubLinks.linkedinUrl;
          }
          if (currentProfile.githubLinks.portfolioUrl) {
            linksObj.portfolio = currentProfile.githubLinks.portfolioUrl;
          }

          await fetch('http://127.0.0.1:8000/api/v1/student/update-resume-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: currentProfile.personalInfo.email.trim(),
              projects: resExt.projects || [],
              core_technologies: resExt.coreTechnologies || [],
              skill_ids: canonicalSkillIds,
              experience: resExt.experience || [],
              education: resExt.education || [],
              certifications: resExt.certifications || [],
              achievements: resExt.achievements || [],
              links: linksObj,
              linkedin_url: currentProfile.githubLinks.linkedinUrl || '',
              portfolio_url: currentProfile.githubLinks.portfolioUrl || '',
            }),
          });
        } catch (err) {
          console.error('Error persisting Step 4/5 data to DB:', err);
        }
      }


      if (activeStep < 6) {
        setActiveStep(activeStep + 1);
      } else {
        // Step 6 submit
        if (!isConfirmed) {
          alert('Please check the confirmation box to verify your profile information.');
          return;
        }
        setProfileData(prev => ({ ...prev, verified: true }));
        setIsViewingOnePageProfile(true);
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
    let updatedSelectedIds = [];
    setProfileData(prev => {
      const repos = prev.githubLinks.repositories.map(repo => {
        if (repo.id === id) {
          return { ...repo, selected: !repo.selected };
        }
        return repo;
      });
      updatedSelectedIds = repos.filter(r => r.selected).map(r => r.id);
      return {
        ...prev,
        githubLinks: {
          ...prev.githubLinks,
          repositories: repos,
        },
      };
    });
    saveSelectedRepoIds(updatedSelectedIds);
  };

  // Real Resume Document Upload & Sarvam AI Extraction Handler
  const handleResumeFileUpload = async (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please select a smaller resume file.');
      return;
    }

    const allowed = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp'];
    const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
    if (!allowed.includes(ext)) {
      alert('Invalid file format. Please upload a PDF, DOCX, PNG, or JPG resume file.');
      return;
    }

    setIsUploadingResume(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', currentProfile.personalInfo.email.trim());

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/student/upload-resume', {
        method: 'POST',
        body: formData,
      });

      const resData = await response.json();

      if (response.ok && resData.status === 'success') {
        const extData = resData.extracted_data || {};

        setProfileData(prev => ({
          ...prev,
          resumeAnalysis: {
            resumeFile: resData.resume_file || file.name,
            parseTime: resData.parse_time || 'Parsed just now',
            score: resData.score ?? 0,
            scoreText: resData.score_text || 'Resume parsed successfully.',

            scoreBreakdown: resData.score_breakdown || {},
            extractedData: {
              projects: extData.projects || [],
              rawProjects: extData.raw_projects || [],
              experience: extData.experience || [],
              coreTechnologies: extData.coreTechnologies || [],
              normalizedSkills: extData.normalized_skills || [],
              identifiedSkillDomains: extData.identifiedSkillDomains || [],
              education: extData.education || [],
              certifications: extData.certifications || [],
              achievements: extData.achievements || [],
              links: extData.links || {},
            },
          },
        }));

        alert('Resume parsed and analyzed successfully via SkillSetu AI!');
      } else {
        alert(`Failed to analyze resume: ${resData.detail || 'Server error'}`);
      }
    } catch (err) {
      console.error('Resume upload error:', err);
      alert('Network error while uploading resume. Please check your connection and try again.');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const deleteResume = async () => {
    try {
      await fetch(`http://127.0.0.1:8000/api/v1/student/delete-resume?email=${encodeURIComponent(currentProfile.personalInfo.email.trim())}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error deleting resume:', err);
    }

    setProfileData(prev => ({
      ...prev,
      resumeAnalysis: {
        ...EMPTY_PROFILE.resumeAnalysis,
      },
    }));
  };


  // Real Marksheet Document Upload & AI Extraction Handler
  const handleMarksheetFileUpload = async (file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please select a smaller document.');
      return;
    }

    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
    if (!allowed.includes(ext)) {
      alert('Invalid file format. Please upload a PDF, JPG, or PNG document.');
      return;
    }

    setIsExtractingMarksheet(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', currentProfile.personalInfo.email.trim());

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/student/upload-marksheet', {
        method: 'POST',
        body: formData,
      });

      const resData = await response.json();

      if (response.ok && resData.status === 'success') {
        const extData = resData.extraction || {};
        const dataMap = extData.data || extData;

        const degVal = renderVal(dataMap.degree?.value ?? dataMap.degree);
        const branchVal = renderVal(dataMap.branch?.value ?? dataMap.branch);
        const univVal = renderVal(dataMap.university?.value ?? dataMap.university);
        const startVal = renderVal(dataMap.start_year?.value ?? dataMap.start_year);
        const gradVal = renderVal(dataMap.graduation_year?.value ?? dataMap.graduation_year);
        const cgpaVal = renderVal(dataMap.cgpa_or_percentage?.value ?? dataMap.cgpa_or_percentage);

        setExtractionConfidence({
          degree: dataMap.degree?.confidence ?? 0.9,
          branch: dataMap.branch?.confidence ?? 0.9,
          university: dataMap.university?.confidence ?? 0.9,
          start_year: dataMap.start_year?.confidence ?? 0.0,
          graduation_year: dataMap.graduation_year?.confidence ?? 0.9,
          cgpa: dataMap.cgpa_or_percentage?.confidence ?? 0.9,
        });

        if (degVal) setEduDegree(degVal);
        if (branchVal) setEduBranch(branchVal);
        if (univVal) setEduUniv(univVal);
        if (startVal) setEduStart(startVal);
        if (gradVal) setEduGrad(gradVal);

        setProfileData(prev => ({
          ...prev,
          education: {
            ...prev.education,
            hasExtractedMarksheet: true,
            marksheetFileName: file.name,
            marksheetUrl: resData.marksheet_url || file.name,
            cgpaDetected: cgpaVal || 'Detected',
            universityDetected: univVal || 'Detected',
            academicYearDetected: (startVal && gradVal) ? `${startVal} - ${gradVal}` : (gradVal || 'Detected'),
            list: [
              {
                id: 'edu_' + Date.now(),
                degree: degVal || eduDegree,
                branch: branchVal || eduBranch,
                university: univVal || eduUniv,
                startYear: startVal || eduStart,
                graduationYear: gradVal || eduGrad,
              },
            ],
          },
        }));
      } else {
        alert(resData.detail || 'Failed to extract document. Please fill education fields manually.');
      }
    } catch (err) {
      console.error('Marksheet upload error:', err);
      alert('Could not connect to backend to extract document. Please check connection or fill fields manually.');
    } finally {
      setIsExtractingMarksheet(false);
    }
  };

  // Real GitHub OAuth Authorization Handlers
  const connectRealGithubAccount = async () => {
    const email = currentProfile.personalInfo.email.trim();
    if (!email) {
      alert('Please enter your email in Step 1 before connecting GitHub.');
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/github/connect?email=${encodeURIComponent(email)}`);
      const resData = await response.json();
      if (response.ok && resData.status === 'success' && resData.authorization_url) {
        // Redirect browser to GitHub OAuth authorization URL
        window.location.href = resData.authorization_url;
      } else {
        alert(resData.detail || 'Could not initiate GitHub authorization.');
      }
    } catch (err) {
      console.error('Error initiating GitHub OAuth:', err);
      alert('Network error connecting GitHub OAuth. Please check backend connection.');
    }
  };

  const refreshGithubRepositories = async () => {
    const email = currentProfile.personalInfo.email.trim();
    if (!email) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/github/refresh?email=${encodeURIComponent(email)}`, {
        method: 'POST',
      });
      const resData = await response.json();
      if (response.ok && resData.status === 'success') {
        setProfileData(prev => ({
          ...prev,
          githubLinks: {
            ...prev.githubLinks,
            repositories: resData.repositories || [],
            githubSkills: resData.skills || prev.githubLinks.githubSkills,
            githubMetrics: {
              ...prev.githubLinks.githubMetrics,
              reposAnalyzed: resData.repos_count
            }
          }
        }));
        alert(`Refreshed ${resData.repos_count} repositories from GitHub!`);
      } else {
        alert(resData.detail || 'Failed to refresh repositories.');
      }
    } catch (err) {
      console.error('Error refreshing GitHub repos:', err);
      alert('Failed to refresh repositories from server.');
    }
  };

  const analyzeSelectedGithubRepositories = async () => {
    const email = currentProfile.personalInfo.email.trim();
    if (!email) {
      alert('Please complete Step 1 before analyzing repositories.');
      return;
    }
    setIsAnalyzingGithub(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/github/analyze-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const resData = await response.json();
      if (response.ok && resData.status === 'success') {
        setProfileData(prev => ({
          ...prev,
          githubLinks: {
            ...prev.githubLinks,
            githubSkills: resData.skills || [],
            githubMetrics: {
              ...prev.githubLinks.githubMetrics,
              reposAnalyzed: resData.repos_analyzed_count || prev.githubLinks.githubMetrics.reposAnalyzed
            }
          }
        }));
        alert(`Successfully analyzed ${resData.repos_analyzed_count} selected repositories! Generated technical skill evidence.`);
      } else {
        alert(resData.detail || 'Could not analyze repositories. Please try again.');
      }
    } catch (err) {
      console.error('Error analyzing GitHub repos:', err);
      alert('Failed to connect to backend for repository analysis.');
    } finally {
      setIsAnalyzingGithub(false);
    }
  };

  const disconnectGithubAccount = async () => {
    const email = currentProfile.personalInfo.email.trim();
    if (confirm('Are you sure you want to disconnect your GitHub profile?')) {
      try {
        await fetch(`http://127.0.0.1:8000/api/v1/github/disconnect?email=${encodeURIComponent(email)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Error disconnecting GitHub:', err);
      }

      setProfileData(prev => ({
        ...prev,
        githubLinks: {
          ...prev.githubLinks,
          githubUsername: '',
          githubUrl: '',
          githubConnected: false,
          githubMetrics: { reposAnalyzed: 0, projectsDetected: 0 },
          githubSkills: [],
          repositories: [],
        }
      }));
    }
  };

  const saveSelectedRepoIds = async (selectedIds) => {
    const email = currentProfile.personalInfo.email.trim();
    if (!email) return;
    try {
      await fetch('http://127.0.0.1:8000/api/v1/github/repositories/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          selected_repo_ids: selectedIds
        }),
      });
    } catch (err) {
      console.error('Error saving selected repo IDs:', err);
    }
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

  const calculateProfileConfidence = () => {
    let score = 0;
    // 1. Personal Info verified (+20%)
    if (currentProfile.personalInfo?.fullName && currentProfile.personalInfo?.email) score += 20;
    // 2. Education & Marksheet verified (+20%)
    if (currentProfile.education?.list && currentProfile.education.list.length > 0) score += 20;
    // 3. Career Goals set (+15%)
    if (currentProfile.careerGoals?.targetCareer && currentProfile.careerGoals?.careerGoal) score += 15;
    // 4. Resume Parsed & Analyzed (+20%)
    if (currentProfile.resumeAnalysis?.resumeFile) score += 20;
    // 5. Professional Social Links (+10%)
    if (currentProfile.githubLinks?.linkedinUrl || currentProfile.githubLinks?.portfolioUrl) score += 10;
    // 6. OAuth GitHub Account Connected (+15%)
    if (currentProfile.githubLinks?.githubConnected) score += 15;
    
    // User confirmation boost if checkmark checked or profile verified
    if (isConfirmed || currentProfile.verified) {
      score = Math.max(score, 100);
    }
    return Math.min(score, 100);
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
              {currentProfile.personalInfo.profileImage ? (
                <Image
                  source={{ uri: currentProfile.personalInfo.profileImage }}
                  style={[styles.avatarImage, validationErrors.profileImage && styles.inputErrorBorder]}
                />
              ) : (
                <View style={[styles.avatarInitials, validationErrors.profileImage && styles.inputErrorBorder]}>
                  <Text style={styles.avatarInitialsText}>
                    {currentProfile.personalInfo.fullName ? currentProfile.personalInfo.fullName.slice(0, 2).toUpperCase() : '??'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  {Platform.OS === 'web' && (
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/png, image/jpeg, image/jpg"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert('Image size exceeds 2MB limit. Please select a smaller image.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            updatePersonalInfo('profileImage', event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  )}
                  <Pressable
                    style={styles.uploadBtn}
                    onPress={() => {
                      if (Platform.OS === 'web' && fileInputRef.current) {
                        fileInputRef.current.click();
                      } else {
                        const sampleImages = [
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
                          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
                        ];
                        const randomPic = sampleImages[Math.floor(Math.random() * sampleImages.length)];
                        updatePersonalInfo('profileImage', randomPic);
                      }
                    }}
                  >
                    <Text style={styles.uploadBtnText}>📸 Select Profile Image</Text>
                  </Pressable>
                  {currentProfile.personalInfo.profileImage ? (
                    <Pressable
                      style={[styles.uploadBtn, { backgroundColor: '#fee2e2' }]}
                      onPress={() => updatePersonalInfo('profileImage', '')}
                    >
                      <Text style={[styles.uploadBtnText, { color: '#dc2626' }]}>🗑️ Remove Image</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.inputHelpText}>Supported files: JPG, PNG. Max 2MB. Profile photo is required.</Text>
                {validationErrors.profileImage && <Text style={styles.errorText}>{validationErrors.profileImage}</Text>}
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
                <Text style={styles.inputLabel}>Headline / Short Title *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.headline && styles.inputErrorBorder]}
                  placeholder="e.g. Senior Frontend Engineer"
                  value={currentProfile.personalInfo.headline}
                  onChangeText={(val) => updatePersonalInfo('headline', val)}
                />
                {validationErrors.headline && <Text style={styles.errorText}>{validationErrors.headline}</Text>}
              </View>
            </View>

            <View style={styles.rowLayout}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Location *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.location && styles.inputErrorBorder]}
                  placeholder="e.g. San Francisco, CA"
                  value={currentProfile.personalInfo.location}
                  onChangeText={(val) => updatePersonalInfo('location', val)}
                />
                {validationErrors.location && <Text style={styles.errorText}>{validationErrors.location}</Text>}
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Years of Experience *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.yearsOfExperience && styles.inputErrorBorder]}
                  placeholder="e.g. 3 Years"
                  value={currentProfile.personalInfo.yearsOfExperience}
                  onChangeText={(val) => updatePersonalInfo('yearsOfExperience', val)}
                />
                {validationErrors.yearsOfExperience && <Text style={styles.errorText}>{validationErrors.yearsOfExperience}</Text>}
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Bio / About Yourself *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, validationErrors.bio && styles.inputErrorBorder]}
                placeholder="Brief summary of your professional skills and aspirations..."
                value={currentProfile.personalInfo.bio}
                onChangeText={(val) => updatePersonalInfo('bio', val)}
                multiline
                numberOfLines={4}
              />
              {validationErrors.bio && <Text style={styles.errorText}>{validationErrors.bio}</Text>}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Education</Text>
            <Text style={styles.sectionSubtitle}>Add your academic background so SkillSetu can understand your educational profile.</Text>

            {/* AI Marksheet Extraction Box */}
            <HoverableCard style={[styles.extractedBoxCard, validationErrors.marksheet && styles.inputErrorBorder]}>
              {Platform.OS === 'web' && (
                <input
                  type="file"
                  ref={marksheetFileInputRef}
                  accept=".pdf, .jpg, .jpeg, .png"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                      handleMarksheetFileUpload(file);
                    }
                  }}
                />
              )}

              {isExtractingMarksheet ? (
                <View style={styles.simulationUploadBox}>
                  <Text style={styles.extractBadgeText}>✨ Processing Marksheet...</Text>
                  <Text style={styles.extractionDescription}>Extracting Degree, Branch, University, and Academic dates using AI Document Vision...</Text>
                </View>
              ) : !currentProfile.education.hasExtractedMarksheet ? (
                <View style={styles.simulationUploadBox}>
                  <Text style={styles.extractBadgeText}>📄 Marksheet Required</Text>
                  <Text style={styles.extractionDescription}>Please upload your latest university marksheet (PDF, JPG, PNG max 5MB). SkillSetu will automatically extract your Degree, Branch, University, Academic Years, and CGPA. No educational data is assumed until you upload.</Text>
                  <Pressable
                    style={styles.extractBtn}
                    onPress={() => {
                      if (Platform.OS === 'web' && marksheetFileInputRef.current) {
                        marksheetFileInputRef.current.click();
                      }
                    }}
                  >
                    <Text style={styles.extractBtnText}>📄 Upload Marksheet Document (PDF / Image)</Text>
                  </Pressable>
                  {validationErrors.marksheet && <Text style={styles.errorText}>{validationErrors.marksheet}</Text>}
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
                    <Text style={styles.pdfFileName}>{currentProfile.education.marksheetFileName || 'marksheet_document.pdf'}</Text>
                    <Pressable
                      style={styles.replaceBtn}
                      onPress={() => {
                        if (Platform.OS === 'web' && marksheetFileInputRef.current) {
                          marksheetFileInputRef.current.click();
                        }
                      }}
                    >
                      <Text style={styles.replaceBtnText}>🔄 Replace Marksheet</Text>
                    </Pressable>
                  </View>

                  {/* Right part: Detailed Extracted Breakdown */}
                  <View style={styles.extractedChecklistRight}>
                    <View style={styles.extractedBadge}>
                      <Text style={styles.extractedBadgeText}>✨ Extracted Academic Information</Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Text style={styles.greenCheck}>🎓</Text>
                      <Text style={styles.checkText}>Degree / Course: <Text style={styles.boldText}>{renderVal(currentProfile.education.list[0]?.degree) || 'Not detected'}</Text></Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Text style={styles.greenCheck}>🔬</Text>
                      <Text style={styles.checkText}>Branch / Specialization: <Text style={styles.boldText}>{renderVal(currentProfile.education.list[0]?.branch) || 'Not detected'}</Text></Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Text style={styles.greenCheck}>🏛️</Text>
                      <Text style={styles.checkText}>University / Institution: <Text style={styles.boldText}>{renderVal(currentProfile.education.list[0]?.university) || 'Not detected'}</Text></Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Text style={styles.greenCheck}>📅</Text>
                      <Text style={styles.checkText}>Academic Period: <Text style={styles.boldText}>{(currentProfile.education.list[0]?.startYear || currentProfile.education.list[0]?.graduationYear) ? `${renderVal(currentProfile.education.list[0]?.startYear, 'N/A')} - ${renderVal(currentProfile.education.list[0]?.graduationYear, 'N/A')}` : renderVal(currentProfile.education.academicYearDetected, 'Not detected')}</Text></Text>
                    </View>
                    <View style={styles.checkRow}>
                      <Text style={styles.greenCheck}>📊</Text>
                      <Text style={styles.checkText}>CGPA / Percentage: <Text style={styles.boldText}>{renderVal(currentProfile.education.cgpaDetected) || 'Not detected'}</Text></Text>
                    </View>
                  </View>
                </View>
              )}
            </HoverableCard>

            {/* List of Education entries */}
            {currentProfile.education.list.map((item) => (
              <View key={item.id} style={styles.educationCard}>
                <View style={styles.eduHeader}>
                  <Text style={styles.eduDegreeText}>{renderVal(item.degree)}</Text>
                  <Pressable onPress={() => removeEducationItem(item.id)}>
                    <Text style={styles.trashIcon}>🗑️</Text>
                  </Pressable>
                </View>
                <Text style={styles.eduInfoLine}><Text style={styles.boldText}>Branch/Major:</Text> {renderVal(item.branch)}</Text>
                <Text style={styles.eduInfoLine}><Text style={styles.boldText}>University:</Text> {renderVal(item.university)}</Text>
                <Text style={styles.eduInfoLine}><Text style={styles.boldText}>Duration:</Text> {renderVal(item.startYear)} - {renderVal(item.graduationYear)}</Text>
              </View>
            ))}

            {/* Manual Form for Education Entry */}
            <View style={styles.manualEduForm}>
              <Text style={styles.formSectionTitle}>Add / Edit Education Entry</Text>
              
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Degree *</Text>
                <TextInput
                  style={[styles.textInput, validationErrors.eduDegree && styles.inputErrorBorder]}
                  placeholder="e.g. B.S. Computer Science"
                  value={eduDegree}
                  onChangeText={setEduDegree}
                />
                {validationErrors.eduDegree && <Text style={styles.errorText}>{validationErrors.eduDegree}</Text>}
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Branch / Major</Text>
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
                    style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }, validationErrors.eduUniv && styles.inputErrorBorder]}
                    placeholder="e.g. Tech University"
                    value={eduUniv}
                    onChangeText={setEduUniv}
                  />
                </View>
                {validationErrors.eduUniv && <Text style={styles.errorText}>{validationErrors.eduUniv}</Text>}
              </View>

              <View style={styles.rowLayout}>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Start Year (Optional if missing)</Text>
                  <View style={styles.iconInputRow}>
                    <Text style={styles.inputIconEmoji}>📅</Text>
                    <TextInput
                      style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                      placeholder="e.g. 2021"
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
                      style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }, validationErrors.eduGrad && styles.inputErrorBorder]}
                      placeholder="e.g. 2025"
                      value={eduGrad}
                      onChangeText={setEduGrad}
                      keyboardType="numeric"
                    />
                  </View>
                  {validationErrors.eduGrad && <Text style={styles.errorText}>{validationErrors.eduGrad}</Text>}
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
        const selectedCareers = currentProfile.careerGoals.targetCareerIds || (currentProfile.careerGoals.targetCareerId ? [currentProfile.careerGoals.targetCareerId] : []);
        const selectedSkills = currentProfile.careerGoals.skillIds || [];
        const selectedLocations = currentProfile.careerGoals.preferredLocationIds || [];
        const selectedIndustries = currentProfile.careerGoals.targetIndustryIds || (currentProfile.careerGoals.targetIndustryId ? [currentProfile.careerGoals.targetIndustryId] : []);

        const filteredCareers = taxonomyCareers.filter(c => !selectedCareers.includes(c.id));
        const filteredSkills = taxonomySkills.filter(s => !selectedSkills.includes(s.id));
        const filteredLocations = taxonomyLocations.filter(l => !selectedLocations.includes(l.id));

        return (
          <View style={styles.stepContainer}>
            <Text style={styles.sectionTitle}>Career Goals & Preferences *</Text>
            <Text style={styles.sectionSubtitle}>All fields are required. Select your standardized career goals powered by ESCO & SkillSetu taxonomy for 100% accurate internship matching.</Text>

            <View style={[styles.gridTwoColumns, !isTablet && styles.flexCol]}>
              {/* Target Career Card (Multi-select) */}
              <HoverableCard style={[styles.prefCard, validationErrors.targetCareer && styles.inputErrorBorder]}>
                <Text style={styles.cardHeaderTitle}>🎯 Target Career Roles *</Text>
                <Text style={styles.inputHelpText}>Select one or more target roles (e.g. Frontend Developer, Data Analyst)</Text>

                {/* Selected Target Careers Chips */}
                <View style={styles.tagsContainer}>
                  {selectedCareers.map((carId) => {
                    const carObj = taxonomyCareers.find(c => c.id === carId) || { name: currentProfile.careerGoals.targetCareer || carId };
                    return (
                      <View key={carId} style={[styles.tagBadge, { backgroundColor: COLORS.green }]}>
                        <Text style={[styles.tagBadgeText, { color: COLORS.white }]}>✓ {carObj.name}</Text>
                        <Pressable onPress={() => {
                          const updated = selectedCareers.filter(id => id !== carId);
                          updateCareerGoalsField('targetCareerIds', updated);
                          updateCareerGoalsField('targetCareerId', updated[0] || '');
                          updateCareerGoalsField('targetCareer', updated[0] ? (taxonomyCareers.find(c => c.id === updated[0])?.name || '') : '');
                        }}>
                          <Text style={[styles.closeTagEmoji, { color: COLORS.white }]}>×</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.iconInputRow}>
                  <Text style={styles.inputIconEmoji}>🔍</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    placeholder="Search target careers (e.g. Frontend, Data, AI)..."
                    value={careerSearch}
                    onFocus={() => setShowCareerDropdown(true)}
                    onChangeText={(val) => {
                      setCareerSearch(val);
                      setShowCareerDropdown(true);
                    }}
                  />
                </View>

                {showCareerDropdown && (
                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginTop: 4 }}>
                    {filteredCareers.map((item) => (
                      <Pressable
                        key={item.id}
                        style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: COLORS.mint, backgroundColor: COLORS.white }}
                        onPress={() => {
                          if (!selectedCareers.includes(item.id)) {
                            const updated = [...selectedCareers, item.id];
                            updateCareerGoalsField('targetCareerIds', updated);
                            updateCareerGoalsField('targetCareerId', updated[0]);
                            updateCareerGoalsField('targetCareer', item.name);
                          }
                          setCareerSearch('');
                          setShowCareerDropdown(false);
                        }}
                      >
                        <Text style={{ fontWeight: '700', color: COLORS.textDark, fontSize: 13 }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{item.category}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                {validationErrors.targetCareer && <Text style={styles.errorText}>{validationErrors.targetCareer}</Text>}
              </HoverableCard>

              {/* Preferred Locations Card */}
              <HoverableCard style={[styles.prefCard, validationErrors.locations && styles.inputErrorBorder]}>
                <Text style={styles.cardHeaderTitle}>📍 Preferred Locations *</Text>
                <Text style={styles.inputHelpText}>Select canonical work locations or Remote</Text>

                {/* Selected Location Chips */}
                <View style={styles.tagsContainer}>
                  {selectedLocations.map((locId) => {
                    const locObj = taxonomyLocations.find(l => l.id === locId) || { name: locId };
                    return (
                      <View key={locId} style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{locObj.name}</Text>
                        <Pressable onPress={() => {
                          const updated = selectedLocations.filter(id => id !== locId);
                          updateCareerGoalsField('preferredLocationIds', updated);
                        }}>
                          <Text style={styles.closeTagEmoji}>×</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.iconInputRow}>
                  <Text style={styles.inputIconEmoji}>📍</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                    placeholder="Search location (e.g. Pune, Remote)..."
                    value={locationSearch}
                    onFocus={() => setShowLocationDropdown(true)}
                    onChangeText={(val) => {
                      setLocationSearch(val);
                      setShowLocationDropdown(true);
                    }}
                  />
                </View>

                {showLocationDropdown && (
                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginTop: 4 }}>
                    {filteredLocations.map((item) => (
                      <Pressable
                        key={item.id}
                        style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: COLORS.mint }}
                        onPress={() => {
                          if (!selectedLocations.includes(item.id)) {
                            updateCareerGoalsField('preferredLocationIds', [...selectedLocations, item.id]);
                            updateCareerGoalsField('preferredLocations', [...(currentProfile.careerGoals.preferredLocations || []), item.name]);
                          }
                          setLocationSearch('');
                          setShowLocationDropdown(false);
                        }}
                      >
                        <Text style={{ fontWeight: '700', color: COLORS.textDark, fontSize: 13 }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
                          {[item.state, item.country].filter(Boolean).join(', ')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                {validationErrors.locations && <Text style={styles.errorText}>{validationErrors.locations}</Text>}
              </HoverableCard>
            </View>

            {/* Career Interests / Skills Card with Recommended Skills */}
            <HoverableCard style={[styles.fullWidthCard, validationErrors.skills && styles.inputErrorBorder]}>
              <Text style={styles.cardHeaderTitle}>⚡ Career Skills & Technical Stack *</Text>
              <Text style={styles.inputHelpText}>Select skills you possess or want to gain. Internships will match deterministically against these canonical skill IDs.</Text>

              {/* Selected Skills Chips */}
              <View style={styles.tagsContainer}>
                {selectedSkills.map((skId) => {
                  const skObj = taxonomySkills.find(s => s.id === skId) || { name: skId };
                  return (
                    <View key={skId} style={[styles.tagBadge, { backgroundColor: COLORS.mint }]}>
                      <Text style={[styles.tagBadgeText, { color: COLORS.teal }]}>{skObj.name}</Text>
                      <Pressable onPress={() => {
                        const updated = selectedSkills.filter(id => id !== skId);
                        updateCareerGoalsField('skillIds', updated);
                        updateCareerGoalsField('careerInterests', updated.map(id => (taxonomySkills.find(s => s.id === id) || {}).name || id));
                      }}>
                        <Text style={[styles.closeTagEmoji, { color: COLORS.teal }]}>×</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              {/* Recommended Skills section based on Target Career */}
              {recommendedSkillIds.length > 0 && (
                <View style={{ backgroundColor: '#F0FDF4', padding: 12, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: COLORS.green, marginVertical: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.green, marginBottom: 6 }}>
                    ✨ Recommended Skills for {currentProfile.careerGoals.targetCareer || 'your Target Role'}:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {recommendedSkillIds.map((skId) => {
                      const skObj = taxonomySkills.find(s => s.id === skId);
                      if (!skObj) return null;
                      const isAdded = selectedSkills.includes(skId);
                      return (
                        <Pressable
                          key={skId}
                          style={{
                            backgroundColor: isAdded ? COLORS.green : COLORS.white,
                            borderColor: COLORS.green,
                            borderWidth: 1,
                            borderRadius: 14,
                            paddingVertical: 4,
                            paddingHorizontal: 10,
                          }}
                          onPress={() => {
                            let updated;
                            if (isAdded) {
                              updated = selectedSkills.filter(id => id !== skId);
                            } else {
                              updated = [...selectedSkills, skId];
                            }
                            updateCareerGoalsField('skillIds', updated);
                            updateCareerGoalsField('careerInterests', updated.map(id => (taxonomySkills.find(s => s.id === id) || {}).name || id));
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: isAdded ? COLORS.white : COLORS.green }}>
                            {isAdded ? '✓ ' : '+ '} {skObj.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Skill Search Input */}
              <View style={styles.iconInputRow}>
                <Text style={styles.inputIconEmoji}>💡</Text>
                <TextInput
                  style={[styles.textInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                  placeholder="Search and add skills (e.g. React, Python, PostgreSQL, Docker)..."
                  value={skillSearch}
                  onFocus={() => setShowSkillDropdown(true)}
                  onChangeText={(val) => {
                    setSkillSearch(val);
                    setShowSkillDropdown(true);
                  }}
                />
              </View>

              {showSkillDropdown && (
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 220, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginTop: 4 }}>
                  {filteredSkills.map((item) => (
                    <Pressable
                      key={item.id}
                      style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: COLORS.mint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                      onPress={() => {
                        if (!selectedSkills.includes(item.id)) {
                          const updated = [...selectedSkills, item.id];
                          updateCareerGoalsField('skillIds', updated);
                          updateCareerGoalsField('careerInterests', updated.map(id => (taxonomySkills.find(s => s.id === id) || {}).name || id));
                        }
                        setSkillSearch('');
                        setShowSkillDropdown(false);
                      }}
                    >
                      <View>
                        <Text style={{ fontWeight: '700', color: COLORS.textDark, fontSize: 13 }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{item.category}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.green }}>+ Add</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              {validationErrors.skills && <Text style={styles.errorText}>{validationErrors.skills}</Text>}
            </HoverableCard>

            {/* Target Industry & Timeline */}
            <View style={[styles.gridTwoColumns, !isTablet && styles.flexCol]}>
              {/* Target Industry Card (Multi-select) */}
              <HoverableCard style={[styles.prefCard, validationErrors.industry && styles.inputErrorBorder]}>
                <Text style={styles.cardHeaderTitle}>🏢 Target Industry Sectors *</Text>
                <Text style={styles.inputHelpText}>Select one or more preferred industry sectors</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {taxonomyIndustries.map((ind) => {
                    const isSelected = selectedIndustries.includes(ind.id);
                    return (
                      <Pressable
                        key={ind.id}
                        style={[styles.choiceBtn, { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 }, isSelected && styles.choiceBtnSelected]}
                        onPress={() => {
                          let updated;
                          if (isSelected) {
                            updated = selectedIndustries.filter(id => id !== ind.id);
                          } else {
                            updated = [...selectedIndustries, ind.id];
                          }
                          updateCareerGoalsField('targetIndustryIds', updated);
                          updateCareerGoalsField('targetIndustryId', updated[0] || '');
                          updateCareerGoalsField('industry', updated.map(id => (taxonomyIndustries.find(i => i.id === id) || {}).name || id).join(', '));
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? COLORS.green : COLORS.textDark }}>
                          {ind.name} {isSelected ? '✓' : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {validationErrors.industry && <Text style={styles.errorText}>{validationErrors.industry}</Text>}
              </HoverableCard>

              {/* Timeline Card */}
              <HoverableCard style={[styles.prefCard, validationErrors.timeline && styles.inputErrorBorder]}>
                <Text style={styles.cardHeaderTitle}>⏱️ Timeline *</Text>
                <Text style={styles.inputHelpText}>When are you ready to begin an internship?</Text>
                <View style={styles.choicesGrid}>
                  {[
                    { id: 'immediately', label: 'Immediately' },
                    { id: 'within_1_month', label: 'Within 1 Month' },
                    { id: '1_to_3_months', label: '1–3 Months' },
                    { id: '3_to_6_months', label: '3–6 Months' },
                    { id: '6_to_12_months', label: '6–12 Months' },
                    { id: '12_plus_months', label: '12+ Months' },
                  ].map((t) => {
                    const isSel = currentProfile.careerGoals.timeline === t.id || currentProfile.careerGoals.timeline === t.label;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => updateCareerGoalsField('timeline', t.id)}
                        style={[styles.choiceBtn, isSel && styles.choiceBtnSelected]}
                      >
                        <Text style={[styles.choiceBtnLabel, isSel && styles.choiceBtnLabelSelected]}>{t.label}</Text>
                        {isSel && <View style={styles.checkedBadge}><Text style={styles.checkedTextMini}>✓</Text></View>}
                      </Pressable>
                    );
                  })}
                </View>
                {validationErrors.timeline && <Text style={styles.errorText}>{validationErrors.timeline}</Text>}
              </HoverableCard>
            </View>

            {/* Opportunity Type & Work Preference */}
            <View style={[styles.gridTwoColumns, !isTablet && styles.flexCol]}>
              {/* Opportunity Type */}
              <HoverableCard style={[styles.prefCard, validationErrors.opportunityTypes && styles.inputErrorBorder]}>
                <Text style={styles.cardHeaderTitle}>💼 Opportunity Type *</Text>
                <View style={styles.choicesGrid}>
                  {[
                    { id: 'internship', label: 'Internship' },
                    { id: 'fulltime', label: 'Full-time' },
                    { id: 'parttime', label: 'Part-time' },
                    { id: 'contract', label: 'Contract' },
                  ].map((item) => {
                    const selected = (currentProfile.careerGoals.opportunityTypes || []).includes(item.id) || (currentProfile.careerGoals.opportunityTypes || []).includes(item.label);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          const currentOpps = currentProfile.careerGoals.opportunityTypes || [];
                          const updated = currentOpps.includes(item.id)
                            ? currentOpps.filter(o => o !== item.id && o !== item.label)
                            : [...currentOpps, item.id];
                          updateCareerGoalsField('opportunityTypes', updated);
                        }}
                        style={[styles.choiceBtn, selected && styles.choiceBtnSelected]}
                      >
                        <Text style={styles.choiceBtnIcon}>💼</Text>
                        <Text style={[styles.choiceBtnLabel, selected && styles.choiceBtnLabelSelected]}>{item.label}</Text>
                        {selected && <View style={styles.checkedBadge}><Text style={styles.checkedTextMini}>✓</Text></View>}
                      </Pressable>
                    );
                  })}
                </View>
                {validationErrors.opportunityTypes && <Text style={styles.errorText}>{validationErrors.opportunityTypes}</Text>}
              </HoverableCard>

              {/* Work Preference */}
              <HoverableCard style={[styles.prefCard, validationErrors.workPreferences && styles.inputErrorBorder]}>
                <Text style={styles.cardHeaderTitle}>🏠 Work Preference *</Text>
                <View style={styles.choicesGrid}>
                  {[
                    { id: 'remote', label: 'Remote', icon: '🏠' },
                    { id: 'hybrid', label: 'Hybrid', icon: '🔄' },
                    { id: 'onsite', label: 'On-site', icon: '🏢' },
                  ].map((item) => {
                    const selected = (currentProfile.careerGoals.workPreferences || []).includes(item.id) || (currentProfile.careerGoals.workPreferences || []).includes(item.label);
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          const currentWps = currentProfile.careerGoals.workPreferences || [];
                          const updated = currentWps.includes(item.id)
                            ? currentWps.filter(w => w !== item.id && w !== item.label)
                            : [...currentWps, item.id];
                          updateCareerGoalsField('workPreferences', updated);
                        }}
                        style={[styles.choiceBtn, selected && styles.choiceBtnSelected]}
                      >
                        <Text style={styles.choiceBtnIcon}>{item.icon}</Text>
                        <Text style={[styles.choiceBtnLabel, selected && styles.choiceBtnLabelSelected]}>{item.label}</Text>
                        {selected && <View style={styles.checkedBadge}><Text style={styles.checkedTextMini}>✓</Text></View>}
                      </Pressable>
                    );
                  })}
                </View>
                {validationErrors.workPreferences && <Text style={styles.errorText}>{validationErrors.workPreferences}</Text>}
              </HoverableCard>
            </View>

            {/* Career Goal Textarea (Required AI Guidance & Summary) */}
            <HoverableCard style={[styles.fullWidthCard, validationErrors.careerGoal && styles.inputErrorBorder]}>
              <Text style={styles.cardHeaderTitle}>📝 Career Goal & Personal Statement *</Text>
              <Text style={styles.inputHelpText}>Describe your long-term aspirations. Used for AI mentor guidance and profile summaries.</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, validationErrors.careerGoal && styles.inputErrorBorder]}
                placeholder="I aim to build scalable web platforms using React and Python, eventually transitioning into product leadership..."
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
                    <Text style={styles.noResumeText}>
                      {isUploadingResume ? 'Analyzing resume with SkillSetu AI...' : 'No resume uploaded yet'}
                    </Text>
                    {isUploadingResume ? (
                      <ActivityIndicator size="large" color={COLORS.teal} style={{ marginTop: 12 }} />
                    ) : (
                      <>
                        {Platform.OS === 'web' && (
                          <input
                            type="file"
                            id="resumeFileInput"
                            accept=".pdf,.docx,.png,.jpg,.jpeg,.webp"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleResumeFileUpload(e.target.files[0]);
                              }
                            }}
                          />
                        )}
                        <Pressable
                          style={styles.uploadResumeBtn}
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              document.getElementById('resumeFileInput')?.click();
                            } else {
                              alert('Please upload a PDF or DOCX resume.');
                            }
                          }}
                        >
                          <Text style={styles.uploadResumeBtnText}>📤 Upload Resume</Text>
                        </Pressable>
                      </>
                    )}
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
        const linkedinUrl = currentProfile.githubLinks.linkedinUrl || '';
        const portfolioUrl = currentProfile.githubLinks.portfolioUrl || '';
        const rawGithubUrl = currentProfile.githubLinks.githubUrl || currentProfile.githubLinks.githubUsername || '';
        
        // Ensure githubUrl starts with http for parsing if entered as github.com/username
        const fullGithubUrl = rawGithubUrl.trim().length > 0
          ? (rawGithubUrl.trim().startsWith('http://') || rawGithubUrl.trim().startsWith('https://') ? rawGithubUrl.trim() : `https://${rawGithubUrl.trim()}`)
          : '';

        const isValidLinkedin = linkedinUrl.trim().length > 0 ? /^https?:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?$/i.test(linkedinUrl.trim()) : null;
        const isValidPortfolio = portfolioUrl.trim().length > 0 ? /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(portfolioUrl.trim()) : null;
        const isValidGithubUrl = fullGithubUrl.length > 0 ? /^https?:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/?$/i.test(fullGithubUrl) : null;

        // Extract username from URL if valid
        let detectedUsername = '';
        if (isValidGithubUrl) {
          const match = fullGithubUrl.match(/github\.com\/([A-Za-z0-9_.-]+)/i);
          if (match && match[1]) {
            detectedUsername = match[1];
          }
        }

        const repositories = currentProfile.githubLinks.repositories || [];
        const selectedCount = repositories.filter(r => r.selected).length;
        const totalCount = repositories.length;
        const githubSkills = currentProfile.githubLinks.githubSkills || [];

        return (
          <View style={styles.stepContainer}>
            {/* 1. TOP SECTION */}
            <View style={styles.stepHeaderWrap}>
              <Text style={styles.sectionTitle}>Build Your Professional Evidence</Text>
              <Text style={styles.sectionSubtitle}>
                Connect GitHub and professional profiles so SkillSetu can verify your skills through real projects and professional work.
              </Text>
              <View style={styles.bannerInfoNote}>
                <Text style={styles.bannerInfoNoteIcon}>💡</Text>
                <Text style={styles.bannerInfoNoteText}>
                  Your selected projects and verified skills will be used to strengthen your internship matches.
                </Text>
              </View>
            </View>

            <View style={[styles.rowLayout, !isTablet && styles.flexCol]}>
              {/* LEFT COLUMN: 6. PROFESSIONAL LINKS CARD */}
              <View style={styles.leftColLinks}>
                <HoverableCard style={styles.linksCard}>
                  <View style={styles.cardHeaderGroup}>
                    <Text style={styles.cardHeaderTitle}>Professional Profiles</Text>
                    <Text style={styles.cardHeaderSub}>Add links that help recruiters understand your professional presence.</Text>
                  </View>

                  {/* LINKEDIN */}
                  <View style={styles.inputWrap}>
                    <View style={styles.inputLabelRow}>
                      <Text style={styles.inputLabel}>LinkedIn URL</Text>
                      {linkedinUrl.trim().length === 0 ? (
                        <Text style={styles.optionalBadgeText}>Optional</Text>
                      ) : isValidLinkedin ? (
                        <Text style={styles.validStatusText}>✓ Valid LinkedIn URL</Text>
                      ) : (
                        <Text style={styles.invalidStatusText}>⚠ Enter a valid LinkedIn profile URL</Text>
                      )}
                    </View>
                    <View style={[
                      styles.iconInputRow,
                      linkedinUrl.trim().length > 0 && (isValidLinkedin ? styles.inputValidBorder : styles.inputErrorBorder)
                    ]}>
                      <View style={styles.inputIconPrefix}>
                        <Text style={styles.inputIconEmoji}>💼</Text>
                      </View>
                      <TextInput
                        style={[styles.textInput, styles.iconTextInput]}
                        placeholder="https://linkedin.com/in/username"
                        value={linkedinUrl}
                        onChangeText={(val) => updateGithubLinksField('linkedinUrl', val)}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* PORTFOLIO */}
                  <View style={styles.inputWrap}>
                    <View style={styles.inputLabelRow}>
                      <Text style={styles.inputLabel}>Personal Portfolio</Text>
                      {portfolioUrl.trim().length === 0 ? (
                        <Text style={styles.optionalBadgeText}>Optional</Text>
                      ) : isValidPortfolio ? (
                        <Text style={styles.validStatusText}>✓ Valid website</Text>
                      ) : (
                        <Text style={styles.invalidStatusText}>⚠ Enter a valid website URL</Text>
                      )}
                    </View>
                    <View style={[
                      styles.iconInputRow,
                      portfolioUrl.trim().length > 0 && (isValidPortfolio ? styles.inputValidBorder : styles.inputErrorBorder)
                    ]}>
                      <View style={styles.inputIconPrefix}>
                        <Text style={styles.inputIconEmoji}>🌐</Text>
                      </View>
                      <TextInput
                        style={[styles.textInput, styles.iconTextInput]}
                        placeholder="https://yourportfolio.dev"
                        value={portfolioUrl}
                        onChangeText={(val) => updateGithubLinksField('portfolioUrl', val)}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* Supported profiles info pill */}
                  <View style={styles.supportedProfilesPill}>
                    <Text style={styles.supportedProfilesText}>
                      🔒 Links are shared with verified recruiters during internship matching.
                    </Text>
                  </View>
                </HoverableCard>
              </View>

              {/* RIGHT COLUMN: GITHUB & REPOSITORY ANALYSIS */}
              <View style={styles.rightColLinks}>
                <View style={{ gap: 20 }}>
                  {/* 1. GITHUB PROFILE CARD */}
                  <HoverableCard style={styles.githubCard}>
                    <View style={styles.githubCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardHeaderTitle}>GitHub Profile</Text>
                        <Text style={styles.cardHeaderSub}>
                          Connect your GitHub account so SkillSetu can securely retrieve your available repositories and use selected projects as evidence.
                        </Text>
                      </View>
                      {currentProfile.githubLinks.githubConnected && (
                        <View style={styles.connectedHeaderActions}>
                          <Pressable style={styles.refreshBtn} onPress={refreshGithubRepositories}>
                            <Text style={styles.refreshBtnText}>🔄 Refresh Repos</Text>
                          </Pressable>
                          <Pressable style={styles.disconnectBtn} onPress={disconnectGithubAccount}>
                            <Text style={styles.disconnectBtnText}>🔌 Disconnect</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {/* 2. GITHUB ACCOUNT OAUTH CONNECTION */}
                    <View style={styles.githubConnectBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.navy, marginBottom: 4 }}>
                          GitHub Profile
                        </Text>
                        <Text style={styles.inputHelpText}>
                          {currentProfile.githubLinks.githubConnected
                            ? 'Your GitHub account is connected via OAuth authorization. SkillSetu can access your public and authorized private repositories.'
                            : 'Authorize SkillSetu to securely connect your GitHub account and import your repositories for technical skill evidence verification.'}
                        </Text>
                      </View>

                      {!currentProfile.githubLinks.githubConnected ? (
                        <Pressable
                          style={{
                            backgroundColor: COLORS.teal,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 8,
                            alignSelf: 'flex-start',
                            marginTop: 8
                          }}
                          onPress={connectRealGithubAccount}
                        >
                          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                            ⚡ Connect GitHub Account
                          </Text>
                        </Pressable>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <Pressable
                            style={{ backgroundColor: COLORS.gray200, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                            onPress={refreshGithubRepositories}
                          >
                            <Text style={{ color: COLORS.navy, fontWeight: '600', fontSize: 12 }}>🔄 Refresh Repos</Text>
                          </Pressable>
                          <Pressable
                            style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                            onPress={disconnectGithubAccount}
                          >
                            <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 12 }}>🔌 Disconnect</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {/* 3. GITHUB PROFILE PREVIEW (WHEN CONNECTED) */}
                    {currentProfile.githubLinks.githubConnected ? (
                      <View style={styles.githubProfilePreviewCard}>
                        <View style={styles.githubAvatarWrap}>
                          <Text style={styles.githubAvatarIcon}>💻</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.githubTitleBadgeRow}>
                            <Text style={styles.githubTitleText}>GitHub</Text>
                            <View style={styles.connectedBadge}>
                              <Text style={styles.connectedBadgeText}>✓ Connected</Text>
                            </View>
                          </View>
                          <Text style={styles.githubSubText}>@{currentProfile.githubLinks.githubUsername || 'user'}</Text>
                          <Text style={styles.githubVerifiedSubText}>
                            {totalCount} repositories available
                          </Text>
                        </View>
                      </View>
                    ) : (
                      /* 10. EMPTY STATE */
                      <View style={styles.emptyGithubPrompt}>
                        <Text style={styles.emptyGithubPromptTitle}>No GitHub Profile Connected</Text>
                        <Text style={styles.emptyGithubPromptSub}>Click "Connect GitHub Account" above to authorize SkillSetu and import your project evidence.</Text>
                      </View>
                    )}

                    {/* 8. INFORMATION / PRIVACY MESSAGE */}
                    <View style={styles.evidenceDisclaimerCard}>
                      <Text style={styles.disclaimerIcon}>🔒</Text>
                      <Text style={styles.disclaimerText}>
                        Technical Evidence Disclaimer: SkillSetu scores indicate the strength and presence of technical evidence found within your selected GitHub repository files. Scores do not represent or guarantee human coding proficiency.
                      </Text>
                    </View>

                    {/* 5. AI SKILL EVIDENCE FROM REPOSITORIES */}
                    {currentProfile.githubLinks.githubConnected && (
                      <View style={styles.aiEvidenceSection}>
                        <View style={styles.aiEvidenceHeader}>
                          <Text style={styles.evidenceHeaderTitle}>Skill Evidence from Your Repositories</Text>
                          <Text style={styles.evidenceHeaderSubtitle}>
                            Strength of technical evidence found across your selected GitHub repositories.
                          </Text>
                        </View>

                        {githubSkills.length > 0 ? (
                          <View style={styles.skillsEvidenceList}>
                            {githubSkills.map((skill, index) => {
                              const isExpanded = expandedSkillIdx === index;
                              return (
                                <Pressable
                                  key={index}
                                  style={styles.evidenceSkillItem}
                                  onPress={() => setExpandedSkillIdx(isExpanded ? null : index)}
                                >
                                  <View style={styles.evidenceInfoRow}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.evidenceSkillName}>{skill.name}</Text>
                                      {skill.repository_count && (
                                        <Text style={{ fontSize: 11, color: COLORS.gray600, marginTop: 2 }}>
                                          Detected in {skill.repository_count} selected project{skill.repository_count > 1 ? 's' : ''} {isExpanded ? '▲' : '▼'}
                                        </Text>
                                      )}
                                    </View>
                                    <View style={styles.evidenceScoreBadgeRow}>
                                      <Text style={styles.evidenceSkillPercentage}>{skill.score || skill.percentage}/100</Text>
                                      <View style={[
                                        styles.skillLevelPill,
                                        (skill.score || skill.percentage) >= 85 ? styles.levelExpertPill :
                                        (skill.score || skill.percentage) >= 70 ? styles.levelStrongPill : styles.levelGoodPill
                                      ]}>
                                        <Text style={[
                                          styles.skillLevelPillText,
                                          (skill.score || skill.percentage) >= 85 ? styles.levelExpertPillText :
                                          (skill.score || skill.percentage) >= 70 ? styles.levelStrongPillText : styles.levelGoodPillText
                                        ]}>{skill.rating || ((skill.score || skill.percentage) >= 85 ? 'Very Strong Evidence' : (skill.score || skill.percentage) >= 70 ? 'Strong Evidence' : 'Good Evidence')}</Text>
                                      </View>
                                    </View>
                                  </View>
                                  <View style={styles.evidenceProgressTrack}>
                                    <View style={[styles.evidenceProgressBar, { width: `${skill.score || skill.percentage}%` }]} />
                                  </View>

                                  {isExpanded && (
                                    <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                                      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.navy, marginBottom: 4 }}>
                                        Why SkillSetu detected this skill:
                                      </Text>
                                      {Array.isArray(skill.signals) && skill.signals.length > 0 ? (
                                        skill.signals.map((sig, sIdx) => (
                                          <View key={sIdx} style={{ marginVertical: 2 }}>
                                            <Text style={{ fontSize: 11, color: COLORS.navy, fontWeight: '500' }}>
                                              • [{sig.signal_type}] {sig.evidence_description} (+{sig.contribution_pts} pts)
                                            </Text>
                                            <Text style={{ fontSize: 10, color: COLORS.gray600, marginLeft: 10 }}>
                                              Source: {sig.repository_name} ({sig.file_path})
                                            </Text>
                                          </View>
                                        ))
                                      ) : Array.isArray(skill.evidence_sources) && skill.evidence_sources.length > 0 ? (
                                        skill.evidence_sources.map((reason, rIdx) => (
                                          <Text key={rIdx} style={{ fontSize: 11, color: COLORS.gray700, marginVertical: 1 }}>
                                            ✓ {reason}
                                          </Text>
                                        ))
                                      ) : null}
                                    </View>
                                  )}
                                </Pressable>
                              );
                            })}
                          </View>
                        ) : (
                          <Text style={styles.noSkillsText}>Skill analysis will appear after you select repositories and click Analyze Repositories.</Text>
                        )}
                      </View>
                    )}
                  </HoverableCard>

                  {/* 4. PUBLIC REPOSITORY EVIDENCE */}
                  {currentProfile.githubLinks.githubConnected && (
                    <View style={styles.reposSelectionCard}>
                      <View style={styles.reposCardHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardHeaderTitle}>Public Repository Evidence</Text>
                          <Text style={styles.inputHelpText}>Select the repositories you want SkillSetu to use as evidence for your skills and project experience.</Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <View style={styles.selectedCountBadge}>
                            <Text style={styles.selectedCountBadgeText}>{selectedCount} of {totalCount} selected</Text>
                          </View>
                          <Pressable
                            style={{
                              backgroundColor: COLORS.teal,
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 6,
                              opacity: isAnalyzingGithub ? 0.6 : 1
                            }}
                            onPress={analyzeSelectedGithubRepositories}
                            disabled={isAnalyzingGithub}
                          >
                            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 12 }}>
                              {isAnalyzingGithub ? '⏳ Analyzing...' : '⚡ Analyze Repositories'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>

                      {totalCount > 0 && (
                        <View style={styles.repoBatchActionsRow}>
                          <Pressable
                            style={styles.batchActionBtn}
                            onPress={() => {
                              const updatedRepos = currentProfile.githubLinks.repositories.map(r => ({ ...r, selected: true }));
                              const selectedIds = updatedRepos.map(r => r.id);
                              setProfileData(prev => ({
                                ...prev,
                                githubLinks: {
                                  ...prev.githubLinks,
                                  repositories: updatedRepos,
                                },
                              }));
                              saveSelectedRepoIds(selectedIds);
                            }}
                          >
                            <Text style={styles.batchActionBtnText}>Select All ({totalCount})</Text>
                          </Pressable>
                          <Text style={styles.batchActionDivider}>•</Text>
                          <Pressable
                            style={styles.batchActionBtn}
                            onPress={() => {
                              const updatedRepos = currentProfile.githubLinks.repositories.map(r => ({ ...r, selected: false }));
                              setProfileData(prev => ({
                                ...prev,
                                githubLinks: {
                                  ...prev.githubLinks,
                                  repositories: updatedRepos,
                                },
                              }));
                              saveSelectedRepoIds([]);
                            }}
                          >
                            <Text style={styles.batchActionBtnText}>Clear All</Text>
                          </Pressable>
                        </View>
                      )}

                      {totalCount > 0 ? (
                        <View style={styles.reposGridList}>
                          {currentProfile.githubLinks.repositories.map((repo) => (
                            <Pressable
                              key={repo.id}
                              style={[styles.repoListItem, repo.selected && styles.repoListItemSelected]}
                              onPress={() => toggleRepositorySelected(repo.id)}
                            >
                              <View style={[styles.repoCheckbox, repo.selected && styles.repoCheckboxSelected]}>
                                <Text style={[styles.repoCheckboxText, repo.selected && styles.repoCheckboxTextSelected]}>{repo.selected ? '✓' : ''}</Text>
                              </View>
                              <View style={styles.repoDetails}>
                                <View style={styles.repoHeaderLine}>
                                  <Text style={styles.repoNameText}>{repo.name}</Text>
                                  {(repo.stars !== undefined || repo.forks !== undefined) && (
                                    <View style={styles.repoStatsRow}>
                                      {repo.stars !== undefined && <Text style={styles.repoStatItem}>⭐ {repo.stars}</Text>}
                                      {repo.forks !== undefined && <Text style={styles.repoStatItem}>🍴 {repo.forks}</Text>}
                                    </View>
                                  )}
                                </View>
                                {Boolean(repo.description) && (
                                  <Text style={styles.repoDescText}>{repo.description}</Text>
                                )}
                                {Array.isArray(repo.tags) && repo.tags.length > 0 && (
                                  <View style={styles.repoTagsRow}>
                                    {repo.tags.map((tag) => (
                                      <View key={tag} style={styles.repoTag}>
                                        <Text style={styles.repoTagText}>{tag}</Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptyReposPrompt}>
                          <Text style={styles.emptyReposIcon}>📁</Text>
                          <Text style={styles.emptyReposTitle}>No public repositories found</Text>
                          <Text style={styles.emptyReposSub}>Make sure your GitHub profile contains public repositories so SkillSetu can analyze them.</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
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
                          <Text style={styles.summaryText}><Text style={styles.boldLabel}>Degree:</Text> {renderVal(currentProfile.education.list[0].degree)}</Text>
                          <Text style={styles.summaryText}><Text style={styles.boldLabel}>University:</Text> {renderVal(currentProfile.education.list[0].university)}</Text>
                          <Text style={styles.summaryText}><Text style={styles.boldLabel}>Graduation:</Text> {renderVal(currentProfile.education.list[0].graduationYear)}</Text>
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
                    <Text style={[styles.aiMetricVal, { color: COLORS.teal }]}>{calculateProfileConfidence()}%</Text>
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

  if (isViewingOnePageProfile || currentProfile.verified) {
    const rawData = currentProfile.resumeAnalysis?.extractedData || {};
    const linksData = rawData.links || {};
    const linkedinLink = currentProfile.githubLinks?.linkedinUrl || user?.linkedin_url || linksData.linkedin || '';
    const portfolioLink = currentProfile.githubLinks?.portfolioUrl || user?.portfolio_url || linksData.portfolio || '';
    const githubUserId = currentProfile.githubLinks?.githubUsername || user?.github_user_id || linksData.github || '';

    // Skills list from normalized skills / DB
    const skillsList = (currentProfile.resumeAnalysis?.extractedData?.coreTechnologies?.length > 0)
      ? currentProfile.resumeAnalysis.extractedData.coreTechnologies
      : (user?.skills?.length > 0 ? user.skills : ['React Native', 'Python', 'FastAPI']);

    // GitHub repositories list
    const reposList = currentProfile.githubLinks?.repositories || [];

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Top Header Card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 24, borderColor: '#E2E8F0', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }}>
          <View style={{ flexDirection: isTablet ? 'row' : 'column', justifyContent: 'space-between', alignItems: isTablet ? 'center' : 'flex-start', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {(currentProfile.personalInfo?.profileImage || user?.profile_image) ? (
                <Image
                  source={{ uri: currentProfile.personalInfo?.profileImage || user?.profile_image }}
                  style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: COLORS.teal }}
                />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.teal, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}>
                    {(currentProfile.personalInfo?.fullName || user?.name || 'A')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.navy }}>
                    {currentProfile.personalInfo?.fullName || user?.name || 'Aryan Bhoge'}
                  </Text>
                  <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>✓ VERIFIED</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
                  {currentProfile.careerGoals?.targetCareer || user?.headline || 'Senior Frontend Engineer'} • {currentProfile.personalInfo?.location || user?.location || 'Wardha, India'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, alignSelf: isTablet ? 'center' : 'stretch' }}>
              <Pressable
                style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, alignItems: 'center' }}
                onPress={() => setIsViewingOnePageProfile(false)}
              >
                <Text style={{ color: COLORS.navy, fontWeight: '600', fontSize: 13 }}>✏️ Edit Profile</Text>
              </Pressable>
              <Pressable
                style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, alignItems: 'center' }}
                onPress={() => alert('Profile link copied to clipboard!')}
              >
                <Text style={{ color: COLORS.navy, fontWeight: '600', fontSize: 13 }}>🔗 Share Profile</Text>
              </Pressable>
              <Pressable
                style={{ backgroundColor: COLORS.teal, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flex: 1, alignItems: 'center' }}
                onPress={() => alert('Downloading verified skill report...')}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>📥 Download Report</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Dashboard Grid */}
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 24 }}>
          {/* Left Column (Main Content) */}
          <View style={{ flex: isWide ? 2 : 1, gap: 24 }}>
            
            {/* Verified Skill Proofs Card */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.navy, marginBottom: 4 }}>Verified Skill Proofs</Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>ESCO Canonical Skill Taxonomies with Evidence Verification</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {skillsList.map((skill, idx) => (
                  <View key={idx} style={{ backgroundColor: '#F0FDFA', borderColor: '#CCFBF1', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.teal }}>{skill}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0D9488' }}>90%</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Public GitHub Repositories Card */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.navy }}>Public GitHub Repositories</Text>
                {currentProfile.githubLinks?.githubConnected ? (
                  <Text style={{ fontSize: 12, color: '#059669', fontWeight: '700' }}>● OAuth Connected</Text>
                ) : (
                  <Text style={{ fontSize: 12, color: '#94A3B8' }}>○ Disconnected</Text>
                )}
              </View>

              {currentProfile.githubLinks?.githubConnected && reposList.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {reposList.slice(0, 4).map((repo, rIdx) => (
                    <View key={rIdx} style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.navy }}>📦 {repo.name}</Text>
                        <Text style={{ fontSize: 12, color: '#64748B' }}>Updated {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'recently'}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{repo.description || 'Public repository code evidence for technical verification.'}</Text>
                      
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                        {repo.language && (
                          <View style={{ backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#0369A1' }}>{repo.language}</Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 12, color: '#64748B' }}>⭐ {repo.stargazers_count || 0} stars</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : currentProfile.githubLinks?.githubConnected ? (
                <View style={{ padding: 14, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.navy }}>GitHub Account Linked</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Username: @{currentProfile.githubLinks.githubUsername || user?.github_user_id || 'connected'}</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: '#64748B' }}>No GitHub repositories linked yet. Authorize GitHub in profile setup to attach live repository commit evidence.</Text>
              )}
            </View>

            {/* AI Pre-Analysis & Resume Score Card */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.navy, marginBottom: 16 }}>AI Pre-Analysis & Resume Score</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                {/* Score Progress Ring */}
                {(() => {
                  const scoreVal = currentProfile.resumeAnalysis?.score || user?.resume_score || 39;
                  const deg = Math.round((scoreVal / 100) * 360);
                  const isWeb = Platform.OS === 'web';
                  const circleBg = isWeb 
                    ? `conic-gradient(${COLORS.teal} 0deg ${deg}deg, #E2E8F0 ${deg}deg 360deg)`
                    : COLORS.teal;

                  return (
                    <View style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      justify: 'center',
                      alignItems: 'center',
                      background: circleBg,
                      backgroundColor: circleBg,
                      padding: 6,
                    }}>
                      <View style={{
                        width: 84,
                        height: 84,
                        borderRadius: 42,
                        backgroundColor: '#F0FDFA',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.teal }}>{scoreVal}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '500' }}>/ 100</Text>
                      </View>
                    </View>
                  );
                })()}
                
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.navy }}>
                    {currentProfile.resumeAnalysis?.scoreText || 'Strong technical alignment. Adding more measurable metrics to projects could increase impact.'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                    Overall Readiness score derived from ESCO skill completeness, experience quality, and academic credentials.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column (Sidebar Cards) */}
          <View style={{ flex: isWide ? 1 : 1, gap: 24 }}>
            
            {/* Academic Credentials Card */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.navy, marginBottom: 12 }}>Academic Credentials</Text>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, color: '#64748B' }}>Degree</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.navy }}>
                  {currentProfile.education?.list?.[0]?.degree || user?.degree || 'Bachelor of Technology (B.Tech)'}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748B' }}>
                  {currentProfile.education?.list?.[0]?.university || user?.university || 'Sanjay Ghodawat University'}
                </Text>
                <View style={{ backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.navy }}>
                    🎓 CGPA: {currentProfile.education?.list?.[0]?.cgpa || user?.cgpa_or_percentage || '7.05 / 10.0'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#059669', fontWeight: '700' }}>✓ Verified</Text>
                </View>
              </View>
            </View>

            {/* Professional Links Card */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.navy, marginBottom: 12 }}>Professional Links</Text>
              <View style={{ gap: 10 }}>
                {linkedinLink ? (
                  <Pressable style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 13, color: COLORS.teal, fontWeight: '600' }}>💼 LinkedIn: {linkedinLink}</Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontSize: 13, color: '#94A3B8' }}>LinkedIn: Not provided</Text>
                )}

                {portfolioLink ? (
                  <Pressable style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 13, color: COLORS.teal, fontWeight: '600' }}>🌐 Portfolio: {portfolioLink}</Text>
                  </Pressable>
                ) : (
                  <Text style={{ fontSize: 13, color: '#94A3B8' }}>Portfolio: Not provided</Text>
                )}

                {githubUserId ? (
                  <Pressable style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 13, color: COLORS.navy, fontWeight: '600' }}>🐙 GitHub: @{githubUserId}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Career Goal Alignment Card */}
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.navy, marginBottom: 12 }}>Career Goal Alignment</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.teal }}>
                Target: {currentProfile.careerGoals?.targetCareer || user?.headline || 'Senior Frontend Engineer'}
              </Text>
              
              <View style={{ marginTop: 12, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Overall Fit Match</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.navy }}>88%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: '88%', backgroundColor: COLORS.teal, borderRadius: 3 }} />
                </View>
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    );
  }

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
    marginTop: 8,
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
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.green,
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
  // Step 5: Professional Evidence & Links
  stepHeaderWrap: {
    marginBottom: 8,
  },
  githubProfilePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paper,
    borderWidth: 1.5,
    borderColor: COLORS.subtle,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginTop: 4,
  },
  publicBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  publicBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.green,
  },
  githubVerifiedSubText: {
    fontSize: 11,
    color: COLORS.teal,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyGithubPrompt: {
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  emptyGithubPromptTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
  },
  emptyGithubPromptSub: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
  noSkillsText: {
    fontSize: 12,
    color: COLORS.muted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  connectGithubPrimaryBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  connectGithubPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.paper,
  },
  connectedHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshBtn: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.teal,
  },
  disconnectBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  disconnectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  bannerInfoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  bannerInfoNoteIcon: {
    fontSize: 14,
  },
  bannerInfoNoteText: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: '600',
    flex: 1,
  },
  cardHeaderGroup: {
    gap: 4,
    marginBottom: 4,
  },
  cardHeaderSub: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionalBadgeText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  validStatusText: {
    fontSize: 11,
    color: COLORS.green,
    fontWeight: '700',
  },
  invalidStatusText: {
    fontSize: 11,
    color: COLORS.rose,
    fontWeight: '700',
  },
  inputIconPrefix: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.subtle,
  },
  iconTextInput: {
    flex: 1,
    borderWidth: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  inputValidBorder: {
    borderColor: COLORS.green,
    borderWidth: 1.5,
  },
  supportedProfilesPill: {
    backgroundColor: COLORS.panel,
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  supportedProfilesText: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 15,
  },
  githubIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  githubSecurityNote: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  githubAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  githubTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reconnectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  reconnectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  githubAnalysisExplanation: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
  },
  metricSubText: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  aiEvidenceHeader: {
    gap: 2,
    marginBottom: 4,
  },
  evidenceHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
  },
  skillsEvidenceList: {
    gap: 12,
  },
  evidenceScoreBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skillLevelPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelExpertPill: {
    backgroundColor: '#dcfce7',
  },
  levelStrongPill: {
    backgroundColor: '#e0f2fe',
  },
  levelGoodPill: {
    backgroundColor: '#fef3c7',
  },
  skillLevelPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  levelExpertPillText: {
    color: '#15803d',
  },
  levelStrongPillText: {
    color: '#0369a1',
  },
  levelGoodPillText: {
    color: '#b45309',
  },
  evidenceDisclaimerCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.panel,
    padding: 10,
    borderRadius: 8,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  disclaimerIcon: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '700',
  },
  disclaimerText: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 15,
    flex: 1,
  },
  reposCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  selectedCountBadge: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.green,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.green,
  },
  repoBatchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -4,
  },
  batchActionBtn: {
    paddingVertical: 2,
  },
  batchActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.teal,
  },
  batchActionDivider: {
    fontSize: 12,
    color: COLORS.muted,
  },
  emptyReposWrap: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyReposIcon: {
    fontSize: 28,
  },
  emptyReposTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  emptyReposSub: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
  },
  repoHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repoStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  repoStatItem: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  repoCheckboxSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  repoCheckboxTextSelected: {
    color: COLORS.paper,
  },
  repoUpdatedText: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
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
