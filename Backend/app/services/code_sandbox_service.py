import sys
import time
import json
import sqlite3
import tempfile
import subprocess
import traceback
from typing import List, Dict, Any, Optional

def execute_code_in_sandbox(
    language: str,
    code: str,
    test_cases: List[Dict[str, Any]],
    schema_sql: Optional[str] = None,
    timeout_sec: float = 3.5
) -> Dict[str, Any]:
    """
    Executes student-submitted code against a list of test cases in an isolated sandbox.
    Supports Python, JavaScript (Node.js), and SQL (in-memory SQLite engine).
    """
    lang = (language or "python").lower().strip()
    
    start_time = time.perf_counter()
    
    if lang in ["sql", "sqlite", "postgresql", "mysql"]:
        res = _execute_sql(code, test_cases, schema_sql)
    elif lang in ["javascript", "js", "node", "typescript", "ts"]:
        res = _execute_javascript(code, test_cases, timeout_sec)
    else:
        # Default Python
        res = _execute_python(code, test_cases, timeout_sec)
        
    execution_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
    res["execution_time_ms"] = execution_time_ms
    
    return res


# ===========================================================================
# 1. SQL Execution Sandbox (In-Memory SQLite)
# ===========================================================================
def _execute_sql(query: str, test_cases: List[Dict[str, Any]], schema_sql: Optional[str]) -> Dict[str, Any]:
    query_clean = query.strip()
    if not query_clean:
        return {
            "passed": False,
            "total_tests": len(test_cases),
            "passed_tests": 0,
            "failed_tests": len(test_cases),
            "compile_error": "No SQL query provided.",
            "runtime_error": None,
            "test_results": []
        }

    test_results = []
    passed_count = 0

    for idx, tc in enumerate(test_cases, 1):
        is_hidden = tc.get("is_hidden", False)
        desc = tc.get("description", f"Test Case #{idx}")
        expected = tc.get("expected_output")
        custom_schema = tc.get("schema_sql") or schema_sql or ""

        # Create fresh in-memory db
        conn = None
        try:
            conn = sqlite3.connect(":memory:")
            cursor = conn.cursor()
            
            # Execute schema fixture
            if custom_schema.strip():
                cursor.executescript(custom_schema)
                
            # Execute student query
            cursor.execute(query_clean)
            rows = cursor.fetchall()
            
            # Normalize rows for comparison
            # expected can be list of tuples/lists or json
            normalized_actual = [list(r) for r in rows]
            
            normalized_expected = expected
            if isinstance(expected, str):
                try:
                    normalized_expected = json.loads(expected)
                except Exception:
                    pass

            passed = False
            if normalized_expected is not None:
                if str(normalized_actual).strip() == str(normalized_expected).strip() or normalized_actual == normalized_expected:
                    passed = True
                elif len(normalized_actual) == 1 and len(normalized_actual[0]) == 1 and str(normalized_actual[0][0]) == str(normalized_expected):
                    passed = True
                elif isinstance(normalized_expected, list) and isinstance(normalized_actual, list):
                    # Compare length and elements regardless of order if sorting not strictly required
                    if sorted(str(x) for x in normalized_actual) == sorted(str(x) for x in normalized_expected):
                        passed = True
            else:
                # If no explicit expected, passing means successful query returning rows
                passed = len(rows) >= 0

            if passed:
                passed_count += 1

            test_results.append({
                "test_num": idx,
                "description": desc,
                "passed": passed,
                "input": tc.get("input", "DB Schema fixture"),
                "expected": "<Hidden Test Data>" if is_hidden and not passed else str(normalized_expected),
                "actual": "<Hidden Test Result>" if is_hidden and not passed else str(normalized_actual),
                "error": None,
                "is_hidden": is_hidden
            })

        except sqlite3.Error as e:
            test_results.append({
                "test_num": idx,
                "description": desc,
                "passed": False,
                "input": tc.get("input", "DB Schema fixture"),
                "expected": "<Hidden Test Data>" if is_hidden else str(expected),
                "actual": "Execution Failed",
                "error": f"SQL Error: {str(e)}",
                "is_hidden": is_hidden
            })
        finally:
            if conn:
                conn.close()

    total = len(test_cases) or 1
    return {
        "passed": passed_count == total and total > 0,
        "total_tests": total,
        "passed_tests": passed_count,
        "failed_tests": total - passed_count,
        "compile_error": None,
        "runtime_error": None if passed_count > 0 else (test_results[0].get("error") if test_results else None),
        "test_results": test_results
    }


