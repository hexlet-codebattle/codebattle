ASSERTS_PATH = "tmp/battle_asserts"

compose:
	docker compose up app

compose-d:
	docker compose up -d app

compose-build:
	docker compose build --build-arg GIT_HASH=$(shell git rev-parse HEAD) app

compose-down:
	docker compose down -v || true

compose-test-code-checkers:
	docker compose run --rm --name codebattle_app app mix test docker_executor

compose-test-yarn:
	docker compose run --rm --name codebattle_app app /bin/sh -c 'cd /app/apps/codebattle && yarn test'

compose-test:
	docker compose run --rm --name codebattle_app app mix test --exclude docker_executor

compose-kill:
	docker compose kill

compose-bash:
	docker compose run app bash

compose-install-mix:
	docker compose run --rm --name codebattle_app app mix deps.get

compose-install-yarn:
	docker compose run --rm --name codebattle_app app /bin/sh -c 'cd /app/apps/codebattle && yarn'

compose-install: compose-install-mix compose-install-yarn

compose-setup: compose-down compose-build compose-install compose-db-init

compose-db-init:
	docker compose run --rm --name codebattle_app app mix ecto.create
	docker compose run --rm --name codebattle_app app mix ecto.migrate
	docker compose run --rm --name codebattle_app app mix run priv/repo/seeds.exs

compose-db-migrate:
	docker compose run --rm --name codebattle_app app mix ecto.migrate

compose-lint: compose-mix-format compose-mix-credo compose-lint-js-fix

compose-mix-format:
	docker compose run --rm --name codebattle_app app mix format

compose-mix-credo:
	docker compose run app mix credo

compose-lint-js-fix:
	docker compose run --rm --name codebattle_app app /bin/sh -c 'cd /app/apps/codebattle && yarn lint --fix'

compose-console:
	docker compose run --rm --name codebattle_app app iex -S mix

compose-restart:
	docker compose restart

compose-stop:
	docker compose stop

compose-logs:
	docker compose logs -f --tail=100

compose-upload-asserts:
	rm -rf $(ASSERTS_PATH)
	git clone "https://github.com/hexlet-codebattle/battle_asserts.git" $(ASSERTS_PATH)
	cd $(ASSERTS_PATH) && make generate-from-docker
	docker compose run --rm --name codebattle_app -v $(CURDIR)/tmp:/app/tmp app mix issues.upload $(ASSERTS_PATH)/issues

compose-build-dockers:
	docker compose run --rm --name codebattle_app app mix dockers.build ${lang}

compose-pull-dockers:
	docker compose run --rm --name codebattle_app app mix dockers.pull ${lang}

compose-push-dockers:
	docker compose run --rm --name codebattle_app app mix dockers.push ${lang}
