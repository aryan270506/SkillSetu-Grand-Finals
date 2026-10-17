import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Inset, Pill, ProgressBar, Ring, Row, Sheet, Skeleton, Stack, Txt } from '../../../../ui/components';
import { colors, radii, space, webOnly } from '../../../../ui/theme';

import { tl } from '../../../../i18n/tl';

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


// Question-by-question skill assessment in a sheet. Answers are keyed by question id.
export default function AssessmentSheet({ visible, onClose, assessmentData, selectedAnswers, setSelectedAnswers, isSubmittingAssessment, onSubmit, assessmentResult }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible, assessmentData]);

  const questions = assessmentData?.questions || [];
  const q = questions[index];
  const options = extractQuestionOptions(q);
  const answered = Object.keys(selectedAnswers || {}).length;
  const isLast = index === questions.length - 1;

  let body;
  if (assessmentResult) {
    const passed = assessmentResult.is_verified;
    body = (
      <Stack gap={space.md} style={{ alignItems: 'center', paddingVertical: space.md }}>
        <Ring value={assessmentResult.score || 0} size={128} stroke={12} tone={passed ? 'success' : 'warning'}>
          <Txt variant="display" tone="ink">{Math.round(assessmentResult.score || 0)}%</Txt>
        </Ring>
        <Pill label={passed ? 'Skill verified' : 'Not verified yet'} tone={passed ? 'success' : 'warning'} icon={passed ? 'ShieldCheck' : 'RefreshCw'} />
        <Txt variant="body" tone="muted" align="center">
          {assessmentResult.correct_count ?? 0} of {assessmentResult.total_questions ?? questions.length} correct · pass mark {assessmentResult.pass_score ?? 70}%
        </Txt>
        {assessmentResult.feedback ? (
          <Inset tone={passed ? 'success' : 'warning'} style={{ alignSelf: 'stretch' }}>
            <Txt variant="small" tone="default">{assessmentResult.feedback}</Txt>
          </Inset>
        ) : null}
      </Stack>
    );
  } else if (!assessmentData) {
    body = (
      <Stack gap={12}>
        <Skeleton height={22} width="60%" />
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </Stack>
    );
  } else if (q) {
    body = (
      <Stack gap={space.md}>
        <Row justify="space-between">
          <Txt variant="overline" tone="subtle">Question {index + 1} of {questions.length}</Txt>
          <Txt variant="caption" tone="muted">{answered}/{questions.length} answered</Txt>
        </Row>
        <ProgressBar value={((index + 1) / questions.length) * 100} tone="accent" />
        <Txt variant="h3" tone="ink">{q.question_text || q.question}</Txt>
        <Stack gap={8}>
          {options.map((opt) => {
            const selected = selectedAnswers?.[q.id] === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt.key }))}
                style={({ hovered }) => [
                  styles.option,
                  webOnly({ cursor: 'pointer' }),
                  selected ? { backgroundColor: colors.lilac, borderColor: colors.lilacStrong } : hovered ? { backgroundColor: colors.surfaceMuted } : null,
                ]}
              >
                <View style={[styles.optKey, selected ? { backgroundColor: colors.ink } : null]}>
                  <Txt variant="small" weight={700} color={selected ? '#fff' : colors.text}>{opt.key}</Txt>
                </View>
                <Txt variant="body" tone="ink" style={{ flex: 1 }}>{opt.text}</Txt>
              </Pressable>
            );
          })}
        </Stack>
      </Stack>
    );
  }

  const footer = assessmentResult ? (
    <Button label="Done" onPress={onClose} />
  ) : assessmentData ? (
    <>
      <Button label="Previous" variant="secondary" icon="ArrowLeft" onPress={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} />
      {isLast ? (
        <Button label="Submit" icon="Send" onPress={onSubmit} loading={isSubmittingAssessment} />
      ) : (
        <Button label="Next" iconRight="ArrowRight" onPress={() => setIndex((i) => Math.min(questions.length - 1, i + 1))} />
      )}
    </>
  ) : null;

  return (
    (<Sheet
        visible={visible}
        onClose={onClose}
        title={assessmentData?.title || tl('{{v0}} assessment', {
          v0: assessmentData?.skill_name || 'Skill'
        })}
        subtitle={assessmentData ? tl('{{length}} questions{{v1}}', {
          length: questions.length,

          v1: assessmentData.duration_minutes ? tl('· {{duration_minutes}} min', {
            duration_minutes: assessmentData.duration_minutes
          }) : ''
        }) : 'Loading questions…'}
        icon="Target"
        tone="accent"
        footer={footer}
      >
      {body}
    </Sheet>)
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optKey: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
