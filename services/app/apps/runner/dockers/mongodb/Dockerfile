FROM codebattle/runner-rs:latest AS runner
FROM mongo:8.0.14

RUN apt-get update && \
  apt-get install -y make && \
  rm -rf /var/lib/apt/lists/*

ENV MONGO_INITDB_DATABASE=db
ENV MONGO_INITDB_ROOT_USERNAME=user
ENV MONGO_INITDB_ROOT_PASSWORD=password

WORKDIR /usr/src/app

EXPOSE 8000

ADD single_table.js .
ADD Makefile .

CMD ["mongod"]
COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
