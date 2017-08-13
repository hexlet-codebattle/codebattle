FROM elixir:1.5

ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install --assume-yes apt-utils

RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y wget curl inotify-tools git build-essential zip unzip && \
    apt-get clean && rm -fr /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN mix local.hex --force \
    && mix local.rebar --force

# Install Node
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y -q nodejs

# Install Yarn
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && apt-get install -y yarn

WORKDIR /app

# install mix deps
ADD ./mix.exs /app
ADD ./mix.lock /app
RUN mix deps.get

# install node packages
ADD ./assets/package.json /app/assets/
ADD ./assets/package-lock.json /app/assets/
RUN cd ./assets && \
    yarn && \
    cd ../


RUN mix compile
