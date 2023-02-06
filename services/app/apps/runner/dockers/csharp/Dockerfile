# FROM mcr.microsoft.com/dotnet/core/sdk:3.1.201-alpine3.11
FROM mcr.microsoft.com/dotnet/sdk:6.0-alpine3.13

WORKDIR /usr/src/app

RUN apk add --update make curl && dotnet new console && dotnet add package CompareNETObjects

COPY Program.cs .
COPY check check
COPY Makefile .
