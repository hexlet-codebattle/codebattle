#RunnerConfig: {
	image:    string
	version:  string
	lang:     string
	replicas: uint
}

runners: [string]: #RunnerConfig
codebattleValues: {}

bundle: {
	apiVersion: "v1alpha1"
	name:       "codebattle"
	instances: {
		codebattle: {
			module: url: "file://codebattle"
			namespace: "codebattle"
			values:    codebattleValues
		}
		for runner in runners {
			"runner-\(runner.lang)": {
				module: url: "file://runner"
				namespace: "codebattle"
				values: {
					registry: "docker.io"
					image: {
						repository: "\(registry)/\(runner.image)"
						tag:        runner.version
					}
					replicas: runner.replicas
				}
			}
		}
		gateway: {
			module: url: "file://gateway"
			namespace: "codebattle"
		}
	}
}
