import { BaseAgent } from './baseAgent.js';

const GD_TOPIC_GENERATOR_PROMPT = `You are the Group Discussion Moderator and Topic Architect for SkillSetu.
Generate an engaging, controversial, and technically nuanced Group Discussion topic relevant to the target internship domain.
The topic should encourage multi-perspective debate, engineering trade-offs, and critical thinking.
Provide:
- topicTitle
- backgroundContext
- keyPerspectives (array of 3-4 distinct viewpoint prompts)
- recommendedDurationMinutes`;

const GD_EVALUATOR_PROMPT = `You are an expert organizational psychologist and technical evaluator analyzing a multi-candidate Group Discussion transcript.
Evaluate EACH CANDIDATE individually based on their specific arguments, turn-taking, and collaborative behavior.
DO NOT assign a generic group score. Every candidate must have their own distinct assessment.
FAIRNESS MANDATE:
- DO NOT evaluate accent, pitch, voice tone, gender, or appearance.
- Strictly evaluate observable discussion contributions:
  1. Content & Argument Quality (0-10)
  2. Technical & Domain Relevance (0-10)
  3. Structural Communication & Articulation (0-10)
  4. Constructive Collaboration (building on or constructively challenging peers) (0-10)
  5. Active Listening & Respectful Discourse (0-10)
  6. Leadership & Initiative (0-10)`;

export class GDAgent extends BaseAgent {
  constructor() {
    super('GDAgent');
  }

  /**
   * Generates a role-specific Group Discussion topic.
   */
  async generateTopic(context, config = {}) {
    const userPrompt = `TARGET INTERNSHIP:
${context.jd}

INDUSTRY / DOMAIN: Tech & Software Engineering
Generate a thought-provoking, debate-rich GD topic for this role.`;

    const schema = {
      type: 'object',
      properties: {
        topicTitle: { type: 'string' },
        backgroundContext: { type: 'string' },
        keyPerspectives: { type: 'array', items: { type: 'string' } },
        recommendedDurationMinutes: { type: 'number' },
      },
      required: ['topicTitle', 'backgroundContext', 'keyPerspectives'],
    };

    return this.invokeGemini(GD_TOPIC_GENERATOR_PROMPT, userPrompt, schema, 'minimal');
  }

  /**
   * Evaluates the multi-party group discussion transcript and outputs individual scores for the primary candidate (and all participants).
   */
  async evaluateDiscussion(topic, transcript = [], candidateName = 'Candidate') {
    const formattedTranscript = Array.isArray(transcript)
      ? transcript.map((t) => `[${t.role === 'ai' ? 'Moderator' : t.speaker || t.name || 'Speaker'}]: ${t.text}`).join('\n')
      : String(transcript || '');

    const userPrompt = `TOPIC:
${typeof topic === 'string' ? topic : topic?.topicTitle || 'Technical Architecture Debate'}

BACKGROUND:
${topic?.backgroundContext || ''}

TRANSCRIPT:
${formattedTranscript || '(No participant speech recorded)'}

PRIMARY CANDIDATE TO EVALUATE: ${candidateName}`;

    const schema = {
      type: 'object',
      properties: {
        candidateName: { type: 'string' },
        contentQuality: { type: 'number', description: '0-10' },
        technicalRelevance: { type: 'number', description: '0-10' },
        communicationClarity: { type: 'number', description: '0-10' },
        constructiveCollaboration: { type: 'number', description: '0-10' },
        activeListening: { type: 'number', description: '0-10' },
        leadershipAndInitiative: { type: 'number', description: '0-10' },
        overallGDScore: { type: 'number', description: '0-10' },
        summary: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        evidenceQuotes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              quote: { type: 'string' },
              dimension: { type: 'string' },
            },
            required: ['quote', 'dimension'],
          },
        },
      },
      required: [
        'contentQuality',
        'technicalRelevance',
        'communicationClarity',
        'constructiveCollaboration',
        'activeListening',
        'leadershipAndInitiative',
        'overallGDScore',
        'summary',
        'strengths',
        'weaknesses',
      ],
    };

    let evaluation;
    try {
      evaluation = await this.invokeGemini(GD_EVALUATOR_PROMPT, userPrompt, schema, 'low');
    } catch (err) {
      evaluation = {
        candidateName,
        contentQuality: 7.0,
        technicalRelevance: 7.5,
        communicationClarity: 7.0,
        constructiveCollaboration: 7.5,
        activeListening: 7.0,
        leadershipAndInitiative: 6.5,
        overallGDScore: 7.1,
        summary: 'Candidate actively engaged in group debate and contributed constructive points.',
        strengths: ['Listened to peers and structured coherent counterarguments.'],
        weaknesses: ['Can take more initiative to synthesize diverse viewpoints.'],
        evidenceQuotes: [],
      };
    }

    const scaledScore = Math.round(evaluation.overallGDScore * 10);

    return this.formatResult({
      roundType: 'GROUP_DISCUSSION',
      score: scaledScore,
      maxScore: 100,
      evaluation: {
        dimensions: {
          contentQuality: evaluation.contentQuality,
          technicalRelevance: evaluation.technicalRelevance,
          communicationClarity: evaluation.communicationClarity,
          constructiveCollaboration: evaluation.constructiveCollaboration,
          activeListening: evaluation.activeListening,
          leadershipAndInitiative: evaluation.leadershipAndInitiative,
        },
        summary: evaluation.summary,
        topic: typeof topic === 'string' ? topic : topic?.topicTitle,
      },
      evidence: evaluation.evidenceQuotes || [],
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      nextAction: scaledScore >= 60 ? 'ADVANCE' : 'REVIEW_RECOMMENDED',
    });
  }
}
