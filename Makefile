prepare:
	sudo apt update
	sudo apt install ansible

webpack:
	cd assets/
	yarn install
	cd ../

add-keys:
	sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys `sudo apt-get update 2>&1 | grep -o '[0-9A-Z]\{16\}' | xargs`

development-build-local:
	ansible-playbook -vv --ask-sudo-pass -i ansible/development ansible/development.yml --limit=local  --become

### Install
compose-setup: create-env compose-build compose-install compose-prepare

compose-build:
	docker-compose build web

compose-rebuild:
	docker-compose build --no-cache web

compose-install: compose-install-mix compose-install-yarn

compose-install-mix:
	docker-compose run web mix deps.get

compose-install-yarn:
	docker-compose run --workdir="/app/assets/" web yarn

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

rebuild-styles: webpack compose-restart

create-env:
	cp -n .env.example .env || :

install:
	mix deps.get

test:
	mix test

lint:
	mix credo

clean:
	rm -rf _build
	rm -rf deps
	rm -rf .elixir_ls
	rm -rf assets/node_modules

frontend_watch:
	cd assets && \
	npm run watch-dev

.PHONY: test
