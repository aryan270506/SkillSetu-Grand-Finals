import { BaseAgent } from './baseAgent.js';
import { CodeSandbox } from '../sandbox/codeSandbox.js';

const CODING_GENERATOR_PROMPT = `You are the Coding Challenge Designer for SkillSetu.
Design an authentic, role-aligned software engineering coding problem matching the required skills in the job description.
Provide a clear problem statement, input/output specifications, constraints, 2-3 visible test cases with explanations, and 3-4 hidden validation test cases with edge cases.
Also provide clean starter code template. Ensure the solution can read input from stdin or function arguments.`;

const CODE_QUALITY_PROMPT = `You are a Senior Staff Engineer reviewing code submitted for a technical coding interview.
Assess the code for:
1. Time and Space Complexity (Big O)
2. Code readability, idiomatic style, and naming conventions
3. Modularity and separation of concerns
4. Edge-case handling and defensive programming
Provide actionable feedback and a quality score from 0-10.`;

export class CodingAgent extends BaseAgent {
  constructor() {
    super('CodingAgent');
  }

  /**
   * Generates a dynamic coding problem tailored to the internship.
   */
  async generateProblem(context, config = {}) {
    const language = config.language || 'python';
    const difficulty = config.difficulty || 'Medium';

    const userPrompt = `ROLE: ${context.jd}
LANGUAGE: ${language}
DIFFICULTY: ${difficulty}

Generate an industry-relevant coding problem with:
- title
- problem_statement (Markdown)
- input_format
- output_format
- constraints
- starter_code (syntactically valid ${language} boilerplate)
- visible_tests (array of { name, input, expected_output, explanation })
- hidden_tests (array of { name, input, expected_output, isHidden: true })`;

    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        difficulty: { type: 'string' },
        language: { type: 'string' },
        problem_statement: { type: 'string' },
        input_format: { type: 'string' },
        output_format: { type: 'string' },
        constraints: { type: 'array', items: { type: 'string' } },
        starter_code: { type: 'string' },
        visible_tests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              input: { type: 'string' },
              expected_output: { type: 'string' },
              explanation: { type: 'string' },
            },
            required: ['input', 'expected_output'],
          },
        },
        hidden_tests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              input: { type: 'string' },
              expected_output: { type: 'string' },
            },
            required: ['input', 'expected_output'],
          },
        },
      },
      required: [
        'id',
        'title',
        'difficulty',
        'problem_statement',
        'starter_code',
        'visible_tests',
        'hidden_tests',
      ],
    };

    const res = await this.invokeGemini(CODING_GENERATOR_PROMPT, userPrompt, schema, 'minimal');
    const problem = res;
    
    // Combine visible and hidden test cases with isHidden flag
    const allTestCases = [
      ...(problem.visible_tests || []).map((t) => ({ ...t, isHidden: false })),
      ...(problem.hidden_tests || []).map((t) => ({ ...t, isHidden: true })),
    ];
    problem.test_cases = allTestCases;
    return problem;
  }

  /**
   * Executes code in sandbox on visible tests (for live candidate debugging).
   */
  async runVisibleTests(language, sourceCode, problem) {
    const visibleTests = (problem.test_cases || []).filter((tc) => !tc.isHidden);
    return CodeSandbox.runTestSuite(language, sourceCode, visibleTests);
  }

  /**
   * Evaluates final coding submission: executes all tests (including hidden) in sandbox,
   * then analyzes code quality via Gemini.
   */
  async evaluateSubmission(context, problem, language, sourceCode) {
    const allTests = problem.test_cases || [];
    const executionResult = await CodeSandbox.runTestSuite(language, sourceCode, allTests);

    const deterministicScore = executionResult.passPercentage; // 0 - 100

    const analysisPrompt = `PROBLEM:
${problem.title} - ${problem.problem_statement}

CANDIDATE SOURCE CODE (${language}):
\`\`\`${language}
${sourceCode || '// No code submitted'}
\`\`\`

EXECUTION RESULTS:
Passed ${executionResult.passedCount} of ${executionResult.totalTests} test cases (${deterministicScore}% pass rate).
Runtime Errors / Timeouts: ${executionResult.results.some((r) => r.timedOut) ? 'Yes (Timeout)' : 'None'}`;

    const schema = {
      type: 'object',
      properties: {
        timeComplexity: { type: 'string' },
        spaceComplexity: { type: 'string' },
        codeQualityScore: { type: 'number', description: '0-10' },
        summary: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
      required: ['timeComplexity', 'spaceComplexity', 'codeQualityScore', 'summary', 'strengths', 'weaknesses'],
    };

    let aiReview;
    try {
      aiReview = await this.invokeGemini(CODE_QUALITY_PROMPT, analysisPrompt, schema, 'minimal');
    } catch (err) {
      aiReview = {
        timeComplexity: 'Not specified',
        spaceComplexity: 'Not specified',
        codeQualityScore: deterministicScore > 70 ? 8.0 : 5.0,
        summary: `Passed ${executionResult.passedCount}/${executionResult.totalTests} tests.`,
        strengths: deterministicScore === 100 ? ['Passed all test cases accurately.'] : ['Attempted solution structure.'],
        weaknesses: deterministicScore < 100 ? ['Some edge cases failed execution.'] : [],
        recommendations: ['Refactor for asymptotic efficiency.'],
      };
    }

    // Authoritative weighting: 70% sandbox test suite + 30% code quality
    const aiQualityScore100 = Math.min(100, Math.max(0, (aiReview.codeQualityScore || 5) * 10));
    const compositeScore = Math.round(deterministicScore * 0.7 + aiQualityScore100 * 0.3);

    return this.formatResult({
      roundType: 'TECHNICAL_CODING',
      score: compositeScore,
      maxScore: 100,
      evaluation: {
        deterministicScore,
        aiQualityScore: aiQualityScore100,
        testResults: {
          total: executionResult.totalTests,
          passed: executionResult.passedCount,
          passPercentage: executionResult.passPercentage,
          allPassed: executionResult.allPassed,
          details: executionResult.results,
        },
        codeQuality: {
          timeComplexity: aiReview.timeComplexity,
          spaceComplexity: aiReview.spaceComplexity,
          qualityScore: aiReview.codeQualityScore,
          summary: aiReview.summary,
        },
      },
      evidence: [
        {
          type: 'CODE_SUBMISSION',
          language,
          sourceCode,
          passRate: `${executionResult.passedCount}/${executionResult.totalTests}`,
        },
      ],
      strengths: aiReview.strengths || [],
      weaknesses: aiReview.weaknesses || [],
      nextAction: compositeScore >= 60 ? 'ADVANCE' : 'REVIEW_RECOMMENDED',
    });
  }
}
