test:
	kotlinc ./check/checker.kt ./check/solution.kt -cp ./json_simple.jar -include-runtime -d solution.jar
	kotlin -cp json_simple.jar:solution.jar solution.CheckerKt

test-compile:
	kotlinc ./check/solution.kt -include-runtime

.PHONY: test
