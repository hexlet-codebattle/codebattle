test:
	python ./check/checker.py

test-example:
	python checker_example.py

lint_example:
	echo "lint_example"

docker_build_image:
	docker build -t codebattle/python --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/python make lint_example

.PHONY: test
