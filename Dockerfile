FROM elixir:1.5

RUN set -ex \

    buildDeps=" \
        apt-utils \
    " && \
    apt-get -qq update && \
    apt-get -qq install --assume-yes $buildDeps --no-install-recommends && \

    # NodeJS
    curl --silent --location https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get -qq update && apt-get -qq --assume-yes install nodejs && \

    # Yarn
    curl --silent --show-error https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get -qq update && apt-get -qq --assume-yes install yarn && \

    # Clean
    apt-get -qq purge --assume-yes --auto-remove -o APT::AutoRemove::RecommendsImportant=false $buildDeps && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \

    # Elixir
    mix local.hex --force && \
    mix local.rebar --force

WORKDIR /app
