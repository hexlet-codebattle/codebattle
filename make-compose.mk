ASSERTS_PATH = "tmp/battle_asserts"

compose:
	docker-compose up

compose-build:
	docker-compose build

compose-test-all:
	docker-compose run app mix test

compose-test:
	docker-compose run app mix test test/codebattle test/codebattle_web

compose-kill:
	docker-compose kill

compose-bash:
	docker-compose run app bash

compose-install-mix:
	docker-compose run app mix deps.get

compose-install-yarn:
	docker-compose run app yarn

compose-install: compose-install-mix compose-install-yarn

compose-setup: clean compose-build compose-install compose-db-prepare

compose-db-init:
	docker-compose run app mix ecto.create
	docker-compose run app mix ecto.migrate
	docker-compose run app mix run priv/repo/seeds.exs

compose-db-prepare: compose-db-init compose-upload-asserts compose-upload-langs
	docker-compose run app mix dockers.pull

compose-upload-langs:
	docker-compose run app mix upload_langs

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
	rm -rf $(ASSERTS_PATH)
	git clone "https://github.com/hexlet-codebattle/battle_asserts.git" $(ASSERTS_PATH)
	cd $(ASSERTS_PATH) && make generate-from-docker
	docker-compose run --rm -v $(CURDIR)/tmp:/app/tmp app mix issues.upload $(ASSERTS_PATH)/issues

compose-build-dockers:
	docker-compose run app mix dockers.build ${lang}

compose-pull-dockers:
	docker-compose run app mix dockers.pull ${lang}

compose-push-dockers:
	docker-compose run app mix dockers.push ${lang}

