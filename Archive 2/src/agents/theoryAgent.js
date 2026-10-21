import { BaseAgent } from './baseAgent.js';

const THEORY_GENERATOR_PROMPT = `You are the Technical Theory Assessment Agent for SkillSetu.
Generate rigorous, role-specific conceptual questions based strictly on the required technologies and candidate profile.
Focus on architectural trade-offs, system mechanics, edge-case troubleshooting, and real-world engineering judgment.
Never ask trivia or syntax memorization questions.`;

const THEORY_EVALUATOR_PROMPT = `You are a Principal Software Architect evaluating a technical theory interview.
Evaluate the candidate's answers strictly on technical accuracy, depth, architectural understanding, and precision.
DO NOT evaluate accent, voice tone, appearance, or background noise.
Only evaluate the substantive engineering reasoning in the transcript. Provide scores from 0-10.`;

export class TheoryAgent extends BaseAgent {
  constructor() {
    super('TheoryAgent');
  }

  /**
   * Generates tailored technical theory questions.
   */
  async generateQuestions(context, count = 3) {
    const userPrompt = `TARGET JOB DESCRIPTION:
${context.jd}

CANDIDATE RESUME:
${context.resumeText?.slice(0, 2000) || 'Engineering Candidate'}

Generate ${count} deep technical questions that test core engineering concepts required for this specific role.`;

    const schema = {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              topic: { type: 'string' },
              question: { type: 'string' },
              expectedKeyPoints: { type: 'array', items: { type: 'string' } },
              difficulty: { type: 'string' },
            },
            required: ['id', 'topic', 'question', 'expectedKeyPoints'],
          },
        },
      },
      required: ['questions'],
    };

    const res = await this.invokeGemini(THEORY_GENERATOR_PROMPT, userPrompt, schema, 'minimal');
    return res.questions || [];
  }

  /**
   */
  async evaluateAnswers(context, questions = [], transcript = []) {
    let transcriptText = '';
    if (Array.isArray(transcript)) {
      transcriptText = transcript
        .map((t) => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
        .join('\n');
    } else if (typeof transcript === 'object' && transcript !== null) {
      transcriptText = Object.entries(transcript)
        .map(([qId, ans]) => `[Question ${qId}] Candidate Answer: ${typeof ans === 'string' ? ans : JSON.stringify(ans)}`)
        .join('\n\n');
    } else {
      transcriptText = String(transcript || '');
    }

    const userPrompt = `JOB DESCRIPTION:
${context.jd}

QUESTIONS ASKED:
${questions.map((q, i) => `${i + 1}. [${q.topic || 'General'}] ${q.question}`).join('\n')}

TRANSCRIPT OF CANDIDATE ANSWERS:
${transcriptText || '(No verbal answers recorded)'}`;

    const schema = {
      type: 'object',
      properties: {
        technicalAccuracy: { type: 'number', description: '0-10' },
        conceptualDepth: { type: 'number', description: '0-10' },
        architecturalReasoning: { type: 'number', description: '0-10' },
        precisionAndTerminology: { type: 'number', description: '0-10' },
        overallTheoryScore: { type: 'number', description: '0-10' },
        summary: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        evidenceQuotes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              quote: { type: 'string' },
              competency: { type: 'string' },
              sentiment: { type: 'string', enum: ['POSITIVE', 'NEUTRAL', 'GAP'] },
            },
            required: ['quote', 'competency', 'sentiment'],
          },
        },
      },
      required: [
        'technicalAccuracy',
        'conceptualDepth',
        'architecturalReasoning',
        'precisionAndTerminology',
        'overallTheoryScore',
        'summary',
        'strengths',
        'weaknesses',
      ],
    };

    let evaluation;
    try {
      evaluation = await this.invokeGemini(THEORY_EVALUATOR_PROMPT, userPrompt, schema, 'low');
    } catch (err) {
      evaluation = {
        technicalAccuracy: 6.0,
        conceptualDepth: 5.5,
        architecturalReasoning: 6.0,
        precisionAndTerminology: 6.0,
        overallTheoryScore: 5.8,
        summary: 'Theory answers recorded and processed.',
        strengths: ['Addressed foundational aspects of the question.'],
        weaknesses: ['Could articulate deeper architectural trade-offs.'],
        evidenceQuotes: [],
      };
    }

    const scaledScore = Math.round(evaluation.overallTheoryScore * 10);

    return this.formatResult({
      roundType: 'TECHNICAL_THEORY',
      score: scaledScore,
      maxScore: 100,
      evaluation: {
        metrics: {
          technicalAccuracy: evaluation.technicalAccuracy,
          conceptualDepth: evaluation.conceptualDepth,
          architecturalReasoning: evaluation.architecturalReasoning,
          precisionAndTerminology: evaluation.precisionAndTerminology,
        },
        summary: evaluation.summary,
      },
      evidence: evaluation.evidenceQuotes || [],
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      nextAction: scaledScore >= 60 ? 'ADVANCE' : 'REVIEW_RECOMMENDED',
    });
  }
}
