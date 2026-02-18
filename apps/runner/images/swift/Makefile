SWIFTC := swiftc
CHECK  := ./check
BIN    := $(CHECK)/checker

test-runtime:
	$(SWIFTC) $(CHECK)/solution.swift $(CHECK)/checker.swift -o $(BIN)
	$(BIN)

# Uncomment if you have swift-format installed in the container
# format:
# 	swift-format -i $(CHECK)/*.swift

test: test-runtime
.PHONY: test test-runtime