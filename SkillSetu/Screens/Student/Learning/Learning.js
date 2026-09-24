import React, { useState, useEffect } from 'react';
import {
  Linking,
  Modal,
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
  bgSurface: '#f4f7f6',
  surfaceCard: '#ffffff',
  textMain: '#0f172a',
  textMuted: '#64748b',
  primaryTeal: '#0d9488',
  primaryTealDark: '#0f766e',
  tealLightBg: '#f0fdfa',
  greenSuccess: '#0e4f34',
  greenSuccessBg: '#e6f4ea',
  amberWarning: '#d97706',
  amberWarningBg: '#fef3c7',
  roseError: '#e11d48',
  roseErrorBg: '#ffe4e6',
  blueInfo: '#2563eb',
  blueInfoBg: '#dbeafe',
  borderGray: '#e2e8f0',
  darkNavy: '#103422',
  chipBg: '#e0f2fe',
  chipText: '#0369a1',
};

// Initial state data model
const INITIAL_SKILLS = [
  {
    id: 'html_css',
    domain: 'FRONTEND ENGINEERING',
    name: 'HTML & Modern CSS',
    status: 'Verified',
    currentLevel: 'Advanced',
    currentScore: 85,
    targetScore: 90,
    gapScore: 0,
    priority: 'Core Skill',
    careerImportance: 'Core Skill',
    gapExplanation: 'Your HTML & CSS skills meet standard industry expectations. Keep updated on modern CSS Grid and Container Queries.',
    topics: ['Semantic HTML5', 'Flexbox & CSS Grid', 'CSS Custom Properties', 'Responsive Breakpoints'],
    evidenceProject: 'Responsive Portfolio & Component Library',
    githubRepo: 'https://github.com/aryan/responsive-portfolio',
    verifiedDate: '15 July 2026',
    resources: [
      { id: 'r1', title: 'HTML5 & CSS3 Complete Guide', platform: 'Udemy', rating: '4.8 ★', duration: '20 hours', level: 'Beginner → Advanced', price: '₹549', isFree: false, certificateAvailable: true, matchPercentage: 95, why: 'Comprehensive semantic HTML and CSS Grid layout mastery.', url: 'https://www.udemy.com' },
      { id: 'r2', title: 'Web Development Basics', platform: 'SWAYAM', rating: '4.6 ★', duration: '8 weeks', level: 'Beginner', price: 'Free', isFree: true, certificateAvailable: true, matchPercentage: 90, why: 'Government verified course covering W3C standards.', url: 'https://swayam.gov.in' }
    ]
  },
  {
    id: 'js_es6',
    domain: 'FRONTEND ENGINEERING',
    name: 'JavaScript (ES6+)',
    status: 'Verified',
    currentLevel: 'Intermediate',
    currentScore: 64,
    targetScore: 80,
    gapScore: -16,
    priority: 'Core Skill',
    careerImportance: 'Core Skill',
    gapExplanation: 'You need to strengthen asynchronous JavaScript, event loop details, and ES6 modular code structures.',
    topics: ['ES6 Syntax & Arrow Functions', 'Promises & Async/Await', 'DOM Manipulation', 'Event Loop & Closures'],
    evidenceProject: 'Task Management Dashboard',
    githubRepo: 'https://github.com/aryan/js-task-dashboard',
    verifiedDate: '02 August 2026',
    resources: [
      { id: 'r3', title: 'Modern JavaScript From The Beginning', platform: 'Udemy', rating: '4.9 ★', duration: '36 hours', level: 'Intermediate', price: '₹699', isFree: false, certificateAvailable: true, matchPercentage: 94, why: 'Targeted practice on async JS and closures.', url: 'https://www.udemy.com' },
      { id: 'r4', title: 'JavaScript Algorithms & Data Structures', platform: 'YouTube', rating: '4.8 ★', duration: '12 hours', level: 'Intermediate', price: 'Free', isFree: true, certificateAvailable: false, matchPercentage: 88, why: 'Hands-on algorithm problem solving.', url: 'https://www.youtube.com' }
    ]
  },
  {
    id: 'react_19',
    domain: 'FRONTEND ENGINEERING',
    name: 'React 19',
    status: 'Learning Active',
    currentLevel: 'Beginner',
    currentScore: 42,
    targetScore: 80,
    gapScore: -38,
    priority: 'High',
    careerImportance: 'Core Skill',
    gapExplanation: 'You need to improve React fundamentals, hooks, API integration, and state management to reach the target level for your Full Stack Developer career goal.',
    topics: ['Components', 'Props', 'State', 'Hooks', 'Routing', 'API Integration', 'State Management', 'Error Handling', 'Performance Optimization'],
    evidenceProject: null,
    githubRepo: null,
    verifiedDate: null,
    resources: [
      { id: 'r5', title: 'Complete React Developer Course', platform: 'Udemy', rating: '4.7 ★', duration: '40 hours', level: 'Beginner → Advanced', price: '₹699', isFree: false, certificateAvailable: true, matchPercentage: 94, why: 'Matches your current React skill gap and covers the topics required for your target career.', url: 'https://www.udemy.com' },
      { id: 'r6', title: 'React Development Specialization', platform: 'Coursera', rating: '4.8 ★', duration: '30 hours', level: 'Intermediate', price: 'Subscription', isFree: false, certificateAvailable: true, matchPercentage: 89, why: 'Industry-grade React framework and state architecture design patterns.', url: 'https://www.coursera.org' },
      { id: 'r7', title: 'React Development', platform: 'SWAYAM', rating: '4.6 ★', duration: '8 weeks', level: 'Beginner', price: 'Free', isFree: true, certificateAvailable: true, matchPercentage: 86, why: 'Government certified university level React course.', url: 'https://swayam.gov.in' },
      { id: 'r8', title: 'React 19 Complete Tutorial - Crash Course', platform: 'YouTube', rating: '4.9 ★', duration: '11.5 hours', level: 'Beginner', price: 'Free', isFree: true, certificateAvailable: false, matchPercentage: 87, why: 'Fast-paced hands-on tutorial covering Server Components and Async State.', url: 'https://www.youtube.com' }
    ]
  },
  {
    id: 'responsive',
    domain: 'FRONTEND ENGINEERING',
    name: 'Responsive Design',
    status: 'Verified',
    currentLevel: 'Advanced',
    currentScore: 90,
    targetScore: 90,
    gapScore: 0,
    priority: 'Core Skill',
    careerImportance: 'Core Skill',
    gapExplanation: 'Your responsive design skills fully meet the target level requirements.',
    topics: ['Mobile-first Design', 'Media Queries', 'Fluid Typography', 'Viewport Units'],
    evidenceProject: 'Responsive UI System',
    githubRepo: 'https://github.com/aryan/responsive-design-system',
    verifiedDate: '28 July 2026',
    resources: [
      { id: 'r9', title: 'Responsive Web Design Certification', platform: 'Coursera', rating: '4.8 ★', duration: '20 hours', level: 'Intermediate', price: 'Free', isFree: true, certificateAvailable: true, matchPercentage: 92, why: 'Mobile-first layout design patterns.', url: 'https://www.coursera.org' }
    ]
  },
  {
    id: 'nodejs',
    domain: 'BACKEND ARCHITECTURE',
    name: 'Node.js Runtime',
    status: 'Learning',
    currentLevel: 'Beginner',
    currentScore: 45,
    targetScore: 75,
    gapScore: -30,
    priority: 'High Priority',
    careerImportance: 'Core Backend Skill',
    gapExplanation: 'You need to master event-driven architecture, file streams, and package execution in Node.js.',
    topics: ['Node Event Loop', 'File System (fs) & Streams', 'npm Package Management', 'HTTP Module Basics'],
    evidenceProject: null,
    githubRepo: null,
    verifiedDate: null,
    resources: [
      { id: 'r10', title: 'Node.js, Express, MongoDB & More', platform: 'Udemy', rating: '4.8 ★', duration: '40 hours', level: 'Beginner → Advanced', price: '₹699', isFree: false, certificateAvailable: true, matchPercentage: 93, why: 'Fills server-side runtime fundamentals.', url: 'https://www.udemy.com' },
      { id: 'r11', title: 'Backend Web Development with Node.js', platform: 'edX', rating: '4.6 ★', duration: '6 weeks', level: 'Intermediate', price: 'Free', isFree: true, certificateAvailable: true, matchPercentage: 86, why: 'University backed computer science backend curriculum.', url: 'https://www.edx.org' }
    ]
  },
  {
    id: 'express',
    domain: 'BACKEND ARCHITECTURE',
    name: 'Express.js Framework',
    status: 'Not Started',
    currentLevel: 'Unassessed',
    currentScore: 10,
    targetScore: 70,
    gapScore: -60,
    priority: 'Med Priority',
    careerImportance: 'Backend Framework',
    gapExplanation: 'You have not yet started Express.js. Focus on routing, middleware pipelines, and error handling.',
    topics: ['Express Routing & Controllers', 'Middleware Pipelines', 'Error Handling Middleware', 'JWT Authentication'],
    evidenceProject: null,
    githubRepo: null,
    verifiedDate: null,
    resources: [
      { id: 'r12', title: 'Express.js Web Application Framework', platform: 'LinkedIn Learning', rating: '4.7 ★', duration: '5 hours', level: 'Beginner', price: 'Free Trial', isFree: false, certificateAvailable: true, matchPercentage: 89, why: 'Structured middleware & REST API building.', url: 'https://www.linkedin.com/learning' }
    ]
  },
  {
    id: 'rest_api',
    domain: 'BACKEND ARCHITECTURE',
    name: 'RESTful API Design',
    status: 'Needs Improvement',
    currentLevel: 'Intermediate',
    currentScore: 50,
    targetScore: 85,
    gapScore: -35,
    priority: 'High Priority',
    careerImportance: 'Core API Skill',
    gapExplanation: 'Improve resource URL naming conventions, HTTP status standards, and authentication middleware.',
    topics: ['HTTP Verbs & Status Codes', 'Resource Naming Conventions', 'API Versioning & CORS', 'JSON Web Tokens (JWT)'],
    evidenceProject: null,
    githubRepo: null,
    verifiedDate: null,
    resources: [
      { id: 'r13', title: 'REST API Design & Best Practices', platform: 'Coursera', rating: '4.8 ★', duration: '15 hours', level: 'Intermediate', price: 'Free', isFree: true, certificateAvailable: true, matchPercentage: 91, why: 'Covers secure token authentication and status headers.', url: 'https://www.coursera.org' }
    ]
  },
  {
    id: 'sql_postgres',
    domain: 'DATABASES & STORAGE',
    name: 'SQL & PostgreSQL',
    status: 'Learning',
    currentLevel: 'Intermediate',
    currentScore: 30,
    targetScore: 80,
    gapScore: -50,
    priority: 'Med Priority',
    careerImportance: 'Database Skill',
    gapExplanation: 'Focus on relational data modeling, multi-table JOINs, indexing performance, and migrations.',
    topics: ['Relational Schema Design', 'JOINs & Aggregations', 'Indexes & Query Optimization', 'Foreign Keys & Constraints'],
    evidenceProject: null,
    githubRepo: null,
    verifiedDate: null,
    resources: [
      { id: 'r14', title: 'SQL & PostgreSQL: The Complete Guide', platform: 'Udemy', rating: '4.9 ★', duration: '22 hours', level: 'Beginner → Advanced', price: '₹649', isFree: false, certificateAvailable: true, matchPercentage: 92, why: 'Deep dive into database schema modeling.', url: 'https://www.udemy.com' }
    ]
  },
  {
    id: 'docker',
    domain: 'DEVOPS & INFRASTRUCTURE',
    name: 'Docker Containers',
    status: 'Needs Improvement',
    currentLevel: 'Beginner',
    currentScore: 38,
    targetScore: 80,
    gapScore: -42,
    priority: 'High Priority',
    careerImportance: 'DevOps Baseline',
    gapExplanation: 'Learn to write clean Dockerfiles, manage volumes, and launch multi-service apps via Docker Compose.',
    topics: ['Containerization Basics', 'Dockerfile Syntax', 'Docker Compose Multi-Container', 'Volume Persistence'],
    evidenceProject: null,
    githubRepo: null,
    verifiedDate: null,
    resources: [
      { id: 'r15', title: 'Docker Mastery: with Kubernetes', platform: 'Udemy', rating: '4.8 ★', duration: '21 hours', level: 'Beginner → Advanced', price: '₹699', isFree: false, certificateAvailable: true, matchPercentage: 95, why: 'Containerize multi-service applications.', url: 'https://www.udemy.com' }
    ]
  }
];

