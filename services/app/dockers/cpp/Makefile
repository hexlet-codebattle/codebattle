test-runtime:
	g++ -std=c++20 -o checker ./check/checker.cpp -lm && ./checker

test-compile:
	g++ -std=c++20 -c ./check/solution.cpp

test: test-runtime

.PHONY: test
