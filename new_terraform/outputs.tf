output "cluster_name" {
  value = resource.digitalocean_kubernetes_cluster.codebattle_cluster.name
}

output "kubeconfig_path" {
  value = var.write_kubeconfig ? abspath("${path.root}/${var.rel_path_to_kubeconfig}") : "none"
}

output "postgres_db_host" {
  value = data.digitalocean_database_cluster.postgres_db_data.host
}
