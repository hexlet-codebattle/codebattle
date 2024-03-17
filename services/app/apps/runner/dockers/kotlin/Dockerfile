FROM codebattle/runner-rs:latest AS runner

FROM amazoncorretto:21-alpine3.19-full


ENV KOTLIN_VERSION=1.9.23 \
  KOTLIN_HOME=/usr/share/kotlin

RUN apk add --update --no-cache bash make curl && \
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

RUN curl -o gson.jar https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar

COPY check check
COPY Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
