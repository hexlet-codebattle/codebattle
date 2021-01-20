test:
	babel --out-dir ./check/dist ./check/ && node ./check/dist/${checker_name}.js

test-example:
	babel --out-dir dist ./ && node ./dist/checker_example.js

.PHONY: test
