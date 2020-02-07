test:
	cat check/data.jsons | perl checker.pl

lint_example:
	echo "lint_example"

docker_build_image:
	docker build -t codebattle/perl --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/perl make lint_example

.PHONY: test
