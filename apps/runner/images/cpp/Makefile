# Compiler flags MUST match those used to build /pch/all.pch and /pch/runtime.o
# in the Containerfile, otherwise clang rejects the PCH as incompatible and
# falls back to re-parsing everything (slow).
CB_CXXFLAGS = -std=c++23 -O0 -g0 -pipe \
              -fno-stack-protector -fno-pic \
              -fno-asynchronous-unwind-tables \
              -w
# Linker-only flags (don't affect PCH compatibility)
CB_LDFLAGS  = -no-pie -fuse-ld=mold -Wl,--thread-count=2

test:
	clang++ $(CB_CXXFLAGS) $(CB_LDFLAGS) \
			-include-pch /pch/all.pch \
			./check/checker.cpp /pch/runtime.o -o checker && ./checker
.PHONY: test
