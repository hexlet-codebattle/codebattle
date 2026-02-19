DOTNET_FLAGS = --nologo -p:BaseIntermediateOutputPath=obj/ -p:BaseOutputPath=bin/

test-runtime:
	dotnet run $(DOTNET_FLAGS)

test-compile:
	dotnet build $(DOTNET_FLAGS)

test: test-runtime
# test: test-compile test-runtime

.PHONY: test
