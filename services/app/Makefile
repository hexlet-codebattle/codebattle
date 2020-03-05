.PHONY: test tarball

CACHE_MANIFEST  := priv/static/cache_manifest.json
RELEASE         := _build/prod/rel/codebattle
RELEASE_TARBALL := release.tar.gz
WEBPACK := ./node_modules/webpack/bin/webpack.js

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

tarball: $(RELEASE_TARBALL)

$(RELEASE_TARBALL): build-release
	tar czf $(RELEASE_TARBALL) $(RELEASE)

build-release: $(CACHE_MANIFEST)
	MIX_ENV=prod mix release --overwrite

$(CACHE_MANIFEST): build-assets
	MIX_ENV=prod mix phx.digest

build-assets: $(WEBPACK)
	$(WEBPACK) --mode production

$(WEBPACK):
	yarn install --frozen-lockfile
