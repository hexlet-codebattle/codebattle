package templates

import (
	"strings"

	timoniv1 "timoni.sh/core/v1alpha1"
)

#PullSecret: timoniv1.#ImagePullSecret & {
	#config:   #Config
	#Meta:     #config.metadata
	#Suffix:   "-oci-auth"
	#Registry: strings.Split(#config.artifact.url, "/")[2]
	#Username: #config.auth.credentials.username
	#Password: #config.auth.credentials.password
}
