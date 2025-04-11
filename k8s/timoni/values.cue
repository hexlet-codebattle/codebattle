codebattleValues: {
	image: codebattle: pullPolicy: "Always"
	image: nginx: pullPolicy:      "Always"
	gateway: {
		enable:      true
		gatewayName: "gateway"
	}
	certManager: {
		enable:         true
		useLetsencrypt: false
		useCA:          true
	}
	rustExecutor: true
}
