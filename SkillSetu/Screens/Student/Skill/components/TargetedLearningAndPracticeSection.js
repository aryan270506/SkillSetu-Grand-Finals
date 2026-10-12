import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, ClayButton } from './DesignTokens';

export default function TargetedLearningAndPracticeSection({
  learningPathData,
  topGapSubject,
  studentEmail,
  activeCareerName,
  selectedGapSkillName,
  isStartingModule,
  onStartModule,
  onNavigate,
  onRefreshSkillData,
}) {
  // Adaptive Challenge State
  const [challenge, setChallenge] = useState(null);
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(false);
  const [code, setCode] = useState('');
  const [validationError, setValidationError] = useState('');
  
  // Execution & Evaluation State
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [isSolved, setIsSolved] = useState(false);
  
  // Hint State
  const [hintLevel, setHintLevel] = useState(0);
  const [hintData, setHintData] = useState(null);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [showHintBox, setShowHintBox] = useState(false);
  const [hintError, setHintError] = useState('');

  // Active view tab inside challenge box: 'problem' | 'examples' | 'tests'
  const [activeTab, setActiveTab] = useState('problem');

  const effectiveEmail = studentEmail || 'canonical_test_student@skillsetu.ai';
  const effectiveSkill = selectedGapSkillName || topGapSubject || 'SQL Query Optimization';

  // 1. Fetch Current Adaptive Challenge for Student
  const fetchAdaptiveChallenge = async (forceNew = false) => {
    setIsLoadingChallenge(true);
    setExecutionResult(null);
    setIsSolved(false);
    setHintData(null);
    setHintLevel(0);
    setShowHintBox(false);
    setValidationError('');
    setHintError('');
    setActiveTab('problem');

    try {
      const emailQ = encodeURIComponent(effectiveEmail);
      const careerQ = encodeURIComponent(activeCareerName || 'Software Development Engineer');
      const skillQ = encodeURIComponent(effectiveSkill);
      const forceQ = forceNew ? '&force_new=true' : '';

      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/student/adaptive-challenge/current?email=${emailQ}&target_career=${careerQ}&gap_skill=${skillQ}${forceQ}`
      );
      const json = await res.json();
      if (res.ok && json.status === 'success' && json.data) {
        setChallenge(json.data);
        // Ensure SQL is always clean empty string, Python/JS receives safe boilerplate
        setCode(json.data.starter_code || '');
      }
    } catch (err) {
      console.error('Error fetching adaptive challenge:', err);
    } finally {
      setIsLoadingChallenge(false);
    }
  };

  useEffect(() => {
    fetchAdaptiveChallenge(false);
  }, [effectiveSkill, activeCareerName, studentEmail]);

  // 2. Handle Run Code (Sandbox Sandbox Check without formal completion)
  const handleRunCode = async () => {
    if (!challenge || isRunning || isSubmitting) return;

    if (!code || !code.trim()) {
      setValidationError('Write your solution before running the code.');
      return;
    }
    setValidationError('');
    setIsRunning(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/student/adaptive-challenge/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: effectiveEmail,
          challenge_id: challenge.challenge_id,
          code: code,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'success' && json.data) {
        setExecutionResult(json.data);
        setActiveTab('tests');
      }
    } catch (err) {
      console.error('Error running code in sandbox:', err);
      setValidationError('Code execution service error. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  // 3. Handle Submit Solution (Formal Evaluation & Verification)
  const handleSubmitCode = async () => {
    if (!challenge || isRunning || isSubmitting) return;

    if (!code || !code.trim()) {
      setValidationError('Write your solution before running the code.');
      return;
    }
    setValidationError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/student/adaptive-challenge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: effectiveEmail,
          challenge_id: challenge.challenge_id,
          code: code,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'success' && json.data) {
        setExecutionResult(json.data);
        setActiveTab('tests');

        if (json.data.passed && json.data.is_completed) {
          setIsSolved(true);
          if (onRefreshSkillData) {
            onRefreshSkillData();
          }
        }
      }
    } catch (err) {
      console.error('Error submitting code:', err);
      setValidationError('Submission evaluation error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Handle Dynamic Progressive Hint Request
  const handleRequestHint = async () => {
    if (!challenge || isLoadingHint) return;
    setIsLoadingHint(true);
    setHintError('');
    const nextLevel = hintLevel + 1;

    try {
      const failedTests = executionResult?.test_results?.filter((t) => !t.passed) || null;
      const res = await fetch('http://127.0.0.1:8000/api/v1/student/adaptive-challenge/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challenge.challenge_id,
          hint_level: nextLevel,
          code: code || null,
          compile_error: executionResult?.compile_error || null,
          runtime_error: executionResult?.runtime_error || null,
          failed_tests: failedTests,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === 'success' && json.data) {
        setHintData(json.data);
        setHintLevel(json.data.hint_level);
        setShowHintBox(true);
      } else {
        setHintError('Hint temporarily unavailable. Please try again.');
        setShowHintBox(true);
      }
    } catch (err) {
      console.error('Error requesting hint:', err);
      setHintError('Hint temporarily unavailable. Please try again.');
      setShowHintBox(true);
    } finally {
      setIsLoadingHint(false);
    }
  };

  // 5. Handle Advance to Next Adaptive Question
  const handleNextChallenge = () => {
    fetchAdaptiveChallenge(true);
  };

  // 6. Handle Reset Code
  const handleResetCode = () => {
    setCode(challenge?.starter_code || '');
    setExecutionResult(null);
    setValidationError('');
    setShowHintBox(false);
    setActiveTab('problem');
  };

  // Line numbers calculation for the editor
  const lineCount = (code.match(/\n/g) || []).length + 1;
  const lineNumbers = Array.from({ length: Math.max(8, lineCount) }, (_, i) => i + 1);

  const placeholderText =
    challenge?.language === 'sql'
      ? 'Write your SQL query here...'
      : challenge?.language === 'python'
      ? 'Write your Python solution here...'
      : 'Write your code solution here...';

  const modules = learningPathData?.modules || [
    { title: `High-Throughput Concurrency in ${effectiveSkill}`, progress: 80, duration: '4.5 hrs', provider: 'NPTEL' },
    { title: 'Kubernetes Pod Security & Network Policies', progress: 50, duration: '3.0 hrs', provider: 'SWAYAM' },
  ];

  return (
    <View
      style={[
        styles.sectionCard,
        Platform.OS === 'web' && {
          animation: 'clay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 600ms both',
        },
      ]}
      className="clay-interactive-card"
    >
      {/* Section Header Tag */}
      <View style={styles.tagRow}>
        <View style={styles.telemetryBadge}>
          <Text style={styles.telemetryBadgeText}>CURRICULUM & ADAPTIVE PRACTICE</Text>
        </View>
        <Text style={styles.curriculumSubText}>
          Personalized curriculum and real-time adaptive coding practice aligned with your {activeCareerName || 'target career'} skill gaps.
        </Text>
      </View>

      {/* 2-Column Bento Grid */}
      <View style={styles.curriculumGrid}>
        {/* ========================================================== */}
        {/* LEFT COLUMN: TARGETED LEARNING TRACKS                      */}
        {/* ========================================================== */}
        <View style={styles.learningColumn}>
          <View style={styles.learningHeader}>
            <View>
              <Text style={styles.colTitle}>Targeted Learning Tracks</Text>
              <Text style={styles.colSubtitle}>
                Calibrated modules to systematically close {effectiveSkill} gaps.
              </Text>
            </View>
            <View style={styles.targetPlanPill}>
              <Text style={styles.targetPlanPillText}>University Guided</Text>
            </View>
          </View>

          {/* Modules List */}
          <View style={styles.modulesList}>
            {modules.map((mod, idx) => {
              const progressPct = mod.progress_percent ?? mod.progress ?? 0;
              const isActive = mod.status === 'ACTIVE' || idx === 0;

              return (
                <View key={idx} style={styles.moduleItem}>
                  <View style={styles.moduleTopRow}>
                    <Text style={styles.moduleName} numberOfLines={1}>{mod.title}</Text>
                    <Text style={styles.modulePercentText}>Course Learning: {progressPct}%</Text>
                  </View>

                  <View style={styles.moduleTrack}>
                    <View
                      style={[
                        styles.moduleFill,
                        {
                          width: `${progressPct}%`,
                          backgroundColor: CLAY_COLORS.primary,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.moduleBottomRow}>
                    <Text style={styles.moduleMetaText}>
                      ⏱ {mod.duration || '3.5 hrs'} • {mod.provider || 'ESCO Calibrated'}
                    </Text>

                    {isActive && onStartModule && (
                      <ClayButton
                        style={styles.advanceModuleBtn}
                        className="clay-interactive-btn"
                        onPress={onStartModule}
                        disabled={isStartingModule}
                      >
                        {isStartingModule ? (
                          <ActivityIndicator size="small" color={CLAY_COLORS.paper} />
                        ) : (
                          <Text style={styles.advanceModuleBtnText}>Advance Module ➔</Text>
                        )}
                      </ClayButton>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Explore All Button */}
          <ClayButton
            style={styles.exploreAllBtn}
            className="clay-interactive-btn"
            onPress={() => {
              if (onNavigate) onNavigate('Learning');
            }}
          >
            <Text style={styles.exploreAllBtnText}>Explore All University-Guided Learning Paths ➔</Text>
          </ClayButton>
        </View>

        {/* ========================================================== */}
        {/* RIGHT COLUMN: REAL-TIME ADAPTIVE CODING ENGINE             */}
        {/* ========================================================== */}
        <View style={styles.drillColumn}>
          {isLoadingChallenge ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={CLAY_COLORS.primary} />
              <Text style={styles.loadingText}>Synthesizing Adaptive Challenge for {effectiveSkill}...</Text>
            </View>
          ) : challenge ? (
            <>
              {/* Header Badges Row */}
              <View style={styles.drillHeader}>
                <View style={styles.drillBadgeRow}>
                  <View style={styles.drillBadge}>
                    <Text style={styles.drillBadgeText}>⚡ ADAPTIVE CODING CHALLENGE</Text>
                  </View>
                  <View
                    style={[
                      styles.diffBadge,
                      {
                        backgroundColor:
                          challenge.difficulty === 'advanced'
                            ? CLAY_COLORS.dangerLight
                            : challenge.difficulty === 'beginner'
                            ? CLAY_COLORS.successLight
                            : CLAY_COLORS.skyLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.diffBadgeText,
                        {
                          color:
                            challenge.difficulty === 'advanced'
                              ? CLAY_COLORS.danger
                              : challenge.difficulty === 'beginner'
                              ? CLAY_COLORS.successDark
                              : CLAY_COLORS.skyDark,
                        },
                      ]}
                    >
                      {challenge.difficulty?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.xpText}>+{challenge.xp_reward || 35} XP • {challenge.language?.toUpperCase()}</Text>
              </View>

              {/* Challenge Title */}
              <Text style={styles.drillTitle}>{challenge.title}</Text>

              {/* Why This Challenge Context Box */}
              <View style={styles.whyBox}>
                <Text style={styles.whyIcon}>🎯</Text>
                <Text style={styles.whyText}>
                  <Text style={{ fontWeight: '800', color: CLAY_COLORS.primaryDark }}>Why this challenge? </Text>
                  {challenge.why_this_challenge}
                </Text>
              </View>

              {/* Navigation Tabs: Problem | Examples | Test Results */}
              <View style={styles.subTabsRow}>
                <Pressable
                  style={[styles.subTabBtn, activeTab === 'problem' && styles.subTabBtnActive]}
                  onPress={() => setActiveTab('problem')}
                >
                  <Text style={[styles.subTabText, activeTab === 'problem' && styles.subTabTextActive]}>Problem & Rules</Text>
                </Pressable>

                <Pressable
                  style={[styles.subTabBtn, activeTab === 'examples' && styles.subTabBtnActive]}
                  onPress={() => setActiveTab('examples')}
                >
                  <Text style={[styles.subTabText, activeTab === 'examples' && styles.subTabTextActive]}>
                    Examples ({challenge.examples?.length || 0})
                  </Text>
                </Pressable>

                {executionResult && (
                  <Pressable
                    style={[styles.subTabBtn, activeTab === 'tests' && styles.subTabBtnActive]}
                    onPress={() => setActiveTab('tests')}
                  >
                    <Text style={[styles.subTabText, activeTab === 'tests' && styles.subTabTextActive]}>
                      Test Results ({executionResult.passed_tests}/{executionResult.total_tests})
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Tab 1: Problem Statement & Constraints */}
              {activeTab === 'problem' && (
                <View style={styles.tabContentBox}>
                  <Text style={styles.problemDescText}>{challenge.description}</Text>
                  {challenge.constraints && challenge.constraints.length > 0 && (
                    <View style={styles.constraintsBox}>
                      <Text style={styles.constraintsHeader}>Constraints:</Text>
                      {challenge.constraints.map((c, i) => (
                        <Text key={i} style={styles.constraintItem}>• {c}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Tab 2: Examples */}
              {activeTab === 'examples' && (
                <View style={styles.tabContentBox}>
                  {challenge.examples && challenge.examples.length > 0 ? (
                    challenge.examples.map((ex, i) => (
                      <View key={i} style={styles.exampleItem}>
                        <Text style={styles.exampleTitle}>Example {i + 1}:</Text>
                        <Text style={styles.exampleIo}>Input: <Text style={styles.exampleCode}>{ex.input}</Text></Text>
                        <Text style={styles.exampleIo}>Output: <Text style={styles.exampleCode}>{ex.output}</Text></Text>
                        {ex.explanation && <Text style={styles.exampleExpl}>{ex.explanation}</Text>}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyTabText}>No examples specified.</Text>
                  )}
                </View>
              )}

              {/* Tab 3: Test Results Console */}
              {activeTab === 'tests' && (
                <View style={styles.tabContentBox}>
                  {executionResult ? (
                    <View style={styles.executionResultBox}>
                      {/* Summary Banner */}
                      <View
                        style={[
                          styles.resultBanner,
                          executionResult.passed ? styles.resultBannerPassed : styles.resultBannerFailed,
                        ]}
                      >
                        <Text style={styles.resultBannerIcon}>{executionResult.passed ? '✓' : '❌'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.resultBannerTitle,
                              { color: executionResult.passed ? CLAY_COLORS.successDark : CLAY_COLORS.danger },
                            ]}
                          >
                            {executionResult.passed
                              ? 'All Test Cases Passed!'
                              : `${executionResult.failed_tests} of ${executionResult.total_tests} Tests Failed`}
                          </Text>
                          <Text style={styles.resultBannerSub}>
                            Execution Time: {executionResult.execution_time_ms}ms • Attempt #{executionResult.attempt_number}
                          </Text>
                        </View>
                      </View>

                      {/* Error Stack Trace if exists */}
                      {(executionResult.compile_error || executionResult.runtime_error) && (
                        <View style={styles.errorBox}>
                          <Text style={styles.errorTitle}>Error Diagnostic Trace:</Text>
                          <Text style={styles.errorText}>
                            {executionResult.compile_error || executionResult.runtime_error}
                          </Text>
                        </View>
                      )}

                      {/* Diagnostic Guidance Feedback */}
                      {executionResult.diagnostic_feedback && (
                        <View style={styles.feedbackBox}>
                          <Text style={styles.feedbackIcon}>💡</Text>
                          <Text style={styles.feedbackText}>{executionResult.diagnostic_feedback}</Text>
                        </View>
                      )}

                      {/* Proactive Hint Callout Banner on Failure */}
                      {!executionResult.passed && (
                        <Pressable
                          style={styles.hintSuggestionBanner}
                          onPress={() => {
                            setShowHintBox(true);
                            if (!hintData) {
                              handleRequestHint();
                            }
                          }}
                        >
                          <Text style={styles.hintSuggestionIcon}>💡</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.hintSuggestionTitle}>Hint Available</Text>
                            <Text style={styles.hintSuggestionSub}>
                              Get a tailored AI hint based on your current code and failed tests.
                            </Text>
                          </View>
                          <Text style={styles.hintSuggestionAction}>View Hint ➔</Text>
                        </Pressable>
                      )}

                      {/* Individual Test Cases List */}
                      <View style={styles.testsList}>
                        {executionResult.test_results?.map((tr, idx) => (
                          <View
                            key={idx}
                            style={[styles.testItem, tr.passed ? styles.testItemPassed : styles.testItemFailed]}
                          >
                            <View style={styles.testItemHeader}>
                              <Text
                                style={[
                                  styles.testStatusTag,
                                  { color: tr.passed ? CLAY_COLORS.successDark : CLAY_COLORS.danger },
                                ]}
                              >
                                {tr.passed ? '✓ PASSED' : '✕ FAILED'}
                              </Text>
                              <Text style={styles.testDescText}>{tr.description}</Text>
                            </View>
                            {!tr.passed && (
                              <View style={styles.testDetails}>
                                <Text style={styles.testDetailLine}>
                                  Expected: <Text style={styles.testCodeVal}>{String(tr.expected)}</Text>
                                </Text>
                                <Text style={styles.testDetailLine}>
                                  Received: <Text style={[styles.testCodeVal, { color: CLAY_COLORS.danger }]}>{String(tr.actual)}</Text>
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noRunYetBox}>
                      <Text style={styles.noRunIcon}>▶</Text>
                      <Text style={styles.noRunText}>Click "Run Code" or "Submit Solution" below to execute tests in the cloud sandbox.</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Code Editor Container */}
              <View style={styles.codeEditorContainer}>
                {/* Editor Header Bar */}
                <View style={styles.editorHeaderBar}>
                  <View style={styles.editorDots}>
                    <View style={[styles.editorDot, { backgroundColor: '#EF4444' }]} />
                    <View style={[styles.editorDot, { backgroundColor: '#F59E0B' }]} />
                    <View style={[styles.editorDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.editorLangLabel}>{challenge.language?.toUpperCase()} EDITOR</Text>
                  </View>

                  <View style={styles.editorActions}>
                    <Pressable style={styles.editorMiniBtn} onPress={handleResetCode}>
                      <Text style={styles.editorMiniBtnText}>↺ Reset</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.editorMiniBtn, styles.editorHintBtn]}
                      onPress={handleRequestHint}
                      disabled={isLoadingHint}
                    >
                      {isLoadingHint ? (
                        <ActivityIndicator size="small" color="#FCD34D" />
                      ) : (
                        <Text style={styles.editorHintBtnText}>
                          💡 Hint {hintLevel > 0 ? `(${hintLevel}/${hintData?.total_hints || 3})` : ''}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Progressive Hint Drawer */}
                {showHintBox && (
                  <View style={styles.hintDrawer}>
                    <View style={styles.hintHeader}>
                      <Text style={styles.hintTitle}>
                        💡 AI Hint {hintData ? `(Tier ${hintData.hint_level} of ${hintData.total_hints})` : ''}
                      </Text>
                      <Pressable onPress={() => setShowHintBox(false)}>
                        <Text style={styles.hintClose}>✕</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.hintBody}>
                      {hintError || hintData?.hint || 'Review how the query filters rows before aggregation.'}
                    </Text>
                    {hintData?.has_more && !hintError && (
                      <Pressable
                        style={styles.nextHintBtn}
                        onPress={handleRequestHint}
                        disabled={isLoadingHint}
                      >
                        <Text style={styles.nextHintText}>Need more help? Get deeper clue ➔</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Interactive Code Area with Line Numbers */}
                <View style={styles.editorBody}>
                  <View style={styles.lineNumbersCol}>
                    {lineNumbers.map((num) => (
                      <Text key={num} style={styles.lineNumText}>{num}</Text>
                    ))}
                  </View>

                  <TextInput
                    style={styles.codeTextInput}
                    value={code}
                    onChangeText={(val) => {
                      setCode(val);
                      if (validationError) setValidationError('');
                    }}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    placeholder={placeholderText}
                    placeholderTextColor="#6B7280"
                  />
                </View>
              </View>

              {/* Validation Warning Notice if empty code submitted */}
              {validationError !== '' && (
                <View style={styles.validationNoticeBox}>
                  <Text style={styles.validationNoticeIcon}>⚠️</Text>
                  <Text style={styles.validationNoticeText}>{validationError}</Text>
                </View>
              )}

              {/* Success Resolution Banner if Solved */}
              {isSolved && (
                <View style={styles.solvedCard}>
                  <Text style={styles.solvedIcon}>🎉</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.solvedTitle}>Challenge Completed Successfully!</Text>
                    <Text style={styles.solvedSub}>
                      +{challenge.xp_reward || 35} XP Recorded • Learning Evidence logged to verified dossier.
                    </Text>
                  </View>
                  <ClayButton
                    style={styles.nextChallengeBtn}
                    onPress={handleNextChallenge}
                  >
                    <Text style={styles.nextChallengeBtnText}>Next Adaptive Challenge ➔</Text>
                  </ClayButton>
                </View>
              )}

              {/* Execution Action Toolbar (Run Code & Submit Solution ONLY) */}
              <View style={styles.drillActions}>
                <ClayButton
                  testID="skill-run-code-container-btn"
                  style={[styles.runContainerBtn, (isRunning || isSubmitting) && styles.runBtnDisabled]}
                  onPress={handleRunCode}
                  disabled={isRunning || isSubmitting}
                >
                  {isRunning ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ActivityIndicator size="small" color={CLAY_COLORS.paper} />
                      <Text style={styles.runContainerBtnText}>Running in Sandbox...</Text>
                    </View>
                  ) : (
                    <Text style={styles.runContainerBtnText}>▶ Run Code</Text>
                  )}
                </ClayButton>

                <ClayButton
                  testID="skill-submit-solution-btn"
                  style={[styles.submitSolutionBtn, (isRunning || isSubmitting) && styles.runBtnDisabled]}
                  onPress={handleSubmitCode}
                  disabled={isRunning || isSubmitting}
                >
                  {isSubmitting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ActivityIndicator size="small" color={CLAY_COLORS.paper} />
                      <Text style={styles.submitSolutionBtnText}>Evaluating Submission...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitSolutionBtnText}>✓ Submit Solution</Text>
                  )}
                </ClayButton>
              </View>
            </>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 24 }}>⚡</Text>
              <Text style={styles.emptyTitle}>Ready for Adaptive Practice</Text>
              <Text style={styles.emptyDesc}>Generate your first calibrated coding challenge matching your career path.</Text>
              <ClayButton style={styles.startDrillBtn} onPress={() => fetchAdaptiveChallenge(true)}>
                <Text style={styles.startDrillBtnText}>Start Adaptive Challenge ➔</Text>
              </ClayButton>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: CLAY_COLORS.cardBg,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 22,
    marginBottom: 24,
    gap: 16,
    ...CLAY_SHADOWS.card,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  telemetryBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  telemetryBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  curriculumSubText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  curriculumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  learningColumn: {
    flex: 1,
    minWidth: 300,
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    padding: 16,
    gap: 14,
  },
  learningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  colTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  colSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    marginTop: 2,
  },
  targetPlanPill: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  targetPlanPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  modulesList: {
    gap: 10,
  },
  moduleItem: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    padding: 12,
    gap: 6,
  },
  moduleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  moduleName: {
    flex: 1,
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.foreground,
  },
  modulePercentText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  moduleTrack: {
    height: 5,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: CLAY_RADII.pill,
    overflow: 'hidden',
  },
  moduleFill: {
    height: '100%',
    borderRadius: CLAY_RADII.pill,
  },
  moduleBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  moduleMetaText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.mutedLight,
  },
  advanceModuleBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  advanceModuleBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },
  exploreAllBtn: {
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.button,
    alignItems: 'center',
    marginTop: 4,
  },
  exploreAllBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },

  // Right Column: Adaptive Coding Drill
  drillColumn: {
    flex: 1.3,
    minWidth: 320,
    backgroundColor: CLAY_COLORS.cardBg,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    padding: 16,
    gap: 12,
    ...CLAY_SHADOWS.card,
  },
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  drillBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drillBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  drillBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  diffBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  diffBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 8,
    fontWeight: '900',
  },
  xpText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  drillTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 16,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.3,
  },
  whyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  whyIcon: {
    fontSize: 12,
  },
  whyText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.foregroundDark,
    flex: 1,
  },
  subTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: CLAY_COLORS.subtleBorder,
    gap: 8,
    marginTop: 2,
  },
  subTabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabBtnActive: {
    borderBottomColor: CLAY_COLORS.primary,
  },
  subTabText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.mutedLight,
  },
  subTabTextActive: {
    color: CLAY_COLORS.primary,
    fontWeight: '900',
  },
  tabContentBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  problemDescText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.foreground,
    lineHeight: 18,
  },
  constraintsBox: {
    gap: 3,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: CLAY_COLORS.subtleBorder,
    paddingTop: 6,
  },
  constraintsHeader: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  constraintItem: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  exampleItem: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: 6,
    padding: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
  },
  exampleTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  exampleIo: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.foreground,
  },
  exampleCode: {
    fontFamily: Platform.select({ web: 'monospace', default: 'System' }),
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  exampleExpl: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
    fontStyle: 'italic',
  },

  // Editor Styles
  codeEditorContainer: {
    backgroundColor: '#1E1B2E',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  editorHeaderBar: {
    backgroundColor: '#151320',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  editorDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editorDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  editorLangLabel: {
    fontFamily: Platform.select({ web: 'monospace', default: 'System' }),
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    marginLeft: 6,
  },
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editorMiniBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  editorMiniBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  editorHintBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  editorHintBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: '#FCD34D',
  },
  hintDrawer: {
    backgroundColor: '#2D2845',
    padding: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  hintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hintTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: '#FCD34D',
  },
  hintClose: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '900',
    padding: 4,
  },
  hintBody: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: '#E5E7EB',
    lineHeight: 16,
  },
  nextHintBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  nextHintText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: '#A78BFA',
  },
  editorBody: {
    flexDirection: 'row',
    minHeight: 160,
    padding: 8,
  },
  lineNumbersCol: {
    width: 28,
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'flex-end',
  },
  lineNumText: {
    fontFamily: Platform.select({ web: 'monospace', default: 'System' }),
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 18,
  },
  codeTextInput: {
    flex: 1,
    paddingLeft: 8,
    paddingTop: 0,
    fontFamily: Platform.select({ web: 'Consolas, Monaco, "Courier New", monospace', default: 'monospace' }),
    fontSize: 12,
    color: '#F3F4F6',
    lineHeight: 18,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },

  // Validation warning box
  validationNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  validationNoticeIcon: {
    fontSize: 12,
  },
  validationNoticeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },

  // Proactive hint suggestion banner
  hintSuggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    padding: 8,
    cursor: 'pointer',
  },
  hintSuggestionIcon: {
    fontSize: 16,
  },
  hintSuggestionTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  hintSuggestionSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  hintSuggestionAction: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '900',
    color: '#D97706',
  },

  // Execution Result Box
  executionResultBox: {
    gap: 8,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
  },
  resultBannerPassed: {
    backgroundColor: CLAY_COLORS.successLight,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  resultBannerFailed: {
    backgroundColor: CLAY_COLORS.dangerLight,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  resultBannerIcon: {
    fontSize: 16,
    fontWeight: '900',
  },
  resultBannerTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '900',
  },
  resultBannerSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    padding: 8,
    gap: 2,
  },
  errorTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.danger,
  },
  errorText: {
    fontFamily: Platform.select({ web: 'monospace', default: 'System' }),
    fontSize: 10,
    color: '#991B1B',
  },
  feedbackBox: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    padding: 8,
  },
  feedbackIcon: {
    fontSize: 13,
  },
  feedbackText: {
    flex: 1,
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: '#92400E',
  },
  testsList: {
    gap: 4,
  },
  testItem: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    gap: 4,
  },
  testItemPassed: {
    borderLeftWidth: 3,
    borderLeftColor: CLAY_COLORS.success,
  },
  testItemFailed: {
    borderLeftWidth: 3,
    borderLeftColor: CLAY_COLORS.danger,
  },
  testItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testStatusTag: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
  },
  testDescText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.foreground,
    flex: 1,
  },
  testDetails: {
    backgroundColor: CLAY_COLORS.recessedLight,
    padding: 4,
    borderRadius: 4,
    gap: 2,
  },
  testDetailLine: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: CLAY_COLORS.muted,
  },
  testCodeVal: {
    fontFamily: Platform.select({ web: 'monospace', default: 'System' }),
    fontWeight: '700',
    color: CLAY_COLORS.foregroundDark,
  },
  noRunYetBox: {
    alignItems: 'center',
    padding: 16,
    gap: 4,
  },
  noRunIcon: {
    fontSize: 20,
    color: CLAY_COLORS.primary,
  },
  noRunText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
  },

  // Solved Card
  solvedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    padding: 12,
    borderRadius: 12,
  },
  solvedIcon: {
    fontSize: 22,
  },
  solvedTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '900',
    color: CLAY_COLORS.successDark,
  },
  solvedSub: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  nextChallengeBtn: {
    backgroundColor: CLAY_COLORS.successDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
  },
  nextChallengeBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },

  // Action Buttons
  drillActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  runContainerBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
  },
  submitSolutionBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.badge,
  },
  runBtnDisabled: {
    opacity: 0.6,
  },
  runContainerBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },
  submitSolutionBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.paper,
  },

  // Fallbacks
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  loadingText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
  },
  emptyDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    textAlign: 'center',
  },
  emptyTabText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
    padding: 8,
  },
  startDrillBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: CLAY_RADII.button,
    marginTop: 6,
  },
  startDrillBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.paper,
  },
});
