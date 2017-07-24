compile:
	mix compile

install:
	mix deps.get	

test:
	mix test

console: compile
	iex -S mix

# release:
# 	rebar3 release

# cli:
# 	./_build/default/bin/cli

start:
	mix phoenix.server

compose:
	docker-compose up

compose-bash:
	docker-compose run web bash

compose-build:
	docker-compose build

compose-release:
	docker-compose run web make release

compose-test:
	docker-compose run web make test

.PHONY: test