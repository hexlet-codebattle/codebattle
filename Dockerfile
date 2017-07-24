FROM elixir:latest
# RUN apt install make

RUN apt-get update && \
      apt-get -y install sudo

RUN mix local.hex --force
RUN mix archive.install --force https://github.com/phoenixframework/archives/raw/master/phoenix_new.ez
RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
RUN sudo apt-get install -y nodejs

RUN mkdir /code
ADD . /code
WORKDIR /code

# EXPOSE 4000
# CMD ["mix", "phoenix.server"]
