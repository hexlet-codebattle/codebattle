include make-compose.mk
include make-ansible.mk

compile:
	mix compile

install:
	mix deps.get

test:
	mix test

test-coverage-html:
	mix coveralls.html

lint:
	mix credo

clean:
	rm -rf services/app/_build
	rm -rf services/app/deps
	rm -rf services/app/.elixir_ls
	rm -rf services/app/priv/static/*
	rm -rf node_modules
	rm -rf tmp/battle_asserts

.PHONY: test