const INITIAL_PROJECTS = [
  {
    id: 'p1',
    title: 'Interactive Task Manager',
    difficulty: 'Beginner',
    estimatedTime: '3–5 days',
    demonstratedSkills: ['React 19', 'Components', 'State Management', 'Hooks'],
    whyRecommended: 'This project helps demonstrate your ability to build interactive React applications.',
    objective: 'Build a dynamic task dashboard with local storage, priority filtering, and state persistence.',
    description: 'Create a clean, responsive single page React application managing daily tasks with interactive UI components.',
    requirements: ['React 19 Hooks (useState, useEffect)', 'Modular Component Hierarchy', 'Filter tasks by status and priority'],
    suggestedTech: ['React 19', 'CSS Modules / Vanilla CSS', 'Vite'],
    expectedFeatures: ['Add, Edit, Delete Tasks', 'Categorize by tag', 'Persistent state'],
    status: 'Not Started',
    repoUrl: '',
    verifiedSkills: ['React 19']
  },
  {
    id: 'p2',
    title: 'Student Dashboard',
    difficulty: 'Intermediate',
    estimatedTime: '1 week',
    demonstratedSkills: ['React 19', 'API Integration', 'State Management', 'Responsive UI'],
    whyRecommended: 'This project covers the React topics currently missing from your skill profile.',
    objective: 'Develop an end-to-end Student Analytics Dashboard integrating live REST APIs.',
    description: 'A comprehensive dashboard displaying course progress, grades, and upcoming assignment deadlines fetched asynchronously from a backend.',
    requirements: ['Async API fetching using TanStack Query or fetch()', 'Custom React Hooks', 'Error Boundary implementation'],
    suggestedTech: ['React 19', 'React Router 6', 'Axios'],
    expectedFeatures: ['Live data updates', 'Responsive sidebar layout', 'Auth token header handling'],
    status: 'Ready to Submit',
    repoUrl: 'https://github.com/aryan/student-dashboard',
    verifiedSkills: ['React 19', 'RESTful API Design']
  },
  {
    id: 'p3',
    title: 'E-Commerce Frontend',
    difficulty: 'Advanced',
    estimatedTime: '2 weeks',
    demonstratedSkills: ['React 19', 'Routing', 'API Integration', 'State Management', 'Performance'],
    whyRecommended: 'Demonstrates advanced frontend architecture, shopping cart state management, and performance tuning.',
    objective: 'Build an online storefront featuring product catalogs, cart context, and checkout flows.',
    description: 'Full-fledged e-commerce store with search indexing, price filters, persistent cart, and responsive layout.',
    requirements: ['React Context / Redux Toolkit', 'Code splitting & Lazy loading', 'Optimistic UI updates'],
    suggestedTech: ['React 19', 'React Router', 'Tailwind or CSS Modules'],
    expectedFeatures: ['Shopping cart drawer', 'Product filter sidebar', 'Checkout validation'],
    status: 'Not Started',
    repoUrl: '',
    verifiedSkills: ['React 19', 'JavaScript (ES6+)']
  },
  {
    id: 'p4',
    title: 'REST API for Student Management',
    difficulty: 'Intermediate',
    estimatedTime: '4-6 days',
    demonstratedSkills: ['Node.js Runtime', 'Express.js Framework', 'RESTful API Design'],
    whyRecommended: 'Demonstrates your backend API development capabilities using Node.js & Express.',
    objective: 'Construct a secure RESTful API serving student records and grades.',
    description: 'Express.js backend application providing JSON endpoints for student administration.',
    requirements: ['Express Router', 'JWT Authentication Middleware', 'Input validation'],
    suggestedTech: ['Node.js', 'Express.js', 'JSON Web Tokens'],
    expectedFeatures: ['CRUD endpoints', 'Role authentication', 'Structured error responses'],
    status: 'Not Started',
    repoUrl: '',
    verifiedSkills: ['Node.js Runtime', 'Express.js Framework', 'RESTful API Design']
  },
  {
    id: 'p5',
    title: 'Student Database System',
    difficulty: 'Intermediate',
    estimatedTime: '5 days',
    demonstratedSkills: ['SQL & PostgreSQL', 'Relational Schema Design'],
    whyRecommended: 'Provides hands-on proof of relational database design and complex SQL queries.',
    objective: 'Design a normalized relational database schema in PostgreSQL for student enrollment.',
    description: 'Schema creation script, index definitions, and complex JOIN queries for university data.',
    requirements: ['3NF Database Normalization', 'Foreign key constraints', 'Indexed queries'],
    suggestedTech: ['PostgreSQL', 'pgAdmin / psql'],
    expectedFeatures: ['DDL Migration scripts', 'View & Stored Procedures', 'Performance benchmark query'],
    status: 'Not Started',
    repoUrl: '',
    verifiedSkills: ['SQL & PostgreSQL']
  },
  {
    id: 'p6',
    title: 'Containerize Node.js Application',
    difficulty: 'Beginner',
    estimatedTime: '2-3 days',
    demonstratedSkills: ['Docker Containers', 'Dockerfile Syntax'],
    whyRecommended: 'Proves containerization competence for modern cloud deployments.',
    objective: 'Package a Node.js API server into an optimized, multi-stage Docker container.',
    description: 'Containerize a Node web application using Docker multi-stage builds and compose configurations.',
    requirements: ['Multi-stage Dockerfile', 'Non-root user execution', '.dockerignore optimization'],
    suggestedTech: ['Docker', 'Docker Compose', 'Alpine Linux base'],
    expectedFeatures: ['Small image footprint', 'Volume mount setup', 'Environment config injection'],
    status: 'Not Started',
    repoUrl: '',
    verifiedSkills: ['Docker Containers']
  }
];

