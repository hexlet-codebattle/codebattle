test:
	clj -m test_clojure

test-example:
	clj -m checker_example

lint:
	clj-kondo --lint ./check/solution.clj

lint_example:
	clj-kondo --lint ./solution_example.clj

docker_build_image:
	docker build -t codebattle/clojure --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/clojure make lint_example

.PHONY: test
