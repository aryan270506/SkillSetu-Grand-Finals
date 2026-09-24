import { DEFAULT_MOCK_PROFILE } from '../Profile/Profile';

const renderVal = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return '';
  return String(val);
};

export const createInitialProfile = (user, existingProfileData = null) => {
  if (!user || !user.email) {
    return existingProfileData || DEFAULT_MOCK_PROFILE;
  }

  const pInfo = existingProfileData?.personalInfo || {};
  const edu = existingProfileData?.education || {};

  let resumeExtracted = existingProfileData?.resumeAnalysis?.extractedData || {
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
  };

  if (user.resume_data) {
    try {
      const parsed = typeof user.resume_data === 'string' ? JSON.parse(user.resume_data) : user.resume_data;
      if (parsed?.extracted_data) {
        resumeExtracted = {
          projects: parsed.extracted_data.projects || [],
          rawProjects: parsed.extracted_data.raw_projects || [],
          experience: parsed.extracted_data.experience || [],
          coreTechnologies: parsed.extracted_data.coreTechnologies || [],
          normalizedSkills: parsed.extracted_data.normalized_skills || [],
          identifiedSkillDomains: parsed.extracted_data.identifiedSkillDomains || [],
          education: parsed.extracted_data.education || [],
          certifications: parsed.extracted_data.certifications || [],
          achievements: parsed.extracted_data.achievements || [],
          links: parsed.extracted_data.links || {},
        };
      }
    } catch (e) {
      console.error('Error parsing user.resume_data in createInitialProfile:', e);
    }
  }

  const userTargetCareers = user.target_careers && Array.isArray(user.target_careers) ? user.target_careers : [];
  const primaryTargetCareer = user.target_role || (userTargetCareers.length > 0 ? userTargetCareers[0] : (user.headline || ''));

  return {
    personalInfo: {
      fullName: user.name || pInfo.fullName || '',
      email: user.email || pInfo.email || '',
      phone: user.phone || pInfo.phone || '',
      headline: user.headline || pInfo.headline || '',
      location: user.location || pInfo.location || '',
      yearsOfExperience: user.years_of_experience || pInfo.yearsOfExperience || '',
      bio: user.bio || pInfo.bio || '',
      profileImage: user.profile_image || pInfo.profileImage || '',
    },
    education: {
      hasExtractedMarksheet: edu.hasExtractedMarksheet || Boolean(user.degree || user.university),
      marksheetFileName: edu.marksheetFileName || (user.degree ? 'academic_marksheet.pdf' : ''),
      cgpaDetected: renderVal(user.cgpa_or_percentage) || edu.cgpaDetected || '',
      universityDetected: renderVal(user.university) || edu.universityDetected || '',
      academicYearDetected: (user.start_year && user.graduation_year) ? `${renderVal(user.start_year)} - ${renderVal(user.graduation_year)}` : (renderVal(user.graduation_year) || edu.academicYearDetected || ''),
      list: (user.degree || user.university) ? [
        {
          id: 'edu_user_db',
          degree: renderVal(user.degree),
          branch: renderVal(user.branch),
          university: renderVal(user.university),
          startYear: renderVal(user.start_year),
          graduationYear: renderVal(user.graduation_year),
          cgpa: renderVal(user.cgpa_or_percentage),
        }
      ] : (edu.list || []),
    },
    careerGoals: {
      targetCareer: primaryTargetCareer || existingProfileData?.careerGoals?.targetCareer || '',
      targetCareerIds: userTargetCareers.length > 0 ? userTargetCareers : (existingProfileData?.careerGoals?.targetCareerIds || []),
      preferredLocations: user.location ? [user.location] : (existingProfileData?.careerGoals?.preferredLocations || []),
      careerInterests: existingProfileData?.careerGoals?.careerInterests || [],
      opportunityTypes: existingProfileData?.careerGoals?.opportunityTypes || [],
      workPreferences: existingProfileData?.careerGoals?.workPreferences || [],
      industry: existingProfileData?.careerGoals?.industry || '',
      timeline: existingProfileData?.careerGoals?.timeline || '',
      careerGoal: existingProfileData?.careerGoals?.careerGoal || '',
    },
    resumeAnalysis: {
      resumeFile: user.resume_url ? user.resume_url.split('/').pop().replace(/^[0-9a-zA-Z_]+@.*\.com_/, '') : (existingProfileData?.resumeAnalysis?.resumeFile || ''),
      parseTime: user.resume_url ? 'Saved in DB' : (existingProfileData?.resumeAnalysis?.parseTime || ''),
      score: user.resume_score || existingProfileData?.resumeAnalysis?.score || 0,
      scoreText: (user.resume_data && typeof user.resume_data === 'string' && JSON.parse(user.resume_data).score_text) || existingProfileData?.resumeAnalysis?.scoreText || '',
      scoreBreakdown: (user.resume_data && typeof user.resume_data === 'string' && JSON.parse(user.resume_data).score_breakdown) || existingProfileData?.resumeAnalysis?.scoreBreakdown || {},
      extractedData: resumeExtracted,
    },
    githubLinks: {
      linkedinUrl: user.linkedin_url || existingProfileData?.githubLinks?.linkedinUrl || '',
      portfolioUrl: user.portfolio_url || existingProfileData?.githubLinks?.portfolioUrl || '',
      githubUsername: existingProfileData?.githubLinks?.githubUsername || '',
      githubConnected: existingProfileData?.githubLinks?.githubConnected || false,
      githubMetrics: existingProfileData?.githubLinks?.githubMetrics || { reposAnalyzed: 0, projectsDetected: 0 },
      githubSkills: existingProfileData?.githubLinks?.githubSkills || [],
      repositories: existingProfileData?.githubLinks?.repositories || [],
    },
    verified: existingProfileData?.verified || false,
  };
};

