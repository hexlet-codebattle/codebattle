package templates

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
)

#Deployment: appsv1.#Deployment & {
	#config:    #Config
	apiVersion: "apps/v1"
	kind:       "Deployment"
	metadata:   #config.metadata
	spec: appsv1.#DeploymentSpec & {
		replicas: #config.replicas
		selector: matchLabels: #config.selector.labels
		template: {
			metadata: labels: #config.selector.labels
			spec: corev1.#PodSpec & {
				containers: [{
					name:            "codebattle"
					image:           #config.image.codebattle.reference
					imagePullPolicy: #config.image.codebattle.pullPolicy
					ports: [{
						name:          "codebattle"
						containerPort: #config.service.port
						protocol:      "TCP"
					}]
					readinessProbe: {
						httpGet: {
							path: "/health"
							port: "codebattle"
						}
						initialDelaySeconds: 5
						periodSeconds:       5
						successThreshold:    1
					}
					command: ["make", "start"]
					envFrom: [{
						secretRef: name: "\(#config.metadata.name)-secrets"
					}]
					env: [for k, v in #config.env {
						name:  k
						value: "\(v)"
					}, {
						name:  "CODEBATTLE_PORT"
						value: "\(#config.service.port)"
					}, {
						name:  "CODEBATTLE_VERSION"
						value: #config.image.codebattle.tag
					}, {
						name: "KUBERNETES_NAMESPACE"
						valueFrom: fieldRef: fieldPath: "metadata.namespace"
					}, if #config.rustExecutor {
						name:  "CODEBATTLE_EXECUTOR"
						value: "rust"
					}]
				}, {
					name:            "nginx"
					image:           #config.image.nginx.reference
					imagePullPolicy: #config.image.nginx.pullPolicy
					ports: [{
						name:          "http"
						containerPort: 80
						protocol:      "TCP"
					}]
					readinessProbe: {
						httpGet: {
							path: "/health"
							port: "http"
						}
						initialDelaySeconds: 5
						periodSeconds:       5
						successThreshold:    1
					}
					env: [{
						name:  "NGINX_SERVER_ADDRESS"
						value: "127.0.0.1"
					}]
				}]
				if #config.affinity != _|_ {
					affinity: #config.affinity
				}
				if #config.nodeSelector != _|_ {
					nodeSelector: #config.nodeSelector
				}
			}
		}
	}
}
