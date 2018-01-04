run:
	docker run --read-only --rm -v `pwd`:/usr/src/app codebattle/ruby timeout -t 3 make test

test:
	cat data.jsons | ruby checker.rb

.PHONY: test
