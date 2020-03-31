FROM google/dart:2.7.1

RUN apt-get update && apt-get install -y build-essential=12.6 --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY pubspec.* .
RUN pub get

COPY checker_example.dart ./lib/
COPY solution_example.dart ./lib/
COPY Makefile .

RUN pub get --offline
