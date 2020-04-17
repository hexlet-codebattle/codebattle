FROM openjdk:12-alpine3.9

WORKDIR /usr/src/app

RUN apk add --update make curl \
  && curl -L https://repo1.maven.org/maven2/javax/json/javax.json-api/1.1.4/javax.json-api-1.1.4.jar > /usr/src/app/javax_json_api.jar \
  && curl -L https://repo1.maven.org/maven2/org/glassfish/javax.json/1.1.4/javax.json-1.1.4.jar > /usr/src/app/javax_json.jar

COPY CheckerExample.java ./check/Checker.java
COPY SolutionExample.java ./check/Solution.java
COPY Makefile .
