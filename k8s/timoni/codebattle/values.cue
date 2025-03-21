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
	}
}
