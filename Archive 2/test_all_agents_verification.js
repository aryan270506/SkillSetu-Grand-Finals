import 'dotenv/config';
import {
  BaseAgent,
  AptitudeAgent,
  TheoryAgent,
  CodingAgent,
  TechnicalAgent,
  InterviewAgent,
  GDAgent,
  IntegrityVerificationAgent,
  ReadingDetectionAgent,
  IntegrityExplanationAgent,
  FinalEvaluationAgent,
  AssessmentOrchestratorAgent,
  orchestrator,
} from './src/agents/index.js';
import { CodeSandbox } from './src/sandbox/codeSandbox.js';
import { saveSession, getSession, updateSession, listSessions, newId } from './src/store.js';

const results = [];

function recordResult(section, testName, passed, details = '') {
  results.push({ section, testName, passed, details });
  const mark = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${section}] ${mark}: ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function runAudit() {
  console.log('================================================================');
  console.log('  SKILLSETU MULTI-AGENT ASSESSMENT SYSTEM — FORENSIC AUDIT SUITE');
  console.log('================================================================\n');

  const context = {
    name: 'Aarav Patel',
    jd: 'Backend Engineering Intern: Python, FastAPI, PostgreSQL, Redis, REST APIs, Microservices, Algorithms.',
    resumeText: 'Computer Science student proficient in Python, SQL, REST APIs, and distributed systems. Built a high-concurrency order processing API in FastAPI.',
  };

  // -------------------------------------------------------------
  // 1. BASE AGENT & ERROR RESILIENCE
  // -------------------------------------------------------------
  console.log('--- 1. Testing BaseAgent & Error Resilience ---');
  try {
    const base = new BaseAgent('TestBaseAgent');
    const envelope = base.formatResult({ roundType: 'TEST', score: 85, evaluation: { passed: true } });
    const isEnvelopeValid = envelope.roundType === 'TEST' && envelope.score === 85 && envelope.timestamp;
    recordResult('BaseAgent', 'Format Result Envelope', isEnvelopeValid);

    // Test sanitization
    const rawPayload = {
      questions: [{ id: 'q1', correct_answer: 'A', explanation: 'Secret', text: 'Sample' }],
      theoryQuestions: [{ id: 't1', expected_key_points: ['Key1'], question: 'Explain' }],
      codingProblem: {
        hidden_tests: [{ input: '1', expected_output: '1' }],
        test_cases: [{ isHidden: true, input: '1' }, { isHidden: false, input: '2' }],
      },
    };
    const sanitized = base.sanitizeForCandidate(rawPayload);
    const isSanitized =
      !sanitized.questions[0].correct_answer &&
      !sanitized.theoryQuestions[0].expected_key_points &&
      !sanitized.codingProblem.hidden_tests &&
      sanitized.codingProblem.test_cases.length === 1;
    recordResult('BaseAgent', 'Candidate Payload Sanitization', isSanitized);
  } catch (err) {
    recordResult('BaseAgent', 'BaseAgent Core Tests', false, err.message);
  }

  // -------------------------------------------------------------
  // 2. APTITUDE AGENT (TRIPARTITE: MCQ + THEORY + CODING)
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing AptitudeAgent (MCQ + Theory + Coding) ---');
  let aptAssessment = null;
  try {
    const aptAgent = new AptitudeAgent();
    aptAssessment = await aptAgent.generateAssessment(context, {
      mcqCount: 3,
      theoryCount: 2,
      codingCount: 1,
      difficulty: 'Intermediate',
    });

    const hasMcqs = aptAssessment.mcqs?.length === 3 && aptAssessment.mcqs[0].options && aptAssessment.mcqs[0].correct_answer;
    const hasTheory = aptAssessment.theoryQuestions?.length === 2 && aptAssessment.theoryQuestions[0].expected_key_points;
    const hasCoding = aptAssessment.codingProblem && aptAssessment.codingProblem.test_cases?.length >= 3;
    recordResult('AptitudeAgent', 'Dynamic Tripartite Generation (MCQ+Theory+Code)', hasMcqs && hasTheory && hasCoding);

    // Test Evaluation
    const mcqAnswers = {
      [aptAssessment.mcqs[0]?.id]: aptAssessment.mcqs[0]?.correct_answer,
      [aptAssessment.mcqs[1]?.id]: aptAssessment.mcqs[1]?.correct_answer,
      [aptAssessment.mcqs[2]?.id]: 'WRONG_ANSWER',
    };
    const theoryAnswers = {
      [aptAssessment.theoryQuestions[0]?.id]: 'Database indexing uses B-Trees to speed up queries at the cost of slower writes and extra storage.',
      [aptAssessment.theoryQuestions[1]?.id]: 'REST uses standard HTTP methods, whereas GraphQL allows clients to request specific fields dynamically.',
    };
    const codingCode = 'import sys\nprint(sys.stdin.read().strip())';

    const aptEval = await aptAgent.evaluateAttempt({ name: context.name, jd: context.jd, aptitudeAssessment: aptAssessment }, {
      mcqAnswers,
      theoryAnswers,
      codingSourceCode: codingCode,
      codingLanguage: 'python',
    });

    const isEvalValid =
      typeof aptEval.score === 'number' &&
      aptEval.evaluation?.sections?.mcq?.score > 0 &&
      aptEval.evaluation?.sections?.theory?.score > 0 &&
      aptEval.evaluation?.skillBreakdown;
    recordResult('AptitudeAgent', 'Multi-Modal Evaluation & Scoring', isEvalValid);
  } catch (err) {
    recordResult('AptitudeAgent', 'Aptitude Execution', false, err.message);
  }

  // -------------------------------------------------------------
  // 3. TECHNICAL AGENT (THEORY + CODING)
  // -------------------------------------------------------------
  console.log('\n--- 3. Testing TechnicalAgent (Theory + Coding) ---');
  try {
    const techAgent = new TechnicalAgent();
    const techSetup = await techAgent.setupRound(context, { theoryCount: 2, codingEnabled: true, language: 'python' });
    const hasSetup = techSetup.theoryQuestions?.length === 2 && techSetup.codingProblem;
    recordResult('TechnicalAgent', 'Setup Round (Theory + Coding)', hasSetup);

    const techEval = await techAgent.evaluateRound({
      context,
      theoryQuestions: techSetup.theoryQuestions,
      theoryTranscript: [{ role: 'candidate', text: 'FastAPI uses Starlette and Pydantic for async high performance.' }],
      codingProblem: techSetup.codingProblem,
      codingLanguage: 'python',
      codingSourceCode: 'import sys\nprint(sys.stdin.read().strip())',
    });

    const isTechEvalValid = typeof techEval.score === 'number' && techEval.evaluation?.theoryScore !== undefined;
    recordResult('TechnicalAgent', 'Evaluate Round Aggregation', isTechEvalValid);
  } catch (err) {
    recordResult('TechnicalAgent', 'Technical Round Execution', false, err.message);
  }

  // -------------------------------------------------------------
  // 4. CODE SANDBOX SECURITY & TIMEOUTS
  // -------------------------------------------------------------
  console.log('\n--- 4. Testing CodeSandbox Security & Isolation ---');
  try {
    // Timeout test (infinite loop)
    const infiniteLoopCode = 'while True: pass';
    const loopResult = await CodeSandbox.runTestSuite('python', infiniteLoopCode, [{ input: '', expected_output: '' }]);
    const timedOutCorrectly = loopResult.results[0]?.timedOut === true;
    recordResult('CodeSandbox', 'Infinite Loop Timeout Enforcement', timedOutCorrectly);

    // Simple execution test
    const validCode = 'import sys\nprint("HELLO_SANDBOX")';
    const validResult = await CodeSandbox.runTestSuite('python', validCode, [{ input: '', expected_output: 'HELLO_SANDBOX' }]);
    recordResult('CodeSandbox', 'Deterministic Test Case Output Verification', validResult.allPassed);
  } catch (err) {
    recordResult('CodeSandbox', 'CodeSandbox Execution', false, err.message);
  }

  // -------------------------------------------------------------
  // 5. INTERVIEW AGENT & GD AGENT
  // -------------------------------------------------------------
  console.log('\n--- 5. Testing InterviewAgent & GDAgent ---');
  try {
    const interviewAgent = new InterviewAgent();
    const interviewEval = await interviewAgent.evaluateInterview({
      name: context.name,
      jd: context.jd,
      resumeText: context.resumeText,
      transcript: [
        { role: 'ai', text: 'How do you handle race conditions in database transactions?' },
        { role: 'candidate', text: 'I use database transactions with pessimistic locking or optimistic concurrency control via version numbers.' },
      ],
    });
    recordResult('InterviewAgent', 'AI Voice Interview Transcript Evaluation', typeof interviewEval.score === 'number' && interviewEval.evaluation?.skills?.length > 0);

    const gdAgent = new GDAgent();
    const gdTopic = await gdAgent.generateTopic(context);
    const gdEval = await gdAgent.evaluateDiscussion(gdTopic, [
      { speaker: 'Aarav Patel', text: 'Microservices introduce network latency; early startups should prioritize modular monoliths.' },
      { speaker: 'Priya S.', text: 'Agreed, but clear domain boundaries must be enforced from day one.' },
    ], 'Aarav Patel');
    recordResult('GDAgent', 'GD Topic Generation & Multi-Party Transcript Evaluation', typeof gdEval.score === 'number' && gdEval.evaluation?.dimensions?.constructiveCollaboration !== undefined);
  } catch (err) {
    recordResult('Interview/GDAgents', 'Interview/GD Execution', false, err.message);
  }

  // -------------------------------------------------------------
  // 6. INTEGRITY & ANTI-CHEATING STATE MACHINE
  // -------------------------------------------------------------
  console.log('\n--- 6. Testing Integrity Verification, Reading, & Explanations ---');
  try {
    const integrityAgent = new IntegrityVerificationAgent();
    const readingAgent = new ReadingDetectionAgent();
    const explanationAgent = new IntegrityExplanationAgent();

    const sessionMock = {
      id: newId(),
      name: 'Test Candidate',
      currentRound: 'aptitude',
      warningCounts: { aptitude: 0, technical: 0, interview: 0, gd: 0 },
      integritySignals: [],
    };

    // First Warning
    const w1 = await integrityAgent.evaluateLiveSignal(sessionMock, { type: 'TAB_SWITCH', durationSec: 18, roundId: 'aptitude' });
    recordResult('IntegritySystem', 'First Warning Issued & Round Paused', w1.action === 'WARNING_ISSUED' && w1.warningNumber === 1 && w1.isPaused);
    sessionMock.integritySignals.push(w1.event);

    // Plausible Explanation
    const expRes = await integrityAgent.processCandidateExplanation({
      session: sessionMock,
      eventId: w1.event.id,
      reasonCategory: 'Accidental click',
      explanationText: 'Accidentally clicked OS notification',
    });
    recordResult('IntegritySystem', 'Plausible Explanation Accepted & Round Resumed', expRes.explanationStatus === 'PLAUSIBLE' && !expRes.isPaused);

    // Second Warning -> Termination
    const w2 = await integrityAgent.evaluateLiveSignal(sessionMock, { type: 'CAMERA_DISABLED', durationSec: 25, roundId: 'aptitude' });
    recordResult('IntegritySystem', 'Second Warning Round Termination', w2.action === 'ROUND_TERMINATED' && w2.isTerminated);

    // Warning count reset on new round
    sessionMock.currentRound = 'technical';
    const wTech = await integrityAgent.evaluateLiveSignal(sessionMock, { type: 'TAB_SWITCH', durationSec: 20, roundId: 'technical' });
    recordResult('IntegritySystem', 'Per-Round Warning Count Reset', wTech.warningNumber === 1);

    // GD Exemption
    const gdMock = { id: newId(), currentRound: 'gd', warningCounts: { gd: 0 }, integritySignals: [] };
    const gdFace = await integrityAgent.evaluateLiveSignal(gdMock, { type: 'MULTIPLE_FACES', roundId: 'gd' });
    recordResult('IntegritySystem', 'GD Multi-Face Exemption Enforcement', gdFace.action === 'LOGGED_INFO' && !gdFace.isViolation);

    // Reading Detection
    const readEval = await readingAgent.analyzeReadingBehavior({
      candidateName: 'Test',
      roundType: 'interview',
      transcript: [{ text: 'Standard definition of database indexing is as follows...' }],
      visualSignals: [{ type: 'GAZE_AWAY' }, { type: 'LOOKING_DOWN' }, { type: 'OFF_SCREEN_FOCUS' }, { type: 'GAZE_AWAY' }],
      audioSignals: [{ type: 'UNNATURAL_CADENCE' }, { type: 'ROBOTIC_DELIVERY' }],
    });
    recordResult('IntegritySystem', 'Reading Detection Multi-Modal Correlation', readEval.classification === 'CONFIRMED_READING' || readEval.classification === 'POSSIBLE_READING');

    // Contradicted Explanation
    const contraRes = await explanationAgent.verifyExplanation({
      eventType: 'CAMERA_DISABLED',
      timestamp: new Date().toISOString(),
      durationSec: 180,
      candidateExplanationText: 'Camera was working the whole time and never turned off',
    });
    recordResult('IntegritySystem', 'Contradicted Explanation Flagging', contraRes.status === 'CONTRADICTED_BY_EVIDENCE');
  } catch (err) {
    recordResult('IntegritySystem', 'Integrity Evaluation', false, err.message);
  }

  // -------------------------------------------------------------
  // 7. FINAL EVALUATION & PERSISTENCE
  // -------------------------------------------------------------
  console.log('\n--- 7. Testing Final Evaluation & Persistence ---');
  try {
    const finalAgent = new FinalEvaluationAgent();
    const finalSynthesis = await finalAgent.synthesizeDossier(
      { name: context.name, jd: context.jd },
      {
        aptitude: { score: 85, evaluation: { summary: 'Strong analytical skills' } },
        technical: { score: 90, evaluation: { theoryScore: 85, codingScore: 95 } },
        interview: { score: 88, evaluation: { overallScore: 8.8 } },
        gd: { score: 80, evaluation: { dimensions: { constructiveCollaboration: 8 } } },
        integrity: { score: 100, evaluation: { reviewRecommended: false } },
      },
      { weights: { aptitude: 20, technical: 40, interview: 20, gd: 20 } }
    );
    recordResult('FinalEvaluation', 'Multi-Round Dossier Synthesis', finalSynthesis.score >= 80 && finalSynthesis.evaluation?.executiveSummary);

    // Persistence Test
    const testSessionId = newId();
    await saveSession({
      id: testSessionId,
      name: 'Persistence Candidate',
      jd: context.jd,
      status: 'created',
    });
    const loaded = await getSession(testSessionId);
    recordResult('Persistence', 'Atomic Save & Load Session', loaded && loaded.id === testSessionId);

    const list = await listSessions();
    recordResult('Persistence', 'Safe Session Listing with Sorting', Array.isArray(list) && list.some((s) => s.id === testSessionId));
  } catch (err) {
    recordResult('FinalEvaluation/Persistence', 'Final Evaluation Execution', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`AUDIT COMPLETE: ${results.filter((r) => r.passed).length} PASSED / ${results.length} TOTAL CHECKS`);
  console.log('================================================================');
}

runAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
