FROM node:9.3.0-alpine

RUN apk add --update make

RUN npm i -g chai
RUN npm i -g babel-cli
RUN npm i -g babel-preset-env

ENV NODE_PATH /usr/local/lib/node_modules/
ENV BABEL_DISABLE_CACHE 1

WORKDIR /usr/src/app
