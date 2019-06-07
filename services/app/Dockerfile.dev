FROM elixir:1.8

# Install hex (Elixir package manager)
# Install rebar (Erlang build tool)
RUN mix local.hex --force \
 && mix local.rebar --force

# RUN mix archive.install --force https://github.com/phoenixframework/archives/raw/master/phoenix_new.ez

RUN mix local.rebar --force

RUN apt-get update \
 && apt-get install -y inotify-tools \
 && apt-get install -y vim

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash - \
 && apt-get update \
 && apt-get install -y nodejs \
 && npm install --global yarn@1.16.0

ENV DOCKER_CHANNEL edge
ENV DOCKER_VERSION 18.09.3
RUN curl -fsSL "https://download.docker.com/linux/static/${DOCKER_CHANNEL}/x86_64/docker-${DOCKER_VERSION}.tgz" \
  | tar -xzC /usr/local/bin --strip=1 docker/docker

WORKDIR /app
