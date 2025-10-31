test:
	clang++ -std=c++23 -O0 \
			-include-pch /pch/all.pch -fuse-ld=mold \
			./check/checker.cpp -o checker && ./checker
.PHONY: test