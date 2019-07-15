import sys
import json

def assert_result(result, expected, errorMessage, success):
    try:
        assert result == expected, errorMessage
        print(json.dumps({
            'status': 'success',
            'result': result,
        }))
        return success
    except AssertionError as exc:
        print(json.dumps({
            'status': 'failure',
            'result': exc.args[0],
            'arguments': errorMessage,
        }))
        return False

try:
    from solution_example import solution
    success = True

    success = assert_result(solution(1, 2), 3, [1, 2], success)
    success = assert_result(solution(5, 3), 8, [5, 3], success)

    if success:
        print(json.dumps({
            'status': 'ok',
            'result': '__code-0__',
        }))
except Exception as exc:
    print(json.dumps({
        'status': 'error',
        'result': exc.args,
    }))
    exit(0)
