import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS, ensureSkillGlobalStyles } from './DesignTokens';

/**
 * Universal Question Option Parser
 */
export function extractQuestionOptions(question) {
  if (!question) return [];

  // 1. If options is an object like { "A": "text", "B": "text", ... }
  if (question.options && typeof question.options === 'object' && !Array.isArray(question.options)) {
    return Object.entries(question.options).map(([key, text]) => ({
      key: String(key).trim().toUpperCase(),
      text: typeof text === 'string' ? text : JSON.stringify(text),
    }));
  }

  // 2. If options is a string (e.g. options_json from backend)
  const rawJson = question.options_json || (typeof question.options === 'string' ? question.options : null);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([key, text]) => ({
          key: String(key).trim().toUpperCase(),
          text: String(text),
        }));
      }
      if (Array.isArray(parsed)) {
        return parsed.map((opt, idx) => ({
          key: String.fromCharCode(65 + idx),
          text: typeof opt === 'object' ? (opt.text || opt.label || opt.value || JSON.stringify(opt)) : String(opt),
        }));
      }
    } catch (e) {}
  }

  // 3. If options is an array
  if (Array.isArray(question.options) && question.options.length > 0) {
    return question.options.map((opt, idx) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          key: opt.key || opt.id || opt.label || String.fromCharCode(65 + idx),
          text: opt.text || opt.title || opt.value || opt.option || String(opt),
        };
      }
      return {
        key: String.fromCharCode(65 + idx),
        text: String(opt),
      };
    });
  }

  // 4. If choices array exists
  if (Array.isArray(question.choices) && question.choices.length > 0) {
    return question.choices.map((c, idx) => {
      if (typeof c === 'object' && c !== null) {
        return {
          key: c.key || c.id || String.fromCharCode(65 + idx),
          text: c.text || c.label || c.value || String(c),
        };
      }
      return {
        key: String.fromCharCode(65 + idx),
        text: String(c),
      };
    });
  }

  // 5. If option_a, option_b, option_c, option_d exist
  const letterKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
  const explicitOptions = [];
  for (const letter of letterKeys) {
    const val =
      question[`option_${letter.toLowerCase()}`] ||
      question[`option_${letter}`] ||
      question[`opt_${letter.toLowerCase()}`] ||
      question[`opt_${letter}`];
    if (val !== undefined && val !== null && val !== '') {
      explicitOptions.push({
        key: letter,
        text: String(val),
      });
    }
  }
  if (explicitOptions.length > 0) {
    return explicitOptions;
  }

  // 6. Fallback if True/False
  if (
    question.question_type === 'true_false' ||
    question.type === 'true_false' ||
    (question.question_text && question.question_text.toLowerCase().includes('true or false'))
  ) {
    return [
      { key: 'A', text: 'True' },
      { key: 'B', text: 'False' },
    ];
  }

  return [];
}

/**
 * Animated Score Counter for Result Screen
 */
function ResultScoreCounter({ targetScore = 0 }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 1200; // ms
    const startVal = 0;
    const endVal = Number(targetScore) || 0;

    let animFrame;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(startVal + (endVal - startVal) * ease));

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [targetScore]);

  return <Text>{displayScore}%</Text>;
}

/**
 * Animated Loading Spinner for Submit State
 */
function AnimatedSpinnerIcon({ size = 16 }) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    spinLoop.start();
    return () => spinLoop.stop();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }], width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: size, lineHeight: size }}>🌀</Text>
    </Animated.View>
  );
}

/**
 * Web-Compatible Interactive Option Card
 */
