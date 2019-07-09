FROM python:3.7.2

RUN apt-get update && apt-get install -y build-essential --no-install-recommends && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ADD checker_example.py .
ADD solution_example.py .
ADD Makefile .
