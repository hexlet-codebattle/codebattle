FROM zenika/kotlin:1.2.71-alpine

WORKDIR /usr/src/app

RUN apk add --update make curl

RUN curl -L https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/json-simple/json_simple-1.1.jar > /usr/src/app/json_simple.jar

COPY checkerExample.kt ./check/checker.kt
COPY solutionExample.kt ./check/solution.kt
COPY Makefile .
