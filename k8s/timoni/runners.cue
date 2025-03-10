runners: {
	"clojure": {
		image:    "runner-clojure"
		version:  "1.3.190"
		lang:     "clojure"
		replicas: 1
	}
	"cpp": {
		image:    "runner-cpp"
		version:  "20"
		lang:     "cpp"
		replicas: 1
	}
	"csharp": {
		image:    "runner-csharp"
		version:  "8.0.201"
		lang:     "csharp"
		replicas: 1
	}
	"dart": {
		image: "runner-dart"

		version:  "latest"
		lang:     "dart"
		replicas: 1
	}
	"elixir": {
		image:    "runner-elixir"
		version:  "1.18.2"
		lang:     "elixir"
		replicas: 1
	}
	"golang": {
		image:    "runner-golang"
		version:  "1.22.1"
		lang:     "golang"
		replicas: 1
	}
	"haskell": {
		image:    "runner-haskell"
		version:  "latest"
		lang:     "haskell"
		replicas: 1
	}
	"java": {
		image:    "runner-java"
		version:  "21"
		lang:     "java"
		replicas: 1
	}
	"js": {
		image:    "runner-js"
		version:  "20.11.1"
		lang:     "js"
		replicas: 1
	}
	"kotlin": {
		image:    "runner-kotlin"
		version:  "1.9.23"
		lang:     "kotlin"
		replicas: 1
	}
	"php": {
		image:    "runner-php"
		version:  "8.3.3"
		lang:     "php"
		replicas: 1
	}
	"python": {
		image:    "runner-python"
		version:  "3.12.2"
		lang:     "python"
		replicas: 1
	}
	"ruby": {
		image:    "runner-ruby"
		version:  "3.3.0"
		lang:     "ruby"
		replicas: 1
	}
	"rust": {
		image:    "runner-rust"
		version:  "1.85"
		lang:     "rust"
		replicas: 1
	}
}
