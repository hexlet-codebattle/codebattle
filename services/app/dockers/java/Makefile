test:
	javac ./check/${checker_name}.java ./check/Solution.java -cp ./javax_json_api.jar -d solution.jar
	java -cp javax_json.jar:javax_json_api.jar:solution.jar solution.Checker

test-example:
	javac ./CheckerExample.java ./SolutionExample.java -cp ./javax_json_api.jar -d solution.jar
	java -cp javax_json.jar:javax_json_api.jar:solution.jar solution.CheckerExample

test-compile:
	javac ./Solution.java

test-compile-example:
	javac ./SolutionExample.java

.PHONY: test
