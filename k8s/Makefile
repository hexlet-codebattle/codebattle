PWD:=$(shell pwd)

kb-%: export KUBECONFIG=$(PWD)/../.kube/config
helm-%: export KUBECONFIG=$(PWD)/../.kube/config
kb-app-%: POD_NAME = $(shell kubectl get pod -l "app.kubernetes.io/instance=app" -o name --kubeconfig=$(KUBECONFIG))

kb-get-pods:
	kubectl get pod -w -o wide

kb-get-nodes:
	kubectl get nodes

kb-get-services:
	kubectl get services

helm-init: helm-install-app

helm-upgrade-app:
	helm upgrade --install app $(PWD)/app-chart

helm-rollback-app:
	helm rollback app 108

helm-ls:
	helm ls

helm-history:
	helm history app

kb-app-tailf:
	kubectl logs -f $(POD_NAME) --tail=2000 -c app

kb-app-console:
	kubectl exec -it $(POD_NAME) -c app  -- bash

kb-k9s:
	k9s

kb-kubetail:
	kubetail codebattle-deployment

helm-install-ingress:
	helm upgrade --install ingress-nginx ingress-nginx --repo https://kubernetes.github.io/ingress-nginx
