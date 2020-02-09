FROM ruby:2.6.0

RUN apt-get update && apt-get install -y build-essential --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN gem install rubocop

WORKDIR /usr/src/app

ADD .rubocop.yml .
ADD checker_example.rb .
ADD solution_example.rb .
ADD Makefile .