# ===========================================================================
# 2. Python Execution Sandbox (Subprocess with JSON Test Harness)
# ===========================================================================
def _execute_python(code: str, test_cases: List[Dict[str, Any]], timeout_sec: float) -> Dict[str, Any]:
    if not code.strip():
        return {
            "passed": False,
            "total_tests": len(test_cases),
            "passed_tests": 0,
            "failed_tests": len(test_cases),
            "compile_error": "No Python code provided.",
            "runtime_error": None,
            "test_results": []
        }

    # Build runner script
    test_cases_raw = json.dumps(test_cases)
    
    harness = f"""
import sys
import json
import traceback

# Student Code:
{code}

# Test Cases:
test_cases = json.loads({json.dumps(test_cases_raw)})

results = []
passed_count = 0

# Find callable functions in local scope
import inspect
candidate_funcs = [v for k, v in locals().items() if callable(v) and not k.startswith('_') and k not in ('json', 'inspect', 'sys', 'traceback')]
main_fn = candidate_funcs[-1] if candidate_funcs else None

for idx, tc in enumerate(test_cases, 1):
    is_hidden = tc.get("is_hidden", False)
    desc = tc.get("description", f"Test Case #{{idx}}")
    raw_input = tc.get("input")
    expected = tc.get("expected_output")
    
    try:
        actual = None
        if main_fn:
            try:
                sig_params = len(inspect.signature(main_fn).parameters)
            except Exception:
                sig_params = 1

            if sig_params == 1:
                actual = main_fn(raw_input)
            elif isinstance(raw_input, list):
                actual = main_fn(*raw_input)
            elif isinstance(raw_input, dict):
                actual = main_fn(**raw_input)
            elif raw_input is None:
                actual = main_fn() if sig_params == 0 else main_fn(None)
            else:
                actual = main_fn(raw_input)
        else:
            actual = None
            
        passed = False
        if str(actual) == str(expected) or actual == expected:
            passed = True
        elif isinstance(expected, float) and isinstance(actual, (int, float)) and abs(actual - expected) < 1e-4:
            passed = True
            
        if passed:
            passed_count += 1
            
        results.append({{
            "test_num": idx,
            "description": desc,
            "passed": passed,
            "input": raw_input,
            "expected": "<Hidden Test Data>" if is_hidden and not passed else expected,
            "actual": "<Hidden Test Result>" if is_hidden and not passed else actual,
            "error": None,
            "is_hidden": is_hidden
        }})
    except Exception as e:
        results.append({{
            "test_num": idx,
            "description": desc,
            "passed": False,
            "input": raw_input,
            "expected": "<Hidden Test Data>" if is_hidden else expected,
            "actual": "Runtime Exception",
            "error": f"{{type(e).__name__}}: {{str(e)}}",
            "is_hidden": is_hidden
        }})

output_payload = {{
    "passed": passed_count == len(test_cases) and len(test_cases) > 0,
    "total_tests": len(test_cases),
    "passed_tests": passed_count,
    "failed_tests": len(test_cases) - passed_count,
    "compile_error": None,
    "runtime_error": None,
    "test_results": results
}}

print("---SANDBOX_OUT_START---")
print(json.dumps(output_payload))
print("---SANDBOX_OUT_END---")
"""

    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as f:
        f.write(harness)
        f_path = f.name

    try:
        proc = subprocess.run(
            [sys.executable, f_path],
            capture_output=True,
            text=True,
            timeout=timeout_sec
        )
        stdout = proc.stdout
        stderr = proc.stderr

        if "---SANDBOX_OUT_START---" in stdout and "---SANDBOX_OUT_END---" in stdout:
            chunk = stdout.split("---SANDBOX_OUT_START---")[1].split("---SANDBOX_OUT_END---")[0].strip()
            return json.loads(chunk)
        else:
            if proc.returncode != 0:
                err_msg = stderr.strip() or stdout.strip()
                # Determine if SyntaxError
                is_syntax = "SyntaxError" in err_msg or "IndentationError" in err_msg
                return {
                    "passed": False,
                    "total_tests": len(test_cases),
                    "passed_tests": 0,
                    "failed_tests": len(test_cases),
                    "compile_error": err_msg if is_syntax else None,
                    "runtime_error": None if is_syntax else err_msg,
                    "test_results": [
                        {
                            "test_num": idx + 1,
                            "description": tc.get("description", f"Test Case #{idx+1}"),
                            "passed": False,
                            "input": tc.get("input"),
                            "expected": tc.get("expected_output"),
                            "actual": "Error",
                            "error": err_msg[:200],
                            "is_hidden": tc.get("is_hidden", False)
                        } for idx, tc in enumerate(test_cases)
                    ]
                }
            return {
                "passed": False,
                "total_tests": len(test_cases),
                "passed_tests": 0,
                "failed_tests": len(test_cases),
                "compile_error": None,
                "runtime_error": stderr or "Unknown execution error.",
                "test_results": []
            }

    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "total_tests": len(test_cases),
            "passed_tests": 0,
            "failed_tests": len(test_cases),
            "compile_error": None,
            "runtime_error": f"Execution Timed Out ({timeout_sec}s limit exceeded - check for infinite loops).",
            "test_results": [
                {
                    "test_num": idx + 1,
                    "description": tc.get("description", f"Test Case #{idx+1}"),
                    "passed": False,
                    "input": tc.get("input"),
                    "expected": tc.get("expected_output"),
                    "actual": "Timed Out",
                    "error": "Time Limit Exceeded",
                    "is_hidden": tc.get("is_hidden", False)
                } for idx, tc in enumerate(test_cases)
            ]
        }
    except Exception as e:
        return {
            "passed": False,
            "total_tests": len(test_cases),
            "passed_tests": 0,
            "failed_tests": len(test_cases),
            "compile_error": None,
            "runtime_error": str(e),
            "test_results": []
        }
    finally:
        import os
        if os.path.exists(f_path):
            try:
                os.remove(f_path)
            except Exception:
                pass


