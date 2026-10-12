import 'dotenv/config';
import assert from 'assert';
import { newId, saveSession, getSession } from './src/store.js';
import { AssessmentOrchestratorAgent } from './src/agents/assessmentOrchestrator.js';

async function testRuntimeAssessmentPipeline() {
  console.log('====================================================');
  console.log('  TESTING RUNTIME ASSESSMENT & QUESTION PIPELINE    ');
  console.log('====================================================\n');

  const orchestrator = new AssessmentOrchestratorAgent();

  console.log('1. Creating Mock Assessment Session from SkillSetu...');
  const sessionId = newId();
  const session = await saveSession({
    id: sessionId,
    name: 'Aryan Bhoge',
    candidateContext: {
      student: { name: 'Aryan Bhoge', rollNo: 'SS-2026-001', branch: 'Computer Science' },
      internship: { title: 'Backend Software Engineering Intern', company: 'SkillSetu Tech' },
      round: { name: 'Aptitude & Technical Screening', type: 'aptitude' },
    },
    pipeline: {
      rounds: ['aptitude', 'technical', 'interview', 'gd'],
      aptitudeConfig: { mcqCount: 6, theoryCount: 2, codingCount: 1 },
    },
    currentRound: 'aptitude',
    mode: 'PRACTICE',
  });

  console.log(`   Session created successfully: ${session.id}`);
  assert.strictEqual(session.name, 'Aryan Bhoge');
  assert.strictEqual(session.currentRound, 'aptitude');

  console.log('\n2. Testing /api/assessment/:id/round/setup for Aptitude...');
  const roundSetup = await orchestrator.setupCurrentRound(session.id, 'aptitude');

  console.log('   Round setup received:', {
    round: roundSetup.round,
    mcqCount: roundSetup.mcqs?.length,
    theoryCount: roundSetup.theoryQuestions?.length,
    hasCodingProblem: Boolean(roundSetup.codingProblem),
  });

  assert.strictEqual(roundSetup.round, 'aptitude');
  assert(Array.isArray(roundSetup.mcqs), 'mcqs must be an array');
  assert(roundSetup.mcqs.length > 0, 'mcqs must not be empty');
  assert(roundSetup.mcqs[0].question, 'First MCQ must have a question prompt');
  assert(roundSetup.mcqs[0].options, 'First MCQ must have options');
  assert(roundSetup.mcqs[0].options.A, 'Option A must exist');

  console.log('   Sample MCQ 1:', {
    id: roundSetup.mcqs[0].id,
    skill: roundSetup.mcqs[0].skill,
    question: roundSetup.mcqs[0].question,
    options: roundSetup.mcqs[0].options,
  });

  console.log('\n3. Testing Theory Questions Generation...');
  assert(Array.isArray(roundSetup.theoryQuestions), 'theoryQuestions must be an array');
  assert(roundSetup.theoryQuestions.length > 0, 'theoryQuestions must not be empty');
  console.log('   Sample Theory 1:', {
    id: roundSetup.theoryQuestions[0].id,
    skill: roundSetup.theoryQuestions[0].skill,
    question: roundSetup.theoryQuestions[0].question,
  });

  console.log('\n4. Testing Coding Problem Generation...');
  assert(roundSetup.codingProblem, 'codingProblem must be generated');
  console.log('   Coding Problem:', {
    title: roundSetup.codingProblem.title,
    language: roundSetup.codingProblem.language,
    hasStarterCode: Boolean(roundSetup.codingProblem.starter_code),
  });

  console.log('\n====================================================');
  console.log('  ALL RUNTIME LIFECYCLE & QUESTION TESTS PASSED!    ');
  console.log('====================================================\n');
}

testRuntimeAssessmentPipeline().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
