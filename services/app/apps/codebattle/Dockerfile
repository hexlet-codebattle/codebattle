FROM elixir:1.14.3 AS compile-image
ENV MIX_ENV=prod

WORKDIR /opt/app

RUN mix local.hex --force \
  && mix local.rebar --force

RUN apt-get update \
  && curl -sL https://deb.nodesource.com/setup_14.x | bash - \
  && apt-get install --no-install-recommends -y nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global yarn@1.22.10

COPY mix.lock .
COPY mix.exs .
RUN mix do deps.get, compile

COPY package.json .
COPY yarn.lock .
RUN yarn install --froze-lockfile

COPY . .

RUN yarn build && mix phx.digest

RUN mix release \
  && mv _build/prod/rel/codebattle /opt/release

FROM elixir:1.14.3 AS runtime-image

ENV DOCKER_CHANNEL stable
ENV DOCKER_VERSION 20.10.9

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install --no-install-recommends -y ca-certificates wkhtmltopdf git make curl vim \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://download.docker.com/linux/static/${DOCKER_CHANNEL}/x86_64/docker-${DOCKER_VERSION}.tgz" \
  | tar -xzC /usr/local/bin --strip=1 docker/docker

# RUN mkdir -p /usr/local/bin \
#   && cd /usr/local/bin \
#   && wget -O goon.tar.gz https://github.com/alco/goon/releases/download/v1.1.1/goon_linux_amd64.tar.gz \
#   && tar -xzf goon.tar.gz \
#   && chmod a+x goon

ENV PORT=4000
EXPOSE ${PORT}
WORKDIR /opt/app
COPY --from=compile-image /opt/release .
COPY Makefile Makefile
CMD exec /opt/app/bin/codebattle start
