package templates

import (
	gatewayv1 "gateway.networking.k8s.io/gateway/v1"
)

#Gateway: gatewayv1.#Gateway & {
	#config:    #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "Gateway"
	metadata:   #config.metadata
	metadata: annotations: "cert-manager.io/issuer": "codebattle"
	spec: {
		gatewayClassName: metadata.name
		listeners: [{
			name:     "http"
			port:     80
			protocol: "HTTP"
		}, {
			name:     "https"
			port:     443
			protocol: "HTTPS"
			tls: {
				mode: "Terminate"
				certificateRefs: [{
					name: metadata.name
				}]
			}
		}]
	}
}
