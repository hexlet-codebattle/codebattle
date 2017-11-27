run:
	docker run --read-only  -v `pwd`:/usr/src/app codebattle/js make test

test:
	cat data.jsons | sudo -E -u nobody NODE_PATH=/usr/local/lib/node_modules/ babel checker.js

.PHONY: test
