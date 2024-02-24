test-runtime:
	go run  ./check/checker.go ./check/solution.go

format:
	gofmt -w -e ./check/solution.go

test: test-runtime
# test: format test-runtime

.PHONY: test
