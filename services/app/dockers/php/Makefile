test:
	php ./check/checker.php

test-example:
	php ./checker_example.php

lint_example:
	echo "lint_example"

docker_build_image:
	docker build -t codebattle/php --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/php make lint_example

.PHONY: test
