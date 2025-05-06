FROM codebattle/runner-rs:latest AS runner

FROM node:22.15.0-alpine

RUN apk add --update --no-cache make

ADD package.json .
# package-lock.json is not required for the build

RUN npm install

ENV NODE_PATH=/usr/local/lib/node_modules/

WORKDIR /usr/src/app

ADD check check
ADD checker.js .
ADD assertsRunner.js .
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
