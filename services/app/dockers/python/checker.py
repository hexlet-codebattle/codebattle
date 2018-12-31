import sys
import json

checks = [json.loads(l) for l in sys.stdin.read().split("\n")]

try:
    from check.solution import solution
    for element in checks:
        if 'check' in element.keys():
            print(json.dumps({
                'status': 'ok',
                'result': element['check'],
            }))
        else:
            assert solution(*element['arguments']) == element['expected'], element['arguments']

except AssertionError as exc:
    print(json.dumps({
        'status': 'failure',
        'result': exc.args[0],
    }))
    exit(0)
except Exception as exc:
    print(json.dumps({
        'status': 'error',
        'result': 'unexpected',
    }))
    exit(0)
