FROM codebattle/runner-rs:latest AS runner

FROM elixir:1.16.1-alpine

ENV ERL_MAX_PORTS 1024

RUN apk add --update --no-cache make

RUN mix local.hex --force
RUN mix local.rebar --force

ENV MIX_ENV test

WORKDIR /usr/src/app

ADD mix.exs .
ADD mix.lock .
RUN mix deps.get

ADD check check
ADD checker.ex checker.ex
RUN mix escript.build

ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
