FROM codebattle/runner-rs:latest AS runner

FROM node:20.11.1-alpine

RUN apk add --update --no-cache make

ADD package.json .
ADD package-lock.json .

RUN npm install

ENV NODE_PATH /usr/local/lib/node_modules/

WORKDIR /usr/src/app

ADD checker.js .
ADD assertsRunner.js .
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
