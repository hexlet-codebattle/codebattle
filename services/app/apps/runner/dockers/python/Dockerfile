FROM python:3.12.0-alpine3.18

RUN apk add --update make

WORKDIR /usr/src/app

ADD check check
ADD checker.py .
ADD Makefile .
