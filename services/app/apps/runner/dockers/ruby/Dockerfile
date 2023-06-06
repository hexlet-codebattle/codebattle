FROM ruby:3.1.2-alpine3.16

RUN apk add --update make

WORKDIR /usr/src/app

ADD check check

ADD runner.rb .
ADD Makefile .
