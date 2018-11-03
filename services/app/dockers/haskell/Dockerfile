FROM alpine:latest

RUN apk update \
 && apk add cabal ghc gmp-dev make wget musl-dev libc6-compat

WORKDIR /usr/src/app

ADD HOwl.cabal .
ADD Solution.hs .

RUN cabal new-update
RUN cabal new-build

ADD checker.hs .
ADD Types.hs .
ADD Makefile .