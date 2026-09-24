import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Dashboard from '../Dashboard/Dashboard';
import Profile, { DEFAULT_MOCK_PROFILE } from '../Profile/Profile';
import { createInitialProfile, fetchCompleteStudentProfile } from '../services/profileService';
import Resume from '../Resume/Resume';
import Skill from '../Skill/Skill';
import Internship from '../Internship/Internship';
import Application from '../Application/Application';
import Scolarship from '../Scolarships/Scolarship';
import Learning from '../Learning/Learning';
import Interview from '../Interview/Interview';

const COLORS = {
  canvas: '#103422',      // Forest Green
  panel: '#efefe6',       // Light Warm Beige
  paper: '#fffdf5',       // Warm White Paper
  ink: '#111318',         // Dark Ink Black
  navy: '#171d35',        // Navy Blue
  muted: '#74766f',       // Muted Gray
  subtle: '#dedfd3',      // Light Border Gray
  green: '#1e7654',       // Primary Green
  greenDark: '#145238',   // Dark Green
  teal: '#2c6370',        // Teal Accent
  mint: '#dff2e8',        // Light Mint
  amber: '#f59e0b',       // Amber Node
  rose: '#ffe3dc',        // Light Rose
  error: '#c2413b',       // Error Red
  success: '#1c7c55',     // Success Green
};

