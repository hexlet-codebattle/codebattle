run:
	docker run --read-only  -v `pwd`:/usr/src/app codebattle/js make test

test:
	cat data.jsons | sudo -E -u nobody NODE_PATH=/usr/local/lib/node_modules/  BABEL_DISABLE_CACHE=1 babel-node checker.js --presets node6-es6

.PHONY: test
