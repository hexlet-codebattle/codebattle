### Prepare environment for developing

### Debian GNU/Linux

debian-prepare: debian-fix-keys
	sudo apt-get -qq update
	sudo apt-get -qq --assume-yes install ansible

debian-fix-keys:
	sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys `sudo apt-get update 2>&1 | grep -o '[0-9A-Z]\{16\}' | xargs`

debian-setup: debian-prepare
	ansible-playbook -vv --ask-sudo-pass -i ansible/development ansible/development.yml --limit=local  --become

### Helpers for Docker Composer

compose-build:
	docker-compose build

compose-clean:
	docker-compose run --rm runtime make clean

compose-rebuild: compose-rebuild-runtime

compose-setup:
	docker-compose run --rm runtime make setup

compose-watch-frontend:
	docker-compose run --rm runtime make watch-frontend

compose-rebuild-all: compose-rebuild-runtime compose-rebuild-app

compose-rebuild-runtime:
	docker-compose build --force-rm --pull --no-cache

compose-rebuild-app:
	docker-compose rm --stop --force
	docker volume rm --force codebattle_postgres-data
	docker-compose run --rm runtime rebuild

compose-rebuild-frontend:
	docker-compose run --rm runtime make rebuild-frontend

compose-install: compose-install-mix compose-install-yarn

compose-install-mix:
	docker-compose run --rm runtime make deps

compose-install-yarn:
	docker-compose run --rm runtime make assets/node_modules

compose-compile:
	docker-compose run --rm runtime make _build

compose-db-create:
	docker-compose run --rm runtime make db-create

compose-db-migrate:
	docker-compose run --rm runtime make db-migrate

compose-test:
	docker-compose run --rm runtime make test

compose-test-coverage-html:
	docker-compose run --rm runtime make test-coverage-html

compose-lint:
	docker-compose run --rm runtime make lint

compose-console:
	docker-compose run --rm runtime iex -S mix

compose-bash:
	docker-compose run --rm runtime bash

compose-restart:
	docker-compose restart

compose-stop:
	docker-compose stop

compose-kill:
	docker-compose kill

compose-logs:
	docker-compose logs -f --tail=100

compose:
	docker-compose up -d

### Build App

.env:
	cp .env.example .env

install:
	mix deps.get

.PHONY: test
test: lint
	MIX_ENV=test mix test
#	cd assets && npm test

test-coverage-html:
	mix coveralls.html

lint:
	mix credo
	cd assets && npm run lint FIXME исправить ошибки линтера

clean: clean-deps clean-frontend
	rm -rf _build
	rm -rf .elixir_ls
	rm -rf cover

clean-deps:
	rm -rf deps
	rm -rf assets/node_modules
	rm -rf priv/static/*

clean-frontend:
	rm -rf priv/static

rebuild: clean _build

rebuild-deps: clean-deps deps assets/node_modules

rebuild-frontend: clean-frontend priv/static

_build: deps
	mix compile

db-create:
	mix ecto.create

db-migrate: db-create
	mix ecto.migrate

assets/node_modules: deps
	cd assets && yarn

priv/static: assets/node_modules
	cd assets && npm run deploy

deps:
	mix deps.get

setup: .env _build priv/static db-migrate

watch-frontend:
	cd assets && npm run watch-dev

start:
	mix phx.server

get-last-changes:
	 git fetch upstream
	 git checkout master
	 git merge upstream/master

