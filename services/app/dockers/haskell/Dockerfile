FROM alpine:latest

RUN apk update \
 && apk add cabal ghc gmp-dev make wget musl-dev libc6-compat

WORKDIR /usr/src/app

ADD HOwl.cabal .
ADD checker.hs .
ADD Types.hs .
ADD Solution.hs Check/Solution.hs
ADD Makefile .

RUN ln -s check Check
RUN cabal new-update
RUN cabal new-build
