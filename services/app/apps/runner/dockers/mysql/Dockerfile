FROM codebattle/runner-rs:latest AS runner
FROM mysql:8.4.6

# RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*
RUN microdnf install -y make

ENV MYSQL_DATABASE=db
ENV MYSQL_USER=user
ENV MYSQL_PASSWORD=password
ENV MYSQL_ROOT_PASSWORD=rootpassword

WORKDIR /usr/src/app

EXPOSE 8000

ADD single_table.sql .
ADD Makefile .

CMD ["mysqld"]
COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
