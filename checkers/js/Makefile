run:
	docker run --read-only --rm -v `pwd`:/usr/src/app codebattle/js timeout -t 3 make test

test:
	cat data.jsons | NODE_PATH=/usr/local/lib/node_modules/  BABEL_DISABLE_CACHE=1 babel-node checker.js --presets node6-es6

.PHONY: test
