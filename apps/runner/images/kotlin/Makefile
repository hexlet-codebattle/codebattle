test:
	kotlinc  ./check/checker.kt ./check/solution.kt -cp gson.jar -include-runtime -nowarn -d solution.jar
	kotlin -cp gson.jar:solution.jar solution.CheckerKt

.PHONY: test