export const fetchCompleteStudentProfile = async (user, setProfileData) => {
  if (!user || !user.email) return;

  const emailQuery = encodeURIComponent(user.email.trim());

  // 1. Fetch saved career goals & selections from PostgreSQL database
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/taxonomy/student/career-goals?email=${emailQuery}`);
    const resData = await res.json();
    if (res.ok && resData.status === 'success' && resData.data) {
      const d = resData.data;
      setProfileData(prev => ({
        ...prev,
        careerGoals: {
          ...prev.careerGoals,
          targetCareer: d.target_career || (d.target_career_ids && d.target_career_ids[0]) || prev.careerGoals.targetCareer || '',
          targetCareerId: d.target_career_id || '',
          targetCareerIds: d.target_career_ids || (prev.careerGoals.targetCareerIds || []),
          targetIndustryId: d.target_industry_id || '',
          targetIndustryIds: d.target_industry_ids || [],
          timeline: d.timeline || prev.careerGoals.timeline || '',
          careerGoal: d.career_goal_text || prev.careerGoals.careerGoal || '',
          skillIds: d.skill_ids || [],
          preferredLocationIds: d.preferred_location_ids || [],
          opportunityTypes: d.opportunity_types || [],
          workPreferences: d.work_preferences || [],
        }
      }));
    }
  } catch (err) {
    console.error('Error fetching stored career goals from DB:', err);
  }

  // 2. Fetch stored GitHub connection status from Backend API
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/github/status?email=${emailQuery}`);
    const resData = await res.json();
    if (res.ok && resData.status === 'success' && resData.connection) {
      const conn = resData.connection;
      if (conn.connected) {
        setProfileData(prev => ({
          ...prev,
          githubLinks: {
            ...prev.githubLinks,
            githubUrl: conn.profile_url || `https://github.com/${conn.username}`,
            githubUsername: conn.username || '',
            githubConnected: true,
            githubMetrics: conn.metrics || { reposAnalyzed: (conn.repositories || []).length, projectsDetected: 0 },
            githubSkills: conn.skills || [],
            repositories: conn.repositories || [],
          }
        }));
      } else {
        setProfileData(prev => ({
          ...prev,
          githubLinks: {
            ...prev.githubLinks,
            githubUrl: '',
            githubUsername: '',
            githubConnected: false,
            githubMetrics: { reposAnalyzed: 0, projectsDetected: 0 },
            githubSkills: [],
            repositories: [],
          }
        }));
      }
    }
  } catch (err) {
    console.error('Error fetching GitHub status from DB:', err);
  }

  // 3. Fetch stored resume data from Backend API
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/student/resume-data?email=${emailQuery}`);
    const resData = await res.json();
    if (res.ok && resData.status === 'success' && resData.has_resume && resData.resume_data) {
      const rData = resData.resume_data;
      const extData = rData.extracted_data || {};
      const fileName = resData.resume_url ? resData.resume_url.split('/').pop().replace(/^[0-9a-zA-Z_]+@.*\.com_/, '') : (rData.resume_file || 'resume.pdf');

      setProfileData(prev => ({
        ...prev,
        resumeAnalysis: {
          resumeFile: fileName,
          parseTime: rData.parse_time || 'Saved in DB',
          score: resData.resume_score || rData.score || 0,
          scoreText: rData.score_text || 'Resume parsed & stored in DB',
          scoreBreakdown: rData.score_breakdown || {},
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
          }
        }
      }));
    }
  } catch (err) {
    console.error('Error fetching stored resume data from DB:', err);
  }
};
