ASSERTS_PATH = "tmp/battle_asserts"

compose:
	docker-compose up app

compose-build:
	docker-compose build

compose-down:
	docker-compose down -v || true

compose-test-code-checkers:
	docker-compose run app mix test test/code_check

compose-test:
	docker-compose run app mix test --exclude code_check

compose-kill:
	docker-compose kill

compose-bash:
	docker-compose run app bash

compose-install-mix:
	docker-compose run app mix deps.get

compose-install-yarn:
	docker-compose run app yarn

compose-install: compose-install-mix compose-install-yarn

compose-setup: compose-down compose-build compose-install compose-db-init

compose-db-init:
	docker-compose run app mix ecto.create
	docker-compose run app mix ecto.migrate
	docker-compose run app mix run priv/repo/seeds.exs

compose-lint:  compose-mix-format compose-mix-credo compose-lint-js-fix

compose-mix-format:
	docker-compose run app mix format

compose-mix-credo:
	docker-compose run app mix credo

compose-lint-js-fix:
	docker-compose run app yarn lint --fix

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

