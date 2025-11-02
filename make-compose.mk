ASSERTS_PATH = "/tmp/battle_asserts"

compose:
	podman-compose up app

compose-d:
	podman-compose up -d app

compose-build:
	podman-compose build --build-arg GIT_HASH=$(shell git rev-parse HEAD) app

compose-down:
	podman-compose down -v || true

compose-test-code-checkers:
	podman-compose run --rm --name codebattle_app app mix test image_executor

compose-test-fe:
	podman-compose run --rm --name codebattle_app app /bin/sh -c 'cd /app/apps/codebattle && pnpm test'

compose-test:
	podman-compose run --rm --name codebattle_app app mix test --exclude image_executor

compose-kill:
	podman-compose kill

compose-bash:
	podman-compose run app bash

compose-install-mix:
	podman-compose run --rm --name codebattle_app app mix deps.get

compose-install-pnpm:
	podman-compose run --rm --name codebattle_app app /bin/sh -c 'cd /app/apps/codebattle && pnpm'

compose-install: compose-install-mix compose-install-pnpm

compose-setup: compose-down compose-build compose-install compose-db-setup

compose-db-setup:
	podman-compose run --rm --name codebattle_app app mix ecto.setup

compose-db-migrate:
	podman-compose run --rm --name codebattle_app app mix ecto.migrate

compose-lint: compose-mix-format compose-mix-credo compose-lint-js-fix

compose-mix-format:
	podman-compose run --rm --name codebattle_app app mix format

compose-mix-credo:
	podman-compose run app mix credo

compose-lint-js-fix:
	podman-compose run --rm --name codebattle_app app /bin/sh -c 'cd /app/apps/codebattle && pnpm run lint --fix'

compose-console:
	podman-compose run --rm --name codebattle_app app iex -S mix

compose-restart:
	podman-compose restart

compose-stop:
	podman-compose stop

compose-logs:
	podman-compose logs -f --tail=100

compose-compile:
	podman-compose  run --rm --name codebattle_app app mix compile

compose-upload-battle-asserts:
	podman-compose run --rm --name codebattle_app app mix asserts.upload

compose-build-images:
	podman-compose run --rm --name codebattle_app app mix images.build ${lang}

compose-pull-images:
	podman-compose run --rm --name codebattle_app app mix images.pull ${lang}

compose-push-images:
	podman-compose run --rm --name codebattle_app app mix images.push ${lang}
