db-recreate:
	mix ecto.reset
	mix run priv/repo/seeds.exs

lint-js:
	npx eslint --ext .js --ext .jsx assets/js/

lint-js-fix:
	npx eslint --fix --ext .js --ext .jsx assets/js/

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
	mix test --exclude code_check --max-failures 1

test-code-checkers: export CODEBATTLE_RUN_CODE_CHECK = true
test-code-checkers:
	mix test test/code_check --max-failures 1

.PHONY: test
