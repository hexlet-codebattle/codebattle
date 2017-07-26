prepare:
	sudo apt update
	sudo apt install ansible

env:
	ansible-playbook -vv -i ansible/development ansible/development.yml --limit=local  --become
