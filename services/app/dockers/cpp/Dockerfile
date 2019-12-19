FROM alpine:3.4

RUN apk add --update make
RUN apk add --no-cache git openssh-client g++ cmake ninja python3

WORKDIR /usr/src/app

ADD checker_example.cpp .
ADD solution_example.cpp .
ADD Makefile .

