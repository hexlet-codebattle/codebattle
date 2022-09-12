FROM elixir:1.14.0-alpine

RUN apk add --update make

RUN mix local.hex --force
RUN mix local.rebar --force

ENV MIX_ENV test

WORKDIR /usr/src/app

ADD mix.exs .

RUN mix deps.get
RUN mix deps.compile

ADD runner.exs .
ADD check check
ADD Makefile .
