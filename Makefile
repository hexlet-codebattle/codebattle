include make-compose.mk
include make-ansible.mk

rebuild-styles:
	cd assets/ && \
	yarn install && \
	yarn deploy && \
	cd ../

development-build-local:
	ansible-playbook -vv --ask-sudo-pass -i ansible/development ansible/development.yml --limit=local  --become

compile:
	mix compile

create-env:
	cp -n .env.example .env || :

install:
	mix deps.get

test:
	mix test

test-coverage-html:
	mix coveralls.html

lint:
	mix credo

clean:
	rm -rf _build
	rm -rf deps
	rm -rf .elixir_ls
	rm -rf assets/node_modules
	rm -rf priv/static/*
	rm -rf cover
	rm -rf tmp/battle_asserts

get-last-changes:
	 git fetch upstream
	 git checkout master
	 git merge upstream/master

upload_asserts:
	 mix issues.fetch
	 mix issues.generate
	 mix issues.upload

release:
	MIX_ENV=prod mix edeliver upgrade production --verbose --env=prod

.PHONY: test
