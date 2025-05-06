FROM codebattle/runner-rs:latest AS runner

FROM alpine:3.21

RUN echo "@edge http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
RUN echo "@edgecommunity http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories
RUN echo "@edgemain http://dl-cdn.alpinelinux.org/alpine/edge/main" >> /etc/apk/repositories
RUN apk add --update --no-cache make ca-certificates curl \
    icu-libs@edgemain icu-data-full@edgecommunity \
    dart@edge

WORKDIR /usr/src/app

COPY pubspec.yaml .
COPY pubspec.lock .
RUN dart pub get

COPY lib lib
COPY Makefile .

RUN dart pub get --offline

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
