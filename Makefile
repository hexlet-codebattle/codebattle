include make-compose.mk
include make-ansible.mk
include make-production.mk

clean:
	rm -rf services/app/_build
	rm -rf services/app/deps
	rm -rf services/app/.elixir_ls
	rm -rf services/app/priv/static/*
	rm -rf node_modules
	rm -rf tmp/battle_asserts

.PHONY: test

terraform-vars-generate:
	docker run -it -v $(CURDIR):/app -w /app williamyeh/ansible:ubuntu18.04 ansible-playbook ansible/terraform.yml -i ansible/production -vv --vault-password-file=tmp/ansible-vault-password
