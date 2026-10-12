import { BaseAgent } from './baseAgent.js';

const FINAL_EVALUATOR_PROMPT = `You are the Lead Hiring Committee Chair synthesizing a comprehensive candidate evaluation.
Review all assessment round results (Aptitude, Technical Theory, Coding Sandbox, AI Voice Interview, Group Discussion, and Integrity).
Synthesize an authoritative hiring dossier including:
1. Executive Summary
2. Unified Competency Matrix (across core domains, problem solving, architecture, coding rigor, spoken communication, and collaboration)
3. Top Candidate Strengths
4. Critical Skill Gaps & Development Needs
5. Hiring Recommendation ('Strong Hire', 'Hire', 'Maybe', 'No Hire')
6. Actionable Next Steps for Recruiter and Candidate`;

export class FinalEvaluationAgent extends BaseAgent {
  constructor() {
    super('FinalEvaluationAgent');
  }

  /**
   * Synthesizes results across all completed rounds into a unified dossier.
   */
  async synthesizeDossier(session, roundResults = {}, pipelineConfig = {}) {
    const weights = pipelineConfig.weights || {
      aptitude: 20,
      technical: 40,
      interview: 20,
      gd: 20,
    };

    const aptScore = roundResults.aptitude?.score ?? 0;
    const techScore = roundResults.technical?.score ?? 0;
    const intScore = roundResults.interview?.score ?? 0;
    const gdScore = roundResults.gd?.score ?? 0;
    const integrityAudit = roundResults.integrity || { score: 100, evaluation: {} };

    // Calculate normalized composite score
    const totalWeight =
      (roundResults.aptitude ? (weights.aptitude || 25) : 0) +
      (roundResults.technical ? (weights.technical || 25) : 0) +
      (roundResults.interview ? (weights.interview || 25) : 0) +
      (roundResults.gd ? (weights.gd || 25) : 0);

    const safeTotalWeight = totalWeight > 0 ? totalWeight : 100;

    const weightedScore = Math.round(
      ((roundResults.aptitude ? aptScore * (weights.aptitude || 25) : 0) +
        (roundResults.technical ? techScore * (weights.technical || 25) : 0) +
        (roundResults.interview ? intScore * (weights.interview || 25) : 0) +
        (roundResults.gd ? gdScore * (weights.gd || 25) : 0)) /
        safeTotalWeight,
    );

    const roundSummaryText = `
CANDIDATE: ${session.name}
JOB: ${session.jd}

ROUND BREAKDOWN:
- Aptitude Round: ${roundResults.aptitude ? `${aptScore}/100` : 'Not Enabled'}
  Summary: ${roundResults.aptitude?.evaluation?.summary || 'N/A'}
- Technical Round: ${roundResults.technical ? `${techScore}/100 (Theory: ${roundResults.technical?.evaluation?.theoryScore || 0}, Coding: ${roundResults.technical?.evaluation?.codingScore || 0})` : 'Not Enabled'}
  Summary: ${roundResults.technical?.evaluation?.theory?.summary || ''} | Coding: ${roundResults.technical?.evaluation?.coding?.codeQuality?.summary || ''}
- AI Voice Interview: ${roundResults.interview ? `${intScore}/100` : 'Not Enabled'}
  Summary: ${roundResults.interview?.evaluation?.summary || 'N/A'}
- Group Discussion: ${roundResults.gd ? `${gdScore}/100` : 'Not Enabled'}
  Summary: ${roundResults.gd?.evaluation?.summary || 'N/A'}
- Integrity Audit: Score ${integrityAudit.score}/100 (Review Flag: ${integrityAudit.evaluation?.reviewRecommended ? 'YES' : 'NO'})

OVERALL WEIGHTED SCORE: ${weightedScore}/100`;

    const schema = {
      type: 'object',
      properties: {
        overallScore: { type: 'number', description: '0-100' },
        executiveSummary: { type: 'string' },
        competencies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              score: { type: 'number', description: '0-10' },
              status: { type: 'string', enum: ['Mastered', 'Proficient', 'Developing', 'Needs Work'] },
              comment: { type: 'string' },
            },
            required: ['name', 'score', 'status', 'comment'],
          },
        },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        skillGaps: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string', enum: ['Strong Hire', 'Hire', 'Maybe', 'No Hire'] },
        developmentRoadmap: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'overallScore',
        'executiveSummary',
        'competencies',
        'strengths',
        'weaknesses',
        'skillGaps',
        'recommendation',
        'developmentRoadmap',
      ],
    };

    let synthesis;
    try {
      synthesis = await this.invokeGemini(FINAL_EVALUATOR_PROMPT, roundSummaryText, schema, 'low');
    } catch (err) {
      synthesis = {
        overallScore: weightedScore,
        executiveSummary: `Candidate completed assessment pipeline with a weighted score of ${weightedScore}/100.`,
        competencies: [
          { name: 'Aptitude & Problem Solving', score: aptScore / 10, status: aptScore >= 80 ? 'Mastered' : 'Proficient', comment: 'Demonstrated solid analytical capability.' },
          { name: 'Technical & Coding', score: techScore / 10, status: techScore >= 80 ? 'Mastered' : 'Proficient', comment: 'Implemented algorithmic and architectural solutions.' },
          { name: 'Communication & Collaboration', score: (intScore + gdScore) / 20, status: 'Proficient', comment: 'Participated effectively in spoken discussion and interview.' },
        ],
        strengths: ['Balanced performance across analytical and technical domains.'],
        weaknesses: ['Continued practice in edge-case code optimization recommended.'],
        skillGaps: [],
        recommendation: weightedScore >= 80 ? 'Strong Hire' : weightedScore >= 65 ? 'Hire' : weightedScore >= 50 ? 'Maybe' : 'No Hire',
        developmentRoadmap: ['Engage in production-scale distributed systems practice.'],
      };
    }

    return this.formatResult({
      roundType: 'FINAL_EVALUATION',
      score: weightedScore,
      maxScore: 100,
      evaluation: {
        compositeScore: weightedScore,
        executiveSummary: synthesis.executiveSummary,
        competencies: synthesis.competencies,
        skillGaps: synthesis.skillGaps,
        recommendation: synthesis.recommendation,
        developmentRoadmap: synthesis.developmentRoadmap,
        roundScores: {
          aptitude: aptScore,
          technical: techScore,
          interview: intScore,
          gd: gdScore,
          integrity: integrityAudit.score,
        },
        weights,
        reviewRecommended: !!integrityAudit.evaluation?.reviewRecommended,
      },
      strengths: synthesis.strengths || [],
      weaknesses: synthesis.weaknesses || [],
      nextAction: synthesis.recommendation === 'No Hire' ? 'REJECT' : 'SHORTLIST',
    });
  }
}
