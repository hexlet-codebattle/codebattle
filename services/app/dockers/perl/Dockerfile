FROM alpine:latest

RUN apk add --update make perl perl-utils perl-dev musl-dev gcc
RUN cpan JSON::MaybeXS

WORKDIR /usr/src/app

ADD checker.pl .
ADD Makefile .