FROM alpine:3.4

RUN apk add --update make
RUN apk add --no-cache git openssh-client g++ cmake ninja python3 wget

WORKDIR /usr/src/app

RUN wget https://github.com/nlohmann/json/releases/download/v3.7.3/json.hpp
RUN wget https://raw.githubusercontent.com/nlohmann/fifo_map/master/src/fifo_map.hpp

ADD checker_example.cpp .
ADD solution_example.cpp .
ADD Makefile .

