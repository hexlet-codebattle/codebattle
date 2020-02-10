FROM debian:9-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential=12.3 git=1:2.11.0-3+deb9u5 \
    openssh-client=1:7.4p1-10+deb9u7 g++=4:6.3.0-4 cmake=3.7.2-1 ninja-build=1.7.2-1 \
    python3=3.5.3-1 wget=1.18-5+deb9u3 cppcheck=1.76.1-1 clang-tidy=1:3.8-36 \
    ca-certificates=20161130+nmu1+deb9u1 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

RUN wget https://github.com/nlohmann/json/releases/download/v3.7.3/json.hpp
RUN wget https://raw.githubusercontent.com/nlohmann/fifo_map/master/src/fifo_map.hpp

ADD checker_example.cpp .
ADD solution_example.cpp .
ADD Makefile .
