import React, { useState, useEffect } from 'react';
import { Linking, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { createInitialProfile, fetchCompleteStudentProfile, formatCareerTitle } from '../services/profileService';
import { fetchStudentApplications } from '../services/applicationService';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  EmptyState,
  EventCard,
  Field,
  Icon,
  IconButton,
  Inset,
  KeyValue,
  Page,
  Pill,
  ProgressBar,
  Ring,
  Row,
  SectionTitle,
  Sheet,
  Skeleton,
  Stack,
  StatTrio,
  Stepper,
  TagSearch,
  Txt,
} from '../../../ui/components';
import { colors, radii, space, toneOf, webOnly } from '../../../ui/theme';
import { API_BASE } from '../../../ui/config';
import { pickFile } from '../../../ui/pickFile';

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


export const DEFAULT_MOCK_PROFILE = {
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

  // Marksheet Document Extraction States
  const [isExtractingMarksheet, setIsExtractingMarksheet] = useState(false);
  const [extractionConfidence, setExtractionConfidence] = useState({});

  // Manual Education Form Field States
  const eduItemInit = profileData?.education?.list?.[0] || {};
  const [eduDegree, setEduDegree] = useState(
    eduItemInit.degree ? (typeof eduItemInit.degree === 'object' ? eduItemInit.degree.value : eduItemInit.degree) : (user?.degree || '')
  );
  const [eduBranch, setEduBranch] = useState(
    eduItemInit.branch ? (typeof eduItemInit.branch === 'object' ? eduItemInit.branch.value : eduItemInit.branch) : (user?.branch || '')
  );
  const [eduUniv, setEduUniv] = useState(
    eduItemInit.university ? (typeof eduItemInit.university === 'object' ? eduItemInit.university.value : eduItemInit.university) : (user?.university || '')
  );
  const [eduStart, setEduStart] = useState(
    eduItemInit.startYear ? (typeof eduItemInit.startYear === 'object' ? eduItemInit.startYear.value : eduItemInit.startYear) : (user?.start_year || '')
  );
  const [eduGrad, setEduGrad] = useState(
    eduItemInit.graduationYear ? (typeof eduItemInit.graduationYear === 'object' ? eduItemInit.graduationYear.value : eduItemInit.graduationYear) : (user?.graduation_year || '')
  );
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // Sync education fields when profileData / user changes
  useEffect(() => {
    const item = profileData?.education?.list?.[0] || {};
    if (item.degree || user?.degree) {
      setEduDegree(item.degree ? (typeof item.degree === 'object' ? item.degree.value : item.degree) : (user?.degree || ''));
    }
    if (item.branch || user?.branch) {
      setEduBranch(item.branch ? (typeof item.branch === 'object' ? item.branch.value : item.branch) : (user?.branch || ''));
    }
    if (item.university || user?.university) {
      setEduUniv(item.university ? (typeof item.university === 'object' ? item.university.value : item.university) : (user?.university || ''));
    }
    if (item.startYear || user?.start_year) {
      setEduStart(item.startYear ? (typeof item.startYear === 'object' ? item.startYear.value : item.startYear) : (user?.start_year || ''));
    }
    if (item.graduationYear || user?.graduation_year) {
      setEduGrad(item.graduationYear ? (typeof item.graduationYear === 'object' ? item.graduationYear.value : item.graduationYear) : (user?.graduation_year || ''));
    }
  }, [profileData?.education, user]);


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

  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showAtsModal, setShowAtsModal] = useState(false);
  const [studentApplications, setStudentApplications] = useState([]);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isReanalyzingResume, setIsReanalyzingResume] = useState(false);


  // Fetch student active applications
  useEffect(() => {
    if (user?.email) {
      fetchStudentApplications(user.email).then(data => {
        if (data && data.internships) {
          setStudentApplications(data.internships);
        }
      }).catch(err => {
        console.warn('Error fetching student applications:', err);
      });
    }
  }, [user]);

  // Load real resume analysis data if available
  useEffect(() => {
    if (user?.email) {
      const emailQuery = encodeURIComponent(user.email.trim());
      fetch(`${API_BASE}/student/resume-data?email=${emailQuery}`)
        .then(r => r.json())
        .then(resData => {
          if (resData && resData.status === 'success' && resData.resume_data) {
            const rd = resData.resume_data;
            const extData = rd.extracted_data || {};
            setProfileData(prev => ({
              ...prev,
              resumeAnalysis: {
                ...prev.resumeAnalysis,
                resumeFile: rd.resume_file || resData.resume_url || prev.resumeAnalysis?.resumeFile,
                parseTime: rd.parse_time || prev.resumeAnalysis?.parseTime,
                score: typeof rd.score === 'number' ? rd.score : (resData.resume_score ?? prev.resumeAnalysis?.score),
                scoreText: rd.score_text || prev.resumeAnalysis?.scoreText,
                scoreBreakdown: rd.score_breakdown || prev.resumeAnalysis?.scoreBreakdown,
                diagnostics: rd.diagnostics || prev.resumeAnalysis?.diagnostics,
                extractedData: {
                  ...prev.resumeAnalysis?.extractedData,
                  ...extData,
                },
                roleFit: rd.role_fit || prev.resumeAnalysis?.roleFit,
                skillsetValue: rd.skillsetu_value || prev.resumeAnalysis?.skillsetValue,
              },
            }));
          }
        })
        .catch(err => {
          console.warn('Error fetching student resume data:', err);
        });
    }
  }, [user?.email]);

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
          fetch(`${API_BASE}/taxonomy/careers?limit=50`).then(r => r.json()),
          fetch(`${API_BASE}/taxonomy/skills?limit=50`).then(r => r.json()),
          fetch(`${API_BASE}/taxonomy/industries`).then(r => r.json()),
          fetch(`${API_BASE}/taxonomy/locations?limit=50`).then(r => r.json()),
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
          ? `${API_BASE}/taxonomy/careers?q=${encodeURIComponent(careerSearch.trim())}&limit=50`
          : `${API_BASE}/taxonomy/careers?limit=50`;
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
          ? `${API_BASE}/taxonomy/skills?q=${encodeURIComponent(skillSearch.trim())}&limit=50`
          : `${API_BASE}/taxonomy/skills?limit=50`;
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
          ? `${API_BASE}/taxonomy/locations?q=${encodeURIComponent(locationSearch.trim())}&limit=50`
          : `${API_BASE}/taxonomy/locations?limit=50`;
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
      const eduItem = currentProfile.education.list[0] || {};
      const hasMarksheet = currentProfile.education.hasExtractedMarksheet || Boolean(currentProfile.education.marksheetUrl) || Boolean(currentProfile.education.marksheetFileName) || Boolean(user?.marksheet_url);
      if (!hasMarksheet) {
        errors.marksheet = 'Please upload your latest academic marksheet before proceeding.';
      }
      const degVal = eduDegree.trim() || renderVal(eduItem.degree) || user?.degree;
      const univVal = eduUniv.trim() || renderVal(eduItem.university) || user?.university;
      const gradVal = eduGrad.trim() || renderVal(eduItem.graduationYear) || user?.graduation_year;
      if (!degVal) errors.eduDegree = 'Degree is required.';
      if (!univVal) errors.eduUniv = 'University / Institution is required.';
      if (!gradVal) errors.eduGrad = 'Graduation Year is required.';
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
      if (!currentProfile.resumeAnalysis.resumeFile && !user?.resume_url) errors.resumeFile = 'Please upload/select a resume file';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(activeStep)) {
      if (activeStep === 1) {
        // Save Step 1 personal information directly to user database record
        try {
          const res = await fetch(`${API_BASE}/student/update-personal-info`, {
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

          const res = await fetch(`${API_BASE}/student/update-education`, {
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

          await fetch(`${API_BASE}/taxonomy/student/career-goals`, {
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

          await fetch(`${API_BASE}/student/update-resume-data`, {
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
      const response = await fetch(`${API_BASE}/student/upload-resume`, {
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
            diagnostics: resData.diagnostics || {},
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
            roleFit: resData.role_fit,
            skillsetValue: resData.skillsetu_value,
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
      await fetch(`${API_BASE}/student/delete-resume?email=${encodeURIComponent(currentProfile.personalInfo.email.trim())}`, {
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
      const response = await fetch(`${API_BASE}/student/upload-marksheet`, {
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
      const response = await fetch(`${API_BASE}/github/connect?email=${encodeURIComponent(email)}`);
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
      const response = await fetch(`${API_BASE}/github/refresh?email=${encodeURIComponent(email)}`, {
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
      const response = await fetch(`${API_BASE}/github/analyze-selected`, {
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
        await fetch(`${API_BASE}/github/disconnect?email=${encodeURIComponent(email)}`, {
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
      await fetch(`${API_BASE}/github/repositories/select`, {
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


  // ---------------------------------------------------------------------------
  // File pickers (web)
  // ---------------------------------------------------------------------------
  const pickProfileImage = async () => {
    const file = await pickFile({ accept: 'image/png,image/jpeg,image/jpg' });
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size exceeds 2MB limit. Please select a smaller image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => updatePersonalInfo('profileImage', event.target.result);
    reader.readAsDataURL(file);
  };
  const pickMarksheet = async () => {
    const file = await pickFile({ accept: '.pdf,.jpg,.jpeg,.png' });
    if (file) handleMarksheetFileUpload(file);
  };
  const pickResume = async () => {
    const file = await pickFile({ accept: '.pdf,.docx,.png,.jpg,.jpeg,.webp' });
    if (file) handleResumeFileUpload(file);
  };
  const openUrl = (url) => {
    if (!url) return;
    const dest = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    if (Platform.OS === 'web') window.open(dest, '_blank', 'noopener,noreferrer');
    else Linking.openURL(dest).catch(() => {});
  };

  const twoCol = isTablet;

  const careerName = (id) =>
    (taxonomyCareers.find((c) => c.id === id) || {}).name ||
    (id === currentProfile.careerGoals.targetCareerId || id === (currentProfile.careerGoals.targetCareerIds || [])[0]
      ? currentProfile.careerGoals.targetCareer
      : '') ||
    formatCareerTitle(id);

  // ---------------------------------------------------------------------------
  // Wizard steps
  // ---------------------------------------------------------------------------
  const renderStep1 = () => {
    const p = currentProfile.personalInfo;
    const bind = (field) => ({
      value: p[field] || '',
      onChangeText: (v) => updatePersonalInfo(field, v),
      error: validationErrors[field],
    });
    return (
      <Card>
        <Stack gap={space.lg}>
          <Row gap={space.lg} align="center" wrap>
            <Avatar name={p.fullName || user?.name} uri={p.profileImage || undefined} size={92} ring={validationErrors.profileImage ? colors.danger : undefined} />
            <Stack gap={8} style={{ flex: 1, minWidth: 220 }}>
              <Txt variant="title" tone="ink">Profile photo</Txt>
              <Txt variant="small" tone="muted">JPG or PNG, up to 2MB. Recruiters see this on your profile.</Txt>
              <Row gap={8}>
                <Button label={p.profileImage ? 'Change photo' : 'Upload photo'} icon="Upload" size="sm" onPress={pickProfileImage} />
                {p.profileImage ? <Button label="Remove" variant="danger" size="sm" onPress={() => updatePersonalInfo('profileImage', '')} /> : null}
              </Row>
              {validationErrors.profileImage ? <Txt variant="caption" tone="danger">{validationErrors.profileImage}</Txt> : null}
            </Stack>
          </Row>
          <Grid twoCol={twoCol}>
            <Col twoCol={twoCol}>
              <Field label="Full name" icon="User" placeholder="e.g. Alex Chen" {...bind('fullName')} />
              <Field label="Phone" icon="Phone" placeholder="+91 98765 43210" keyboardType="phone-pad" {...bind('phone')} />
              <Field label="Location" icon="MapPin" placeholder="e.g. Pune, India" {...bind('location')} />
            </Col>
            <Col twoCol={twoCol}>
              <Field label="Email" icon="Mail" placeholder="hello@example.com" keyboardType="email-address" autoCapitalize="none" {...bind('email')} />
              <Field label="Headline" icon="Sparkles" placeholder="e.g. Aspiring Full Stack Developer" {...bind('headline')} />
              <Field label="Experience" icon="Briefcase" placeholder="e.g. Fresher, 1 year" {...bind('yearsOfExperience')} />
            </Col>
          </Grid>
          <Field label="About you" multiline placeholder="A short summary of your skills and what you're aiming for…" {...bind('bio')} />
        </Stack>
      </Card>
    );
  };

  const renderStep2 = () => {
    const edu = currentProfile.education;
    const first = edu.list[0] || {};
    return (
      <Stack gap={space.md}>
        <Card tone={edu.hasExtractedMarksheet ? 'success' : 'info'} badge={{ icon: 'FileText', tone: edu.hasExtractedMarksheet ? 'success' : 'info' }}>
          {isExtractingMarksheet ? (
            <Stack gap={10}>
              <Txt variant="h3" tone="ink">Reading your marksheet…</Txt>
              <Txt variant="small" tone="muted">Extracting degree, branch, university, years and CGPA.</Txt>
              <Skeleton height={12} width="70%" />
              <Skeleton height={12} width="50%" />
            </Stack>
          ) : !edu.hasExtractedMarksheet ? (
            <Stack gap={10}>
              <Txt variant="h3" tone="ink">Upload your latest marksheet</Txt>
              <Txt variant="small" color={colors.skyInk}>
                PDF, JPG or PNG up to 5MB. SkillSetu fills in your education details automatically — you can edit them below.
              </Txt>
              <Button label="Upload marksheet" icon="Upload" onPress={pickMarksheet} />
              {validationErrors.marksheet ? <Txt variant="caption" tone="danger">{validationErrors.marksheet}</Txt> : null}
            </Stack>
          ) : (
            <Stack gap={space.sm}>
              <Row justify="space-between" wrap>
                <Row gap={10} style={{ flexShrink: 1 }}>
                  <Icon name="CircleCheck" size={20} color={colors.mintInk} />
                  <Txt variant="bodyStrong" tone="ink" numberOfLines={1} style={{ flexShrink: 1 }}>{edu.marksheetFileName || 'Marksheet uploaded'}</Txt>
                </Row>
                <Button label="Replace" icon="RefreshCw" size="sm" variant="light" onPress={pickMarksheet} />
              </Row>
              <Inset tone="success">
                <KeyValue icon="GraduationCap" label="Degree" value={renderVal(first.degree) || 'Not detected'} />
                <KeyValue icon="BookOpen" label="Branch" value={renderVal(first.branch) || 'Not detected'} />
                <KeyValue icon="Building" label="University" value={renderVal(first.university) || 'Not detected'} />
                <KeyValue
                  icon="Calendar"
                  label="Period"
                  value={first.startYear || first.graduationYear ? `${renderVal(first.startYear, '—')} – ${renderVal(first.graduationYear, '—')}` : renderVal(edu.academicYearDetected, 'Not detected')}
                />
                <KeyValue icon="Award" label="CGPA / %" value={renderVal(edu.cgpaDetected) || 'Not detected'} />
              </Inset>
            </Stack>
          )}
        </Card>

        {edu.list.length ? (
          <Stack gap={space.sm}>
            {edu.list.map((item) => (
              <Card key={item.id} padding={space.lg}>
                <Row justify="space-between" align="flex-start">
                  <Stack gap={2} style={{ flex: 1 }}>
                    <Txt variant="title" tone="ink">{renderVal(item.degree) || 'Degree'}{item.branch ? ` · ${renderVal(item.branch)}` : ''}</Txt>
                    <Txt variant="small" tone="muted">{renderVal(item.university)} · {renderVal(item.startYear, '—')} – {renderVal(item.graduationYear, '—')}</Txt>
                  </Stack>
                  <IconButton icon="Trash" onPress={() => removeEducationItem(item.id)} accessibilityLabel="Remove education" />
                </Row>
              </Card>
            ))}
          </Stack>
        ) : null}

        <Card>
          <Stack gap={space.md}>
            <Txt variant="h3" tone="ink">Education details</Txt>
            <Grid twoCol={twoCol}>
              <Col twoCol={twoCol}>
                <Field label="Degree" icon="GraduationCap" placeholder="e.g. B.Tech" value={eduDegree} onChangeText={setEduDegree} error={validationErrors.eduDegree} />
                <Field label="University / institution" icon="Building" placeholder="e.g. Pune University" value={eduUniv} onChangeText={setEduUniv} error={validationErrors.eduUniv} />
              </Col>
              <Col twoCol={twoCol}>
                <Field label="Branch / major" icon="BookOpen" placeholder="e.g. Computer Science" value={eduBranch} onChangeText={setEduBranch} />
                <Row gap={space.sm} align="flex-start">
                  <Field style={{ flex: 1 }} label="Start year" placeholder="2022" keyboardType="number-pad" value={eduStart} onChangeText={setEduStart} />
                  <Field style={{ flex: 1 }} label="Graduation" placeholder="2026" keyboardType="number-pad" value={eduGrad} onChangeText={setEduGrad} error={validationErrors.eduGrad} />
                </Row>
              </Col>
            </Grid>
            <Button label="Add as another entry" icon="Plus" variant="secondary" size="sm" onPress={addEducationItem} />
          </Stack>
        </Card>
      </Stack>
    );
  };

  const renderStep3 = () => {
    const cg = currentProfile.careerGoals;
    const selectedCareers = cg.targetCareerIds || (cg.targetCareerId ? [cg.targetCareerId] : []);
    const selectedSkills = cg.skillIds || [];
    const selectedLocations = cg.preferredLocationIds || [];
    const selectedIndustries = cg.targetIndustryIds || (cg.targetIndustryId ? [cg.targetIndustryId] : []);
    const setSkills = (updated) => {
      updateCareerGoalsField('skillIds', updated);
      updateCareerGoalsField('careerInterests', updated.map((id) => (taxonomySkills.find((s) => s.id === id) || {}).name || id));
    };
    const toggleIn = (field, list, id, label) => {
      const updated = list.includes(id) || (label && list.includes(label)) ? list.filter((o) => o !== id && o !== label) : [...list, id];
      updateCareerGoalsField(field, updated);
    };
    return (
      <Stack gap={space.md}>
        <Grid twoCol={twoCol}>
          <Col twoCol={twoCol}>
            <Card style={{ zIndex: showCareerDropdown ? 30 : 1 }}>
              <TagSearch
                label="Target career roles"
                hint="Pick one or more roles. Matching and skill gaps are based on these."
                icon="Target"
                placeholder="Search careers (e.g. Frontend, Data, AI)"
                query={careerSearch}
                onQuery={setCareerSearch}
                open={showCareerDropdown}
                onOpenChange={setShowCareerDropdown}
                options={taxonomyCareers.map((c) => ({ id: c.id, name: c.name, sub: c.category }))}
                selected={selectedCareers.map((id) => ({ id, name: careerName(id) }))}
                onAdd={(item) => {
                  const updated = [...selectedCareers, item.id];
                  updateCareerGoalsField('targetCareerIds', updated);
                  updateCareerGoalsField('targetCareerId', updated[0]);
                  updateCareerGoalsField('targetCareer', selectedCareers.length ? careerName(updated[0]) : item.name);
                }}
                onRemove={(id) => {
                  const updated = selectedCareers.filter((x) => x !== id);
                  updateCareerGoalsField('targetCareerIds', updated);
                  updateCareerGoalsField('targetCareerId', updated[0] || '');
                  updateCareerGoalsField('targetCareer', updated[0] ? careerName(updated[0]) : '');
                }}
                error={validationErrors.targetCareer}
              />
            </Card>
          </Col>
          <Col twoCol={twoCol}>
            <Card style={{ zIndex: showLocationDropdown ? 30 : 1 }}>
              <TagSearch
                label="Preferred locations"
                hint="Cities you can work from, or Remote."
                icon="MapPin"
                tone="info"
                placeholder="Search locations (e.g. Pune, Remote)"
                query={locationSearch}
                onQuery={setLocationSearch}
                open={showLocationDropdown}
                onOpenChange={setShowLocationDropdown}
                options={taxonomyLocations.map((l) => ({ id: l.id, name: l.name, sub: [l.state, l.country].filter(Boolean).join(', ') }))}
                selected={selectedLocations.map((id) => ({ id, name: (taxonomyLocations.find((l) => l.id === id) || {}).name || id }))}
                onAdd={(item) => {
                  updateCareerGoalsField('preferredLocationIds', [...selectedLocations, item.id]);
                  updateCareerGoalsField('preferredLocations', [...(cg.preferredLocations || []), item.name]);
                }}
                onRemove={(id) => updateCareerGoalsField('preferredLocationIds', selectedLocations.filter((x) => x !== id))}
                error={validationErrors.locations}
              />
            </Card>
          </Col>
        </Grid>

        <Card style={{ zIndex: showSkillDropdown ? 30 : 1 }}>
          <TagSearch
            label="Skills you have or want"
            hint="Internships are matched against these skills."
            icon="Zap"
            tone="accent"
            placeholder="Search skills (e.g. React, Python, Docker)"
            query={skillSearch}
            onQuery={setSkillSearch}
            open={showSkillDropdown}
            onOpenChange={setShowSkillDropdown}
            options={taxonomySkills.map((s) => ({ id: s.id, name: s.name, sub: s.category }))}
            selected={selectedSkills.map((id) => ({ id, name: (taxonomySkills.find((s) => s.id === id) || {}).name || (cg.careerInterests || [])[selectedSkills.indexOf(id)] || id }))}
            onAdd={(item) => setSkills([...selectedSkills, item.id])}
            onRemove={(id) => setSkills(selectedSkills.filter((x) => x !== id))}
            error={validationErrors.skills}
          />
        </Card>

        <Grid twoCol={twoCol}>
          <Col twoCol={twoCol}>
            <Card>
              <Stack gap={8}>
                <Txt variant="small" weight={600} tone="ink">Target industries</Txt>
                <Row wrap gap={8}>
                  {taxonomyIndustries.map((ind) => (
                    <Chip
                      key={ind.id}
                      label={ind.name}
                      tone="warning"
                      selected={selectedIndustries.includes(ind.id)}
                      onPress={() => {
                        const updated = selectedIndustries.includes(ind.id) ? selectedIndustries.filter((x) => x !== ind.id) : [...selectedIndustries, ind.id];
                        updateCareerGoalsField('targetIndustryIds', updated);
                        updateCareerGoalsField('targetIndustryId', updated[0] || '');
                        updateCareerGoalsField('industry', updated.map((id) => (taxonomyIndustries.find((i) => i.id === id) || {}).name || id).join(', '));
                      }}
                    />
                  ))}
                </Row>
                {validationErrors.industry ? <Txt variant="caption" tone="danger">{validationErrors.industry}</Txt> : null}
              </Stack>
            </Card>
          </Col>
          <Col twoCol={twoCol}>
            <Card>
              <Stack gap={8}>
                <Txt variant="small" weight={600} tone="ink">When can you start?</Txt>
                <Row wrap gap={8}>
                  {TIMELINES.map((t) => (
                    <Chip key={t.id} label={t.label} tone="info" selected={cg.timeline === t.id || cg.timeline === t.label} onPress={() => updateCareerGoalsField('timeline', t.id)} />
                  ))}
                </Row>
                {validationErrors.timeline ? <Txt variant="caption" tone="danger">{validationErrors.timeline}</Txt> : null}
              </Stack>
            </Card>
          </Col>
        </Grid>

        <Grid twoCol={twoCol}>
          <Col twoCol={twoCol}>
            <Card>
              <Stack gap={8}>
                <Txt variant="small" weight={600} tone="ink">Opportunity type</Txt>
                <Row wrap gap={8}>
                  {OPPORTUNITY_TYPES.map((o) => {
                    const list = cg.opportunityTypes || [];
                    return <Chip key={o.id} label={o.label} icon="Briefcase" selected={list.includes(o.id) || list.includes(o.label)} onPress={() => toggleIn('opportunityTypes', list, o.id, o.label)} />;
                  })}
                </Row>
                {validationErrors.opportunityTypes ? <Txt variant="caption" tone="danger">{validationErrors.opportunityTypes}</Txt> : null}
              </Stack>
            </Card>
          </Col>
          <Col twoCol={twoCol}>
            <Card>
              <Stack gap={8}>
                <Txt variant="small" weight={600} tone="ink">Work preference</Txt>
                <Row wrap gap={8}>
                  {WORK_PREFS.map((o) => {
                    const list = cg.workPreferences || [];
                    return <Chip key={o.id} label={o.label} icon={o.icon} selected={list.includes(o.id) || list.includes(o.label)} onPress={() => toggleIn('workPreferences', list, o.id, o.label)} />;
                  })}
                </Row>
                {validationErrors.workPreferences ? <Txt variant="caption" tone="danger">{validationErrors.workPreferences}</Txt> : null}
              </Stack>
            </Card>
          </Col>
        </Grid>

        <Card>
          <Field
            label="Career goal"
            hint="Used by your AI mentor and in your profile summary."
            multiline
            placeholder="I want to build scalable web products with React and Python, and grow into a product engineering role…"
            value={cg.careerGoal || ''}
            onChangeText={(v) => updateCareerGoalsField('careerGoal', v)}
            error={validationErrors.careerGoal}
          />
        </Card>
      </Stack>
    );
  };

  const renderStep4 = () => {
    const ra = currentProfile.resumeAnalysis;
    const ext = ra.extractedData || {};
    return (
      <Grid twoCol={twoCol}>
        <Col twoCol={twoCol} flex={0.9}>
          {ra.resumeFile ? (
            <Card tone="info">
              <Stack gap={space.md} style={{ alignItems: 'center' }}>
                <Txt variant="overline" color={colors.skyInk}>Resume score</Txt>
                <Ring value={ra.score || 0} size={128} stroke={12} tone="info" track="rgba(255,255,255,0.7)">
                  <Txt variant="display" tone="ink">{ra.score || 0}</Txt>
                  <Txt variant="caption" tone="muted">/ 100</Txt>
                </Ring>
                <Txt variant="small" color={colors.skyInk} align="center">{ra.scoreText}</Txt>
                <Button label="View full analysis" icon="Eye" variant="light" size="sm" onPress={() => setShowAtsModal(true)} />
              </Stack>
              <Inset tone="info" style={{ marginTop: space.md }}>
                <Row gap={10}>
                  <Icon name="FileText" size={20} color={colors.skyInk} />
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Txt variant="small" weight={600} tone="ink" numberOfLines={1}>{ra.resumeFile}</Txt>
                    <Txt variant="caption" tone="muted">{ra.parseTime}</Txt>
                  </Stack>
                  <IconButton icon="Trash" variant="light" size={32} onPress={deleteResume} accessibilityLabel="Delete resume" />
                </Row>
              </Inset>
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon="FileText"
                tone="info"
                title={isUploadingResume ? 'Analysing your resume…' : 'Upload your resume'}
                message="PDF, DOCX or image up to 10MB. SkillSetu AI extracts projects, experience and skills."
                action={<Button label="Upload resume" icon="Upload" onPress={pickResume} loading={isUploadingResume} />}
              />
              {validationErrors.resumeFile ? <Txt variant="caption" tone="danger" align="center">{validationErrors.resumeFile}</Txt> : null}
            </Card>
          )}
        </Col>
        <Col twoCol={twoCol} flex={1.3}>
          <Card>
            <Row justify="space-between" style={{ marginBottom: space.md }}>
              <Txt variant="h3" tone="ink">Extracted from your resume</Txt>
              {ra.resumeFile ? (
                isEditingExtracted ? (
                  <Row gap={6}>
                    <Button label="Cancel" size="sm" variant="secondary" onPress={() => setIsEditingExtracted(false)} />
                    <Button label="Save" size="sm" icon="Check" onPress={saveExtractedEdits} />
                  </Row>
                ) : (
                  <Button
                    label="Edit"
                    size="sm"
                    variant="secondary"
                    icon="Pencil"
                    onPress={() => {
                      setTempProjects((ext.projects || []).map((p) => renderVal(p)).join(', '));
                      setTempCoreTechs((ext.coreTechnologies || []).map((t) => renderVal(t)).join(', '));
                      setIsEditingExtracted(true);
                    }}
                  />
                )
              ) : null}
            </Row>
            {isEditingExtracted ? (
              <Stack gap={space.md}>
                <Field label="Projects (comma separated)" multiline value={tempProjects} onChangeText={setTempProjects} />
                <Field label="Core technologies (comma separated)" multiline value={tempCoreTechs} onChangeText={setTempCoreTechs} />
              </Stack>
            ) : (
              <Stack gap={space.lg}>
                <Stack gap={8}>
                  <Row justify="space-between">
                    <Txt variant="overline" tone="subtle">Projects</Txt>
                    <Pill label={`${(ext.projects || []).length} found`} size="sm" />
                  </Row>
                  {(ext.projects || []).length ? (
                    ext.projects.map((proj, i) => (
                      <Row key={i} gap={8} align="flex-start">
                        <Icon name="CircleCheck" size={16} color={colors.mintInk} />
                        <Txt variant="small" tone="default" style={{ flex: 1 }}>{renderVal(proj)}</Txt>
                      </Row>
                    ))
                  ) : (
                    <Txt variant="small" tone="subtle">None yet</Txt>
                  )}
                </Stack>
                <Stack gap={8}>
                  <Row justify="space-between">
                    <Txt variant="overline" tone="subtle">Experience</Txt>
                    <Pill label={`${(ext.experience || []).length} found`} size="sm" />
                  </Row>
                  {(ext.experience || []).length ? (
                    ext.experience.map((exp, i) => (
                      <Row key={i} gap={8} align="flex-start">
                        <Icon name="Briefcase" size={16} color={colors.textMuted} />
                        <Stack gap={0} style={{ flex: 1 }}>
                          <Txt variant="small" weight={600} tone="ink">{renderVal(exp.title)}</Txt>
                          <Txt variant="caption" tone="muted">{[renderVal(exp.company), renderVal(exp.period)].filter(Boolean).join(' · ')}</Txt>
                        </Stack>
                      </Row>
                    ))
                  ) : (
                    <Txt variant="small" tone="subtle">None yet</Txt>
                  )}
                </Stack>
                <Stack gap={8}>
                  <Txt variant="overline" tone="subtle">Core technologies</Txt>
                  <Row wrap gap={6}>
                    {(ext.coreTechnologies || []).length ? (
                      ext.coreTechnologies.map((t, i) => <Pill key={i} label={renderVal(t)} tone="success" size="sm" />)
                    ) : (
                      <Txt variant="small" tone="subtle">None yet</Txt>
                    )}
                  </Row>
                </Stack>
                {(ext.identifiedSkillDomains || []).length ? (
                  <Stack gap={10}>
                    <Txt variant="overline" tone="subtle">Skill domains</Txt>
                    {ext.identifiedSkillDomains.map((d, i) => (
                      <Stack key={i} gap={4}>
                        <Row justify="space-between">
                          <Txt variant="small" weight={600} tone="ink">{d.name}</Txt>
                          <Txt variant="small" tone="muted">{d.value}%</Txt>
                        </Row>
                        <ProgressBar value={d.value} tone="accent" />
                      </Stack>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            )}
          </Card>
        </Col>
      </Grid>
    );
  };

  const renderSkillEvidence = (githubSkills) => (
    <Stack gap={space.sm}>
      {githubSkills.map((skill, index) => {
        const score = skill.score || skill.percentage || 0;
        const isExpanded = expandedSkillIdx === index;
        const signals = Array.isArray(skill.signals) ? skill.signals : [];
        const sources = Array.isArray(skill.evidence_sources) ? skill.evidence_sources : [];
        return (
          <Pressable key={index} onPress={() => setExpandedSkillIdx(isExpanded ? null : index)} style={[styles.evidenceRow, webOnly({ cursor: 'pointer' })]}>
            <Row justify="space-between">
              <Stack gap={0} style={{ flex: 1 }}>
                <Txt variant="small" weight={700} tone="ink">{skill.name}</Txt>
                {skill.repository_count ? <Txt variant="caption" tone="muted">In {skill.repository_count} repo{skill.repository_count > 1 ? 's' : ''}</Txt> : null}
              </Stack>
              <Pill label={skill.rating || evidenceLabel(score)} tone={score >= 85 ? 'success' : score >= 70 ? 'info' : 'neutral'} size="sm" />
              <Txt variant="small" weight={700} tone="ink" style={{ width: 44, textAlign: 'right' }}>{score}</Txt>
            </Row>
            <ProgressBar value={score} tone={score >= 85 ? 'success' : 'info'} height={6} style={{ marginTop: 8 }} />
            {isExpanded && (signals.length || sources.length) ? (
              <Stack gap={4} style={{ marginTop: 10 }}>
                {signals.length
                  ? signals.map((sig, i) => (
                      <Txt key={i} variant="caption" tone="muted">
                        • {sig.evidence_description} (+{sig.contribution_pts}) — {sig.repository_name}/{sig.file_path}
                      </Txt>
                    ))
                  : sources.map((r, i) => <Txt key={i} variant="caption" tone="muted">• {r}</Txt>)}
              </Stack>
            ) : null}
          </Pressable>
        );
      })}
    </Stack>
  );

  const renderStep5 = () => {
    const gl = currentProfile.githubLinks;
    const linkedinUrl = gl.linkedinUrl || '';
    const portfolioUrl = gl.portfolioUrl || '';
    const isValidLinkedin = linkedinUrl.trim() ? /^https?:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?$/i.test(linkedinUrl.trim()) : null;
    const isValidPortfolio = portfolioUrl.trim() ? /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(portfolioUrl.trim()) : null;
    const repositories = gl.repositories || [];
    const selectedCount = repositories.filter((r) => r.selected).length;
    const githubSkills = gl.githubSkills || [];
    const setAllSelected = (value) => {
      const updatedRepos = repositories.map((r) => ({ ...r, selected: value }));
      setProfileData((prev) => ({ ...prev, githubLinks: { ...prev.githubLinks, repositories: updatedRepos } }));
      saveSelectedRepoIds(value ? updatedRepos.map((r) => r.id) : []);
    };
    const linkStatus = (valid) => (valid === null ? <Pill label="Optional" size="sm" /> : valid ? <Pill label="Valid" tone="success" icon="Check" size="sm" /> : <Pill label="Check URL" tone="danger" size="sm" />);
    return (
      <Grid twoCol={twoCol}>
        <Col twoCol={twoCol} flex={0.85}>
          <Card>
            <Stack gap={space.md}>
              <Txt variant="h3" tone="ink">Professional links</Txt>
              <Txt variant="small" tone="muted">Shared with verified recruiters when you apply.</Txt>
              <Field label="LinkedIn" icon="Link" placeholder="https://linkedin.com/in/username" autoCapitalize="none" value={linkedinUrl} onChangeText={(v) => updateGithubLinksField('linkedinUrl', v)} right={linkStatus(isValidLinkedin)} />
              <Field label="Portfolio" icon="Globe" placeholder="https://yourportfolio.dev" autoCapitalize="none" value={portfolioUrl} onChangeText={(v) => updateGithubLinksField('portfolioUrl', v)} right={linkStatus(isValidPortfolio)} />
            </Stack>
          </Card>
          <Card tone="warning">
            <Row gap={10} align="flex-start">
              <Icon name="Info" size={18} color={colors.butterInk} />
              <Txt variant="small" color={colors.butterInk} style={{ flex: 1 }}>
                Evidence scores reflect technical signals found in the repositories you select. They are not a grade of your coding ability.
              </Txt>
            </Row>
          </Card>
        </Col>
        <Col twoCol={twoCol} flex={1.3}>
          <Card badge={{ icon: 'GitBranch', tone: gl.githubConnected ? 'success' : 'neutral' }}>
            {gl.githubConnected ? (
              <Stack gap={space.md}>
                <Row gap={space.sm} wrap>
                  <Avatar name={gl.githubUsername || 'GitHub'} size={48} tone="dark" />
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Row gap={8}>
                      <Txt variant="title" tone="ink">@{gl.githubUsername || 'github'}</Txt>
                      <Pill label="Connected" tone="success" icon="Check" size="sm" />
                    </Row>
                    <Txt variant="small" tone="muted">{repositories.length} repositories available</Txt>
                  </Stack>
                  <Row gap={6}>
                    <Button label="Refresh" icon="RefreshCw" size="sm" variant="secondary" onPress={refreshGithubRepositories} />
                    <Button label="Disconnect" size="sm" variant="danger" onPress={disconnectGithubAccount} />
                  </Row>
                </Row>
                <Divider />
                <Txt variant="h3" tone="ink">Skill evidence</Txt>
                {githubSkills.length ? (
                  renderSkillEvidence(githubSkills)
                ) : (
                  <Txt variant="small" tone="muted">Select repositories below and run Analyse to generate skill evidence.</Txt>
                )}
              </Stack>
            ) : (
              <EmptyState
                icon="GitBranch"
                title="Connect GitHub"
                message="Authorise SkillSetu to import your repositories and use the projects you pick as skill evidence."
                action={<Button label="Connect GitHub account" icon="GitBranch" onPress={connectRealGithubAccount} />}
              />
            )}
          </Card>

          {gl.githubConnected ? (
            <Card>
              <Row justify="space-between" wrap style={{ marginBottom: space.md }}>
                <Stack gap={2}>
                  <Txt variant="h3" tone="ink">Repositories</Txt>
                  <Txt variant="small" tone="muted">{selectedCount} of {repositories.length} selected as evidence</Txt>
                </Stack>
                <Row gap={6}>
                  {repositories.length ? <Button label={selectedCount === repositories.length ? 'Clear' : 'Select all'} size="sm" variant="secondary" onPress={() => setAllSelected(selectedCount !== repositories.length)} /> : null}
                  <Button label="Analyse" icon="Sparkles" size="sm" onPress={analyzeSelectedGithubRepositories} loading={isAnalyzingGithub} />
                </Row>
              </Row>
              {repositories.length ? (
                <Stack gap={8}>
                  {repositories.map((repo) => (
                    <Pressable
                      key={repo.id}
                      onPress={() => toggleRepositorySelected(repo.id)}
                      style={({ hovered }) => [styles.repoRow, repo.selected ? { backgroundColor: colors.mint } : hovered ? { backgroundColor: colors.surfaceMuted } : null, webOnly({ cursor: 'pointer' })]}
                    >
                      <View style={[styles.repoCheck, repo.selected ? { backgroundColor: colors.ink, borderColor: colors.ink } : null]}>
                        {repo.selected ? <Icon name="Check" size={13} color="#fff" strokeWidth={3} /> : null}
                      </View>
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Row justify="space-between">
                          <Txt variant="small" weight={700} tone="ink" numberOfLines={1} style={{ flex: 1 }}>{repo.name}</Txt>
                          {repo.stars !== undefined ? <Txt variant="caption" tone="muted">★ {repo.stars}</Txt> : null}
                        </Row>
                        {repo.description ? <Txt variant="caption" tone="muted" numberOfLines={2}>{repo.description}</Txt> : null}
                        {Array.isArray(repo.tags) && repo.tags.length ? (
                          <Row wrap gap={4} style={{ marginTop: 4 }}>
                            {repo.tags.map((tag) => <Pill key={tag} label={tag} size="sm" />)}
                          </Row>
                        ) : null}
                      </Stack>
                    </Pressable>
                  ))}
                </Stack>
              ) : (
                <EmptyState icon="Inbox" title="No public repositories" message="Add public repositories on GitHub, then refresh." />
              )}
            </Card>
          ) : null}
        </Col>
      </Grid>
    );
  };

  const resumeSkillCount = (currentProfile.resumeAnalysis.extractedData?.normalizedSkills || []).length || (currentProfile.resumeAnalysis.extractedData?.coreTechnologies || []).length;
  const githubSkillCount = (currentProfile.githubLinks.githubSkills || []).length;

  const renderStep6 = () => {
    const pct = calculateStepCompletionPercent();
    const cg = currentProfile.careerGoals;
    const first = currentProfile.education.list[0];
    const summary = [
      {
        title: 'Personal info',
        icon: 'User',
        step: 1,
        rows: [
          ['Name', currentProfile.personalInfo.fullName],
          ['Location', currentProfile.personalInfo.location],
          ['Experience', currentProfile.personalInfo.yearsOfExperience],
        ],
      },
      {
        title: 'Education',
        icon: 'GraduationCap',
        step: 2,
        rows: first
          ? [
              ['Degree', renderVal(first.degree)],
              ['University', renderVal(first.university)],
              ['Graduation', renderVal(first.graduationYear)],
            ]
          : [['Education', null]],
      },
      {
        title: 'Career goals',
        icon: 'Target',
        step: 3,
        rows: [
          ['Target role', cg.targetCareer],
          ['Industry', cg.industry],
          ['Timeline', (TIMELINES.find((t) => t.id === cg.timeline) || {}).label || cg.timeline],
        ],
      },
      {
        title: 'Resume & GitHub',
        icon: 'GitBranch',
        step: 5,
        rows: [
          ['Resume', currentProfile.resumeAnalysis.resumeFile ? 'Uploaded' : null],
          ['GitHub', currentProfile.githubLinks.githubConnected ? `@${currentProfile.githubLinks.githubUsername}` : null],
          ['LinkedIn', currentProfile.githubLinks.linkedinUrl ? 'Added' : null],
        ],
      },
    ];
    return (
      <Grid twoCol={twoCol}>
        <Col twoCol={twoCol} flex={1.4}>
          <Card>
            <Row justify="space-between">
              <Txt variant="h3" tone="ink">Profile completion</Txt>
              <Txt variant="h2" tone="ink">{pct}%</Txt>
            </Row>
            <ProgressBar value={pct} tone="success" height={10} style={{ marginTop: space.sm }} />
          </Card>
          <View style={[styles.summaryGrid, twoCol ? { flexDirection: 'row', flexWrap: 'wrap' } : null]}>
            {summary.map((c) => (
              <Card key={c.title} padding={space.lg} style={twoCol ? { width: '48.8%' } : null}>
                <Row justify="space-between" style={{ marginBottom: space.sm }}>
                  <Row gap={8}>
                    <Icon name={c.icon} size={17} color={colors.ink} />
                    <Txt variant="title" tone="ink">{c.title}</Txt>
                  </Row>
                  <IconButton icon="Pencil" size={32} onPress={() => setActiveStep(c.step)} accessibilityLabel={`Edit ${c.title}`} />
                </Row>
                {c.rows.map(([k, v]) => (
                  <KeyValue key={k} label={k} value={v || 'Not provided'} />
                ))}
              </Card>
            ))}
          </View>
        </Col>
        <Col twoCol={twoCol}>
          <Card tone="accent">
            <Row gap={8} style={{ marginBottom: space.md }}>
              <Icon name="Sparkles" size={18} color={colors.lilacInk} />
              <Txt variant="h3" tone="ink">AI pre-analysis</Txt>
            </Row>
            <Inset tone="accent">
              <KeyValue label="Resume score" value={currentProfile.resumeAnalysis.resumeFile ? `${currentProfile.resumeAnalysis.score || 0}/100` : 'No resume'} />
              <KeyValue label="Skills from resume" value={resumeSkillCount} />
              <KeyValue label="Skills from GitHub" value={githubSkillCount} />
              <KeyValue label="Profile confidence" value={`${calculateProfileConfidence()}%`} />
            </Inset>
          </Card>
          <Card>
            <Stack gap={space.md}>
              <Checkbox checked={isConfirmed} onChange={setIsConfirmed} label="I confirm this information is accurate." />
              <Button label="Complete profile" iconRight="ArrowRight" size="lg" block onPress={handleNext} disabled={!isConfirmed} />
              <Txt variant="caption" tone="subtle" align="center">You can edit your profile any time.</Txt>
            </Stack>
          </Card>
        </Col>
      </Grid>
    );
  };

  const STEP_INTRO = {
    1: ['Personal information', 'Your contact details and a short introduction.'],
    2: ['Education', 'Upload a marksheet and we will fill the details for you.'],
    3: ['Career goals', 'Tell SkillSetu what you are aiming for — matching and gaps use these.'],
    4: ['Resume + AI', 'Upload your resume and let SkillSetu AI build your profile.'],
    5: ['GitHub & links', 'Verify skills with real projects and add your professional links.'],
    6: ['Review & verify', 'Check everything before SkillSetu generates your career intelligence.'],
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return null;
    }
  };

  // ---------------------------------------------------------------------------
  // ATS breakdown sheet (used by wizard step 4 and profile view)
  // ---------------------------------------------------------------------------
  const diag = currentProfile.resumeAnalysis?.diagnostics || {};
  const breakdown = currentProfile.resumeAnalysis?.scoreBreakdown || {};
  const metric = (key) => (typeof diag?.[key]?.score === 'number' ? diag[key].score : typeof breakdown?.[key] === 'number' ? breakdown[key] : null);
  const diagnostics = [
    { key: 'semantic_match', label: 'Role alignment', icon: 'Target', tone: 'accent', fallback: 'How well your skills align with your target careers.' },
    { key: 'impact_quantification', label: 'Measurable impact', icon: 'TrendingUp', tone: 'success', fallback: 'Numbers and outcomes in your project and experience bullets.' },
    { key: 'technical_depth', label: 'Technical depth', icon: 'Code', tone: 'info', fallback: 'Breadth and depth of languages, frameworks and tools.' },
    { key: 'readability_ats', label: 'ATS readability', icon: 'FileText', tone: 'warning', fallback: 'How cleanly an applicant-tracking system can parse your resume.' },
  ].map((d) => ({ ...d, score: metric(d.key), description: diag?.[d.key]?.description || d.fallback }));

  const atsSheet = (
    <Sheet visible={showAtsModal} onClose={() => setShowAtsModal(false)} title="Resume analysis" subtitle={currentProfile.resumeAnalysis?.resumeFile} icon="FileText" tone="info">
      <Row gap={space.lg}>
        <Ring value={currentProfile.resumeAnalysis?.score || 0} size={92} stroke={9} tone="info">
          <Txt variant="h2" tone="ink">{currentProfile.resumeAnalysis?.score || 0}</Txt>
        </Ring>
        <Txt variant="body" tone="muted" style={{ flex: 1 }}>
          {currentProfile.resumeAnalysis?.scoreText || diag?.synthesis_note || 'Upload a resume to get a full analysis.'}
        </Txt>
      </Row>
      {diagnostics.map((d) => (
        <Card key={d.key} padding={space.lg}>
          <Row justify="space-between">
            <Row gap={8}>
              <Icon name={d.icon} size={17} color={toneOf(d.tone).ink} />
              <Txt variant="title" tone="ink">{d.label}</Txt>
            </Row>
            <Txt variant="title" tone="ink">{d.score != null ? `${d.score}/100` : '—'}</Txt>
          </Row>
          <ProgressBar value={d.score || 0} tone={d.tone} style={{ marginVertical: 8 }} />
          <Txt variant="small" tone="muted">{d.description}</Txt>
        </Card>
      ))}
    </Sheet>
  );

  // ---------------------------------------------------------------------------
  // One-page profile view
  // ---------------------------------------------------------------------------
  if (isViewingOnePageProfile) {
    const handleReanalyzeCV = async () => {
      setIsReanalyzingResume(true);
      try {
        if (user?.email) {
          const res = await fetch(`${API_BASE}/student/reanalyze-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email.trim() }),
          });
          const resData = await res.json();
          if (res.ok && resData.status === 'success') {
            const extData = resData.extracted_data || {};
            setProfileData(prev => ({
              ...prev,
              resumeAnalysis: {
                ...prev.resumeAnalysis,
                resumeFile: resData.resume_file || prev.resumeAnalysis?.resumeFile,
                parseTime: resData.parse_time || prev.resumeAnalysis?.parseTime,
                score: typeof resData.score === 'number' ? resData.score : (resData.resume_score ?? prev.resumeAnalysis?.score),
                scoreText: resData.score_text || prev.resumeAnalysis?.scoreText,
                scoreBreakdown: resData.score_breakdown || prev.resumeAnalysis?.scoreBreakdown,
                diagnostics: resData.diagnostics || prev.resumeAnalysis?.diagnostics,
                extractedData: {
                  ...prev.resumeAnalysis?.extractedData,
                  ...extData,
                },
                roleFit: resData.role_fit || prev.resumeAnalysis?.roleFit,
                skillsetValue: resData.skillsetu_value || prev.resumeAnalysis?.skillsetValue,
              },
            }));
            if (updateUser) {
              updateUser({
                ...user,
                resume_score: typeof resData.score === 'number' ? resData.score : user.resume_score,
              });
            }
            alert('Resume re-analysed with your latest details.');
          } else {
            alert(resData.detail || 'Could not re-analyze resume. Please ensure a CV is uploaded.');
          }
        }
      } catch (err) {
        console.error('Error reanalyzing CV:', err);
        alert('Network error while re-analyzing CV. Please try again.');
      } finally {
        setIsReanalyzingResume(false);
      }
    };

    const p = currentProfile.personalInfo;
    const cg = currentProfile.careerGoals;
    const gl = currentProfile.githubLinks;
    const ra = currentProfile.resumeAnalysis;
    const first = currentProfile.education.list[0] || {};
    const name = p.fullName || user?.name || 'Student';
    const university = renderVal(first.university) || user?.university || '';
    const degree = [renderVal(first.degree) || user?.degree, renderVal(first.branch) || user?.branch].filter(Boolean).join(' · ');
    const careerIds = cg.targetCareerIds && cg.targetCareerIds.length ? cg.targetCareerIds : cg.targetCareer ? [cg.targetCareer] : [];
    const careers = careerIds.map((id) => careerName(id)).filter(Boolean);
    const resumeScore = typeof ra.score === 'number' && ra.resumeFile ? ra.score : user?.resume_score ? Number(user.resume_score) : null;
    const githubSkills = gl.githubSkills || [];
    const techs = (ra.extractedData?.coreTechnologies || []).map((t) => renderVal(t));
    const repos = (gl.repositories || []).filter((r) => r.selected).length ? gl.repositories.filter((r) => r.selected) : gl.repositories || [];
    const editProfile = (step = 1) => {
      setActiveStep(step);
      setIsViewingOnePageProfile(false);
    };
    const links = [
      gl.linkedinUrl || user?.linkedin_url ? { icon: 'Link', label: 'LinkedIn', url: gl.linkedinUrl || user?.linkedin_url } : null,
      gl.portfolioUrl || user?.portfolio_url ? { icon: 'Globe', label: 'Portfolio', url: gl.portfolioUrl || user?.portfolio_url } : null,
      gl.githubConnected && gl.githubUsername ? { icon: 'GitBranch', label: `@${gl.githubUsername}`, url: `https://github.com/${gl.githubUsername}` } : null,
    ].filter(Boolean);

    const aside = (
      <>
        <SectionTitle title="At a glance" emoji="🧭" />
        <EventCard
          tone="accent"
          icon="Target"
          type="Career goals"
          date={(TIMELINES.find((t) => t.id === cg.timeline) || {}).label || ''}
          title={careers.length ? careers.join(' · ') : 'No target role yet'}
          body={cg.careerGoal || 'Add a career goal so your mentor and matches can personalise guidance.'}
          footer={
            <Pressable onPress={() => editProfile(3)} style={[styles.footerLink, webOnly({ cursor: 'pointer' })]}>
              <Icon name="Pencil" size={14} color={colors.ink} />
              <Txt variant="small" weight={600} tone="ink">Edit goals</Txt>
            </Pressable>
          }
        />
        <EventCard
          tone="warning"
          icon="GraduationCap"
          type="Education"
          date={first.graduationYear ? `Class of ${renderVal(first.graduationYear)}` : ''}
          title={degree || 'Education not added'}
          body={[university, currentProfile.education.cgpaDetected && currentProfile.education.cgpaDetected !== 'Detected' ? `CGPA ${renderVal(currentProfile.education.cgpaDetected)}` : user?.cgpa_or_percentage ? `CGPA ${user.cgpa_or_percentage}` : null].filter(Boolean).join(' · ') || 'Upload a marksheet to verify your education.'}
        />
        <EventCard
          tone="info"
          icon="Link"
          type="Links"
          body={links.length ? null : 'Add LinkedIn, a portfolio or connect GitHub.'}
          title={links.length ? `${links.length} profile${links.length > 1 ? 's' : ''} linked` : 'No links yet'}
          footer={
            links.length ? (
              <Row gap={6} wrap justify="center">
                {links.map((l) => (
                  <Pressable key={l.label} onPress={() => openUrl(l.url)} style={[styles.linkChip, webOnly({ cursor: 'pointer' })]}>
                    <Icon name={l.icon} size={13} color={colors.ink} />
                    <Txt variant="caption" weight={600} tone="ink">{l.label}</Txt>
                  </Pressable>
                ))}
              </Row>
            ) : (
              <Pressable onPress={() => editProfile(5)} style={[styles.footerLink, webOnly({ cursor: 'pointer' })]}>
                <Icon name="Plus" size={14} color={colors.ink} />
                <Txt variant="small" weight={600} tone="ink">Add links</Txt>
              </Pressable>
            )
          }
        />
        {studentApplications.slice(0, 3).map((a, i) => (
          <EventCard
            key={a.id || i}
            tone="success"
            icon="Briefcase"
            type={a.status || 'Application'}
            date={a.dateApplied ? a.dateApplied.replace(/, \d{4}$/, '') : ''}
            title={`${a.role || a.title || 'Internship'} · ${a.company || a.company_name || ''}`}
            body={a.nextAction}
          />
        ))}
      </>
    );

    return (
      <Page aside={aside}>
        <Card padding={isTablet ? space.xxl : space.lg}>
          <Row gap={space.lg} align="flex-start" wrap>
            <View>
              <Avatar name={name} uri={p.profileImage || user?.profile_image || undefined} size={isTablet ? 112 : 84} />
              {currentProfile.verified ? (
                <View style={styles.verifiedDot}>
                  <Icon name="Check" size={14} color="#fff" strokeWidth={3} />
                </View>
              ) : null}
            </View>
            <Stack gap={8} style={{ flex: 1, minWidth: 240 }}>
              <Row gap={10} wrap>
                <Txt variant="display" tone="ink">{name}</Txt>
                {currentProfile.verified ? <Pill label="Verified" tone="success" icon="ShieldCheck" size="sm" /> : <Pill label="Not verified yet" tone="warning" size="sm" />}
              </Row>
              <Txt variant="title" tone="muted">{p.headline || user?.headline || (careers[0] ? `Aspiring ${careers[0]}` : 'Add a headline')}</Txt>
              <Row gap={8} wrap>
                {p.location || user?.location ? <Pill label={p.location || user?.location} icon="MapPin" size="sm" /> : null}
                {university ? <Pill label={university} icon="Building" size="sm" /> : null}
                {p.yearsOfExperience ? <Pill label={p.yearsOfExperience} icon="Briefcase" size="sm" /> : null}
                {p.email || user?.email ? <Pill label={p.email || user?.email} icon="Mail" size="sm" /> : null}
              </Row>
            </Stack>
            <Row gap={8}>
              <Button label="Edit profile" icon="Pencil" onPress={() => editProfile(1)} />
              <IconButton icon="Send" size={44} onPress={() => setShowShareModal(true)} accessibilityLabel="Share profile" />
            </Row>
          </Row>
          {p.bio || user?.bio ? (
            <Inset tone="neutral" style={{ marginTop: space.lg }}>
              <Txt variant="body" tone="default">{p.bio || user?.bio}</Txt>
            </Inset>
          ) : null}
        </Card>

        <StatTrio
          items={[
            { value: resumeScore != null ? resumeScore : '—', label: 'Resume score', tone: 'info' },
            { value: githubSkills.length || techs.length, label: 'Evidenced skills', tone: 'success' },
            { value: studentApplications.length, label: 'Applications', dashed: true },
          ]}
        />

        <Card badge={{ icon: 'Sparkles', tone: 'accent' }}>
          <Row justify="space-between" align="flex-start" wrap gap={space.md}>
            <Stack gap={4} style={{ flex: 1, minWidth: 220 }}>
              <Txt variant="h2" tone="ink">Resume analysis</Txt>
              <Txt variant="body" tone="muted">
                {ra.resumeFile ? ra.scoreText || diag?.synthesis_note || 'Diagnostics from your latest resume.' : 'Upload a resume to unlock ATS and role-fit diagnostics.'}
              </Txt>
            </Stack>
            <Ring value={resumeScore || 0} size={88} stroke={9} tone="accent">
              <Txt variant="h2" tone="ink">{resumeScore != null ? resumeScore : '—'}</Txt>
            </Ring>
          </Row>
          <View style={[styles.metricGrid, twoCol ? { flexDirection: 'row', flexWrap: 'wrap' } : null]}>
            {diagnostics.map((d) => (
              <View key={d.key} style={[styles.metricCell, { backgroundColor: toneOf(d.tone).bg }, twoCol ? { width: '48.9%' } : null]}>
                <Row justify="space-between">
                  <Row gap={6}>
                    <Icon name={d.icon} size={15} color={toneOf(d.tone).ink} />
                    <Txt variant="small" weight={600} tone="ink">{d.label}</Txt>
                  </Row>
                  <Txt variant="small" weight={700} tone="ink">{d.score != null ? d.score : '—'}</Txt>
                </Row>
                <ProgressBar value={d.score || 0} tone={d.tone} track="rgba(255,255,255,0.7)" height={6} style={{ marginTop: 8 }} />
              </View>
            ))}
          </View>
          <Row gap={8} style={{ marginTop: space.lg }}>
            {ra.resumeFile ? (
              <>
                <Button label="Full breakdown" icon="Eye" size="sm" onPress={() => setShowAtsModal(true)} />
                <Button label="Re-analyse" icon="RefreshCw" size="sm" variant="secondary" onPress={handleReanalyzeCV} loading={isReanalyzingResume} />
              </>
            ) : (
              <Button label="Upload resume" icon="Upload" size="sm" onPress={() => editProfile(4)} />
            )}
          </Row>
        </Card>

        <View style={[styles.grid, isWide ? styles.gridRow : null]}>
          <View style={isWide ? { flex: 1, minWidth: 0 } : null}>
            <Card badge={{ icon: 'Zap', tone: 'success' }}>
              <Txt variant="h2" tone="ink">Skill evidence</Txt>
              <Txt variant="small" tone="muted" style={{ marginBottom: space.md }}>
                {githubSkills.length ? 'Signals found in the repositories you selected.' : 'Skills extracted from your resume.'}
              </Txt>
              {githubSkills.length ? (
                renderSkillEvidence(githubSkills.slice(0, 8))
              ) : techs.length ? (
                <Row wrap gap={6}>
                  {techs.map((t, i) => <Pill key={`${t}-${i}`} label={t} tone="success" size="sm" />)}
                </Row>
              ) : (
                <EmptyState icon="Zap" title="No skill evidence yet" message="Upload a resume or connect GitHub to build evidence." action={<Button label="Add evidence" size="sm" onPress={() => editProfile(4)} />} />
              )}
            </Card>
          </View>
          <View style={isWide ? { flex: 1, minWidth: 0 } : null}>
            <Card badge={{ icon: 'GitBranch', tone: 'neutral' }}>
              <Txt variant="h2" tone="ink">Projects on GitHub</Txt>
              <Txt variant="small" tone="muted" style={{ marginBottom: space.md }}>
                {gl.githubConnected ? `${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'} used as evidence` : 'Not connected'}
              </Txt>
              {gl.githubConnected && repos.length ? (
                <Stack gap={8}>
                  {repos.slice(0, 6).map((repo) => (
                    <Pressable
                      key={repo.id}
                      onPress={() => openUrl(repo.html_url || (gl.githubUsername ? `https://github.com/${gl.githubUsername}/${repo.name}` : ''))}
                      style={({ hovered }) => [styles.repoRow, hovered ? { backgroundColor: colors.surfaceMuted } : null, webOnly({ cursor: 'pointer' })]}
                    >
                      <Icon name="Code" size={18} color={colors.textMuted} />
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{repo.name}</Txt>
                        {repo.description ? <Txt variant="caption" tone="muted" numberOfLines={1}>{repo.description}</Txt> : null}
                      </Stack>
                      {repo.language ? <Pill label={repo.language} size="sm" tone="info" /> : null}
                      <Icon name="ArrowUpRight" size={16} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </Stack>
              ) : (
                <EmptyState icon="GitBranch" title={gl.githubConnected ? 'No repositories selected' : 'Connect GitHub'} message="Real projects are the strongest evidence for recruiters." action={<Button label={gl.githubConnected ? 'Select repositories' : 'Connect GitHub'} size="sm" onPress={() => editProfile(5)} />} />
              )}
            </Card>
          </View>
        </View>

        {atsSheet}
        <ShareSheet
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          url={Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/dossier/${user?.id || ''}` : ''}
        />
      </Page>
    );
  }

  // ---------------------------------------------------------------------------
  // Wizard layout
  // ---------------------------------------------------------------------------
  const [introTitle, introSub] = STEP_INTRO[activeStep] || ['', ''];
  return (
    <Page scrollKey={activeStep}>
      <SectionTitle
        title={currentProfile.verified ? 'Edit your profile' : 'Set up your profile'}
        emoji="🪪"
        subtitle={currentProfile.verified ? 'Keep your details current so matches stay accurate.' : 'Six quick steps to unlock matches and verification.'}
        right={currentProfile.verified ? <Button label="Back to profile" icon="X" variant="secondary" onPress={() => setIsViewingOnePageProfile(true)} /> : null}
      />
      <Stepper
        steps={stepsList.map((s) => ({ id: s.id, label: s.name }))}
        active={activeStep}
        doneUntil={currentProfile.verified ? 6 : activeStep - 1}
        compact={!isWide}
        onStep={(id) => {
          if (currentProfile.verified || id < activeStep) setActiveStep(id);
        }}
      />
      <Stack gap={4}>
        <Txt variant="h2" tone="ink">{introTitle}</Txt>
        <Txt variant="body" tone="muted">{introSub}</Txt>
      </Stack>
      {renderStepContent()}
      {activeStep !== 6 ? (
        <Row justify="space-between">
          <Button label="Back" icon="ArrowLeft" variant="secondary" onPress={handleBack} disabled={activeStep === 1} />
          <Button label="Save & continue" iconRight="ArrowRight" onPress={handleNext} />
        </Row>
      ) : null}
      {atsSheet}
    </Page>
  );
}

const TIMELINES = [
  { id: 'immediately', label: 'Immediately' },
  { id: 'within_1_month', label: 'Within 1 month' },
  { id: '1_to_3_months', label: '1–3 months' },
  { id: '3_to_6_months', label: '3–6 months' },
  { id: '6_to_12_months', label: '6–12 months' },
  { id: '12_plus_months', label: '12+ months' },
];

const OPPORTUNITY_TYPES = [
  { id: 'internship', label: 'Internship' },
  { id: 'fulltime', label: 'Full-time' },
  { id: 'parttime', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
];

const WORK_PREFS = [
  { id: 'remote', label: 'Remote', icon: 'House' },
  { id: 'hybrid', label: 'Hybrid', icon: 'RefreshCw' },
  { id: 'onsite', label: 'On-site', icon: 'Building' },
];

function Grid({ twoCol, children }) {
  return <View style={[styles.grid, twoCol ? styles.gridRow : null]}>{children}</View>;
}

function Col({ twoCol, flex = 1, children }) {
  return <View style={twoCol ? { flex, minWidth: 0, gap: space.md } : { gap: space.md }}>{children}</View>;
}

function ShareSheet({ visible, onClose, url }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      alert(url);
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Share your profile" subtitle="Send this link to recruiters or mentors." icon="Send" tone="success" width={520}>
      <Field icon="Link" value={url} editable={false} />
      <Button label={copied ? 'Copied' : 'Copy link'} icon={copied ? 'Check' : 'Link'} onPress={copy} />
    </Sheet>
  );
}

function evidenceLabel(score) {
  if (score >= 85) return 'Very strong';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Good';
  return 'Emerging';
}

const styles = StyleSheet.create({
  grid: {
    gap: space.md,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryGrid: {
    gap: space.md,
    justifyContent: 'space-between',
  },
  evidenceRow: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: space.sm,
  },
  repoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  repoCheck: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricGrid: {
    gap: space.sm,
    marginTop: space.lg,
    justifyContent: 'space-between',
  },
  metricCell: {
    borderRadius: radii.md,
    padding: space.md,
  },
  verifiedDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
});