function WebInteractiveOptionCard({
  opt,
  optIdx,
  isSelected,
  onSelect,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      onPress={() => onSelect(opt.key)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.optionCard,
        isSelected && styles.optionCardSelected,
        Platform.OS === 'web' && {
          cursor: 'pointer',
          userSelect: 'none',
          transform: [
            { translateY: isPressed ? 1 : isHovered ? -4 : 0 },
            { scale: isPressed ? 0.97 : isHovered ? 1.012 : 1 },
          ],
          boxShadow: isSelected
            ? '0 8px 24px rgba(124, 58, 237, 0.20)'
            : isHovered
            ? '0 10px 24px rgba(124, 58, 237, 0.14)'
            : '0 2px 6px rgba(160, 150, 180, 0.08)',
          transitionDuration: '200ms',
          transitionProperty: 'transform, box-shadow, background-color, border-color',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
      ]}
    >
      {/* Radio Circle */}
      <View
        style={[
          styles.optionRadioCircle,
          isSelected && styles.optionRadioCircleSelected,
          Platform.OS === 'web' && {
            transform: [{ scale: isSelected ? 1 : 0.88 }],
            transitionDuration: '200ms',
            transitionProperty: 'transform, background-color, border-color',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          },
        ]}
      >
        <Text
          style={[
            styles.optionRadioKeyText,
            isSelected && styles.optionRadioKeyTextSelected,
          ]}
        >
          {isSelected ? '✓' : opt.key}
        </Text>
      </View>

      {/* Option Text */}
      <Text
        style={[
          styles.optionText,
          isSelected && styles.optionTextSelected,
        ]}
      >
        {opt.text}
      </Text>
    </Pressable>
  );
}

/**
 * Web-Compatible Interactive Button Wrapper
 */
