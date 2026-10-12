import { BaseAgent } from './baseAgent.js';
import { ReadingDetectionAgent } from './readingDetectionAgent.js';
import { IntegrityExplanationAgent } from './integrityExplanationAgent.js';

const INTEGRITY_AI_PROMPT = `You are the Lead Forensic Assessment Integrity Officer for SkillSetu.
Analyze the chronological timeline of recorded browser events, device state changes, media recording metadata, candidate explanations, and speech signals.
Evaluate whether the aggregate patterns indicate genuine assessment integrity or suggest unauthorized external assistance.

CRITICAL FAIRNESS MANDATES:
1. NEVER declare cheating based on a single accidental action (e.g. one 2-second tab switch or network glitch).
2. For Group Discussion (GD), multiple visible faces and multi-party voices are EXPECTED and NORMAL. Never flag multiple faces/voices in GD as cheating.
3. If candidate explanations are plausible and consistent with telemetry, do not penalize them.
4. Keep academic/assessment scores completely independent from integrity warnings.`;

export class IntegrityVerificationAgent extends BaseAgent {
  constructor() {
    super('IntegrityVerificationAgent');
    this.readingAgent = new ReadingDetectionAgent();
    this.explanationAgent = new IntegrityExplanationAgent();
  }

  /**
   * Evaluates an incoming live telemetry signal in real-time.
   * Manages authoritative per-round warning limits (max 2 before termination),
   * pauses the round on first violation, and terminates on second violation.
   */
  async evaluateLiveSignal(session, signal = {}) {
    const roundId = signal.roundId || session.currentRound || 'aptitude';
    const isGD = roundId === 'GROUP_DISCUSSION' || roundId === 'gd';
    const type = String(signal.type || '').toUpperCase();
    const durationSec = Math.round((signal.durationMs || signal.durationSec * 1000 || 0) / 1000);
    const meta = signal.metadata || {};

    session.warningCounts = session.warningCounts || { aptitude: 0, technical: 0, interview: 0, gd: 0 };
    const currentWarnings = session.warningCounts[roundId] || 0;

    // Check if round is already terminated
    if (session.terminatedRounds?.[roundId]) {
      return {
        action: 'TERMINATED',
        isTerminated: true,
        roundStatus: 'TERMINATED_FOR_INTEGRITY',
        warningCount: currentWarnings,
        message: 'This assessment round was terminated due to integrity violations.',
      };
    }

    // 1. Determine if this signal represents a confirmed integrity violation
    let isViolation = false;
    let violationTitle = 'Integrity Warning';
    let humanExplanation = '';
    let eventSeverity = 'LOW';

    // Rule: Unsupported Device (Mobile/Tablet on desktop-required test)
    if (type === 'UNSUPPORTED_DEVICE') {
      isViolation = true;
      violationTitle = '⚠️ Unsupported Device Detected';
      humanExplanation =
        'Please use a laptop or desktop computer for this assessment. Mobile phones and tablets are not permitted for this round. Continuing on an unsupported device may result in rejection.';
      eventSeverity = 'HIGH';
    }

    // Rule: Mobile Phone / Handheld Device Detected in Camera (Separate from Face Detection)
    else if ((type === 'PHONE_DETECTED' || type === 'CELL_PHONE_DETECTED' || type === 'HANDHELD_DEVICE_DETECTED') && !isGD) {
      isViolation = true;
      violationTitle = '⚠️ Mobile Phone Detected in Camera';
      humanExplanation =
        'A mobile phone or handheld device was detected in your camera frame. Mobile devices are strictly prohibited during the assessment.';
      eventSeverity = 'HIGH';
    }

    // Rule: Sustained or Repeated Tab Switching / Focus Loss
    else if (type === 'TAB_SWITCH' || type === 'WINDOW_BLUR' || type === 'TAB_HIDDEN') {
      const pastTabSwitches = (session.integritySignals || []).filter(
        (s) => s.roundId === roundId && (String(s.eventType || s.type || '').includes('TAB_SWITCH') || String(s.eventType || s.type || '').includes('WINDOW_BLUR'))
      ).length;

      if (durationSec >= 3 || pastTabSwitches >= 2 || signal.immediate) {
        isViolation = true;
        violationTitle = '⚠️ Window Focus Lost';
        humanExplanation = `We noticed that you switched away from the assessment window for ${
          durationSec > 0 ? durationSec + ' seconds' : 'an extended period'
        }. Please stay on the assessment screen while completing the round.`;
        eventSeverity = durationSec >= 5 ? 'HIGH' : 'MEDIUM';
      }
    }

    // Rule: Camera Disconnection / Stream Inactive / Disabled / Frozen Frame (Real-time detection with 1-2s grace)
    else if (type === 'CAMERA_DISCONNECTED' || type === 'CAMERA_DISABLED' || type === 'CAMERA_MUTED' || type === 'CAMERA_NO_FRAME' || type === 'CAMERA_ENDED') {
      const pastCameraEvents = (session.integritySignals || []).filter(
        (s) => s.roundId === roundId && String(s.eventType || s.type || '').includes('CAMERA')
      ).length;

      if (durationSec >= 2 || signal.immediate || pastCameraEvents >= 1) {
        isViolation = true;
        violationTitle = type === 'CAMERA_DISABLED' ? '⚠️ Camera Manually Disabled' : type === 'CAMERA_NO_FRAME' ? '⚠️ Camera Video Feed Frozen' : '⚠️ Camera Video Feed Lost';
        humanExplanation =
          'Your camera video feed was disconnected, disabled, or stopped delivering frames. Continuous camera video is mandatory for this assessment.';
        eventSeverity = 'HIGH';
      }
    }

    // Rule: Microphone Disconnection / Track Inactive (Distinguished from candidate silence)
    else if (type === 'MIC_DISCONNECTED' || type === 'MIC_DISABLED' || type === 'MIC_MUTED' || type === 'MICROPHONE_DISCONNECTED') {
      const pastMicEvents = (session.integritySignals || []).filter(
        (s) => s.roundId === roundId && String(s.eventType || s.type || '').includes('MIC')
      ).length;

      if (durationSec >= 2 || signal.immediate || pastMicEvents >= 1) {
        isViolation = true;
        violationTitle = type === 'MIC_DISABLED' ? '⚠️ Microphone Manually Disabled' : '⚠️ Microphone Audio Feed Lost';
        humanExplanation =
          'Your microphone audio feed was muted, disconnected, or disabled. Continuous audio monitoring is required for this assessment.';
        eventSeverity = 'HIGH';
      }
    }

    // Rule: Fullscreen Exit
    else if (type === 'FULLSCREEN_EXIT') {
      const pastExits = (session.integritySignals || []).filter(
        (s) => s.roundId === roundId && String(s.eventType || s.type || '') === 'FULLSCREEN_EXIT'
      ).length;

      if (pastExits >= 1 || durationSec >= 2 || signal.immediate) {
        isViolation = true;
        violationTitle = '⚠️ Full-Screen Mode Exited';
        humanExplanation =
          'You exited full-screen mode. Please remain in full-screen mode to prevent unauthorized background interactions.';
        eventSeverity = 'MEDIUM';
      }
    }

    // Rule: Multiple Faces / Persons Detected (Strictly exempt in GD)
    else if ((type === 'MULTIPLE_FACES' || type === 'MULTIPLE_FACES_DETECTED' || type === 'MULTIPLE_PERSONS_DETECTED') && !isGD) {
      const pastFaceEvents = (session.integritySignals || []).filter(
        (s) => s.roundId === roundId && String(s.eventType || s.type || '').includes('MULTIPLE_')
      ).length;

      if (meta.persistenceCount >= 2 || pastFaceEvents >= 1 || (meta.confidence && meta.confidence >= 0.7) || signal.immediate) {
        isViolation = true;
        violationTitle = '⚠️ Multiple Persons Detected';
        humanExplanation =
          'We detected another person in your camera frame. Only the registered candidate may participate in this assessment.';
        eventSeverity = 'HIGH';
      }
    }

    // Rule: No Face / Candidate Missing (Strictly exempt in GD)
    else if ((type === 'NO_FACE_DETECTED' || type === 'FACE_MISSING' || type === 'NO_PERSON_DETECTED') && !isGD) {
      if (durationSec >= 2 || (meta.persistenceCount && meta.persistenceCount >= 6) || signal.immediate) {
        isViolation = true;
        violationTitle = '⚠️ Candidate Not Detected in Frame';
        humanExplanation =
          'No candidate face was detected in your camera frame for an extended period. Please stay centered and visible during the round.';
        eventSeverity = 'HIGH';
      }
    }

    // Rule: Possible Second Speaker Detected (Strictly exempt in GD)
    else if ((type === 'POSSIBLE_SECOND_SPEAKER' || type === 'SECOND_VOICE_DETECTED' || type === 'SUSPICIOUS_AUDIO') && !isGD) {
      const pastVoiceEvents = (session.integritySignals || []).filter(
        (s) => s.roundId === roundId && (String(s.eventType || s.type || '').includes('SECOND_') || String(s.eventType || s.type || '').includes('SUSPICIOUS_AUDIO'))
      ).length;

      if (meta.consecutiveFrames >= 3 || pastVoiceEvents >= 1 || signal.immediate) {
        isViolation = true;
        violationTitle = '⚠️ Secondary Voice Activity Detected';
        humanExplanation =
          'An additional or secondary voice was detected in your microphone audio feed. Please ensure you are alone in a quiet room.';
        eventSeverity = 'MEDIUM';
      }
    }

    // Rule: Possible External Coaching (Strictly exempt in GD)
    else if ((type === 'POSSIBLE_EXTERNAL_COACHING' || type === 'EXTERNAL_COACHING_DETECTED') && !isGD) {
      isViolation = true;
      violationTitle = '⚠️ Potential External Verbal Assistance Detected';
      humanExplanation =
        'A pattern of external voice prompting immediately preceding candidate answers was detected. Please ensure all answers are entirely your own.';
      eventSeverity = 'HIGH';
    }

    // Rule: Sustained Off-Screen Gaze or Head Turned Away (Strictly exempt in GD)
    else if ((type === 'GAZE_OFF_SCREEN' || type === 'SUSTAINED_OFF_SCREEN_GAZE' || type === 'HEAD_TURNED_AWAY' || type === 'GAZE_AWAY') && !isGD) {
      const pastGazeEvents = (session.integritySignals || []).filter(
        (s) => s.roundId === roundId && (String(s.eventType || s.type || '').includes('GAZE_') || String(s.eventType || s.type || '').includes('HEAD_TURNED'))
      ).length;

      if (durationSec >= 3 || pastGazeEvents >= 2 || signal.immediate) {
        isViolation = true;
        violationTitle = type === 'HEAD_TURNED_AWAY' ? '⚠️ Head Turned Away From Screen' : '⚠️ Sustained Off-Screen Gaze Detected';
        humanExplanation =
          'We detected sustained gaze or head orientation away from your assessment screen. Please keep your eyes focused on the assessment window.';
        eventSeverity = 'MEDIUM';
      }
    }

    // Rule: Reading from external material (Strictly exempt in GD)
    else if ((type === 'CONFIRMED_READING' || type === 'READING_DETECTED') && !isGD) {
      isViolation = true;
      violationTitle = '⚠️ External Reading Pattern Detected';
      humanExplanation =
        'We noticed behavior that may indicate you are reading from another source during the assessment. Please answer independently using your own knowledge.';
      eventSeverity = 'HIGH';
    }

    // Rule: Multiple Active Sessions
    else if (type === 'MULTIPLE_ACTIVE_SESSIONS') {
      isViolation = true;
      violationTitle = '⚠️ Concurrent Session Detected';
      humanExplanation =
        'A duplicate active assessment session was opened on another browser or device. Only one active window is permitted.';
      eventSeverity = 'CRITICAL';
    }

    // Rule: Massive Code Paste
    else if (type === 'LARGE_PASTE') {
      const pasteLength = meta.length || meta.charCount || 0;
      if (pasteLength > 250) {
        isViolation = true;
        violationTitle = '⚠️ Large External Paste Detected';
        humanExplanation = `A large code block (${pasteLength} characters) was pasted into the solution editor. Please write your code directly in the assessment IDE.`;
        eventSeverity = 'MEDIUM';
      }
    }

    // Construct structured Event Model
    const eventRecord = {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      candidateId: session.id,
      assessmentSessionId: session.id,
      roundId,
      eventType: type,
      timestamp: signal.timestamp || new Date().toISOString(),
      durationSec,
      severity: eventSeverity,
      confidence: meta.confidence || (isViolation ? 0.9 : 0.6),
      evidence: humanExplanation || `${type} recorded (${durationSec}s)`,
      metadata: meta,
      warningNumber: isViolation ? currentWarnings + 1 : null,
      candidateExplanation: null,
      explanationStatus: null,
      createdAt: new Date().toISOString(),
    };

    // If not confirmed violation, simply log and continue
    if (!isViolation) {
      return {
        action: 'LOGGED_INFO',
        isViolation: false,
        isPaused: false,
        isTerminated: false,
        warningCount: currentWarnings,
        event: eventRecord,
      };
    }

    // Process Confirmed Violation through State Machine
    const nextWarningCount = currentWarnings + 1;
    session.warningCounts[roundId] = nextWarningCount;

    if (nextWarningCount === 1) {
      // FIRST WARNING: Pause round, display human warning, collect explanation
      const warningPayload = {
        action: 'WARNING_ISSUED',
        isViolation: true,
        severity: eventSeverity,
        warningNumber: 1,
        maxWarnings: 2,
        isPaused: true,
        isTerminated: false,
        eventId: eventRecord.id,
        title: violationTitle,
        message: humanExplanation,
        detectedEvent: type,
        timestamp: eventRecord.timestamp,
        roundId,
        instructions:
          'This is your first warning for this round. Please explain what happened below to resume the assessment. A second confirmed violation in this round will permanently stop the assessment and flag your application.',
      };

      return {
        ...warningPayload,
        event: eventRecord,
      };
    } else {
      // SECOND WARNING: Terminate round immediately and flag candidate
      session.terminatedRounds = session.terminatedRounds || {};
      session.terminatedRounds[roundId] = true;

      const terminationPayload = {
        action: 'ROUND_TERMINATED',
        isViolation: true,
        severity: eventSeverity,
        warningNumber: 2,
        maxWarnings: 2,
        isPaused: true,
        isTerminated: true,
        roundStatus: 'TERMINATED_FOR_INTEGRITY',
        integrityStatus: 'HIGH_RISK',
        eventId: eventRecord.id,
        title: '⛔ Assessment Round Terminated',
        message:
          'We have detected a second confirmed integrity violation during this round. This round has been stopped and your application has been flagged for recruiter review.',
        detectedEvent: type,
        timestamp: eventRecord.timestamp,
        roundId,
      };

      return {
        ...terminationPayload,
        event: eventRecord,
      };
    }
  }

