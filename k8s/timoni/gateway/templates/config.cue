package templates

import (
	timoniv1 "timoni.sh/core/v1alpha1"
)

#Config: {
	kubeVersion!:   string
	moduleVersion!: string

	metadata: timoniv1.#Metadata & {#Version: moduleVersion}
	metadata: labels:       timoniv1.#Labels
	metadata: annotations?: timoniv1.#Annotations

	selector: timoniv1.#Selector & {#Name: metadata.name}
}

#Instance: {
	config: #Config

	objects: {
		gatewayclass: #GatewayClass & {#config: config}
		gateway: #Gateway & {#config: config}
	}
}
