test:
	babel --out-dir ./check/dist ./check/ && node ./check/dist/checker.js

test_example:
	babel --out-dir dist ./ && node ./dist/checker_example.js

lint_example:
	echo "lint_example"

docker_build_image:
	docker build -t codebattle/js --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/js make lint_example

.PHONY: test
