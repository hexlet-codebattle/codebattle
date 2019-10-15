ansible-deps-install:
	ansible-galaxy install -r requirements.yml

setup-env:
	docker run  -v $(CURDIR):/app -w /app williamyeh/ansible:ubuntu18.04 ansible-playbook ansible/development.yml -i ansible/development -vv

ansible-edit-secrets:
	ansible-vault edit ansible/production/group_vars/all/vault.yml

ansible-vault-edit-production:
	docker run -v $(CURDIR):/app -it -w /app ansible ansible-vault --vault-password-file tmp/ansible-vault-password edit ansible/production/group_vars/all/vault.yml
