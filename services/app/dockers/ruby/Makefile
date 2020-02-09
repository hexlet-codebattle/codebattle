test:
	ruby ./check/checker.rb

test_example:
	ruby checker_example.rb

lint:
	rubocop ./check/solution.rb

lint_example:
	rubocop ./solution_example.rb

docker_build_image:
	docker build -t codebattle/ruby --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/ruby make lint_example

.PHONY: test
