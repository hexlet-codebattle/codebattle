FROM node

RUN apt-get update && apt-get install -y make --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

ADD package.json .

RUN npm install

ENV NODE_PATH /usr/local/lib/node_modules/

WORKDIR /usr/src/app

ADD runner.js .
ADD Makefile .
