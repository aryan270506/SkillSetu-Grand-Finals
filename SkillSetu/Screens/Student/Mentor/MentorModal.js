import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import {
  sendMessageToMentor,
  fetchMentorHistory,
  resetMentorConversation,
  fetchSuggestedPrompts,
} from '../services/mentorService';
import { Avatar, Button, Chip, Icon, IconButton, Inset, Pill, ProgressBar, Row, Stack, Txt } from '../../../ui/components';
import { colors, font, radii, shadows, space, webOnly } from '../../../ui/theme';

import { tl } from '../../../i18n/tl';

const CONTEXT_ACTIONS = {
  Skills: { label: 'Explain my skill gaps', prompt: 'Explain my biggest skill gaps and how to close them.' },
  Opportunities: { label: 'Why these matches?', prompt: 'Why do I match these internships and how can I improve my match score?' },
  Resume: { label: 'Improve my ATS score', prompt: 'How can I optimize my resume ATS score for target roles?' },
  Applications: { label: 'Next career step', prompt: 'What is my highest-priority career action this week?' },
  Learning: { label: '30-day learning plan', prompt: 'Generate a prioritized 30-day learning roadmap for my target career.' },
  Rounds: { label: 'Interview prep', prompt: 'What should I prepare for my upcoming assessment rounds?' },
};
const DEFAULT_ACTION = { label: 'Analyse my profile', prompt: 'Analyze my current profile and tell me what skills to focus on.' };

const greeting = () => ({
  id: 1,
  sender: 'ai',
  text: "Hi! I'm your AI career mentor 👋\n\nI know your SkillSetu profile, verified skills and goals. Ask me about matching internships, skill gaps, learning roadmaps or your resume.",
  timestamp: 'Now',
});

