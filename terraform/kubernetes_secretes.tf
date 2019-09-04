resource "kubernetes_secret" "codebattle_environment_secrets" {
  depends_on = ["digitalocean_kubernetes_cluster.codebattle"]

  metadata {
    name = "codebattle-environment-secrets"
  }

  data = "${var.environment_file}"
}
