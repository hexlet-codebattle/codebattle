test:
	g++ -std=c++17 -o checker ./check/${checker_name}.cpp -lm && ./checker

test-example:
	g++ -std=c++17 -o checker checker_example.cpp -lm && ./checker

test-compile:
	g++ -std=c++17 -c ./check/solution.cpp

test-example-compile:
	g++ -std=c++17 -c solution_example.cpp

.PHONY: test
