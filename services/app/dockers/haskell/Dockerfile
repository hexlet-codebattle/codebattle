FROM alpine:latest

RUN apk update \
 && apk add cabal ghc gmp-dev make wget musl-dev libc6-compat

WORKDIR /usr/src/app

ADD HOwl.cabal .
ADD magic.hs .
ADD Makefile .
ADD test_haskell.hs .
ADD Check/Checker.hs ./Check/Checker.hs
ADD Check/Solution.hs ./Check/Solution.hs

RUN ln -s check Check
RUN cabal new-update
RUN cabal new-build
RUN cabal new-install hlint
