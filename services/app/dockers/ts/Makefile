test:
	tsc --project tsconfig.json && node ./check/checker.ts

test_example:
	tsc --project tsconfig_example.json && node ./checker_example.ts

lint:
	eslint ./check/checker.ts

lint_example:
	eslint ./checker_example.ts

docker_build_image:
	docker build -t codebattle/ts --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/ts make lint_example

.PHONY: test
