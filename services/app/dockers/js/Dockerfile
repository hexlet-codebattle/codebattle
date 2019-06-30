FROM node:11.6.0

RUN apt-get update && apt-get install -y build-essential --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npm i -g chai

ENV NODE_PATH /usr/local/lib/node_modules/

WORKDIR /usr/src/app

ADD checker_example.js .
ADD solution_example.js .
ADD Makefile .
