import { BaseAgent } from './baseAgent.js';
import { AptitudeAgent } from './aptitudeAgent.js';
import { TechnicalAgent } from './technicalAgent.js';
import { InterviewAgent } from './interviewAgent.js';
import { GDAgent } from './gdAgent.js';
import { IntegrityVerificationAgent } from './integrityVerificationAgent.js';
import { FinalEvaluationAgent } from './finalEvaluationAgent.js';
import { updateSession, getSession, recordingPath } from '../store.js';
import { finalizeRecording } from '../recording.js';

export class AssessmentOrchestratorAgent extends BaseAgent {
  constructor() {
    super('AssessmentOrchestratorAgent');
    this.aptitudeAgent = new AptitudeAgent();
    this.technicalAgent = new TechnicalAgent();
    this.interviewAgent = new InterviewAgent();
    this.gdAgent = new GDAgent();
    this.integrityAgent = new IntegrityVerificationAgent();
    this.finalEvaluationAgent = new FinalEvaluationAgent();
  }

  /**
   * Initializes or loads the assessment pipeline configuration for a session.
   */
  async initializeSessionPipeline(session, customPipeline = null) {
    const defaultPipeline = {
      rounds: [
        { id: 'aptitude', type: 'APTITUDE', name: 'Aptitude Round', enabled: true, durationMin: 20 },
        { id: 'technical', type: 'TECHNICAL', name: 'Technical Round (Theory + Coding)', enabled: true, durationMin: 35 },
        { id: 'interview', type: 'AI_INTERVIEW', name: 'AI Voice Interview', enabled: true, durationMin: 15 },
        { id: 'gd', type: 'GROUP_DISCUSSION', name: 'Group Discussion', enabled: true, durationMin: 15 },
      ],
      weights: {
        aptitude: 20,
        technical: 40,
        interview: 20,
        gd: 20,
      },
      passingThreshold: 60,
    };

    const pipeline = customPipeline || session.pipeline || defaultPipeline;
    const enabledRounds = pipeline.rounds.filter((r) => r.enabled);
    const firstRound = enabledRounds[0]?.id || 'interview';

    return updateSession(session.id, (s) => {
      s.pipeline = pipeline;
      s.currentRound = s.currentRound || firstRound;
      s.roundResults = s.roundResults || {};
      s.integritySignals = s.integritySignals || [];
      s.recordings = s.recordings || {};
    });
  }

  /**
   * Prepares and initializes data for the current active round.
   */
  async setupCurrentRound(sessionId, roundId = null) {
    const session = await getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const targetRound = roundId || session.currentRound || 'interview';
    const context = {
      jd: session.jd,
      resumeText: session.resumeText,
      name: session.name,
      candidateContext: session.candidateContext || null,
      student: session.candidateContext?.student || null,
      internship: session.candidateContext?.internship || null,
      round: session.candidateContext?.round || null,
      mode: session.mode || 'REAL',
    };

    if (targetRound === 'aptitude') {
      if (!session.aptitudeAssessment) {
        const assessment = await this.aptitudeAgent.generateAssessment(context, {
          mcqCount: session.questionCount || 6,
          theoryCount: 2,
          codingCount: 1,
          difficulty: 'Intermediate',
          ...(session.pipeline?.aptitudeConfig || {}),
        });
        await updateSession(sessionId, (s) => {
          s.aptitudeAssessment = assessment;
          s.aptitudeQuestions = assessment.mcqs;
        });
        return this.sanitizeForCandidate({
          round: 'aptitude',
          mcqs: assessment.mcqs,
          theoryQuestions: assessment.theoryQuestions,
          codingProblem: assessment.codingProblem,
          questions: assessment.mcqs,
        });
      }
      return this.sanitizeForCandidate({
        round: 'aptitude',
        mcqs: session.aptitudeAssessment.mcqs,
        theoryQuestions: session.aptitudeAssessment.theoryQuestions,
        codingProblem: session.aptitudeAssessment.codingProblem,
        questions: session.aptitudeAssessment.mcqs || session.aptitudeQuestions,
      });
    }

    if (targetRound === 'technical') {
      if (!session.technicalSetup) {
        const techSetup = await this.technicalAgent.setupRound(context, {
          theoryCount: 3,
          codingEnabled: true,
          language: 'python',
        });
        await updateSession(sessionId, (s) => {
          s.technicalSetup = techSetup;
        });
        return {
          round: 'technical',
          theoryQuestions: techSetup.theoryQuestions,
          codingProblem: this.sanitizeForCandidate({ coding_problem: techSetup.codingProblem }).coding_problem,
        };
      }
      return {
        round: 'technical',
        theoryQuestions: session.technicalSetup.theoryQuestions,
        codingProblem: this.sanitizeForCandidate({ coding_problem: session.technicalSetup.codingProblem }).coding_problem,
      };
    }

    if (targetRound === 'gd') {
      if (!session.gdTopic) {
        const gdTopic = await this.gdAgent.generateTopic(context);
        await updateSession(sessionId, (s) => {
          s.gdTopic = gdTopic;
        });
        return { round: 'gd', topic: gdTopic };
      }
      return { round: 'gd', topic: session.gdTopic };
    }

    if (targetRound === 'interview') {
      return {
        round: 'interview',
        context: this.interviewAgent.prepareInterviewContext(session),
      };
    }

    return { round: targetRound };
  }

