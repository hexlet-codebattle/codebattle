FROM elixir:1.11.2-alpine
ARG app_name=codebattle
ARG phoenix_subdir=.
ARG build_env=prod
ENV MIX_ENV=${build_env} TERM=xterm
WORKDIR /opt/app
RUN apk update \
  && apk --no-cache --update add nodejs git nodejs-npm make build-base g++ libpng-dev \
  && mix local.rebar --force \
  && mix local.hex --force

RUN npm i -g yarn

COPY mix.* ./
RUN mix do deps.get, compile

COPY . .

RUN yarn install --froze-lockfile

RUN yarn build \
  && mix phx.digest

RUN mix release \
  && mv _build/${build_env}/rel/${app_name} /opt/release

FROM alpine:3.12

RUN apk --no-cache --update add wkhtmltopdf
# RUN mkdir -p /usr/local/bin \
#     && cd /usr/local/bin \
#     && wget -O goon.tar.gz https://github.com/alco/goon/releases/download/v1.1.1/goon_linux_amd64.tar.gz \
#     && tar -xzf goon.tar.gz \
#     && chmod a+x goon

RUN apk update && apk --no-cache --update add bash ca-certificates openssl-dev make docker

ENV PORT=4000
EXPOSE ${PORT}
WORKDIR /opt/app
COPY --from=0 /opt/release .
COPY Makefile Makefile
CMD exec /opt/app/bin/codebattle start
