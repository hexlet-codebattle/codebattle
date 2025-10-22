FROM codebattle/runner-rs:latest AS runner
FROM postgres:18-alpine

RUN apk add --no-cache make

ENV POSTGRES_DB=db
ENV POSTGRES_USER=user
ENV POSTGRES_PASSWORD=password

WORKDIR /usr/src/app

EXPOSE 8000

ADD single_table.sql .
ADD Makefile .

# The default entrypoint (postgres) is used to start the server
CMD ["postgres"]
COPY --from=runner /app/codebattle_runner /runner/codebattle_runner
