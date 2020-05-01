test:
	mix run ./check/checker.exs

test_example:
	mix run checker_example.exs

lint:
	mix credo ./check/solution.exs

lint_example:
	mix credo ./solution_example.exs

docker_build_image:
	docker build -t codebattle/elixir --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/elixir make lint_example

.PHONY: test
