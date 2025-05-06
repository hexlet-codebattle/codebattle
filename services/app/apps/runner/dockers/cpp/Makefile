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

# Ultra-fast runtime compilation using precompiled checker.o
test-runtime: $(CHECK_DIR)/solution.cpp
	# Compile only the solution file with precompiled bits/stdc++.h
	$(CXX) $(CXXFLAGS) -include $(SYS_PCH) -c $(CHECK_DIR)/solution.cpp -o $(SOLUTION_OBJ)
	# Link with the precompiled checker.o
	$(CXX) $(CXXFLAGS) -o checker $(CHECKER_OBJ) $(SOLUTION_OBJ) -lm && ./checker

# Test compile only
test-compile: $(CHECK_DIR)/solution.cpp
	$(CXX) $(CXXFLAGS) -include $(SYS_PCH) -c $(CHECK_DIR)/solution.cpp -o $(SOLUTION_OBJ)

# Clean target
clean:
	rm -f checker $(SOLUTION_OBJ)

.PHONY: test test-runtime test-compile clean
