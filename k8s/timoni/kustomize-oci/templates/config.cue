package templates

import (
	timoniv1 "timoni.sh/core/v1alpha1"
)

#Config: {
	moduleVersion!: string
	kubeVersion!:   string

	metadata: timoniv1.#Metadata & {#Version: moduleVersion}

	artifact: {
		url!:     string & =~"^oci://.*$"
		tag:      *"latest" | string
		semver?:  string
		interval: *1 | int
		ignore:   *"" | string
	}

	auth: {
		provider: *"generic" | "aws" | "azure" | "gcp"
		credentials?: {
			username!: string
			password!: string
		}
	}

	tls: {
		insecure: *false | bool
		ca?:      string
	}

	sync: {
		path:          *"./" | string
		prune:         *true | bool
		wait:          *true | bool
		timeout:       *3 | int
		retryInterval: *5 | int

		serviceAccountName?: string
		targetNamespace?:    string
	}

	substitute?: [string]: string

	dependsOn?: [...{
		name:       string
		namespace?: string
	}]

	patches: [...{...}]
}

#Instance: {
	config: #Config

	objects: {
		ocirepository: #OCIRepository & {#config: config}
		kustomization: #Kustomization & {#config: config}
	}

	if config.auth.credentials != _|_ {
		objects: imagepullsecret: #PullSecret & {#config: config}
	}

	if config.tls.ca != _|_ {
		objects: tlssecret: #TLSSecret & {#config: config}
	}
}
