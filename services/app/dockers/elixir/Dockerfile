FROM elixir:1.13-slim

RUN apt-get update && apt-get install --no-install-recommends -y make

WORKDIR /usr/src/app

ENV MIX_ENV test

RUN mix local.hex --force
RUN mix local.rebar --force

ADD mix.exs .

RUN mix deps.get
RUN mix deps.compile

ADD checker_example.exs .
ADD solution_example.exs .
ADD Makefile .
