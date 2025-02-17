bundle: {
	apiVersion: "v1alpha1"
	name:       "codebattle"
	instances: {
		"cert-manager": {
			module: url: "oci://ghcr.io/stefanprodan/modules/flux-helm-release"
			namespace: "flux-system"
			values: {
				repository: url: "https://charts.jetstack.io"
				chart: {
					name:    "cert-manager"
					version: "v1.17.0"
				}
				sync: targetNamespace: "codebattle"
				helmValues: {
					crds: enabled: true
					config: {
						apiVersion:       "controller.config.cert-manager.io/v1alpha1"
						kind:             "ControllerConfiguration"
						enableGatewayAPI: true
					}
				}
			}
		}
		"gateway": {
			module: url: "oci://ghcr.io/stefanprodan/modules/flux-helm-release"
			namespace: "flux-system"
			values: {
				repository: url: "oci://registry-1.docker.io/envoyproxy"
				chart: {
					name:    "gateway-helm"
					version: "v1.3.0"
				}
				sync: targetNamespace: "codebattle"
			}
		}
		"codebattle": {
			module: url: "file://timoni/kustomize-oci"
			namespace: "flux-system"
			values: {
				artifact: {
					url: "oci://ghcr.io/hexlet-codebattle/codebattle-manifests"
					tag: "master" @timoni(runtime:string:CODEBATTLE_PKG_TAG)
				}
				auth: credentials: {
					username: string @timoni(runtime:string:GITHUB_USERNAME)
					password: string @timoni(runtime:string:GITHUB_TOKEN)
				}
				_hostname: string @timoni(runtime:string:CODEBATTLE_HOSTNAME)
				patches: [{
					patch: [{
						op:    "add"
						path:  "/spec/listeners/0/hostname"
						value: _hostname
					}, {
						op:    "add"
						path:  "/spec/listeners/1/hostname"
						value: _hostname
					}]
					target: {
						group:     "gateway.networking.k8s.io"
						kind:      "Gateway"
						name:      "gateway"
						namespace: "codebattle"
					}
				}]
			}
		}
	}
}
