FROM openjdk:18-alpine3.15

ENV KOTLIN_VERSION=1.6.21 \
  KOTLIN_HOME=/usr/share/kotlin

RUN apk add --update bash && \
  apk add --virtual=build-dependencies wget ca-certificates && \
  cd /tmp && \
  wget "https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip" && \
  unzip "kotlin-compiler-${KOTLIN_VERSION}.zip" && \
  mkdir "${KOTLIN_HOME}" && \
  rm "/tmp/kotlinc/bin/"*.bat && \
  mv "/tmp/kotlinc/bin" "/tmp/kotlinc/lib" "${KOTLIN_HOME}" && \
  ln -s "${KOTLIN_HOME}/bin/"* "/usr/bin/" && \
  apk del build-dependencies && \
  rm -rf /tmp/* /var/cache/apk/*

WORKDIR /usr/src/app

RUN apk add --update make curl \
  && curl -L https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/json-simple/json_simple-1.1.jar > /usr/src/app/json_simple.jar

COPY check check
COPY Makefile .

