import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  sendMessageToMentor,
  fetchMentorHistory,
  resetMentorConversation,
  fetchSuggestedPrompts,
} from '../services/mentorService';

// SkillSetu Design System Tokens
const THEME = {
  canvas: '#F4F1FA',
  paper: '#FFFFFF',
  foreground: '#332F3A',
  foregroundDark: '#1E1B24',
  muted: '#635F69',
  mutedLight: '#8E8A95',
  borderSubtle: '#EDE9FE',
  borderCard: 'rgba(230, 225, 242, 0.9)',
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#F3E8FF',
  primaryLighter: '#FAF5FF',
  secondary: '#DB2777',
  secondaryLight: '#FCE7F3',
  sky: '#0EA5E9',
  skyLight: '#E0F2FE',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
};

// Inject CSS styles for web animations and micro-interactions
const ensureMentorStyles = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const styleId = 'skillsetu-mentor-modal-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      @keyframes mentor-backdrop-fade-in {
        from { opacity: 0; backdrop-filter: blur(0px); }
        to { opacity: 1; backdrop-filter: blur(6px); }
      }
      @keyframes mentor-modal-pop-in {
        0% {
          opacity: 0;
          transform: translateY(24px) scale(0.95);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes mentor-message-enter {
        0% {
          opacity: 0;
          transform: translateY(12px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes mentor-dot-pulse {
        0%, 80%, 100% {
          transform: scale(0.7);
          opacity: 0.4;
        }
        40% {
          transform: scale(1.15);
          opacity: 1;
        }
      }
      @keyframes mentor-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      .mentor-backdrop-animated {
        animation: mentor-backdrop-fade-in 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .mentor-modal-animated {
        animation: mentor-modal-pop-in 360ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .mentor-msg-new {
        animation: mentor-message-enter 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .mentor-dot-1 {
        animation: mentor-dot-pulse 1.2s infinite ease-in-out;
      }
      .mentor-dot-2 {
        animation: mentor-dot-pulse 1.2s infinite ease-in-out 0.2s;
      }
      .mentor-dot-3 {
        animation: mentor-dot-pulse 1.2s infinite ease-in-out 0.4s;
      }

      .mentor-action-chip {
        transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease, box-shadow 200ms ease !important;
        cursor: pointer !important;
        user-select: none !important;
      }
      .mentor-action-chip:hover {
        transform: translateY(-2px) scale(1.02) !important;
        box-shadow: 0 6px 14px rgba(124, 58, 237, 0.15) !important;
      }
      .mentor-action-chip:active {
        transform: scale(0.96) !important;
      }

      .mentor-job-card {
        transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease !important;
      }
      .mentor-job-card:hover {
        transform: translateY(-2px) !important;
        border-color: #C4B5FD !important;
        box-shadow: 0 6px 16px rgba(124, 58, 237, 0.1) !important;
      }

      .mentor-icon-btn {
        transition: transform 180ms ease, background-color 180ms ease !important;
        cursor: pointer !important;
      }
      .mentor-icon-btn:hover {
        transform: scale(1.06) rotate(3deg) !important;
      }
      .mentor-icon-btn:active {
        transform: scale(0.92) !important;
      }

      .mentor-send-btn {
        transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease, background-color 180ms ease !important;
        cursor: pointer !important;
      }
      .mentor-send-btn:hover:not(:disabled) {
        transform: scale(1.05) translateY(-1px) !important;
        box-shadow: 0 8px 20px rgba(124, 58, 237, 0.35) !important;
      }
      .mentor-send-btn:active:not(:disabled) {
        transform: scale(0.92) !important;
      }

      .mentor-custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .mentor-custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .mentor-custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(124, 58, 237, 0.18);
        border-radius: 999px;
      }
      .mentor-custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(124, 58, 237, 0.35);
      }
    `;
    document.head.appendChild(styleEl);
  }
};

export default function MentorModal({
  visible,
  onClose,
  user,
  profileData,
  activeTab,
  onNavigate,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // AI Mentor States
  const [mentorInput, setMentorInput] = useState('');
  const [mentorConversationId, setMentorConversationId] = useState(null);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState([
    'What internships fit my profile?',
    'What skills am I missing for my target career?',
    'What should I learn next?',
    'How can I improve my resume ATS score?',
  ]);
  const [mentorMessages, setMentorMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hi! I'm your Personal AI Career Mentor 👋\n\nI know your SkillSetu profile, verified skills, and career goals. Ask me about matching internships, your skill gaps, course roadmaps, or resume ATS score!",
      timestamp: 'Now',
    },
  ]);

  const mentorScrollRef = useRef(null);

  // Animation values for smooth native/web fallback
  const modalScaleAnim = useRef(new Animated.Value(0.94)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  const modalTranslateAnim = useRef(new Animated.Value(25)).current;

  // Initialize styling
  useEffect(() => {
    ensureMentorStyles();
  }, []);

  // Student details
  const studentName =
    profileData?.personalInfo?.fullName ||
    user?.name ||
    user?.full_name ||
    'Student';

  // Handle open animation & data fetching
  useEffect(() => {
    if (visible) {
      setIsClosing(false);
      modalScaleAnim.setValue(0.94);
      modalOpacityAnim.setValue(0);
      modalTranslateAnim.setValue(25);

      Animated.parallel([
        Animated.timing(modalOpacityAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(modalScaleAnim, {
          toValue: 1,
          duration: 360,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(modalTranslateAnim, {
          toValue: 0,
          duration: 360,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      if (user?.email) {
        fetchSuggestedPrompts(user.email)
          .then((prompts) => {
            if (prompts && prompts.length > 0) {
              // Deduplicate prompts
              const uniquePrompts = Array.from(new Set(prompts));
              setSuggestedPrompts(uniquePrompts);
            }
          })
          .catch(() => {});

        fetchMentorHistory(user.email, mentorConversationId)
          .then((hist) => {
            if (hist && hist.messages && hist.messages.length > 0) {
              setMentorMessages(hist.messages);
              if (hist.conversationId) setMentorConversationId(hist.conversationId);
            }
          })
          .catch(() => {});
      }
    }
  }, [visible, user?.email]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (mentorScrollRef.current) {
      setTimeout(() => {
        mentorScrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [mentorMessages, isMentorLoading]);

  // Smooth close with exit animation
  const handleRequestClose = () => {
    if (isClosing) return;
    setIsClosing(true);

    Animated.parallel([
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(modalScaleAnim, {
        toValue: 0.95,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(modalTranslateAnim, {
        toValue: 20,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setIsClosing(false);
      onClose();
    });
  };

  const handleSendMessage = async (customPrompt = null) => {
    const textToSend = (typeof customPrompt === 'string' ? customPrompt : mentorInput).trim();
    if (!textToSend || isMentorLoading) return;

    setMentorInput('');
    const userMsgId = Date.now();
    const newMessages = [
      ...mentorMessages,
      { id: userMsgId, sender: 'user', text: textToSend, timestamp: 'Now', isNew: true },
    ];
    setMentorMessages(newMessages);
    setIsMentorLoading(true);

    try {
      const aiResponse = await sendMessageToMentor(user?.email, textToSend, mentorConversationId);
      if (aiResponse) {
        if (aiResponse.conversation_id) {
          setMentorConversationId(aiResponse.conversation_id);
        }
        setMentorMessages((prev) => [...prev, { ...aiResponse, isNew: true }]);
      }
    } catch (err) {
      console.error('Error in mentor chat:', err);
      setMentorMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'ai',
          isError: true,
          text: "Something went wrong while generating your mentor response. Your profile data is safe. Please check your connection and try again.",
          timestamp: 'Now',
          isNew: true,
        },
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
          text: `Hi ${studentName}! Started a fresh career guidance session ✨\n\nHow can I help you plan your roadmap, find internships, or close skill gaps today?`,
          timestamp: 'Now',
          isNew: true,
        },
      ]);
      const prompts = await fetchSuggestedPrompts(user?.email);
      if (prompts && prompts.length > 0) {
        setSuggestedPrompts(Array.from(new Set(prompts)));
      }
    } catch (err) {
      console.error('Error resetting mentor session:', err);
    } finally {
      setIsMentorLoading(false);
    }
  };

  const getContextualAction = () => {
    switch (activeTab) {
      case 'Skills':
        return { label: 'Explain Skill Gaps', prompt: 'Explain my biggest skill gaps and how to close them.' };
      case 'Opportunities':
        return { label: 'Matching Internships', prompt: 'Why do I match these internships and how can I improve my match score?' };
      case 'Resume':
        return { label: 'Improve Resume ATS', prompt: 'How can I optimize my resume ATS score for target roles?' };
      case 'Applications':
        return { label: 'Next Career Step', prompt: 'What is my highest-priority career action this week?' };
      case 'Learning':
        return { label: '30-Day Learning Plan', prompt: 'Generate a prioritized 30-day learning roadmap for my target career.' };
      case 'Rounds':
        return { label: 'Interview Prep', prompt: 'What should I prepare for my upcoming assessment rounds?' };
      default:
        return { label: 'Skill Gaps Analysis', prompt: 'Analyze my current profile and tell me what skills to focus on.' };
    }
  };

  // Build clean, deduplicated quick action chips list
  const contextualAction = getContextualAction();
  const rawActions = [
    ...(contextualAction ? [{ label: contextualAction.label, prompt: contextualAction.prompt, isContextual: true }] : []),
    ...suggestedPrompts.map((p) => ({ label: p, prompt: p, isContextual: false })),
  ];

  // Filter duplicates
  const seenPrompts = new Set();
  const quickActions = rawActions.filter((action) => {
    const key = action.prompt.toLowerCase().trim();
    if (seenPrompts.has(key)) return false;
    seenPrompts.add(key);
    return true;
  });

  const renderFormattedText = (rawText, isUser) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');

    return (
      <View style={{ gap: 4 }}>
        {lines.map((line, lIdx) => {
          if (!line.trim()) {
            return <View key={lIdx} style={{ height: 4 }} />;
          }

          const parts = line.split(/(\*\*.*?\*\*)/g);

          return (
            <Text
              key={lIdx}
              style={[
                styles.messageText,
                isUser ? styles.messageTextUser : styles.messageTextAI,
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
                        isUser ? styles.messageTextBoldUser : styles.messageTextBoldAI,
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
      case 'internships_list': {
        const jobs = rich.jobs || [];
        if (jobs.length === 0) return null;
        const displayJobs = jobs.slice(0, 3);

        return (
          <View style={styles.richRecommendationCard}>
            <View style={styles.richRecHeader}>
              <View style={styles.richRecSparkleBadge}>
                <Text style={styles.richRecSparkleIcon}>✨</Text>
                <Text style={styles.richRecHeaderTitle}>RECOMMENDED FOR YOU</Text>
              </View>
              <Text style={styles.richRecSubtitle}>
                Based on your current profile, these opportunities may be worth exploring.
              </Text>
            </View>

            <View style={styles.richJobsContainer}>
              {displayJobs.map((job, idx) => (
                <View
                  key={idx}
                  className="mentor-job-card"
                  style={styles.richJobItem}
                >
                  <View style={styles.richJobMainRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.richJobTitle} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text style={styles.richJobMeta} numberOfLines={1}>
                        {job.company} • {job.location || 'Remote'}
                      </Text>
                      {job.stipend ? (
                        <Text style={styles.richJobStipend}>{job.stipend}</Text>
                      ) : null}
                    </View>

                    {job.match !== undefined && (
                      <View style={styles.richMatchPill}>
                        <Text style={styles.richMatchPillText}>{job.match}% Match</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.richRecActionBtn}
              onPress={() => {
                handleRequestClose();
                if (onNavigate) {
                  onNavigate(rich.actionTab || 'Opportunities');
                }
              }}
            >
              <Text style={styles.richRecActionBtnText}>
                {rich.buttonLabel || 'View All Opportunities →'}
              </Text>
            </Pressable>
          </View>
        );
      }

      case 'skill_card': {
        return (
          <View style={styles.richSkillCard}>
            <View style={styles.richSkillHeader}>
              <Text style={styles.richSkillTitle}>{rich.title || rich.skillName}</Text>
              {rich.provider && (
                <View style={styles.richSkillBadge}>
                  <Text style={styles.richSkillBadgeText}>{rich.provider}</Text>
                </View>
              )}
            </View>

            {rich.percentage !== undefined && (
              <View style={styles.richProgressTrack}>
                <View
                  style={[
                    styles.richProgressBar,
                    { width: `${Math.min(100, Math.max(5, rich.percentage))}%` },
                  ]}
                />
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
              style={styles.richCardActionBtn}
              onPress={() => {
                handleRequestClose();
                if (onNavigate) {
                  onNavigate(rich.actionTab || 'Learning');
                }
              }}
            >
              <Text style={styles.richCardActionBtnText}>
                {rich.buttonLabel || 'Start Learning Module'}
              </Text>
            </Pressable>
          </View>
        );
      }

      case 'resume_insights': {
        return (
          <View style={styles.richResumeBox}>
            <View style={styles.richResumeHeader}>
              <Text style={styles.richResumeTitle}>ATS Score Intelligence</Text>
              <View style={styles.richResumeScoreBadge}>
                <Text style={styles.richResumeScoreBadgeText}>{rich.score || 80}/100</Text>
              </View>
            </View>

            {rich.points && rich.points.length > 0 && (
              <View style={styles.richResumeChecklist}>
                {rich.points.map((pt, idx) => (
                  <View key={idx} style={styles.richChecklistRow}>
                    <Text style={styles.richChecklistBullet}>✓</Text>
                    <Text style={styles.richChecklistItem}>{pt}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              style={styles.richCardActionBtn}
              onPress={() => {
                handleRequestClose();
                if (onNavigate) {
                  onNavigate(rich.actionTab || 'Resume');
                }
              }}
            >
              <Text style={styles.richCardActionBtnText}>
                {rich.buttonLabel || 'Optimize Resume in Studio'}
              </Text>
            </Pressable>
          </View>
        );
      }

      case 'text_link': {
        return (
          <Pressable
            style={styles.richLinkBtn}
            onPress={() => {
              handleRequestClose();
              if (onNavigate) {
                onNavigate(rich.actionTab || 'Dashboard');
              }
            }}
          >
            <Text style={styles.richLinkBtnText}>{rich.label} ➔</Text>
          </Pressable>
        );
      }

      default:
        return null;
    }
  };

  if (!visible && !isClosing) {
    return null;
  }

  return (
    <View style={styles.modalRootContainer}>
      {/* Backdrop with fade blur */}
      <Pressable
        style={styles.backdropPressable}
        onPress={handleRequestClose}
        accessibilityRole="button"
        accessibilityLabel="Close modal backdrop"
      >
        <Animated.View
          className={Platform.OS === 'web' ? 'mentor-backdrop-animated' : undefined}
          style={[styles.backdrop, { opacity: modalOpacityAnim }]}
        />
      </Pressable>

      {/* Centered Modal Container */}
      <Animated.View
        className={Platform.OS === 'web' ? 'mentor-modal-animated' : undefined}
        style={[
          styles.modalCard,
          isMobile ? styles.modalCardMobile : styles.modalCardDesktop,
          {
            opacity: modalOpacityAnim,
            transform: [
              { scale: modalScaleAnim },
              { translateY: modalTranslateAnim },
            ],
          },
        ]}
      >
        {/* ================= HEADER ================= */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <View style={styles.aiAvatarCircle}>
              <Text style={styles.aiAvatarEmoji}>✨</Text>
            </View>
            <View style={styles.headerTextGroup}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>Personal AI Career Mentor</Text>
              </View>
              <Text style={styles.headerSubtitle}>
                Your personalized career copilot • {studentName}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <Pressable
              className="mentor-action-chip"
              style={({ pressed }) => [
                styles.newChatBtn,
                pressed && styles.pressedBtn,
              ]}
              onPress={handleResetConversation}
              disabled={isMentorLoading}
              accessibilityRole="button"
              accessibilityLabel="Start a new chat"
            >
              <Text style={styles.newChatBtnText}>+ New Chat</Text>
            </Pressable>

            <Pressable
              className="mentor-icon-btn"
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.pressedBtn,
              ]}
              onPress={handleRequestClose}
              accessibilityRole="button"
              accessibilityLabel="Close AI Career Mentor"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>
        </View>

        {/* ================= CONVERSATION AREA ================= */}
        <ScrollView
          ref={mentorScrollRef}
          style={styles.messagesScrollView}
          contentContainerStyle={styles.messagesScrollContent}
          showsVerticalScrollIndicator={true}
          className={Platform.OS === 'web' ? 'mentor-custom-scrollbar' : undefined}
        >
          {mentorMessages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            const isError = msg.isError;

            return (
              <View
                key={msg.id || index}
                className={msg.isNew && Platform.OS === 'web' ? 'mentor-msg-enter' : undefined}
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowAI,
                ]}
              >
                {!isUser && (
                  <View style={styles.aiSenderHeader}>
                    <View style={styles.aiSenderBadge}>
                      <Text style={styles.aiSenderBadgeIcon}>✨</Text>
                      <Text style={styles.aiSenderBadgeText}>AI Mentor</Text>
                    </View>
                    {msg.timestamp && (
                      <Text style={styles.messageTimestamp}>{msg.timestamp}</Text>
                    )}
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    isUser
                      ? styles.messageBubbleUser
                      : isError
                      ? styles.messageBubbleError
                      : styles.messageBubbleAI,
                  ]}
                >
                  {renderFormattedText(msg.text, isUser)}

                  {/* Render embedded rich widgets (opportunities, skill gaps, resume insights) */}
                  {msg.richContent && renderRichContent(msg.richContent)}
                </View>

                {isUser && msg.timestamp && (
                  <Text style={[styles.messageTimestamp, styles.messageTimestampUser]}>
                    {msg.timestamp}
                  </Text>
                )}
              </View>
            );
          })}

          {/* Thinking / Analyzing Indicator */}
          {isMentorLoading && (
            <View style={[styles.messageRow, styles.messageRowAI]}>
              <View style={styles.aiSenderHeader}>
                <View style={styles.aiSenderBadge}>
                  <Text style={styles.aiSenderBadgeIcon}>✨</Text>
                  <Text style={styles.aiSenderBadgeText}>AI Mentor</Text>
                </View>
              </View>
              <View style={[styles.messageBubble, styles.messageBubbleAI, styles.loadingBubble]}>
                <View style={styles.loadingDotsRow}>
                  <View style={[styles.loadingDot, Platform.OS === 'web' && styles.loadingDotWeb1]} className={Platform.OS === 'web' ? 'mentor-dot-1' : undefined} />
                  <View style={[styles.loadingDot, Platform.OS === 'web' && styles.loadingDotWeb2]} className={Platform.OS === 'web' ? 'mentor-dot-2' : undefined} />
                  <View style={[styles.loadingDot, Platform.OS === 'web' && styles.loadingDotWeb3]} className={Platform.OS === 'web' ? 'mentor-dot-3' : undefined} />
                  <Text style={styles.loadingText}>Analyzing your profile & SkillSetu intelligence...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ================= QUICK ACTIONS ================= */}
        <View style={styles.quickActionsSection}>
          <View style={styles.quickActionsLabelRow}>
            <Text style={styles.quickActionsLabel}>QUICK ACTIONS</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            {quickActions.map((action, idx) => (
              <Pressable
                key={idx}
                className="mentor-action-chip"
                style={({ pressed }) => [
                  styles.quickActionChip,
                  action.isContextual && styles.quickActionChipContextual,
                  pressed && styles.pressedChip,
                ]}
                onPress={() => handleSendMessage(action.prompt)}
                disabled={isMentorLoading}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Text
                  style={[
                    styles.quickActionChipText,
                    action.isContextual && styles.quickActionChipTextContextual,
                  ]}
                >
                  {action.isContextual ? `✨ ${action.label}` : action.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ================= INPUT AREA ================= */}
        <View style={styles.inputContainer}>
          <View style={styles.inputInnerWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask your career mentor anything..."
              placeholderTextColor="#8E8A95"
              value={mentorInput}
              onChangeText={setMentorInput}
              onSubmitEditing={() => handleSendMessage()}
              editable={!isMentorLoading}
              returnKeyType="send"
            />

            <Pressable
              className="mentor-send-btn"
              style={({ pressed }) => [
                styles.sendBtn,
                (!mentorInput.trim() || isMentorLoading) && styles.sendBtnDisabled,
                pressed && mentorInput.trim() && !isMentorLoading && styles.pressedBtn,
              ]}
              onPress={() => handleSendMessage()}
              disabled={isMentorLoading || !mentorInput.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Text style={styles.sendBtnIcon}>
                {isMentorLoading ? '⋯' : '➤'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRootContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        position: 'fixed',
      },
    }),
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 27, 36, 0.45)',
  },

  // Modal Card (Claymorphic)
  modalCard: {
    backgroundColor: THEME.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.borderCard,
    overflow: 'hidden',
    flexDirection: 'column',
    ...Platform.select({
      web: {
        boxShadow:
          '0 24px 60px rgba(124, 58, 237, 0.18), 0 8px 24px rgba(30, 27, 36, 0.15), inset 1px 1px 2px rgba(255, 255, 255, 0.8)',
        maxHeight: '88vh',
      },
      default: {
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 16,
      },
    }),
  },
  modalCardDesktop: {
    width: 580,
    height: 760,
  },
  modalCardMobile: {
    width: '92%',
    height: '90%',
    maxHeight: '92%',
    borderRadius: 20,
  },

  // Header
  headerContainer: {
    height: 84,
    backgroundColor: '#FAF8FD',
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderSubtle,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  aiAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.primaryLight,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)',
      },
    }),
  },
  aiAvatarEmoji: {
    fontSize: 18,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 17,
    fontWeight: '800',
    color: THEME.foregroundDark,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    fontSize: 12,
    color: THEME.muted,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newChatBtn: {
    backgroundColor: THEME.primaryLight,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatBtnText: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.canvas,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: THEME.muted,
    fontWeight: '700',
  },

  // Conversation Area
  messagesScrollView: {
    flex: 1,
    backgroundColor: '#FAF9FD',
  },
  messagesScrollContent: {
    padding: 20,
    gap: 16,
  },
  messageRow: {
    width: '100%',
    flexDirection: 'column',
  },
  messageRowUser: {
    alignItems: 'flex-end',
  },
  messageRowAI: {
    alignItems: 'flex-start',
  },
  aiSenderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    marginLeft: 4,
  },
  aiSenderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: 4,
  },
  aiSenderBadgeIcon: {
    fontSize: 10,
  },
  aiSenderBadgeText: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
  },
  messageTimestamp: {
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    fontSize: 10.5,
    color: THEME.mutedLight,
  },
  messageTimestampUser: {
    marginTop: 4,
    marginRight: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 20,
  },
  messageBubbleUser: {
    maxWidth: '82%',
    backgroundColor: THEME.primary,
    borderBottomRightRadius: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)',
      },
    }),
  },
  messageBubbleAI: {
    maxWidth: '86%',
    backgroundColor: THEME.paper,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    borderBottomLeftRadius: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(160, 150, 180, 0.08)',
      },
    }),
  },
  messageBubbleError: {
    maxWidth: '86%',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    fontSize: 13.5,
    lineHeight: 21,
    textAlign: 'left',
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextAI: {
    color: THEME.foreground,
  },
  messageTextBold: {
    fontWeight: '700',
  },
  messageTextBoldUser: {
    color: '#FFFFFF',
  },
  messageTextBoldAI: {
    color: THEME.foregroundDark,
  },

  // Loading Indicator
  loadingBubble: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  loadingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.primary,
  },
  loadingDotWeb1: { opacity: 0.5 },
  loadingDotWeb2: { opacity: 0.75 },
  loadingDotWeb3: { opacity: 1 },
  loadingText: {
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
    marginLeft: 6,
  },

  // Embedded Recommendation Card (Compact & Polished)
  richRecommendationCard: {
    marginTop: 12,
    backgroundColor: '#FAF9FE',
    borderWidth: 1,
    borderColor: '#E4DCFB',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    minWidth: 280,
  },
  richRecHeader: {
    marginBottom: 10,
  },
  richRecSparkleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  richRecSparkleIcon: {
    fontSize: 12,
  },
  richRecHeaderTitle: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 11,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.8,
  },
  richRecSubtitle: {
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    fontSize: 11.5,
    color: THEME.muted,
    lineHeight: 16,
  },
  richJobsContainer: {
    gap: 8,
    marginBottom: 10,
  },
  richJobItem: {
    backgroundColor: THEME.paper,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    borderRadius: 12,
    padding: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(160, 150, 180, 0.06)',
      },
    }),
  },
  richJobMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  richJobTitle: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 13,
    fontWeight: '700',
    color: THEME.foregroundDark,
    textAlign: 'left',
  },
  richJobMeta: {
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    fontSize: 11.5,
    color: THEME.muted,
    marginTop: 2,
    textAlign: 'left',
  },
  richJobStipend: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
    marginTop: 3,
  },
  richMatchPill: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    alignSelf: 'flex-start',
  },
  richMatchPillText: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.primary,
  },
  richRecActionBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)',
      },
    }),
  },
  richRecActionBtnText: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Rich Skill Card
  richSkillCard: {
    marginTop: 12,
    backgroundColor: '#FAF9FE',
    borderWidth: 1,
    borderColor: '#E4DCFB',
    borderRadius: 16,
    padding: 14,
    width: '100%',
  },
  richSkillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  richSkillTitle: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 13,
    fontWeight: '700',
    color: THEME.foregroundDark,
    flex: 1,
  },
  richSkillBadge: {
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  richSkillBadgeText: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 10,
    fontWeight: '700',
    color: THEME.primary,
  },
  richProgressTrack: {
    height: 6,
    backgroundColor: '#EAE5F5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  richProgressBar: {
    height: '100%',
    backgroundColor: THEME.primary,
    borderRadius: 3,
  },
  richMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  richMetaLabel: {
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    fontSize: 11,
    color: THEME.muted,
  },
  richDurationText: {
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    fontSize: 11,
    color: THEME.muted,
    marginBottom: 8,
  },
  richCardActionBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  richCardActionBtnText: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Rich Resume Box
  richResumeBox: {
    marginTop: 12,
    backgroundColor: '#FAF9FE',
    borderWidth: 1,
    borderColor: '#E4DCFB',
    borderRadius: 16,
    padding: 14,
    width: '100%',
  },
  richResumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  richResumeTitle: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 13,
    fontWeight: '700',
    color: THEME.foregroundDark,
  },
  richResumeScoreBadge: {
    backgroundColor: THEME.emeraldLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  richResumeScoreBadgeText: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.emerald,
  },
  richResumeChecklist: {
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
    color: THEME.emerald,
    fontWeight: 'bold',
  },
  richChecklistItem: {
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    fontSize: 11.5,
    color: THEME.foreground,
    lineHeight: 16,
    flex: 1,
    textAlign: 'left',
  },
  richLinkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: THEME.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  richLinkBtnText: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 12,
    color: THEME.primary,
    fontWeight: '700',
  },

  // Quick Actions Section
  quickActionsSection: {
    borderTopWidth: 1,
    borderTopColor: THEME.borderSubtle,
    backgroundColor: THEME.paper,
    paddingVertical: 10,
  },
  quickActionsLabelRow: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  quickActionsLabel: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 10,
    fontWeight: '800',
    color: THEME.mutedLight,
    letterSpacing: 0.8,
  },
  quickActionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickActionChip: {
    backgroundColor: THEME.canvas,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionChipContextual: {
    backgroundColor: THEME.primaryLight,
    borderColor: '#C4B5FD',
  },
  quickActionChipText: {
    fontFamily: Platform.OS === 'web' ? '"Nunito", -apple-system, sans-serif' : 'System',
    fontSize: 12,
    fontWeight: '700',
    color: THEME.foreground,
  },
  quickActionChipTextContextual: {
    color: THEME.primary,
    fontWeight: '800',
  },

  // Input Area
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.borderSubtle,
    backgroundColor: THEME.paper,
  },
  inputInnerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6FC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.borderSubtle,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: THEME.foregroundDark,
    fontFamily: Platform.OS === 'web' ? '"DM Sans", -apple-system, sans-serif' : 'System',
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
      },
    }),
  },
  sendBtnDisabled: {
    backgroundColor: '#E5E1EE',
    opacity: 0.6,
  },
  sendBtnIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 2,
  },

  pressedBtn: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  pressedChip: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
