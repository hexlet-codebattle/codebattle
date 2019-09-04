CURRENT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

get-pods:
	kubectl --kubeconfig="kubeconfig.yml" get pod -w -o wide

get-nodes:
	kubectl --kubeconfig="kubeconfig.yml" get nodes

helm-init:
	 helm install --kubeconfig="kubeconfig.yml" --name app $(CURRENT_DIR)/app-chart

helm-upgrade-app:
	helm upgrade --kubeconfig="kubeconfig.yml" app $(CURRENT_DIR)/app-chart

helm-install-ingress:
	helm install stable/nginx-ingress --name ingress --set rbac.create=true
