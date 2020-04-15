FROM openjdk:12-alpine3.9

WORKDIR /usr/src/app

RUN apk add --update make gradle

COPY CheckerExample.java ./src/main/java/solution/Checker.java
COPY SolutionExample.java ./src/main/java/solution/Solution.java
COPY build.gradle .
COPY Makefile .

RUN gradle buildDependents
