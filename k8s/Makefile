PWD:=$(shell pwd)

kb-%: export KUBECONFIG=$(PWD)/kubeconfig.yml
helm-%: export KUBECONFIG=$(PWD)/kubeconfig.yml
kb-app-%: POD_NAME = $(shell kubectl get pod -l "app.kubernetes.io/instance=app" -o name --kubeconfig=$(KUBECONFIG))

kb-get-pods:
	kubectl get pod -w -o wide

kb-get-nodes:
	kubectl get nodes

helm-init: helm-add-repos  helm-install-ingress helm-install-app helm-install-keel

helm-add-repos:
	helm repo add stable https://kubernetes-charts.storage.googleapis.com
	helm repo add keel https://charts.keel.sh

helm-install-app:
	helm install app $(PWD)/app-chart

helm-upgrade-app:
	helm upgrade app $(PWD)/app-chart

helm-install-ingress:
	helm repo update
	helm install ingress stable/nginx-ingress

helm-install-keel:
	helm repo update
	helm upgrade --install keel --namespace=kube-system keel/keel

kb-app-tailf:
	kubectl logs -f $(POD_NAME) --tail=2000 -c app

kb-app-console:
	kubectl exec -it $(POD_NAME) -c app  -- bash
