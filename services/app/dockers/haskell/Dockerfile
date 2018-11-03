FROM alpine:latest

RUN apk update \
 && apk add cabal ghc gmp-dev make wget

WORKDIR /usr/src/app

ADD HOwl.cabal .
ADD checker.hs .
ADD Types.hs .
ADD Makefile .

RUN cabal new-update
