FROM rust:1.70.0-alpine3.18

RUN apk add --update make

WORKDIR /usr/src/app

ADD Cargo.toml .
ADD src ./src
RUN cargo build --release

ADD check ./check
ADD Makefile .
