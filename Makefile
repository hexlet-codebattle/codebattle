prepare:
	sudo apt update
	sudo apt install ansible

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

compose-console:
	docker-compose run web iex -S mix

compose:
	docker-compose up -d web

compose-test:
	docker-compose run --rm test

compile:
	mix compile

install:
	mix deps.get

test:
	mix test

lint:
	mix credo

.PHONY: test
