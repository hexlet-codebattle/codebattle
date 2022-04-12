FROM golang:1.17-alpine

RUN apk add --update make

WORKDIR /usr/src/app

ADD checker_example.go .
ADD solution_example.go .
ADD Makefile .
