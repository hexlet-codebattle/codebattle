compose:
	docker-compose up

compose-build:
	docker-compose build

compose-test:
	docker-compose run app mix test

compose-kill:
	docker-compose kill

compose-bash:
	docker-compose run app bash

compose-install: compose-install-mix compose-install-yarn

compose-install-mix:
	docker-compose run app mix deps.get

compose-install-yarn:
	docker-compose run --workdir="/app/assets/" app yarn
	docker-compose run --workdir="/app/assets/" app yarn deploy

compose-setup: create-env compose-build compose-install compose-db-prepare

compose-db-prepare:
	docker-compose run app mix ecto.create
	docker-compose run app mix ecto.migrate
	docker-compose run app mix run priv/repo/seeds.exs

compose-test-coverage-html:
	docker-compose run -e "MIX_ENV=test" app make test-coverage-html

compose-credo:
	docker-compose run app mix credo

compose-console:
	docker-compose run app iex -S mix

compose-restart:
	docker-compose restart

compose-stop:
	docker-compose stop

compose-logs:
	docker-compose logs -f --tail=100

compose-upload-asserts:
	 docker-compose run app mix issues.fetch
	 docker-compose run app mix issues.generate
	 docker-compose run app mix issues.upload
