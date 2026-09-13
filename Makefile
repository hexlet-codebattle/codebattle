BUILDX_OUTPUT ?= --load
DEV := ./bin/dev
DEV_COMPOSE := docker compose --project-name codebattle-devcontainer --project-directory . --file compose.yml

.PHONY: dev-up dev-build dev-rebuild dev-stop dev-down dev-logs dev-shell dev-exec

dev-up:
	$(DEV) true

dev-build:
	@if [ "$${CODEBATTLE_DEVCONTAINER:-}" = "1" ]; then \
		echo "Already inside the dev container; no image build is needed."; \
	else \
		$(DEV_COMPOSE) build --pull app; \
	fi

dev-rebuild: dev-build
	@if [ "$${CODEBATTLE_DEVCONTAINER:-}" != "1" ]; then \
		$(DEV_COMPOSE) up --detach --force-recreate app; \
	fi

dev-stop:
	@if [ "$${CODEBATTLE_DEVCONTAINER:-}" = "1" ]; then \
		echo "Run 'make dev-stop' from the host."; \
	else \
		$(DEV_COMPOSE) stop; \
	fi

dev-down:
	@if [ "$${CODEBATTLE_DEVCONTAINER:-}" = "1" ]; then \
		echo "Run 'make dev-down' from the host."; \
	else \
		$(DEV_COMPOSE) down --remove-orphans; \
	fi

dev-logs:
	@if [ "$${CODEBATTLE_DEVCONTAINER:-}" = "1" ]; then \
		echo "Run 'make dev-logs' from the host."; \
	else \
		$(DEV_COMPOSE) logs --follow --tail=100; \
	fi

dev-shell:
	$(DEV) bash

dev-exec:
	@test -n "$(CMD)" || (echo "Usage: make dev-exec CMD='mix help'" && exit 2)
	$(DEV) sh -c '$(CMD)'

setup-env:
	@test -f .env || cp .env.example .env

setup: setup-env
	$(MAKE) dev-build
	$(MAKE) install
	$(MAKE) db-setup

install: install-mix install-pnpm

install-mix:
	$(DEV) mix deps.get --check-locked

install-pnpm:
	$(DEV) pnpm --dir apps/codebattle install --frozen-lockfile
	$(DEV) pnpm --dir apps/codebattle run build:mem

server:
	$(DEV) iex -S mix phx.server

console:
	$(DEV) iex -S mix

compile:
	$(DEV) mix compile

test:
	$(DEV) mix coveralls.json --exclude image_executor --max-failures 1

test-fe:
	$(DEV) pnpm --dir apps/codebattle test

test-code-checkers:
	$(DEV) env CODEBATTLE_EXECUTOR=local mix test apps/codebattle/test/images --max-failures 10

format:
	$(DEV) mix format

lint:
	$(DEV) mix format --check-formatted

credo:
	$(DEV) mix credo --strict

lint-js:
	$(DEV) pnpm --dir apps/codebattle run lint

lint-js-fix:
	$(DEV) pnpm --dir apps/codebattle run lint-fix

check-js:
	$(DEV) pnpm --dir apps/codebattle run check

dialyzer:
	$(DEV) mix dialyzer

mdl: dialyzer

db-setup:
	$(DEV) mix ecto.setup

db-migrate:
	$(DEV) mix ecto.migrate

db-recreate:
	$(DEV) mix cmd --app codebattle mix ecto.reset

outdated:
	$(DEV) mix hex.outdated

release:
	$(DEV) env MIX_ENV=prod mix release

start:
	$(DEV) bin/codebattle eval "Codebattle.Utils.Release.migrate"
	$(DEV) bin/codebattle start

runner-start:
	$(DEV) bin/runner start

clean:
	@if [ "$${CODEBATTLE_DEVCONTAINER:-}" = "1" ]; then \
		echo "Run 'make clean' from the host so Docker volumes can be removed."; \
		exit 2; \
	fi
	$(DEV_COMPOSE) down --volumes --remove-orphans
	rm -rf _build deps .elixir_ls priv/static node_modules apps/codebattle/node_modules

ARS_ARGS ?=
ARS_GOCACHE ?= /workspace/tmp/ars-go-build
ARS_GOPATH ?= /workspace/tmp/ars-go
ARS_BIN ?= /workspace/tmp/ars

