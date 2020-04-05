FROM node:13.8.0

RUN apt-get update && apt-get install -y build-essential --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npm i -g chai@4.2.0 @babel/core@7.5.4 @babel/cli@7.5.0 \
    && npm i -D @babel/plugin-proposal-pipeline-operator@7.5.0 lodash@4.17.14 rambda@2.11.2

ENV NODE_PATH /usr/local/lib/node_modules/

WORKDIR /usr/src/app

ADD checker_example.js .
ADD solution_example.js .
ADD .babelrc .
ADD Makefile .
