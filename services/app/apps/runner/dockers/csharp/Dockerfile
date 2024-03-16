FROM codebattle/runner-rs:latest AS runner

FROM mcr.microsoft.com/dotnet/sdk:8.0.201-alpine3.19

WORKDIR /usr/src/app

RUN apk add --update --no-cache make curl && dotnet new console && dotnet add package CompareNETObjects

COPY Program.cs .
COPY check check
COPY Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner

ENTRYPOINT ["/runner/codebattle_runner"]
