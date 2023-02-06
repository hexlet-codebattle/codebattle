FROM clojure:openjdk-19-tools-deps-1.11.1.1149-alpine

RUN apk add --update make rlwrap

WORKDIR /usr/src/app

ADD deps.edn .
RUN clojure -e "(prn :install)"

ADD check check
ADD runner.clj .
ADD Makefile .
