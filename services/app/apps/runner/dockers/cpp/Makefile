# Common compiler flags for optimization
CXX = ccache g++
CXXFLAGS = -std=c++23 -O0 -march=native -pipe

# Default target
test: test-runtime

# Main test target - compile and run checker
test-runtime:
	$(CXX) $(CXXFLAGS) -o checker ./check/checker.cpp -lm && ./checker

# Test compile only
test-compile:
	$(CXX) $(CXXFLAGS) -c ./check/solution.cpp

.PHONY: test test-runtime test-compile