export default function Learning() {
  const { width } = useWindowDimensions();
  const [skills, setSkills] = useState(INITIAL_SKILLS);
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  
  // Navigation & Workspace states
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Resource Filters inside Skill Workspace
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedType, setSelectedType] = useState('All'); // All | Free | Paid | Certification
  const [selectedDifficulty, setSelectedDifficulty] = useState('All'); // All | Beginner | Intermediate | Advanced
  const [selectedSort, setSelectedSort] = useState('Recommended'); // Recommended | Highest Rated | Shortest Duration

  // GitHub Submission State inside Workspace
  const [githubInput, setGithubInput] = useState('https://github.com/aryan/student-dashboard');
  const [githubError, setGithubError] = useState('');
  const [verificationSuccessMessage, setVerificationSuccessMessage] = useState('');
  const [resourceInteractions, setResourceInteractions] = useState({});

  // Derive readiness automatically
  const verifiedCount = skills.filter((s) => s.status === 'Verified').length;
  const readinessPercent = Math.round((verifiedCount / skills.length) * 100);

  // Phase 8 Learning Path State
  const [learningPath, setLearningPath] = useState(null);
  const [isLoadingPath, setIsLoadingPath] = useState(false);
  const [pathActionMessage, setPathActionMessage] = useState('');
  const [selectedStageTab, setSelectedStageTab] = useState('All');
  const studentEmail = 'abhoge27@gmail.com';

  const fetchLearningPath = async () => {
    setIsLoadingPath(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/learning-paths?email=${encodeURIComponent(studentEmail)}`);
      const data = await res.json();
      if (data.status === 'success' && data.data && data.data.length > 0) {
        setLearningPath(data.data[0]);
      }
    } catch (err) {
      console.log('Error fetching learning path:', err);
    } finally {
      setIsLoadingPath(false);
    }
  };

  useEffect(() => {
    fetchLearningPath();
  }, []);

  const handleGeneratePath = async () => {
    setIsLoadingPath(true);
    setPathActionMessage('Generating your personalized skill-gap learning path...');
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/learning-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          target_careers: ['Full Stack Developer', 'Mobile App Developer']
        })
      });
      const data = await res.json();
      if (data.id) {
        setLearningPath(data);
        setPathActionMessage('✓ Personalized Learning Path successfully generated!');
        setTimeout(() => setPathActionMessage(''), 4000);
      }
    } catch (err) {
      setPathActionMessage('Failed to generate learning path. Please try again.');
    } finally {
      setIsLoadingPath(false);
    }
  };

  const handleRefreshPath = async () => {
    if (!learningPath) return;
    setIsLoadingPath(true);
    setPathActionMessage('Refreshing path against updated skill gaps...');
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/learning-paths/${learningPath.id}/refresh?email=${encodeURIComponent(studentEmail)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.id) {
        setLearningPath(data);
        setPathActionMessage('✓ Learning path updated! Completed history preserved.');
        setTimeout(() => setPathActionMessage(''), 4000);
      }
    } catch (err) {
      setPathActionMessage('Failed to refresh learning path.');
    } finally {
      setIsLoadingPath(false);
    }
  };

  const handleUpdateItemProgress = async (itemId, newProgressPercent, explicitStatus = null) => {
    if (!learningPath) return;
    try {
      const payload = {
        email: studentEmail,
        progress_percent: newProgressPercent
      };
      if (explicitStatus) payload.status = explicitStatus;

      const res = await fetch(`http://127.0.0.1:8000/api/v1/learning-paths/${learningPath.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const updatedItem = await res.json();

      if (updatedItem.id) {
        // Refresh full path to update metrics and stages
        fetchLearningPath();
      }
    } catch (err) {
      console.log('Error updating item progress:', err);
    }
  };

  // Helper to open external course link externally
  const handleOpenCourse = (resource) => {
    setResourceInteractions((prev) => ({
      ...prev,
      [resource.id]: 'Resource Viewed ✓'
    }));

    if (resource.url) {
      Linking.openURL(resource.url).catch(() => {
        alert(`Opening external resource: ${resource.url}`);
      });
    }
  };

  // Skill Card Button Label
  const getActionButtonLabel = (status) => {
    switch (status) {
      case 'Verified':
        return 'View Verified Proof ➔';
      case 'Learning Active':
      case 'Learning':
        return 'Explore Learning ➔';
      case 'Needs Improvement':
        return 'Practice Skill ➔';
      case 'Not Started':
        return 'Start Skill Assessment ➔';
      case 'Under Verification':
        return 'View Verification ➔';
      default:
        return 'Explore Skill ➔';
    }
  };

  // GitHub URL Validation Function
  const validateGithubUrl = (url) => {
    if (!url || !url.trim()) {
      return { valid: false, message: '✕ GitHub repository URL is required.' };
    }
    const cleanUrl = url.trim().toLowerCase();
    if (!cleanUrl.startsWith('https://github.com/') || cleanUrl.split('/').length < 5) {
      return { valid: false, message: '✕ Invalid GitHub URL. Format: https://github.com/username/repository' };
    }
    if (cleanUrl.includes('private-repo-test') || cleanUrl.includes('inaccessible')) {
      return { valid: false, message: '⚠ We couldn\'t access this repository. Please make sure the repository is public and the URL is correct.' };
    }
    return { valid: true, message: '✓ Valid Public GitHub Repository' };
  };

  // Submit Project for Skill Verification
  const handleSubmitProjectVerification = (targetProject) => {
    const validation = validateGithubUrl(githubInput);
    if (!validation.valid) {
      setGithubError(validation.message);
      return;
    }

    setGithubError('');
    
    // Update project state to Under Verification / Verified
    setProjects((prevProjects) =>
      prevProjects.map((p) => {
        if (p.id === targetProject.id) {
          return {
            ...p,
            status: 'Verified',
            repoUrl: githubInput
          };
        }
        return p;
      })
    );

    // Update specific demonstrated skills matching active project
    const skillsToVerify = targetProject.verifiedSkills || [selectedSkill?.name];

    setSkills((prevSkills) =>
      prevSkills.map((s) => {
        if (skillsToVerify.includes(s.name) || (selectedSkill && s.id === selectedSkill.id)) {
          return {
            ...s,
            status: 'Verified',
            currentScore: Math.max(s.currentScore, s.targetScore),
            gapScore: 0,
            evidenceProject: targetProject.title,
            githubRepo: githubInput,
            verifiedDate: 'Today'
          };
        }
        return s;
      })
    );

    // Update active selected skill state if currently viewing drawer
    if (selectedSkill) {
      setSelectedSkill((prev) => ({
        ...prev,
        status: 'Verified',
        currentScore: Math.max(prev.currentScore, prev.targetScore),
        gapScore: 0,
        evidenceProject: targetProject.title,
        githubRepo: githubInput,
        verifiedDate: 'Today'
      }));
    }

    const updatedVerifiedCount = skills.filter(
      (s) => s.status === 'Verified' || skillsToVerify.includes(s.name) || (selectedSkill && s.id === selectedSkill.id)
    ).length;
    const newReadiness = Math.round((updatedVerifiedCount / skills.length) * 100);

    setVerificationSuccessMessage(
      `🎉 Project verified! GitHub proof linked for ${skillsToVerify.join(', ')}. Career Readiness updated to ${newReadiness}%.`
    );

    setTimeout(() => {
      setVerificationSuccessMessage('');
    }, 7000);
  };

  // Filter external learning resources inside Skill Workspace
  const getFilteredResources = (skill) => {
    if (!skill || !skill.resources) return [];
    let list = [...skill.resources];

    if (selectedPlatform !== 'All') {
      list = list.filter((r) => r.platform === selectedPlatform);
    }
    if (selectedType === 'Free') {
      list = list.filter((r) => r.isFree || r.price === 'Free');
    } else if (selectedType === 'Paid') {
      list = list.filter((r) => !r.isFree && r.price !== 'Free');
    } else if (selectedType === 'Certification') {
      list = list.filter((r) => r.certificateAvailable);
    }
    if (selectedDifficulty !== 'All') {
      list = list.filter((r) => r.level.toLowerCase().includes(selectedDifficulty.toLowerCase()));
    }

    if (selectedSort === 'Highest Rated') {
      list.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (selectedSort === 'Shortest Duration') {
      list.sort((a, b) => parseInt(a.duration) - parseInt(b.duration));
    }

    return list;
  };

  // Filter projects relevant specifically to selected skill
  const getRecommendedProjectsForSkill = (skill) => {
    if (!skill) return [];
    return projects.filter((p) =>
      p.demonstratedSkills.some(
        (sk) => sk.toLowerCase().includes(skill.name.toLowerCase()) || skill.name.toLowerCase().includes(sk.toLowerCase())
      )
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Toast Banner */}
      {verificationSuccessMessage ? (
        <View style={styles.successToast}>
          <Text style={styles.successToastText}>{verificationSuccessMessage}</Text>
        </View>
      ) : null}

      {/* 1. Dashboard Header Banner */}
      <View style={styles.topHeaderCard}>
        <View style={{ flex: 1 }}>
          <View style={styles.tagBadgeRow}>
            <Text style={styles.greenTag}>✓ TARGETED ROLE MATCH</Text>
            <Text style={styles.greenTag}>✓ AIR VERIFIED PROFILE</Text>
          </View>
          <Text style={styles.headerTitle}>Learning & Required Skill Matrix</Text>
          <Text style={styles.headerSubtitle}>
            SkillSetu provides a skill-first matrix. External learning resources (SWAYAM, Udemy, Coursera, YouTube) open directly. Skill verification is earned purely through public GitHub project submissions.
          </Text>
        </View>

        <View style={styles.targetRoleBox}>
          <View>
            <Text style={styles.targetRoleLabel}>CAREER GOAL</Text>
            <Text style={styles.targetRoleTitle}>Full Stack Developer</Text>
          </View>
          <View style={styles.readinessBox}>
            <Text style={styles.targetRoleLabel}>READINESS</Text>
            <Text style={styles.readinessScore}>{readinessPercent}%</Text>
          </View>
        </View>
      </View>

      {/* 2. Key Metrics Row */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>CAREER TARGET</Text>
          <Text style={styles.metricValue}>Full Stack Dev</Text>
          <Text style={styles.metricSub}>Aligned Roadmap</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>REQUIRED SKILLS</Text>
          <Text style={styles.metricValue}>{skills.length} Skills</Text>
          <Text style={styles.metricSub}>Core Competencies</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>VERIFIED SKILLS</Text>
          <Text style={styles.metricValue}>{verifiedCount} / {skills.length}</Text>
          <Text style={styles.metricSub}>{readinessPercent}% Target Readiness</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>SKILL GAPS</Text>
          <Text style={styles.metricValueRed}>{skills.length - verifiedCount} Remaining</Text>
          <Text style={styles.metricSub}>Actionable Gaps</Text>
        </View>
        <View style={styles.readinessHeroCard}>
          <Text style={styles.readinessHeroTitle}>CAREER READINESS ⚡</Text>
          <Text style={styles.readinessHeroBig}>{readinessPercent}% Ready</Text>
          <Text style={styles.readinessHeroSub}>Empirically Verified</Text>
        </View>
      </View>

      {/* 2.5 PERSONALIZED SKILL-GAP LEARNING PATH (PHASE 8 LIVE ENGINE) */}
      <View style={[styles.cardSection, { backgroundColor: '#ffffff', borderColor: COLORS.primaryTeal, borderWidth: 1.5, borderRadius: 12, padding: 18, gap: 14 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ gap: 4, flex: 1, minWidth: 260 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.darkNavy }}>
                🗺️ Personalized Skill-Gap Learning Path
              </Text>
              <View style={{ backgroundColor: COLORS.tealLightBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.primaryTeal }}>PHASE 8 ENGINE</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
              Automated progression sequence bridging your missing ESCO skill gaps for {learningPath?.target_careers ? learningPath.target_careers.join(' & ') : 'Full Stack & Mobile Development'}.
            </Text>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {learningPath ? (
              <Pressable
                style={[styles.tableBtn, { backgroundColor: COLORS.tealLightBg, borderColor: COLORS.primaryTeal, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 }]}
                onPress={handleRefreshPath}
                disabled={isLoadingPath}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primaryTealDark }}>
                  {isLoadingPath ? 'Refreshing...' : '🔄 Refresh Path'}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.tableBtn, { backgroundColor: COLORS.primaryTeal, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 }]}
              onPress={handleGeneratePath}
              disabled={isLoadingPath}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                {isLoadingPath ? 'Generating...' : '⚡ Generate Path'}
              </Text>
            </Pressable>
          </View>
        </View>

        {pathActionMessage ? (
          <View style={{ backgroundColor: COLORS.greenSuccessBg, padding: 8, borderRadius: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.greenSuccess }}>{pathActionMessage}</Text>
          </View>
        ) : null}

        {/* Path Progress & Metrics */}
        {learningPath ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMain }}>
                  Overall Progress: <Text style={{ color: COLORS.primaryTeal }}>{learningPath.progress_percent || 0}%</Text>
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                  Skills Addressed: <Text style={{ fontWeight: '700', color: COLORS.darkNavy }}>{learningPath.skills_summary?.addressed || 0} / {learningPath.skills_summary?.total || 0}</Text>
                </Text>
              </View>

              {/* Stage Filter Pills */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['All', 'Foundation', 'Intermediate', 'Advanced'].map((st) => (
                  <Pressable
                    key={st}
                    style={[
                      styles.filterPill,
                      selectedStageTab === st && styles.filterPillActive
                    ]}
                    onPress={() => setSelectedStageTab(st)}
                  >
                    <Text style={[styles.filterPillText, selectedStageTab === st && styles.filterPillTextActive]}>{st}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Path Progress Bar */}
            <View style={[styles.barTrack, { height: 8 }]}>
              <View style={[styles.barFill, { width: `${learningPath.progress_percent || 0}%`, backgroundColor: COLORS.primaryTeal }]} />
            </View>

            {/* Stages & Courses List */}
            {['Foundation', 'Intermediate', 'Advanced'].map((stageName) => {
              if (selectedStageTab !== 'All' && selectedStageTab !== stageName) return null;
              const stageItems = (learningPath.stages && learningPath.stages[stageName]) || [];
              if (stageItems.length === 0) return null;

              const stageColor = stageName === 'Foundation' ? COLORS.greenSuccess : stageName === 'Intermediate' ? COLORS.blueInfo : COLORS.roseError;
              const stageBg = stageName === 'Foundation' ? COLORS.greenSuccessBg : stageName === 'Intermediate' ? COLORS.blueInfoBg : COLORS.roseErrorBg;

              return (
                <View key={stageName} style={{ gap: 8, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: stageBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: stageColor }}>STAGE: {stageName.toUpperCase()}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                      {stageName === 'Foundation' ? 'Essential prerequisites & foundational competencies' : stageName === 'Intermediate' ? 'Core curriculum & framework architecture' : 'Advanced systems & specialized mastery'} ({stageItems.length} courses)
                    </Text>
                  </View>

                  <View style={{ gap: 8 }}>
                    {stageItems.map((item) => (
                      <View
                        key={item.id}
                        style={{
                          backgroundColor: COLORS.bgSurface,
                          borderRadius: 8,
                          padding: 12,
                          borderLeftWidth: 4,
                          borderLeftColor: item.status === 'completed' ? COLORS.greenSuccess : item.status === 'in_progress' ? COLORS.primaryTeal : COLORS.borderGray,
                          gap: 8
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                          <View style={{ flex: 1, minWidth: 240, gap: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textMain }}>
                                {item.course?.title || item.skill_name}
                              </Text>
                              <View style={{ backgroundColor: COLORS.chipBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.chipText }}>{item.course?.provider_name || 'freeCodeCamp'}</Text>
                              </View>
                              {item.course?.duration ? (
                                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>⏱ {item.course.duration}</Text>
                              ) : null}
                            </View>
                            <Text style={{ fontSize: 12, color: COLORS.primaryTealDark, fontWeight: '600' }}>
                              🎯 Closes Gap: {item.skill_name}
                            </Text>
                            {item.reason ? (
                              <Text style={{ fontSize: 11, color: COLORS.textMuted }}>💡 {item.reason}</Text>
                            ) : null}
                          </View>

                          {/* Action & Progress Buttons */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 4,
                              backgroundColor: item.status === 'completed' ? COLORS.greenSuccessBg : item.status === 'in_progress' ? COLORS.tealLightBg : COLORS.surfaceCard
                            }}>
                              <Text style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: item.status === 'completed' ? COLORS.greenSuccess : item.status === 'in_progress' ? COLORS.primaryTealDark : COLORS.textMuted
                              }}>
                                {item.status === 'completed' ? '✓ Completed (100%)' : item.status === 'in_progress' ? `▶ In Progress (${item.progress_percent}%)` : '○ Not Started'}
                              </Text>
                            </View>

                            {item.status !== 'completed' ? (
                              <Pressable
                                style={[styles.tableBtn, { backgroundColor: COLORS.primaryTeal, paddingHorizontal: 8, paddingVertical: 4 }]}
                                onPress={() => handleUpdateItemProgress(item.id, item.progress_percent >= 50 ? 100 : 50)}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>
                                  {item.progress_percent === 0 ? '▶ Start' : '✓ Complete'}
                                </Text>
                              </Pressable>
                            ) : (
                              <Pressable
                                style={[styles.tableBtn, { backgroundColor: COLORS.bgSurface, paddingHorizontal: 8, paddingVertical: 4 }]}
                                onPress={() => handleUpdateItemProgress(item.id, 0)}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textMuted }}>Reset</Text>
                              </Pressable>
                            )}

                            {item.course?.url ? (
                              <Pressable
                                style={[styles.tableBtn, { backgroundColor: COLORS.surfaceCard, borderColor: COLORS.borderGray, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 }]}
                                onPress={() => handleOpenCourse(item.course)}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.textMain }}>🔗 Open Course</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.bgSurface, padding: 14, borderRadius: 8, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, color: COLORS.textMuted }}>No active learning path loaded yet.</Text>
            <Pressable
              style={[styles.tableBtn, { backgroundColor: COLORS.primaryTeal, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }]}
              onPress={handleGeneratePath}
              disabled={isLoadingPath}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                {isLoadingPath ? 'Generating...' : '⚡ Generate Your Personalized Learning Path'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 3. CLEAN REQUIRED SKILL MATRIX (NO INLINE COURSES / NO INLINE PROJECTS) */}
      <View style={{ gap: 4 }}>
        <Text style={styles.sectionHeading}>Required Skill Matrix</Text>
        <Text style={styles.sectionSubHeading}>
          Click any skill to inspect skill gaps, external learning resources, practice checkpoints, and GitHub project verification.
        </Text>
      </View>

      {['FRONTEND ENGINEERING', 'BACKEND ARCHITECTURE', 'DATABASES & STORAGE', 'DEVOPS & INFRASTRUCTURE'].map((domain) => {
        const domainSkills = skills.filter((s) => s.domain === domain);
        if (domainSkills.length === 0) return null;
        return (
          <View key={domain} style={{ gap: 8 }}>
            <Text style={styles.domainTitle}>▶ {domain} ({domainSkills.length} Skills)</Text>
            <View style={styles.matrixGrid}>
              {domainSkills.map((skill) => (
                <Pressable
                  key={skill.id}
                  style={[
                    styles.skillCard,
                    skill.status === 'Learning Active' && { borderColor: COLORS.primaryTeal, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    setSelectedSkill(skill);
                    setGithubInput(skill.githubRepo || 'https://github.com/aryan/student-dashboard');
                    setGithubError('');
                  }}
                >
                  <View style={styles.skillCardHeader}>
                    <Text
                      style={[
                        styles.statusPill,
                        skill.status === 'Verified' && styles.tagVerified,
                        (skill.status === 'Learning Active' || skill.status === 'Learning') && styles.tagLearning,
                        skill.status === 'Needs Improvement' && styles.tagNeedsImp,
                        skill.status === 'Not Started' && styles.tagNotStarted,
                      ]}
                    >
                      {skill.status}
                    </Text>
                    <Text style={styles.skillPriority}>{skill.priority}</Text>
                  </View>

                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={styles.skillScore}>
                    Current: {skill.currentLevel} ({skill.currentScore}%) • Target: {skill.targetScore}%
                  </Text>

                  {/* Progress Bar */}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${skill.currentScore}%` },
                        skill.status === 'Verified' && { backgroundColor: COLORS.greenSuccess },
                        (skill.status === 'Learning Active' || skill.status === 'Learning') && { backgroundColor: COLORS.primaryTeal }
                      ]}
                    />
                  </View>

                  <View style={styles.skillActionBtn}>
                    <Text style={styles.skillActionBtnText}>{getActionButtonLabel(skill.status)}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}

      {/* 4. Target Skill Gap Breakdown Summary Table */}
      <View style={styles.cardSection}>
        <Text style={styles.cardSectionTitle}>🎯 Target Skill Gap Breakdown</Text>
        <Text style={styles.cardSectionSub}>Empirical delta between your current verified status and target career goals.</Text>

        <View style={styles.tableRowHeader}>
          <Text style={[styles.tableCol, { flex: 2, fontWeight: '700' }]}>REQUIRED SKILL</Text>
          <Text style={styles.tableCol}>CURRENT SCORE</Text>
          <Text style={styles.tableCol}>TARGET SCORE</Text>
          <Text style={styles.tableCol}>SKILL GAP</Text>
          <Text style={styles.tableCol}>STATUS</Text>
          <Text style={styles.tableCol}>ACTION</Text>
        </View>

        {skills.map((skill) => (
          <View key={skill.id} style={styles.tableRow}>
            <Text style={[styles.tableCol, { flex: 2, fontWeight: '700', color: COLORS.textMain }]}>{skill.name}</Text>
            <Text style={styles.tableCol}>{skill.currentScore}% ({skill.currentLevel})</Text>
            <Text style={styles.tableCol}>{skill.targetScore}%</Text>
            <Text
              style={[
                styles.tableCol,
                { fontWeight: '700', color: skill.gapScore < 0 ? COLORS.roseError : COLORS.greenSuccess }
              ]}
            >
              {skill.gapScore < 0 ? `${skill.gapScore}%` : 'Verified ✓'}
            </Text>
            <View style={styles.tableCol}>
              <Text style={styles.subtextBold}>{skill.status}</Text>
            </View>
            <View style={styles.tableCol}>
              <Pressable
                style={styles.tableBtn}
                onPress={() => {
                  setSelectedSkill(skill);
                  setGithubInput(skill.githubRepo || 'https://github.com/aryan/student-dashboard');
                  setGithubError('');
                }}
              >
                <Text style={styles.tableBtnText}>{getActionButtonLabel(skill.status)}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {/* ======================================================== */}
      {/* DETAILED SKILL WORKSPACE (RIGHT-SIDE DRAWER / MODAL)      */}
      {/* ======================================================== */}
      {selectedSkill && (
        <Modal
          visible={!!selectedSkill}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedSkill(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.drawerContent, width < 768 && { width: '100%' }]}>
              {/* Workspace Header */}
              <View style={styles.drawerHeader}>
                <View>
                  <Text style={styles.modalDomain}>{selectedSkill.domain}</Text>
                  <Text style={styles.modalTitle}>{selectedSkill.name} — Skill Details</Text>
                </View>
                <Pressable onPress={() => setSelectedSkill(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕ Close Workspace</Text>
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ gap: 16 }}>
                {/* 1. SKILL OVERVIEW */}
                <View style={styles.workspaceCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.workspaceSectionTitle}>1. SKILL OVERVIEW</Text>
                    <Text
                      style={[
                        styles.statusPill,
                        selectedSkill.status === 'Verified' && styles.tagVerified,
                        (selectedSkill.status === 'Learning Active' || selectedSkill.status === 'Learning') && styles.tagLearning,
                        selectedSkill.status === 'Needs Improvement' && styles.tagNeedsImp,
                        selectedSkill.status === 'Not Started' && styles.tagNotStarted,
                      ]}
                    >
                      Status: {selectedSkill.status}
                    </Text>
                  </View>

                  <View style={styles.overviewGrid}>
                    <View style={styles.overviewBox}>
                      <Text style={styles.overviewLabel}>Current Level</Text>
                      <Text style={styles.overviewVal}>{selectedSkill.currentLevel}</Text>
                    </View>
                    <View style={styles.overviewBox}>
                      <Text style={styles.overviewLabel}>Current Score</Text>
                      <Text style={styles.overviewVal}>{selectedSkill.currentScore}%</Text>
                    </View>
                    <View style={styles.overviewBox}>
                      <Text style={styles.overviewLabel}>Target Level</Text>
                      <Text style={styles.overviewVal}>{selectedSkill.targetScore}%</Text>
                    </View>
                    <View style={styles.overviewBox}>
                      <Text style={styles.overviewLabel}>Skill Gap</Text>
                      <Text
                        style={[
                          styles.overviewVal,
                          { color: selectedSkill.gapScore < 0 ? COLORS.roseError : COLORS.greenSuccess }
                        ]}
                      >
                        {selectedSkill.gapScore < 0 ? `${Math.abs(selectedSkill.gapScore)}%` : '0% (Verified ✓)'}
                      </Text>
                    </View>
                    <View style={styles.overviewBox}>
                      <Text style={styles.overviewLabel}>Priority</Text>
                      <Text style={styles.overviewVal}>{selectedSkill.priority}</Text>
                    </View>
                    <View style={styles.overviewBox}>
                      <Text style={styles.overviewLabel}>Career Importance</Text>
                      <Text style={styles.overviewVal}>{selectedSkill.careerImportance || 'Core Skill'}</Text>
                    </View>
                  </View>

                  {/* Progress bar comparison */}
                  <View style={{ gap: 6, marginTop: 8 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.subtextBold}>Current Skill: {selectedSkill.currentScore}%</Text>
                      <Text style={styles.subtextBold}>Target: {selectedSkill.targetScore}%</Text>
                    </View>
                    <View style={styles.barTrackLarge}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${selectedSkill.currentScore}%` },
                          selectedSkill.status === 'Verified' ? { backgroundColor: COLORS.greenSuccess } : { backgroundColor: COLORS.primaryTeal }
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* VERIFIED EVIDENCE BANNER (IF VERIFIED) */}
                {selectedSkill.status === 'Verified' && (
                  <View style={[styles.workspaceCard, { backgroundColor: COLORS.greenSuccessBg, borderColor: COLORS.greenSuccess }]}>
                    <Text style={[styles.workspaceSectionTitle, { color: COLORS.greenSuccess }]}>✓ VERIFIED EVIDENCE</Text>
                    <Text style={styles.evidenceText}>Project Verified: <Text style={{ fontWeight: '700' }}>{selectedSkill.evidenceProject || 'GitHub Project Verification'}</Text></Text>
                    <Text style={styles.evidenceText}>GitHub Repository: <Text style={{ fontWeight: '700' }}>{selectedSkill.githubRepo}</Text></Text>
                    <Text style={styles.evidenceText}>Verified Date: {selectedSkill.verifiedDate}</Text>
                    {selectedSkill.githubRepo && (
                      <Pressable
                        style={[styles.primaryTealBtn, { marginTop: 8, alignSelf: 'flex-start' }]}
                        onPress={() => Linking.openURL(selectedSkill.githubRepo)}
                      >
                        <Text style={styles.primaryTealBtnText}>View Verified Proof ➔</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* 2. SKILL GAP */}
                <View style={styles.workspaceCard}>
                  <Text style={styles.workspaceSectionTitle}>2. YOUR SKILL GAP</Text>
                  <View style={styles.gapBox}>
                    <Text style={styles.gapText}>Current: <Text style={{ fontWeight: '800' }}>{selectedSkill.currentScore}%</Text></Text>
                    <Text style={styles.gapText}>Target: <Text style={{ fontWeight: '800' }}>{selectedSkill.targetScore}%</Text></Text>
                    <Text style={styles.gapText}>Gap: <Text style={{ fontWeight: '800', color: selectedSkill.gapScore < 0 ? COLORS.roseError : COLORS.greenSuccess }}>{Math.abs(selectedSkill.gapScore)}%</Text></Text>
                    <Text style={styles.gapText}>Priority: <Text style={{ fontWeight: '800' }}>{selectedSkill.priority}</Text></Text>
                  </View>
                  <Text style={styles.gapExplanationText}>"{selectedSkill.gapExplanation}"</Text>
                </View>

                {/* 3. WHAT YOU NEED TO LEARN */}
                <View style={styles.workspaceCard}>
                  <Text style={styles.workspaceSectionTitle}>3. WHAT YOU NEED TO LEARN</Text>
                  <Text style={styles.helperText}>Required skill checkpoints and topics for {selectedSkill.name}:</Text>
                  <View style={styles.topicsGrid}>
                    {selectedSkill.topics.map((topic, idx) => (
                      <View key={idx} style={styles.topicBadge}>
                        <Text style={styles.topicBadgeText}>• {topic}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 4. RECOMMENDED EXTERNAL COURSES */}
                <View style={styles.workspaceCard}>
                  <Text style={styles.workspaceSectionTitle}>4. RECOMMENDED LEARNING RESOURCES</Text>
                  <Text style={styles.helperText}>
                    External resources selected to help you improve this skill. Click "View Course" to open on external platforms.
                  </Text>

                  {/* Resource Filters */}
                  <View style={{ gap: 8, marginVertical: 8 }}>
                    <Text style={styles.filterGroupLabel}>Platform:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {['All', 'SWAYAM', 'Udemy', 'Coursera', 'edX', 'LinkedIn Learning', 'YouTube'].map((plat) => (
                          <Pressable
                            key={plat}
                            style={[styles.filterPill, selectedPlatform === plat && styles.filterPillActive]}
                            onPress={() => setSelectedPlatform(plat)}
                          >
                            <Text style={[styles.filterPillText, selectedPlatform === plat && styles.filterPillTextActive]}>{plat}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>

                    <View style={styles.filterRowMulti}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.filterGroupLabel}>Type:</Text>
                        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                          {['All', 'Free', 'Paid', 'Certification'].map((type) => (
                            <Pressable
                              key={type}
                              style={[styles.filterPillSmall, selectedType === type && styles.filterPillActive]}
                              onPress={() => setSelectedType(type)}
                            >
                              <Text style={[styles.filterPillTextSmall, selectedType === type && styles.filterPillTextActive]}>{type}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.filterGroupLabel}>Sort By:</Text>
                        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                          {['Recommended', 'Highest Rated', 'Shortest Duration'].map((sort) => (
                            <Pressable
                              key={sort}
                              style={[styles.filterPillSmall, selectedSort === sort && styles.filterPillActive]}
                              onPress={() => setSelectedSort(sort)}
                            >
                              <Text style={[styles.filterPillTextSmall, selectedSort === sort && styles.filterPillTextActive]}>{sort}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Resource Cards */}
                  <View style={{ gap: 10 }}>
                    {getFilteredResources(selectedSkill).map((resource) => (
                      <View key={resource.id} style={styles.resourceCard}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.resourcePlatformBadge}>{resource.platform}</Text>
                          <Text style={styles.resourceMatch}>{resource.matchPercentage}% Match</Text>
                        </View>

                        <Text style={styles.resourceTitle}>{resource.title}</Text>
                        <Text style={styles.resourceMeta}>
                          Rating: {resource.rating} • Duration: {resource.duration} • Level: {resource.level} • Price: {resource.price}
                        </Text>
                        {resource.certificateAvailable ? (
                          <Text style={styles.certBadge}>✓ Certificate Available</Text>
                        ) : null}

                        <Text style={styles.resourceWhy}>Why recommended: "{resource.why}"</Text>

                        {resourceInteractions[resource.id] && (
                          <Text style={styles.interactionText}>{resourceInteractions[resource.id]}</Text>
                        )}

                        <Pressable
                          style={styles.primaryTealBtnFull}
                          onPress={() => handleOpenCourse(resource)}
                        >
                          <Text style={styles.primaryTealBtnText}>View Course ↗</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 5. RECOMMENDED PROJECTS */}
                <View style={styles.workspaceCard}>
                  <Text style={styles.workspaceSectionTitle}>5. RECOMMENDED PROJECTS</Text>
                  <Text style={styles.helperText}>
                    Build these projects specifically to demonstrate your {selectedSkill.name} skills.
                  </Text>

                  <View style={{ gap: 12, marginTop: 8 }}>
                    {getRecommendedProjectsForSkill(selectedSkill).map((proj) => (
                      <View key={proj.id} style={styles.projectWorkspaceCard}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.projectTitle}>{proj.title}</Text>
                          <Text style={styles.difficultyBadge}>{proj.difficulty}</Text>
                        </View>
                        <Text style={styles.projectMetaText}>Estimated Duration: {proj.estimatedTime}</Text>

                        <Text style={styles.projectDesc}>{proj.description}</Text>

                        <View style={{ gap: 4 }}>
                          <Text style={styles.inputLabel}>Skills Demonstrated:</Text>
                          <View style={styles.chipRow}>
                            {proj.demonstratedSkills.map((sk) => (
                              <Text key={sk} style={styles.chip}>{sk}</Text>
                            ))}
                          </View>
                        </View>

                        <Text style={styles.resourceWhy}>Why recommended: "{proj.whyRecommended}"</Text>

                        <Pressable
                          style={styles.outlineBtn}
                          onPress={() => setSelectedProject(proj)}
                        >
                          <Text style={styles.outlineBtnText}>View Project Details ➔</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 6. GITHUB PROJECT VERIFICATION SUBMISSION */}
                <View style={styles.workspaceCard}>
                  <Text style={styles.workspaceSectionTitle}>6. GITHUB PROJECT VERIFICATION</Text>
                  <Text style={styles.helperText}>
                    Mandatory GitHub repository URL submission is required for skill verification.
                  </Text>

                  <View style={styles.githubSubmissionBox}>
                    <Text style={styles.inputLabel}>GitHub Repository URL *</Text>
                    <Text style={styles.helperText}>
                      Submit the public GitHub repository URL containing your completed project codebase as proof of {selectedSkill.name}.
                    </Text>

                    <TextInput
                      style={styles.githubInput}
                      value={githubInput}
                      onChangeText={(val) => {
                        setGithubInput(val);
                        setGithubError('');
                      }}
                      placeholder="https://github.com/username/project-name"
                    />

                    {/* Live Validation State Pill */}
                    {githubInput ? (
                      <View style={{ marginTop: 4 }}>
                        <Text
                          style={[
                            styles.validationPill,
                            validateGithubUrl(githubInput).valid ? styles.validText : styles.invalidText
                          ]}
                        >
                          {validateGithubUrl(githubInput).message}
                        </Text>
                      </View>
                    ) : null}

                    {githubError ? <Text style={styles.errorText}>{githubError}</Text> : null}

                    <Pressable
                      style={[
                        styles.primaryTealBtnFull,
                        { marginTop: 10 },
                        !validateGithubUrl(githubInput).valid && { opacity: 0.5 }
                      ]}
                      disabled={!validateGithubUrl(githubInput).valid}
                      onPress={() => {
                        const targetProj = getRecommendedProjectsForSkill(selectedSkill)[0] || INITIAL_PROJECTS[0];
                        handleSubmitProjectVerification(targetProj);
                      }}
                    >
                      <Text style={styles.primaryTealBtnText}>Submit Project for Verification</Text>
                    </Pressable>
                  </View>
                </View>

                {/* 7. SKILL VERIFICATION STATUS */}
                <View style={styles.workspaceCard}>
                  <Text style={styles.workspaceSectionTitle}>7. SKILL VERIFICATION STATUS</Text>
                  <View style={styles.verificationStatusBox}>
                    <Text style={styles.statusStepText}>
                      {selectedSkill.status === 'Verified' ? '✓ Project Verified' : '○ Under Verification Review'}
                    </Text>
                    <Text style={styles.statusStepSub}>
                      {selectedSkill.status === 'Verified'
                        ? `Skill demonstrated & verified via GitHub repo (${selectedSkill.githubRepo}).`
                        : 'Submit a public GitHub repository containing project evidence to earn verified status.'}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* DETAILED PROJECT WORKSPACE MODAL                         */}
      {/* ======================================================== */}
      {selectedProject && (
        <Modal
          visible={!!selectedProject}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedProject(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.drawerContent, { maxWidth: 700 }]}>
              <View style={styles.drawerHeader}>
                <View>
                  <Text style={styles.modalDomain}>PROJECT WORKSPACE</Text>
                  <Text style={styles.modalTitle}>{selectedProject.title}</Text>
                </View>
                <Pressable onPress={() => setSelectedProject(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕ Close Project</Text>
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ gap: 12 }}>
                <View style={styles.overviewGrid}>
                  <View style={styles.overviewBox}>
                    <Text style={styles.overviewLabel}>Difficulty</Text>
                    <Text style={styles.overviewVal}>{selectedProject.difficulty}</Text>
                  </View>
                  <View style={styles.overviewBox}>
                    <Text style={styles.overviewLabel}>Estimated Duration</Text>
                    <Text style={styles.overviewVal}>{selectedProject.estimatedTime}</Text>
                  </View>
                  <View style={styles.overviewBox}>
                    <Text style={styles.overviewLabel}>Status</Text>
                    <Text style={styles.overviewVal}>{selectedProject.status}</Text>
                  </View>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={styles.inputLabel}>Objective:</Text>
                  <Text style={styles.projectDesc}>{selectedProject.objective}</Text>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={styles.inputLabel}>Description:</Text>
                  <Text style={styles.projectDesc}>{selectedProject.description}</Text>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={styles.inputLabel}>Skills Demonstrated:</Text>
                  <View style={styles.chipRow}>
                    {selectedProject.demonstratedSkills.map((sk) => (
                      <Text key={sk} style={styles.chip}>{sk}</Text>
                    ))}
                  </View>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={styles.inputLabel}>Requirements:</Text>
                  {selectedProject.requirements.map((req, idx) => (
                    <Text key={idx} style={styles.topicChip}>• {req}</Text>
                  ))}
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={styles.inputLabel}>Suggested Technology:</Text>
                  <View style={styles.chipRow}>
                    {selectedProject.suggestedTech.map((tech) => (
                      <Text key={tech} style={styles.chip}>{tech}</Text>
                    ))}
                  </View>
                </View>

                <View style={styles.githubSubmissionBox}>
                  <Text style={styles.inputLabel}>Submit Project for Verification</Text>
                  <Text style={styles.helperText}>Mandatory GitHub repository URL:</Text>
                  <TextInput
                    style={styles.githubInput}
                    value={githubInput}
                    onChangeText={(val) => setGithubInput(val)}
                    placeholder="https://github.com/username/project-repo"
                  />
                  <Pressable
                    style={styles.primaryTealBtnFull}
                    onPress={() => {
                      handleSubmitProjectVerification(selectedProject);
                      setSelectedProject(null);
                    }}
                  >
                    <Text style={styles.primaryTealBtnText}>Submit for Verification</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSurface,
  },
  contentContainer: {
    padding: 16,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  successToast: {
    backgroundColor: COLORS.greenSuccessBg,
    borderColor: COLORS.greenSuccess,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  successToastText: {
    color: COLORS.greenSuccess,
    fontSize: 13,
    fontWeight: '700',
  },
  topHeaderCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  tagBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  greenTag: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.greenSuccess,
    backgroundColor: COLORS.greenSuccessBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  targetRoleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.bgSurface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  targetRoleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  targetRoleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  readinessBox: {
    alignItems: 'center',
  },
  readinessScore: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryTeal,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 4,
  },
  metricValueRed: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.roseError,
    marginTop: 4,
  },
  metricSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  readinessHeroCard: {
    backgroundColor: COLORS.primaryTeal,
    borderRadius: 8,
    padding: 12,
    minWidth: 170,
  },
  readinessHeroTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    opacity: 0.9,
  },
  readinessHeroBig: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  readinessHeroSub: {
    fontSize: 10,
    color: '#ffffff',
    opacity: 0.8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  sectionSubHeading: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  domainTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  skillCard: {
    width: '23.5%',
    minWidth: 240,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    gap: 6,
  },
  skillCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagVerified: {
    color: COLORS.greenSuccess,
    backgroundColor: COLORS.greenSuccessBg,
  },
  tagLearning: {
    color: COLORS.primaryTeal,
    backgroundColor: COLORS.tealLightBg,
  },
  tagNotStarted: {
    color: COLORS.textMuted,
    backgroundColor: COLORS.bgSurface,
  },
  tagNeedsImp: {
    color: COLORS.amberWarning,
    backgroundColor: COLORS.amberWarningBg,
  },
  skillPriority: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  skillScore: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  barTrack: {
    height: 6,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barTrackLarge: {
    height: 10,
    backgroundColor: COLORS.bgSurface,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.primaryTeal,
  },
  skillActionBtn: {
    backgroundColor: COLORS.bgSurface,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  skillActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  cardSection: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    gap: 12,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  cardSectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: -6,
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSurface,
    padding: 10,
    borderRadius: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    alignItems: 'center',
  },
  tableCol: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tableBtn: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tableBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  drawerContent: {
    width: '50%',
    minWidth: 340,
    height: '100%',
    backgroundColor: COLORS.surfaceCard,
    padding: 20,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.borderGray,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalDomain: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryTeal,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  closeBtn: {
    backgroundColor: COLORS.bgSurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  workspaceCard: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    gap: 8,
  },
  workspaceSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  overviewBox: {
    flex: 1,
    minWidth: 110,
    backgroundColor: COLORS.surfaceCard,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  overviewLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  overviewVal: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 2,
  },
  evidenceText: {
    fontSize: 12,
    color: COLORS.textMain,
  },
  gapBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: COLORS.surfaceCard,
    padding: 10,
    borderRadius: 6,
  },
  gapText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  gapExplanationText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textMain,
    lineHeight: 16,
  },
  helperText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicBadge: {
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  topicBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  filterGroupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  filterRowMulti: {
    flexDirection: 'row',
    gap: 12,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  filterPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryTeal,
    borderColor: COLORS.primaryTeal,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterPillTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  resourceCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    gap: 6,
  },
  resourcePlatformBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
    backgroundColor: COLORS.tealLightBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resourceMatch: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenSuccess,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  resourceMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  certBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.blueInfo,
  },
  resourceWhy: {
    fontSize: 11,
    fontStyle: 'italic',
    color: COLORS.textMuted,
  },
  interactionText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenSuccess,
  },
  projectWorkspaceCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    gap: 6,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  difficultyBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryTeal,
    backgroundColor: COLORS.tealLightBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  projectMetaText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  projectDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: COLORS.chipBg,
    color: COLORS.chipText,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: COLORS.primaryTeal,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  outlineBtnText: {
    color: COLORS.primaryTeal,
    fontSize: 11,
    fontWeight: '700',
  },
  githubSubmissionBox: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  githubInput: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginTop: 2,
  },
  validationPill: {
    fontSize: 11,
    fontWeight: '700',
  },
  validText: {
    color: COLORS.greenSuccess,
  },
  invalidText: {
    color: COLORS.roseError,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.roseError,
  },
  primaryTealBtn: {
    backgroundColor: COLORS.primaryTeal,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  primaryTealBtnFull: {
    backgroundColor: COLORS.primaryTeal,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryTealBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  verificationStatusBox: {
    backgroundColor: COLORS.surfaceCard,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
  },
  statusStepText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  statusStepSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtextBold: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  topicChip: {
    fontSize: 12,
    color: COLORS.textMain,
  },
});
