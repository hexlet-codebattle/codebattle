FROM node:11.6.0

RUN apt-get update && apt-get install -y build-essential --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npm i -g typescript@v3.5.2 && npm i -D chai@v4.2.0 lodash@v4.17.4 @types/chai@v4.1.7 @types/node@12.0.12 @types/lodash@4.14.135

ENV NODE_PATH /usr/local/lib/node_modules/

WORKDIR /usr/src/app

ADD checker_example.ts .
ADD solution_example.ts .
ADD Makefile .
ADD tsconfig_example.json .
ADD tsconfig.json .
