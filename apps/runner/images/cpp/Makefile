test:
	clang++ -std=c++23 -O0 -g0 -pipe \
			-fno-stack-protector -fno-pic -no-pie \
			-include-pch /pch/all.pch -fuse-ld=mold \
			-Wl,--thread-count=2 \
			./check/checker.cpp -o checker && ./checker
.PHONY: test
