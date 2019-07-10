import sys
import json

def assert_result(result, expected, errorMessage):
    assert result == expected, errorMessage

try:
    from solution_example import solution

    assert_result(solution(1, 2), 3, [1, 2])
    assert_result(solution(5, 3), 8, [5, 3])

    print(json.dumps({
        'status': 'ok',
        'result': '__code-0__',
    }))
except AssertionError as exc:
    print(json.dumps({
        'status': 'failure',
        'result': exc.args[0],
    }))
    exit(0)
except Exception as exc:
    print(json.dumps({
        'status': 'error',
        'result': exc.args,
    }))
    exit(0)
