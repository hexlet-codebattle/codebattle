FROM codebattle/runner-rs:latest AS runner

FROM php:8.3.3-cli-alpine

RUN apk add --update --no-cache make

WORKDIR /usr/src/app

ADD check check
ADD checker.php .
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner

ENTRYPOINT ["/runner/codebattle_runner"]