// Personal AI career mentor — chat panel docked to the right on wide screens, full screen on phones.
export default function MentorModal({ visible, onClose, user, profileData, activeTab, onNavigate }) {
  const { width, height } = useWindowDimensions();
  const isPhone = width < 640;
  const [mentorInput, setMentorInput] = useState('');
  const [mentorConversationId, setMentorConversationId] = useState(null);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState([
    'What internships fit my profile?',
    'What skills am I missing for my target career?',
    'What should I learn next?',
    'How can I improve my resume ATS score?',
  ]);
  const [mentorMessages, setMentorMessages] = useState([greeting()]);
  const scrollRef = useRef(null);

  const studentName = profileData?.personalInfo?.fullName || user?.name || user?.full_name || 'Student';

  useEffect(() => {
    if (!visible || !user?.email) return;
    fetchSuggestedPrompts(user.email)
      .then((prompts) => {
        if (prompts && prompts.length > 0) setSuggestedPrompts(Array.from(new Set(prompts)));
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
  }, [visible, user?.email]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [mentorMessages, isMentorLoading]);

  const go = (tab) => {
    onClose();
    if (onNavigate && tab) onNavigate(tab);
  };

  const handleSendMessage = async (customPrompt = null) => {
    const textToSend = (typeof customPrompt === 'string' ? customPrompt : mentorInput).trim();
    if (!textToSend || isMentorLoading) return;
    setMentorInput('');
    setMentorMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: textToSend, timestamp: 'Now' }]);
    setIsMentorLoading(true);
    try {
      const aiResponse = await sendMessageToMentor(user?.email, textToSend, mentorConversationId);
      if (aiResponse) {
        if (aiResponse.conversation_id) setMentorConversationId(aiResponse.conversation_id);
        setMentorMessages((prev) => [...prev, aiResponse]);
      }
    } catch (err) {
      console.error('Error in mentor chat:', err);
      setMentorMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'ai', isError: true, text: 'Something went wrong while generating a response. Please check your connection and try again.', timestamp: 'Now' },
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
        { id: Date.now(), sender: 'ai', text: tl(
          'Hi {{studentName}}! Fresh session started ✨\n\nHow can I help with your roadmap, internships or skill gaps today?',
          {
            studentName: studentName
          }
        ), timestamp: 'Now' },
      ]);
      const prompts = await fetchSuggestedPrompts(user?.email);
      if (prompts && prompts.length > 0) setSuggestedPrompts(Array.from(new Set(prompts)));
    } catch (err) {
      console.error('Error resetting mentor session:', err);
    } finally {
      setIsMentorLoading(false);
    }
  };

  const contextual = CONTEXT_ACTIONS[activeTab] || DEFAULT_ACTION;
  const seen = new Set();
  const quickActions = [contextual, ...suggestedPrompts.map((p) => ({ label: p, prompt: p }))].filter((a) => {
    const k = a.prompt.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const renderText = (raw, isUser) =>
    String(raw || '')
      .split('\n')
      .map((line, i) =>
        !line.trim() ? (
          <View key={i} style={{ height: 6 }} />
        ) : (
          <Txt key={i} variant="body" color={isUser ? '#fff' : colors.text}>
            {line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <Txt key={j} variant="bodyStrong" color={isUser ? '#fff' : colors.ink}>{part.slice(2, -2)}</Txt>
              ) : (
                part
              )
            )}
          </Txt>
        )
      );

  const renderRich = (rich) => {
    if (!rich || !rich.type) return null;
    if (rich.type === 'internships_list') {
      const jobs = (rich.jobs || []).slice(0, 3);
      if (!jobs.length) return null;
      return (
        <Inset tone="info" style={styles.rich}>
          <Txt variant="overline" color={colors.skyInk}>Recommended for you</Txt>
          <Stack gap={6} style={{ marginTop: 6 }}>
            {jobs.map((job, i) => (
              <View key={i} style={styles.richRow}>
                <Avatar name={job.company} size={32} />
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  <Txt variant="small" weight={700} tone="ink" numberOfLines={1}>{job.title}</Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>{[job.company, job.location, job.stipend].filter(Boolean).join(' · ')}</Txt>
                </Stack>
                {job.match != null ? <Pill label={`${job.match}%`} tone="success" size="sm" /> : null}
              </View>
            ))}
          </Stack>
          <Button label={rich.buttonLabel || 'View opportunities'} size="sm" iconRight="ArrowRight" onPress={() => go(rich.actionTab || 'Opportunities')} style={{ marginTop: 10 }} />
        </Inset>
      );
    }
    if (rich.type === 'skill_card') {
      return (
        <Inset tone="accent" style={styles.rich}>
          <Row justify="space-between">
            <Txt variant="bodyStrong" tone="ink">{rich.title || rich.skillName}</Txt>
            {rich.provider ? <Pill label={rich.provider} size="sm" /> : null}
          </Row>
          {rich.percentage !== undefined ? <ProgressBar value={rich.percentage} tone="accent" style={{ marginTop: 8 }} /> : null}
          {rich.current !== undefined || rich.target !== undefined ? (
            <Txt variant="caption" tone="muted" style={{ marginTop: 6 }}>Current {rich.current ?? 0}% → target {rich.target ?? '—'}%</Txt>
          ) : null}
          {rich.duration ? <Txt variant="caption" tone="muted">Duration: {rich.duration}</Txt> : null}
          <Button label={rich.buttonLabel || 'Start learning'} size="sm" icon="BookOpen" onPress={() => go(rich.actionTab || 'Learning')} style={{ marginTop: 10 }} />
        </Inset>
      );
    }
    if (rich.type === 'resume_insights') {
      return (
        <Inset tone="success" style={styles.rich}>
          <Row justify="space-between">
            <Txt variant="bodyStrong" tone="ink">Resume insights</Txt>
            {rich.score != null ? <Pill label={`ATS ${rich.score}/100`} tone="success" size="sm" /> : null}
          </Row>
          {(rich.points || []).map((pt, i) => (
            <Txt key={i} variant="small" tone="default" style={{ marginTop: 4 }}>• {pt}</Txt>
          ))}
          <Button label={rich.buttonLabel || 'Open resume'} size="sm" icon="FileText" onPress={() => go(rich.actionTab || 'Resume')} style={{ marginTop: 10 }} />
        </Inset>
      );
    }
    if (rich.type === 'text_link') {
      return <Button label={rich.label} size="sm" variant="secondary" iconRight="ArrowRight" onPress={() => go(rich.actionTab || 'Dashboard')} style={{ marginTop: 6 }} />;
    }
    return null;
  };

  const panelWidth = isPhone ? width : Math.min(480, width - 32);

  return (
    <Modal visible={!!visible} transparent animationType={isPhone ? 'slide' : 'fade'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close mentor" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.panel,
            shadows.float,
            isPhone
              ? { width, height, top: 0, right: 0, borderRadius: 0 }
              : { width: panelWidth, top: 16, bottom: 16, right: 16 },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.botDisc}>
              <Icon name="Sparkles" size={20} color={colors.ink} />
            </View>
            <Stack gap={0} style={{ flex: 1 }}>
              <Txt variant="title" tone="inverse">AI career mentor</Txt>
              <Txt variant="caption" tone="inverseMuted">Knows your profile, skills and goals</Txt>
            </Stack>
            <IconButton icon="RefreshCw" variant="frame" onPress={handleResetConversation} accessibilityLabel="New conversation" />
            <IconButton icon="X" variant="frame" onPress={onClose} accessibilityLabel="Close" />
          </View>

          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.thread}>
            {mentorMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <View key={msg.id} style={[styles.msgRow, isUser ? { justifyContent: 'flex-end' } : null]}>
                  <View style={[styles.bubble, isUser ? styles.bubbleUser : msg.isError ? styles.bubbleError : styles.bubbleAi]}>
                    {renderText(msg.text, isUser)}
                    {!isUser ? renderRich(msg.richContent) : null}
                  </View>
                </View>
              );
            })}
            {isMentorLoading ? (
              <View style={styles.msgRow}>
                <View style={[styles.bubble, styles.bubbleAi, { flexDirection: 'row', gap: 6 }]}>
                  <Icon name="Sparkles" size={14} color={colors.lilacInk} />
                  <Txt variant="small" color={colors.lilacInk}>Thinking…</Txt>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.composer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
              {quickActions.slice(0, 6).map((a) => (
                <Chip key={a.prompt} label={a.label} icon="Sparkles" tone="accent" onPress={() => handleSendMessage(a.prompt)} />
              ))}
            </ScrollView>
            <Row gap={8}>
              <TextInput
                value={mentorInput}
                onChangeText={setMentorInput}
                onSubmitEditing={() => handleSendMessage()}
                placeholder="Ask about internships, skills, resume…"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, webOnly({ outlineStyle: 'none' })]}
                editable={!isMentorLoading}
              />
              <IconButton icon="Send" variant="dark" size={46} onPress={() => handleSendMessage()} disabled={!mentorInput.trim() || isMentorLoading} accessibilityLabel="Send" />
            </Row>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,11,12,0.35)',
  },
  panel: {
    position: 'absolute',
    backgroundColor: colors.canvas,
    borderRadius: radii.xxl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.frame,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  botDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thread: {
    padding: space.lg,
    gap: space.sm,
  },
  msgRow: {
    flexDirection: 'row',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 2,
  },
  bubbleAi: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 6,
  },
  bubbleUser: {
    backgroundColor: colors.ink,
    borderTopRightRadius: 6,
  },
  bubbleError: {
    backgroundColor: colors.dangerSoft,
    borderTopLeftRadius: 6,
  },
  rich: {
    marginTop: 10,
  },
  richRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radii.sm,
    padding: 8,
  },
  composer: {
    padding: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 18,
    ...font(500),
    fontSize: 14,
    color: colors.text,
  },
});
