include make-compose.mk

pg:
	docker compose up -d db-local

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

docker-build-codebattle:
	docker pull codebattle/codebattle:assets-image  || true
	docker pull codebattle/codebattle:compile-image || true
	docker pull codebattle/codebattle:latest        || true
	docker build --target assets-image \
				--cache-from=codebattle/codebattle:assets-image \
				--file services/app/Dockerfile.codebattle \
				--tag codebattle/codebattle:assets-image services/app
	docker build --target compile-image \
				--cache-from=codebattle/codebattle:assets-image \
				--cache-from=codebattle/codebattle:compile-image \
				--file services/app/Dockerfile.codebattle \
				--tag codebattle/codebattle:compile-image services/app
	docker build --target runtime-image \
				--cache-from=codebattle/codebattle:assets-image \
				--cache-from=codebattle/codebattle:compile-image \
				--cache-from=codebattle/codebattle:latest \
				--file services/app/Dockerfile.codebattle \
				--tag codebattle/codebattle:latest services/app

docker-push-codebattle:
	docker push codebattle/codebattle:assets-image
	docker push codebattle/codebattle:compile-image
	docker push codebattle/codebattle:latest

docker-build-runner:
	docker pull codebattle/runner:compile-image || true
	docker pull codebattle/runner:latest        || true
	docker build --target compile-image \
				--cache-from=codebattle/runner:compile-image \
				--file services/app/Dockerfile.runner \
				--tag codebattle/runner:compile-image services/app
	docker build --target runtime-image \
				--cache-from=codebattle/runner:compile-image \
				--cache-from=codebattle/runner:latest \
				--file services/app/Dockerfile.runner \
				--tag codebattle/runner:latest services/app

docker-push-runner:
	docker push codebattle/runner:compile-image
	docker push codebattle/runner:latest

docker-build-nginx:
	docker build --file services/nginx/Dockerfile --tag codebattle/nginx services/nginx

docker-push-nginx:
	docker push codebattle/nginx:latest

