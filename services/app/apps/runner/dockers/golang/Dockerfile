FROM codebattle/runner-rs:latest AS runner

FROM golang:1.24.2-alpine

RUN apk add --update --no-cache make

WORKDIR /usr/src/app

ADD check check
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
