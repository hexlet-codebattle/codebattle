test-runtime:
	go build -o checker ./check/checker.go ./check/solution.go && ./checker

format:
	gofmt -w -e ./check/solution.go

test: test-runtime
# test: format test-runtime

.PHONY: test
