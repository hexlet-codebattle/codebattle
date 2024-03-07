FROM codebattle/runner-rs:latest AS runner

FROM elixir:1.16.1-alpine

RUN apk add --update --no-cache make

RUN mix local.hex --force
RUN mix local.rebar --force

ENV MIX_ENV test

WORKDIR /usr/src/app

ADD check check
ADD checker.exs .
ADD Makefile .

RUN elixir checker.exs

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
