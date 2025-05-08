FROM codebattle/runner-rs:latest AS runner

FROM mcr.microsoft.com/dotnet/sdk:9.0.203-alpine3.21

WORKDIR /usr/src/app

RUN apk add --update --no-cache make curl 

COPY app.csproj .
RUN dotnet add package CompareNETObjects

COPY Program.cs .
COPY check check
COPY Makefile .

EXPOSE 8000

COPY --from=runner /app/codebattle_runner /runner/codebattle_runner