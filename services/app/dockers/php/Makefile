test:
	php ./check/checker.php

test-example:
	php ./checker_example.php

docker_build_image:
	docker build -t codebattle/php --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/php make lint-example
lint:
	/tmp/phpcs.phar ./check/solution.php

lint-example:
	/tmp/phpcs.phar ./solution_example.php

.PHONY: test
