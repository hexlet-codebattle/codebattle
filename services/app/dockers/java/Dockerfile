FROM openjdk:13-alpine3.10

WORKDIR /usr/src/app

RUN apk add --update make

ADD CheckerExample.java .
ADD SolutionExample.java .
ADD Makefile .

RUN make test-example-compile test-example
