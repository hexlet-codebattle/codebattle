prepare:
	sudo apt update
	sudo apt install ansible

rebuild-styles:
	cd assets/ && \
	yarn install && \
	yarn deploy && \
	cd ../

add-keys:
	sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys `sudo apt-get update 2>&1 | grep -o '[0-9A-Z]\{16\}' | xargs`

development-build-local:
	ansible-playbook -vv --ask-sudo-pass -i ansible/development ansible/development.yml --limit=local  --become

### Install
compose-setup: create-env compose-build compose-install compose-prepare

compose-build:
	docker-compose build

compose-rebuild:
	docker-compose build --force-rm --pull --no-cache

compose-install: compose-install-mix compose-install-yarn

compose-install-mix:
	docker-compose run web mix deps.get

compose-install-yarn:
	docker-compose run --workdir="/app/assets/" web yarn
	docker-compose run --workdir="/app/assets/" web yarn deploy

compose-compile:
	docker-compose run web mix compile

compose-prepare: compose-compile compose-db-prepare

compose-db-prepare: compose-db-create compose-db-migrate

compose-db-create:
	docker-compose run web mix ecto.create

compose-db-migrate:
	docker-compose run web mix ecto.migrate

compose-test:
	docker-compose run -e "MIX_ENV=test" web make test

compose-test-coverage-html:
	docker-compose run -e "MIX_ENV=test" web make test-coverage-html

compose-lint:
	docker-compose run web mix credo

compose-console:
	docker-compose run web iex -S mix

compose-bash:
	docker-compose run web bash

compose-restart:
	docker-compose restart

compose-stop:
	docker-compose stop

compose-kill:
	docker-compose kill

compose-logs:
	docker-compose logs -f --tail=100

compose:
	docker-compose up -d web

compile:
	mix compile

create-env:
	cp -n .env.example .env || :

install:
	mix deps.get

test:
	mix test

test-coverage-html:
	mix coveralls.html

lint:
	mix credo

clean:
	rm -rf _build
	rm -rf deps
	rm -rf .elixir_ls
	rm -rf assets/node_modules
	rm -rf priv/static/*
	rm -rf cover
	rm -rf tmp/battle_asserts

frontend_watch:
	cd assets && \
	npm run watch-dev

get-last-changes:
	 git fetch upstream
	 git checkout master
	 git merge upstream/master

upload_asserts:
	 mix issues.fetch
	 mix issues.generate
	 mix issues.upload

release:
	env MIX_ENV=prod mix edeliver build release
	mix edeliver deploy release to production --version="$VER"

.PHONY: test
