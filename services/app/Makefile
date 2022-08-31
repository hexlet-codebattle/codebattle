.PHONY: test test-code-checkers

default: format lint-js-fix credo test

format:
	mix format

credo:
	mix credo

db-recreate:
	mix ecto.reset
	mix run priv/repo/seeds.exs

lint-js:
	yarn lint

lint-js-fix:
	yarn lint --fix

start:
	bin/codebattle eval "Codebattle.Utils.Release.migrate"
	bin/codebattle start

server:
	iex -S mix phx.server

console:
	iex -S mix

test:
	mix coveralls.json --exclude docker_executor --max-failures 1 --slowest 7

test-code-checkers: export CODEBATTLE_USE_DOCKER_EXECUTOR = true
test-code-checkers:
	mix test test/docker_execution --max-failures 1
