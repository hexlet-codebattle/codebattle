test:
	python ./check/checker.py

test-example:
	python checker_example.py

lint:
	flake8 ./check/solution.py

lint_example:
	flake8 ./solution_example.py

docker_build_image:
	docker build -t codebattle/python --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/python make lint_example

.PHONY: test
