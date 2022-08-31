test:
	kotlinc ./check/checker.kt ./check/solution.kt -cp ./json_simple.jar -include-runtime -nowarn -d solution.jar
	kotlin -cp json_simple.jar:solution.jar solution.CheckerKt

.PHONY: test
