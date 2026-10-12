import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const EVALUATOR_PROMPT = `You are an expert hiring evaluator. Assess the interview transcript against the job description and resume.
Be fair and evidence-based: only credit what the candidate actually said. Scores are 0-10.
If the candidate gave few or empty answers, score accordingly.`;

function context(session) {
  const transcript = session.transcript
    .map((t) => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.text}`)
    .join('\n');
  return `CANDIDATE NAME: ${session.name}

JOB DESCRIPTION:
${session.jd}

RESUME:
${session.resumeText}

INTERVIEW TRANSCRIPT:
${transcript || '(the candidate did not answer any questions)'}`;
}

const RETRYABLE = new Set([429, 500, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// thinkingLevel: 'minimal' keeps live turns ~1s; evaluation can afford a bit more reasoning
async function generateJson(systemInstruction, contents, schema, thinkingLevel = 'minimal', attempts = 4) {
  for (let i = 1; ; i++) {
    const t0 = Date.now();
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          temperature: 0.7,
          thinkingConfig: { thinkingLevel },
        },
      });
      console.log(`Gemini ${thinkingLevel} reply in ${Date.now() - t0}ms`);
      return JSON.parse(res.text);
    } catch (err) {
      // Gemini often returns 503 "high demand" briefly; back off and retry
      if (i >= attempts || !RETRYABLE.has(err.status)) throw err;
      console.warn(`Gemini ${err.status}, retrying (${i}/${attempts - 1})…`);
      await sleep(500 * 2 ** (i - 1));
    }
  }
}

export async function evaluate(session) {
  return generateJson(EVALUATOR_PROMPT, context(session), {
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
  }, 'low');
}
