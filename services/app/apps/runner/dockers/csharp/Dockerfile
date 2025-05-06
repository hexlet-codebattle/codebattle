FROM codebattle/runner-rs:latest AS runner

# Use a specific version that's known to work well
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:9.0.203-bookworm-slim

WORKDIR /usr/src/app

# Install dependencies with optimized layers
RUN apt-get update && \
    apt-get install -y --no-install-recommends make curl && \
    rm -rf /var/lib/apt/lists/*

# Create a new .NET project directly in /usr/src/app
RUN dotnet new console

# Copy files to the project directory
COPY Program.cs ./
COPY check ./check/
COPY Makefile ./

# Add reference to CompareNetObjects package
RUN dotnet add package CompareNETObjects

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner

# Set the entry point
CMD ["make", "test"]
