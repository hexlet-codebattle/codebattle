package templates

import (
	corev1 "k8s.io/api/core/v1"
	timoniv1 "timoni.sh/core/v1alpha1"
)

#Config: {
	kubeVersion!:   string
	moduleVersion!: string

	metadata: timoniv1.#Metadata & {#Version: moduleVersion}
	metadata: labels:       timoniv1.#Labels
	metadata: annotations?: timoniv1.#Annotations

	selector: timoniv1.#Selector & {#Name: metadata.name}

	registry: string
	image!: timoniv1.#Image & {digest: ""}

	replicas: *0 | int & >0

	resources: timoniv1.#ResourceRequirements & {
		requests: {
			cpu:    *"150m" | timoniv1.#CPUQuantity
			memory: *"128Mi" | timoniv1.#MemoryQuantity
		}
		limits: {
			cpu:    *"1000m" | timoniv1.#CPUQuantity
			memory: *"2Gi" | timoniv1.#MemoryQuantity
		}
	}

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
		port:         *8000 | int & >0 & <=65535
	}

	podSecurityContext?: corev1.#PodSecurityContext
	imagePullSecrets?: [...timoniv1.#ObjectReference]
	tolerations?: [...corev1.#Toleration]
}

#Instance: {
	config: #Config

	objects: {
		svc: #Service & {#config: config}
		deploy: #Deployment & {#config: config}
	}
}
