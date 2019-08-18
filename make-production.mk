U := deploy

production-setup:
	ansible-playbook ansible/site.yml -i ansible/production -u $U --ask-sudo-pass

production-env-update:
	ansible-playbook ansible/deploy.yml -i ansible/production -u $U --tag env

production-deploy:
	ansible-playbook ansible/deploy.yml -i ansible/production -u $U

production-build-and-push:
	docker build -t codebattle/app --file services/app/Dockerfile.prod services/app/
	docker push codebattle/app

production-pull-dockers:
	ansible-playbook ansible/pull_dockers.yml -i ansible/production -u $U -vv

production-upload-asserts:
	ansible-playbook ansible/upload_asserts.yml -i ansible/production -u $U -vv
