import sys
import json
from check.solution import solution

checks = [json.loads(l) for l in sys.stdin.read().split("\n")]

for c in checks:
    if 'check' in c.keys():
        print(c['check'])
    else:
        assert solution(*c['arguments']) == c['expected']
