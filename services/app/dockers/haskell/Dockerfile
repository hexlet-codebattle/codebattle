FROM alpine:latest

RUN apk update \
 && apk add cabal ghc gmp-dev make wget

WORKDIR /usr/src/app

ADD HOwl.cabal .

RUN cabal new-update
RUN cabal new-install --only-dependencies

ADD checker.hs .
ADD Types.hs .
ADD Makefile .
