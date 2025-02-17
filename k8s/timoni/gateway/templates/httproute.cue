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
			name:        metadata.name
			sectionName: "http"
		}]
		rules: [{
			filters: [{
				type: "RequestRedirect"
				requestRedirect: scheme: "https"
			}]
		}]
	}
}
