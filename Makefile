include make-compose.mk

pg:
	podman compose up -d db-local

clean:
	rm -rf services/app/_build
	rm -rf services/app/deps
	rm -rf services/app/.elixir_ls
	rm -rf services/app/priv/static
	rm -rf node_modules
	rm -rf tmp/battle_asserts

test:
	make -C ./services/app/ test

test-code-checkers:
	make -C ./services/app/ test-code-checkers

terraform-vars-generate:
	podman run --rm -it -v $(CURDIR):/app -w /app williamyeh/ansible:alpine3 ansible-playbook ansible/terraform.yml -i ansible/production -vv --vault-password-file=tmp/ansible-vault-password

setup: setup-env compose-setup

setup-env:
	podman run --rm -v $(CURDIR):/app -w /app williamyeh/ansible:alpine3 ansible-playbook ansible/development.yml -i ansible/development -vv

setup-env-local:
	ansible-playbook ansible/development.yml -i ansible/development -vv

ansible-edit-secrets:
	ansible-vault edit --vault-password-file tmp/ansible-vault-password ansible/production/group_vars/all/vault.yml

ansible-vault-edit-production:
	podman run --rm -it -v $(CURDIR):/app -w /app williamyeh/ansible:alpine3 ansible-vault edit --vault-password-file tmp/ansible-vault-password ansible/production/group_vars/all/vault.yml

release:
	make -C services/app release

podman-build-local:
	podman build --target assets-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--tag codebattle/codebattle:assets-image services/app
	podman build --target compile-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--tag codebattle/codebattle:compile-image services/app
	podman build --target nginx-assets \
				--file services/app/Containerfile.codebattle \
				--tag codebattle/nginx-assets:latest services/app
	podman build --target runtime-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--tag codebattle/codebattle:latest services/app
	podman build --target compile-image \
				--file services/app/Containerfile.runner \
				--tag codebattle/runner:compile-image services/app
	podman build --target runtime-image \
				--file services/app/Containerfile.runner \
				--tag codebattle/runner:latest services/app

podman-build-codebattle:
	# podman pull codebattle/codebattle:assets-image  || true
	# podman pull codebattle/codebattle:compile-image || true
	# podman pull codebattle/codebattle:latest        || true
	podman build --target assets-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--tag codebattle/codebattle:assets-image services/app
	podman build --target compile-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--tag codebattle/codebattle:compile-image services/app
	podman build --target nginx-assets \
				--file services/app/Containerfile.codebattle \
				--tag codebattle/nginx-assets:latest services/app
	podman build --target runtime-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--tag codebattle/codebattle:latest services/app

podman-build-arm:
	podman build --platform linux/arm64 \
				--target assets-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--tag codebattle/codebattle:assets-image-arm services/app
	podman build --platform linux/arm64 \
				--target compile-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--tag codebattle/codebattle:compile-image-arm services/app
	podman build --platform linux/arm64 \
				--target nginx-assets \
				--file services/app/Containerfile.codebattle \
				--tag codebattle/nginx-assets:arm services/app
	podman build --platform linux/arm64 \
				--target runtime-image \
				--file services/app/Containerfile.codebattle \
				--build-arg GIT_HASH=$(GIT_HASH) \
				--tag codebattle/codebattle:arm services/app

podman-push-codeabttle-arm:
	podman push codebattle/codebattle:assets-image-arm
	podman push codebattle/codebattle:compile-image-arm
	podman push codebattle/codebattle:arm
	podman push codebattle/nginx-assets:arm

podman-push-codebattle:
	podman push codebattle/codebattle:assets-image
	podman push codebattle/codebattle:compile-image
	podman push codebattle/codebattle:latest
	podman push codebattle/nginx-assets:latest

podman-build-runner:
	# podman pull codebattle/runner:compile-image || true
	# podman pull codebattle/runner:latest        || true
	podman build --target compile-image \
				--file services/app/Containerfile.runner \
				--tag codebattle/runner:compile-image services/app
	podman build --target runtime-image \
				--file services/app/Containerfile.runner \
				--tag codebattle/runner:latest services/app

podman-push-runner:
	podman push codebattle/runner:compile-image
	podman push codebattle/runner:latest
