# FROM elixir:latest
# # RUN apt install make

# RUN apt-get update && \
#       apt-get -y install sudo

# RUN mix local.hex --force
# RUN mix local.rebar --force
# RUN mix archive.install --force https://github.com/phoenixframework/archives/raw/master/phoenix_new.ez
# RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
# RUN sudo apt-get install -y nodejs

# # Cache elixir deps
# COPY mix.exs mix.lock ./
# RUN mix deps.get
# COPY config ./config
# RUN mix deps.compile
# COPY . .

# # EXPOSE 4000
# # CMD ["mix", "phoenix.server"]


FROM elixir:1.4

# Install hex
RUN mix local.hex --force

# Install rebar
RUN mix local.rebar --force

# Install the Phoenix framework itself
RUN mix archive.install --force https://github.com/phoenixframework/archives/raw/master/phoenix_new.ez

# Install NodeJS 6.x and the NPM
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y -q nodejs

# Set /app as workdir
WORKDIR /app