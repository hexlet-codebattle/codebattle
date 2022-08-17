test-runtime:
	go build -o checker ./check/checker.go ./check/solution.go && ./checker

test-compile:
	gofmt -w -e ./check/solution.go

test: test-compile test-runtime

.PHONY: test
