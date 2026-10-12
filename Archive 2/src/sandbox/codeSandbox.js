import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

/**
 * Isolated Code Sandbox
 * Executes untrusted candidate code in isolated subprocesses with strict wall-clock timeout,
 * memory boundaries, input piping, and output comparison.
 */
export class CodeSandbox {
  static DEFAULT_TIMEOUT_MS = 3000;

  /**
   * Execute code with given stdin input.
   * Supported languages: 'python', 'python3', 'javascript', 'js'
   */
  static async executeSingle(language, sourceCode, input = '', timeoutMs = CodeSandbox.DEFAULT_TIMEOUT_MS) {
    const lang = String(language || 'python').toLowerCase();
    const tempId = crypto.randomBytes(6).toString('hex');
    const tempDir = path.join(os.tmpdir(), `sandbox_${tempId}`);
    await fs.mkdir(tempDir, { recursive: true });

    let command = '';
    let args = [];
    let scriptFile = '';

    if (lang === 'python' || lang === 'python3' || lang === 'py') {
      scriptFile = path.join(tempDir, 'solution.py');
      await fs.writeFile(scriptFile, sourceCode, 'utf8');
      command = process.env.PYTHON_BIN || 'python3';
      args = ['-u', scriptFile];
    } else if (lang === 'javascript' || lang === 'js' || lang === 'node') {
      scriptFile = path.join(tempDir, 'solution.js');
      await fs.writeFile(scriptFile, sourceCode, 'utf8');
      command = process.execPath; // Node.js executable
      args = ['--max-old-space-size=128', scriptFile];
    } else {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return {
        success: false,
        error: `Unsupported language '${language}'. Supported: python, javascript.`,
        stdout: '',
        stderr: '',
        runtimeMs: 0,
        timedOut: false,
      };
    }

    const startTime = Date.now();

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const proc = spawn(command, args, {
        cwd: tempDir,
        env: { PATH: process.env.PATH, LANG: 'en_US.UTF-8' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill('SIGKILL');
        } catch (_) {}
      }, timeoutMs);

      if (input) {
        try {
          proc.stdin.write(input);
          proc.stdin.end();
        } catch (_) {}
      } else {
        try {
          proc.stdin.end();
        } catch (_) {}
      }

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > 50000) {
          proc.kill('SIGKILL');
        }
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.length > 50000) {
          proc.kill('SIGKILL');
        }
      });

      proc.on('close', async (exitCode) => {
        clearTimeout(timer);
        const runtimeMs = Date.now() - startTime;
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

        if (timedOut) {
          resolve({
            success: false,
            exitCode: -1,
            stdout: stdout.trim(),
            stderr: 'Execution timed out (Time Limit Exceeded: 3.0s)',
            runtimeMs,
            timedOut: true,
          });
        } else if (exitCode !== 0) {
          resolve({
            success: false,
            exitCode,
            stdout: stdout.trim(),
            stderr: stderr.trim() || `Process exited with error code ${exitCode}`,
            runtimeMs,
            timedOut: false,
          });
        } else {
          resolve({
            success: true,
            exitCode: 0,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            runtimeMs,
            timedOut: false,
          });
        }
      });

      proc.on('error', async (err) => {
        clearTimeout(timer);
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        resolve({
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: err.message,
          runtimeMs: Date.now() - startTime,
          timedOut: false,
        });
      });
    });
  }

  /**
   * Run a test suite against code solution.
   */
  static async runTestSuite(language, sourceCode, testCases = [], timeoutMs = 3000) {
    const results = [];
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const execResult = await CodeSandbox.executeSingle(language, sourceCode, tc.input || '', timeoutMs);
      
      const expected = String(tc.expected_output || '').trim();
      const actual = String(execResult.stdout || '').trim();
      const passed = execResult.success && actual === expected;

      if (passed) passedCount++;

      results.push({
        testCaseIndex: i + 1,
        name: tc.name || `Test Case ${i + 1}`,
        input: tc.isHidden ? '(hidden)' : tc.input,
        expectedOutput: tc.isHidden ? '(hidden)' : expected,
        actualOutput: tc.isHidden && !passed ? '(hidden on failure)' : actual,
        passed,
        timedOut: execResult.timedOut,
        runtimeMs: execResult.runtimeMs,
        stderr: execResult.stderr || null,
        isHidden: !!tc.isHidden,
      });
    }

    const total = testCases.length;
    const passPercentage = total > 0 ? Math.round((passedCount / total) * 100) : 0;

    return {
      totalTests: total,
      passedCount,
      passPercentage,
      allPassed: total > 0 && passedCount === total,
      results,
    };
  }
}
