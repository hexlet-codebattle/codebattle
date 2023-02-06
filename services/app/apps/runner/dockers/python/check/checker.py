import os
import sys

script_dir = os.path.dirname(__file__)
runner_dir = os.path.join(script_dir, '..')
sys.path.append(runner_dir)

import runner

runner.Runner([[0, 1], [1, 1], [1, 0]]).call()
