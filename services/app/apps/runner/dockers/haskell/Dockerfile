FROM alpine:latest

RUN apk add --update cabal ghc gmp-dev make wget musl-dev libc6-compat

WORKDIR /usr/src/app

ADD HOwl.cabal .
ADD magic.hs .
ADD Makefile .
ADD test_haskell.hs .
ADD Check Check

RUN ln -s check Check
RUN cabal new-update
RUN cabal new-build
