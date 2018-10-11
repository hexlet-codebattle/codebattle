FROM node:10.11.0-alpine

RUN apk add --update make

RUN npm i -g chai

ENV NODE_PATH /usr/local/lib/node_modules/

WORKDIR /usr/src/app

ADD checker.js .
ADD Makefile .
