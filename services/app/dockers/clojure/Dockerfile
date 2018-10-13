FROM clojure:lein-2.8.1-alpine

RUN wget https://github.com/hypirion/inlein/releases/download/0.2.0/inlein -O /usr/bin/inlein
RUN chmod +x /usr/bin/inlein
RUN inlein --start-daemon

RUN apk add --update make

WORKDIR /usr/src/app

ADD checker.clj .
RUN inlein --deps checker.clj
ADD Makefile .
