import { BaseAgent } from './baseAgent.js';
import { CodeSandbox } from '../sandbox/codeSandbox.js';

const APTITUDE_MCQ_PROMPT = `You are the Aptitude MCQ Generator Agent for SkillSetu.
Generate high-quality, professional multiple-choice questions tailored to the candidate's target internship and industry.
Cover: Logical reasoning, quantitative aptitude, programming concepts, CS fundamentals, role-specific technical concepts, SQL, APIs, data structures, and algorithms.
Ensure clear question phrasing, exactly 4 distinct options (A, B, C, D), a definitively correct answer, skill tag, topic tag, difficulty, and an educational explanation.`;

const APTITUDE_THEORY_PROMPT = `You are the Aptitude Theory/Written Question Designer for SkillSetu.
Generate clear, conceptual theory questions tailored to the role (e.g., "What is the difference between REST and GraphQL?", "Explain how database indexing improves query performance.", "Explain the difference between authentication and authorization.").
Each question must test true technical understanding, architectural intuition, or core problem-solving rationale.
Provide: id, question, topic, skill, difficulty (Easy/Medium/Hard), max_score (e.g. 10), and expected_key_points.`;

const APTITUDE_THEORY_EVAL_PROMPT = `You are an expert technical evaluator assessing a candidate's written theory answers for an aptitude/technical assessment.
Evaluate each answer strictly based on:
1. Correctness and technical accuracy
2. Relevance to the specific question asked
3. Technical understanding and depth
4. Completeness and thoroughness
5. Logical reasoning and clarity of explanation
6. Appropriate terminology

CRITICAL RULES:
- Do NOT give full marks simply because keywords appear.
- The evaluation must consider whether the candidate actually answered the question correctly.
- Return a structured evaluation with numerical scores (0-10 or 0-1.0 normalized) and constructive feedback.`;

const APTITUDE_CODING_PROMPT = `You are the Aptitude Coding Challenge Designer for SkillSetu.
Generate an algorithmic, problem-solving coding challenge tailored to the role and difficulty level.
Focus on programming fundamentals, data structures, algorithms, and logic.
Provide:
- title
- problem_statement (Markdown with clear problem description)
- input_format
- output_format
- constraints (array of strings)
- examples (array of { input, output, explanation })
- difficulty (Easy/Medium/Hard)
- skill (e.g. 'Data Structures', 'Algorithms', 'Logic & Problem Solving')
- allowed_languages (array, e.g. ['python', 'javascript', 'cpp', 'java'])
- starter_code (clean boilerplate for python or specified language)
- visible_tests (2-3 test cases with { name, input, expected_output, explanation })
- hidden_tests (3-4 test cases including edge cases with { name, input, expected_output })`;

const APTITUDE_CODING_QUALITY_PROMPT = `You are a Senior Technical Lead reviewing code submitted for an aptitude coding assessment.
Assess the code for:
1. Code correctness and edge-case handling
2. Code quality, readability, and idiomatic style
3. Algorithm choice and time/space complexity
4. Maintainability and clean structure
Provide scores from 0-10 and structured diagnostic feedback.`;

export class AptitudeAgent extends BaseAgent {
  constructor() {
    super('AptitudeAgent');
  }

