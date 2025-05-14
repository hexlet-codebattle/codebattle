# first stage – bring in Codebattle's runner
FROM codebattle/runner-rs:latest AS runner

# second stage – Swift tool-chain
FROM swift:6.1.0-jammy

RUN apt-get update && apt-get install -y --no-install-recommends make \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# copy sources & build scripts
ADD check    check
ADD Makefile .

# expose the port expected by Codebattle
EXPOSE 8000

# copy Codebattle runner binary from stage 1
COPY --from=runner /app/codebattle_runner /runner/codebattle_runner