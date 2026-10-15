from io import StringIO  # Python 3
import sys
import json


class Runner:

    def __init__(self, args_list):
        self.args_list = args_list

    def call(self):
        tmp_stdout = StringIO()
        execution_results = []
        sys.stdout = tmp_stdout
        try:
            from solution import solution

            for args in self.args_list:
                try:
                    execution_results.append(json.dumps({
                        'type': 'result',
                        'value': solution(*args),
                        'output': tmp_stdout.getvalue()
                    }))
                except Exception as exc:
                    execution_results.append(json.dumps({
                        'type': 'error',
                        'value': exc.args,
                        'output': tmp_stdout.getvalue()
                    }))
                finally:
                    tmp_stdout.close()
                    tmp_stdout = StringIO()
                    sys.stdout = tmp_stdout
        except Exception as exc:
            execution_results.append(json.dumps({
                'type': 'error',
                'value': exc.args,
            }))

        sys.stdout = sys.__stdout__
        print('\n'.join(execution_results))
