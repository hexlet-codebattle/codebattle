FROM alpine:latest

RUN apk add --update make perl perl-utils

WORKDIR /usr/src/app

ADD checker.pl .
ADD Makefile .