  /**
   * Evaluates candidate's submitted explanation for an active warning.
   */
  async processCandidateExplanation({
    session,
    eventId,
    reasonCategory,
    explanationText,
    deviceInfo = {},
  }) {
    const roundId = session.currentRound || 'aptitude';
    const activeWarningEvent = (session.integritySignals || []).find((e) => e.id === eventId) || {
      eventType: 'INTEGRITY_WARNING',
      durationSec: 15,
      timestamp: new Date().toISOString(),
    };

    const explanationResult = await this.explanationAgent.verifyExplanation({
      eventType: activeWarningEvent.eventType,
      timestamp: activeWarningEvent.timestamp,
      durationSec: activeWarningEvent.durationSec || 0,
      deviceInfo,
      candidateReasonCategory: reasonCategory,
      candidateExplanationText: explanationText,
      recordingStatus: session.recordingMeta || {},
      previousEvents: session.integritySignals || [],
    });

    // Update the event in session storage with candidate explanation and status
    activeWarningEvent.candidateExplanation = {
      category: reasonCategory,
      text: explanationText,
      submittedAt: new Date().toISOString(),
    };
    activeWarningEvent.explanationStatus = explanationResult.status;

    return {
      ok: true,
      eventId,
      roundId,
      explanationStatus: explanationResult.status,
      reasoning: explanationResult.reasoning,
      isPaused: false,
      isTerminated: Boolean(session.terminatedRounds?.[roundId]),
      warningCount: session.warningCounts?.[roundId] || 1,
    };
  }

