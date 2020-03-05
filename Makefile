include make-compose.mk

pg:
	docker-compose up -d db-local

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
	docker run -it -v $(CURDIR):/app -w /app williamyeh/ansible:ubuntu18.04 ansible-playbook ansible/terraform.yml -i ansible/production -vv --vault-password-file=tmp/ansible-vault-password

setup-env:
	docker run  -v $(CURDIR):/app -w /app williamyeh/ansible:ubuntu18.04 ansible-playbook ansible/development.yml -i ansible/development -vv

ansible-edit-secrets:
	ansible-vault edit --vault-password-file tmp/ansible-vault-password ansible/production/group_vars/all/vault.yml

ansible-vault-edit-production:
	docker run -v $(CURDIR):/app -it -w /app williamyeh/ansible:ubuntu18.04 ansible-vault edit --vault-password-file tmp/ansible-vault-password ansible/production/group_vars/all/vault.yml