export default function StudentHeader({ user, onLogout, onUpdateUser }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const isDesktop = width >= 1024;
  const [profileData, setProfileData] = useState(() => createInitialProfile(user));

  // Auto-fetch complete student profile (career goals, github connection, resume parsed data) on user session start
  useEffect(() => {
    if (user && user.email) {
      setProfileData(prev => createInitialProfile(user, prev));
      fetchCompleteStudentProfile(user, setProfileData);
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showDropdown, setShowDropdown] = useState(false);

  // AI Mentor states
  const [showMentor, setShowMentor] = useState(false);
  const [mentorInput, setMentorInput] = useState('');
  const [mentorMessages, setMentorMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hi! I'm your SkillSetu AI Mentor 👋\n\nI can help you understand your skills, improve your profile, find internships, optimize your resume, and prepare for interviews.",
      timestamp: 'Now',
    }
  ]);
  const mentorScrollRef = useRef(null);

  // Animation for side mentor drawer sliding in
  const mentorSlideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    if (showMentor) {
      Animated.timing(mentorSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(mentorSlideAnim, {
        toValue: width,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [showMentor, width]);

  const calculateProfileCompletion = () => {
    let score = 0;
    const totalSteps = 5;
    if (profileData.personalInfo && profileData.personalInfo.fullName && profileData.personalInfo.email) score += 1;
    if (profileData.education && profileData.education.list && profileData.education.list.length > 0) score += 1;
    if (profileData.careerGoals && (profileData.careerGoals.targetCareer || (profileData.careerGoals.targetCareerIds && profileData.careerGoals.targetCareerIds.length > 0))) score += 1;
    if (profileData.resumeAnalysis && profileData.resumeAnalysis.resumeFile) score += 1;
    if (profileData.githubLinks && (profileData.githubLinks.githubUsername || profileData.githubLinks.linkedinUrl)) score += 1;

    let percent = Math.round((score / totalSteps) * 80);
    if (profileData.verified) {
      percent = 100;
    } else {
      if (score === 5) percent = 80;
    }
    return percent;
  };

  const [hoveredTabId, setHoveredTabId] = useState(null);

  const tabs = [
    { id: 'Dashboard', label: 'Dashboard' },
    { id: 'Profile', label: 'My Profile' },
    { id: 'Resume', label: 'Resume' },
    { id: 'Skills', label: 'Skills' },
    { id: 'Learning', label: 'Learning' },
    { id: 'Opportunities', label: 'Opportunities' },
    { id: 'Applications', label: 'Applications' },
    { id: 'Scholarships', label: 'Scholarships' },
    { id: 'InterviewPrep', label: 'Interview' },
  ];

  // Initialize scale animations for each tab
  const scaleAnims = useRef({}).current;
  tabs.forEach((tab) => {
    if (!scaleAnims[tab.id]) {
      scaleAnims[tab.id] = new Animated.Value(1);
    }
  });

  // Animate tab scales on hoveredTabId changes
  useEffect(() => {
    tabs.forEach((tab) => {
      let targetScale = 1.0;
      if (hoveredTabId !== null) {
        if (hoveredTabId === tab.id) {
          targetScale = 1.08;
        } else {
          // Check index distance to determine neighbor reaction
          const hoveredIndex = tabs.findIndex((t) => t.id === hoveredTabId);
          const currentIndex = tabs.findIndex((t) => t.id === tab.id);
          const dist = Math.abs(hoveredIndex - currentIndex);
          if (dist === 1) {
            targetScale = 0.98; // Neighbor shrinks very subtly
          } else {
            targetScale = 0.96; // Other tabs shrink slightly more to create focus contrast
          }
        }
      }

      if (scaleAnims[tab.id]) {
        Animated.spring(scaleAnims[tab.id], {
          toValue: targetScale,
          friction: 8,
          tension: 80,
          useNativeDriver: Platform.OS !== 'web', // Safe on web React Native
        }).start();
      }
    });
  }, [hoveredTabId]);

  // Derive display name/avatar info
  const displayName = user?.name || 'Student';
  const displayEmail = user?.email || 'student@skillsetu.com';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    setShowDropdown(false);
    if (onLogout) onLogout();
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <Dashboard
            user={user}
            profileCompletion={calculateProfileCompletion()}
            onNavigateToProfile={() => setActiveTab('Profile')}
            profileData={profileData}
            setProfileData={setProfileData}
          />
        );
      case 'Profile':
        return (
          <Profile
            user={user}
            updateUser={onUpdateUser}
            profileData={profileData}
            setProfileData={setProfileData}
            onFinish={() => setActiveTab('Dashboard')}
          />
        );
      case 'Resume':
        return (
          <Resume
            user={user}
            profileData={profileData}
          />
        );
      case 'Skills':
        return (
          <Skill
            user={user}
            profileData={profileData}
            setProfileData={setProfileData}
          />
        );
      case 'Learning':
        return <Learning user={user} profileData={profileData} />;
      case 'Opportunities':
        return (
          <Internship
            user={user}
          />
        );
      case 'Applications':
        return (
          <Application
            user={user}
          />
        );
      case 'Scholarships':
        return (
          <Scolarship
            user={user}
          />
        );
      case 'InterviewPrep':
        return <Interview user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  // Auto scroll chat to bottom when messages change
  useEffect(() => {
    if (mentorScrollRef.current) {
      setTimeout(() => {
        mentorScrollRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [mentorMessages]);

  const handleSendMessage = () => {
    if (!mentorInput.trim()) return;

    const userMsgText = mentorInput;
    setMentorInput('');

    const userMsgId = Date.now();
    const newMessages = [
      ...mentorMessages,
      { id: userMsgId, sender: 'user', text: userMsgText, timestamp: 'Now' }
    ];
    setMentorMessages(newMessages);

    setTimeout(() => {
      const aiResponse = generateAIResponse(userMsgText.toLowerCase());
      setMentorMessages(prev => [...prev, aiResponse]);
    }, 600);
  };

  const handleQuickAction = (actionKey, label) => {
    const userMsgId = Date.now();
    setMentorMessages(prev => [
      ...prev,
      { id: userMsgId, sender: 'user', text: label, timestamp: 'Now' }
    ]);

    setTimeout(() => {
      let aiResponse;
      switch (actionKey) {
        case 'next_action':
        case 'context_applications':
          aiResponse = {
            id: Date.now(),
            sender: 'ai',
            text: "Your high-priority next actions:\n\n1. Complete **FinFlow Technical Assessment** (Data Analyst Intern) before the Sep 5 deadline.\n2. Review matching backend opportunities: 8 'Almost Eligible' roles can be unlocked if you verify Docker basics.\n3. Check feedback on your InnovateLabs application.",
            richContent: {
              type: 'text_link',
              label: 'Go to Applications',
              actionTab: 'Applications'
            }
          };
          break;
        case 'what_to_learn':
        case 'context_learning':
          aiResponse = {
            id: Date.now(),
            sender: 'ai',
            text: "You have outstanding foundational Python and database knowledge. However, backend and DevOps roles require containerization.\n\nLearning **Docker** is your next best step to increase your Career Match Rate from 76% to 94%.",
            richContent: {
              type: 'skill_card',
              title: 'Docker (Containerization Basics)',
              percentage: 52,
              current: 42,
              target: 80,
              buttonLabel: 'Start Docker Course',
              actionTab: 'Learning'
            }
          };
          break;
        case 'find_internships':
        case 'context_opportunities':
          aiResponse = {
            id: Date.now(),
            sender: 'ai',
            text: "Here are the top personalized matches matching your profile right now:",
            richContent: {
              type: 'internships_list',
              jobs: [
                { title: 'Backend Developer Intern', company: 'TechNova Solutions', match: 92 },
                { title: 'Frontend Intern', company: 'Nexus E-commerce', match: 88 },
                { title: 'Data Analyst Intern', company: 'FinFlow Analytics', match: 81 }
              ]
            }
          };
          break;
        case 'improve_resume':
        case 'context_resume':
          aiResponse = {
            id: Date.now(),
            sender: 'ai',
            text: "Your current resume has a general match score of 76%.\n\nTo hit a **91% ATS match** for TechNova and other backend roles, make these quick optimizations:",
            richContent: {
              type: 'resume_insights',
              score: 76,
              points: [
                "Include 'RESTful APIs' and 'FastAPI' keywords in your project summary.",
                "Detail your 'E-commerce API' database architecture using Postgres/SQL.",
                "Highlight basic command-line tool usage."
              ]
            }
          };
          break;
        case 'analyze_skills':
        case 'context_skills':
          aiResponse = {
            id: Date.now(),
            sender: 'ai',
            text: "Here is your skill gap breakdown:\n\n• **Docker**: Missing required core competency (42/80). High impact.\n• **AWS**: Missing basic cloud deployment knowledge (0/50). Medium impact.\n• **Tableau**: Required for Data Analyst roles.\n\nI recommend starting with Docker to make yourself eligible for 8 new roles.",
            richContent: {
              type: 'text_link',
              label: 'View Skill Intelligence',
              actionTab: 'Skills'
            }
          };
          break;
        case 'prepare_interview':
          aiResponse = {
            id: Date.now(),
            sender: 'ai',
            text: "You have 1 active interview prep workspace available for **WebSolutions Inc. (Frontend Developer)**.\n\nOur AI mock interview simulator is ready to test you on React state hooks and flexbox layout designs.",
            richContent: {
              type: 'text_link',
              label: 'Go to Interview Prep',
              actionTab: 'InterviewPrep'
            }
          };
          break;
        case 'improve_career_match':
          aiResponse = {
            id: Date.now(),
            sender: 'ai',
            text: "To improve your overall Career Match Score (76%):\n\n1. Verify your pending SQL skill in Skill Intelligence.\n2. Complete the Resume Optimization worksheet to tailored 91% ATS score.\n3. Add your GitHub link to analyze your e-commerce repository.",
            richContent: {
              type: 'text_link',
              label: 'Go to Skill Profile',
              actionTab: 'Skills'
            }
          };
          break;
        default:
          aiResponse = {
            id: Date.now(),
            sender: 'ai',
            text: "I'm analyzing your profile context. How else can I assist you with your career goals?"
          };
      }
      setMentorMessages(prev => [...prev, aiResponse]);
    }, 600);
  };

  const generateAIResponse = (inputLower) => {
    if (inputLower.includes('docker') || inputLower.includes('learn') || inputLower.includes('gap')) {
      return {
        id: Date.now(),
        sender: 'ai',
        text: "Docker is currently your biggest skill gap. Improving this skill unlocks 8 backend developer roles.",
        richContent: {
          type: 'skill_card',
          title: 'Docker',
          percentage: 52,
          current: 42,
          target: 80,
          buttonLabel: 'Learn Docker',
          actionTab: 'Learning'
        }
      };
    }
    if (inputLower.includes('resume') || inputLower.includes('ats')) {
      return {
        id: Date.now(),
        sender: 'ai',
        text: "You can optimize your resume ATS score from 76% to 91% by matching key technical competencies.",
        richContent: {
          type: 'resume_insights',
          score: 76,
          points: [
            "Tailor summaries with Docker/AWS details.",
            "Detail Postgres design patterns."
          ]
        }
      };
    }
    if (inputLower.includes('internship') || inputLower.includes('job') || inputLower.includes('match')) {
      return {
        id: Date.now(),
        sender: 'ai',
        text: "You are currently eligible for 12 roles. Here are your top matches:",
        richContent: {
          type: 'internships_list',
          jobs: [
            { title: 'Backend Developer Intern', company: 'TechNova Solutions', match: 92 },
            { title: 'Frontend Intern', company: 'Nexus E-commerce', match: 88 }
          ]
        }
      };
    }

    return {
      id: Date.now(),
      sender: 'ai',
      text: `Got your question! Based on your active screen (${activeTab}) and profile, you can check your skill recommendations or resume tailoring to maximize your success. Let me know if you'd like to analyze skills or inspect matches.`
    };
  };

  const getContextualActionButton = () => {
    switch (activeTab) {
      case 'Skills':
        return { label: 'Explain My Skill Gap', action: 'context_skills' };
      case 'Opportunities':
        return { label: 'Why Do I Match This?', action: 'context_opportunities' };
      case 'Resume':
        return { label: 'Improve My Resume', action: 'context_resume' };
      case 'Applications':
        return { label: 'What Should I Do Next?', action: 'context_applications' };
      case 'Learning':
        return { label: 'Create My Learning Plan', action: 'context_learning' };
      default:
        return null;
    }
  };

  const renderRichContent = (rich) => {
    switch (rich.type) {
      case 'skill_card':
        return (
          <View style={styles.richSkillCard}>
            <Text style={styles.richSkillTitle}>{rich.title}</Text>
            <View style={styles.richProgressTrack}>
              <View style={[styles.richProgressBar, { width: `${rich.percentage}%` }]} />
            </View>
            <View style={styles.richMetaRow}>
              <Text style={styles.richMetaLabel}>Current: {rich.current}%</Text>
              <Text style={styles.richMetaLabel}>➔ Target: {rich.target}%</Text>
            </View>
            {rich.buttonLabel && (
              <Pressable
                style={styles.richActionBtn}
                onPress={() => {
                  setShowMentor(false);
                  setActiveTab(rich.actionTab);
                }}
              >
                <Text style={styles.richActionBtnText}>{rich.buttonLabel}</Text>
              </Pressable>
            )}
          </View>
        );
      case 'resume_insights':
        return (
          <View style={styles.richResumeBox}>
            <Text style={styles.richResumeScoreTitle}>Resume ATS Score: {rich.score}%</Text>
            <View style={styles.richChecklist}>
              {rich.points.map((pt, idx) => (
                <Text key={idx} style={styles.richChecklistItem}>• {pt}</Text>
              ))}
            </View>
            <Pressable
              style={styles.richActionBtn}
              onPress={() => {
                setShowMentor(false);
                setActiveTab('Resume');
              }}
            >
              <Text style={styles.richActionBtnText}>Tailor Resume Now</Text>
            </Pressable>
          </View>
        );
      case 'internships_list':
        return (
          <View style={styles.richInternshipsBox}>
            {rich.jobs.map((job, idx) => (
              <View key={idx} style={styles.richJobRow}>
                <View style={styles.richJobHeader}>
                  <Text style={styles.richJobTitle}>{job.title}</Text>
                  <Text style={styles.richJobMatch}>{job.match}% Match</Text>
                </View>
                <Text style={styles.richJobCompany}>{job.company}</Text>
              </View>
            ))}
            <Pressable
              style={styles.richActionBtn}
              onPress={() => {
                setShowMentor(false);
                setActiveTab('Opportunities');
              }}
            >
              <Text style={styles.richActionBtnText}>Go to Opportunities</Text>
            </Pressable>
          </View>
        );
      case 'text_link':
        return (
          <Pressable
            style={styles.richLinkBtn}
            onPress={() => {
              setShowMentor(false);
              setActiveTab(rich.actionTab);
            }}
          >
            <Text style={styles.richLinkBtnText}>{rich.label} ➔</Text>
          </Pressable>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={[styles.headerContainer, isCompact && styles.headerCompact]}>
        <View style={styles.headerContent}>
          {/* Logo & Brand */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoMark}>
              <View style={styles.bridgeDeck} />
              <View style={styles.bridgePillarLeft} />
              <View style={styles.bridgePillarRight} />
              <View style={styles.logoNodeTop} />
              <View style={styles.logoNodeLeft} />
              <View style={styles.logoNodeRight} />
            </View>
            {!isCompact && <Text style={styles.brandText}>SkillSetu</Text>}
          </View>

          {/* Navigation Tabs */}
          <View style={[styles.tabsOuterWrapper, isCompact && styles.tabsOuterWrapperCompact]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const scale = scaleAnims[tab.id];
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    onHoverIn={() => {
                      if (Platform.OS === 'web') {
                        setHoveredTabId(tab.id);
                      }
                    }}
                    onHoverOut={() => {
                      if (Platform.OS === 'web') {
                        setHoveredTabId(null);
                      }
                    }}
                    style={[
                      styles.tabButton,
                      isActive && styles.tabButtonActive,
                      isCompact && styles.tabButtonCompact,
                    ]}
                  >
                    <Animated.View style={{ transform: [{ scale }] }}>
                      <Text
                        style={[
                          styles.tabText,
                          isActive && styles.tabTextActive,
                          isCompact && styles.tabTextCompact,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Animated.View>
                    {isActive && <View style={styles.activeIndicator} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Profile & Dropdown Controls */}
          <View style={styles.profileWrapper}>
            <Pressable
              onPress={() => setShowDropdown(!showDropdown)}
              style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
            >
              {(profileData?.personalInfo?.profileImage || user?.profile_image) ? (
                <Image
                  source={{ uri: profileData?.personalInfo?.profileImage || user?.profile_image }}
                  style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#0D9488' }}
                />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{avatarLetter}</Text>
                </View>
              )}
              {!isCompact && (
                <View style={styles.profileNameWrap}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.profileRole} numberOfLines={1}>
                    Student
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Simple Dropdown Menu */}
            {showDropdown && (
              <View style={[styles.dropdownMenu, isCompact && styles.dropdownMenuCompact]}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownName}>{displayName}</Text>
                  <Text style={styles.dropdownEmail}>{displayEmail}</Text>
                </View>
                <View style={styles.dropdownDivider} />
                <Pressable
                  onPress={() => {
                    setShowDropdown(false);
                    setActiveTab('Profile');
                  }}
                  style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                >
                  <Text style={styles.dropdownItemText}>My Profile</Text>
                </Pressable>
                <Pressable
                  onPress={handleLogout}
                  style={({ pressed }) => [
                    styles.dropdownItem,
                    styles.dropdownItemDanger,
                    pressed && styles.dropdownItemPressed,
                  ]}
                >
                  <Text style={[styles.dropdownItemText, styles.dropdownItemTextDanger]}>
                    Logout
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Screen Content Wrapper */}
      <View style={styles.contentArea}>
        {renderActiveScreen()}
      </View>

      {/* Global Floating AI Mentor Button */}
      <Pressable
        style={({ pressed }) => [styles.floatingMentorBtn, pressed && styles.pressed]}
        onPress={() => setShowMentor(!showMentor)}
      >
        <Text style={styles.floatingMentorBtnText}>
          ✨ {width >= 768 ? 'Ask AI Mentor' : width >= 480 ? 'AI Mentor' : 'Ask AI'}
        </Text>
      </Pressable>

      {/* Backdrop overlay */}
      {showMentor && (
        <Pressable style={styles.mentorBackdrop} onPress={() => setShowMentor(false)} />
      )}

      {/* AI Mentor Drawer container */}
      <Animated.View
        pointerEvents={showMentor ? 'auto' : 'none'}
        style={[
          styles.mentorDrawer,
          !isDesktop && styles.mentorDrawerMobile,
          { transform: [{ translateX: mentorSlideAnim }] }
        ]}
      >
        {/* Header */}
        <View style={styles.mentorHeader}>
          <View style={styles.mentorHeaderInfo}>
            <Text style={styles.mentorTitle}>AI Mentor</Text>
            <Text style={styles.mentorSubtitle}>Your personal SkillSetu career assistant</Text>
            <View style={styles.mentorStatusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.mentorStatusText}>Ready</Text>
            </View>
          </View>
          <Pressable style={styles.closeMentorBtn} onPress={() => setShowMentor(false)}>
            <Text style={styles.closeMentorBtnText}>×</Text>
          </Pressable>
        </View>

        {/* Messages list */}
        <ScrollView
          ref={mentorScrollRef}
          contentContainerStyle={styles.mentorMessagesScroll}
          style={{ flex: 1 }}
        >
          {mentorMessages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                msg.sender === 'user' ? styles.messageRowUser : styles.messageRowAI
              ]}
            >
              <View style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.messageBubbleUser : styles.messageBubbleAI
              ]}>
                <Text style={[
                  styles.messageText,
                  msg.sender === 'user' ? styles.messageTextUser : styles.messageTextAI
                ]}>
                  {msg.text}
                </Text>

                {/* Render Rich component if exists */}
                {msg.richContent && renderRichContent(msg.richContent)}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
            {/* Contextual Action Button */}
            {getContextualActionButton() && (
              <Pressable
                style={[styles.quickActionBtn, styles.quickActionBtnContextual]}
                onPress={() => handleQuickAction(getContextualActionButton().action, getContextualActionButton().label)}
              >
                <Text style={[styles.quickActionText, styles.quickActionTextContextual]}>
                  ✨ {getContextualActionButton().label}
                </Text>
              </Pressable>
            )}

            {[
              { label: '🎯 Next Best Action', action: 'next_action' },
              { label: '📚 What Should I Learn?', action: 'what_to_learn' },
              { label: '💼 Find Internships', action: 'find_internships' },
              { label: '📄 Improve Resume', action: 'improve_resume' },
              { label: '🧠 Analyze My Skills', action: 'analyze_skills' },
              { label: '🎤 Prepare Interview', action: 'prepare_interview' },
              { label: '🚀 Improve Career Match', action: 'improve_career_match' },
            ].map((qa, index) => (
              <Pressable
                key={index}
                style={styles.quickActionBtn}
                onPress={() => handleQuickAction(qa.action, qa.label)}
              >
                <Text style={styles.quickActionText}>{qa.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Chat input box */}
        <View style={styles.mentorInputRow}>
          <TextInput
            style={styles.mentorTextInput}
            placeholder="Ask AI Mentor anything..."
            placeholderTextColor="#74766f"
            value={mentorInput}
            onChangeText={setMentorInput}
            onSubmitEditing={handleSendMessage}
          />
          <Pressable style={styles.mentorSendBtn} onPress={handleSendMessage}>
            <Text style={styles.mentorSendBtnText}>Send</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// Simple Placeholder Screen for non-dashboard tabs
function PlaceholderScreen({ title, subtitle, icon }) {
  return (
    <View style={styles.placeholderContainer}>
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderIcon}>{icon}</Text>
        <Text style={styles.placeholderTitle}>{title}</Text>
        <Text style={styles.placeholderSubtitle}>{subtitle}</Text>
        <View style={styles.placeholderBadge}>
          <Text style={styles.placeholderBadgeText}>Coming Soon</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  headerContainer: {
    height: 74,
    backgroundColor: COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.subtle,
    zIndex: 100,
    shadowColor: '#071f14',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerCompact: {
    height: 64,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 28,
    height: 28,
    marginRight: 8,
    position: 'relative',
  },
  bridgeDeck: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 12,
    height: 4,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    transform: [{ rotate: '-7deg' }],
  },
  bridgePillarLeft: {
    position: 'absolute',
    left: 6,
    top: 15,
    width: 4,
    height: 10,
    borderRadius: 3,
    backgroundColor: COLORS.navy,
  },
  bridgePillarRight: {
    position: 'absolute',
    right: 6,
    top: 15,
    width: 4,
    height: 10,
    borderRadius: 3,
    backgroundColor: COLORS.navy,
  },
  logoNodeTop: {
    position: 'absolute',
    top: 2,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.amber,
  },
  logoNodeLeft: {
    position: 'absolute',
    bottom: 0,
    left: 1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.teal,
  },
  logoNodeRight: {
    position: 'absolute',
    right: 1,
    bottom: 0,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  brandText: {
    color: COLORS.navy,
    fontSize: 20,
    fontWeight: '900',
  },
  tabsOuterWrapper: {
    flex: 1,
    height: '100%',
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  tabsOuterWrapperCompact: {
    marginHorizontal: 8,
  },
  tabsScrollContent: {
    alignItems: 'center',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    flexGrow: 1,
  },
  tabButton: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    // Styling for active tab on mobile
  },
  tabButtonCompact: {
    paddingHorizontal: 10,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabTextActive: {
    color: COLORS.green,
    fontWeight: '850',
  },
  tabTextCompact: {
    fontSize: 13.5,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: COLORS.green,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  profileWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 20,
  },
  pressed: {
    opacity: 0.8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.mint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.green,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.greenDark,
  },
  profileNameWrap: {
    marginLeft: 8,
    width: 90,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
  },
  profileRole: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 220,
    backgroundColor: COLORS.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.subtle,
    shadowColor: COLORS.navy,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    paddingVertical: 8,
  },
  dropdownMenuCompact: {
    top: 46,
  },
  dropdownHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ink,
  },
  dropdownEmail: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: COLORS.subtle,
    marginVertical: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemPressed: {
    backgroundColor: COLORS.panel,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  dropdownItemDanger: {
    borderTopWidth: 1,
    borderTopColor: COLORS.subtle,
  },
  dropdownItemTextDanger: {
    color: COLORS.error,
  },
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.panel,
  },
  // Placeholder screen styles
  placeholderContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.panel,
  },
  placeholderCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.paper,
    borderRadius: 24,
    padding: 34,
    alignItems: 'center',
    shadowColor: COLORS.navy,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  placeholderBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.mint,
  },
  placeholderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDark,
  },

  // AI Mentor Styles
  floatingMentorBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#00685f',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 9999,
    shadowColor: '#171d35',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    zIndex: 999,
  },
  floatingMentorBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  mentorBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 28, 28, 0.25)',
    zIndex: 998,
  },
  mentorDrawer: {
    position: 'absolute',
    top: 72,
    bottom: 0,
    right: 0,
    width: 420,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderLeftColor: '#dedfd3',
    shadowColor: '#171d35',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    zIndex: 1000,
    flexDirection: 'column',
  },
  mentorDrawerMobile: {
    top: 0,
    width: '100%',
  },
  mentorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dedfd3',
    backgroundColor: '#ffffff',
  },
  mentorHeaderInfo: {
    flex: 1,
  },
  mentorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111318',
    alignSelf: 'flex-start',
  },
  mentorSubtitle: {
    fontSize: 12.5,
    color: '#74766f',
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  mentorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1c7c55',
    marginRight: 6,
  },
  mentorStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1c7c55',
  },
  closeMentorBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#efefe6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMentorBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#74766f',
    lineHeight: 20,
  },
  mentorMessagesScroll: {
    padding: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    width: '100%',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAI: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleUser: {
    backgroundColor: '#00685f',
    borderBottomRightRadius: 4,
  },
  messageBubbleAI: {
    backgroundColor: '#f3f4f3',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'left',
  },
  messageTextUser: {
    color: '#ffffff',
  },
  messageTextAI: {
    color: '#111318',
  },
  quickActionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#dedfd3',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
  },
  quickActionsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickActionBtn: {
    backgroundColor: '#efefe6',
    borderWidth: 1,
    borderColor: '#dedfd3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionBtnContextual: {
    backgroundColor: '#f4fffc',
    borderColor: '#008378',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3d4947',
  },
  quickActionTextContextual: {
    color: '#008378',
    fontWeight: '700',
  },
  mentorInputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#dedfd3',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    gap: 8,
  },
  mentorTextInput: {
    flex: 1,
    backgroundColor: '#f3f4f3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#111318',
    outlineStyle: 'none',
  },
  mentorSendBtn: {
    backgroundColor: '#00685f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mentorSendBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Rich content styles inside bubble
  richSkillCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dedfd3',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    width: 260,
  },
  richSkillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111318',
    marginBottom: 6,
    textAlign: 'left',
  },
  richProgressTrack: {
    height: 6,
    backgroundColor: '#efefe6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  richProgressBar: {
    height: '100%',
    backgroundColor: '#00685f',
    borderRadius: 3,
  },
  richMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  richMetaLabel: {
    fontSize: 11,
    color: '#74766f',
    fontWeight: '500',
  },
  richActionBtn: {
    backgroundColor: '#00685f',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  richActionBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '600',
  },
  richResumeBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dedfd3',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    width: 260,
  },
  richResumeScoreTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111318',
    marginBottom: 8,
    textAlign: 'left',
  },
  richChecklist: {
    gap: 4,
    marginBottom: 10,
  },
  richChecklistItem: {
    fontSize: 11.5,
    color: '#74766f',
    lineHeight: 15,
    textAlign: 'left',
  },
  richInternshipsBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dedfd3',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    width: 260,
    gap: 8,
  },
  richJobRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f3',
    paddingBottom: 6,
  },
  richJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  richJobTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#111318',
    flex: 1,
    marginRight: 6,
    textAlign: 'left',
  },
  richJobMatch: {
    fontSize: 11,
    color: '#1c7c55',
    fontWeight: '700',
  },
  richJobCompany: {
    fontSize: 11,
    color: '#74766f',
    marginTop: 2,
    textAlign: 'left',
  },
  richLinkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  richLinkBtnText: {
    fontSize: 12.5,
    color: '#00685f',
    fontWeight: '700',
  },
});
