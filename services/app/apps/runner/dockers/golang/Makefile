# Optimization flags for faster compilation and execution
GO_FLAGS=-gcflags="-N -l" -ldflags="-s -w" -trimpath

# Build the checker binary for faster execution
build:
	go build $(GO_FLAGS) -o checker ./check/checker.go ./check/solution.go

# Run the compiled binary for faster execution
test-runtime: build
	./checker

# Run without compilation (slower, kept for compatibility)
test-runtime-direct:
	go run ./check/checker.go ./check/solution.go

format:
	gofmt -w -e ./check/solution.go

test: test-runtime
# test: format test-runtime

.PHONY: test build test-runtime test-runtime-direct format
