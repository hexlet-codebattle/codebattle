package templates

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	timoniv1 "timoni.sh/core/v1alpha1"
)

#Config: {
	kubeVersion!:   string
	moduleVersion!: string

	metadata: timoniv1.#Metadata & {#Version: moduleVersion}
	metadata: labels:       timoniv1.#Labels
	metadata: annotations?: timoniv1.#Annotations

	selector: timoniv1.#Selector & {
		#Name: metadata.name
		labels: app: "codebattle"
	}

	registry: string
	image!: {
		codebattle: timoniv1.#Image
		nginx:      timoniv1.#Image
	}

	resources: timoniv1.#ResourceRequirements & {
		requests: {
			cpu:    *"10m" | timoniv1.#CPUQuantity
			memory: *"32Mi" | timoniv1.#MemoryQuantity
		}
	}

	replicas: *1 | int & >0

	securityContext: corev1.#SecurityContext & {
		allowPrivilegeEscalation: *false | true
		privileged:               *false | true
		capabilities:
		{
			drop: *["ALL"] | [string]
			add: *["CHOWN", "NET_BIND_SERVICE", "SETGID", "SETUID"] | [string]
		}
	}

	service: {
		annotations?: timoniv1.#Annotations
		port:         *4000 | int & >0 & <=65535
		type:         corev1.#ServiceType
	}

	env: [string]: string | int | bool

	podSecurityContext?: corev1.#PodSecurityContext
	imagePullSecrets?: [...timoniv1.#ObjectReference]
	tolerations?: [...corev1.#Toleration]
	affinity?: corev1.#Affinity
	topologySpreadConstraints?: [...corev1.#TopologySpreadConstraint]
	nodeSelector?: [string]: string

	ingress: {
		enable: *false | bool
		class?: string
		tls: [...networkingv1.#IngressTLS]
		host?: string
	}

	gateway: {
		enable:      certManager.enable & (*false | bool)
		gatewayName: string
		host:        *"codebattle.hexlet.io" | string
	}

	certManager: enable: *false | bool

	rustExecutor: *false | bool
}

// Instance takes the config values and outputs the Kubernetes objects.
#Instance: {
	config: #Config

	objects: {
		deploy: #Deployment & {#config: config}
		svc: #Service & {#config: config}
		if config.ingress.enable {
			ingress: #Ingress & {#config: config}
		}
		if config.gateway.enable {
			gateway: #HTTPRoute & {#config: config}
		}
		if config.certManager.enable {
			issuer: #Issuer & {#config: config}
		}
	}
}
