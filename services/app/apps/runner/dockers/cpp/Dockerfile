FROM codebattle/runner-rs:latest AS runner

FROM alpine:3.21

# Install build tools and dependencies with a single RUN to reduce layers
RUN apk add --update --no-cache make git openssh-client g++ cmake ninja python3 wget ccache

WORKDIR /usr/src/app

# Download dependencies to the correct location
RUN wget -O json.hpp https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp && \
    wget -O fifo_map.hpp https://raw.githubusercontent.com/nlohmann/fifo_map/master/src/fifo_map.hpp

# Add check directory and Makefile
ADD check ./check
ADD Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
