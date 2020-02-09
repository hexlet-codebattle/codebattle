FROM golang:1.12.6-alpine

RUN apk add --update make
RUN apk add --no-cache git && go get -u golang.org/x/lint/golint

WORKDIR /usr/src/app

ADD checker_example.go .
ADD solution_example.go .
ADD Makefile .
