test:
	cabal new-run Magic -v0 && cabal new-run Checker -v0

lint_example:
	echo "lint_example"

docker_build_image:
	docker build -t codebattle/haskell --file ./Dockerfile ./

docker_run_lint_example:
	docker run --rm codebattle/haskell make lint_example

.PHONY: test
