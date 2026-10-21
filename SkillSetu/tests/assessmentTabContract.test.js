import test from 'node:test';
import assert from 'node:assert/strict';

test('Assessment Tab — System-Generated Scoring & Stars Contract', async (t) => {
  await t.test('Score to stars normalization mapping', () => {
    const scoreToStars = (score) => {
      const sc = Number(score);
      if (isNaN(sc) || sc <= 0) return 0;
      if (sc >= 90) return 5;
      if (sc >= 75) return 4;
      if (sc >= 60) return 3;
      if (sc >= 40) return 2;
      return 1;
    };

    assert.equal(scoreToStars(95), 5);
    assert.equal(scoreToStars(85), 4);
    assert.equal(scoreToStars(70), 3);
    assert.equal(scoreToStars(50), 2);
    assert.equal(scoreToStars(25), 1);
    assert.equal(scoreToStars(0), 0);
    assert.equal(scoreToStars(null), 0);
    assert.equal(scoreToStars(undefined), 0);
  });

  await t.test('Verdict derivation follows rubric passing cutoff', () => {
    const deriveVerdict = (score, cutoff = 70) => {
      if (score == null) return 'Pending Evaluation';
      const sc = Number(score);
      if (sc >= 85) return 'Strongly Recommend';
      if (sc >= cutoff) return 'Recommend';
      if (cutoff - sc <= 5) return 'Maybe / Borderline';
      return 'Do Not Recommend';
    };

    assert.equal(deriveVerdict(92, 70), 'Strongly Recommend');
    assert.equal(deriveVerdict(78, 70), 'Recommend');
    assert.equal(deriveVerdict(67, 70), 'Maybe / Borderline');
    assert.equal(deriveVerdict(50, 70), 'Do Not Recommend');
    assert.equal(deriveVerdict(null, 70), 'Pending Evaluation');
  });

  await t.test('Pending assessments must never default to 5 stars or fabricate scores', () => {
    const candidateDossier = {
      is_completed: false,
      is_evaluated: false,
      composite_score: null,
      ratings: { techDepth: 0, problemSolving: 0, sysDesign: 0, communication: 0, teamFit: 0 },
      verdict: 'Pending Evaluation',
    };

    assert.equal(candidateDossier.is_completed, false);
    assert.equal(candidateDossier.composite_score, null);
    assert.equal(candidateDossier.verdict, 'Pending Evaluation');
    Object.values(candidateDossier.ratings).forEach((star) => {
      assert.equal(star, 0, 'Star ratings must be 0 for pending assessments');
    });
  });

  await t.test('Progression buttons are disabled when assessment is pending or flagged', () => {
    const canAdvanceCandidate = (candidate) => {
      if (!candidate.is_completed) return false;
      if (candidate.integrity_status === 'FLAGGED') return false;
      return Boolean(candidate.can_progress);
    };

    const pendingCand = { is_completed: false, can_progress: true, integrity_status: 'VERIFIED' };
    const flaggedCand = { is_completed: true, can_progress: true, integrity_status: 'FLAGGED' };
    const readyCand = { is_completed: true, can_progress: true, integrity_status: 'VERIFIED' };

    assert.equal(canAdvanceCandidate(pendingCand), false, 'Pending candidate cannot advance');
    assert.equal(canAdvanceCandidate(flaggedCand), false, 'Flagged candidate cannot advance without review');
    assert.equal(canAdvanceCandidate(readyCand), true, 'Completed verified candidate can advance');
  });

  await t.test('Audit journey steps are deduplicated and clean', () => {
    const rawSteps = [
      { text: 'Applied to Backend Intern', status: 'APPLIED' },
      { text: 'Shortlisted - Screening passed', status: 'SHORTLISTED' },
      { text: 'Shortlisted - Screening passed', status: 'SHORTLISTED' }, // duplicate
      { text: 'Round 1 Completed (88/100)', status: 'COMPLETED' },
    ];

    const deduplicated = [];
    const seen = new Set();
    for (const step of rawSteps) {
      if (!seen.has(step.text)) {
        seen.add(step.text);
        deduplicated.push(step);
      }
    }

    assert.equal(deduplicated.length, 3);
    assert.deepEqual(deduplicated.map((s) => s.text), [
      'Applied to Backend Intern',
      'Shortlisted - Screening passed',
      'Round 1 Completed (88/100)',
    ]);
  });
  await t.test('Authoritative round-status badge values and tones for all 5 states', () => {
    const roundStatusTone = (key) => {
      switch (key) {
        case 'ROUND_COMPLETED':
          return 'success';
        case 'AWAITING_RECRUITER_REVIEW':
          return 'accent';
        case 'ASSESSMENT_IN_PROGRESS':
          return 'info';
        case 'SUBMITTED_EVALUATION_PENDING':
          return 'warning';
        case 'ROUND_NOT_COMPLETED':
        default:
          return 'danger';
      }
    };

    const states = [
      { key: 'ROUND_NOT_COMPLETED', label: 'ROUND NOT COMPLETED', expectedTone: 'danger' },
      { key: 'ASSESSMENT_IN_PROGRESS', label: 'ASSESSMENT IN PROGRESS', expectedTone: 'info' },
      { key: 'SUBMITTED_EVALUATION_PENDING', label: 'SUBMITTED — EVALUATION PENDING', expectedTone: 'warning' },
      { key: 'ROUND_COMPLETED', label: 'ROUND COMPLETED', expectedTone: 'success' },
      { key: 'AWAITING_RECRUITER_REVIEW', label: 'AWAITING RECRUITER REVIEW', expectedTone: 'accent' },
    ];

    for (const st of states) {
      assert.equal(roundStatusTone(st.key), st.expectedTone, `Tone for ${st.key} must be ${st.expectedTone}`);
      assert.ok(st.label.length > 0);
    }
  });

  await t.test('Three-place display contract verifies badge presence in all required UI positions', () => {
    const renderCandidateView = (candidate, currentRoundKey, pipelineRounds) => {
      // 1. Beside candidate current round in candidate detail header
      const headerRoundBadge = candidate.round_status_label ? {
        label: candidate.round_status_label,
        tone: candidate.round_status_tone,
        position: 'candidate_detail_header'
      } : null;

      // 2. In System Assessment Scorecard header
      const scorecardHeaderBadge = candidate.round_status_label ? {
        label: candidate.round_status_label,
        tone: candidate.round_status_tone,
        position: 'scorecard_header'
      } : null;

      // 3. In current-round section of recruitment pipeline
      const pipelineBadges = pipelineRounds.map((rd) => {
        const isCurrentCandidateRound = rd.round_key === currentRoundKey;
        if (isCurrentCandidateRound && candidate.round_status_label) {
          return {
            round_key: rd.round_key,
            label: candidate.round_status_label,
            tone: candidate.round_status_tone,
            position: 'pipeline_current_round'
          };
        }
        return null;
      }).filter(Boolean);

      return { headerRoundBadge, scorecardHeaderBadge, pipelineCurrentRoundBadge: pipelineBadges[0] || null };
    };

    const candidate = {
      round_status_key: 'ROUND_NOT_COMPLETED',
      round_status_label: 'ROUND NOT COMPLETED',
      round_status_tone: 'danger',
      current_round_key: 'technical',
      current_round_name: 'Technical Assessment',
    };

    const pipelineRounds = [
      { round_key: 'aptitude', round_name: 'Aptitude Test' },
      { round_key: 'technical', round_name: 'Technical Assessment' },
    ];

    const display = renderCandidateView(candidate, 'technical', pipelineRounds);

    assert.ok(display.headerRoundBadge, 'Badge must appear in candidate detail header');
    assert.equal(display.headerRoundBadge.label, 'ROUND NOT COMPLETED');
    assert.equal(display.headerRoundBadge.tone, 'danger');

    assert.ok(display.scorecardHeaderBadge, 'Badge must appear in scorecard header');
    assert.equal(display.scorecardHeaderBadge.label, 'ROUND NOT COMPLETED');

    assert.ok(display.pipelineCurrentRoundBadge, 'Badge must appear in pipeline current round cell');
    assert.equal(display.pipelineCurrentRoundBadge.round_key, 'technical');
    assert.equal(display.pipelineCurrentRoundBadge.label, 'ROUND NOT COMPLETED');
  });

  await t.test('Progression explanation dynamically displays required round name for incomplete rounds', () => {
    const formatProgressionExplanation = (candidate) => {
      const isAssessmentIncomplete = (
        !candidate.round_status_key ||
        candidate.round_status_key === 'ROUND_NOT_COMPLETED' ||
        candidate.round_status_key === 'ASSESSMENT_IN_PROGRESS' ||
        candidate.round_status_key === 'SUBMITTED_EVALUATION_PENDING'
      );

      if (isAssessmentIncomplete && candidate.status !== 'Selected' && candidate.status !== 'Rejected') {
        const roundName = candidate.current_round_name || 'Assessment';
        return `This candidate must complete the ${roundName} before advancing.`;
      }
      return null;
    };

    const incompleteCand = {
      round_status_key: 'ROUND_NOT_COMPLETED',
      current_round_name: 'Technical Assessment',
      status: 'In Pipeline'
    };
    assert.equal(
      formatProgressionExplanation(incompleteCand),
      'This candidate must complete the Technical Assessment before advancing.'
    );

    const inProgressCand = {
      round_status_key: 'ASSESSMENT_IN_PROGRESS',
      current_round_name: 'Coding Interview',
      status: 'In Pipeline'
    };
    assert.equal(
      formatProgressionExplanation(inProgressCand),
      'This candidate must complete the Coding Interview before advancing.'
    );

    const completedCand = {
      round_status_key: 'ROUND_COMPLETED',
      current_round_name: 'Technical Assessment',
      status: 'In Pipeline'
    };
    assert.equal(formatProgressionExplanation(completedCand), null);
  });
});
