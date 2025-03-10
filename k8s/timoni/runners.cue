runners: {
	"clojure": {
		image:    "codebattle/runner-clojure"
		version:  "1.3.190"
		lang:     "clojure"
		replicas: 1
	}
	"cpp": {
		image:    "codebattle/runner-cpp"
		version:  "20"
		lang:     "cpp"
		replicas: 1
	}
	"csharp": {
		image:    "codebattle/runner-csharp"
		version:  "8.0.201"
		lang:     "csharp"
		replicas: 1
	}
	"dart": {
		image: "codebattle/runner-dart"

		version:  "latest"
		lang:     "dart"
		replicas: 1
	}
	"elixir": {
		image:    "codebattle/runner-elixir"
		version:  "1.18.2"
		lang:     "elixir"
		replicas: 1
	}
	"golang": {
		image:    "codebattle/runner-golang"
		version:  "1.22.1"
		lang:     "golang"
		replicas: 1
	}
	"haskell": {
		image:    "codebattle/runner-haskell"
		version:  "latest"
		lang:     "haskell"
		replicas: 1
	}
	"java": {
		image:    "codebattle/runner-java"
		version:  "21"
		lang:     "java"
		replicas: 1
	}
	"js": {
		image:    "codebattle/runner-js"
		version:  "20.11.1"
		lang:     "js"
		replicas: 1
	}
	"kotlin": {
		image:    "codebattle/runner-kotlin"
		version:  "1.9.23"
		lang:     "kotlin"
		replicas: 1
	}
	"php": {
		image:    "codebattle/runner-php"
		version:  "8.3.3"
		lang:     "php"
		replicas: 1
	}
	"python": {
		image:    "codebattle/runner-python"
		version:  "3.12.2"
		lang:     "python"
		replicas: 1
	}
	"ruby": {
		image:    "codebattle/runner-ruby"
		version:  "3.3.0"
		lang:     "ruby"
		replicas: 1
	}
	"rust": {
		image:    "codebattle/runner-rust"
		version:  "1.85"
		lang:     "rust"
		replicas: 1
	}
}
