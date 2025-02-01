package templates

import (
	corev1 "k8s.io/api/core/v1"
	timoniv1 "timoni.sh/core/v1alpha1"
)

#TLSSecret: corev1.#Secret & {
	#config:    #Config
	apiVersion: "v1"
	kind:       "Secret"
	metadata: timoniv1.#MetaComponent & {
		#Meta:      #config.metadata
		#Component: "oci-tls"
	}
	stringData: {
		if #config.tls.ca != _|_ {
			"ca.crt": #config.tls.ca
		}
	}
}
