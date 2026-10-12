import 'dotenv/config';
import { AptitudeAgent } from './src/agents/aptitudeAgent.js';
import { orchestrator } from './src/agents/assessmentOrchestrator.js';
import { saveSession, newId } from './src/store.js';

async function runTripartiteAptitudeTest() {
  console.log('====================================================');
  console.log('  TESTING TRIPARTITE APTITUDE AGENT (MCQ+THEORY+CODE)');
  console.log('====================================================\n');

  const context = {
    name: 'Ananya Roy',
    jd: 'Full Stack Developer Intern: React, Node.js, SQL, PostgreSQL, REST APIs, Algorithms, Data Structures.',
    resumeText: 'Computer Science student with experience building full stack web apps with React, Express, PostgreSQL, and Data Structures.',
  };

  const aptAgent = new AptitudeAgent();

  // 1. Test Generation
  console.log('1. Generating Balanced Tripartite Assessment (MCQ + Theory + Coding)...');
  const assessment = await aptAgent.generateAssessment(context, {
    mcqCount: 3,
    theoryCount: 2,
    codingCount: 1,
    difficulty: 'Intermediate',
  });

  console.log(`   ✓ Generated ${assessment.mcqs.length} MCQs`);
  console.log(`   Sample MCQ 1: [${assessment.mcqs[0]?.skill || assessment.mcqs[0]?.category}] ${assessment.mcqs[0]?.question}`);
  console.log(`   Options:`, assessment.mcqs[0]?.options);
  console.log(`   Correct Answer: ${assessment.mcqs[0]?.correct_answer}\n`);

  console.log(`   ✓ Generated ${assessment.theoryQuestions.length} Written Theory Questions`);
  console.log(`   Sample Theory 1: [${assessment.theoryQuestions[0]?.topic}] ${assessment.theoryQuestions[0]?.question}`);
  console.log(`   Expected Key Points:`, assessment.theoryQuestions[0]?.expected_key_points, '\n');

  console.log(`   ✓ Generated Coding Challenge: "${assessment.codingProblem?.title}"`);
  console.log(`   Problem: ${assessment.codingProblem?.problem_statement?.slice(0, 100)}...`);
  console.log(`   Tests: ${assessment.codingProblem?.test_cases?.length} (${assessment.codingProblem?.visible_tests?.length} visible, ${assessment.codingProblem?.hidden_tests?.length} hidden)\n`);

  if (!assessment.mcqs.length || !assessment.theoryQuestions.length || !assessment.codingProblem) {
    throw new Error('Assessment generation missing required sections');
  }

  // 2. Test Candidate Answers & Evaluation
  console.log('2. Evaluating Candidate Submission Across All 3 Sections...');
  
  // MCQ Answers (2 correct, 1 incorrect)
  const mcqAnswers = {
    [assessment.mcqs[0]?.id]: assessment.mcqs[0]?.correct_answer,
    [assessment.mcqs[1]?.id]: assessment.mcqs[1]?.correct_answer,
    [assessment.mcqs[2]?.id]: assessment.mcqs[2]?.correct_answer === 'A' ? 'B' : 'A',
  };

  // Theory Answers
  const theoryAnswers = {
    [assessment.theoryQuestions[0]?.id]:
      'Database indexing creates B-tree or hash structures that allow the query engine to look up rows in O(log N) or O(1) time without scanning the entire table sequentially.',
    [assessment.theoryQuestions[1]?.id]:
      'REST exposes fixed resource endpoints using standard HTTP verbs, whereas GraphQL allows clients to query exact fields with a flexible schema in a single round-trip.',
  };

  // Coding Submission
  const samplePythonSolution = `
import sys

def solve():
    raw = sys.stdin.read().strip()
    if not raw:
        return
    lines = [line.strip() for line in raw.split('\\n') if line.strip()]
    if lines:
        print(lines[0])

if __name__ == '__main__':
    solve()
`;

  const sessionMock = {
    name: context.name,
    jd: context.jd,
    aptitudeAssessment: assessment,
  };

  const evaluationResult = await aptAgent.evaluateAttempt(sessionMock, {
    mcqAnswers,
    theoryAnswers,
    codingSourceCode: samplePythonSolution,
    codingLanguage: 'python',
  }, {
    weights: { mcq: 0.4, theory: 0.3, coding: 0.3 },
    passingScore: 60,
  });

  console.log(`   ✓ Overall Aptitude Score: ${evaluationResult.score}/100`);
  console.log(`   ✓ MCQ Section Score: ${evaluationResult.evaluation.sections.mcq.score}% (${evaluationResult.evaluation.sections.mcq.correctCount}/${evaluationResult.evaluation.sections.mcq.totalQuestions} Correct)`);
  console.log(`   ✓ Theory Section Score: ${evaluationResult.evaluation.sections.theory.score}% (Average: ${evaluationResult.evaluation.sections.theory.averageScore}/10)`);
  console.log(`   ✓ Coding Section Score: ${evaluationResult.evaluation.sections.coding?.final_coding_score}% (Tests Passed: ${evaluationResult.evaluation.sections.coding?.testsPassed})`);
  console.log(`   ✓ Skill Breakdown:`, evaluationResult.evaluation.skillBreakdown);
  console.log(`   ✓ Recommendation: ${evaluationResult.evaluation.recommendation}\n`);

  // 3. Test Orchestrator End-to-End Pipeline Integration
  console.log('3. Testing Orchestrator Pipeline with Aptitude Round...');
  const sessionId = newId();
  await saveSession({
    id: sessionId,
    name: context.name,
    jd: context.jd,
    resumeText: context.resumeText,
    currentRound: 'aptitude',
    status: 'in_progress',
    pipeline: {
      rounds: [
        { id: 'aptitude', name: 'Aptitude Round', enabled: true },
        { id: 'technical', name: 'Technical Round', enabled: true },
      ],
      weights: { aptitude: 50, technical: 50 },
    },
  });

  const setupData = await orchestrator.setupCurrentRound(sessionId, 'aptitude');
  console.log(`   ✓ Orchestrator Setup Round returned: ${setupData.mcqs?.length} sanitized MCQs, ${setupData.theoryQuestions?.length} Theory questions, and Coding Problem "${setupData.codingProblem?.title}".`);

  // Verify that secrets are NOT leaked to candidate
  const firstMcq = setupData.mcqs[0];
  if (firstMcq.correct_answer || firstMcq.explanation) {
    throw new Error('Candidate leak: correct_answer or explanation present in sanitized MCQs!');
  }
  if (setupData.codingProblem?.hidden_tests?.length) {
    throw new Error('Candidate leak: hidden_tests present in sanitized coding problem!');
  }
  console.log('   ✓ Security Verification Passed: Answer keys and hidden test cases sanitized from candidate payload.');

  const completeResult = await orchestrator.completeRound(sessionId, 'aptitude', {
    mcqAnswers,
    theoryAnswers,
    codingSourceCode: samplePythonSolution,
    codingLanguage: 'python',
  });

  console.log(`   ✓ Complete Round Result: Score ${completeResult.roundResult.score}/100, Advanced to: ${completeResult.currentRound}`);
  console.log('\n====================================================');
  console.log('  ALL TRIPARTITE APTITUDE TESTS PASSED 100%         ');
  console.log('====================================================');
}

runTripartiteAptitudeTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
