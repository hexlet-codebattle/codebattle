package templates

import (
	sourcev1 "source.toolkit.fluxcd.io/ocirepository/v1beta2"
)

#OCIRepository: sourcev1.#OCIRepository & {
	#config:  #Config
	metadata: #config.metadata
	spec: sourcev1.#OCIRepositorySpec & {
		interval: "\(#config.artifact.interval)m"
		url:      #config.artifact.url
		if #config.artifact.semver != _|_ {
			ref: semver: #config.artifact.semver
		}
		if #config.artifact.semver == _|_ {
			ref: tag: #config.artifact.tag
		}
		provider: #config.auth.provider
		if #config.auth.credentials != _|_ {
			secretRef: name: #config.metadata.name + "-oci-auth"
		}
		if #config.artifact.ignore != "" {
			ignore: #config.artifact.ignore
		}
		if #config.tls.insecure {
			insecure: #config.tls.insecure
		}
		if #config.tls.ca != _|_ {
			certSecretRef: name: #config.metadata.name + "-oci-tls"
		}
	}
}
