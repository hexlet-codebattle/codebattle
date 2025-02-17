package templates

import (
	gatewayv1 "gateway.networking.k8s.io/httproute/v1"
)

#HTTPRoute: gatewayv1.#HTTPRoute & {
	#config:    #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "HTTPRoute"
	metadata:   #config.metadata
	spec: {
		parentRefs: [{
			name:        #config.gateway.gatewayName
			sectionName: "https"
		}]
		rules: [{
			matches: [{
				path: {
					type:  "PathPrefix"
					value: "/"
				}
			}]
			backendRefs: [{
				name: metadata.name
				port: #config.service.port
			}]
		}, {
			matches: [{
				path: {
					type:  "PathPrefix"
					value: "/assets"
				}
			}]
			backendRefs: [{
				name: metadata.name
				port: 80
			}]
		}]
	}
}
