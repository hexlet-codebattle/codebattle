
ansible-deps-install:
	ansible-galaxy install -r requirements.yml

ansible-development-setup:
	mkdir -p tmp
	echo 'asdf' > tmp/ansible-vault-password
	docker run  -v $(CURDIR):/app -w /app williamyeh/ansible:ubuntu18.04 ansible-playbook ansible/development.yml -i ansible/development -vv

ansible-development-update-env:
	docker run  -v $(CURDIR):/app -w /app williamyeh/ansible:ubuntu18.04 ansible-playbook ansible/development.yml -i ansible/development -vv --tag env

ansible-vaults-encrypt:
	ansible-vault encrypt ansible/production/group_vars/all/vault.yml

ansible-vaults-decrypt:
	ansible-vault decrypt ansible/production/group_vars/all/vault.yml


ansible-vault-edit-production:
	docker run -v $(CURDIR):/app -it -w /app ansible ansible-vault --vault-password-file tmp/ansible-vault-password edit ansible/production/group_vars/all/vault.yml
