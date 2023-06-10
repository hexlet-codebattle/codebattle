FROM ruby:3.2.2-alpine3.18

RUN apk add --update make

WORKDIR /usr/src/app

ADD check check
ADD checker.rb .
ADD Makefile .
