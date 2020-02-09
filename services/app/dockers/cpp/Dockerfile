FROM debian:9-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential git openssh-client \
    g++ cmake ninja-build python3 wget cppcheck clang-tidy ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

RUN wget https://github.com/nlohmann/json/releases/download/v3.7.3/json.hpp
RUN wget https://raw.githubusercontent.com/nlohmann/fifo_map/master/src/fifo_map.hpp

ADD checker_example.cpp .
ADD solution_example.cpp .
ADD Makefile .

