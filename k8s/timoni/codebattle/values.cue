package main

values: {
	registry: "docker.io"
	service: {
		port: 4000
		type: "ClusterIP"
	}
	image: {
		codebattle: {
			repository: "\(registry)/codebattle/codebattle"
			tag:        "latest"
			digest:     ""
		}
		nginx: {
			repository: "\(registry)/codebattle/nginx-assets"
			tag:        "latest"
			digest:     ""
		}
	}
	env: {
		"CODEBATTLE_SHOW_EXTENSION_POPUP": true
		"CODEBATTLE_USE_EXTERNAL_JS":      true
		"CODEBATTLE_CREATE_BOT_GAMES":     true
		"CODEBATTLE_IMPORT_GITHUB_TASKS":  true
		"CODEBATTLE_ALLOW_GUESTS":         true
		"CODEBATTLE_USE_PRESENCE":         true
		"CODEBATTLE_RECORD_GAMES":         true
	}
}