  /**
   * Evaluates and completes a specific round attempt, inspects media recording,
   * performs forensic integrity audit, and advances candidate.
   */
  async completeRound(sessionId, roundId, submissionData = {}) {
    const session = await getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const context = {
      jd: session.jd,
      resumeText: session.resumeText,
      name: session.name,
    };

    // 1. Authoritative Media Recording Verification
    const mediaCheck = await finalizeRecording(recordingPath(sessionId), {
      requireVideo: true,
      requireAudio: true,
    });

    let result;

    if (roundId === 'aptitude') {
      result = await this.aptitudeAgent.evaluateAttempt(session, submissionData, session.pipeline?.aptitudeConfig || {});
    } else if (roundId === 'technical') {
      result = await this.technicalAgent.evaluateRound({
        context,
        theoryQuestions: session.technicalSetup?.theoryQuestions || [],
        theoryTranscript: submissionData.theoryTranscript || [],
        codingProblem: session.technicalSetup?.codingProblem,
        codingLanguage: submissionData.codingLanguage || 'python',
        codingSourceCode: submissionData.codingSourceCode || '',
        config: session.technicalSetup?.config || {},
      });
    } else if (roundId === 'interview') {
      result = await this.interviewAgent.evaluateInterview(session);
    } else if (roundId === 'gd') {
      result = await this.gdAgent.evaluateDiscussion(session.gdTopic, submissionData.transcript || session.transcript || [], session.name);
    } else {
      throw new Error(`Unknown round type ${roundId}`);
    }

    // 2. Comprehensive Forensic Integrity Audit
    const integrityAudit = await this.integrityAgent.verifySessionIntegrity({
      sessionId,
      candidateName: session.name,
      roundType: roundId,
      events: session.integritySignals || [],
      recordingMetadata: mediaCheck,
      transcript: session.transcript || [],
    });

    // 3. Persist Round Result and Advance Pipeline
    const updated = await updateSession(sessionId, (s) => {
      s.roundResults = s.roundResults || {};
      s.roundResults[roundId] = result;
      s.roundResults.integrity = integrityAudit;
      s.hasRecording = mediaCheck.exists && mediaCheck.sizeBytes > 0;
      s.recordingMeta = mediaCheck;

      const enabledRounds = (s.pipeline?.rounds || []).filter((r) => r.enabled);
      const currentIndex = enabledRounds.findIndex((r) => r.id === roundId);
      if (currentIndex >= 0 && currentIndex < enabledRounds.length - 1) {
        s.currentRound = enabledRounds[currentIndex + 1].id;
        s.status = 'in_progress';
      } else {
        s.status = 'all_rounds_completed';
      }
    });

    // 4. Synthesize Final Assessment Dossier if all enabled rounds completed
    if (updated.status === 'all_rounds_completed') {
      const finalSynthesis = await this.finalEvaluationAgent.synthesizeDossier(
        updated,
        updated.roundResults,
        updated.pipeline || {},
      );

      await updateSession(sessionId, (s) => {
        s.evaluation = finalSynthesis.evaluation;
        s.status = 'completed';
        s.completedAt = new Date().toISOString();
      });

      // Notify authoritative Main Backend if callbackUrl is configured
      if (updated.callbackUrl) {
        try {
          const callbackPayload = {
            assessmentId: sessionId,
            studentId: updated.studentId,
            applicationId: updated.applicationId,
            internshipId: updated.internshipId,
            status: 'completed',
            overallScore: finalSynthesis.evaluation?.overallScore ?? null,
            roundResults: updated.roundResults,
            evaluation: finalSynthesis.evaluation,
            integrityStatus: integrityAudit.evaluation?.status || 'VERIFIED',
            warningCount: updated.warningCounts ? Object.values(updated.warningCounts).reduce((a, b) => a + b, 0) : 0,
          };
          fetch(updated.callbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-assessment-secret': process.env.LIVEKIT_API_SECRET || 'skillsetu-assessment-secret-token',
            },
            body: JSON.stringify(callbackPayload),
          }).catch((err) => {
            console.warn('Asynchronous callback to main backend failed:', err.message);
          });
        } catch (cbErr) {
          console.warn('Callback invocation error:', cbErr.message);
        }
      }
    }

    return {
      roundResult: result,
      integrityAudit: integrityAudit.evaluation,
      recordingStatus: mediaCheck.verificationStatus,
      currentRound: updated.currentRound,
      status: updated.status,
      evaluation: updated.evaluation,
    };
  }

  /**
   * Evaluates live telemetry signal and manages per-round warnings & state machine.
   */
  async recordIntegritySignal(sessionId, signal) {
    const session = await getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const evalResult = await this.integrityAgent.evaluateLiveSignal(session, signal);

    await updateSession(sessionId, (s) => {
      s.integritySignals = s.integritySignals || [];
      if (evalResult.event) {
        s.integritySignals.push(evalResult.event);
      }
      s.warningCounts = session.warningCounts || { aptitude: 0, technical: 0, interview: 0, gd: 0 };
      if (evalResult.isTerminated) {
        s.terminatedRounds = s.terminatedRounds || {};
        s.terminatedRounds[s.currentRound] = true;
      }
    });

    return evalResult;
  }

  /**
   * Processes candidate explanation for an active warning.
   */
  async processCandidateExplanation(sessionId, data) {
    const session = await getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const result = await this.integrityAgent.processCandidateExplanation({
      session,
      eventId: data.eventId,
      reasonCategory: data.reasonCategory,
      explanationText: data.explanationText,
      deviceInfo: data.deviceInfo || {},
    });

    await updateSession(sessionId, (s) => {
      s.integritySignals = session.integritySignals;
    });

    return result;
  }
}

export const orchestrator = new AssessmentOrchestratorAgent();
