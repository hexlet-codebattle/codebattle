FROM codebattle/runner-rs:latest AS runner

FROM amazoncorretto:21-alpine3.19-full

WORKDIR /usr/src/app

RUN apk add --update --no-cache make curl

RUN curl -o gson.jar https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar

COPY check check
COPY Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
