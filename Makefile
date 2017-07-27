prepare:
	sudo apt update
	sudo apt install ansible

development-build-local:
	ansible-playbook -vv -i ansible/development ansible/development.yml --limit=local  --become

### Install
compose-setup: compose-build compose-install compose-prepare

compose-build:
	docker-compose build web

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

compose-console: docker-compose run web iex -S mix

compose:
	docker-compose up

compose-test:
	docker-compose run web make test

comose-test-aside:
	docker-compose run test

compile:
	mix compile

install:
	mix deps.get

test:
	mix test

lint:
	mix credo

.PHONY: test
