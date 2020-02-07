test:
	ruby ./check/checker.rb

test_example:
	ruby checker_example.rb

lint_example:
	echo "lint_example"

docker_build_image:
	docker build -t codebattle/ruby --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/ruby make lint_example

.PHONY: test
