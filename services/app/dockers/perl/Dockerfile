FROM alpine:latest

RUN apk add --update make perl perl-utils
RUN cpan Cpanel::JSON::XS

WORKDIR /usr/src/app

ADD checker.pl .
ADD Makefile .