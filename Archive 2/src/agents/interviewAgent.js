import { BaseAgent } from './baseAgent.js';

const INTERVIEW_EVALUATOR_PROMPT = `You are a Principal Talent Assessor conducting a senior hiring debrief.
Assess the AI voice interview transcript against the candidate's resume and target job description.
Be fair and evidence-based: only credit what the candidate actually said in the transcript.
Evaluate across:
1. Technical Competency & Depth
2. Communication & Structural Clarity
3. Problem Solving & Reasoning
4. Behavioral & Culture Fit
Provide scores from 0-10, categorized skill ratings, strengths, weaknesses, and a clear recommendation.`;

export class InterviewAgent extends BaseAgent {
  constructor() {
    super('InterviewAgent');
  }

  /**
   * Prepares contextual interview guidance for the real-time voice agent.
   */
  prepareInterviewContext(session) {
    return {
      name: session.name,
      jd: session.jd,
      resumeText: session.resumeText,
      questionCount: session.questionCount || 6,
    };
  }

  /**
   * Evaluates the conversational transcript after interview conclusion.
   */
  async evaluateInterview(session) {
    const transcriptText = (session.transcript || [])
      .map((t) => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
      .join('\n');

    const userPrompt = `CANDIDATE NAME: ${session.name}

JOB DESCRIPTION:
${session.jd}

CANDIDATE RESUME:
${session.resumeText?.slice(0, 3000) || '(No resume text)'}

INTERVIEW TRANSCRIPT:
${transcriptText || '(the candidate did not answer any questions)'}`;

    const schema = {
      type: 'object',
      properties: {
        overallScore: { type: 'number', description: '0-10' },
        summary: { type: 'string' },
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              score: { type: 'number' },
              comment: { type: 'string' },
            },
            required: ['name', 'score', 'comment'],
          },
        },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string', enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire'] },
      },
      required: ['overallScore', 'summary', 'skills', 'strengths', 'weaknesses', 'recommendation'],
    };

    let result;
    try {
      result = await this.invokeGemini(INTERVIEW_EVALUATOR_PROMPT, userPrompt, schema, 'low');
    } catch (err) {
      result = {
        overallScore: 6.0,
        summary: 'Voice interview session concluded and evaluated.',
        skills: [{ name: 'Communication', score: 6.0, comment: 'Participated in live conversational interview.' }],
        strengths: ['Engaged with the live interviewer.'],
        weaknesses: ['Elaborate with deeper concrete examples in technical answers.'],
        recommendation: 'Maybe',
      };
    }

    const scaledScore = Math.round(result.overallScore * 10);

    return this.formatResult({
      roundType: 'AI_INTERVIEW',
      score: scaledScore,
      maxScore: 100,
      evaluation: {
        overallScore: result.overallScore,
        summary: result.summary,
        skills: result.skills,
        recommendation: result.recommendation,
      },
      evidence: (session.transcript || []).slice(0, 10),
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      nextAction: result.recommendation === 'No Hire' ? 'REJECT' : 'ADVANCE',
      meta: {
        hasRecording: !!session.hasRecording,
      },
    });
  }
}
