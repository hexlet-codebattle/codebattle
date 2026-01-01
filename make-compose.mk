compose:
	docker compose up app

compose-d:
	docker compose up -d app

compose-build:
	docker compose build --build-arg GIT_HASH=$(shell git rev-parse HEAD) app

compose-down:
	docker compose down -v || true

compose-test-code-checkers:
	docker compose run --rm --name codebattle_app app mix test image_executor

compose-test-fe:
	docker compose run --rm --name codebattle_app app /bin/sh -c 'cd /app/apps/codebattle && pnpm test'

compose-test:
	docker compose run --rm --name codebattle_app app mix test --exclude image_executor

compose-kill:
	docker compose kill

compose-bash:
	docker compose run app bash

compose-install-mix:
	docker compose run --rm --name codebattle_app app mix deps.get

compose-install-pnpm:
	docker compose run --rm --name codebattle_app app /bin/sh -c 'cd /app/apps/codebattle && pnpm install && pnpm run build:mem'

compose-install: compose-install-mix compose-install-pnpm

compose-setup: compose-down compose-build compose-install compose-db-setup

compose-db-setup:
	docker compose run --rm --name codebattle_app app mix ecto.setup

compose-db-migrate:
	docker compose run --rm --name codebattle_app app mix ecto.migrate

compose-lint: compose-mix-format compose-mix-credo compose-lint-js-fix

compose-mix-format:
	docker compose run --rm --name codebattle_app app mix format

compose-mix-credo:
	docker compose run app mix credo

compose-lint-js-fix:
	docker compose run --rm --name codebattle_app app /bin/sh -c 'cd /app/apps/codebattle && pnpm run lint --fix'

compose-console:
	docker compose run --rm --name codebattle_app app iex -S mix

compose-restart:
	docker compose restart

compose-stop:
	docker compose stop

compose-logs:
	docker compose logs -f --tail=100

compose-compile:
	docker compose  run --rm --name codebattle_app app mix compile

compose-build-images:
	docker compose run --rm --name codebattle_app app mix images.build ${lang}

compose-pull-images:
	docker compose run --rm --name codebattle_app app mix images.pull ${lang}

compose-push-images:
	docker compose run --rm --name codebattle_app app mix images.push ${lang}
