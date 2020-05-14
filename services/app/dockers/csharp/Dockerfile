FROM mcr.microsoft.com/dotnet/core/sdk:3.1.201-alpine3.11

WORKDIR /usr/src/app

RUN apk add --update make curl && dotnet new console && dotnet add package CompareNETObjects

COPY Program.cs .
COPY CheckerExample.cs ./check/checker.cs
COPY SolutionExample.cs ./check/solution.cs
COPY Makefile .
