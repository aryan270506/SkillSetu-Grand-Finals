import { BaseAgent } from './baseAgent.js';

const READING_DETECTION_PROMPT = `You are the Reading & External Material Detection Agent for SkillSetu.
Analyze the correlated video, audio, and transcript signals to determine whether the candidate is reading from prepared external material or answering organically.

SIGNAL GUIDELINES:
- Visual cues: Repeated gaze away from the camera/screen, head orientation downward or sideward, consistent off-screen reading tracking.
- Audio / Speech cues: Unnatural reading cadence, monotonic phrase-by-phrase delivery, pauses followed by unusually exact textbook phrasing, lack of natural conversational hesitation.
- Normal behavior: Normal thinking pauses, looking up or away to recall concepts, organic phrasing, natural self-corrections are NOT cheating.

Provide a structured assessment with a confidence score (0-1.0), risk classification ('ORGANIC_SPEECH', 'POSSIBLE_READING', 'CONFIRMED_READING'), and factual observations.`;

export class ReadingDetectionAgent extends BaseAgent {
  constructor() {
    super('ReadingDetectionAgent');
  }

  /**
   * Evaluates video gaze metrics, speech cadence, and transcript text for reading patterns.
   */
  async analyzeReadingBehavior({
    candidateName,
    roundType,
    transcript = [],
    visualSignals = [],
    audioSignals = [],
  }) {
    // Group Discussion exemption
    if (roundType === 'GROUP_DISCUSSION' || roundType === 'gd') {
      return {
        classification: 'ORGANIC_SPEECH',
        confidence: 0.95,
        isReadingDetected: false,
        observations: ['Multi-party group discussion context; reading detection rules exempt.'],
      };
    }

    const transcriptExcerpt = Array.isArray(transcript)
      ? transcript.map((t) => `${t.role || t.speaker || 'Candidate'}: ${t.text}`).join('\n')
      : String(transcript || '');

    const visualGazeAwayCount = visualSignals.filter(
      (s) => s.type === 'GAZE_AWAY' || s.type === 'LOOKING_DOWN' || s.type === 'OFF_SCREEN_FOCUS'
    ).length;

    const audioCadenceFlags = audioSignals.filter(
      (s) => s.type === 'UNNATURAL_CADENCE' || s.type === 'ROBOTIC_DELIVERY' || s.type === 'SUSPICIOUS_AUDIO'
    ).length;

    // Fast deterministic filter: If no anomalous visual or audio signals exist, return ORGANIC_SPEECH immediately
    if (visualGazeAwayCount < 2 && audioCadenceFlags === 0 && transcriptExcerpt.length < 50) {
      return {
        classification: 'ORGANIC_SPEECH',
        confidence: 0.9,
        isReadingDetected: false,
        observations: ['Natural conversational flow and direct eye-level engagement.'],
      };
    }

    const promptContext = `CANDIDATE: ${candidateName}
ROUND: ${roundType}
VISUAL SIGNALS: ${visualGazeAwayCount} off-screen gaze/downward head tilt events detected.
AUDIO SIGNALS: ${audioCadenceFlags} unnatural cadence / pacing events detected.
TRANSCRIPT EXCERPT:
${transcriptExcerpt || '(No speech transcript recorded)'}`;

    const schema = {
      type: 'object',
      properties: {
        classification: {
          type: 'string',
          enum: ['ORGANIC_SPEECH', 'POSSIBLE_READING', 'CONFIRMED_READING'],
        },
        confidence: { type: 'number', description: '0.0 to 1.0' },
        isReadingDetected: { type: 'boolean' },
        observations: { type: 'array', items: { type: 'string' } },
        explanation: { type: 'string' },
      },
      required: ['classification', 'confidence', 'isReadingDetected', 'observations', 'explanation'],
    };

    try {
      const result = await this.invokeGemini(READING_DETECTION_PROMPT, promptContext, schema, 'minimal');
      return {
        classification: result.classification || 'ORGANIC_SPEECH',
        confidence: Math.min(1.0, Math.max(0, result.confidence ?? 0.8)),
        isReadingDetected: Boolean(result.isReadingDetected && result.confidence >= 0.75),
        observations: result.observations || [],
        explanation: result.explanation || 'Behavior analyzed.',
      };
    } catch (err) {
      // Fallback deterministic evaluation based on objective counts
      const isConfirmed = visualGazeAwayCount >= 4 && audioCadenceFlags >= 2;
      return {
        classification: isConfirmed ? 'CONFIRMED_READING' : visualGazeAwayCount >= 2 ? 'POSSIBLE_READING' : 'ORGANIC_SPEECH',
        confidence: 0.75,
        isReadingDetected: isConfirmed,
        observations: [`Recorded ${visualGazeAwayCount} gaze deviations and ${audioCadenceFlags} audio cadence events.`],
        explanation: isConfirmed ? 'Correlated visual and audio reading signals detected.' : 'Normal candidate delivery.',
      };
    }
  }
}
