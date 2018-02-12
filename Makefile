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
