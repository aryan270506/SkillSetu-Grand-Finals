import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { CLAY_COLORS, CLAY_RADII, CLAY_SHADOWS, CLAY_FONTS } from './DesignTokens';

export default function RoundsModals({
  activeModal,
  setActiveModal,
  modalData,
  practiceAnswer,
  setPracticeAnswer,
  isRecording,
  onSimulateAudioRecord,
  onEvaluateAI,
  aiFeedback,
  isEvaluatingAI = false,
  evaluationError = null,
  practicingAppId,
  onStartPracticeSession,
}) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  if (!activeModal || !modalData) return null;

  return (
    <>
      {/* 1. AI PRACTICE SANDBOX MODAL */}
      {activeModal === 'practice' && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setActiveModal(null)}
        >
          <View
            style={styles.modalOverlay}
            // @ts-ignore
            className="clay-backdrop-fade"
            dataSet={{ backdropFade: 'true' }}
          >
            <View
              style={[
                styles.modalCard,
                CLAY_SHADOWS.cardHover,
                isSmallScreen && { width: '95%', padding: 18 },
              ]}
              // @ts-ignore
              className="clay-modal-enter"
              dataSet={{ modalEnter: 'true' }}
            >
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1, minWidth: 200 }}>
                  <View style={styles.domainTag}>
                    <Text style={styles.domainTagText}>AI PRACTICE SANDBOX</Text>
                  </View>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {modalData.question || modalData.title}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setActiveModal(null)}
                  style={styles.closeBtn}
                  // @ts-ignore
                  className="clay-close-btn"
                  dataSet={{ closeBtn: 'true' }}
                >
                  <Text style={styles.closeBtnText}>✕ Close</Text>
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ gap: 14 }}>
                {/* AI Prompt Box */}
                <View style={styles.questionPromptBox}>
                  <Text style={styles.aiPromptLabel}>🤖 AI INTERVIEWER PROMPT:</Text>
                  <Text style={styles.questionPromptText}>"{modalData.question || modalData.title}"</Text>
                  {modalData.skill && (
                    <Text style={styles.promptSkillTag}>Topic / Skill: {modalData.skill}</Text>
                  )}
                </View>

                {/* Speech Dictation / Input Bar */}
                <View style={styles.dictateRow}>
                  <Text style={styles.sectionSmallLabel}>YOUR STAR RESPONSE:</Text>
                  <Pressable
                    style={[
                      styles.recordBtn,
                      isRecording && { backgroundColor: CLAY_COLORS.danger },
                    ]}
                    dataSet={{
                      btnWhite: isRecording ? 'false' : 'true',
                      recordingPulse: isRecording ? 'true' : 'false',
                    }}
                    onPress={onSimulateAudioRecord}
                  >
                    <Text style={styles.recordBtnText}>
                      {isRecording ? '🔴 Listening... (Speaking)' : '🎙️ Dictate Answer'}
                    </Text>
                  </Pressable>
                </View>

                {/* Textarea */}
                <TextInput
                  style={styles.answerInput}
                  multiline
                  numberOfLines={5}
                  value={practiceAnswer}
                  onChangeText={setPracticeAnswer}
                  placeholder="Dictate or type your STAR response (Situation, Task, Action, Result)..."
                  placeholderTextColor={CLAY_COLORS.mutedLight}
                  editable={!isEvaluatingAI}
                />

                {/* Evaluation Button */}
                <Pressable
                  style={[
                    styles.primaryEvalBtn,
                    (!practiceAnswer.trim() || isEvaluatingAI) && { opacity: 0.6 },
                  ]}
                  // @ts-ignore
                  className="clay-btn-purple"
                  dataSet={{ btnPurple: 'true' }}
                  disabled={!practiceAnswer.trim() || isEvaluatingAI}
                  onPress={onEvaluateAI}
                >
                  {isEvaluatingAI ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryEvalBtnText}>Groq AI Engine Evaluating...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryEvalBtnText}>Evaluate with AI Engine ⚡</Text>
                  )}
                </Pressable>

                {/* Error Banner */}
                {evaluationError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxTitle}>⚠️ Evaluation Error</Text>
                    <Text style={styles.errorBoxText}>{evaluationError}</Text>
                  </View>
                )}

                {/* Real AI Feedback Card */}
                {aiFeedback && (
                  <View
                    style={[
                      styles.feedbackCard,
                      aiFeedback.score < 50 && styles.feedbackCardWarning,
                    ]}
                  >
                    <View style={styles.feedbackHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text
                          style={[
                            styles.feedbackVerdict,
                            aiFeedback.score < 50 && { color: CLAY_COLORS.danger },
                          ]}
                        >
                          {aiFeedback.verdict || 'Evaluation Complete'}
                        </Text>
                        {!aiFeedback.answered_question && (
                          <View style={styles.unansweredBadge}>
                            <Text style={styles.unansweredBadgeText}>Did Not Answer Question</Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.feedbackScoreBadge,
                          aiFeedback.score < 50 && { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.feedbackScoreText,
                            aiFeedback.score < 50 && { color: CLAY_COLORS.danger },
                          ]}
                        >
                          Score: {aiFeedback.score}%
                        </Text>
                      </View>
                    </View>

                    {/* 5-Dimension Metric Badges */}
                    {(aiFeedback.relevance !== undefined || aiFeedback.correctness !== undefined) && (
                      <View style={styles.dimensionRow}>
                        <Text style={styles.dimensionChip}>Relevance: {aiFeedback.relevance ?? 0}%</Text>
                        <Text style={styles.dimensionChip}>Correctness: {aiFeedback.correctness ?? 0}%</Text>
                        <Text style={styles.dimensionChip}>Completeness: {aiFeedback.completeness ?? 0}%</Text>
                        <Text style={styles.dimensionChip}>Tech Depth: {aiFeedback.technical_depth ?? 0}%</Text>
                      </View>
                    )}

                    {/* Feedback Summary */}
                    {aiFeedback.feedback && (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackSectionTitle}>Evaluation Summary:</Text>
                        <Text style={styles.feedbackSectionBody}>{aiFeedback.feedback}</Text>
                      </View>
                    )}

                    {/* Missing Points */}
                    {Array.isArray(aiFeedback.missing_points) && aiFeedback.missing_points.length > 0 && (
                      <View style={styles.feedbackSection}>
                        <Text style={[styles.feedbackSectionTitle, { color: CLAY_COLORS.danger }]}>
                          Key Missing Points:
                        </Text>
                        {aiFeedback.missing_points.map((mp, idx) => (
                          <Text key={idx} style={styles.missingPointItem}>
                            • {mp}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Strengths */}
                    {Array.isArray(aiFeedback.strengths) && aiFeedback.strengths.length > 0 && (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackSectionTitle}>Strengths Demonstrated:</Text>
                        {aiFeedback.strengths.map((str, idx) => (
                          <Text key={idx} style={styles.strengthItem}>
                            ✓ {str}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* STAR Tip */}
                    {aiFeedback.star_optimization_tip && (
                      <View style={styles.feedbackSection}>
                        <Text style={styles.feedbackSectionTitle}>STAR Optimization Tip:</Text>
                        <Text style={styles.feedbackSectionBody}>
                          {aiFeedback.star_optimization_tip}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* 2. APPLICATION & PIPELINE DETAILS MODAL */}
      {activeModal === 'details' && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setActiveModal(null)}
        >
          <View
            style={styles.modalOverlay}
            // @ts-ignore
            className="clay-backdrop-fade"
            dataSet={{ backdropFade: 'true' }}
          >
            <View
              style={[
                styles.modalCard,
                CLAY_SHADOWS.cardHover,
                isSmallScreen && { width: '95%', padding: 18 },
              ]}
              // @ts-ignore
              className="clay-modal-enter"
              dataSet={{ modalEnter: 'true' }}
            >
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1, minWidth: 200 }}>
                  <View style={styles.domainTag}>
                    <Text style={styles.domainTagText}>APPLICATION & ASSESSMENT DOSSIER</Text>
                  </View>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {modalData.company_name} — {modalData.internship_title}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setActiveModal(null)}
                  style={styles.closeBtn}
                  // @ts-ignore
                  className="clay-close-btn"
                  dataSet={{ closeBtn: 'true' }}
                >
                  <Text style={styles.closeBtnText}>✕ Close</Text>
                </Pressable>
              </View>

              <ScrollView style={{ flex: 1, marginTop: 14 }} contentContainerStyle={{ gap: 16 }}>
                {/* Status Hero Box */}
                <View style={styles.statusHeroBox}>
                  <View style={styles.statusHeroRow}>
                    <Text style={styles.statusHeroLabel}>
                      Application Status:{' '}
                      <Text style={{ fontWeight: '900', color: CLAY_COLORS.primary }}>
                        {modalData.application_status}
                      </Text>
                    </Text>
                    <Text style={styles.statusHeroSub}>{modalData.applied_at || 'Active'}</Text>
                  </View>
                  <View style={styles.statusHeroRow}>
                    <Text style={styles.statusHeroLabel}>
                      Pipeline Progress: {modalData.progress_percent || 0}%
                    </Text>
                    <Text style={styles.statusHeroSub}>
                      {modalData.completed_rounds_count || 0} of {modalData.total_rounds || modalData.rounds?.length || 0} Stages
                    </Text>
                  </View>
                </View>

                {/* Pipeline Breakdown */}
                <View style={{ gap: 8 }}>
                  <Text style={styles.subHeading}>Assessment Pipeline Stages</Text>
                  {modalData.rounds && modalData.rounds.length > 0 ? (
                    modalData.rounds.map((r, i) => {
                      const isCompleted = r.status === 'COMPLETED';
                      const isAvail = r.status === 'AVAILABLE' || r.status === 'IN_PROGRESS';

                      let badgeBg = CLAY_COLORS.primaryLight;
                      let badgeColor = CLAY_COLORS.primary;
                      if (isCompleted) {
                        badgeBg = CLAY_COLORS.successLight;
                        badgeColor = CLAY_COLORS.successDark;
                      } else if (r.status === 'SCHEDULED') {
                        badgeBg = CLAY_COLORS.warningLight;
                        badgeColor = CLAY_COLORS.warningDark;
                      }

                      return (
                        <View key={r.round_id || i} style={styles.stageCard} dataSet={{ subcardHover: 'true' }}>
                          <View style={styles.stageLeft}>
                            <View
                              style={[
                                styles.stageNumCircle,
                                isCompleted && { backgroundColor: CLAY_COLORS.successDark },
                                isAvail && { backgroundColor: CLAY_COLORS.primary },
                              ]}
                            >
                              <Text style={styles.stageNumText}>
                                {isCompleted ? '✓' : r.sequence || i + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.stageName}>{r.round_name}</Text>
                              <Text style={styles.stageSub}>
                                {r.duration_min ? `${r.duration_min} mins` : '30 mins'} •{' '}
                                {r.schedule_type || 'Flexible window'} •{' '}
                                {r.display_time || 'Sandbox Ready'}
                              </Text>
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <View style={[styles.stageBadge, { backgroundColor: badgeBg }]}>
                              <Text style={[styles.stageBadgeText, { color: badgeColor }]}>
                                {r.status}
                              </Text>
                            </View>
                            {r.score !== null && r.score !== undefined && (
                              <Text style={styles.stageScore}>Score: {r.score}%</Text>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>No assessment rounds configured for this position.</Text>
                  )}
                </View>

                {/* Target Required Skills */}
                <View style={{ gap: 8 }}>
                  <Text style={styles.subHeading}>Target Required Skills</Text>
                  <View style={styles.skillsRow}>
                    {(modalData.required_skills || []).map((sk, idx) => (
                      <View key={idx} style={styles.skillPill} dataSet={{ subcardHover: 'true' }}>
                        <Text style={styles.skillPillText}>{sk}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* STAR Tip Guide */}
                <View style={styles.starGuideBox}>
                  <Text style={styles.starGuideTitle}>TARGET ROUND PREPARATION GUIDE</Text>
                  <Text style={styles.starGuideText}>
                    Our AI evaluates candidates using STAR competency metrics (Situation, Task, Action, Result). Practice with our round-specific sandbox to calibrate your explanations and build confidence before the scheduled round.
                  </Text>
                </View>

                {/* Modal Action CTA */}
                {modalData.has_pipeline &&
                  (modalData.application_status || '').toUpperCase() !== 'REJECTED' && (
                    <Pressable
                      style={[
                        styles.primaryEvalBtn,
                        practicingAppId === modalData.application_id && { opacity: 0.7 },
                      ]}
                      // @ts-ignore
                      className="clay-btn-purple"
                      dataSet={{ btnPurple: 'true' }}
                      disabled={practicingAppId === modalData.application_id}
                      onPress={() => {
                        setActiveModal(null);
                        onStartPracticeSession({
                          applicationId: modalData.application_id,
                          internshipId: modalData.internship_id,
                          targetRound: modalData.active_round_key || 'aptitude',
                        });
                      }}
                    >
                      {practicingAppId === modalData.application_id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryEvalBtnText}>🎙️ Start Mock Practice Sandbox</Text>
                      )}
                    </Pressable>
                  )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 36, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '90%',
    maxWidth: 680,
    maxHeight: '88%',
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 2,
    borderColor: CLAY_COLORS.glassBorder,
    padding: 24,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  domainTag: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    alignSelf: 'flex-start',
  },
  domainTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  closeBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
  },
  closeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.heading,
  },
  questionPromptBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 14,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 6,
  },
  aiPromptLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  questionPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 19,
  },
  dictateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionSmallLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  recordBtn: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  recordBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  answerInput: {
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    borderRadius: CLAY_RADII.input,
    padding: 14,
    fontSize: 13,
    color: CLAY_COLORS.foregroundDark,
    backgroundColor: CLAY_COLORS.inputBg,
    minHeight: 110,
    textAlignVertical: 'top',
    fontFamily: CLAY_FONTS.body,
  },
  primaryEvalBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 12,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    justifyContent: 'center',
    ...CLAY_SHADOWS.buttonPrimary,
  },
  primaryEvalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  feedbackCard: {
    backgroundColor: CLAY_COLORS.successLight,
    padding: 16,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: 10,
  },
  feedbackCardWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  feedbackVerdict: {
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.successDark,
    fontFamily: CLAY_FONTS.heading,
  },
  unansweredBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  unansweredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.danger,
    fontFamily: CLAY_FONTS.heading,
  },
  feedbackScoreBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  feedbackScoreText: {
    fontSize: 13,
    fontWeight: '900',
    color: CLAY_COLORS.successDark,
    fontFamily: CLAY_FONTS.heading,
  },
  dimensionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 4,
  },
  dimensionChip: {
    fontSize: 10.5,
    fontWeight: '800',
    backgroundColor: '#FFFFFF',
    color: CLAY_COLORS.foregroundDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    fontFamily: CLAY_FONTS.heading,
  },
  feedbackSection: {
    gap: 4,
  },
  feedbackSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  feedbackSectionBody: {
    fontSize: 12,
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 18,
  },
  missingPointItem: {
    fontSize: 11.5,
    color: CLAY_COLORS.danger,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 17,
  },
  strengthItem: {
    fontSize: 11.5,
    color: CLAY_COLORS.successDark,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 17,
  },
  promptSkillTag: {
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.primaryDark,
    fontFamily: CLAY_FONTS.heading,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 4,
  },
  errorBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.danger,
    fontFamily: CLAY_FONTS.heading,
  },
  errorBoxText: {
    fontSize: 11.5,
    color: CLAY_COLORS.danger,
    fontFamily: CLAY_FONTS.body,
  },
  statusHeroBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 14,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 8,
  },
  statusHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusHeroLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  statusHeroSub: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  stageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 10,
  },
  stageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stageNumCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: CLAY_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageNumText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  stageName: {
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.heading,
  },
  stageSub: {
    fontSize: 11,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
    marginTop: 2,
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: CLAY_FONTS.heading,
  },
  stageScore: {
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    fontFamily: CLAY_FONTS.heading,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  skillPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
  starGuideBox: {
    backgroundColor: CLAY_COLORS.paper,
    padding: 14,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    gap: 6,
  },
  starGuideTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.6,
    fontFamily: CLAY_FONTS.heading,
  },
  starGuideText: {
    fontSize: 12,
    color: CLAY_COLORS.foregroundDark,
    fontFamily: CLAY_FONTS.body,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontFamily: CLAY_FONTS.body,
  },
});
