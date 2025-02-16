package templates

import (
	gatewayv1 "gateway.networking.k8s.io/gateway/v1"
)

#Gateway: gatewayv1.#Gateway & {
	#config:    #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "Gateway"
	metadata:   #config.metadata
	spec: {
		gatewayClassName: metadata.name
		listeners: [{
			name:     "tls"
			port:     443
			protocol: "HTTPS"
			tls: {
				mode: "Terminate"
				certificateRefs: [{
					group: ""
					kind:  "Secret"
					name:  metadata.name
				}]
			}
		}]
	}
}
