test:
	cabal new-run Magic -v0 && cabal new-run Checker -v0

lint:
	~/.cabal/bin/hlint ./Check/Solution.hs

docker_build_image:
	docker build -t codebattle/haskell --file ./Dockerfile ./

.PHONY: test
