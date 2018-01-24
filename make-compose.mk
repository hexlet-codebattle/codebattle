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

compose-install-mix:
	docker-compose run app mix deps.get

compose-install-yarn:
	docker-compose run --workdir="/app/assets/" app yarn

compose-install: compose-install-mix compose-install-yarn

compose-setup: clean compose-build compose-install compose-db-prepare

compose-db-prepare:
	docker-compose run app mix ecto.create
	docker-compose run app mix ecto.migrate
	docker-compose run app mix run priv/repo/seeds.exs
	docker-compose run app make upload-langs
	docker-compose run app mix dockers.pull

compose-upload-langs:
	docker-compose run app make upload-langs

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
	 cd tmp/battle_asserts/ && make generate-from-docker
	 docker-compose run app mix issues.upload

compose-build-dockers:
	docker-compose run app mix dockers.build ${lang}

compose-pull-dockers:
	docker-compose run app mix dockers.pull ${lang}

compose-push-dockers:
	docker-compose run app mix dockers.push ${lang}

