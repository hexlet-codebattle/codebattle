compose:
	docker-compose up

compose-build:
	docker-compose build

compose-test:
	docker-compose run app mix test test/codebattle*

compose-kill:
	docker-compose kill

compose-bash:
	docker-compose run app bash

compose-install:
	docker-compose run app mix deps.get

compose-install-yarn:
	docker-compose run --workdir="/app/assets/" app yarn

compose-setup: compose-build compose-install compose-db-prepare

compose-db-prepare:
	docker-compose run app mix ecto.create
	docker-compose run app mix ecto.migrate
	docker-compose run app mix run priv/repo/seeds.exs
	docker-compose run app make upload_langs
	docker-compose run app mix dockers.pull

compose-upload-langs:
	docker-compose run app make upload_langs

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
