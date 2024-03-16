FROM codebattle/runner-rs:latest AS runner

FROM amazoncorretto:21-alpine3.19-full

WORKDIR /usr/src/app

RUN apk add --update --no-cache make curl
# && curl -L https://repo1.maven.org/maven2/javax/json/javax.json-api/1.1.4/javax.json-api-1.1.4.jar > /usr/src/app/javax_json_api.jar \
# && curl -L https://repo1.maven.org/maven2/org/glassfish/javax.json/1.1.4/javax.json-1.1.4.jar > /usr/src/app/javax_json.jar

COPY check check
COPY javax_json.jar .
COPY javax_json_api.jar .
COPY Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner

ENTRYPOINT ["/runner/codebattle_runner"]
