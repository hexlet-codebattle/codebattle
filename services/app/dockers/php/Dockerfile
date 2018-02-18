FROM php:7.2-alpine

RUN apk add --update make
RUN apk add --update sed

WORKDIR /usr/src/app

ADD checker.php .
ADD Makefile .
