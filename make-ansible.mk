U := ubuntu

ansible-deps-install:
	ansible-galaxy install -r requirements.yml

ansible-development-setup:
	mkdir -p tmp
	echo 'asdf' > tmp/ansible-vault-password
	ansible-playbook ansible/development.yml -i ansible/development -vv

ansible-development-update-env:
	ansible-playbook ansible/development.yml -i ansible/development -vv --tag env

ansible-vaults-encrypt:
	ansible-vault encrypt ansible/production/group_vars/all/vault.yml

ansible-vaults-decrypt:
	ansible-vault decrypt ansible/production/group_vars/all/vault.yml