function WebInteractiveButton({
  style,
  onPress,
  disabled,
  children,
  hoverTranslate = -2.5,
  hoverScaleAmt = 1.025,
  pressScaleAmt = 0.95,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onHoverIn={() => !disabled && setIsHovered(true)}
      onHoverOut={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPressIn={() => !disabled && setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        style,
        Platform.OS === 'web' && {
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          transform: [
            { translateY: isPressed ? 1 : (isHovered && !disabled) ? hoverTranslate : 0 },
            { scale: isPressed ? pressScaleAmt : (isHovered && !disabled) ? hoverScaleAmt : 1 },
          ],
          transitionDuration: '180ms',
          transitionProperty: 'transform, box-shadow, background-color, opacity',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Web-Compatible Interactive Close Button
 */
function WebInteractiveCloseButton({ onPress }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.closeBtn,
        Platform.OS === 'web' && {
          cursor: 'pointer',
          userSelect: 'none',
          transform: [
            { scale: isPressed ? 0.9 : isHovered ? 1.1 : 1 },
            { rotate: isHovered ? '8deg' : '0deg' },
          ],
          transitionDuration: '180ms',
          transitionProperty: 'transform, background-color',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
      ]}
    >
      <Text style={styles.closeBtnText}>✕</Text>
    </Pressable>
  );
}

/**
 * Web-Compatible Interactive Question Navigation Pill
 */
function WebInteractiveJumpPill({
  qIdx,
  isActive,
  isAnswered,
  onPress,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.jumpPill,
        isAnswered && styles.jumpPillAnswered,
        isActive && styles.jumpPillActive,
        Platform.OS === 'web' && {
          cursor: 'pointer',
          userSelect: 'none',
          transform: [
            { translateY: isPressed ? 1 : isHovered ? -3 : 0 },
            { scale: isPressed ? 0.93 : isHovered ? 1.08 : 1 },
          ],
          transitionDuration: '160ms',
          transitionProperty: 'transform, border-color, background-color',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        },
      ]}
    >
      <Text
        style={[
          styles.jumpPillText,
          isAnswered && styles.jumpPillTextAnswered,
          isActive && styles.jumpPillTextActive,
        ]}
      >
        {qIdx + 1}{isAnswered ? ' ✓' : ''}
      </Text>
    </Pressable>
  );
}

export default function SkillAssessmentModal({
  visible,
  onClose,
  assessmentData,
  selectedAnswers = {},
  setSelectedAnswers,
  isSubmittingAssessment,
  onSubmit,
  assessmentResult,
}) {
  const { width } = useWindowDimensions();
  const isMobile = width < 640;

  // Ensure global CSS keyframes are injected
  useEffect(() => {
    ensureSkillGlobalStyles();
  }, []);

  // Mounted & Open Lifecycle for guaranteed web pop-up animation
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Question navigation index (0-indexed)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isQuestionVisible, setIsQuestionVisible] = useState(true);
  const [viewMode, setViewMode] = useState('focus'); // 'focus' (1-by-1) or 'all' (scroll all)
  const [showValidationWarning, setShowValidationWarning] = useState(false);

  const questions = useMemo(() => {
    return assessmentData?.questions || [];
  }, [assessmentData]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIdx] || questions[0];

  // Count answered questions
  const answeredCount = useMemo(() => {
    let count = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== '') {
        count++;
      }
    });
    return count;
  }, [questions, selectedAnswers]);

  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Handle Mount & Pop-up Animation Lifecycle
  useEffect(() => {
    if (visible) {
      console.log('[SkillPopup] MOUNT');
      setIsMounted(true);
      setIsOpen(false);
      console.log('[SkillPopup] CLOSED STATE');
      setCurrentQuestionIdx(0);
      setIsQuestionVisible(true);
      setShowValidationWarning(false);

      // Trigger pop-up expansion on next frame after initial render
      const frame1 = requestAnimationFrame(() => {
        const frame2 = requestAnimationFrame(() => {
          console.log('[SkillPopup] OPEN STATE');
          setIsOpen(true);
        });
        return () => cancelAnimationFrame(frame2);
      });
      return () => cancelAnimationFrame(frame1);
    } else {
      if (isMounted) {
        console.log('[SkillPopup] CLOSE REQUESTED');
        setIsOpen(false);
        const timer = setTimeout(() => {
          console.log('[SkillPopup] EXIT COMPLETE');
          setIsMounted(false);
          console.log('[SkillPopup] UNMOUNT');
        }, 450);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  // Handle Close with Smooth Exit Pop Animation
  const handleCloseWithAnimation = useCallback(() => {
    console.log('[SkillPopup] CLOSE REQUESTED');
    setIsOpen(false);
    setTimeout(() => {
      console.log('[SkillPopup] EXIT COMPLETE');
      setIsMounted(false);
      console.log('[SkillPopup] UNMOUNT');
      onClose();
    }, 450);
  }, [onClose]);

  // Question Transition Animation
  const handleJumpToQuestion = (targetIdx) => {
    if (targetIdx < 0 || targetIdx >= totalQuestions || targetIdx === currentQuestionIdx) return;

    setIsQuestionVisible(false);
    setTimeout(() => {
      setCurrentQuestionIdx(targetIdx);
      setIsQuestionVisible(true);
    }, 140);
  };

  const handleNext = () => {
    if (currentQuestionIdx < totalQuestions - 1) {
      handleJumpToQuestion(currentQuestionIdx + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIdx > 0) {
      handleJumpToQuestion(currentQuestionIdx - 1);
    }
  };

  // Select Option
  const handleSelectOption = (questionId, optionKey) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
    setShowValidationWarning(false);
  };

  // Submit with Validation
  const handleAttemptSubmit = () => {
    if (answeredCount < totalQuestions) {
      setShowValidationWarning(true);
      const firstUnansweredIdx = questions.findIndex(
        (q) => selectedAnswers[q.id] === undefined || selectedAnswers[q.id] === ''
      );
      if (firstUnansweredIdx !== -1) {
        handleJumpToQuestion(firstUnansweredIdx);
      }
      return;
    }
    setShowValidationWarning(false);
    onSubmit();
  };

  if (!isMounted && !visible) return null;

  // Pop-up inner content
  const modalContentJsx = (
    <div
      className="skill-assessment-modal-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* ==================================================== */}
      {/* 1. FIXED MODAL HEADER                                */}
      {/* ==================================================== */}
      <View style={styles.modalHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.headerBadgeRow}>
            <View style={styles.modalBadge}>
              <Text style={styles.modalBadgeText}>⚡ PROCTORED SKILL BENCHMARK</Text>
            </View>
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>⏱ {assessmentData?.duration_minutes || 45} mins</Text>
            </View>
          </View>

          <Text style={styles.modalTitle} numberOfLines={1}>
            {assessmentData?.title || `${assessmentData?.skill_name || 'Skill'} Verification Benchmark`}
          </Text>

          <Text style={styles.modalSubtitle}>
            Canonical ESCO Verification • {totalQuestions} Questions • 70% Pass Threshold
          </Text>
        </View>

        <WebInteractiveCloseButton onPress={handleCloseWithAnimation} />
      </View>

      {/* ==================================================== */}
      {/* 2. STICKY PROGRESS & QUESTION JUMP PALETTE           */}
      {/* ==================================================== */}
      {!assessmentResult && totalQuestions > 0 && (
        <View style={styles.stickyProgressContainer}>
          {/* Progress Summary Row */}
          <View style={styles.progressSummaryRow}>
            <View style={styles.progressLeft}>
              <Text style={styles.progressQuestionCountText}>
                Question <Text style={styles.boldNum}>{currentQuestionIdx + 1}</Text> of {totalQuestions}
              </Text>
              <Text style={styles.progressAnsweredText}>
                (Answered <Text style={styles.boldNum}>{answeredCount}</Text> / {totalQuestions})
              </Text>
            </View>

            <View style={styles.progressRight}>
              {/* Mode Toggle Button */}
              <WebInteractiveButton
                style={styles.viewModeToggleBtn}
                onPress={() => setViewMode(viewMode === 'focus' ? 'all' : 'focus')}
                hoverTranslate={-2}
                hoverScaleAmt={1.03}
              >
                <Text style={styles.viewModeToggleText}>
                  {viewMode === 'focus' ? '☰ Review All' : '🎯 Focus Mode'}
                </Text>
              </WebInteractiveButton>

              <Text style={styles.percentText}>{progressPercent}% Complete</Text>
            </View>
          </View>

          {/* Progress Bar Track */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercent}%`,
                  transitionProperty: 'width',
                  transitionDuration: '350ms',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                },
              ]}
            />
          </View>

          {/* Question Jump Palette */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.jumpPaletteScroll}
          >
            {questions.map((q, qIdx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== '';
              const isActive = currentQuestionIdx === qIdx;

              return (
                <WebInteractiveJumpPill
                  key={`jump_pill_${q.id || qIdx}`}
                  qIdx={qIdx}
                  isActive={isActive}
                  isAnswered={isAnswered}
                  onPress={() => handleJumpToQuestion(qIdx)}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Validation Alert */}
      {showValidationWarning && (
        <View style={styles.validationAlertBanner}>
          <Text style={styles.validationAlertIcon}>⚠️</Text>
          <Text style={styles.validationAlertText}>
            Please answer all questions before submitting ({answeredCount}/{totalQuestions} answered). We've jumped to question {currentQuestionIdx + 1}.
          </Text>
        </View>
      )}

      {/* ==================================================== */}
      {/* 3. INDEPENDENT SCROLLABLE QUESTION AREA              */}
      {/* ==================================================== */}
      <ScrollView
        style={styles.modalBody}
        contentContainerStyle={styles.modalBodyContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {assessmentResult ? (
          /* ==================================================== */
          /* RESULT VIEW                                          */
          /* ==================================================== */
          <View
            style={[
              styles.resultContainer,
              Platform.OS === 'web' && {
                opacity: isOpen ? 1 : 0,
                transform: [
                  { translateY: isOpen ? 0 : 20 },
                  { scale: isOpen ? 1 : 0.88 },
                ],
                transitionProperty: 'opacity, transform',
                transitionDuration: '400ms',
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              },
            ]}
          >
            {/* Result Icon Circle */}
            <View
              style={[
                styles.resultIconCircle,
                {
                  backgroundColor: assessmentResult.is_verified
                    ? CLAY_COLORS.successLight
                    : CLAY_COLORS.dangerLight,
                },
              ]}
            >
              <Text style={{ fontSize: 44 }}>
                {assessmentResult.is_verified ? '🏆' : '⚠️'}
              </Text>
            </View>

            {/* Result Heading */}
            <Text style={styles.resultHeading}>
              {assessmentResult.is_verified
                ? 'Assessment Passed & Verified!'
                : 'Verification Threshold Not Met'}
            </Text>

            {/* Score Card */}
            <View style={styles.resultScoreCard}>
              <Text
                style={[
                  styles.resultScoreNum,
                  {
                    color: assessmentResult.is_verified
                      ? CLAY_COLORS.success
                      : CLAY_COLORS.danger,
                  },
                ]}
              >
                <ResultScoreCounter targetScore={assessmentResult.score} />
              </Text>
              <Text style={styles.resultScoreMeta}>
                Correct: {assessmentResult.correct_count} of {assessmentResult.total_questions} Questions ({assessmentResult.score}%)
              </Text>
              <Text style={styles.resultThresholdText}>
                Passing Threshold: {assessmentResult.pass_score || 70}%
              </Text>
              <Text style={styles.resultFeedbackText}>
                {assessmentResult.feedback || 'Assessment evaluated against canonical ESCO benchmark rubric.'}
              </Text>
            </View>

            {/* Verified Alert Box */}
            {assessmentResult.is_verified && (
              <View style={styles.verifiedAlertBox}>
                <Text style={styles.verifiedAlertText}>
                  ✓ Your verified skill evidence in PostgreSQL has been updated to {assessmentResult.score}%.
                </Text>
              </View>
            )}

            {/* Close Result Button */}
            <WebInteractiveButton
              style={styles.closeResultBtn}
              onPress={handleCloseWithAnimation}
              hoverTranslate={-3}
              hoverScaleAmt={1.03}
            >
              <Text style={styles.closeResultBtnText}>Close & View Updated Skill Dashboard ➔</Text>
            </WebInteractiveButton>
          </View>
        ) : viewMode === 'focus' ? (
          /* ==================================================== */
          /* FOCUS MODE (1 QUESTION AT A TIME)                    */
          /* ==================================================== */
          currentQuestion ? (
            <View
              key={`question_view_${currentQuestionIdx}`}
              style={[
                styles.questionWrapper,
                Platform.OS === 'web' && {
                  opacity: isQuestionVisible ? 1 : 0,
                  transform: [{ translateY: isQuestionVisible ? 0 : 12 }],
                  transitionProperty: 'opacity, transform',
                  transitionDuration: '280ms',
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                },
              ]}
            >
              {/* Question Card */}
              <View style={styles.questionCard}>
                <View style={styles.questionCardHeader}>
                  <View style={styles.questionNumBadge}>
                    <Text style={styles.questionNumBadgeText}>QUESTION {currentQuestionIdx + 1}</Text>
                  </View>
                  {selectedAnswers[currentQuestion.id] && (
                    <View style={styles.answeredStatusPill}>
                      <Text style={styles.answeredStatusText}>✓ Answer Selected</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.questionText}>
                  {currentQuestion.question_text || currentQuestion.question || currentQuestion.prompt}
                </Text>
              </View>

              {/* Options List */}
              <View style={styles.optionsListContainer}>
                <Text style={styles.optionsSectionLabel}>SELECT THE CORRECT ANSWER:</Text>

                {(() => {
                  const options = extractQuestionOptions(currentQuestion);

                  if (options.length === 0) {
                    return (
                      <View style={styles.textInputOptionBox}>
                        <Text style={styles.textInputLabel}>Enter your answer below:</Text>
                        <TextInput
                          style={styles.textAnswerInput}
                          placeholder="Type your answer here..."
                          placeholderTextColor={CLAY_COLORS.mutedLight}
                          value={selectedAnswers[currentQuestion.id] || ''}
                          onChangeText={(text) => handleSelectOption(currentQuestion.id, text)}
                        />
                      </View>
                    );
                  }

                  return options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === opt.key;

                    return (
                      <WebInteractiveOptionCard
                        key={`focus_opt_${currentQuestion.id}_${opt.key}`}
                        opt={opt}
                        optIdx={optIdx}
                        isSelected={isSelected}
                        onSelect={(key) => handleSelectOption(currentQuestion.id, key)}
                      />
                    );
                  });
                })()}
              </View>
            </View>
          ) : (
            <View style={styles.emptyQuestionsBox}>
              <ActivityIndicator size="large" color={CLAY_COLORS.primary} />
              <Text style={styles.loadingQuestionsText}>Loading proctored questions...</Text>
            </View>
          )
        ) : (
          /* ==================================================== */
          /* ALL QUESTIONS REVIEW MODE                            */
          /* ==================================================== */
          <View style={styles.allQuestionsContainer}>
            {questions.map((q, qIdx) => {
              const options = extractQuestionOptions(q);
              const isAnswered = selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== '';

              return (
                <View key={`review_q_${q.id || qIdx}`} style={styles.reviewQuestionBlock}>
                  <View style={styles.questionCardHeader}>
                    <View style={styles.questionNumBadge}>
                      <Text style={styles.questionNumBadgeText}>QUESTION {qIdx + 1}</Text>
                    </View>
                    {isAnswered ? (
                      <View style={styles.answeredStatusPill}>
                        <Text style={styles.answeredStatusText}>✓ Answered ({selectedAnswers[q.id]})</Text>
                      </View>
                    ) : (
                      <View style={styles.unansweredStatusPill}>
                        <Text style={styles.unansweredStatusText}>Unanswered</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.questionText}>
                    {q.question_text || q.question}
                  </Text>

                  <View style={styles.optionsListContainer}>
                    {options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[q.id] === opt.key;
                      return (
                        <WebInteractiveOptionCard
                          key={`all_opt_${q.id}_${opt.key}`}
                          opt={opt}
                          optIdx={optIdx}
                          isSelected={isSelected}
                          onSelect={(key) => handleSelectOption(q.id, key)}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ==================================================== */}
      {/* 4. FIXED MODAL FOOTER (NO OVERLAP GUARANTEE)         */}
      {/* ==================================================== */}
      {!assessmentResult && (
        <View style={styles.modalFooter}>
          {/* Left Actions */}
          <View style={styles.footerLeft}>
            <WebInteractiveButton
              style={styles.cancelBtn}
              hoverTranslate={-2}
              hoverScaleAmt={1.03}
              onPress={() => {
                if (answeredCount > 0) {
                  if (Platform.OS === 'web') {
                    if (!window.confirm('Are you sure you want to exit? Your answers will not be submitted.')) {
                      return;
                    }
                  }
                }
                handleCloseWithAnimation();
              }}
            >
              <Text style={styles.cancelBtnText}>Quit Assessment</Text>
            </WebInteractiveButton>

            {viewMode === 'focus' && (
              <View style={styles.navButtonsGroup}>
                <WebInteractiveButton
                  style={[
                    styles.navBtn,
                    currentQuestionIdx === 0 && styles.navBtnDisabled,
                  ]}
                  onPress={handlePrevious}
                  disabled={currentQuestionIdx === 0}
                  hoverTranslate={-2}
                  hoverScaleAmt={1.03}
                >
                  <Text
                    style={[
                      styles.navBtnText,
                      currentQuestionIdx === 0 && styles.navBtnTextDisabled,
                    ]}
                  >
                    ← Previous
                  </Text>
                </WebInteractiveButton>

                <WebInteractiveButton
                  style={[
                    styles.navBtn,
                    currentQuestionIdx === totalQuestions - 1 && styles.navBtnDisabled,
                  ]}
                  onPress={handleNext}
                  disabled={currentQuestionIdx === totalQuestions - 1}
                  hoverTranslate={-2}
                  hoverScaleAmt={1.03}
                >
                  <Text
                    style={[
                      styles.navBtnText,
                      currentQuestionIdx === totalQuestions - 1 && styles.navBtnTextDisabled,
                    ]}
                  >
                    Next →
                  </Text>
                </WebInteractiveButton>
              </View>
            )}
          </View>

          {/* Right Actions */}
          <View style={styles.footerRight}>
            {answeredCount < totalQuestions && (
              <Text style={styles.remainingCountText}>
                {totalQuestions - answeredCount} remaining
              </Text>
            )}

            <WebInteractiveButton
              style={[
                styles.submitBtn,
                isSubmittingAssessment && styles.submitBtnDisabled,
              ]}
              onPress={handleAttemptSubmit}
              disabled={isSubmittingAssessment}
              hoverTranslate={-3}
              hoverScaleAmt={1.03}
            >
              {isSubmittingAssessment ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AnimatedSpinnerIcon size={14} />
                  <Text style={styles.submitBtnText}>Submitting Assessment...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>
                  Submit Assessment ({answeredCount}/{totalQuestions}) ➔
                </Text>
              )}
            </WebInteractiveButton>
          </View>
        </View>
      )}
    </div>
  );

  // On Web, render as real DOM overlay with hardware-accelerated CSS transition
  if (Platform.OS === 'web') {
    return (
      <div
        className={`skill-assessment-modal-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseWithAnimation();
          }
        }}
      >
        {modalContentJsx}
      </div>
    );
  }

  // On Native, render standard React Native Modal
  return (
    <Modal
      visible={isMounted}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCloseWithAnimation}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
          {modalContentJsx}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 22, 32, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99999,
  },
  modalContent: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    maxWidth: 780,
    width: '100%',
    height: '88%',
    maxHeight: 740,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    ...CLAY_SHADOWS.cardHover,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalContentMobile: {
    height: '96%',
    maxHeight: '96%',
    borderRadius: CLAY_RADII.cardMedium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 22,
    paddingVertical: 16,
    backgroundColor: CLAY_COLORS.paper,
    flexShrink: 0,
    zIndex: 10,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  modalBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  timeBadge: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: CLAY_RADII.pill,
  },
  timeBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  modalTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 17,
    fontWeight: '900',
    color: CLAY_COLORS.foreground,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: CLAY_COLORS.recessedLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
  },
  closeBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 14,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  stickyProgressContainer: {
    backgroundColor: '#FAF7FD',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 22,
    paddingVertical: 10,
    gap: 8,
    flexShrink: 0,
  },
  progressSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressQuestionCountText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  boldNum: {
    fontWeight: '900',
    color: CLAY_COLORS.primary,
  },
  progressAnsweredText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.muted,
  },
  progressRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  viewModeToggleBtn: {
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  viewModeToggleText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  percentText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: CLAY_COLORS.primary,
    borderRadius: 3,
  },
  jumpPaletteScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  jumpPill: {
    width: 34,
    height: 28,
    borderRadius: 6,
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jumpPillAnswered: {
    backgroundColor: CLAY_COLORS.primaryLight,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  jumpPillActive: {
    borderColor: CLAY_COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#FAF5FF',
  },
  jumpPillText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  jumpPillTextAnswered: {
    color: CLAY_COLORS.primaryDark,
    fontWeight: '900',
  },
  jumpPillTextActive: {
    color: CLAY_COLORS.primary,
    fontWeight: '900',
  },
  validationAlertBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
    paddingHorizontal: 22,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  validationAlertIcon: {
    fontSize: 14,
  },
  validationAlertText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
    flex: 1,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 22,
    paddingBottom: 30,
  },
  questionWrapper: {
    gap: 16,
  },
  questionCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    padding: 18,
    gap: 10,
  },
  questionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionNumBadge: {
    backgroundColor: CLAY_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  questionNumBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  answeredStatusPill: {
    backgroundColor: CLAY_COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  answeredStatusText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '800',
    color: CLAY_COLORS.successDark,
  },
  unansweredStatusPill: {
    backgroundColor: CLAY_COLORS.recessedLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unansweredStatusText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '700',
    color: CLAY_COLORS.mutedLight,
  },
  questionText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '850',
    color: CLAY_COLORS.foreground,
    lineHeight: 22,
  },
  optionsListContainer: {
    gap: 10,
  },
  optionsSectionLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 9,
    fontWeight: '900',
    color: CLAY_COLORS.mutedLight,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.subtleBorder,
    borderRadius: CLAY_RADII.cardSmall,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...CLAY_SHADOWS.badge,
  },
  optionCardSelected: {
    borderColor: CLAY_COLORS.primary,
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
  },
  optionRadioCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    backgroundColor: CLAY_COLORS.recessedLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioCircleSelected: {
    backgroundColor: CLAY_COLORS.primary,
    borderColor: CLAY_COLORS.primary,
  },
  optionRadioKeyText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '900',
    color: CLAY_COLORS.muted,
  },
  optionRadioKeyTextSelected: {
    color: CLAY_COLORS.paper,
  },
  optionText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.foreground,
    flex: 1,
    lineHeight: 18,
  },
  optionTextSelected: {
    fontFamily: CLAY_FONTS.heading,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  textInputOptionBox: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    padding: 14,
    gap: 8,
  },
  textInputLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  textAnswerInput: {
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.subtleBorder,
    borderRadius: CLAY_RADII.input,
    padding: 12,
    fontFamily: CLAY_FONTS.body,
    fontSize: 13,
    color: CLAY_COLORS.foreground,
  },
  allQuestionsContainer: {
    gap: 20,
  },
  reviewQuestionBlock: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    padding: 16,
    gap: 10,
  },
  emptyQuestionsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  loadingQuestionsText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '700',
    color: CLAY_COLORS.muted,
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  resultIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultHeading: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 22,
    fontWeight: '950',
    color: CLAY_COLORS.foreground,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  resultScoreCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardMedium,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.subtleBorder,
    padding: 22,
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  resultScoreNum: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 46,
    fontWeight: '950',
    letterSpacing: -1,
  },
  resultScoreMeta: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  resultThresholdText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11,
    color: CLAY_COLORS.mutedLight,
  },
  resultFeedbackText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.foreground,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 500,
  },
  verifiedAlertBox: {
    backgroundColor: CLAY_COLORS.successLight,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 14,
    borderRadius: 10,
    width: '100%',
  },
  verifiedAlertText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: CLAY_COLORS.successDark,
    textAlign: 'center',
  },
  closeResultBtn: {
    backgroundColor: CLAY_COLORS.foreground,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: CLAY_RADII.button,
    marginTop: 6,
    ...CLAY_SHADOWS.badge,
  },
  closeResultBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '900',
    color: CLAY_COLORS.paper,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.08)',
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: CLAY_COLORS.paper,
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
  },
  cancelBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.muted,
  },
  navButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navBtn: {
    backgroundColor: CLAY_COLORS.paper,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: CLAY_RADII.button,
  },
  navBtnDisabled: {
    borderColor: CLAY_COLORS.subtleBorder,
    backgroundColor: CLAY_COLORS.recessedLight,
  },
  navBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
  navBtnTextDisabled: {
    color: CLAY_COLORS.mutedLight,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  remainingCountText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.mutedLight,
  },
  submitBtn: {
    backgroundColor: CLAY_COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: CLAY_RADII.button,
    ...CLAY_SHADOWS.badge,
  },
  submitBtnDisabled: {
    backgroundColor: CLAY_COLORS.mutedLight,
  },
  submitBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '900',
    color: CLAY_COLORS.paper,
  },
});
