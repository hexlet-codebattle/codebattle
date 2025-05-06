# Compiler and flags
CXX = ccache g++
# Core compilation flags
CXXFLAGS = -std=c++23 -O0 -march=native -pipe
# Memory optimization for GCC
CXXFLAGS += --param ggc-min-expand=20 --param ggc-min-heapsize=32768
# Reduce debug info for faster compilation
CXXFLAGS += -g0

# Directories
CHECK_DIR = ./check

# Precompiled headers
SYS_PCH = /usr/include/precompiled_bits.hpp

# Object files
CHECKER_OBJ = $(CHECK_DIR)/checker.o
SOLUTION_OBJ = $(CHECK_DIR)/solution.o

# Default target
test: test-runtime

# Fast runtime compilation using precompiled header
test-runtime: $(CHECK_DIR)/solution.cpp $(CHECK_DIR)/checker.cpp
	# Compile checker.cpp with precompiled bits/stdc++.h (it will include solution.cpp)
	$(CXX) $(CXXFLAGS) -include $(SYS_PCH) -o checker $(CHECK_DIR)/checker.cpp -lm && ./checker

# Test compile only
test-compile: $(CHECK_DIR)/solution.cpp $(CHECK_DIR)/checker.cpp
	$(CXX) $(CXXFLAGS) -include $(SYS_PCH) -c $(CHECK_DIR)/checker.cpp -o $(CHECKER_OBJ)

# Clean target
clean:
	rm -f checker $(CHECKER_OBJ)

.PHONY: test test-runtime test-compile clean
