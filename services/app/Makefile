db-recreate:
	mix ecto.reset
	mix run priv/repo/seeds.exs

lint-js:
	yarn lint

lint-js-fix:
	yarn lint --fix

start:
	mix ecto.migrate
	mix phx.server

update:
	mix deps.update --all
	ncu -u
	npm update

console:
	iex -S mix

test:
	mix coveralls.json --exclude code_check --max-failures 1

test-code-checkers: export CODEBATTLE_RUN_CODE_CHECK = true
test-code-checkers:
	mix test test/code_check --max-failures 1

.PHONY: test
