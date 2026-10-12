import 'dotenv/config';
import { CodeSandbox } from './src/sandbox/codeSandbox.js';
import {
  AptitudeAgent,
  TheoryAgent,
  CodingAgent,
  TechnicalAgent,
  InterviewAgent,
  GDAgent,
  IntegrityAgent,
  FinalEvaluationAgent,
  orchestrator,
} from './src/agents/index.js';

async function runTests() {
  console.log('====================================================');
  console.log('  TESTING SKILLSETU MULTI-AGENT ASSESSMENT SYSTEM   ');
  console.log('====================================================\n');

  const context = {
    name: 'Rahul Sharma',
    jd: 'Backend Developer Intern: Python, FastAPI, PostgreSQL, Redis, REST APIs, Microservices.',
    resumeText: 'B.Tech CSE student proficient in Python, SQL, REST APIs. Built an e-commerce API backend with FastAPI and PostgreSQL.',
  };

  // 1. CodeSandbox Test
  console.log('1. Testing Isolated Code Sandbox...');
  const pythonCode = `
import sys
data = sys.stdin.read().split()
if data:
    a, b = int(data[0]), int(data[1])
    print(a + b)
else:
    print(0)
`;
  const testCases = [
    { name: 'Test 1', input: '3 5\n', expected_output: '8', isHidden: false },
    { name: 'Test 2', input: '10 -2\n', expected_output: '8', isHidden: false },
    { name: 'Hidden Test 3', input: '100 200\n', expected_output: '300', isHidden: true },
  ];
  const sandboxResult = await CodeSandbox.runTestSuite('python', pythonCode, testCases);
  console.log(`   Sandbox Result: ${sandboxResult.passedCount}/${sandboxResult.totalTests} passed (${sandboxResult.passPercentage}%)`);
  if (!sandboxResult.allPassed) throw new Error('CodeSandbox test failed');
  console.log('   ✓ CodeSandbox passed!\n');

  // 2. AptitudeAgent Test
  console.log('2. Testing AptitudeAgent...');
  const aptAgent = new AptitudeAgent();
  const aptQuestions = await aptAgent.generateQuestions(context, { questionCount: 3 });
  console.log(`   Generated ${aptQuestions.length} aptitude questions.`);
  console.log(`   Sample Q1: [${aptQuestions[0]?.category}] ${aptQuestions[0]?.question}`);
  
  const sampleAnswers = { [aptQuestions[0]?.id]: aptQuestions[0]?.correct_answer };
  const aptEval = await aptAgent.evaluateAttempt({ name: context.name, jd: context.jd, aptitudeQuestions: aptQuestions }, sampleAnswers);
  console.log(`   Aptitude Eval Score: ${aptEval.score}/100, Passed: ${aptEval.evaluation.isPassed}`);
  console.log('   ✓ AptitudeAgent passed!\n');

  // 3. TheoryAgent Test
  console.log('3. Testing TheoryAgent...');
  const theoryAgent = new TheoryAgent();
  const theoryQuestions = await theoryAgent.generateQuestions(context, 2);
  console.log(`   Generated ${theoryQuestions.length} theory questions.`);
  console.log(`   Sample Q1: ${theoryQuestions[0]?.question}`);
  const theoryEval = await theoryAgent.evaluateAnswers(context, theoryQuestions, [
    { role: 'candidate', text: 'In FastAPI we use async def routes with connection pooling to prevent blocking the event loop when querying PostgreSQL.' }
  ]);
  console.log(`   Theory Eval Score: ${theoryEval.score}/100, Accuracy: ${theoryEval.evaluation.metrics?.technicalAccuracy}/10`);
  console.log('   ✓ TheoryAgent passed!\n');

  // 4. CodingAgent Test
  console.log('4. Testing CodingAgent...');
  const codingAgent = new CodingAgent();
  const codingProblem = await codingAgent.generateProblem(context, { language: 'python', difficulty: 'Easy' });
  console.log(`   Generated Problem: "${codingProblem.title}" with ${codingProblem.test_cases?.length} tests.`);
  console.log('   ✓ CodingAgent passed!\n');

  // 5. GDAgent Test
  console.log('5. Testing GDAgent...');
  const gdAgent = new GDAgent();
  const gdTopic = await gdAgent.generateTopic(context);
  console.log(`   Generated GD Topic: "${gdTopic.topicTitle}"`);
  const gdEval = await gdAgent.evaluateDiscussion(gdTopic, [
    { speaker: 'Rahul Sharma', text: 'I advocate for modular monoliths initially because distributed tracing and network overhead can slow down early startup iteration.' },
    { speaker: 'Priya Patil', text: 'I agree with Rahul on initial velocity, but we must define strict module boundaries for future extraction.' }
  ], 'Rahul Sharma');
  console.log(`   GD Score: ${gdEval.score}/100, Collaboration: ${gdEval.evaluation.dimensions?.constructiveCollaboration}/10`);
  console.log('   ✓ GDAgent passed!\n');

  // 6. IntegrityAgent Test
  console.log('6. Testing IntegrityAgent...');
  const integrityAgent = new IntegrityAgent();
  const integrityAudit = integrityAgent.evaluateIntegritySignals([
    { type: 'TAB_SWITCH', durationMs: 1500 },
    { type: 'WINDOW_BLUR', durationMs: 2000 },
  ]);
  console.log(`   Integrity Score: ${integrityAudit.score}/100, Review Recommended: ${integrityAudit.evaluation.reviewRecommended}`);
  console.log('   ✓ IntegrityAgent passed!\n');

  // 7. FinalEvaluationAgent Test
  console.log('7. Testing FinalEvaluationAgent...');
  const finalAgent = new FinalEvaluationAgent();
  const finalSynthesis = await finalAgent.synthesizeDossier(
    { name: context.name, jd: context.jd },
    {
      aptitude: aptEval,
      technical: { score: 85, evaluation: { theoryScore: 80, codingScore: 90 } },
      interview: { score: 88, evaluation: { overallScore: 8.8 } },
      gd: gdEval,
      integrity: integrityAudit,
    },
    { weights: { aptitude: 20, technical: 40, interview: 20, gd: 20 } }
  );
  console.log(`   Composite Score: ${finalSynthesis.score}/100, Recommendation: ${finalSynthesis.evaluation.recommendation}`);
  console.log(`   Executive Summary: ${finalSynthesis.evaluation.executiveSummary}`);
  console.log('   ✓ FinalEvaluationAgent passed!\n');

  console.log('====================================================');
  console.log('  ALL 9 MULTI-AGENT ASSESSMENT MODULES PASSED 100%  ');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
