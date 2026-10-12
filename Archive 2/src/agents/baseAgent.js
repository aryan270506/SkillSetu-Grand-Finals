import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const RETRYABLE_STATUSES = new Set([429, 500, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * BaseAgent
 * Abstract base class for all SkillSetu assessment agents.
 * Provides unified LLM invocations, exponential backoff, structured output validation,
 * and standard result envelopes.
 */
export class BaseAgent {
  constructor(name, model = DEFAULT_MODEL) {
    this.name = name;
    this.model = model;
  }

  /**
   * Invokes Gemini models with structured JSON schema output and retry logic.
   */
  async invokeGemini(systemInstruction, contents, schema, thinkingLevel = 'minimal', attempts = 5) {
    for (let i = 1; ; i++) {
      const t0 = Date.now();
      try {
        const res = await ai.models.generateContent({
          model: this.model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            temperature: 0.6,
            thinkingConfig: { thinkingLevel },
          },
        });
        console.log(`[Agent: ${this.name}] Gemini (${this.model}, ${thinkingLevel}) replied in ${Date.now() - t0}ms`);
        return JSON.parse(res.text);
      } catch (err) {
        if (i >= attempts || !RETRYABLE_STATUSES.has(err.status)) {
          console.error(`[Agent: ${this.name}] Gemini call failed permanently after ${i} attempts:`, err.message);
          throw err;
        }
        const backoffMs = err.status === 429 ? Math.min(30000, 3000 * 2 ** (i - 1)) : Math.min(10000, 1000 * 2 ** (i - 1));
        console.warn(`[Agent: ${this.name}] Gemini ${err.status}, backing off ${backoffMs}ms (${i}/${attempts - 1})…`);
        await sleep(backoffMs);
      }
    }
  }

  /**
   * Builds standardized agent result envelope.
   */
  formatResult({
    roundType,
    round_type,
    status = 'COMPLETED',
    score = 0,
    maxScore,
    max_score = 100,
    evaluation = {},
    evidence = [],
    integritySignals,
    integrity_signals = [],
    strengths = [],
    weaknesses = [],
    nextAction,
    next_action = 'ADVANCE',
    meta = {},
  }) {
    const finalRoundType = roundType || round_type;
    const finalMaxScore = maxScore !== undefined ? maxScore : max_score;
    const finalSignals = integritySignals || integrity_signals;
    const finalNextAction = nextAction || next_action;
    return {
      agent: this.name,
      roundType: finalRoundType,
      round_type: finalRoundType,
      status,
      score: Math.min(finalMaxScore, Math.max(0, Math.round(score * 10) / 10)),
      maxScore: finalMaxScore,
      max_score: finalMaxScore,
      evaluation,
      evidence,
      integritySignals: finalSignals,
      integrity_signals: finalSignals,
      strengths,
      weaknesses,
      nextAction: finalNextAction,
      next_action: finalNextAction,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Strips sensitive internal keys (e.g. correct answers, hidden tests) before sending data to candidate client.
   */
  sanitizeForCandidate(payload) {
    const clone = JSON.parse(JSON.stringify(payload));
    
    // Sanitize MCQs & Questions
    const questionLists = [clone.questions, clone.mcqs].filter(Array.isArray);
    questionLists.forEach((list) => {
      list.forEach((q) => {
        delete q.correct_answer;
        delete q.correct_option;
        delete q.explanation;
        delete q.rubric;
      });
    });

    // Sanitize Written Theory Questions
    if (Array.isArray(clone.theoryQuestions)) {
      clone.theoryQuestions.forEach((t) => {
        delete t.expected_key_points;
        delete t.evaluation_criteria;
        delete t.rubric;
      });
    }

    // Sanitize Coding Problems
    const codingProblems = [clone.coding_problem, clone.codingProblem, ...(Array.isArray(clone.codingQuestions) ? clone.codingQuestions : [])].filter(Boolean);
    codingProblems.forEach((cp) => {
      delete cp.hidden_tests;
      delete cp.private_evaluation_prompt;
      if (Array.isArray(cp.test_cases)) {
        cp.test_cases = cp.test_cases.filter((tc) => !tc.isHidden);
      }
    });

    return clone;
  }
}
