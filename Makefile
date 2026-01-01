include make-compose.mk

pg:
	docker compose up -d db-local

clean:
	rm -rf services/app/_build
	rm -rf services/app/deps
	rm -rf services/app/.elixir_ls
	rm -rf services/app/priv/static
	rm -rf node_modules

test:
	make -C ./services/app/ test

test-code-checkers:
	make -C ./services/app/ test-code-checkers

terraform-vars-generate:
	docker run --rm -it -v $(CURDIR):/app -w /app williamyeh/ansible:alpine3 ansible-playbook ansible/terraform.yml -i ansible/production -vv --vault-password-file=tmp/ansible-vault-password

setup: setup-env compose-setup

setup-env:
	docker run --rm -v $(CURDIR):/app -w /app williamyeh/ansible:alpine3 ansible-playbook ansible/development.yml -i ansible/development -vv

setup-env-local:
	ansible-playbook ansible/development.yml -i ansible/development -vv

ansible-edit-secrets:
	ansible-vault edit --vault-password-file tmp/ansible-vault-password ansible/production/group_vars/all/vault.yml

ansible-vault-edit-production:
	docker run --rm -it -v $(CURDIR):/app -w /app williamyeh/ansible:alpine3 ansible-vault edit --vault-password-file tmp/ansible-vault-password ansible/production/group_vars/all/vault.yml

release:
	make -C services/app release

build-local:
	DOCKER_BUILDKIT=1 docker build --target assets-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--tag ghcr.io/hexlet-codebattle/codebattle:assets-image services/app
	DOCKER_BUILDKIT=1 docker build --target compile-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--tag ghcr.io/hexlet-codebattle/codebattle:compile-image services/app
	DOCKER_BUILDKIT=1 docker build --target nginx-assets \
				--file services/app/Containerfile.codebattle \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/nginx-assets:latest \
				--tag ghcr.io/hexlet-codebattle/nginx-assets:latest services/app
	DOCKER_BUILDKIT=1 docker build --target runtime-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:latest \
				--tag ghcr.io/hexlet-codebattle/codebattle:latest services/app
	DOCKER_BUILDKIT=1 docker build --target compile-image \
				--file services/app/Containerfile.runner \
				--cache-from ghcr.io/hexlet-codebattle/runner:compile-image \
				--tag ghcr.io/hexlet-codebattle/runner:compile-image services/app
	DOCKER_BUILDKIT=1 docker build --target runtime-image \
				--file services/app/Containerfile.runner \
				--cache-from ghcr.io/hexlet-codebattle/runner:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/runner:latest \
				--tag ghcr.io/hexlet-codebattle/runner:latest services/app

build-codebattle:
	docker pull ghcr.io/hexlet-codebattle/codebattle:assets-image  || true
	docker pull ghcr.io/hexlet-codebattle/codebattle:compile-image || true
	docker pull ghcr.io/hexlet-codebattle/codebattle:latest        || true
	DOCKER_BUILDKIT=1 docker build --target assets-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:assets-image services/app
	DOCKER_BUILDKIT=1 docker build --target compile-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:compile-image services/app
	DOCKER_BUILDKIT=1 docker build --target nginx-assets \
				--file services/app/Containerfile.codebattle \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/nginx-assets:latest \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/nginx-assets:latest services/app
	DOCKER_BUILDKIT=1 docker build --target runtime-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:latest \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:latest services/app

build-arm:
	DOCKER_BUILDKIT=1 docker build --platform linux/arm64 \
				--target assets-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image-arm \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:assets-image-arm services/app
	DOCKER_BUILDKIT=1 docker build --platform linux/arm64 \
				--target compile-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image-arm \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image-arm \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:compile-image-arm services/app
	DOCKER_BUILDKIT=1 docker build --platform linux/arm64 \
				--target nginx-assets \
				--file services/app/Containerfile.codebattle \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:assets-image-arm \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image-arm \
				--cache-from ghcr.io/hexlet-codebattle/nginx-assets:arm \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/nginx-assets:arm services/app
	DOCKER_BUILDKIT=1 docker build --platform linux/arm64 \
				--target runtime-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:compile-image-arm \
				--cache-from ghcr.io/hexlet-codebattle/codebattle:arm \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/codebattle:arm services/app

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
	DOCKER_BUILDKIT=1 docker build --target compile-image \
				--file services/app/Containerfile.runner \
				--cache-from ghcr.io/hexlet-codebattle/runner:compile-image \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/runner:compile-image services/app
	DOCKER_BUILDKIT=1 docker build --target runtime-image \
				--file services/app/Containerfile.runner \
				--cache-from ghcr.io/hexlet-codebattle/runner:compile-image \
				--cache-from ghcr.io/hexlet-codebattle/runner:latest \
				--build-arg BUILDKIT_INLINE_CACHE=1 \
				--tag ghcr.io/hexlet-codebattle/runner:latest services/app

push-runner:
	docker push ghcr.io/hexlet-codebattle/runner:compile-image
	docker push ghcr.io/hexlet-codebattle/runner:latest
