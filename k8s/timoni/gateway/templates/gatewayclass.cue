package templates

import (
	gatewayv1 "gateway.networking.k8s.io/gatewayclass/v1"
)

#GatewayClass: gatewayv1.#GatewayClass & {
	#config:    #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "GatewayClass"
	metadata:   #config.metadata
	spec: controllerName: "gateway.envoyproxy.io/gatewayclass-controller"
}
