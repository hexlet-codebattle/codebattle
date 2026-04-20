KOTLIN_JVM_OPTS ?=
ifdef SLOW_KOTLIN
KOTLIN_JVM_OPTS = -J-Xmx256m
endif

test:
	kotlinc $(KOTLIN_JVM_OPTS) ./check/checker.kt ./check/solution.kt -cp gson.jar -include-runtime -nowarn -d solution.jar
	kotlin $(KOTLIN_JVM_OPTS) -cp gson.jar:solution.jar solution.CheckerKt

.PHONY: test
