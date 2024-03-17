FROM codebattle/runner-rs:latest AS runner

FROM python:3.12.2-alpine

RUN apk add --update make

WORKDIR /usr/src/app

ADD check check
ADD checker.py .
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
