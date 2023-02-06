FROM node:16.17.0-alpine3.16

RUN apk add --update make

ADD package.json .
ADD package-lock.json .

RUN npm install

ENV NODE_PATH /usr/local/lib/node_modules/

WORKDIR /usr/src/app

ADD runner.js .
ADD Makefile .
