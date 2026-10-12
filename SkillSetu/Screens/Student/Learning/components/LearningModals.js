import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  ClayBadge,
  ClayButton,
  ClayCard,
} from './LearningDesignTokens';

/**
 * 1. UPDATE COURSE PROGRESS MODAL
 */
export function CourseProgressModal({
  visible,
  course,
  progressPercent,
  onChangeProgress,
  onSave,
  onClose,
  isUpdating,
}) {
  if (!visible || !course) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, CLAY_SHADOWS.cardHover, { maxWidth: 500 }]}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1 }}>
              <ClayBadge label="COURSE TRACKER" variant="primary" size="small" />
              <Text style={styles.modalTitle}>Update Course Progress</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeIconBtn}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.modalSubtitle} numberOfLines={2}>
            {course.title}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Provider:</Text>
            <Text style={styles.metaVal}>
              {course.provider_name || course.provider?.toUpperCase()}
            </Text>
          </View>

          <View style={styles.sliderSection}>
            <View style={styles.sliderHeaderRow}>
              <Text style={styles.sliderLabel}>Completion:</Text>
              <Text style={styles.sliderValText}>{progressPercent}%</Text>
            </View>

            <View style={styles.sliderButtonsRow}>
              {[0, 25, 50, 75, 100].map((val) => {
                const isSelected = progressPercent === val;
                return (
                  <ClayButton
                    key={val}
                    style={[
                      styles.sliderValBtn,
                      isSelected && styles.sliderValBtnActive,
                    ]}
                    onPress={() => onChangeProgress(val)}
                  >
                    <Text
                      style={[
                        styles.sliderValBtnText,
                        isSelected && styles.sliderValBtnTextActive,
                      ]}
                    >
                      {val}%
                    </Text>
                  </ClayButton>
                );
              })}
            </View>
          </View>

          <View style={styles.modalActionsRow}>
            <ClayButton style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </ClayButton>
            <ClayButton
              style={styles.saveBtn}
              onPress={onSave}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save & Recalculate Evidence</Text>
              )}
            </ClayButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * 2. ASSIGNMENT / WORKFLOW CODE SANDBOX MODAL
 */
