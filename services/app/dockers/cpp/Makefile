test:
	g++ -std=c++17 -o checker ./check/checker.cpp -lm && ./checker

test-example:
	g++ -std=c++17 -o checker checker_example.cpp -lm && ./checker

test-compile:
	g++ -std=c++17 -c ./check/solution.cpp

test-example-compile:
	g++ -std=c++17 -c solution_example.cpp

lint_example:
	echo "lint_example"

docker_build_image:
	docker build -t codebattle/cpp --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/cpp make lint_example

.PHONY: test
