FROM codebattle/runner-rs:latest AS runner

FROM ruby:3.3.0-alpine

RUN apk add --update --no-cache make

WORKDIR /usr/src/app

ADD check check
ADD checker.rb .
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
