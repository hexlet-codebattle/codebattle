.PHONY: test test-code-checkers

default: format lint-js-fix credo test

format:
	mix format

lint:
	mix format --check-formatted

credo:
	mix credo

db-recreate:
	mix cmd --app codebattle mix ecto.reset

outdated:
	mix hex.outdated

lint-js:
	yarn lint

lint-js-fix:
	yarn lint --fix

start:
	bin/codebattle eval "Codebattle.Utils.Release.migrate"
	bin/codebattle start

runner-start:
	bin/runner start

server:
	iex -S mix phx.server

console:
	iex -S mix

test:
	mix coveralls.json --exclude docker_executor --max-failures 1

test-code-checkers: export CODEBATTLE_EXECUTOR = local
test-code-checkers:
	mix test test/docker_execution --max-failures 10
