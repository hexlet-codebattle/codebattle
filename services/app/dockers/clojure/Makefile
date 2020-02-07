test:
	clj -m test_clojure

test-example:
	clj -m checker_example

lint_example:
	echo "lint_example"

docker_build_image:
	docker build -t codebattle/clojure --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/clojure make lint_example

.PHONY: test
