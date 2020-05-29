PWD:=$(shell pwd)

kb-%: export KUBECONFIG=$(PWD)/kubeconfig.yml
helm-%: export KUBECONFIG=$(PWD)/kubeconfig.yml
kb-app-%: POD_NAME = $(shell kubectl get pod -l "app.kubernetes.io/instance=app" -o name --kubeconfig=$(KUBECONFIG))

kb-get-pods:
	kubectl get pod -w -o wide

kb-get-nodes:
	kubectl get nodes

helm-init: helm-add-repos  helm-install-ingress helm-install-app helm-install-keel helm-install-cert-manager helm-install-ingress

helm-upgrade-nginx-ingress:
	helm upgrade -f $(PWD)/k8s/values-nginx-ingress.yml nginx-ingress nginx-stable/nginx-ingress

helm-add-repos:
	helm repo add stable https://kubernetes-charts.storage.googleapis.com
	helm repo add stable https://kubernetes-charts.storage.googleapis.com
	helm repo add nginx-stable https://helm.nginx.com/stable
	helm repo add keel https://charts.keel.sh

helm-upgrade-app:
	helm upgrade --install app $(PWD)/app-chart

helm-install-cert-manager:
	helm install cert-manager jetstack/cert-manager --namespace cert-manager --version v0.15.0 --set installCRDs=true

helm-install-ingress:
	helm install nginx-ingress nginx-stable/nginx-ingress

helm-install-keel:
	helm repo update
	helm upgrade --install keel --namespace=kube-system keel/keel

kb-app-tailf:
	kubectl logs -f $(POD_NAME) --tail=2000 -c app

kb-app-console:
	kubectl exec -it $(POD_NAME) -c app  -- bash
