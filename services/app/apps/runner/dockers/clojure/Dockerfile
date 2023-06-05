FROM babashka/babashka:1.3.181-SNAPSHOT

RUN apt update && apt install make

WORKDIR /usr/src/app

ADD check check
ADD runner.clj .
ADD bb.edn .
ADD Makefile .
