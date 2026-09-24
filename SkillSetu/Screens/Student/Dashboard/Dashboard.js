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
import { calculateSkillIndex } from './skillIndexCalculator';

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

function HoverableCard({ children, style, containerStyle, ...props }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const handleHoverIn = () => {
    if (Platform.OS === 'web') {
      const isReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isReduced) return;

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.04,
          friction: 8,
          tension: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shadow, {
          toValue: 1,
          duration: 250,
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
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  };

  const shadowOpacity = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.02, 0.12],
  });

  const shadowRadius = shadow.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 20],
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
    shadowOffset: { width: 0, height: 6 },
    zIndex: scale.interpolate({
      inputRange: [1, 1.04],
      outputRange: [1, 10],
    }),
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

export default function Dashboard({ user, profileCompletion, onNavigateToProfile, profileData, setProfileData }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;

  const displayName = user?.name || 'Aryan';

  // GitHub Analysis Real Data States
  const [githubState, setGithubState] = useState({
    loading: true,
    error: false,
    connected: false,
    reposAnalyzed: 0,
    skills: [],
    username: '',
  });

  const [selectedSkillModal, setSelectedSkillModal] = useState(null);
  const [isSkillIndexModalOpen, setIsSkillIndexModalOpen] = useState(false);
  const [activeEvidencePop, setActiveEvidencePop] = useState(null);
  const [showAllSkills, setShowAllSkills] = useState(false);

  // Action plan states
  const [actions, setActions] = useState([
    { id: 1, text: 'Complete Docker basics module', completed: true },
    { id: 2, text: 'Apply to TechWave Internship', completed: true },
    { id: 3, text: 'Take technical mock interview', completed: false },
    { id: 4, text: 'Update resume with new Python project', completed: false },
  ]);

  // Fetch real GitHub analysis from Backend API
  const fetchGithubAnalysis = React.useCallback(async () => {
    if (!user || !user.email) return;
    setGithubState(prev => ({ ...prev, loading: true, error: false }));

    try {
      const emailQuery = encodeURIComponent(user.email.trim());
      const res = await fetch(`http://127.0.0.1:8000/api/v1/github/status?email=${emailQuery}`);
      const data = await res.json();

      if (res.ok && data.status === 'success' && data.connection) {
        const conn = data.connection;
        if (conn.connected) {
          // If skills exist or can be analyzed
          let skillsList = conn.skills || [];

          // If no analyzed skills present, trigger analyze-selected
          if ((!skillsList || skillsList.length === 0) && conn.repositories && conn.repositories.length > 0) {
            try {
              const analyzeRes = await fetch('http://127.0.0.1:8000/api/v1/github/analyze-selected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: user.email.trim(),
                  selected_repo_ids: conn.repositories.map(r => String(r.id))
                })
              });
              const analyzeData = await analyzeRes.json();
              if (analyzeRes.ok && analyzeData.skills) {
                skillsList = analyzeData.skills;
              }
            } catch (err) {
              console.error('Error auto-analyzing GitHub repositories:', err);
            }
          }

          setGithubState({
            loading: false,
            error: false,
            connected: true,
            reposAnalyzed: conn.metrics?.reposAnalyzed || (conn.repositories || []).length,
            skills: skillsList,
            username: conn.username || '',
          });
        } else {
          setGithubState({
            loading: false,
            error: false,
            connected: false,
            reposAnalyzed: 0,
            skills: [],
            username: '',
          });
        }
      } else {
        setGithubState({
          loading: false,
          error: true,
          connected: false,
          reposAnalyzed: 0,
          skills: [],
          username: '',
        });
      }
    } catch (err) {
      console.error('Error fetching GitHub analysis for Student Dashboard:', err);
      setGithubState({
        loading: false,
        error: true,
        connected: false,
        reposAnalyzed: 0,
        skills: [],
        username: '',
      });
    }
  }, [user]);

  React.useEffect(() => {
    fetchGithubAnalysis();
  }, [fetchGithubAnalysis]);

  const [isSkillGapAnalysisModalOpen, setIsSkillGapAnalysisModalOpen] = useState(false);
  const [gapAnalysisTab, setGapAnalysisTab] = useState('combined');

  // Selected Target Careers derivation (supporting multiple target career goals)
  const activeTargetCareers = React.useMemo(() => {
    let list = [];
    if (profileData?.careerGoals?.targetCareerIds && Array.isArray(profileData.careerGoals.targetCareerIds) && profileData.careerGoals.targetCareerIds.length > 0) {
      list = profileData.careerGoals.targetCareerIds;
    } else if (profileData?.careerGoals?.targetCareer) {
      list = [profileData.careerGoals.targetCareer];
    } else if (user?.target_careers && Array.isArray(user.target_careers) && user.target_careers.length > 0) {
      list = user.target_careers;
    } else if (user?.target_role) {
      list = [user.target_role];
    } else if (user?.headline) {
      list = [user.headline];
    } else {
      list = ['Backend Developer'];
    }

    const result = [];
    const seen = new Set();
    for (const item of list) {
      if (!item) continue;
      const str = String(item).trim();
      if (str && !seen.has(str.toLowerCase())) {
        seen.add(str.toLowerCase());
        result.push(str);
      }
    }
    return result.length > 0 ? result : ['Backend Developer'];
  }, [profileData, user]);

  const activeTargetCareer = activeTargetCareers[0] || 'Backend Developer';

  // State to hold Backend calculated skill gap response
  const [backendGapData, setBackendGapData] = useState(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchSkillGaps = async () => {
      try {
        const emailQuery = encodeURIComponent(user?.email || '');
        const careerQueryParams = activeTargetCareers.map(c => `target_careers=${encodeURIComponent(c)}`).join('&');
        const res = await fetch(`http://127.0.0.1:8000/api/v1/student/career-skill-gaps?email=${emailQuery}&${careerQueryParams}`);
        const data = await res.json();
        if (isMounted && res.ok && data.status === 'success' && data.data) {
          setBackendGapData(data.data);
        }
      } catch (err) {
        console.error('Error fetching career skill gaps:', err);
      }
    };
    fetchSkillGaps();
    return () => { isMounted = false; };
  }, [user?.email, activeTargetCareers, githubState.skills]);

  // ESCO Multi-Career Skill Gap Computation with deterministic fallback
  const computedGapData = React.useMemo(() => {
    if (backendGapData && backendGapData.top_gaps && backendGapData.top_gaps.length > 0) {
      return backendGapData;
    }

    const MINOR_DEPS = new Set([
      'zod', 'sonner', 'vaul', 'lucide-react', 'next-themes', 'input-otp',
      'clsx', 'tailwind-merge', 'class-variance-authority', 'radix-ui',
      'lucide', 'react-dom', 'framer-motion', 'embla-carousel-react'
    ]);

    const ALIAS_MAP = {
      'react.js': 'React', 'reactjs': 'React', 'react js': 'React', 'react': 'React',
      'react-native': 'React Native', 'reactnative': 'React Native', 'react native': 'React Native',
      'node.js': 'Node.js', 'nodejs': 'Node.js', 'node': 'Node.js', 'node js': 'Node.js',
      'postgres': 'PostgreSQL', 'postgresql db': 'PostgreSQL', 'postgresql': 'PostgreSQL',
      'amazon web services': 'AWS', 'aws cloud': 'AWS', 'aws': 'AWS',
      'py': 'Python', 'python3': 'Python', 'python 3': 'Python', 'python': 'Python',
      'ts': 'TypeScript', 'typescript': 'TypeScript',
      'js': 'JavaScript', 'ecmascript': 'JavaScript', 'javascript': 'JavaScript',
      'git & github': 'Git', 'github': 'Git', 'git': 'Git',
      'rest api': 'REST APIs', 'restful apis': 'REST APIs', 'rest': 'REST APIs',
      'docker containers': 'Docker', 'docker': 'Docker',
      'mongo': 'MongoDB', 'mongodb': 'MongoDB',
      'k8s': 'Kubernetes', 'kubernetes': 'Kubernetes',
      'fastapi': 'FastAPI', 'express': 'Express', 'sql': 'SQL',
      'html & css': 'HTML & CSS', 'machine learning': 'Machine Learning',
      'figma': 'Figma', 'ui/ux design': 'UI/UX Design'
    };

    const normSkill = (raw) => {
      if (!raw) return '';
      const cl = raw.trim().toLowerCase();
      if (MINOR_DEPS.has(cl)) return '';
      return ALIAS_MAP[cl] || raw.trim();
    };

    const getIcon = (sName) => {
      const l = sName.toLowerCase();
      if (l.includes('docker')) return '🐳';
      if (l.includes('postgres')) return '🐘';
      if (l.includes('aws') || l.includes('cloud')) return '☁️';
      if (l.includes('react native')) return '📱';
      if (l.includes('react')) return '⚛️';
      if (l.includes('node')) return '🟢';
      if (l.includes('python')) return '🐍';
      if (l.includes('sql') || l.includes('database')) return '🗄️';
      if (l.includes('mongo')) return '🍃';
      if (l.includes('redis') || l.includes('api')) return '⚡';
      if (l.includes('git')) return '📦';
      if (l.includes('kubernetes') || l.includes('k8s')) return '☸️';
      if (l.includes('typescript') || l.includes('ts')) return '🟦';
      if (l.includes('javascript') || l.includes('js')) return '🟨';
      if (l.includes('figma') || l.includes('design')) return '🎨';
      if (l.includes('machine learning') || l.includes('ai')) return '🤖';
      return '🚀';
    };

    const OCC_SKILLS = {
      'backend developer': [
        { name: 'Node.js', req: 85, relation: 'essential' },
        { name: 'Docker', req: 80, relation: 'essential' },
        { name: 'PostgreSQL', req: 85, relation: 'essential' },
        { name: 'AWS', req: 75, relation: 'essential' },
        { name: 'REST APIs', req: 90, relation: 'essential' },
        { name: 'Python', req: 85, relation: 'essential' },
        { name: 'SQL', req: 80, relation: 'essential' }
      ],
      'frontend developer': [
        { name: 'React', req: 90, relation: 'essential' },
        { name: 'TypeScript', req: 85, relation: 'essential' },
        { name: 'JavaScript', req: 90, relation: 'essential' },
        { name: 'HTML & CSS', req: 85, relation: 'essential' },
        { name: 'REST APIs', req: 80, relation: 'essential' },
        { name: 'Git', req: 85, relation: 'essential' }
      ],
      'senior frontend engineer': [
        { name: 'React', req: 95, relation: 'essential' },
        { name: 'TypeScript', req: 90, relation: 'essential' },
        { name: 'JavaScript', req: 95, relation: 'essential' },
        { name: 'HTML & CSS', req: 90, relation: 'essential' },
        { name: 'REST APIs', req: 90, relation: 'essential' },
        { name: 'AWS', req: 70, relation: 'optional' },
        { name: 'Docker', req: 65, relation: 'optional' },
        { name: 'Git', req: 90, relation: 'essential' }
      ],
      'full stack developer': [
        { name: 'React', req: 85, relation: 'essential' },
        { name: 'Node.js', req: 85, relation: 'essential' },
        { name: 'MongoDB', req: 80, relation: 'essential' },
        { name: 'TypeScript', req: 80, relation: 'essential' },
        { name: 'PostgreSQL', req: 80, relation: 'essential' },
        { name: 'Docker', req: 75, relation: 'essential' },
        { name: 'REST APIs', req: 85, relation: 'essential' }
      ],
      'backend engineer': [
        { name: 'Node.js', req: 90, relation: 'essential' },
        { name: 'REST APIs', req: 95, relation: 'essential' },
        { name: 'PostgreSQL', req: 90, relation: 'essential' },
        { name: 'Docker', req: 85, relation: 'essential' },
        { name: 'AWS', req: 80, relation: 'essential' },
        { name: 'Python', req: 85, relation: 'essential' }
      ],
      'data scientist': [
        { name: 'Python', req: 90, relation: 'essential' },
        { name: 'SQL', req: 85, relation: 'essential' },
        { name: 'Machine Learning', req: 85, relation: 'essential' },
        { name: 'Pandas', req: 80, relation: 'essential' },
        { name: 'NumPy', req: 80, relation: 'essential' }
      ],
      'devops engineer': [
        { name: 'Docker', req: 90, relation: 'essential' },
        { name: 'Kubernetes', req: 85, relation: 'essential' },
        { name: 'AWS', req: 85, relation: 'essential' },
        { name: 'Linux', req: 85, relation: 'essential' }
      ],
      'mobile app developer': [
        { name: 'React Native', req: 90, relation: 'essential' },
        { name: 'JavaScript', req: 85, relation: 'essential' },
        { name: 'TypeScript', req: 80, relation: 'essential' },
        { name: 'REST APIs', req: 85, relation: 'essential' }
      ],
      'ai / ml engineer': [
        { name: 'Python', req: 95, relation: 'essential' },
        { name: 'Machine Learning', req: 90, relation: 'essential' },
        { name: 'TensorFlow', req: 85, relation: 'essential' }
      ],
      'ui/ux designer': [
        { name: 'Figma', req: 90, relation: 'essential' },
        { name: 'UI/UX Design', req: 90, relation: 'essential' },
        { name: 'HTML & CSS', req: 60, relation: 'optional' }
      ]
    };

    const evidenceMap = {};
    if (githubState.skills && Array.isArray(githubState.skills)) {
      githubState.skills.forEach(s => {
        const norm = normSkill(s.name || s.tech);
        if (norm) {
          const sc = Number(s.score || s.evidenceScore || 0);
          evidenceMap[norm] = Math.max(evidenceMap[norm] || 0, sc);
        }
      });
    }

    const careerSkillsMap = {};
    const combinedDict = {};

    activeTargetCareers.forEach(carName => {
      const tLower = carName.trim().toLowerCase();
      let targetSkills = OCC_SKILLS['backend developer'];
      for (const [k, v] of Object.entries(OCC_SKILLS)) {
        if (tLower.includes(k) || k.includes(tLower)) {
          targetSkills = v;
          break;
        }
      }
      careerSkillsMap[carName] = targetSkills;

      targetSkills.forEach(sk => {
        const norm = normSkill(sk.name);
        if (!norm) return;
        if (!combinedDict[norm]) {
          combinedDict[norm] = {
            skill_name: norm,
            icon: getIcon(norm),
            required_level: sk.req,
            relation: sk.relation,
            required_by_careers: [carName],
            career_breakdown: [{ career: carName, required_level: sk.req, relation: sk.relation }]
          };
        } else {
          const existing = combinedDict[norm];
          if (!existing.required_by_careers.includes(carName)) {
            existing.required_by_careers.push(carName);
            existing.career_breakdown.push({ career: carName, required_level: sk.req, relation: sk.relation });
          }
          existing.required_level = Math.max(existing.required_level, sk.req);
          if (sk.relation === 'essential') existing.relation = 'essential';
        }
      });
    });

    const gapsList = [];
    Object.values(combinedDict).forEach(skInfo => {
      const norm = skInfo.skill_name;
      const req = skInfo.required_level;
      const curr = Math.round(evidenceMap[norm] || 0);
      const gap = Math.max(0, req - curr);

      if (gap > 0) {
        const numCareers = skInfo.required_by_careers.length;
        const isEssential = skInfo.relation === 'essential';

        let priority = 'Low Priority';
        let pVal = 5 + (numCareers * 5);
        if (numCareers >= 2 && gap >= 25) {
          priority = 'High Priority';
          pVal = 30 + (numCareers * 5);
        } else if (gap >= 35 || (isEssential && gap >= 30)) {
          priority = 'High Priority';
          pVal = 25 + (numCareers * 5);
        } else if (gap >= 20 || numCareers >= 2) {
          priority = 'Medium Priority';
          pVal = 15 + (numCareers * 5);
        }

        gapsList.push({
          skill_id: `sk_${norm.toLowerCase().replace(/\s+/g, '_')}`,
          skill_name: norm,
          icon: skInfo.icon,
          importance: skInfo.relation,
          current_level: curr,
          required_level: req,
          gap,
          priority,
          priority_val: pVal,
          required_by_careers: skInfo.required_by_careers,
          career_breakdown: skInfo.career_breakdown
        });
      }
    });

    gapsList.sort((a, b) => b.priority_val - a.priority_val || b.gap - a.gap);
    const topGaps = gapsList.slice(0, 3);
    const topNames = topGaps.map(g => g.skill_name);

    const isMulti = activeTargetCareers.length > 1;
    let recPillsStr = topNames.length >= 3 ? `${topNames[0]}, ${topNames[1]} and ${topNames[2]}` : (topNames.length === 2 ? `${topNames[0]} and ${topNames[1]}` : (topNames[0] || 'key target skills'));
    let recText = '';

    if (isMulti) {
      recText = `Based on your selected career goals, improving ${recPillsStr} could significantly increase your match rate for your target opportunities.`;
    } else {
      recText = `Based on your target role of ${activeTargetCareers[0]}, improving ${recPillsStr} could significantly increase your match rate for top opportunities.`;
    }

    return {
      target_careers: activeTargetCareers,
      target_career: activeTargetCareers.join(', '),
      is_multi_career: isMulti,
      recommendation_text: recText,
      top_gaps: topGaps,
      skill_gaps: gapsList,
      recommended_pills: topNames.length > 0 ? topNames : activeTargetCareers,
      career_skills_map: careerSkillsMap
    };
  }, [backendGapData, activeTargetCareers, githubState.skills]);

  // Helper to map evidence score to evidence level label
  const getEvidenceLevelText = (score) => {
    if (score >= 90) return 'Very Strong Evidence';
    if (score >= 75) return 'Strong Evidence';
    if (score >= 50) return 'Good Evidence';
    if (score >= 25) return 'Moderate Evidence';
    return 'Limited Evidence';
  };


  // Calculate overall GitHub Skill Index using weighted Core Skill model
  const skillIndexDetails = React.useMemo(() => {
    return calculateSkillIndex(githubState.skills);
  }, [githubState.skills]);

  const overallGithubScore = skillIndexDetails.score;

  // Consolidated and sorted user skills (percentage-wise descending)
  const formattedSkills = React.useMemo(() => {
    const map = new Map();

    if (githubState.skills && Array.isArray(githubState.skills)) {
      githubState.skills.forEach(s => {
        const name = s.name || s.technology || s.tech;
        if (name) {
          const key = name.trim().toLowerCase();
          const score = Math.round(s.score || s.percentage || s.evidenceScore || 0);
          map.set(key, { name: name.trim(), score });
        }
      });
    }

    if (profileData) {
      const norm = profileData.normalizedSkills || profileData.normalized_skills;
      if (Array.isArray(norm)) {
        norm.forEach(s => {
          const name = s.skill_name || s.name || s.label;
          if (name && !map.has(name.trim().toLowerCase())) {
            const score = Math.round(s.score || s.confidence || 75);
            map.set(name.trim().toLowerCase(), { name: name.trim(), score });
          }
        });
      }
    }

    const defaultSkills = [
      { name: 'Python', score: 88 },
      { name: 'SQL', score: 81 },
      { name: 'Git', score: 76 },
      { name: 'JavaScript', score: 72 },
      { name: 'React', score: 68 },
      { name: 'HTML/CSS', score: 65 },
      { name: 'FastAPI', score: 54 },
      { name: 'TypeScript', score: 50 },
      { name: 'Docker', score: 42 },
      { name: 'Node.js', score: 38 },
      { name: 'PostgreSQL', score: 35 },
      { name: 'Linux', score: 30 },
    ];

    defaultSkills.forEach(ds => {
      const key = ds.name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, ds);
      }
    });

    const result = Array.from(map.values());
    return result.sort((a, b) => b.score - a.score);
  }, [githubState.skills, profileData]);

  const top8Skills = React.useMemo(() => formattedSkills.slice(0, 8), [formattedSkills]);

  const toggleAction = (id) => {
    setActions(actions.map(act => act.id === id ? { ...act, completed: !act.completed } : act));
  };

  const completedCount = actions.filter(act => act.completed).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* 1. Welcome Bar with Profile Completion */}
      <View style={styles.welcomeRow}>
        <View style={styles.welcomeTextWrap}>
          <Text style={styles.welcomeTitle}>Welcome back, {displayName} 👋</Text>
          <Text style={styles.welcomeSubtitle}>Here is a snapshot of your career readiness today.</Text>
        </View>
        <HoverableCard
          style={styles.profileCompletionWrap}
          onPress={onNavigateToProfile}
        >
          <Text style={styles.completionLabel}>Profile Completion</Text>
          <View style={styles.completionProgressRow}>
            <View style={styles.completionTrack}>
              <View style={[styles.completionBar, { width: `${profileCompletion !== undefined ? profileCompletion : 80}%` }]} />
            </View>
            <Text style={styles.completionValue}>{profileCompletion !== undefined ? profileCompletion : 80}%</Text>
          </View>
        </HoverableCard>
      </View>

      {/* 2. Top Metrics Grid */}
      <View style={[styles.metricsGrid, !isTablet && styles.metricsGridMobile]}>
        {/* Career Readiness / Skill Index Card */}
        <HoverableCard style={styles.metricCard}>
          <Text style={styles.metricTitle}>Skill Index</Text>
          <Text style={styles.metricSubtext}>
            {githubState.connected ? getEvidenceLevelText(overallGithubScore) : 'Technical Evidence'}
          </Text>

          <View style={styles.circleContainer}>
            {(() => {
              const scoreVal = githubState.connected ? overallGithubScore : 78;
              const deg = Math.round((scoreVal / 100) * 360);
              const isWeb = Platform.OS === 'web';
              const circleBg = isWeb
                ? `conic-gradient(${COLORS.teal} 0deg ${deg}deg, #E2E8F0 ${deg}deg 360deg)`
                : COLORS.teal;

              return (
                <View style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: circleBg,
                  background: circleBg,
                  padding: 5,
                }}>
                  <View style={{
                    width: 66,
                    height: 66,
                    borderRadius: 33,
                    backgroundColor: '#FFFFFF',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <Text style={styles.ringValueText}>{scoreVal}</Text>
                    <Text style={styles.ringTotalText}>/100</Text>
                  </View>
                </View>
              );
            })()}
          </View>

          <Text style={styles.metricInfoText}>
            {githubState.connected
              ? `Technical evidence detected across your analyzed GitHub repositories.`
              : `Connect your GitHub account to generate technical evidence.`}
          </Text>

          <Pressable
            style={styles.metricLink}
            onPress={() => {
              if (githubState.connected) {
                setIsSkillIndexModalOpen(true);
              } else {
                onNavigateToProfile();
              }
            }}
          >
            <Text style={styles.metricLinkText}>
              {githubState.connected ? 'View Analysis →' : 'Connect GitHub →'}
            </Text>
          </Pressable>
        </HoverableCard>

        {/* Opportunities */}
        <HoverableCard style={styles.metricCard}>
          <Text style={styles.metricTitle}>Opportunities</Text>
          <Text style={styles.metricSubtext}>24 Matches</Text>
          <View style={styles.internshipMatchBox}>
            <View style={styles.matchRateTag}>
              <Text style={styles.matchRateTagText}>92% Best Match</Text>
            </View>
            <Text style={styles.matchJobTitle}>Backend Developer Intern</Text>
            <Text style={styles.matchCompany}>@ TechWave</Text>
          </View>
          <Pressable style={styles.metricLink}>
            <Text style={styles.metricLinkText}>View Internships →</Text>
          </Pressable>
        </HoverableCard>

        {/* Resume ATS */}
        <HoverableCard style={styles.metricCard}>
          <Text style={styles.metricTitle}>Resume</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreGreen}>82</Text>
            <Text style={styles.scoreTotal}>/100</Text>
            <View style={styles.statusPillGreen}>
              <Text style={styles.statusPillTextGreen}>● Status: Good</Text>
            </View>
          </View>
          <View style={styles.barsList}>
            {renderMiniBar('Keywords', 80)}
            {renderMiniBar('Formatting', 92)}
            {renderMiniBar('Job Match', 70)}
          </View>
          <Pressable style={styles.metricLink} onPress={onNavigateToProfile}>
            <Text style={styles.metricLinkText}>Improve Resume →</Text>
          </Pressable>
        </HoverableCard>

        {/* Interviews */}
        <HoverableCard style={styles.metricCard}>
          <Text style={styles.metricTitle}>Interview</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreGreen}>75</Text>
            <Text style={styles.scoreTotal}>/100</Text>
            <View style={styles.statusPillGreen}>
              <Text style={styles.statusPillTextGreen}>Good Progress</Text>
            </View>
          </View>
          <View style={styles.barsList}>
            {renderMiniBar('Technical', 78)}
            {renderMiniBar('Behavioral', 83)}
            {renderMiniBar('Communication', 68)}
          </View>
          <Pressable style={styles.metricLink}>
            <Text style={styles.metricLinkText}>Start Mock Interview →</Text>
          </Pressable>
        </HoverableCard>
      </View>

      {/* 4. AI Career Recommendation Banner */}
      <HoverableCard style={styles.aiRecommendationCard}>
        <View style={styles.aiRecHeaderRow}>
          <Text style={styles.aiRecTitle}>✨ AI Career Recommendation</Text>
          <Pressable>
            <Text style={styles.aiRecLink}>View Personalized Learning Path →</Text>
          </Pressable>
        </View>
        <Text style={styles.aiRecText}>
          {computedGapData.is_multi_career ? (
            <>Based on your selected career goals, improving </>
          ) : (
            <>Based on your target role of <Text style={styles.boldText}>{computedGapData.target_career}</Text>, improving </>
          )}
          {
            (() => {
              const pills = computedGapData.recommended_pills || [];
              if (pills.length >= 3) {
                return (
                  <>
                    <Text style={styles.boldText}>{pills[0]}</Text>, <Text style={styles.boldText}>{pills[1]}</Text> and <Text style={styles.boldText}>{pills[2]}</Text>
                  </>
                );
              } else if (pills.length === 2) {
                return (
                  <>
                    <Text style={styles.boldText}>{pills[0]}</Text> and <Text style={styles.boldText}>{pills[1]}</Text>
                  </>
                );
              } else if (pills.length === 1) {
                return <Text style={styles.boldText}>{pills[0]}</Text>;
              }
              return <Text style={styles.boldText}>key target skills</Text>;
            })()
          }
          {computedGapData.is_multi_career ? (
            <> could significantly increase your match rate for your target opportunities.</>
          ) : (
            <> could significantly increase your match rate for top opportunities.</>
          )}
        </Text>
        <View style={styles.badgeRow}>
          {(computedGapData.recommended_pills || []).map((pillName, idx) => (
            <View style={styles.recommendationBadge} key={pillName + '_' + idx}>
              <Text style={styles.recBadgeText}>● {pillName}</Text>
            </View>
          ))}
        </View>
      </HoverableCard>

      {/* 4. Your Skill Gaps */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Your Skill Gaps</Text>
          <Pressable onPress={() => setIsSkillGapAnalysisModalOpen(true)}>
            <Text style={styles.sectionHeaderLink}>View Complete Skill Gap Analysis →</Text>
          </Pressable>
        </View>

        <View style={[styles.gapCardsRow, !isTablet && styles.gapCardsRowMobile]}>
          {(computedGapData.top_gaps && computedGapData.top_gaps.length > 0) ? (
            computedGapData.top_gaps.map((gap, idx) => {
              const isRedPriority = gap.priority === 'High Priority';
              const badgeStyle = isRedPriority ? styles.priorityBadgeRed : styles.priorityBadgeYellow;
              const badgeTextStyle = isRedPriority ? styles.priorityBadgeTextRed : styles.priorityBadgeTextYellow;

              const getLevelCategory = (level) => {
                if (level >= 85) return 'Advanced';
                if (level >= 70) return 'Proficient';
                if (level >= 50) return 'Intermediate';
                if (level >= 25) return 'Beginner';
                return 'Novice';
              };

              const getBarBgColor = (level) => {
                if (level >= 75) return COLORS.green;
                if (level >= 50) return COLORS.teal;
                if (level >= 35) return COLORS.amber;
                return COLORS.rose;
              };

              const getIconBgColor = (sName, i) => {
                const l = (sName || '').toLowerCase();
                if (l.includes('docker') || l.includes('react native') || i === 0) return COLORS.blueLight;
                if (l.includes('postgres') || l.includes('react') || i === 1) return COLORS.mint;
                if (l.includes('aws') || l.includes('python') || i === 2) return COLORS.amberLight;
                return COLORS.panel;
              };

              const requiredLabel = gap.required_by_careers && gap.required_by_careers.length > 0
                ? (gap.required_by_careers.length > 1 ? `${gap.required_by_careers.length} Selected Roles` : gap.required_by_careers[0])
                : computedGapData.target_career;

              return (
                <HoverableCard style={styles.gapCard} key={gap.skill_name + '_' + idx}>
                  <View style={styles.gapCardHeader}>
                    <View style={[styles.gapCardIconBox, { backgroundColor: getIconBgColor(gap.skill_name, idx) }]}>
                      <Text style={styles.gapCardIconText}>{gap.icon || '🚀'}</Text>
                    </View>
                    <Text style={styles.gapCardTitle}>{gap.skill_name}</Text>
                    <View style={badgeStyle}>
                      <Text style={badgeTextStyle}>{gap.priority || 'Medium Priority'}</Text>
                    </View>
                  </View>
                  <View style={styles.gapDetails}>
                    <View style={styles.gapLevelRow}>
                      <Text style={styles.gapLevelLabel}>Current Level</Text>
                      <Text style={styles.gapLevelValue}>{gap.current_level}% ({getLevelCategory(gap.current_level)})</Text>
                    </View>
                    <View style={styles.gapTrack}>
                      <View style={[styles.gapBar, { width: `${Math.min(100, Math.max(5, gap.current_level))}%`, backgroundColor: getBarBgColor(gap.current_level) }]} />
                    </View>
                    <View style={styles.gapRequiredRow}>
                      <Text style={styles.gapLevelLabel}>Required for {requiredLabel}</Text>
                      <Text style={styles.gapLevelValueBold}>{gap.required_level}% ({getLevelCategory(gap.required_level)})</Text>
                    </View>
                  </View>
                  <Pressable style={styles.learnBtn}>
                    <Text style={styles.learnBtnText}>Learn {gap.skill_name} →</Text>
                  </Pressable>
                </HoverableCard>
              );
            })
          ) : (
            <HoverableCard style={[styles.gapCard, { width: '100%' }]}>
              <View style={styles.gapCardHeader}>
                <Text style={styles.gapCardTitle}>Target Role Competency</Text>
              </View>
              <Text style={{ color: COLORS.muted, marginVertical: 12 }}>
                Your current evidence covers the key skills required for {computedGapData.target_career}.
              </Text>
            </HoverableCard>
          )}
        </View>
      </View>


      {/* 5. Your Skills */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Your Skills</Text>
          <Pressable onPress={() => setShowAllSkills(true)}>
            <Text style={styles.sectionHeaderLink}>View All Skills →</Text>
          </Pressable>
        </View>
        <HoverableCard style={styles.skillsContainerCard}>
          <View style={[styles.skillsFlexRow, !isTablet && styles.skillsFlexColumn]}>
            <View style={styles.skillHalfCol}>
              {top8Skills.slice(0, 4).map(s => renderSkillRow(s.name, s.score))}
            </View>
            <View style={styles.skillHalfCol}>
              {top8Skills.slice(4, 8).map(s => renderSkillRow(s.name, s.score))}
            </View>
          </View>
        </HoverableCard>
      </View>

      {/* 6. Your Career Goal */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Your Career Goal</Text>
          <Pressable onPress={onNavigateToProfile}>
            <Text style={styles.sectionHeaderLink}>🖊️ Update Career Goal</Text>
          </Pressable>
        </View>
        <HoverableCard style={styles.goalCardContainer}>
          <Text style={styles.goalHintText}>Tracking your progress towards your target roles.</Text>
          <View style={[styles.goalBoxesRow, !isTablet && styles.goalBoxesColumn]}>
            {/* Target Role */}
            <View style={styles.goalBox}>
              <View style={styles.goalBoxLeftContent}>
                <Text style={styles.goalBoxLabel}>TARGET ROLE</Text>
                <Text style={styles.goalBoxTitle}>{activeTargetCareers[0] || 'Backend Developer'}</Text>
                <Text style={styles.goalBoxSub}>
                  {activeTargetCareers.length > 1 ? `Primary target role (+${activeTargetCareers.length - 1} secondary goals)` : 'Focusing on your primary career target'}
                </Text>
              </View>
              <View style={styles.goalCircleContainer}>
                <View style={[styles.progressRing, styles.ring74]}>
                  <Text style={styles.ringValueText}>76%</Text>
                  <Text style={styles.ringTotalText}>MATCH</Text>
                </View>
              </View>
            </View>

            {/* Key Target Skills */}
            <View style={styles.goalBox}>
              <Text style={styles.goalBoxLabel}>KEY TARGET SKILLS</Text>
              <View style={styles.goalSkillsList}>
                {(computedGapData.recommended_pills || ['Python', 'REST APIs', 'Docker']).slice(0, 3).map((skName, i) => (
                  <Text key={i} style={styles.goalSkillItem}>● {skName}</Text>
                ))}
              </View>
            </View>

            {/* Also Watches */}
            <View style={styles.goalBox}>
              <Text style={styles.goalBoxLabel}>ALSO WATCHES</Text>
              <View style={styles.watchesList}>
                {activeTargetCareers.length > 1 ? (
                  activeTargetCareers.slice(1, 3).map((secRole, i) => (
                    <View key={i} style={styles.watchRow}>
                      <Text style={styles.watchLabel}>{secRole}</Text>
                      <Text style={styles.watchValue}>({70 - (i * 4)}%)</Text>
                    </View>
                  ))
                ) : (
                  <>
                    <View style={styles.watchRow}>
                      <Text style={styles.watchLabel}>Data Engineer</Text>
                      <Text style={styles.watchValue}>(68%)</Text>
                    </View>
                    <View style={styles.watchRow}>
                      <Text style={styles.watchLabel}>Full Stack Dev</Text>
                      <Text style={styles.watchValue}>(65%)</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </HoverableCard>
      </View>

      {/* 7. Personalized Learning */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Personalized Learning</Text>
          <Pressable>
            <Text style={styles.sectionHeaderLink}>View Learning Paths →</Text>
          </Pressable>
        </View>
        <View style={[styles.learningLayout, !isWide && styles.learningLayoutColumn]}>
          {/* Active Path (Large Card) */}
          <HoverableCard style={[styles.activePathCard, !isWide && styles.activePathFullWidth]}>
            <View style={styles.activePathHeader}>
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>ACTIVE PATH</Text>
              </View>
              <Text style={styles.activeIcon}>🎓</Text>
            </View>
            <Text style={styles.activePathTitle}>Backend Development Mastery</Text>
            <Text style={styles.activePathDesc}>
              Complete course covering advanced Python, APIs, databases, and deployment.
            </Text>
            <View style={styles.activeProgressSection}>
              <View style={styles.activeProgressLabels}>
                <Text style={styles.activeProgressLabel}>Overall Progress</Text>
                <Text style={styles.activeProgressVal}>64%</Text>
              </View>
              <View style={styles.activeTrack}>
                <View style={[styles.activeBar, { width: '64%' }]} />
              </View>
            </View>
            <Pressable style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>Continue Learning</Text>
            </Pressable>
          </HoverableCard>

          {/* Recommended Path Cards */}
          <View style={styles.recPathsColumn}>
            {/* Card 1 */}
            <HoverableCard style={styles.recPathRowCard}>
              <View style={[styles.pathIconCircle, { backgroundColor: COLORS.blueLight }]}>
                <Text style={styles.pathIconText}>🐘</Text>
              </View>
              <View style={styles.pathInfo}>
                <Text style={styles.pathTitle}>Advanced PostgreSQL</Text>
                <Text style={styles.pathDesc}>Recommended based on skill gap</Text>
              </View>
              <Pressable style={styles.startPathBtn}>
                <Text style={styles.startPathBtnText}>Start</Text>
              </Pressable>
            </HoverableCard>

            {/* Card 2 */}
            <HoverableCard style={styles.recPathRowCard}>
              <View style={[styles.pathIconCircle, { backgroundColor: COLORS.mint }]}>
                <Text style={styles.pathIconText}>🐳</Text>
              </View>
              <View style={styles.pathInfo}>
                <Text style={styles.pathTitle}>Docker for Beginners</Text>
                <Text style={styles.pathDesc}>Recommended based on skill gap</Text>
              </View>
              <Pressable style={styles.startPathBtn}>
                <Text style={styles.startPathBtnText}>Start</Text>
              </Pressable>
            </HoverableCard>
          </View>
        </View>
      </View>

      {/* 8. Recommended Internships */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Recommended Internships</Text>
          <Pressable>
            <Text style={styles.sectionHeaderLink}>View All Opportunities →</Text>
          </Pressable>
        </View>
        <View style={[styles.internshipCardsRow, !isTablet && styles.internshipCardsMobile]}>
          {/* TechWave */}
          <HoverableCard style={styles.internshipCard}>
            <View style={styles.internHeader}>
              <Text style={styles.internTitle}>Backend Developer Intern</Text>
              <View style={styles.matchTagGreen}>
                <Text style={styles.matchTagTextGreen}>92% Match</Text>
              </View>
            </View>
            <Text style={styles.internCompany}>TechWave • Remote</Text>
            <Text style={styles.internDesc}>
              Looking for a motivated intern to help build scalable APIs using Python and Django.
            </Text>
            <Pressable style={styles.viewOpportunityBtn}>
              <Text style={styles.viewOpportunityBtnText}>View Opportunity</Text>
            </Pressable>
          </HoverableCard>

          {/* DataSphere */}
          <HoverableCard style={styles.internshipCard}>
            <View style={styles.internHeader}>
              <Text style={styles.internTitle}>Data Engineering Intern</Text>
              <View style={styles.matchTagYellow}>
                <Text style={styles.matchTagTextYellow}>88% Match</Text>
              </View>
            </View>
            <Text style={styles.internCompany}>DataSphere • Hybrid</Text>
            <Text style={styles.internDesc}>
              Join our data team to build data pipelines and optimize PostgreSQL databases.
            </Text>
            <Pressable style={styles.viewOpportunityBtn}>
              <Text style={styles.viewOpportunityBtnText}>View Opportunity</Text>
            </Pressable>
          </HoverableCard>

          {/* InnovateLabs */}
          <HoverableCard style={styles.internshipCard}>
            <View style={styles.internHeader}>
              <Text style={styles.internTitle}>Software Engineer Intern</Text>
              <View style={styles.matchTagYellow}>
                <Text style={styles.matchTagTextYellow}>78% Match</Text>
              </View>
            </View>
            <Text style={styles.internCompany}>InnovateLabs • On-site</Text>
            <Text style={styles.internDesc}>
              Generalist software engineering role touching both frontend and backend systems.
            </Text>
            <Pressable style={styles.viewOpportunityBtn}>
              <Text style={styles.viewOpportunityBtnText}>View Opportunity</Text>
            </Pressable>
          </HoverableCard>
        </View>
      </View>

      {/* 9. Application Pipeline & Interview Readiness */}
      <View style={[styles.sectionContainer, styles.rowLayout, !isTablet && styles.rowLayoutMobile]}>
        {/* Application Pipeline */}
        <HoverableCard style={styles.pipelineCard}>
          <View style={styles.cardHeaderWithLink}>
            <Text style={styles.sideCardTitle}>Application Pipeline</Text>
            <Pressable>
              <Text style={styles.sideCardLink}>View Applications</Text>
            </Pressable>
          </View>
          <View style={styles.pipelineTimeline}>
            <View style={styles.timelineConnectLine} />
            <View style={styles.timelineNodesRow}>
              {renderPipelineNode('12', 'Applied')}
              {renderPipelineNode('4', 'Review')}
              {renderPipelineNode('2', 'Interview')}
              {renderPipelineNode('0', 'Selected')}
            </View>
          </View>
        </HoverableCard>

        {/* Interview Readiness */}
        <HoverableCard style={styles.readinessCard}>
          <View style={styles.cardHeaderWithLink}>
            <Text style={styles.sideCardTitle}>Interview Readiness</Text>
            <Pressable>
              <Text style={styles.sideCardLink}>View History</Text>
            </Pressable>
          </View>
          <View style={styles.readinessContentRow}>
            <View style={styles.readinessCircle}>
              <Text style={styles.readinessCircleVal}>75</Text>
            </View>
            <View style={styles.readinessTextWrap}>
              <Text style={styles.readinessRoleTitle}>Recent Mock Interview</Text>
              <Text style={styles.readinessRoleDesc}>Backend Developer Role • 75% Score</Text>
              <View style={styles.readinessStatusRow}>
                <Text style={styles.readinessStatusText}>● Good Progress</Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.startMockBtn}>
            <Text style={styles.startMockBtnText}>Start AI Mock Interview</Text>
          </Pressable>
        </HoverableCard>
      </View>



      {/* 11. Ask SkillSetu AI (Floating Prompt at bottom) */}
      <HoverableCard style={styles.aiChatContainer}>
        <View style={styles.aiChatIconCircle}>
          <Text style={styles.aiChatIconText}>🤖</Text>
        </View>
        <Text style={styles.aiChatTitle}>Ask SkillSetu AI</Text>
        <Text style={styles.aiChatSubtitle}>
          Get personalized career advice, resume reviews, or technical interview prep instantly.
        </Text>
        <View style={styles.aiInputRow}>
          <TextInput
            placeholder="e.g., How can I improve my resume for a backend role?"
            placeholderTextColor={COLORS.muted}
            style={styles.aiInput}
          />
          <Pressable style={styles.aiSubmitBtn}>
            <Text style={styles.aiSubmitBtnText}>➔</Text>
          </Pressable>
        </View>
        <View style={styles.aiChipsRow}>
          <Pressable style={styles.aiChip}>
            <Text style={styles.aiChipText}>Review my resume for Backend roles</Text>
          </Pressable>
          <Pressable style={styles.aiChip}>
            <Text style={styles.aiChipText}>Suggest mock interview questions for Python</Text>
          </Pressable>
          <Pressable style={styles.aiChip}>
            <Text style={styles.aiChipText}>How do I negotiate an internship offer?</Text>
          </Pressable>
        </View>
      </HoverableCard>

      {/* GitHub Skill Analysis Modal (Opened from Skill Index card "View Analysis →") */}
      {isSkillIndexModalOpen && (
        <View style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            maxWidth: 620,
            width: '100%',
            maxHeight: '90vh',
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            overflow: 'hidden',
          }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.ink }}>GitHub Skill Analysis</Text>
                  <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>
                    Overall technical evidence across analyzed repositories
                  </Text>
                </View>
                <Pressable
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setIsSkillIndexModalOpen(false)}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.navy }}>✕</Text>
                </Pressable>
              </View>

              {/* Overall Score Header Banner */}
              <View style={{ alignItems: 'center', paddingVertical: 18, backgroundColor: '#F0FDFA', borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#CCFBF1' }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: COLORS.teal }}>
                  {overallGithubScore} <Text style={{ fontSize: 16, color: COLORS.muted, fontWeight: '600' }}>/ 100</Text>
                </Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.navy, marginTop: 4 }}>
                  {getEvidenceLevelText(overallGithubScore)}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>Technical Evidence Strength</Text>
              </View>

              {/* 1. Evidence Breakdown (Core Skills, Project Depth, Skill Breadth) */}
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.navy, marginBottom: 12, letterSpacing: 0.5 }}>
                SKILL INDEX BREAKDOWN <Text style={{ fontSize: 11, fontWeight: '500', color: COLORS.muted }}>(Tap card for detailed evidence ℹ️)</Text>
              </Text>
              <View style={{ gap: 10, marginBottom: 22 }}>
                {/* Card 1: Core Skill Strength */}
                <Pressable
                  onPress={() => setActiveEvidencePop('core')}
                  style={({ hovered }) => ({
                    backgroundColor: hovered ? '#F1F5F9' : '#F8FAFC',
                    padding: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    cursor: Platform.OS === 'web' ? 'pointer' : 'default'
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy }}>Core Skill Strength (60% Weight)</Text>
                      <View style={{ backgroundColor: '#E6F4EA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.green }}>Why? ℹ️</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.teal }}>{skillIndexDetails.coreSkillStrength} / 100</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${skillIndexDetails.coreSkillStrength}%`, backgroundColor: COLORS.teal }} />
                  </View>
                </Pressable>

                {/* Card 2: Project Depth */}
                <Pressable
                  onPress={() => setActiveEvidencePop('depth')}
                  style={({ hovered }) => ({
                    backgroundColor: hovered ? '#F1F5F9' : '#F8FAFC',
                    padding: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    cursor: Platform.OS === 'web' ? 'pointer' : 'default'
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy }}>Project Depth (25% Weight)</Text>
                      <View style={{ backgroundColor: '#E6F4EA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.green }}>Why? ℹ️</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.teal }}>{skillIndexDetails.projectDepth} / 100</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${skillIndexDetails.projectDepth}%`, backgroundColor: COLORS.teal }} />
                  </View>
                </Pressable>

                {/* Card 3: Skill Breadth */}
                <Pressable
                  onPress={() => setActiveEvidencePop('breadth')}
                  style={({ hovered }) => ({
                    backgroundColor: hovered ? '#F1F5F9' : '#F8FAFC',
                    padding: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    cursor: Platform.OS === 'web' ? 'pointer' : 'default'
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy }}>Skill Breadth (15% Weight)</Text>
                      <View style={{ backgroundColor: '#E6F4EA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.green }}>Why? ℹ️</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.teal }}>{skillIndexDetails.skillBreadth} / 100</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${skillIndexDetails.skillBreadth}%`, backgroundColor: COLORS.teal }} />
                  </View>
                </Pressable>
              </View>

              {/* Evidence Popup Sub-Modal */}
              {activeEvidencePop && (
                <View style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 16,
                  zIndex: 1000
                }}>
                  <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    width: '100%',
                    maxWidth: 500,
                    maxHeight: '90%',
                    padding: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: 10
                  }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.navy }}>
                          {activeEvidencePop === 'core' && `Core Skill Strength (${skillIndexDetails.coreSkillStrength}/100)`}
                          {activeEvidencePop === 'depth' && `Project Depth Evidence (${skillIndexDetails.projectDepth}/100)`}
                          {activeEvidencePop === 'breadth' && `Skill Breadth Evidence (${skillIndexDetails.skillBreadth}/100)`}
                        </Text>
                        <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, lineHeight: 16 }}>
                          {activeEvidencePop === 'core' && "Calculated from weighted evidence across your core engineering languages, frameworks, and cloud platforms."}
                          {activeEvidencePop === 'depth' && "Measures repeated and meaningful usage across your top demonstrated skills in analyzed repositories."}
                          {activeEvidencePop === 'breadth' && "Measures technical versatility across distinct core engineering domains."}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setActiveEvidencePop(null)}
                        style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.navy }}>✕</Text>
                      </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 380, marginVertical: 8 }}>
                      {activeEvidencePop === 'core' && (
                        <View style={{ gap: 14 }}>
                          <View style={{ backgroundColor: '#F0FDFA', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CCFBF1' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.teal, marginBottom: 4 }}>Why this score was calculated:</Text>
                            <Text style={{ fontSize: 12, color: COLORS.navy, lineHeight: 17 }}>
                              Weighted average of detected Tier 1 Core Skills (weight 1.2x - 1.0x) and Tier 2 Supporting Skills (weight 0.5x). Tier 3 micro-dependencies (e.g. zod, sonner) were excluded so they don't lower your score.
                            </Text>
                          </View>

                          <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.navy }}>TIER 1 CORE SKILLS DETECTED ({skillIndexDetails.tier1Skills?.length || 0})</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {(skillIndexDetails.tier1Skills || []).map((s, idx) => (
                              <View key={idx} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.navy }}>{s.name}</Text>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.teal }}>{s.scoreVal}%</Text>
                                <Text style={{ fontSize: 10, color: COLORS.muted }}>({s.weight}x weight)</Text>
                              </View>
                            ))}
                            {(!skillIndexDetails.tier1Skills || skillIndexDetails.tier1Skills.length === 0) && (
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>No Tier 1 core skills detected yet.</Text>
                            )}
                          </View>

                          <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.navy }}>TIER 2 SUPPORTING SKILLS DETECTED ({skillIndexDetails.tier2Skills?.length || 0})</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {(skillIndexDetails.tier2Skills || []).map((s, idx) => (
                              <View key={idx} style={{ backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 12.5, fontWeight: '600', color: COLORS.navy }}>{s.name}</Text>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.teal }}>{s.scoreVal}%</Text>
                                <Text style={{ fontSize: 10, color: COLORS.muted }}>(0.5x weight)</Text>
                              </View>
                            ))}
                            {(!skillIndexDetails.tier2Skills || skillIndexDetails.tier2Skills.length === 0) && (
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>No Tier 2 supporting skills detected yet.</Text>
                            )}
                          </View>

                          <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <Text style={{ fontSize: 11.5, color: COLORS.muted }}>
                              🛡️ <Text style={{ fontWeight: '700', color: COLORS.navy }}>{skillIndexDetails.tier3Skills?.length || 0} Micro-Dependencies Excluded:</Text> Small packages and utility libraries (e.g., zod, sonner, vaul) were filtered out from reducing your core score.
                            </Text>
                          </View>
                        </View>
                      )}

                      {activeEvidencePop === 'depth' && (
                        <View style={{ gap: 14 }}>
                          <View style={{ backgroundColor: '#F0FDFA', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CCFBF1' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.teal, marginBottom: 4 }}>Why this score was calculated:</Text>
                            <Text style={{ fontSize: 12, color: COLORS.navy, lineHeight: 17 }}>
                              Average depth score of your top core skills. Rewards deep source code usage, framework configuration, architecture conventions, and multi-repository evidence.
                            </Text>
                          </View>

                          <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.navy }}>TOP DEMONSTRATED SKILLS DRIVING DEPTH</Text>
                          <View style={{ gap: 8 }}>
                            {(skillIndexDetails.topCoreSkills || []).map((s, idx) => (
                              <View key={idx} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: COLORS.navy }}>{s.name}</Text>
                                  <View style={{ backgroundColor: '#CCFBF1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: COLORS.teal }}>{s.scoreVal} / 100</Text>
                                  </View>
                                </View>
                                <Text style={{ fontSize: 11.5, color: COLORS.muted }}>
                                  Found across <Text style={{ fontWeight: '700', color: COLORS.navy }}>{s.repository_count || 1} repository</Text>{(s.repository_count || 1) > 1 ? 'ies' : ''} • {s.category || 'Core Skill'}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {activeEvidencePop === 'breadth' && (
                        <View style={{ gap: 14 }}>
                          <View style={{ backgroundColor: '#F0FDFA', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#CCFBF1' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.teal, marginBottom: 4 }}>Why this score was calculated:</Text>
                            <Text style={{ fontSize: 12, color: COLORS.navy, lineHeight: 17 }}>
                              Evaluated based on active engineering domains where you have demonstrated core evidence ($\ge 40\%$ score). You have demonstrated skills across <Text style={{ fontWeight: '800' }}>{skillIndexDetails.activeDomainCount}</Text> core domain{skillIndexDetails.activeDomainCount > 1 ? 's' : ''}.
                            </Text>
                          </View>

                          <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.navy }}>ACTIVE ENGINEERING DOMAINS ({skillIndexDetails.activeDomainCount})</Text>
                          <View style={{ gap: 8 }}>
                            {Object.entries(skillIndexDetails.domainBreakdown || {}).map(([domainName, techList], idx) => (
                              <View key={idx} style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy, marginBottom: 4 }}>
                                  {domainName === 'Frontend' && '🌐 Frontend Development'}
                                  {domainName === 'Mobile' && '📱 Mobile Development'}
                                  {domainName === 'Backend' && '⚙️ Backend Engineering'}
                                  {domainName === 'Cloud' && '☁️ Cloud & Infrastructure'}
                                  {domainName === 'Database' && '🗄️ Database & Storage'}
                                  {domainName === 'Languages' && '💻 Programming Languages'}
                                  {domainName === 'DevOps' && '🛠️ DevOps & Build Tools'}
                                  {domainName === 'Testing' && '🧪 Testing & QA'}
                                  {domainName === 'AI/ML' && '🤖 AI & Data Science'}
                                  {!['Frontend', 'Mobile', 'Backend', 'Cloud', 'Database', 'Languages', 'DevOps', 'Testing', 'AI/ML'].includes(domainName) && `🔹 ${domainName}`}
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                                  {techList.map((t, tIdx) => (
                                    <View key={tIdx} style={{ backgroundColor: '#E2E8F0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                      <Text style={{ fontSize: 11.5, fontWeight: '600', color: COLORS.navy }}>{t}</Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            ))}
                          </View>

                          <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                            <Text style={{ fontSize: 11.5, color: COLORS.muted }}>
                              🎯 <Text style={{ fontWeight: '700', color: COLORS.navy }}>Breadth Scale:</Text> 5+ domains = 100, 4 domains = 92, 3 domains = 82, 2 domains = 65, 1 domain = 40.
                            </Text>
                          </View>
                        </View>
                      )}
                    </ScrollView>

                    <Pressable
                      onPress={() => setActiveEvidencePop(null)}
                      style={{
                        marginTop: 12,
                        backgroundColor: COLORS.teal,
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Close Evidence</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* 2. Repository Coverage */}
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.navy, marginBottom: 12, letterSpacing: 0.5 }}>REPOSITORY COVERAGE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
                <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.navy }}>{githubState.reposAnalyzed}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2, textAlign: 'center' }}>Repositories Analyzed</Text>
                </View>

                <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.teal }}>{githubState.skills.length}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2, textAlign: 'center' }}>Skills with Evidence</Text>
                </View>

                <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.navy }}>{githubState.reposAnalyzed}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 2, textAlign: 'center' }}>Selected Repos</Text>
                </View>
              </View>

              {/* 3. Compact Technology Summary */}
              {githubState.skills.length > 0 && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.navy, marginBottom: 12, letterSpacing: 0.5 }}>TECHNOLOGY SUMMARY</Text>
                  <View style={{ gap: 8, marginBottom: 22 }}>
                    {githubState.skills.slice(0, 5).map((tech, tIdx) => (
                      <View key={tIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy }}>{tech.name}</Text>
                        <Text style={{ fontSize: 12, color: COLORS.muted }}>
                          Detected across {tech.repository_count || 1} repository{(tech.repository_count || 1) > 1 ? 'ies' : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* 4. Evidence Sources & Provenance */}
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.navy, marginBottom: 12, letterSpacing: 0.5 }}>EVIDENCE SOURCES</Text>
              <View style={{ gap: 8, marginBottom: 22 }}>
                {githubState.skills.length > 0 && githubState.skills[0].signals && githubState.skills[0].signals.length > 0 ? (
                  githubState.skills[0].signals.slice(0, 3).map((sig, sIdx) => (
                    <View key={sIdx} style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#0369A1', fontWeight: '700' }}>
                        ✓ {sig.file_path || sig.repository_name || 'package.json'}
                      </Text>
                      <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>
                        {sig.evidence_description || 'Technical dependency detected'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={{ padding: 10, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#0369A1', fontWeight: '700' }}>✓ package.json / source tree</Text>
                    <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>Technical evidence detected across user repository tree</Text>
                  </View>
                )}
              </View>

              {/* 5. How to interpret index disclaimer */}
              <View style={{ backgroundColor: '#F1F5F9', padding: 14, borderRadius: 10, marginBottom: 18 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.navy, marginBottom: 4 }}>Technical Evidence Strength</Text>
                <Text style={{ fontSize: 11.5, color: COLORS.muted, lineHeight: 16 }}>
                  This index represents the strength and breadth of technical evidence detected across your selected GitHub repositories. It is not a measure of human proficiency.
                </Text>
              </View>

              {/* Close Button */}
              <Pressable
                style={{ backgroundColor: COLORS.navy, paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => setIsSkillIndexModalOpen(false)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Complete Skill Gap Analysis Modal */}
      {isSkillGapAnalysisModalOpen && (
        <View style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            maxWidth: 720,
            width: '100%',
            maxHeight: '90vh',
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            overflow: 'hidden',
          }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.ink }}>🎯 Complete Skill Gap Analysis</Text>
                  <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>
                    Comprehensive ESCO skill gap breakdown across your target career goals
                  </Text>
                </View>
                <Pressable
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setIsSkillGapAnalysisModalOpen(false)}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.navy }}>✕</Text>
                </Pressable>
              </View>

              {/* Selected Target Careers Chips */}
              <View style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, marginBottom: 18, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 8, letterSpacing: 0.5 }}>SELECTED CAREER GOALS ({activeTargetCareers.length})</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {activeTargetCareers.map((car, idx) => (
                    <View key={idx} style={{ backgroundColor: COLORS.greenLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#C6F6D5' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.green }}>🎯 {car}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Tab Selector */}
              <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 10, marginBottom: 18 }}>
                <Pressable
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: gapAnalysisTab === 'combined' ? '#FFFFFF' : 'transparent' }}
                  onPress={() => setGapAnalysisTab('combined')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: gapAnalysisTab === 'combined' ? COLORS.green : COLORS.muted }}>Combined Skill Gaps ({computedGapData.skill_gaps ? computedGapData.skill_gaps.length : 0})</Text>
                </Pressable>
                <Pressable
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: gapAnalysisTab === 'breakdown' ? '#FFFFFF' : 'transparent' }}
                  onPress={() => setGapAnalysisTab('breakdown')}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: gapAnalysisTab === 'breakdown' ? COLORS.green : COLORS.muted }}>Breakdown by Career</Text>
                </Pressable>
              </View>

              {gapAnalysisTab === 'combined' ? (
                /* Tab 1: Combined Skill Gaps List */
                <View style={{ gap: 12, marginBottom: 20 }}>
                  {computedGapData.skill_gaps && computedGapData.skill_gaps.length > 0 ? (
                    computedGapData.skill_gaps.map((gap, idx) => {
                      const isHigh = gap.priority === 'High Priority';
                      return (
                        <View key={idx} style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 20 }}>{gap.icon || '🚀'}</Text>
                              <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.ink }}>{gap.skill_name}</Text>
                            </View>
                            <View style={{ backgroundColor: isHigh ? COLORS.roseLight : COLORS.amberLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: isHigh ? COLORS.rose : COLORS.amber }}>{gap.priority}</Text>
                            </View>
                          </View>

                          <View style={{ gap: 4, marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>Current Level: <Text style={{ fontWeight: '700', color: COLORS.ink }}>{gap.current_level}%</Text></Text>
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>Required Level: <Text style={{ fontWeight: '700', color: COLORS.green }}>{gap.required_level}%</Text></Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                              <View style={{ height: '100%', width: `${Math.min(100, Math.max(5, gap.current_level))}%`, backgroundColor: gap.current_level >= 50 ? COLORS.green : COLORS.rose }} />
                            </View>
                          </View>

                          {/* Required by Careers list */}
                          {gap.required_by_careers && gap.required_by_careers.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.muted }}>Required by:</Text>
                              {gap.required_by_careers.map((reqCar, cIdx) => (
                                <View key={cIdx} style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 11, color: COLORS.navy, fontWeight: '600' }}>• {reqCar}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ fontSize: 13, color: COLORS.muted, textAlign: 'center', marginVertical: 20 }}>No skill gaps detected across your selected career goals.</Text>
                  )}
                </View>
              ) : (
                /* Tab 2: Breakdown by Career */
                <View style={{ gap: 14, marginBottom: 20 }}>
                  {activeTargetCareers.map((carName, cIdx) => {
                    const carSkills = computedGapData.career_skills_map?.[carName] || [];
                    return (
                      <View key={cIdx} style={{ backgroundColor: '#F8FAFC', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.navy, marginBottom: 10 }}>🎯 {carName}</Text>
                        <View style={{ gap: 8 }}>
                          {carSkills.length > 0 ? (
                            carSkills.map((sk, sIdx) => {
                              const sName = sk.skill_name || sk.name;
                              return (
                                <View key={sIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 14 }}>{sk.icon || '⚡'}</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>{sName}</Text>
                                  </View>
                                  <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.green }}>{sk.required_level || sk.req || 80}% Required</Text>
                                    <Text style={{ fontSize: 10.5, color: COLORS.muted }}>{sk.relation || 'essential'}</Text>
                                  </View>
                                </View>
                              );
                            })
                          ) : (
                            <Text style={{ fontSize: 12, color: COLORS.muted }}>General competency requirements applied.</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Close Button */}
              <Pressable
                style={{ backgroundColor: COLORS.navy, paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => setIsSkillGapAnalysisModalOpen(false)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Close Analysis</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Single Skill Analysis Modal */}
      {selectedSkillModal && (
        <View style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            maxWidth: 580,
            width: '100%',
            maxHeight: '90vh',
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            overflow: 'hidden',
          }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.ink }}>{selectedSkillModal.name}</Text>
                  <Text style={{ fontSize: 13, color: COLORS.teal, fontWeight: '600', marginTop: 2 }}>
                    {selectedSkillModal.rating || getEvidenceLevelText(selectedSkillModal.score || selectedSkillModal.percentage || 0)}
                  </Text>
                </View>
                <Pressable
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setSelectedSkillModal(null)}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.navy }}>✕</Text>
                </Pressable>
              </View>

              {/* Score & Progress Ring */}
              <View style={{ alignItems: 'center', paddingVertical: 16, backgroundColor: '#F8FAFC', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 32, fontWeight: '900', color: COLORS.navy }}>
                  {selectedSkillModal.score || selectedSkillModal.percentage || 0} <Text style={{ fontSize: 14, color: COLORS.muted }}>/ 100</Text>
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.teal, marginTop: 4 }}>
                  Technical Evidence Strength
                </Text>

                <View style={{ width: '85%', height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${selectedSkillModal.score || selectedSkillModal.percentage || 0}%`, backgroundColor: COLORS.teal, borderRadius: 4 }} />
                </View>

                <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>
                  Detected across {selectedSkillModal.repository_count || 1} repository{(selectedSkillModal.repository_count || 1) > 1 ? 'ies' : ''}
                </Text>
              </View>

              {/* Evidence Breakdown (4 Dimensions) */}
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.navy, marginBottom: 12, letterSpacing: 0.5 }}>EVIDENCE BREAKDOWN</Text>
              <View style={{ gap: 10, marginBottom: 20 }}>
                {(() => {
                  const s = selectedSkillModal.score || selectedSkillModal.percentage || 0;
                  const c1 = Math.min(45, Math.round(s * 0.45));
                  const c2 = Math.min(30, Math.round(s * 0.30));
                  const c3 = Math.min(15, Math.round(s * 0.15));
                  const c4 = Math.min(10, Math.round(s * 0.10));

                  return (
                    <>
                      <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.navy }}>Source Code Usage</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.teal }}>{c1} / 45</Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${(c1 / 45) * 100}%`, backgroundColor: COLORS.teal }} />
                        </View>
                      </View>

                      <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.navy }}>Manifest & Framework Config</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.teal }}>{c2} / 30</Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${(c2 / 30) * 100}%`, backgroundColor: COLORS.teal }} />
                        </View>
                      </View>

                      <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.navy }}>Architecture & Conventions</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.teal }}>{c3} / 15</Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${(c3 / 15) * 100}%`, backgroundColor: COLORS.teal }} />
                        </View>
                      </View>

                      <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.navy }}>Documentation & Topics</Text>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.teal }}>{c4} / 10</Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${(c4 / 10) * 100}%`, backgroundColor: COLORS.teal }} />
                        </View>
                      </View>
                    </>
                  );
                })()}
              </View>

              {/* Repository Provenance */}
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.navy, marginBottom: 12, letterSpacing: 0.5 }}>REPOSITORY PROVENANCE</Text>
              <View style={{ gap: 10, marginBottom: 20 }}>
                {selectedSkillModal.signals && selectedSkillModal.signals.length > 0 ? (
                  selectedSkillModal.signals.map((sig, sIdx) => (
                    <View key={sIdx} style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy }}>✓ {sig.repository_name || 'Repository'}</Text>
                        <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>PUBLIC</Text>
                        </View>
                      </View>
                      {sig.file_path && (
                        <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#0369A1', marginTop: 4 }}>📄 {sig.file_path}</Text>
                      )}
                      <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{sig.evidence_description || 'Technical evidence detected'}</Text>
                    </View>
                  ))
                ) : (
                  <View style={{ padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy }}>✓ Analyzed Repositories</Text>
                    <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>Detected evidence in user projects for {selectedSkillModal.name}</Text>
                  </View>
                )}
              </View>

              {/* Disclaimer Subtext */}
              <View style={{ backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 11, color: COLORS.muted, textAlign: 'center', lineHeight: 16 }}>
                  Technical Evidence Strength: This score represents the strength of technical evidence found in the selected GitHub repositories. It is not a measure of human proficiency.
                </Text>
              </View>

              {/* Close Action */}
              <Pressable
                style={{ backgroundColor: COLORS.navy, paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => setSelectedSkillModal(null)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      )}
      {/* View All Skills Modal Popup */}
      {showAllSkills && (
        <View style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            maxWidth: 640,
            width: '100%',
            maxHeight: '85vh',
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            overflow: 'hidden',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.ink }}>All Verified Skills</Text>
                <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 2 }}>
                  Complete breakdown of your skills ordered by proficiency percentage
                </Text>
              </View>
              <Pressable
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}
                onPress={() => setShowAllSkills(false)}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.navy }}>✕</Text>
              </Pressable>
            </View>

            {/* List of All Skills percentage wise */}
            <ScrollView contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={true}>
              <View style={[styles.skillsFlexRow, !isTablet && styles.skillsFlexColumn]}>
                <View style={styles.skillHalfCol}>
                  {formattedSkills.slice(0, Math.ceil(formattedSkills.length / 2)).map(s => renderSkillRow(s.name, s.score))}
                </View>
                <View style={styles.skillHalfCol}>
                  {formattedSkills.slice(Math.ceil(formattedSkills.length / 2)).map(s => renderSkillRow(s.name, s.score))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.subtle, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.muted }}>
                Total Skills: {formattedSkills.length}
              </Text>
              <Pressable
                style={{ backgroundColor: COLORS.navy, paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 }}
                onPress={() => setShowAllSkills(false)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Helper render functions
function renderMiniBar(label, percentage) {
  return (
    <View style={styles.miniBarRow}>
      <Text style={styles.miniBarLabel}>{label}</Text>
      <View style={styles.miniBarTrackWrap}>
        <View style={styles.miniBarTrack}>
          <View style={[styles.miniBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.miniBarPercent}>{percentage}%</Text>
      </View>
    </View>
  );
}

function getSkillColor(score) {
  if (score >= 60) return COLORS.green;
  if (score >= 40) return COLORS.amber;
  return COLORS.rose;
}

function renderSkillRow(name, score, color) {
  const fillColor = color || getSkillColor(score);
  return (
    <View style={styles.skillRow} key={name}>
      <Text style={styles.skillName}>{name}</Text>
      <View style={styles.skillTrackRow}>
        <View style={styles.skillTrack}>
          <View style={[styles.skillFill, { width: `${score}%`, backgroundColor: fillColor }]} />
        </View>
        <Text style={styles.skillScore}>{score}%</Text>
      </View>
    </View>
  );
}

function renderPipelineNode(number, label) {
  return (
    <View style={styles.pipelineNode}>
      <View style={[styles.pipelineNodeCircle, number === '0' ? styles.nodeInactive : styles.nodeActive]}>
        <Text style={[styles.pipelineNodeNumber, number === '0' ? styles.numInactive : styles.numActive]}>
          {number}
        </Text>
      </View>
      <Text style={styles.pipelineNodeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 64,
  },
  // 1. Welcome Row
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  welcomeTextWrap: {
    flex: 1,
    minWidth: 280,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.ink,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 6,
  },
  profileCompletionWrap: {
    width: 240,
    backgroundColor: COLORS.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 12,
  },
  completionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  completionProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  completionTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    marginRight: 10,
    overflow: 'hidden',
  },
  completionBar: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 3,
  },
  completionValue: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
  },
  // 2. Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  metricsGridMobile: {
    flexDirection: 'column',
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  metricSubtext: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  circleContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  // Progress Ring simulation
  progressRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 6,
    borderColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring78: {
    borderTopColor: COLORS.green,
    borderLeftColor: COLORS.green,
    borderRightColor: COLORS.green,
  },
  ring74: {
    borderTopColor: COLORS.green,
    borderLeftColor: COLORS.green,
    borderRightColor: COLORS.green,
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  ringValueText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.ink,
  },
  ringTotalText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.muted,
    marginTop: 1,
  },
  metricInfoText: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 15,
  },
  metricLink: {
    borderTopWidth: 1,
    borderTopColor: COLORS.subtle,
    paddingTop: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  metricLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  internshipMatchBox: {
    backgroundColor: COLORS.canvas,
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  matchRateTag: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  matchRateTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.green,
  },
  matchJobTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
  },
  matchCompany: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
  },
  scoreGreen: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.green,
  },
  scoreTotal: {
    fontSize: 14,
    color: COLORS.muted,
    marginLeft: 2,
  },
  statusPillGreen: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 12,
  },
  statusPillTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.green,
  },
  barsList: {
    gap: 8,
    marginVertical: 6,
  },
  // Mini Progress Bar inside metric cards
  miniBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniBarLabel: {
    fontSize: 11,
    color: COLORS.muted,
    width: 60,
  },
  miniBarTrackWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.subtle,
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },
  miniBarPercent: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.ink,
    width: 26,
    textAlign: 'right',
  },
  // 3. AI Recommendation Card
  aiRecommendationCard: {
    backgroundColor: '#f0f9ff', // Light soft blue
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: 20,
    marginBottom: 28,
  },
  aiRecHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  aiRecTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0369a1',
  },
  aiRecLink: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.blue,
  },
  aiRecText: {
    fontSize: 13.5,
    color: '#0c4a6e',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  recommendationBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  recBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369a1',
  },
  // Sections General
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.ink,
  },
  sectionHeaderLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.green,
  },
  sectionHeaderCounter: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
  },
  // 4. Your Skill Gaps
  gapCardsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gapCardsRowMobile: {
    flexDirection: 'column',
  },
  gapCard: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    justifyContent: 'space-between',
  },
  gapCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gapCardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gapCardIconText: {
    fontSize: 16,
  },
  gapCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ink,
    flex: 1,
  },
  priorityBadgeRed: {
    backgroundColor: COLORS.roseLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeTextRed: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.rose,
  },
  priorityBadgeYellow: {
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeTextYellow: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#d97706',
  },
  gapDetails: {
    marginBottom: 16,
  },
  gapLevelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gapLevelLabel: {
    fontSize: 11.5,
    color: COLORS.muted,
  },
  gapLevelValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.ink,
  },
  gapLevelValueBold: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.green,
  },
  gapTrack: {
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  gapBar: {
    height: '100%',
    borderRadius: 3,
  },
  gapRequiredRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  learnBtn: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  learnBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
  },
  // 5. Your Skills
  skillsContainerCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 20,
  },
  skillsFlexRow: {
    flexDirection: 'row',
    gap: 32,
  },
  skillsFlexColumn: {
    flexDirection: 'column',
    gap: 0,
  },
  skillHalfCol: {
    flex: 1,
    gap: 12,
  },
  skillRow: {
    marginBottom: 2,
  },
  skillName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 4,
  },
  skillTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.subtle,
    borderRadius: 3,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    borderRadius: 3,
  },
  skillScore: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.ink,
    width: 32,
    textAlign: 'right',
    marginLeft: 10,
  },
  // 6. Your Career Goal
  goalCardContainer: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 20,
  },
  goalHintText: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  goalBoxesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  goalBoxesColumn: {
    flexDirection: 'column',
  },
  goalBox: {
    flex: 1,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  goalBoxLeftContent: {
    flex: 1,
  },
  goalBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  goalBoxTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
  },
  goalBoxSub: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 15,
  },
  goalCircleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
    top: 24,
  },
  goalSkillsList: {
    gap: 6,
  },
  goalSkillItem: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.navy,
  },
  watchesList: {
    gap: 6,
  },
  watchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  watchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  watchValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.green,
  },
  // 7. Personalized Learning
  learningLayout: {
    flexDirection: 'row',
    gap: 16,
  },
  learningLayoutColumn: {
    flexDirection: 'column',
  },
  activePathCard: {
    flex: 1.2,
    backgroundColor: COLORS.green,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'space-between',
    minHeight: 220,
  },
  activePathFullWidth: {
    width: '100%',
  },
  activePathHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeTag: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.paper,
  },
  activeIcon: {
    fontSize: 20,
  },
  activePathTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.paper,
    marginTop: 12,
  },
  activePathDesc: {
    fontSize: 12.5,
    color: COLORS.paper,
    opacity: 0.85,
    marginTop: 4,
    lineHeight: 18,
  },
  activeProgressSection: {
    marginVertical: 14,
  },
  activeProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activeProgressLabel: {
    fontSize: 11.5,
    color: COLORS.paper,
    opacity: 0.8,
  },
  activeProgressVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.paper,
  },
  activeTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  activeBar: {
    height: '100%',
    backgroundColor: COLORS.paper,
    borderRadius: 3,
  },
  continueBtn: {
    backgroundColor: COLORS.paper,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.green,
  },
  recPathsColumn: {
    flex: 1,
    gap: 12,
  },
  recPathRowCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  pathIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pathIconText: {
    fontSize: 18,
  },
  pathInfo: {
    flex: 1,
  },
  pathTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  pathDesc: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 2,
  },
  startPathBtn: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  startPathBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
  },
  // 8. Recommended Internships
  internshipCardsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  internshipCardsMobile: {
    flexDirection: 'column',
  },
  internshipCard: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 180,
  },
  internHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  internTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    flex: 1,
    marginRight: 8,
  },
  matchTagGreen: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchTagTextGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.green,
  },
  matchTagYellow: {
    backgroundColor: COLORS.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchTagTextYellow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
  },
  internCompany: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  internDesc: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  viewOpportunityBtn: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewOpportunityBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.navy,
  },
  // 9. Pipeline & Readiness Card Row
  rowLayout: {
    flexDirection: 'row',
    gap: 16,
  },
  rowLayoutMobile: {
    flexDirection: 'column',
  },
  pipelineCard: {
    flex: 1.2,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
  },
  readinessCard: {
    flex: 1,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 16,
  },
  cardHeaderWithLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sideCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.ink,
  },
  sideCardLink: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  // Pipeline timeline layout
  pipelineTimeline: {
    height: 70,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 8,
  },
  timelineConnectLine: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: 2,
    backgroundColor: COLORS.subtle,
    top: 20,
  },
  timelineNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pipelineNode: {
    alignItems: 'center',
    width: '24%',
  },
  pipelineNodeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 2,
  },
  nodeActive: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.green,
  },
  nodeInactive: {
    backgroundColor: COLORS.canvas,
    borderColor: COLORS.subtle,
  },
  pipelineNodeNumber: {
    fontSize: 14,
    fontWeight: '900',
  },
  numActive: {
    color: COLORS.green,
  },
  numInactive: {
    color: COLORS.muted,
  },
  pipelineNodeLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 8,
    fontWeight: '600',
  },
  // Readiness card elements
  readinessContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  readinessCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  readinessCircleVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.ink,
  },
  readinessTextWrap: {
    flex: 1,
  },
  readinessRoleTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.ink,
  },
  readinessRoleDesc: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 1,
  },
  readinessStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  readinessStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green,
  },
  startMockBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  startMockBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.paper,
  },
  // 10. Today's Action Plan
  actionPlanCard: {
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 20,
  },
  actionItemsList: {
    gap: 12,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  checkMark: {
    color: COLORS.paper,
    fontSize: 12,
    fontWeight: '900',
  },
  actionText: {
    fontSize: 13.5,
    color: COLORS.ink,
    fontWeight: '600',
  },
  actionTextCompleted: {
    color: COLORS.muted,
    textDecorationLine: 'line-through',
  },
  // 11. Ask SkillSetu AI
  aiChatContainer: {
    backgroundColor: COLORS.panel,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    padding: 28,
    alignItems: 'center',
    marginTop: 12,
  },
  aiChatIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  aiChatIconText: {
    fontSize: 22,
  },
  aiChatTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.ink,
    textAlign: 'center',
  },
  aiChatSubtitle: {
    fontSize: 13.5,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 480,
    marginBottom: 20,
  },
  aiInputRow: {
    width: '100%',
    maxWidth: 520,
    height: 50,
    backgroundColor: COLORS.paper,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
    marginBottom: 16,
  },
  aiInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.ink,
    paddingVertical: 0,
  },
  aiSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSubmitBtnText: {
    color: COLORS.paper,
    fontSize: 14,
    fontWeight: '900',
  },
  aiChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 640,
  },
  aiChip: {
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.subtle,
  },
  aiChipText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
});
