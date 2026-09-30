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
import { sendMessageToMentor, fetchMentorHistory, resetMentorConversation, fetchSuggestedPrompts } from '../services/mentorService';
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
  const [navigationParams, setNavigationParams] = useState({});
  const [showDropdown, setShowDropdown] = useState(false);

  const handleNavigate = (tabName, params = {}) => {
    setNavigationParams(params || {});
    setActiveTab(tabName);
  };

  // AI Mentor states
  const [showMentor, setShowMentor] = useState(false);
  const [mentorInput, setMentorInput] = useState('');
  const [mentorConversationId, setMentorConversationId] = useState(null);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState([
    "What internships fit my profile?",
    "What skills am I missing for my target career?",
    "What should I learn next?",
    "Am I ready for a backend/fullstack role?",
    "How can I improve my resume ATS score?"
  ]);
  const [mentorMessages, setMentorMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hi! I'm your Personal AI Career Mentor 👋\n\nI know your SkillSetu profile, verified skills, and career goals. Ask me about matching internships, your skill gaps, course roadmaps, or resume ATS score!",
      timestamp: 'Now',
    }
  ]);
  const mentorScrollRef = useRef(null);

  // Animation for side mentor drawer sliding in
  const mentorSlideAnim = useRef(new Animated.Value(width)).current;

  // Load conversation history and dynamic prompts when mentor opens
  useEffect(() => {
    if (showMentor && user?.email) {
      fetchSuggestedPrompts(user.email).then(prompts => {
        if (prompts && prompts.length > 0) setSuggestedPrompts(prompts);
      });
      fetchMentorHistory(user.email, mentorConversationId).then(hist => {
        if (hist && hist.messages && hist.messages.length > 0) {
          setMentorMessages(hist.messages);
          if (hist.conversationId) setMentorConversationId(hist.conversationId);
        }
      });
    }
  }, [showMentor, user?.email]);

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
            onNavigateToProfile={() => handleNavigate('Profile')}
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
            onFinish={() => handleNavigate('Dashboard')}
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
            navigationParams={navigationParams}
            onNavigate={handleNavigate}
          />
        );
      case 'Learning':
        return (
          <Learning
            user={user}
            profileData={profileData}
            navigationParams={navigationParams}
            onNavigate={handleNavigate}
          />
        );
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

  const handleSendMessage = async (customPrompt = null) => {
    const textToSend = (typeof customPrompt === 'string' ? customPrompt : mentorInput).trim();
    if (!textToSend || isMentorLoading) return;

    setMentorInput('');
    const userMsgId = Date.now();
    const newMessages = [
      ...mentorMessages,
      { id: userMsgId, sender: 'user', text: textToSend, timestamp: 'Now' }
    ];
    setMentorMessages(newMessages);
    setIsMentorLoading(true);

    try {
      const aiResponse = await sendMessageToMentor(user?.email, textToSend, mentorConversationId);
      if (aiResponse) {
        if (aiResponse.conversation_id) {
          setMentorConversationId(aiResponse.conversation_id);
        }
        setMentorMessages(prev => [...prev, aiResponse]);
      }
    } catch (err) {
      console.error('Error in mentor chat:', err);
      setMentorMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'ai',
          text: "I couldn't retrieve the latest intelligence from the server right now. Your SkillSetu profile is safe. Please check your connection and try again in a moment.",
          timestamp: 'Now'
        }
      ]);
    } finally {
      setIsMentorLoading(false);
    }
  };

  const handleResetConversation = async () => {
    setIsMentorLoading(true);
    try {
      await resetMentorConversation(user?.email);
      setMentorConversationId(null);
      setMentorMessages([
        {
          id: Date.now(),
          sender: 'ai',
          text: `Hi ${user?.name || 'there'}! Started a fresh career guidance session 👋\n\nHow can I help you plan your career, find internships, or close skill gaps today?`,
          timestamp: 'Now'
        }
      ]);
      const prompts = await fetchSuggestedPrompts(user?.email);
      if (prompts && prompts.length > 0) setSuggestedPrompts(prompts);
    } catch (err) {
      console.error('Error resetting mentor session:', err);
    } finally {
      setIsMentorLoading(false);
    }
  };

  const getContextualActionButton = () => {
    switch (activeTab) {
      case 'Skills':
        return { label: 'Explain My Skill Gap', prompt: 'Explain my biggest skill gaps and how to close them.' };
      case 'Opportunities':
        return { label: 'Why Do I Match These Roles?', prompt: 'Why do I match these internships and how can I improve my match score?' };
      case 'Resume':
        return { label: 'Improve My Resume ATS', prompt: 'How can I optimize my resume ATS score for backend and fullstack roles?' };
      case 'Applications':
        return { label: 'What Should I Do Next?', prompt: 'What is my highest-priority career action this week?' };
      case 'Learning':
        return { label: 'Create 30-Day Learning Plan', prompt: 'Generate a prioritized 30-day learning roadmap for my target career.' };
      case 'InterviewPrep':
        return { label: 'Start Technical Mock', prompt: 'Give me technical mock interview questions for my verified skills.' };
      default:
        return null;
    }
  };

  // Helper to render bold markdown formatting and structured line breaks
  const renderFormattedText = (rawText, isUser) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');

    return (
      <View style={{ gap: 4 }}>
        {lines.map((line, lIdx) => {
          if (!line.trim()) {
            return <View key={lIdx} style={{ height: 4 }} />;
          }

          // Split line by bold tokens **bold**
          const parts = line.split(/(\*\*.*?\*\*)/g);

          return (
            <Text
              key={lIdx}
              style={[
                styles.messageText,
                isUser ? styles.messageTextUser : styles.messageTextAI
              ]}
            >
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const boldContent = part.slice(2, -2);
                  return (
                    <Text
                      key={pIdx}
                      style={[
                        styles.messageTextBold,
                        isUser ? styles.messageTextBoldUser : styles.messageTextBoldAI
                      ]}
                    >
                      {boldContent}
                    </Text>
                  );
                }
                return part;
              })}
            </Text>
          );
        })}
      </View>
    );
  };

  const renderRichContent = (rich) => {
    if (!rich || !rich.type) return null;

    switch (rich.type) {
      case 'skill_card':
        return (
          <View style={styles.richSkillCard}>
            <View style={styles.richCardHeader}>
              <Text style={styles.richSkillTitle}>{rich.title || rich.skillName}</Text>
              {rich.provider && (
                <View style={styles.richProviderBadge}>
                  <Text style={styles.richProviderBadgeText}>{rich.provider}</Text>
                </View>
              )}
            </View>

            {rich.percentage !== undefined && (
              <View style={styles.richProgressTrack}>
                <View style={[styles.richProgressBar, { width: `${Math.min(100, Math.max(5, rich.percentage))}%` }]} />
              </View>
            )}

            {(rich.current !== undefined || rich.target !== undefined) && (
              <View style={styles.richMetaRow}>
                <Text style={styles.richMetaLabel}>Current: {rich.current || 0}%</Text>
                <Text style={styles.richMetaLabel}>➔ Target: {rich.target || 85}%</Text>
              </View>
            )}

            {rich.duration && (
              <Text style={styles.richDurationText}>⏱ Duration: {rich.duration}</Text>
            )}

            <Pressable
              style={styles.richActionBtn}
              onPress={() => {
                setShowMentor(false);
                setActiveTab(rich.actionTab || 'Learning');
              }}
            >
              <Text style={styles.richActionBtnText}>{rich.buttonLabel || 'Start Learning Module'}</Text>
            </Pressable>
          </View>
        );

      case 'resume_insights':
        return (
          <View style={styles.richResumeBox}>
            <View style={styles.richResumeHeaderRow}>
              <Text style={styles.richResumeScoreTitle}>ATS Score</Text>
              <View style={styles.richResumeScoreBadge}>
                <Text style={styles.richResumeScoreBadgeText}>{rich.score || 80}/100</Text>
              </View>
            </View>

            {rich.points && rich.points.length > 0 && (
              <View style={styles.richChecklist}>
                {rich.points.map((pt, idx) => (
                  <View key={idx} style={styles.richChecklistRow}>
                    <Text style={styles.richChecklistBullet}>✓</Text>
                    <Text style={styles.richChecklistItem}>{pt}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              style={styles.richActionBtn}
              onPress={() => {
                setShowMentor(false);
                setActiveTab(rich.actionTab || 'Resume');
              }}
            >
              <Text style={styles.richActionBtnText}>{rich.buttonLabel || 'Optimize Resume in Studio'}</Text>
            </Pressable>
          </View>
        );

      case 'internships_list':
        return (
          <View style={styles.richInternshipsBox}>
            <Text style={styles.richInternshipsHeaderTitle}>{rich.title || 'Recommended Opportunities'}</Text>
            {(rich.jobs || []).map((job, idx) => (
              <View key={idx} style={styles.richJobRow}>
                <View style={styles.richJobHeader}>
                  <Text style={styles.richJobTitle} numberOfLines={1}>{job.title}</Text>
                  <View style={styles.richMatchBadge}>
                    <Text style={styles.richMatchBadgeText}>{job.match}% Match</Text>
                  </View>
                </View>
                <Text style={styles.richJobCompany}>{job.company} • {job.location || 'Remote'}</Text>
                {job.stipend && (
                  <Text style={styles.richJobStipend}>{job.stipend}</Text>
                )}
              </View>
            ))}

            <Pressable
              style={styles.richActionBtn}
              onPress={() => {
                setShowMentor(false);
                setActiveTab(rich.actionTab || 'Opportunities');
              }}
            >
              <Text style={styles.richActionBtnText}>{rich.buttonLabel || 'Explore Matching Internships'}</Text>
            </Pressable>
          </View>
        );

      case 'text_link':
        return (
          <Pressable
            style={styles.richLinkBtn}
            onPress={() => {
              setShowMentor(false);
              setActiveTab(rich.actionTab || 'Dashboard');
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.mentorTitle}>Personal AI Career Mentor</Text>
              <Text style={{ fontSize: 13 }}>✨</Text>
            </View>
            <Text style={styles.mentorSubtitle}>
              Tailored for {user?.name || 'You'}
            </Text>
           
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              style={styles.resetMentorBtn}
              onPress={handleResetConversation}
              disabled={isMentorLoading}
            >
              <Text style={styles.resetMentorBtnText}>↻ New</Text>
            </Pressable>
            <Pressable style={styles.closeMentorBtn} onPress={() => setShowMentor(false)}>
              <Text style={styles.closeMentorBtnText}>×</Text>
            </Pressable>
          </View>
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
                {renderFormattedText(msg.text, msg.sender === 'user')}

                {/* Render Rich widget component if exists */}
                {msg.richContent && renderRichContent(msg.richContent)}
              </View>
            </View>
          ))}

          {/* Typing / Loading Indicator */}
          {isMentorLoading && (
            <View style={[styles.messageRow, styles.messageRowAI]}>
              <View style={[styles.messageBubble, styles.messageBubbleAI, styles.loadingBubble]}>
                <View style={styles.loadingDotsRow}>
                  <View style={[styles.loadingDot, styles.loadingDot1]} />
                  <View style={[styles.loadingDot, styles.loadingDot2]} />
                  <View style={[styles.loadingDot, styles.loadingDot3]} />
                  <Text style={styles.loadingText}>Analyzing your profile & SkillSetu data...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Dynamic Suggested Prompts */}
        <View style={styles.quickActionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
            {/* Contextual Action Button based on active screen tab */}
            {getContextualActionButton() && (
              <Pressable
                style={[styles.quickActionBtn, styles.quickActionBtnContextual]}
                onPress={() => handleSendMessage(getContextualActionButton().prompt)}
                disabled={isMentorLoading}
              >
                <Text style={[styles.quickActionText, styles.quickActionTextContextual]}>
                  ✨ {getContextualActionButton().label}
                </Text>
              </Pressable>
            )}

            {suggestedPrompts.map((promptText, index) => (
              <Pressable
                key={index}
                style={styles.quickActionBtn}
                onPress={() => handleSendMessage(promptText)}
                disabled={isMentorLoading}
              >
                <Text style={styles.quickActionText}>{promptText}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Chat input box */}
        <View style={styles.mentorInputRow}>
          <TextInput
            style={styles.mentorTextInput}
            placeholder="Ask your career mentor anything..."
            placeholderTextColor="#74766f"
            value={mentorInput}
            onChangeText={setMentorInput}
            onSubmitEditing={() => handleSendMessage()}
            editable={!isMentorLoading}
          />
          <Pressable
            style={[styles.mentorSendBtn, isMentorLoading && styles.mentorSendBtnDisabled]}
            onPress={() => handleSendMessage()}
            disabled={isMentorLoading || !mentorInput.trim()}
          >
            <Text style={styles.mentorSendBtnText}>{isMentorLoading ? '...' : 'Send ➤'}</Text>
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
  statusDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  mentorStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1c7c55',
  },
  resetMentorBtn: {
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccebd7',
  },
  resetMentorBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#137333',
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
    maxWidth: '88%',
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
    lineHeight: 20,
    textAlign: 'left',
  },
  messageTextUser: {
    color: '#ffffff',
  },
  messageTextAI: {
    color: '#111318',
  },
  messageTextBold: {
    fontWeight: '700',
  },
  messageTextBoldUser: {
    color: '#ffffff',
  },
  messageTextBoldAI: {
    color: '#071f14',
  },
  loadingBubble: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  loadingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16a34a',
  },
  loadingDot1: { opacity: 0.4 },
  loadingDot2: { opacity: 0.7 },
  loadingDot3: { opacity: 1.0 },
  loadingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#166534',
    marginLeft: 4,
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
    paddingVertical: 7,
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
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#111318',
    outlineStyle: 'none',
  },
  mentorSendBtn: {
    backgroundColor: '#00685f',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  mentorSendBtnDisabled: {
    opacity: 0.5,
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
    width: 270,
  },
  richCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  richSkillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111318',
    flex: 1,
    marginRight: 6,
    textAlign: 'left',
  },
  richProviderBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  richProviderBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
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
    marginBottom: 6,
  },
  richMetaLabel: {
    fontSize: 11,
    color: '#74766f',
    fontWeight: '500',
  },
  richDurationText: {
    fontSize: 11,
    color: '#74766f',
    marginBottom: 10,
  },
  richActionBtn: {
    backgroundColor: '#00685f',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  richActionBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  richResumeBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dedfd3',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    width: 270,
  },
  richResumeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  richResumeScoreTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111318',
    textAlign: 'left',
  },
  richResumeScoreBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  richResumeScoreBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
  },
  richChecklist: {
    gap: 6,
    marginBottom: 10,
  },
  richChecklistRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  richChecklistBullet: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: 'bold',
  },
  richChecklistItem: {
    fontSize: 11.5,
    color: '#4b5563',
    lineHeight: 16,
    flex: 1,
    textAlign: 'left',
  },
  richInternshipsBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dedfd3',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    width: 270,
    gap: 8,
  },
  richInternshipsHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#111318',
    marginBottom: 4,
  },
  richJobRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f3',
    paddingBottom: 8,
  },
  richJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  richJobTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#111318',
    flex: 1,
    marginRight: 6,
    textAlign: 'left',
  },
  richMatchBadge: {
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  richMatchBadgeText: {
    fontSize: 11,
    color: '#137333',
    fontWeight: '800',
  },
  richJobCompany: {
    fontSize: 11,
    color: '#74766f',
    marginTop: 2,
    textAlign: 'left',
  },
  richJobStipend: {
    fontSize: 10.5,
    color: '#00685f',
    fontWeight: '600',
    marginTop: 2,
  },
  richLinkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  richLinkBtnText: {
    fontSize: 12,
    color: '#00685f',
    fontWeight: '700',
  },
});