  /**
   * Complete end-of-round or end-of-assessment forensic audit synthesis.
   */
  async verifySessionIntegrity({
    sessionId,
    candidateName,
    roundType = 'INTERVIEW',
    events = [],
    recordingMetadata = {},
    transcript = [],
    config = {},
  }) {
    const isGD = roundType === 'GROUP_DISCUSSION' || roundType === 'gd';
    const cleanEvents = Array.isArray(events) ? events : [];

    let totalRiskPoints = 0;
    const ruleViolations = [];
    const eventTimeline = [];

    let tabSwitchCount = 0;
    let totalTabHiddenSec = 0;
    let cameraDrops = 0;
    let totalCameraOfflineSec = 0;
    let micDrops = 0;
    let totalMicOfflineSec = 0;
    let multipleFacesCount = 0;
    let phoneDetectedCount = 0;
    let noFaceCount = 0;
    let readingCount = 0;
    let largePasteCount = 0;
    let networkDisconnectCount = 0;
    let reloadCount = 0;

    cleanEvents.forEach((ev) => {
      const type = String(ev.eventType || ev.type || '').toUpperCase();
      const ts = ev.timestamp || ev.at || new Date().toISOString();
      const durationSec = Math.round((ev.durationMs || (ev.durationSec ? ev.durationSec * 1000 : 0)) / 1000);
      const meta = ev.metadata || {};

      eventTimeline.push({
        id: ev.id,
        type,
        timestamp: ts,
        durationSec,
        severity: ev.severity || 'INFO',
        evidence: ev.evidence || type,
        explanation: ev.candidateExplanation,
        explanationStatus: ev.explanationStatus,
      });

      if (type.includes('CAMERA_DISCONNECTED') || type.includes('CAMERA_DISABLED') || type.includes('CAMERA_MUTED')) {
        cameraDrops += 1;
        totalCameraOfflineSec += durationSec || 2;
        if (durationSec >= 2 || cameraDrops >= 1) totalRiskPoints += 30;
      } else if (type.includes('MIC_DISCONNECTED') || type.includes('MIC_DISABLED') || type.includes('MIC_MUTED')) {
        micDrops += 1;
        totalMicOfflineSec += durationSec || 2;
        if (durationSec >= 2 || micDrops >= 1) totalRiskPoints += 25;
      } else if (type.includes('PHONE_DETECTED') || type.includes('CELL_PHONE') || type.includes('HANDHELD_DEVICE')) {
        if (!isGD) {
          phoneDetectedCount += 1;
          totalRiskPoints += 35;
        }
      } else if (type.includes('TAB_SWITCH') || type.includes('WINDOW_BLUR') || type.includes('TAB_HIDDEN')) {
        tabSwitchCount += 1;
        totalTabHiddenSec += durationSec || 2;
        if (durationSec >= 3 || tabSwitchCount >= 2) totalRiskPoints += 25;
        else if (tabSwitchCount >= 1) totalRiskPoints += 10;
      } else if ((type.includes('MULTIPLE_FACES') || type.includes('MULTIPLE_PERSONS')) && !isGD) {
        multipleFacesCount += 1;
        totalRiskPoints += 30;
      } else if ((type.includes('NO_FACE') || type.includes('FACE_MISSING')) && !isGD) {
        noFaceCount += 1;
        totalRiskPoints += 20;
      } else if (type.includes('READING') && !isGD) {
        readingCount += 1;
        totalRiskPoints += 30;
      } else if (type.includes('LARGE_PASTE')) {
        largePasteCount += 1;
        totalRiskPoints += 20;
      } else if (type.includes('NETWORK')) {
        networkDisconnectCount += 1;
      } else if (type.includes('RELOAD')) {
        reloadCount += 1;
      } else if (type.includes('MULTIPLE_ACTIVE_SESSIONS')) {
        totalRiskPoints += 50;
      }

      // Add to violations list if marked as warning
      if (ev.warningNumber) {
        ruleViolations.push({
          rule: type,
          warningNumber: ev.warningNumber,
          severity: ev.severity || 'HIGH',
          timestamp: ts,
          evidence: ev.evidence || type,
          candidateExplanation: ev.candidateExplanation?.text || ev.candidateExplanation?.category || null,
          explanationStatus: ev.explanationStatus || 'PENDING',
        });
      }
    });

    // Recording Media Failure Checks
    let recordingIntegrityFailed = false;
    let recordingFailureReason = null;
    if (recordingMetadata && recordingMetadata.exists === false) {
      recordingIntegrityFailed = true;
      recordingFailureReason = 'Required session recording file is missing or corrupted.';
      totalRiskPoints += 40;
    } else if (recordingMetadata && recordingMetadata.hasAudio === false) {
      recordingIntegrityFailed = true;
      recordingFailureReason = 'Recording stream contains no microphone audio track.';
      totalRiskPoints += 30;
    } else if (recordingMetadata && recordingMetadata.hasVideo === false) {
      recordingIntegrityFailed = true;
      recordingFailureReason = 'Recording stream contains no camera video track.';
      totalRiskPoints += 30;
    }

    let riskLevel = 'LOW';
    let integrityStatus = 'CLEAR';

    if (recordingIntegrityFailed) {
      riskLevel = 'HIGH';
      integrityStatus = 'VERIFICATION_FAILED';
    } else if (totalRiskPoints >= 50 || ruleViolations.length >= 2) {
      riskLevel = 'CRITICAL';
      integrityStatus = 'HIGH_RISK';
    } else if (totalRiskPoints >= 25 || ruleViolations.length === 1) {
      riskLevel = 'MEDIUM';
      integrityStatus = 'WARNING_ISSUED';
    } else if (totalRiskPoints > 0) {
      riskLevel = 'LOW';
      integrityStatus = 'REVIEW_REQUIRED';
    }

    const auditContext = `CANDIDATE: ${candidateName}
ROUND: ${roundType}
TOTAL INTEGRITY EVENTS: ${cleanEvents.length}
CONFIRMED WARNINGS ISSUED: ${ruleViolations.length}
RECORDING STATUS: ${recordingMetadata.verificationStatus || 'VERIFIED'} (Duration: ${recordingMetadata.durationSeconds || 0}s, Video: ${recordingMetadata.hasVideo}, Audio: ${recordingMetadata.hasAudio})
VIOLATIONS & EXPLANATIONS:
${ruleViolations.map((v) => `[Warning #${v.warningNumber}] ${v.rule} at ${v.timestamp} - Evidence: ${v.evidence} | Candidate Explanation: "${v.candidateExplanation || 'None'}" (Status: ${v.explanationStatus})`).join('\n') || 'None'}`;

    const schema = {
      type: 'object',
      properties: {
        aiSummary: { type: 'string' },
        explanation: { type: 'string' },
        confidenceScore: { type: 'number', description: '0-100' },
        recruiterRecommendation: {
          type: 'string',
          enum: ['AUTO_PASS', 'HUMAN_REVIEW_RECOMMENDED', 'IMMEDIATE_INVESTIGATION', 'VERIFICATION_FAILED_RETAKE'],
        },
      },
      required: ['aiSummary', 'explanation', 'confidenceScore', 'recruiterRecommendation'],
    };

    let aiVerification;
    try {
      aiVerification = await this.invokeGemini(INTEGRITY_AI_PROMPT, auditContext, schema, 'minimal');
    } catch (err) {
      aiVerification = {
        aiSummary: integrityStatus === 'CLEAR'
          ? 'Assessment completed with verified hardware presence and clean focus telemetry.'
          : `Assessment flagged for review: ${ruleViolations.length} warning(s) issued.`,
        explanation: recordingFailureReason || (ruleViolations[0]?.evidence || 'Normal proctoring verification.'),
        confidenceScore: 92,
        recruiterRecommendation: integrityStatus === 'CLEAR' ? 'AUTO_PASS' : 'HUMAN_REVIEW_RECOMMENDED',
      };
    }

    return this.formatResult({
      roundType: 'INTEGRITY_AUDIT',
      status: 'COMPLETED',
      score: Math.max(0, 100 - totalRiskPoints),
      maxScore: 100,
      evaluation: {
        integrityStatus,
        riskScore: totalRiskPoints,
        riskLevel,
        reviewRecommended: integrityStatus !== 'CLEAR',
        warningCount: ruleViolations.length,
        recordingVerification: {
          status: recordingMetadata.verificationStatus || (recordingIntegrityFailed ? 'VERIFICATION_FAILED' : 'VERIFIED'),
          durationSeconds: recordingMetadata.durationSeconds || 0,
          hasAudio: recordingMetadata.hasAudio ?? true,
          hasVideo: recordingMetadata.hasVideo ?? true,
          synchronized: recordingMetadata.synchronized ?? true,
          error: recordingFailureReason,
        },
        metrics: {
          tabSwitches: tabSwitchCount,
          totalTabHiddenSec,
          cameraDrops,
          totalCameraOfflineSec,
          micDrops,
          totalMicOfflineSec,
          multipleFaceDetections: isGD ? 0 : multipleFacesCount,
          readingDetections: isGD ? 0 : readingCount,
          largePastes: largePasteCount,
          networkDrops: networkDisconnectCount,
          reloads: reloadCount,
        },
        aiSummary: aiVerification.aiSummary,
        explanation: aiVerification.explanation,
        recruiterRecommendation: aiVerification.recruiterRecommendation,
      },
      evidence: ruleViolations,
      timeline: eventTimeline,
      nextAction: integrityStatus === 'CLEAR' ? 'PASS' : 'FLAG_FOR_RECRUITER_REVIEW',
    });
  }
}
