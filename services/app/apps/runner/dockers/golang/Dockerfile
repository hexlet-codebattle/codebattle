FROM codebattle/runner-rs:latest AS runner

# Use a more optimized golang image
FROM golang:1.24.2-alpine

# Install required tools and setup caching
RUN apk add --update --no-cache make

# Create a directory for build cache
RUN mkdir -p /go/cache
ENV GOCACHE=/go/cache
ENV GOMODCACHE=/go/cache/mod

# Set environment variables for optimization
ENV CGO_ENABLED=0
ENV GOGC=off

WORKDIR /usr/src/app

# Add files
ADD check check
ADD Makefile .

# Pre-compile dependencies
RUN go build -o /dev/null ./check/checker.go ./check/solution.go || true

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
