FROM codebattle/runner-rs:latest AS runner

FROM alpine:latest

RUN apk add --no-cache cabal make libc-dev git

WORKDIR /usr/src/app

RUN cabal update

ADD checker.cabal .
RUN cabal build --only-dependencies

ADD Makefile .
ADD check/Main.hs check/Main.hs

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner

ENTRYPOINT ["/runner/codebattle_runner"]