ars:
	$(DEV) sh -c 'mkdir -p $(ARS_GOCACHE) $(ARS_GOPATH) && cd tools/ars && GOCACHE=$(ARS_GOCACHE) GOPATH=$(ARS_GOPATH) go build -o $(ARS_BIN) ./cmd/ars && exec $(ARS_BIN) $(ARS_ARGS)'

ars-200:
	$(MAKE) ars ARS_ARGS="-server http://localhost:4000 -auth-key x-key \
		-type top200 \
		-users 200 -players-limit 200 \
		-rounds 8 \
		-break-seconds 30 \
		-round-timeout-seconds 180 \
		-avg-task-seconds 45 \
		-randomness 25 \
		-join-ramp-seconds 10 \
		-langs python,cpp \
		-task-provider task_pack \
		-task-pack-name 16_easy \
		-task-strategy per_round_pair \
		-ranking-type by_user \
		-score-strategy 75_percentile \
		-timeout-mode per_round_with_rematch"

DIMA_ARGS ?=
DIMA_GOCACHE ?= /workspace/tmp/dima-go-build
DIMA_GOPATH ?= /workspace/tmp/dima-go
DIMA_BIN ?= /workspace/tmp/dima

dima:
	$(DEV) sh -c 'mkdir -p $(DIMA_GOCACHE) $(DIMA_GOPATH) && cd tools/dima && GOCACHE=$(DIMA_GOCACHE) GOPATH=$(DIMA_GOPATH) go build -o $(DIMA_BIN) ./cmd/dima'

huyach: dima
	$(DEV) $(DIMA_BIN) $(DIMA_ARGS)

terraform-vars-generate:
	docker run --rm -it -v $(CURDIR):/app -w /app williamyeh/ansible:alpine3 ansible-playbook ansible/terraform.yml -i ansible/production -vv --vault-password-file=tmp/ansible-vault-password

ansible-edit-secrets:
	ansible-vault edit --vault-password-file tmp/ansible-vault-password ansible/production/group_vars/all/vault.yml

ansible-vault-edit-production:
	docker run --rm -it -v $(CURDIR):/app -w /app williamyeh/ansible:alpine3 ansible-vault edit --vault-password-file tmp/ansible-vault-password ansible/production/group_vars/all/vault.yml

build-local:
	DOCKER_BUILDKIT=1 docker build --target assets-image \
				--file Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--tag ghcr.io/hexlet-codebattle/codebattle:assets-image .
	DOCKER_BUILDKIT=1 docker build --target compile-image \
				--file Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--tag ghcr.io/hexlet-codebattle/codebattle:compile-image .
	DOCKER_BUILDKIT=1 docker build --target nginx-assets \
				--file Containerfile.codebattle \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/nginx-assets:latest \
				--tag ghcr.io/hexlet-codebattle/nginx-assets:latest .
	DOCKER_BUILDKIT=1 docker build --target runtime-image \
				--file Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:latest \
				--tag ghcr.io/hexlet-codebattle/codebattle:latest .
	DOCKER_BUILDKIT=1 docker build --target compile-image \
				--file Containerfile.runner \
				--cache-from ghcr.io/hexlet-codebattle/runner:compile-image \
				--tag ghcr.io/hexlet-codebattle/runner:compile-image .
	DOCKER_BUILDKIT=1 docker build --target runtime-image \
				--file Containerfile.runner \
				--cache-from ghcr.io/hexlet-codebattle/runner:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/runner:latest \
				--tag ghcr.io/hexlet-codebattle/runner:latest .

build-codebattle:
	docker pull ghcr.io/hexlet-codebattle/codebattle:assets-image  || true
	docker pull ghcr.io/hexlet-codebattle/codebattle:compile-image || true
	docker pull ghcr.io/hexlet-codebattle/codebattle:latest        || true
	DOCKER_BUILDKIT=1 docker buildx build $(BUILDX_OUTPUT) --target assets-image \
				--file Containerfile.codebattle \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:assets-cache \
				$(if $(DISABLE_CACHE_EXPORT),,--cache-to type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:assets-cache,mode=max) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:assets-image .
	DOCKER_BUILDKIT=1 docker buildx build $(BUILDX_OUTPUT) --target compile-image \
				--file Containerfile.codebattle \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:assets-cache \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:compile-cache \
				$(if $(DISABLE_CACHE_EXPORT),,--cache-to type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:compile-cache,mode=max) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:compile-image .
	DOCKER_BUILDKIT=1 docker buildx build $(BUILDX_OUTPUT) --target nginx-assets \
				--file Containerfile.codebattle \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:assets-cache \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:compile-cache \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/nginx-assets:buildcache \
				$(if $(DISABLE_CACHE_EXPORT),,--cache-to type=registry,ref=ghcr.io/hexlet-codebattle/nginx-assets:buildcache,mode=max) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/nginx-assets:latest \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/nginx-assets:latest .
	DOCKER_BUILDKIT=1 docker buildx build $(BUILDX_OUTPUT) --target runtime-image \
				--file Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:compile-cache \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:runtime-cache \
				$(if $(DISABLE_CACHE_EXPORT),,--cache-to type=registry,ref=ghcr.io/hexlet-codebattle/codebattle:runtime-cache,mode=max) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:latest \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:latest .