# ===========================================================================
# 3. JavaScript Execution Sandbox (Node.js Subprocess)
# ===========================================================================
def _execute_javascript(code: str, test_cases: List[Dict[str, Any]], timeout_sec: float) -> Dict[str, Any]:
    if not code.strip():
        return {
            "passed": False,
            "total_tests": len(test_cases),
            "passed_tests": 0,
            "failed_tests": len(test_cases),
            "compile_error": "No JavaScript code provided.",
            "runtime_error": None,
            "test_results": []
        }

    test_cases_json = json.dumps(test_cases)
    
    harness = f"""
const testCases = {test_cases_json};

let mainFn = null;
try {{
    // Student code:
    {code}
    
    // Find exported or globally declared function
    if (typeof solution === 'function') mainFn = solution;
    else if (typeof solve === 'function') mainFn = solve;
    else if (typeof query === 'function') mainFn = query;
    else if (typeof main === 'function') mainFn = main;
    else {{
        // grab the last declared function if possible
        const fnNames = Object.keys(global).filter(k => typeof global[k] === 'function' && !k.startsWith('_'));
        if (fnNames.length > 0) mainFn = global[fnNames[fnNames.length - 1]];
    }}
}} catch (compileErr) {{
    const payload = {{
        passed: false,
        total_tests: testCases.length,
        passed_tests: 0,
        failed_tests: testCases.length,
        compile_error: compileErr.stack || String(compileErr),
        runtime_error: null,
        test_results: []
    }};
    console.log("---SANDBOX_OUT_START---");
    console.log(JSON.stringify(payload));
    console.log("---SANDBOX_OUT_END---");
    process.exit(0);
}}

const results = [];
let passedCount = 0;

for (let i = 0; i < testCases.length; i++) {{
    const tc = testCases[i];
    const isHidden = !!tc.is_hidden;
    const desc = tc.description || `Test Case #${{i + 1}}`;
    const input = tc.input;
    const expected = tc.expected_output;
    
    try {{
        let actual = null;
        if (mainFn) {{
            if (Array.isArray(input)) actual = mainFn(...input);
            else if (input !== undefined && input !== null) actual = mainFn(input);
            else actual = mainFn();
        }}
        
        let passed = false;
        if (JSON.stringify(actual) === JSON.stringify(expected) || String(actual) === String(expected)) {{
            passed = true;
        }}
        
        if (passed) passedCount++;
        
        results.push({{
            test_num: i + 1,
            description: desc,
            passed: passed,
            input: input,
            expected: isHidden && !passed ? "<Hidden Test Data>" : expected,
            actual: isHidden && !passed ? "<Hidden Test Result>" : actual,
            error: null,
            is_hidden: isHidden
        }});
    }} catch (err) {{
        results.push({{
            test_num: i + 1,
            description: desc,
            passed: false,
            input: input,
            expected: isHidden ? "<Hidden Test Data>" : expected,
            actual: "Runtime Error",
            error: err.message || String(err),
            is_hidden: isHidden
        }});
    }}
}}

const outputPayload = {{
    passed: passedCount === testCases.length && testCases.length > 0,
    total_tests: testCases.length,
    passed_tests: passedCount,
    failed_tests: testCases.length - passedCount,
    compile_error: null,
    runtime_error: null,
    test_results: results
}};

console.log("---SANDBOX_OUT_START---");
console.log(JSON.stringify(outputPayload));
console.log("---SANDBOX_OUT_END---");
"""

    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f:
        f.write(harness)
        f_path = f.name

    try:
        proc = subprocess.run(
            ["node", f_path],
            capture_output=True,
            text=True,
            timeout=timeout_sec
        )
        stdout = proc.stdout
        stderr = proc.stderr

        if "---SANDBOX_OUT_START---" in stdout and "---SANDBOX_OUT_END---" in stdout:
            chunk = stdout.split("---SANDBOX_OUT_START---")[1].split("---SANDBOX_OUT_END---")[0].strip()
            return json.loads(chunk)
        else:
            return {
                "passed": False,
                "total_tests": len(test_cases),
                "passed_tests": 0,
                "failed_tests": len(test_cases),
                "compile_error": stderr if "SyntaxError" in stderr else None,
                "runtime_error": stderr or "JavaScript execution failed.",
                "test_results": []
            }
    except subprocess.TimeoutExpired:
        return {
            "passed": False,
            "total_tests": len(test_cases),
            "passed_tests": 0,
            "failed_tests": len(test_cases),
            "compile_error": None,
            "runtime_error": f"Execution Timed Out ({timeout_sec}s limit exceeded).",
            "test_results": []
        }
    finally:
        import os
        if os.path.exists(f_path):
            try:
                os.remove(f_path)
            except Exception:
                pass
