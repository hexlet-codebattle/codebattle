prepare:
	sudo apt update
	sudo apt install ansible

webpack:
	cd assets/
	npm install
	cd ../

development-build-local:
	ansible-playbook -vv --ask-sudo-pass -i ansible/development ansible/development.yml --limit=local  --become

### Install
compose-setup: compose-build compose-install compose-prepare

compose-build:
	docker-compose build web

compose-rebuild:
	docker-compose build --no-cache web

compose-install:
	docker-compose run --rm web mix deps.get

compose-compile:
	docker-compose run --rm web mix compile

compose-prepare: compose-compile compose-db-prepare

compose-db-prepare: compose-db-create compose-db-migrate

compose-db-create:
	docker-compose run --rm web mix ecto.create

compose-db-migrate:
	docker-compose run --rm web mix ecto.migrate

compose-test:
	docker-compose run --rm -e "MIX_ENV=test" web make test

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

install:
	mix deps.get

test:
	mix test

lint:
	mix credo

clean:
	rm -r _build
	rm -r deps
	rm -r .elixir_ls

frontend_watch:
	cd assets \
	npm run watch-dev

.PHONY: test
