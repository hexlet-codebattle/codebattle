import sys
import json
import time
from io import StringIO

original_stdout = sys.stdout
sys.stdout = StringIO()

execution_result = []

def assert_result(solution, expected, arguments, success):
    try:
        start = time.clock()
        result = solution(arguments)
        finish = time.clock()
        assert result == expected
        execution_result.append(json.dumps({
            'status': 'success',
            'result': result,
            'output': sys.stdout.getvalue(),
            'expected': expected,
            'arguments': arguments,
            'execution_time': finish - start
        }))
        return success
    except AssertionError as exc:
        execution_result.append(json.dumps({
            'status': 'failure',
            'result': result,
            'output': sys.stdout.getvalue(),
            'expected': expected,
            'arguments': arguments,
            'execution_time': finish - start
        }))
        return False

try:
    from solution_example import solution
    success = True

    solution_lambda = lambda arguments: solution(*arguments)
    success = assert_result(solution_lambda, 3, [1, 2], success)
    success = assert_result(solution_lambda, 7, [5, 3], success)

    if success:
        execution_result.append(json.dumps({
            'status': 'ok',
            'result': '__code-0__',
        }))
except Exception as exc:
    execution_result.append(json.dumps({
        'status': 'error',
        'result': exc.args,
    }))

sys.stdout = original_stdout
print(execution_result)
