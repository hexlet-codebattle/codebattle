data "digitalocean_kubernetes_cluster" "codebattle_cluster_data" {
  name = var.cluster_name

  depends_on = [
    digitalocean_kubernetes_cluster.codebattle_cluster
  ]
}

data "digitalocean_database_cluster" "postgres_db_data" {
  name = var.postgres_db_cluster_name

  depends_on = [
    digitalocean_database_cluster.postgres_db_cluster
  ]
}
