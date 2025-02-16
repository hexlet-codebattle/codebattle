bundle: {
	apiVersion: "v1alpha1"
	name:       "codebattle"
	instances: {
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
				patches: [{
					apiVersion: "gateway.networking.k8s.io/v1"
					kind:       "HTTPRoute"
					metadata: {
						name:      "codebattle"
						namespace: "codebattle"
					}
					spec: {
						_hostname: string @timoni(runtime:string:CODEBATTLE_HOSTNAME)
						hostnames: [_hostname]
					}
				}]
			}
		}
	}
}
