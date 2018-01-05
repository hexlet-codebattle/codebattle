U := ubuntu

ansible-deps-install:
	ansible-galaxy install -r requirements.yml

ansible-development-setup:
	mkdir -p tmp
	touch tmp/ansible-vault-password
	ansible-playbook ansible/development.yml -i ansible/development -vv -K
