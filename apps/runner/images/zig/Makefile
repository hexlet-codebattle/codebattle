build:
	zig build-exe -O ReleaseFast \
		--cache-dir /tmp/zig-cache \
		--global-cache-dir /tmp/zig-global \
		-femit-bin=/tmp/check \
		check/checker.zig

test-runtime: build
	/tmp/check

test: test-runtime
.PHONY: build test-runtime test
