FROM codebattle/runner-rs:latest AS runner

FROM golang:1.22-alpine

RUN apk add --update make

WORKDIR /usr/src/app

ADD check check
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner ./check/codebattle_runner
