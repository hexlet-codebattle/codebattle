run:
	docker run --read-only  -v `pwd`:/usr/src/app codebattle/ruby make test

test:
	cat data.jsons | sudo -E -u nobody ruby checker.rb

.PHONY: test
