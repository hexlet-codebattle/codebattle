FROM golang:1.12.6-alpine

RUN apk add --update make

WORKDIR /usr/src/app

ADD checker_example.go .
ADD solution_example.go .
ADD Makefile .
