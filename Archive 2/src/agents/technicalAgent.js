import { BaseAgent } from './baseAgent.js';
import { TheoryAgent } from './theoryAgent.js';
import { CodingAgent } from './codingAgent.js';

export class TechnicalAgent extends BaseAgent {
  constructor() {
    super('TechnicalAgent');
    this.theoryAgent = new TheoryAgent();
    this.codingAgent = new CodingAgent();
  }

  /**
   * Initializes technical round assets (theory questions and/or coding problems).
   */
  async setupRound(context, config = {}) {
    const theoryCount = parseInt(config.theoryCount, 10) ?? 3;
    const codingEnabled = config.codingEnabled !== false;
    const language = config.language || 'python';
    const difficulty = config.difficulty || 'Medium';

    const [theoryQuestions, codingProblem] = await Promise.all([
      theoryCount > 0 ? this.theoryAgent.generateQuestions(context, theoryCount) : Promise.resolve([]),
      codingEnabled ? this.codingAgent.generateProblem(context, { language, difficulty }) : Promise.resolve(null),
    ]);

    return {
      theoryQuestions,
      codingProblem,
      config: {
        theoryCount,
        codingEnabled,
        language,
        difficulty,
        theoryWeight: config.theoryWeight ?? 40,
        codingWeight: config.codingWeight ?? 60,
      },
    };
  }

  /**
   * Evaluates the complete technical round by aggregating Theory and Coding results.
   */
  async evaluateRound({ context, theoryQuestions, theoryTranscript, codingProblem, codingLanguage, codingSourceCode, config = {} }) {
    const theoryWeight = (config.theoryWeight ?? 40) / 100;
    const codingWeight = (config.codingWeight ?? 60) / 100;

    const [theoryResult, codingResult] = await Promise.all([
      theoryQuestions && theoryQuestions.length > 0
        ? this.theoryAgent.evaluateAnswers(context, theoryQuestions, theoryTranscript)
        : Promise.resolve({ score: 80, evaluation: {}, strengths: [], weaknesses: [], evidence: [] }),
      codingProblem
        ? this.codingAgent.evaluateSubmission(context, codingProblem, codingLanguage, codingSourceCode)
        : Promise.resolve({ score: 80, evaluation: {}, strengths: [], weaknesses: [], evidence: [] }),
    ]);

    const weightedScore = Math.round(theoryResult.score * theoryWeight + codingResult.score * codingWeight);

    return this.formatResult({
      roundType: 'TECHNICAL',
      score: weightedScore,
      maxScore: 100,
      evaluation: {
        theory: theoryResult.evaluation,
        theoryScore: theoryResult.score,
        coding: codingResult.evaluation,
        codingScore: codingResult.score,
        theoryWeight: theoryWeight * 100,
        codingWeight: codingWeight * 100,
      },
      evidence: [...(theoryResult.evidence || []), ...(codingResult.evidence || [])],
      strengths: [...new Set([...(theoryResult.strengths || []), ...(codingResult.strengths || [])])],
      weaknesses: [...new Set([...(theoryResult.weaknesses || []), ...(codingResult.weaknesses || [])])],
      nextAction: weightedScore >= 60 ? 'ADVANCE' : 'REVIEW_RECOMMENDED',
    });
  }
}
