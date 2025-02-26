runners: {
	"python": {
		image:    "codebattle/python"
		version:  "3.12.2"
		lang:     "python"
		replicas: 16
	}
	"cpp": {
		image:    "codebattle/cpp"
		version:  "20"
		lang:     "cpp"
		replicas: 16
	}
	"csharp": {
		image:    "codebattle/csharp"
		version:  "8.0.201"
		lang:     "csharp"
		replicas: 10
	}
	"java": {
		image:    "codebattle/java"
		version:  "21"
		lang:     "java"
		replicas: 10
	}
	"golang": {
		image:    "codebattle/golang"
		version:  "1.22.1"
		lang:     "golang"
		replicas: 8
	}
	"kotlin": {
		image:    "codebattle/kotlin"
		version:  "1.9.23"
		lang:     "kotlin"
		replicas: 4
	}
}
