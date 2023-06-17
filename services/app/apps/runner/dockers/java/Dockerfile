FROM amazoncorretto:20-alpine3.17-full

WORKDIR /usr/src/app

RUN apk add --update make curl
# && curl -L https://repo1.maven.org/maven2/javax/json/javax.json-api/1.1.4/javax.json-api-1.1.4.jar > /usr/src/app/javax_json_api.jar \
# && curl -L https://repo1.maven.org/maven2/org/glassfish/javax.json/1.1.4/javax.json-1.1.4.jar > /usr/src/app/javax_json.jar

COPY check check
COPY javax_json.jar .
COPY javax_json_api.jar .
COPY Makefile .
