resource "kubernetes_service_account" "tiller" {
  depends_on = [digitalocean_kubernetes_cluster.codebattle]

  metadata {
    name = "tiller"
    namespace = "kube-system"
  }
}

resource "kubernetes_cluster_role_binding" "tiller-cluster-rule" {
  depends_on = [kubernetes_service_account.tiller]

  metadata {
    name = "tiller-cluster-rule"
  }

  role_ref {
    kind = "ClusterRole"
    name = "cluster-admin"
    api_group = "rbac.authorization.k8s.io"
  }

  subject {
    kind = "ServiceAccount"
    namespace = "kube-system"
    name = "tiller"
    api_group = ""
  }

  provisioner "local-exec" {
    command = "helm init --service-account tiller"
  }
}
