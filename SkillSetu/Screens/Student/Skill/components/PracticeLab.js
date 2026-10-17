import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button, Card, EmptyState, Icon, IconButton, Inset, Pill, Row, SegmentedTabs, Skeleton, Stack, Txt } from '../../../../ui/components';
import { colors, radii, space, webOnly } from '../../../../ui/theme';
import { API_BASE } from '../../../../ui/config';

import { tl } from '../../../../i18n/tl';

// Adaptive coding challenge for the student's current skill gap: run, submit, progressive hints.
export default function PracticeLab({ topGapSubject, studentEmail, activeCareerName, selectedGapSkillName, onRefreshSkillData }) {
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

  const effectiveEmail = studentEmail;
  const effectiveSkill = selectedGapSkillName || topGapSubject;

  // 1. Fetch Current Adaptive Challenge for Student
  const fetchAdaptiveChallenge = async (forceNew = false) => {
    if (!effectiveEmail || !effectiveSkill) return;
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
        `${API_BASE}/student/adaptive-challenge/current?email=${emailQ}&target_career=${careerQ}&gap_skill=${skillQ}${forceQ}`
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
      const res = await fetch(`${API_BASE}/student/adaptive-challenge/run`, {
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
      const res = await fetch(`${API_BASE}/student/adaptive-challenge/submit`, {
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
      const res = await fetch(`${API_BASE}/student/adaptive-challenge/hint`, {
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


  const results = executionResult?.test_results || [];
  const tabs = [
    { id: 'problem', label: 'Problem', icon: 'FileText' },
    { id: 'examples', label: 'Examples', icon: 'List' },
    { id: 'tests', label: executionResult ? tl('Tests {{v0}}/{{v1}}', {
      v0: executionResult.passed_tests ?? 0,
      v1: executionResult.total_tests ?? results.length
    }) : 'Tests', icon: 'CircleCheck' },
  ];

  if (isLoadingChallenge && !challenge) {
    return (
      <Card>
        <Stack gap={12}>
          <Skeleton height={24} width="45%" />
          <Skeleton height={14} width="70%" />
          <Skeleton height={180} />
        </Stack>
      </Card>
    );
  }
  if (!challenge) {
    return (
      <Card>
        <EmptyState icon="Code" title="No practice challenge yet" message="Pick a skill gap to get an adaptive coding challenge." action={<Button label="Try again" size="sm" onPress={() => fetchAdaptiveChallenge(false)} />} />
      </Card>
    );
  }

  return (
    (<Card badge={{ icon: 'Code', tone: 'accent' }}>
      <Stack gap={space.md}>
        <Row justify="space-between" align="flex-start" wrap gap={space.sm}>
          <Stack gap={4} style={{ flex: 1, minWidth: 240 }}>
            <Txt variant="overline" tone="subtle">Practice lab · {effectiveSkill}</Txt>
            <Txt variant="h2" tone="ink">{challenge.title}</Txt>
            <Row gap={6} wrap>
              <Pill label={challenge.difficulty} tone="warning" size="sm" />
              <Pill label={challenge.language} tone="info" icon="Code" size="sm" />
              {challenge.xp_reward ? <Pill label={`+${challenge.xp_reward} XP`} tone="success" icon="Zap" size="sm" /> : null}
            </Row>
          </Stack>
          <IconButton icon="RefreshCw" onPress={handleNextChallenge} accessibilityLabel="New challenge" />
        </Row>

        <SegmentedTabs options={tabs} value={activeTab} onChange={setActiveTab} size="sm" />

        {activeTab === 'problem' ? (
          <Stack gap={10}>
            <Txt variant="body" tone="default">{challenge.description}</Txt>
            {challenge.why_this_challenge ? (
              <Inset tone="accent" padding={space.sm}>
                <Row gap={8} align="flex-start">
                  <Icon name="Sparkles" size={15} color={colors.lilacInk} />
                  <Txt variant="small" color={colors.lilacInk} style={{ flex: 1 }}>{challenge.why_this_challenge}</Txt>
                </Row>
              </Inset>
            ) : null}
            {(challenge.constraints || []).length ? (
              <Stack gap={4}>
                {challenge.constraints.map((c, i) => (
                  <Txt key={i} variant="small" tone="muted">• {c}</Txt>
                ))}
              </Stack>
            ) : null}
          </Stack>
        ) : null}

        {activeTab === 'examples' ? (
          <Stack gap={8}>
            {(challenge.examples || []).map((ex, i) => (
              <Inset key={i} tone="neutral">
                <Txt variant="caption" tone="muted">Input</Txt>
                <Txt variant="small" weight={600} tone="ink" style={styles.mono}>{ex.input}</Txt>
                <Txt variant="caption" tone="muted" style={{ marginTop: 6 }}>Output</Txt>
                <Txt variant="small" weight={600} tone="ink" style={styles.mono}>{ex.output}</Txt>
                {ex.explanation ? <Txt variant="caption" tone="muted" style={{ marginTop: 6 }}>{ex.explanation}</Txt> : null}
              </Inset>
            ))}
          </Stack>
        ) : null}

        {activeTab === 'tests' ? (
          executionResult ? (
            <Stack gap={8}>
              {executionResult.compile_error || executionResult.runtime_error ? (
                <Inset tone="danger">
                  <Txt variant="small" weight={600} color="#B4232A" style={styles.mono}>{executionResult.compile_error || executionResult.runtime_error}</Txt>
                </Inset>
              ) : null}
              {results.map((r, i) => (
                <Row key={i} gap={10} style={[styles.testRow, { backgroundColor: r.passed ? colors.mint : colors.dangerSoft }]}>
                  <Icon name={r.passed ? 'CircleCheck' : 'X'} size={16} color={r.passed ? colors.mintInk : '#B4232A'} />
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Txt variant="small" weight={600} tone="ink">{r.description || tl('Test {{v0}}', {
                      v0: i + 1
                    })}</Txt>
                    {!r.passed && r.expected !== undefined ? (
                      <Txt variant="caption" tone="muted" style={styles.mono}>expected {JSON.stringify(r.expected)} · got {JSON.stringify(r.actual)}</Txt>
                    ) : null}
                  </Stack>
                </Row>
              ))}
              {executionResult.diagnostic_feedback ? <Txt variant="small" tone="muted">{executionResult.diagnostic_feedback}</Txt> : null}
            </Stack>
          ) : (
            <Txt variant="small" tone="subtle">Run your code to see test results.</Txt>
          )
        ) : null}

        <View style={styles.editor}>
          <Row justify="space-between" style={{ paddingHorizontal: 14, paddingTop: 10 }}>
            <Txt variant="caption" color={colors.frameMuted}>solution.{challenge.language === 'python' ? 'py' : challenge.language === 'sql' ? 'sql' : 'js'}</Txt>
            <Pressable onPress={handleResetCode} style={webOnly({ cursor: 'pointer' })}>
              <Txt variant="caption" color={colors.frameMuted}>Reset</Txt>
            </Pressable>
          </Row>
          <TextInput
            value={code}
            onChangeText={setCode}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            style={[styles.codeInput, webOnly({ outlineStyle: 'none' })]}
          />
        </View>
        {validationError ? <Txt variant="caption" tone="danger">{validationError}</Txt> : null}

        {showHintBox ? (
          <Inset tone="warning">
            <Row justify="space-between" style={{ marginBottom: 4 }}>
              <Txt variant="small" weight={700} color={colors.butterInk}>Hint {hintData?.hint_level || hintLevel}{hintData?.total_hints ? ` of ${hintData.total_hints}` : ''}</Txt>
              <Pressable onPress={() => setShowHintBox(false)} style={webOnly({ cursor: 'pointer' })}>
                <Icon name="X" size={15} color={colors.butterInk} />
              </Pressable>
            </Row>
            <Txt variant="small" color={colors.butterInk}>{hintError || hintData?.hint}</Txt>
          </Inset>
        ) : null}

        {isSolved ? (
          <Inset tone="success">
            <Row gap={8}>
              <Icon name="Award" size={18} color={colors.mintInk} />
              <Txt variant="small" weight={600} color={colors.mintInk} style={{ flex: 1 }}>Solved! Skill evidence updated.</Txt>
              <Button label="Next challenge" size="sm" iconRight="ArrowRight" onPress={handleNextChallenge} />
            </Row>
          </Inset>
        ) : null}

        <Row gap={8} wrap>
          <Button label="Run" icon="Play" variant="secondary" onPress={handleRunCode} loading={isRunning} disabled={isSubmitting} />
          <Button label="Submit" icon="Send" onPress={handleSubmitCode} loading={isSubmitting} disabled={isRunning} />
          <Button label={hintLevel ? 'Next hint' : 'Hint'} icon="Sparkles" variant="ghost" onPress={handleRequestHint} loading={isLoadingHint} disabled={hintData && hintData.has_more === false} />
        </Row>
      </Stack>
    </Card>)
  );
}

const styles = StyleSheet.create({
  mono: {
    fontFamily: Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, monospace', ios: 'Menlo', default: 'monospace' }),
  },
  editor: {
    backgroundColor: colors.frame,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  codeInput: {
    minHeight: 220,
    color: '#E8E8EA',
    fontFamily: Platform.select({ web: 'ui-monospace, SFMono-Regular, Menlo, monospace', ios: 'Menlo', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 20,
    padding: 14,
    textAlignVertical: 'top',
  },
  testRow: {
    padding: 10,
    borderRadius: radii.sm,
    alignItems: 'flex-start',
  },
});
