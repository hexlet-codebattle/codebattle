FROM codebattle/runner-rs:latest AS runner

FROM babashka/babashka:1.3.190-SNAPSHOT-alpine

RUN apk add --update --no-cache make

WORKDIR /usr/src/app

ADD check check
ADD checker.clj .
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner

ENTRYPOINT ["/runner/codebattle_runner"]
