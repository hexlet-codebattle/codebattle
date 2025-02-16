package templates

import (
	networkingv1 "k8s.io/api/networking/v1"
)

#Ingress: networkingv1.#Ingress & {
	#config:    #Config
	apiVersion: "networking.k8s.io/v1"
	kind:       "Ingress"
	metadata:   #config.metadata
	spec: networkingv1.#IngressSpec & {
		ingressClassName: #config.ingress.class
		tls:              #config.ingress.tls
		rules: [{
			host: #config.ingress.host
			http: paths: [{
				path:     "/assets"
				pathType: "Prefix"
				backend: service: {
					name: #config.metadata.name
					port: name: "nginx"
				}
			}, {
				path:     "/"
				pathType: "Prefix"
				backend: service: {
					name: #config.metadata.name
					port: name: "codebattle"
				}
			}]
		}]
	}
}
