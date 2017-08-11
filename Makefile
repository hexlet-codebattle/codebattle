prepare:
	sudo apt update
	sudo apt install ansible

webpack:
	cd assets/ && npm install && cd ../

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

compose-install:
	docker-compose run web mix deps.get

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

compose:
	docker-compose up -d web

compile:
	mix compile

rebuild-styles: webpack compose-restart

create-env:
	cp .env.example .env

install:
	mix deps.get

test:
	mix test

lint:
	mix credo

clean:
	rm -r _build && \
	rm -r deps && \
	rm -r .elixir_ls

frontend_watch:
	cd assets && \
	npm run watch-dev

.PHONY: test
