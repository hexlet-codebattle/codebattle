package templates

import (
	issuerv1 "cert-manager.io/issuer/v1"
)

#Issuer: issuerv1.#Issuer & {
	#config:    #Config
	apiVersion: "cert-manager.io/v1"
	kind:       "Issuer"
	metadata:   #config.metadata
	spec: {
		acme: {
			server: "https://acme-v02.api.letsencrypt.org/directory"
			privateKeySecretRef: name: "\(metadata.name)-letsencrypt"
			solvers: [{
				http01: gatewayHTTPRoute: {
					parentRefs: [{
						name: #config.gateway.gatewayName
					}]
				}
			}]
		}
	}
}
