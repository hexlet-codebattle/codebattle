test:
	@ldc2 -O0 -I/opt/cb -od=/tmp/cb-obj -of=/tmp/check \
		check/checker.d check/solution.d /opt/cb/cb_runtime.d
	@/tmp/check

.PHONY: test
