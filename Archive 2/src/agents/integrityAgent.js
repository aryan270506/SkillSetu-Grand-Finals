import { BaseAgent } from './baseAgent.js';

export class IntegrityAgent extends BaseAgent {
  constructor() {
    super('IntegrityAgent');
  }

  /**
   * Evaluates the stream of recorded integrity events for a round or entire session.
   */
  evaluateIntegritySignals(signals = []) {
    const signalLog = Array.isArray(signals) ? signals : [];
    
    let tabSwitches = 0;
    let windowBlurs = 0;
    let cameraDrops = 0;
    let micDrops = 0;
    const flaggedEvents = [];

    signalLog.forEach((sig) => {
      const type = String(sig.type || '').toUpperCase();
      const at = sig.timestamp || sig.at || new Date().toISOString();

      if (type.includes('TAB_SWITCH') || type.includes('VISIBILITY_HIDDEN')) {
        tabSwitches += 1;
        flaggedEvents.push({
          type: 'TAB_SWITCH',
          timestamp: at,
          confidence: 0.95,
          evidence: `Browser tab was switched or hidden for ${(sig.durationMs ? Math.round(sig.durationMs / 1000) + 's' : 'brief duration')}`,
        });
      } else if (type.includes('WINDOW_BLUR') || type.includes('FOCUS_LOST')) {
        windowBlurs += 1;
        flaggedEvents.push({
          type: 'WINDOW_BLUR',
          timestamp: at,
          confidence: 0.85,
          evidence: 'Application window lost active desktop focus',
        });
      } else if (type.includes('CAMERA_OFFLINE') || type.includes('CAMERA_MUTED')) {
        cameraDrops += 1;
        flaggedEvents.push({
          type: 'CAMERA_DISCONNECTED',
          timestamp: at,
          confidence: 0.99,
          evidence: 'Camera video track was disabled, disconnected, or blocked',
        });
      } else if (type.includes('MIC_OFFLINE') || type.includes('MIC_MUTED')) {
        micDrops += 1;
        flaggedEvents.push({
          type: 'MICROPHONE_DISCONNECTED',
          timestamp: at,
          confidence: 0.99,
          evidence: 'Microphone audio track was muted or disconnected',
        });
      }
    });

    // Determine review recommendation threshold
    const reviewRecommended = tabSwitches >= 3 || windowBlurs >= 5 || cameraDrops >= 1;
    const integrityScore = Math.max(0, 100 - (tabSwitches * 10 + windowBlurs * 5 + cameraDrops * 25 + micDrops * 15));

    return this.formatResult({
      roundType: 'INTEGRITY_AUDIT',
      score: integrityScore,
      maxScore: 100,
      evaluation: {
        reviewRecommended,
        summary: reviewRecommended
          ? `Integrity signals detected (${tabSwitches} tab switches, ${cameraDrops} camera interruptions). Recruiter review recommended.`
          : 'Normal assessment environment verified. No suspicious anomalies detected.',
        metrics: {
          totalEvents: signalLog.length,
          tabSwitches,
          windowBlurs,
          cameraDrops,
          micDrops,
        },
      },
      evidence: flaggedEvents,
      integritySignals: flaggedEvents,
      strengths: reviewRecommended ? [] : ['Maintained continuous camera presence and focus throughout.'],
      weaknesses: reviewRecommended ? ['Multiple application focus losses and tab switches detected.'] : [],
      nextAction: reviewRecommended ? 'FLAG_FOR_REVIEW' : 'CLEAR',
    });
  }
}
