PWD:=$(shell pwd)

kb-%: export KUBECONFIG=$(PWD)/kubeconfig.yml
helm-%: export KUBECONFIG=$(PWD)/kubeconfig.yml
kb-app-%: POD_NAME = $(shell kubectl get pod -l "app.kubernetes.io/instance=app" -o name --kubeconfig=$(KUBECONFIG))

kb-get-pods:
	kubectl get pod -w -o wide

kb-get-nodes:
	kubectl get nodes

helm-init: helm-add-repos helm-install-ingress helm-install-app helm-install-keel helm-install-cert-manager

# helm-add-repos:
# 	helm repo add stable https://kubernetes-charts.storage.googleapis.com
# 	helm repo add stable https://kubernetes-charts.storage.googleapis.com
# 	helm repo add keel https://charts.keel.sh
# 	helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

helm-upgrade-app:
	helm upgrade --install app $(PWD)/app-chart

helm-rollback-app:
	helm rollback app 108

helm-ls:
	helm ls
helm-history:
	helm history app

helm-install-cert-manager:
	helm repo add jetstack https://charts.jetstack.io
	helm repo update
	# helm install --kubeconfig=../.kube/config cert-manager jetstack/cert-manager --namespace cert-manager --version v1.7.1 --set installCRDs=true
	helm install \
		cert-manager jetstack/cert-manager \
		--kubeconfig=../.kube/config \
		--namespace cert-manager \
		--create-namespace \
		--version v1.8.0 \
		--set installCRDs=true


helm-install-ingress:
	helm install nginx-ingress ingress-nginx/ingress-nginx

helm-install-keel:
	helm repo update
	helm upgrade --install keel --namespace=kube-system keel/keel --set  helmProvider.version="v3"

kb-app-tailf:
	kubectl logs -f $(POD_NAME) --tail=2000 -c app

kb-app-console:
	kubectl exec -it $(POD_NAME) -c app  -- bash

kb-k9s:
	k9s
