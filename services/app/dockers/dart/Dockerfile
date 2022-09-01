FROM dart:2.17.6

RUN apt-get update && apt-get install -y make --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY pubspec.* .
RUN dart pub get

COPY lib lib
COPY Makefile .

RUN dart pub get --offline
