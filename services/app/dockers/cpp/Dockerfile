FROM alpine:3.16

RUN apk add --update make
RUN apk add --no-cache git openssh-client g++ cmake ninja python3 wget

WORKDIR /usr/src/app

# RUN wget https://github.com/nlohmann/json/releases/download/v3.11.1/json.hpp -P check/
# RUN wget https://raw.githubusercontent.com/nlohmann/fifo_map/master/src/fifo_map.hpp -P check/

ADD check check
ADD Makefile .

