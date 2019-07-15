test:
	go build -o checker ./check/checker.go ./check/solution.go && ./checker

test-example:
	go build -o checker checker_example.go solution_example.go && ./checker

test-compile:
	gofmt -w ./check/solution.go

test-example-compile:
	gofmt -w solution_example.go

.PHONY: test
