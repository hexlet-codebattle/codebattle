runners: {
	"python": {
		image:    "codebattle/python"
		version:  "3.12.2"
		lang:     "python"
		replicas: 8
	}
	"cpp": {
		image:    "codebattle/cpp"
		version:  "20"
		lang:     "cpp"
		replicas: 6
	}
	"csharp": {
		image:    "codebattle/csharp"
		version:  "8.0.201"
		lang:     "csharp"
		replicas: 2
	}
	"java": {
		image:    "codebattle/java"
		version:  "21"
		lang:     "java"
		replicas: 2
	}
	"golang": {
		image:    "codebattle/golang"
		version:  "1.22.1"
		lang:     "golang"
		replicas: 2
	}
	"kotlin": {
		image:    "codebattle/kotlin"
		version:  "1.9.23"
		lang:     "kotlin"
		replicas: 1
	}
}
