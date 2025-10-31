DOTNET_FLAGS = --nologo -p:BaseIntermediateOutputPath=/tmp/obj/ -p:BaseOutputPath=/tmp/bin/

test-runtime:
	dotnet run $(DOTNET_FLAGS)

test-compile:
	dotnet build $(DOTNET_FLAGS)

test: test-runtime
# test: test-compile test-runtime

.PHONY: test
