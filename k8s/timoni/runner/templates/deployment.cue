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
				topologySpreadConstraints: [{
					maxSkew:           3
					topologyKey:       "kubernetes.io/hostname"
					whenUnsatisfiable: "ScheduleAnyway"
					labelSelector: matchLabels: app: #config.metadata.name
				}]
				affinity: podAntiAffinity: requiredDuringSchedulingIgnoredDuringExecution: [{
					labelSelector: matchLabels: app: "codebattle"
					topologyKey: "kubernetes.io/hostname"
				}]
				containers: [{
					name:            "runner"
					image:           #config.image.reference
					imagePullPolicy: #config.image.pullPolicy
					command: ["/runner/codebattle_runner"]
					ports: [{
						name:          "http"
						containerPort: 8000
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
					resources: #config.resources
				}]
			}
		}
	}
}
