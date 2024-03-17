FROM codebattle/runner-rs:latest AS runner

FROM alpine:3.19

RUN echo "@edge http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
RUN apk add --update --no-cache make dart@edge ca-certificates curl

WORKDIR /usr/src/app

COPY pubspec.yaml .
COPY pubspec.lock .
RUN dart pub get

COPY lib lib
COPY Makefile .

RUN dart pub get --offline

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