export function AssignmentSandboxModal({
  visible,
  assignment,
  sandboxCode,
  onChangeCode,
  onSubmit,
  onClose,
  isSubmitting,
  testResults,
}) {
  if (!visible || !assignment) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, CLAY_SHADOWS.cardHover, { maxWidth: 840, maxHeight: '92%' }]}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1 }}>
              <ClayBadge
                label={`${assignment.type || 'WORKFLOW'} • ${assignment.difficulty || 'INTERMEDIATE'}`}
                variant="primary"
                size="small"
              />
              <Text style={styles.modalTitle}>{assignment.title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeIconBtn}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            <Text style={styles.modalSubtitle}>
              {assignment.description || assignment.subtitle}
            </Text>

            {/* Instructions */}
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>
                📋 Implementation Guide & Acceptance Criteria
              </Text>
              <Text style={styles.instructionsText}>
                {assignment.instructions ||
                  'Implement the required function or module to satisfy the test specifications. Verify edge cases and error handling before submitting.'}
              </Text>
            </View>

            {/* Code Editor */}
            <View style={styles.codeEditorContainer}>
              <View style={styles.editorHeader}>
                <Text style={styles.editorTitle}>💻 Solution Sandbox Editor</Text>
                <Text style={styles.editorLang}>
                  {assignment.skill_name || 'JavaScript'}
                </Text>
              </View>
              <TextInput
                style={styles.codeTextInput}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                value={sandboxCode}
                onChangeText={onChangeCode}
              />
            </View>

            {/* Test Results */}
            {testResults && (
              <View style={styles.testResultBox}>
                <Text style={styles.testResultHeading}>
                  ✓ Automated Test Suite Passed (Score: {testResults.score}%)
                </Text>
                <Text style={styles.testResultSub}>
                  +{testResults.xp_earned || 50} XP Evidence Recorded into your student skill profile.
                </Text>
                <View style={{ marginTop: 8 }}>
                  {testResults.test_results?.map((tc, tcIdx) => (
                    <Text key={tcIdx} style={styles.testCaseItem}>
                      • {tc.name || tc.id}: PASSED
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActionsRow}>
            <ClayButton style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </ClayButton>
            <ClayButton
              style={styles.saveBtn}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>
                  Run Automated Tests & Submit ➔
                </Text>
              )}
            </ClayButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * 3. ALL ASSIGNMENTS MODAL
 */
export function AllAssignmentsModal({
  visible,
  assignments = [],
  filterDifficulty,
  onChangeDifficulty,
  onSelectAssignment,
  onClose,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, CLAY_SHADOWS.cardHover, { maxWidth: 880, maxHeight: '90%' }]}>
          <View style={styles.modalHeaderRow}>
            <View>
              <ClayBadge label="PRACTICAL WORKFLOWS" variant="primary" size="small" />
              <Text style={styles.modalTitle}>
                All Practical Workflows ({assignments.length})
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeIconBtn}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          {/* Difficulty Filter */}
          <View style={styles.filterRow}>
            {['All', 'Foundation', 'Intermediate', 'Advanced'].map((d) => (
              <Pressable
                key={d}
                style={[
                  styles.filterTabPill,
                  filterDifficulty.toLowerCase() === d.toLowerCase() && styles.filterTabPillActive,
                ]}
                onPress={() => onChangeDifficulty(d)}
              >
                <Text
                  style={[
                    styles.filterTabPillText,
                    filterDifficulty.toLowerCase() === d.toLowerCase() && styles.filterTabPillTextActive,
                  ]}
                >
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
            <View style={{ gap: 10 }}>
              {assignments.map((assign, idx) => (
                <View key={assign.id || idx} style={styles.modalListItem}>
                  <View style={styles.modalListNumBox}>
                    <Text style={styles.modalListNumText}>
                      {assign.num || `0${idx + 1}`}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalListTag}>
                      {assign.type} • {assign.difficulty}
                    </Text>
                    <Text style={styles.modalListTitle}>{assign.title}</Text>
                    <Text style={styles.modalListDesc} numberOfLines={2}>
                      {assign.description || assign.subtitle}
                    </Text>
                  </View>
                  <ClayButton
                    style={styles.modalListBtn}
                    onPress={() => onSelectAssignment(assign)}
                  >
                    <Text style={styles.modalListBtnText}>
                      {assign.action_label || 'Start Workflow ➔'}
                    </Text>
                  </ClayButton>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * 4. ASSESSMENT TEST RUNNER MODAL
 */
export function AssessmentRunnerModal({
  visible,
  assessment,
  questions = [],
  currentIndex = 0,
  userAnswers = {},
  timerSeconds = 2700,
  evaluationResult = null,
  onSelectAnswer,
  onPrevQuestion,
  onNextQuestion,
  onSubmit,
  onClose,
  isSubmitting,
}) {
  if (!visible || !assessment) return null;

  const currentQ = questions[currentIndex];
  const totalQ = questions.length;
  const currentQId = String(currentQ?.id || currentIndex + 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, CLAY_SHADOWS.cardHover, { maxWidth: 840, maxHeight: '92%' }]}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1 }}>
              <ClayBadge
                label={`${assessment.category || 'BENCHMARK'} • ${assessment.difficulty || 'INTERMEDIATE'}`}
                variant="primary"
                size="small"
              />
              <Text style={styles.modalTitle}>{assessment.title}</Text>
            </View>

            {!evaluationResult && (
              <View style={styles.timerBadge}>
                <Text style={styles.timerText}>
                  ⏱ {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>

          {!evaluationResult ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {questions.length > 0 ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.qCounter}>
                    Question {currentIndex + 1} of {totalQ}
                  </Text>
                  <Text style={styles.qTitle}>{currentQ?.question_text}</Text>

                  {/* Options */}
                  <View style={styles.optionsList}>
                    {Object.entries(currentQ?.options || {}).map(([optKey, optVal]) => {
                      const isSelected = userAnswers[currentQId] === optKey;
                      return (
                        <Pressable
                          key={optKey}
                          style={[
                            styles.optionCard,
                            isSelected && styles.optionCardActive,
                          ]}
                          onPress={() => onSelectAnswer(currentQId, optKey)}
                        >
                          <View
                            style={[
                              styles.optionKeyCircle,
                              isSelected && styles.optionKeyCircleActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionKeyText,
                                isSelected && styles.optionKeyTextActive,
                              ]}
                            >
                              {optKey}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.optionValText,
                              isSelected && styles.optionValTextActive,
                            ]}
                          >
                            {optVal}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <ActivityIndicator
                  size="large"
                  color={CLAY_COLORS.primary}
                  style={{ marginVertical: 40 }}
                />
              )}
            </ScrollView>
          ) : (
            /* Results View */
            <View style={styles.resultsContainer}>
              <View
                style={[
                  styles.resultBanner,
                  {
                    backgroundColor:
                      evaluationResult.score >= 70
                        ? CLAY_COLORS.emeraldLight
                        : CLAY_COLORS.amberLight,
                  },
                ]}
              >
                <Text style={{ fontSize: 36, marginBottom: 6 }}>
                  {evaluationResult.score >= 70 ? '🎉' : '📈'}
                </Text>
                <Text
                  style={[
                    styles.resultScoreText,
                    {
                      color:
                        evaluationResult.score >= 70
                          ? CLAY_COLORS.emeraldDark
                          : CLAY_COLORS.amberDark,
                    },
                  ]}
                >
                  Score: {evaluationResult.score}%
                </Text>
                <Text style={styles.resultStatusText}>
                  Status: {evaluationResult.assessment_status === 'VERIFIED' ? 'Passed (Mastery Verified)' : 'Needs Work'}
                </Text>
                <Text style={styles.resultSummaryText}>
                  Answered {evaluationResult.correct_answers} of {evaluationResult.total_questions} questions correctly.
                </Text>
              </View>

              <View style={styles.evidenceCommittedBox}>
                <Text style={styles.evidenceCommittedTitle}>
                  🛡️ Verified Skill Evidence Recorded
                </Text>
                <Text style={styles.evidenceCommittedDesc}>
                  Your score has been committed to PostgreSQL and factored into your career benchmark and readiness score.
                </Text>
              </View>
            </View>
          )}

          {/* Stepper / Action Controls */}
          <View style={styles.modalActionsRow}>
            {!evaluationResult ? (
              <>
                <ClayButton
                  style={[styles.cancelBtn, currentIndex === 0 && { opacity: 0.5 }]}
                  disabled={currentIndex === 0}
                  onPress={onPrevQuestion}
                >
                  <Text style={styles.cancelBtnText}>Previous</Text>
                </ClayButton>

                {currentIndex < totalQ - 1 ? (
                  <ClayButton style={styles.saveBtn} onPress={onNextQuestion}>
                    <Text style={styles.saveBtnText}>Next Question ➔</Text>
                  </ClayButton>
                ) : (
                  <ClayButton
                    style={[styles.saveBtn, { backgroundColor: CLAY_COLORS.emeraldDark }]}
                    onPress={onSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Submit & Evaluate ➔</Text>
                    )}
                  </ClayButton>
                )}
              </>
            ) : (
              <ClayButton
                style={[styles.saveBtn, { flex: 1 }]}
                onPress={onClose}
              >
                <Text style={styles.saveBtnText}>Return to Learning Hub</Text>
              </ClayButton>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * 5. ALL ASSESSMENTS MODAL
 */
export function AllAssessmentsModal({
  visible,
  assessments = [],
  activeTab,
  onChangeTab,
  onStartAssessment,
  onClose,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, CLAY_SHADOWS.cardHover, { maxWidth: 880, maxHeight: '90%' }]}>
          <View style={styles.modalHeaderRow}>
            <View>
              <ClayBadge label="EVALUATION PORTAL" variant="primary" size="small" />
              <Text style={styles.modalTitle}>
                Certified Benchmarks & Diagnostics
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeIconBtn}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          {/* Status Tabs */}
          <View style={styles.filterRow}>
            {['All', 'Available', 'Completed', 'Locked'].map((tab) => (
              <Pressable
                key={tab}
                style={[
                  styles.filterTabPill,
                  activeTab.toLowerCase() === tab.toLowerCase() && styles.filterTabPillActive,
                ]}
                onPress={() => onChangeTab(tab)}
              >
                <Text
                  style={[
                    styles.filterTabPillText,
                    activeTab.toLowerCase() === tab.toLowerCase() && styles.filterTabPillTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
            <View style={{ gap: 12 }}>
              {assessments.map((test, idx) => (
                <View key={test.id || idx} style={styles.assessmentModalCard}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalListTag}>
                      {test.type} • {test.difficulty}
                    </Text>
                    {test.is_completed && (
                      <ClayBadge label="Completed ✓" variant="emerald" size="small" />
                    )}
                  </View>

                  <Text style={styles.modalListTitle}>{test.title}</Text>
                  <Text style={styles.modalListDesc}>{test.meta}</Text>
                  <Text style={styles.modalListStatus}>{test.status_badge}</Text>

                  {/* Prerequisites info if locked */}
                  {test.is_locked && test.prerequisites && test.prerequisites.length > 0 && (
                    <View style={styles.prereqBox}>
                      <Text style={styles.prereqHeading}>PREREQUISITES REQUIRED:</Text>
                      {test.prerequisites.map((pr, pIdx) => (
                        <Text key={pIdx} style={styles.prereqItem}>
                          • {pr.title} (Requires ≥{pr.requiredScore}%, Current: {pr.currentScore}%)
                        </Text>
                      ))}
                    </View>
                  )}

                  <ClayButton
                    style={[
                      styles.modalListBtn,
                      test.is_locked && styles.actionBtnLocked,
                    ]}
                    onPress={() => onStartAssessment(test)}
                  >
                    <Text
                      style={[
                        styles.modalListBtnText,
                        test.is_locked && styles.actionBtnTextLocked,
                      ]}
                    >
                      {test.action}
                    </Text>
                  </ClayButton>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * 6. CAPSTONE PROJECT SPECS & CONNECTED REPOSITORY SUBMISSION MODAL
 */
export function ProjectSpecsModal({
  visible,
  project,
  connectedGitHubAccount,
  availableRepos = [],
  selectedRepo,
  onSelectRepo,
  onSubmitRepo,
  onClose,
  onNavigateToProfile,
  isLoadingRepos,
  isSubmitting,
  successMsg,
}) {
  if (!visible || !project) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, CLAY_SHADOWS.cardHover, { maxWidth: 860, maxHeight: '92%' }]}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flex: 1 }}>
              <ClayBadge
                label="PRODUCTION CAPSTONE • 200 XP"
                variant="primary"
                size="small"
              />
              <Text style={styles.modalTitle}>{project.title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeIconBtn}>
              <Text style={styles.closeIconText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
            {successMsg ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>✓ {successMsg}</Text>
              </View>
            ) : null}

            <Text style={styles.modalSubtitle}>{project.desc}</Text>

            {/* Skills chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 10 }}>
              {project.skills?.map((s, sIdx) => (
                <ClayBadge key={sIdx} label={s} variant="primary" size="small" />
              ))}
            </View>

            {/* System Architecture */}
            {project.specs?.architecture && (
              <View style={styles.instructionsBox}>
                <Text style={styles.instructionsTitle}>
                  🏛️ System Architecture & Stack
                </Text>
                <Text style={styles.instructionsText}>
                  {project.specs.architecture}
                </Text>
              </View>
            )}

            {/* Milestones list */}
            {project.milestones && (
              <View style={{ marginVertical: 10 }}>
                <Text style={styles.sectionSubHeading}>
                  🚩 Project Deliverables & Milestones
                </Text>
                {project.milestones.map((m, mIdx) => (
                  <View key={mIdx} style={styles.milestoneSpecCard}>
                    <Text style={styles.milestoneSpecNum}>
                      Milestone {m.milestone}: {m.title}
                    </Text>
                    <Text style={styles.milestoneSpecDeliverable}>
                      {m.deliverable}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* GitHub Repository Submission Section */}
            <View style={styles.gitHubSectionBox}>
              <Text style={styles.instructionsTitle}>
                🚀 Submit Project Repository Deliverables
              </Text>

              {/* Account Status Card */}
              <View
                style={[
                  styles.githubAccountRow,
                  {
                    backgroundColor: connectedGitHubAccount
                      ? CLAY_COLORS.emeraldLight
                      : CLAY_COLORS.amberLight,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>🐙</Text>
                  <View>
                    <Text
                      style={[
                        styles.githubStatusLabel,
                        {
                          color: connectedGitHubAccount
                            ? CLAY_COLORS.emeraldDark
                            : CLAY_COLORS.amberDark,
                        },
                      ]}
                    >
                      {connectedGitHubAccount ? 'CONNECTED GITHUB ACCOUNT' : 'GITHUB NOT CONNECTED'}
                    </Text>
                    <Text style={styles.githubUsername}>
                      {connectedGitHubAccount ? `@${connectedGitHubAccount.username}` : 'No account linked'}
                    </Text>
                  </View>
                </View>

                {connectedGitHubAccount ? (
                  <ClayBadge label="Verified ✓" variant="emerald" size="small" />
                ) : (
                  <ClayButton
                    style={styles.connectProfileBtn}
                    onPress={onNavigateToProfile}
                  >
                    <Text style={styles.connectProfileBtnText}>Connect in Profile ➔</Text>
                  </ClayButton>
                )}
              </View>

              {isLoadingRepos ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={CLAY_COLORS.primary} />
                  <Text style={{ fontSize: 12, color: CLAY_COLORS.muted, marginTop: 6 }}>
                    Fetching your connected GitHub repositories...
                  </Text>
                </View>
              ) : availableRepos && availableRepos.length > 0 ? (
                <View style={{ gap: 8, marginVertical: 10 }}>
                  <Text style={styles.repoListLabel}>
                    AVAILABLE REPOSITORIES ({availableRepos.length})
                  </Text>
                  {availableRepos.map((repo) => {
                    const isSelected = selectedRepo && (selectedRepo.id === repo.id || selectedRepo.name === repo.name);
                    const isAlreadySubmitted = repo.already_submitted;

                    return (
                      <Pressable
                        key={repo.id || repo.name}
                        style={[
                          styles.repoCard,
                          isSelected && styles.repoCardSelected,
                          isAlreadySubmitted && { opacity: 0.7 },
                        ]}
                        onPress={() => {
                          if (!isAlreadySubmitted) {
                            onSelectRepo(repo);
                          }
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.repoName}>📁 {repo.name}</Text>
                            {repo.language ? (
                              <ClayBadge label={repo.language} variant="muted" size="small" />
                            ) : null}
                          </View>
                          <Text style={styles.repoDesc} numberOfLines={2}>
                            {repo.description}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.repoRadio,
                            isSelected && styles.repoRadioSelected,
                          ]}
                        >
                          {isSelected ? <View style={styles.repoRadioInner} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noReposBox}>
                  <Text style={{ fontSize: 12, color: CLAY_COLORS.muted }}>
                    {connectedGitHubAccount ? 'No repositories found in your GitHub account.' : 'Connect your GitHub account in Profile to select repositories.'}
                  </Text>
                </View>
              )}

              <ClayButton
                style={[
                  styles.submitRepoBtn,
                  (!selectedRepo || isSubmitting) && { opacity: 0.6 },
                ]}
                onPress={onSubmitRepo}
                disabled={!selectedRepo || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitRepoBtnText}>
                    {selectedRepo ? `Submit "${selectedRepo.name}" for Verification (+200 XP)` : 'Select a Repository to Submit'}
                  </Text>
                )}
              </ClayButton>
            </View>
          </ScrollView>

          <View style={styles.modalActionsRow}>
            <ClayButton style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </ClayButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.card,
    padding: 24,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  closeIconBtn: {
    padding: 6,
  },
  closeIconText: {
    fontSize: 18,
    color: CLAY_COLORS.muted,
  },
  modalTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginTop: 4,
  },
  modalSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  metaLabel: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  metaVal: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  sliderSection: {
    marginVertical: 12,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  sliderValText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  sliderButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderValBtn: {
    flex: 1,
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  sliderValBtnActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  sliderValBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  sliderValBtnTextActive: {
    color: '#FFFFFF',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  cancelBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  saveBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
  },
  saveBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  instructionsBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 12,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    marginBottom: 12,
  },
  instructionsTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 4,
  },
  instructionsText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 17,
  },
  codeEditorContainer: {
    backgroundColor: '#0F172A',
    borderRadius: CLAY_RADII.cardSmall,
    overflow: 'hidden',
    marginBottom: 12,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editorTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  editorLang: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  codeTextInput: {
    padding: 12,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#E2E8F0',
    minHeight: 140,
  },
  testResultBox: {
    backgroundColor: CLAY_COLORS.emeraldLight,
    borderRadius: CLAY_RADII.cardSmall,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  testResultHeading: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.emeraldDark,
  },
  testResultSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.emeraldDark,
    marginTop: 2,
  },
  testCaseItem: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.emeraldDark,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
    flexWrap: 'wrap',
  },
  filterTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CLAY_RADII.pill,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  filterTabPillActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  filterTabPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  filterTabPillTextActive: {
    color: '#FFFFFF',
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 12,
    gap: 12,
  },
  modalListNumBox: {
    width: 34,
    height: 34,
    borderRadius: CLAY_RADII.button,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalListNumText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  modalListTag: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  modalListTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginVertical: 2,
  },
  modalListDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  modalListBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
  },
  modalListBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timerBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.pill,
  },
  timerText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  qCounter: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    marginBottom: 4,
  },
  qTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    lineHeight: 22,
    marginBottom: 14,
  },
  optionsList: {
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: CLAY_RADII.button,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    gap: 12,
  },
  optionCardActive: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderColor: CLAY_COLORS.primary,
  },
  optionKeyCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  optionKeyCircleActive: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  optionKeyText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  optionKeyTextActive: {
    color: '#FFFFFF',
  },
  optionValText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.foreground,
    flex: 1,
  },
  optionValTextActive: {
    fontWeight: '700',
    color: CLAY_COLORS.primaryDark,
  },
  resultsContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resultBanner: {
    width: '100%',
    padding: 20,
    borderRadius: CLAY_RADII.cardMedium,
    alignItems: 'center',
    marginBottom: 14,
  },
  resultScoreText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 4,
  },
  resultStatusText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 4,
  },
  resultSummaryText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  evidenceCommittedBox: {
    width: '100%',
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 14,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  evidenceCommittedTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 4,
  },
  evidenceCommittedDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    lineHeight: 16,
  },
  assessmentModalCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 14,
  },
  modalListStatus: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
    marginBottom: 10,
  },
  prereqBox: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: CLAY_RADII.cardSmall,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  prereqHeading: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
    marginBottom: 4,
  },
  prereqItem: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    lineHeight: 15,
  },
  successBanner: {
    backgroundColor: CLAY_COLORS.emeraldLight,
    borderRadius: CLAY_RADII.cardSmall,
    padding: 10,
    marginBottom: 10,
  },
  successBannerText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.emeraldDark,
  },
  sectionSubHeading: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
    marginBottom: 6,
  },
  milestoneSpecCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 10,
    borderRadius: CLAY_RADII.cardSmall,
    marginBottom: 6,
  },
  milestoneSpecNum: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  milestoneSpecDeliverable: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  gitHubSectionBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 14,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    marginTop: 10,
  },
  githubAccountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: CLAY_RADII.button,
    marginBottom: 10,
  },
  githubStatusLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
  },
  githubUsername: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  connectProfileBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: CLAY_RADII.button,
  },
  connectProfileBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  repoListLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  repoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: CLAY_RADII.button,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
  },
  repoCardSelected: {
    borderColor: CLAY_COLORS.primary,
    borderWidth: 2,
    backgroundColor: CLAY_COLORS.primaryLight,
  },
  repoName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  repoDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  repoRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: CLAY_COLORS.mutedLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repoRadioSelected: {
    borderColor: CLAY_COLORS.primary,
    backgroundColor: CLAY_COLORS.primary,
  },
  repoRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  noReposBox: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    marginVertical: 10,
  },
  submitRepoBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    marginTop: 10,
  },
  submitRepoBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
