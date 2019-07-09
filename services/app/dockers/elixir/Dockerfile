FROM elixir:1.7.3-alpine

RUN apk add --update make

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
