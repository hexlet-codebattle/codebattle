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

docker-build-app:
	docker pull codebattle/app:compile-stage || true
	docker pull codebattle/app:latest        || true
	docker build --target compile-image \
				--cache-from=codebattle/app:compile-stage \
				--file services/app/Dockerfile \
				--tag codebattle/app:compile-stage services/app
	docker build --target runtime-image \
				--cache-from=codebattle/app:compile-stage \
				--cache-from=codebattle/app:latest \
				--file services/app/Dockerfile \
				--tag codebattle/app:latest services/app

docker-push-app:
	docker push codebattle/app:compile-stage
	docker push codebattle/app:latest