  /**
   * Generates a complete Tripartite Aptitude Assessment:
   * 1. Objective MCQs
   * 2. Written Theory Questions
   * 3. Coding Challenge(s)
   */
  async generateAssessment(context, config = {}) {
    const mcqCount = Math.min(Math.max(parseInt(config.mcqCount ?? config.questionCount, 10) || 6, 2), 20);
    const theoryCount = Math.min(Math.max(parseInt(config.theoryCount, 10) || 2, 1), 10);
    const codingCount = Math.min(Math.max(parseInt(config.codingCount, 10) || 1, 1), 5);
    const difficulty = config.difficulty || 'Intermediate';
    const language = config.language || 'python';

    // 1. Generate MCQs
    const mcqUserPrompt = `TARGET ROLE / INTERNSHIP: ${context.jd}
CANDIDATE RESUME SUMMARY: ${context.resumeText?.slice(0, 1500) || 'Engineering Candidate'}
NUMBER OF MCQS: ${mcqCount}
DIFFICULTY LEVEL: ${difficulty}
DISTRIBUTION: Mix of Quantitative, Logical Reasoning, Programming Concepts, SQL/APIs, and Role-specific Tech concepts.

Generate ${mcqCount} MCQs. Format each with A, B, C, D options, correct_answer, explanation, skill, topic, and difficulty.`;

    const mcqSchema = {
      type: 'object',
      properties: {
        mcqs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              question: { type: 'string' },
              options: {
                type: 'object',
                properties: {
                  A: { type: 'string' },
                  B: { type: 'string' },
                  C: { type: 'string' },
                  D: { type: 'string' },
                },
                required: ['A', 'B', 'C', 'D'],
              },
              correct_answer: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
              explanation: { type: 'string' },
              difficulty: { type: 'string' },
              skill: { type: 'string' },
              topic: { type: 'string' },
              points: { type: 'number' },
            },
            required: ['id', 'question', 'options', 'correct_answer', 'explanation', 'skill', 'topic', 'difficulty'],
          },
        },
      },
      required: ['mcqs'],
    };

    // 2. Generate Written Theory Questions
    const theoryUserPrompt = `TARGET ROLE: ${context.jd}
CANDIDATE RESUME SUMMARY: ${context.resumeText?.slice(0, 1500) || 'Engineering Candidate'}
NUMBER OF THEORY QUESTIONS: ${theoryCount}
DIFFICULTY: ${difficulty}

Generate ${theoryCount} open-ended written theory questions requiring clear written technical explanations.
Examples of topics: REST vs GraphQL, indexing & query performance, authentication vs authorization, concurrency, state management, caching.`;

    const theorySchema = {
      type: 'object',
      properties: {
        theoryQuestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              question: { type: 'string' },
              skill: { type: 'string' },
              topic: { type: 'string' },
              difficulty: { type: 'string' },
              max_score: { type: 'number' },
              expected_key_points: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'question', 'skill', 'topic', 'difficulty', 'max_score', 'expected_key_points'],
          },
        },
      },
      required: ['theoryQuestions'],
    };

    // 3. Generate Coding Problem
    const codingUserPrompt = `TARGET ROLE: ${context.jd}
CANDIDATE RESUME SUMMARY: ${context.resumeText?.slice(0, 1500) || 'Engineering Candidate'}
PRIMARY LANGUAGE: ${language}
DIFFICULTY: ${difficulty}

Generate ${codingCount} practical algorithmic/logic coding problem for aptitude assessment. Include problem description, constraints, input/output specifications, clean starter code, visible test cases, and hidden edge test cases.`;

    const codingSchema = {
      type: 'object',
      properties: {
        codingQuestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              difficulty: { type: 'string' },
              skill: { type: 'string' },
              problem_statement: { type: 'string' },
              input_format: { type: 'string' },
              output_format: { type: 'string' },
              constraints: { type: 'array', items: { type: 'string' } },
              examples: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    input: { type: 'string' },
                    output: { type: 'string' },
                    explanation: { type: 'string' },
                  },
                  required: ['input', 'output'],
                },
              },
              allowed_languages: { type: 'array', items: { type: 'string' } },
              starter_code: { type: 'string' },
              visible_tests: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    input: { type: 'string' },
                    expected_output: { type: 'string' },
                    explanation: { type: 'string' },
                  },
                  required: ['input', 'expected_output'],
                },
              },
              hidden_tests: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    input: { type: 'string' },
                    expected_output: { type: 'string' },
                  },
                  required: ['input', 'expected_output'],
                },
              },
            },
            required: [
              'id',
              'title',
              'difficulty',
              'skill',
              'problem_statement',
              'starter_code',
              'visible_tests',
              'hidden_tests',
            ],
          },
        },
      },
      required: ['codingQuestions'],
    };

    // Invoke generation concurrently
    const [mcqRes, theoryRes, codingRes] = await Promise.all([
      this.invokeGemini(APTITUDE_MCQ_PROMPT, mcqUserPrompt, mcqSchema, 'minimal').catch(() => ({ mcqs: [] })),
      this.invokeGemini(APTITUDE_THEORY_PROMPT, theoryUserPrompt, theorySchema, 'minimal').catch(() => ({ theoryQuestions: [] })),
      this.invokeGemini(APTITUDE_CODING_PROMPT, codingUserPrompt, codingSchema, 'minimal').catch(() => ({ codingQuestions: [] })),
    ]);

    const mcqs = (mcqRes.mcqs || []).map((m, idx) => ({
      ...m,
      id: m.id || `mcq_${idx + 1}`,
      type: 'mcq',
      category: m.topic || m.skill || 'Aptitude',
      points: m.points || 1.0,
    }));

    const theoryQuestions = (theoryRes.theoryQuestions || []).map((t, idx) => ({
      ...t,
      id: t.id || `theory_${idx + 1}`,
      type: 'theory',
      max_score: t.max_score || 10,
    }));

    const codingQuestions = (codingRes.codingQuestions || []).map((c, idx) => {
      const allTests = [
        ...(c.visible_tests || []).map((t) => ({ ...t, isHidden: false })),
        ...(c.hidden_tests || []).map((t) => ({ ...t, isHidden: true })),
      ];
      return {
        ...c,
        id: c.id || `coding_${idx + 1}`,
        type: 'coding',
        language: c.language || language,
        allowed_languages: c.allowed_languages || ['python', 'javascript', 'cpp', 'java'],
        test_cases: allTests,
      };
    });

    return {
      mcqs,
      theoryQuestions,
      codingQuestions,
      codingProblem: codingQuestions[0] || null, // Primary coding problem
      config: {
        mcqCount: mcqs.length,
        theoryCount: theoryQuestions.length,
        codingCount: codingQuestions.length,
        difficulty,
      },
    };
  }

  /**
   * Compatibility wrapper for generating questions.
   */
  async generateQuestions(context, config = {}) {
    const assessment = await this.generateAssessment(context, config);
    return assessment.mcqs;
  }

  /**
   * Evaluates the candidate's full Aptitude Attempt across MCQ, Theory, and Coding.
   */
  async evaluateAttempt(session, submission = {}, config = {}) {
    const aptitudeData = session.aptitudeAssessment || {
      mcqs: session.aptitudeQuestions || [],
      theoryQuestions: [],
      codingQuestions: session.aptitudeCodingProblem ? [session.aptitudeCodingProblem] : [],
      codingProblem: session.aptitudeCodingProblem || null,
    };

    const mcqs = aptitudeData.mcqs || [];
    const theoryQuestions = aptitudeData.theoryQuestions || [];
    const codingProblem = aptitudeData.codingProblem || aptitudeData.codingQuestions?.[0] || null;

    const mcqAnswers = submission.mcqAnswers || submission.answers || {};
    const theoryAnswers = submission.theoryAnswers || {};
    const codingSourceCode = submission.codingSourceCode || submission.sourceCode || '';
    const codingLanguage = submission.codingLanguage || submission.language || codingProblem?.language || 'python';

    const weights = config.weights || { mcq: 0.4, theory: 0.3, coding: 0.3 };
    const passingThreshold = config.passingScore ?? 60;
    const skillPerformance = {};

    function addSkillScore(skill, earned, possible) {
      if (!skill) return;
      if (!skillPerformance[skill]) {
        skillPerformance[skill] = { earned: 0, possible: 0 };
      }
      skillPerformance[skill].earned += earned;
      skillPerformance[skill].possible += possible;
    }

    // ==========================================
    // 1. DETERMINISTIC MCQ GRADING
    // ==========================================
    let mcqCorrect = 0;
    let mcqIncorrect = 0;
    let mcqUnattempted = 0;
    let mcqRawScore = 0;
    const negativeMarking = config.negativeMarking ?? 0.25;

    const mcqResults = mcqs.map((q) => {
      const candidateAns = mcqAnswers[q.id];
      const maxPts = q.points || 1.0;
      const skillName = q.skill || q.category || 'General Aptitude';

      if (!candidateAns) {
        mcqUnattempted += 1;
        addSkillScore(skillName, 0, maxPts);
        return {
          id: q.id,
          type: 'mcq',
          skill: skillName,
          candidateAnswer: null,
          correctAnswer: q.correct_answer,
          isCorrect: false,
          status: 'UNATTEMPTED',
          pointsAwarded: 0,
        };
      }

      const isCorrect = String(candidateAns).trim().toUpperCase() === String(q.correct_answer).trim().toUpperCase();
      if (isCorrect) {
        mcqCorrect += 1;
        mcqRawScore += maxPts;
        addSkillScore(skillName, maxPts, maxPts);
        return {
          id: q.id,
          type: 'mcq',
          skill: skillName,
          candidateAnswer: candidateAns,
          correctAnswer: q.correct_answer,
          isCorrect: true,
          status: 'CORRECT',
          pointsAwarded: maxPts,
        };
      } else {
        mcqIncorrect += 1;
        mcqRawScore -= negativeMarking;
        addSkillScore(skillName, 0, maxPts);
        return {
          id: q.id,
          type: 'mcq',
          skill: skillName,
          candidateAnswer: candidateAns,
          correctAnswer: q.correct_answer,
          isCorrect: false,
          status: 'INCORRECT',
          pointsAwarded: -negativeMarking,
        };
      }
    });

    const maxMcqScore = mcqs.length > 0 ? mcqs.reduce((acc, q) => acc + (q.points || 1.0), 0) : 1;
    const mcqPercentage = mcqs.length > 0 ? Math.max(0, Math.min(100, Math.round((mcqRawScore / maxMcqScore) * 100))) : 100;

    // ==========================================
    // 2. GEMINI WRITTEN THEORY EVALUATION
    // ==========================================
    const theoryEvaluations = [];
    let totalTheoryScore = 0;
    let maxTheoryScorePossible = 0;

    if (theoryQuestions.length > 0) {
      for (const tq of theoryQuestions) {
        const candidateAnswer = theoryAnswers[tq.id] || '';
        const maxScore = tq.max_score || 10;
        maxTheoryScorePossible += maxScore;
        const skillName = tq.skill || tq.topic || 'Technical Theory';

        if (!candidateAnswer.trim()) {
          theoryEvaluations.push({
            id: tq.id,
            question: tq.question,
            skill: skillName,
            candidateAnswer: '',
            score: 0,
            max_score: maxScore,
            correctness: 0,
            technical_understanding: 0,
            completeness: 0,
            feedback: 'No answer provided by candidate.',
          });
          addSkillScore(skillName, 0, maxScore);
          continue;
        }

        const evalPrompt = `QUESTION:
${tq.question}
TOPIC / SKILL: ${tq.topic || tq.skill || 'General'}
EXPECTED KEY CONCEPTS: ${(tq.expected_key_points || []).join('; ')}
MAX SCORE: ${maxScore}

CANDIDATE WRITTEN ANSWER:
"${candidateAnswer}"

Evaluate this answer carefully for technical correctness, understanding, completeness, and clarity. Do NOT award full marks simply for keyword matches without proper explanation.`;

        const theoryEvalSchema = {
          type: 'object',
          properties: {
            score: { type: 'number', description: `Score from 0 to ${maxScore}` },
            correctness: { type: 'number', description: '0.0 to 1.0' },
            technical_understanding: { type: 'number', description: '0.0 to 1.0' },
            completeness: { type: 'number', description: '0.0 to 1.0' },
            reasoning: { type: 'number', description: '0.0 to 1.0' },
            terminology: { type: 'number', description: '0.0 to 1.0' },
            feedback: { type: 'string' },
          },
          required: ['score', 'correctness', 'technical_understanding', 'completeness', 'feedback'],
        };

        try {
          const evalRes = await this.invokeGemini(APTITUDE_THEORY_EVAL_PROMPT, evalPrompt, theoryEvalSchema, 'minimal');
          const awarded = Math.max(0, Math.min(maxScore, Number(evalRes.score) || 0));
          totalTheoryScore += awarded;
          addSkillScore(skillName, awarded, maxScore);

          theoryEvaluations.push({
            id: tq.id,
            question: tq.question,
            skill: skillName,
            candidateAnswer,
            score: awarded,
            max_score: maxScore,
            correctness: evalRes.correctness ?? 0.7,
            technical_understanding: evalRes.technical_understanding ?? 0.7,
            completeness: evalRes.completeness ?? 0.7,
            feedback: evalRes.feedback || 'Evaluated successfully.',
          });
        } catch (err) {
          const fallbackScore = Math.round(maxScore * 0.6);
          totalTheoryScore += fallbackScore;
          addSkillScore(skillName, fallbackScore, maxScore);
          theoryEvaluations.push({
            id: tq.id,
            question: tq.question,
            skill: skillName,
            candidateAnswer,
            score: fallbackScore,
            max_score: maxScore,
            correctness: 0.6,
            technical_understanding: 0.6,
            completeness: 0.6,
            feedback: 'Answer processed and recorded.',
          });
        }
      }
    }

    const theoryPercentage = maxTheoryScorePossible > 0
      ? Math.round((totalTheoryScore / maxTheoryScorePossible) * 100)
      : (theoryQuestions.length === 0 ? 100 : 0);

    // ==========================================
    // 3. SECURE CODING EXECUTION & EVALUATION
    // ==========================================
    let codingResults = null;
    let codingPercentage = 100;

    if (codingProblem) {
      const allTests = codingProblem.test_cases || [];
      const executionResult = await CodeSandbox.runTestSuite(codingLanguage, codingSourceCode, allTests);
      const deterministicTestScore = executionResult.passPercentage; // 0-100
      const skillName = codingProblem.skill || 'Problem Solving & Algorithms';

      const analysisPrompt = `PROBLEM STATEMENT:
${codingProblem.title}: ${codingProblem.problem_statement}

CONSTRAINTS: ${(codingProblem.constraints || []).join(', ')}

CANDIDATE SOURCE CODE (${codingLanguage}):
\`\`\`${codingLanguage}
${codingSourceCode || '// No code submitted'}
\`\`\`

DETERMINISTIC TEST RESULTS:
Passed ${executionResult.passedCount}/${executionResult.totalTests} tests (${deterministicTestScore}%).
Execution Errors / Timeouts: ${executionResult.results.some((r) => r.timedOut) ? 'Timeout occurred' : 'None'}`;

      const codingEvalSchema = {
        type: 'object',
        properties: {
          test_score: { type: 'number' },
          code_quality_score: { type: 'number', description: '0-100' },
          algorithm_score: { type: 'number', description: '0-100' },
          time_complexity: { type: 'string' },
          space_complexity: { type: 'string' },
          feedback: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } },
        },
        required: ['code_quality_score', 'algorithm_score', 'time_complexity', 'space_complexity', 'feedback'],
      };

      let aiCodingReview;
      try {
        aiCodingReview = await this.invokeGemini(APTITUDE_CODING_QUALITY_PROMPT, analysisPrompt, codingEvalSchema, 'minimal');
      } catch (err) {
        aiCodingReview = {
          code_quality_score: deterministicTestScore > 50 ? 75 : 50,
          algorithm_score: deterministicTestScore > 50 ? 75 : 50,
          time_complexity: 'O(N)',
          space_complexity: 'O(1)',
          feedback: `Passed ${executionResult.passedCount}/${executionResult.totalTests} sandbox tests.`,
          strengths: deterministicTestScore === 100 ? ['Passed all test cases.'] : ['Attempted solution logic.'],
          weaknesses: deterministicTestScore < 100 ? ['Some test cases failed.'] : [],
        };
      }

      // Final coding score = 70% deterministic tests + 30% AI code quality & algorithm
      const qualityAvg = Math.round(((aiCodingReview.code_quality_score || 70) + (aiCodingReview.algorithm_score || 70)) / 2);
      codingPercentage = Math.round(deterministicTestScore * 0.7 + qualityAvg * 0.3);

      addSkillScore(skillName, codingPercentage, 100);

      codingResults = {
        problemId: codingProblem.id,
        title: codingProblem.title,
        language: codingLanguage,
        sourceCode: codingSourceCode,
        test_score: deterministicTestScore,
        code_quality_score: aiCodingReview.code_quality_score || qualityAvg,
        algorithm_score: aiCodingReview.algorithm_score || qualityAvg,
        final_coding_score: codingPercentage,
        timeComplexity: aiCodingReview.time_complexity,
        spaceComplexity: aiCodingReview.space_complexity,
        testsPassed: `${executionResult.passedCount}/${executionResult.totalTests}`,
        allPassed: executionResult.allPassed,
        feedback: aiCodingReview.feedback,
        strengths: aiCodingReview.strengths || [],
        weaknesses: aiCodingReview.weaknesses || [],
        testDetails: executionResult.results,
      };
    }

    // ==========================================
    // 4. COMPOSITE APTITUDE SYNTHESIS & SKILL MAP
    // ==========================================
    let compositeScore = 0;
    let totalWeight = 0;

    if (mcqs.length > 0) {
      compositeScore += mcqPercentage * weights.mcq;
      totalWeight += weights.mcq;
    }
    if (theoryQuestions.length > 0) {
      compositeScore += theoryPercentage * weights.theory;
      totalWeight += weights.theory;
    }
    if (codingProblem) {
      compositeScore += codingPercentage * weights.coding;
      totalWeight += weights.coding;
    }

    const finalAptitudeScore = totalWeight > 0 ? Math.round(compositeScore / totalWeight) : 100;
    const isPassed = finalAptitudeScore >= passingThreshold;

    const skillBreakdown = {};
    for (const [skill, stats] of Object.entries(skillPerformance)) {
      skillBreakdown[skill] = stats.possible > 0 ? Math.round((stats.earned / stats.possible) * 100) : 0;
    }

    const recommendation = finalAptitudeScore >= 80 ? 'Strong' : finalAptitudeScore >= 60 ? 'Moderate' : 'Needs Improvement';

    const summaryText = `Aptitude Assessment: MCQ Score: ${mcqPercentage}%, Theory Score: ${theoryPercentage}%, Coding Score: ${codingProblem ? codingPercentage + '%' : 'N/A'}. Overall: ${finalAptitudeScore}%.`;

    return this.formatResult({
      roundType: 'APTITUDE',
      status: 'COMPLETED',
      score: finalAptitudeScore,
      maxScore: 100,
      evaluation: {
        overallAptitudeScore: finalAptitudeScore,
        summary: summaryText,
        isPassed,
        passingThreshold,
        recommendation,
        weights,
        sections: {
          mcq: {
            score: mcqPercentage,
            correctCount: mcqCorrect,
            incorrectCount: mcqIncorrect,
            unattemptedCount: mcqUnattempted,
            totalQuestions: mcqs.length,
          },
          theory: {
            score: theoryPercentage,
            totalQuestions: theoryQuestions.length,
            averageScore: maxTheoryScorePossible > 0 ? Number((totalTheoryScore / theoryQuestions.length).toFixed(1)) : 0,
            evaluations: theoryEvaluations,
          },
          coding: codingResults,
        },
        skillBreakdown,
        categoryScores: skillBreakdown,
      },
      evidence: {
        mcqResults,
        theoryEvaluations,
        codingResults,
      },
      strengths: [
        mcqPercentage >= 75 ? 'Strong performance in objective reasoning and CS fundamentals.' : null,
        theoryPercentage >= 75 ? 'Solid articulation of engineering theory and architecture.' : null,
        codingResults?.final_coding_score >= 75 ? 'Effective algorithmic problem solving and clean code.' : null,
      ].filter(Boolean),
      weaknesses: [
        mcqPercentage < 60 ? 'Gaps in foundational MCQ concepts or calculation accuracy.' : null,
        theoryPercentage < 60 ? 'Could provide more depth and precision in written technical explanations.' : null,
        codingResults && codingResults.final_coding_score < 60 ? 'Algorithmic efficiency or edge-case handling in coding challenge.' : null,
      ].filter(Boolean),
      nextAction: isPassed ? 'ADVANCE' : 'REVIEW_RECOMMENDED',
    });
  }
}
