FROM codebattle/runner-rs:latest AS runner

FROM alpine:latest

RUN apk add --no-cache cabal make libc-dev git

WORKDIR /usr/src/app

RUN cabal update

ADD check check
ADD checker.cabal .
RUN cabal build --only-dependencies

ADD Makefile .

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
