import { BaseAgent } from './baseAgent.js';

const EXPLANATION_EVAL_PROMPT = `You are the Forensic Explanation Verification Agent for SkillSetu.
Evaluate the candidate's written and selected explanation for a detected assessment integrity event against the objective telemetry and device logs.

RULES:
1. PLAUSIBLE: The explanation is technically feasible, consistent with the recorded event duration, and does not contradict system logs (e.g. accidental mouse click, brief network reconnect, OS notification popup, minor hardware glitch).
2. UNCERTAIN: The explanation cannot be conclusively verified or refuted by the available telemetry, but does not directly contradict the logs.
3. CONTRADICTED_BY_EVIDENCE: The explanation directly and demonstrably contradicts objective system evidence (e.g., candidate claims camera was on when video track logs show a 4-minute camera loss, or candidate claims no window change when tab was hidden for 2 minutes).

IMPORTANT FAIRNESS MANDATES:
- Do NOT call a candidate a liar merely because an explanation sounds unlikely.
- Rely strictly on objective telemetry (event duration, device state, recording track verification).
- Do NOT reduce candidate's academic/test score.`;

export class IntegrityExplanationAgent extends BaseAgent {
  constructor() {
    super('IntegrityExplanationAgent');
  }

  /**
   * Verifies candidate's explanation against objective telemetry evidence.
   */
  async verifyExplanation({
    eventType,
    timestamp,
    durationSec = 0,
    deviceInfo = {},
    candidateReasonCategory = 'Other',
    candidateExplanationText = '',
    recordingStatus = {},
    previousEvents = [],
  }) {
    // 1. Deterministic Rule Contradiction Checks
    const explanationLower = String(candidateExplanationText || '').toLowerCase();
    const reasonLower = String(candidateReasonCategory || '').toLowerCase();
    const combinedText = `${reasonLower} ${explanationLower}`;

    // Direct contradiction 1: Camera claim vs actual camera track offline
    if (eventType === 'CAMERA_DISABLED' || eventType === 'CAMERA_DISCONNECTED') {
      if (durationSec > 30 && (combinedText.includes('was working the whole time') || combinedText.includes('never turned off'))) {
        return {
          status: 'CONTRADICTED_BY_EVIDENCE',
          confidence: 0.95,
          reasoning: `Candidate stated camera never turned off, but system hardware logs confirm camera track was lost for ${durationSec} seconds.`,
          acceptExplanation: false,
          flagForReview: true,
        };
      }
    }

    // Direct contradiction 2: Tab switch claim vs extended hidden duration
    if (eventType === 'TAB_SWITCH' || eventType === 'WINDOW_BLUR') {
      if (durationSec > 60 && (combinedText.includes('1 second') || combinedText.includes('instant') || combinedText.includes('did not switch'))) {
        return {
          status: 'CONTRADICTED_BY_EVIDENCE',
          confidence: 0.92,
          reasoning: `Candidate claimed momentary switch, but browser visibility telemetry records window was hidden for ${durationSec} seconds.`,
          acceptExplanation: false,
          flagForReview: true,
        };
      }
    }

    // Direct contradiction 3: Unsupported device claim
    if (eventType === 'UNSUPPORTED_DEVICE') {
      if (deviceInfo.isMobile && combinedText.includes('using a macbook') || combinedText.includes('desktop computer')) {
        return {
          status: 'CONTRADICTED_BY_EVIDENCE',
          confidence: 0.95,
          reasoning: 'Browser user-agent and screen touch dimensions confirm a mobile/tablet client.',
          acceptExplanation: false,
          flagForReview: true,
        };
      }
    }

    // Deterministic Plausibility Check for standard brief events
    if (durationSec <= 5 && (combinedText.includes('accident') || combinedText.includes('click') || combinedText.includes('notification') || combinedText.includes('trackpad') || combinedText.includes('popup'))) {
      return {
        status: 'PLAUSIBLE',
        confidence: 0.9,
        reasoning: `Brief ${durationSec}s event is consistent with reported OS notification or accidental click.`,
        acceptExplanation: true,
        flagForReview: false,
      };
    }

    // If context is nuanced, invoke Gemini for contextual verification
    const auditContext = `DETECTED EVENT: ${eventType} at ${timestamp} (Duration: ${durationSec}s)
DEVICE INFO: ${JSON.stringify(deviceInfo)}
RECORDING METADATA: ${JSON.stringify(recordingStatus)}
SELECTED REASON CATEGORY: "${candidateReasonCategory}"
CANDIDATE WRITTEN EXPLANATION:
"${candidateExplanationText || '(No additional comments provided)'}"
PREVIOUS EVENTS COUNT: ${previousEvents.length}`;

    const schema = {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['PLAUSIBLE', 'UNCERTAIN', 'CONTRADICTED_BY_EVIDENCE'],
        },
        confidence: { type: 'number', description: '0.0 to 1.0' },
        reasoning: { type: 'string' },
        acceptExplanation: { type: 'boolean' },
        flagForReview: { type: 'boolean' },
      },
      required: ['status', 'confidence', 'reasoning', 'acceptExplanation', 'flagForReview'],
    };

    try {
      const result = await this.invokeGemini(EXPLANATION_EVAL_PROMPT, auditContext, schema, 'minimal');
      return {
        status: result.status || 'PLAUSIBLE',
        confidence: result.confidence ?? 0.85,
        reasoning: result.reasoning || 'Explanation verified against session telemetry.',
        acceptExplanation: result.status !== 'CONTRADICTED_BY_EVIDENCE',
        flagForReview: result.status === 'CONTRADICTED_BY_EVIDENCE',
      };
    } catch (err) {
      return {
        status: 'PLAUSIBLE',
        confidence: 0.8,
        reasoning: 'Explanation accepted under standard grace guidelines.',
        acceptExplanation: true,
        flagForReview: false,
      };
    }
  }
}
