FROM codebattle/runner-rs:latest AS runner

FROM alpine:3.19

RUN apk add --update --no-cache make git openssh-client g++ cmake ninja python3 wget

WORKDIR /usr/src/app

RUN wget https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp
RUN wget https://raw.githubusercontent.com/nlohmann/fifo_map/master/src/fifo_map.hpp

ADD check ./check
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
