test:
	go build -o checker ./check/checker.go ./check/solution.go && ./checker

test-example:
	go build -o checker checker_example.go solution_example.go && ./checker

test-compile:
	gofmt -w -e ./check/solution.go

test-example-compile:
	gofmt -w -e solution_example.go

lint:
	golint ./check/checker.go

lint_example:
	golint ./checker_example.go

docker_build_image:
	docker build -t codebattle/go --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/go make lint_example

.PHONY: test