build-arm:
	DOCKER_BUILDKIT=1 docker build --platform linux/arm64 \
				--target assets-image \
				--file Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image-arm \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:assets-image-arm .
	DOCKER_BUILDKIT=1 docker build --platform linux/arm64 \
				--target compile-image \
				--file Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image-arm \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image-arm \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:compile-image-arm .
	DOCKER_BUILDKIT=1 docker build --platform linux/arm64 \
				--target nginx-assets \
				--file Containerfile.codebattle \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image-arm \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image-arm \
				--cache-from ghcr.io/hexlet-codebattle/nginx-assets:arm \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/nginx-assets:arm .
	DOCKER_BUILDKIT=1 docker build --platform linux/arm64 \
				--target runtime-image \
				--file Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image-arm \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:arm \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:arm .

push-codeabttle-arm:
	docker push ghcr.io/hexlet-codebattle/codebattle:assets-image-arm
	docker push ghcr.io/hexlet-codebattle/codebattle:compile-image-arm
	docker push ghcr.io/hexlet-codebattle/codebattle:arm
	docker push ghcr.io/hexlet-codebattle/nginx-assets:arm

push-codebattle:
	docker push ghcr.io/hexlet-codebattle/codebattle:assets-image
	docker push ghcr.io/hexlet-codebattle/codebattle:compile-image
	docker push ghcr.io/hexlet-codebattle/codebattle:latest
	docker push ghcr.io/hexlet-codebattle/nginx-assets:latest

build-runner:
	docker pull ghcr.io/hexlet-codebattle/runner:compile-image || true
	docker pull ghcr.io/hexlet-codebattle/runner:latest        || true
	DOCKER_BUILDKIT=1 docker buildx build $(BUILDX_OUTPUT) --target compile-image \
				--file Containerfile.runner \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/runner:compile-cache \
				$(if $(DISABLE_CACHE_EXPORT),,--cache-to type=registry,ref=ghcr.io/hexlet-codebattle/runner:compile-cache,mode=max) \
				--cache-from ghcr.io/hexlet-codebattle/runner:compile-image \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/runner:compile-image .
	DOCKER_BUILDKIT=1 docker buildx build $(BUILDX_OUTPUT) --target runtime-image \
				--file Containerfile.runner \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/runner:compile-cache \
				--cache-from type=registry,ref=ghcr.io/hexlet-codebattle/runner:runtime-cache \
				$(if $(DISABLE_CACHE_EXPORT),,--cache-to type=registry,ref=ghcr.io/hexlet-codebattle/runner:runtime-cache,mode=max) \
				--cache-from ghcr.io/hexlet-codebattle/runner:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/runner:latest \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/runner:latest .

push-runner:
	docker push ghcr.io/hexlet-codebattle/runner:compile-image
	docker push ghcr.io/hexlet-codebattle/runner:latest


runner-ruby:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/ruby:4.0.1

runner-cpp:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/cpp:23

runner-swift:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/swift:6.2.3

runner-kotlin:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/kotlin:2.3.0

runner-js:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/js:25.4.0

runner-dart:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/dart:3.10.0

runner-csharp:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/csharp:10.0.102

runner-clojure:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/clojure:1.12.4

runner-elixir:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/elixir:1.19.5

runner-golang:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/golang:1.25.6

runner-php:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/php:8.5.2

runner-java:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/java:25.0.2

runner-zig:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/zig:0.15.2

runner-rust:
	 docker run --rm -p 4040:4040 \
	    --cap-add=SYS_ADMIN \
	    --cap-add=SYS_CHROOT \
	    --security-opt=no-new-privileges=false \
	    ghcr.io/hexlet-codebattle/rust:1.93.0
