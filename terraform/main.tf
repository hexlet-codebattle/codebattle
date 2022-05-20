data "digitalocean_kubernetes_versions" "last_minor_version" {
  version_prefix = "1.21."
}

# --------------------------------------
# PRIMARY CLUSTER
# --------------------------------------

# TODO Добавить мониторы https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs/resources/monitor_alert
resource "digitalocean_kubernetes_cluster" "codebattle_cluster" {
  name   = var.cluster_name
  region = var.cluster_region

  auto_upgrade = true
  version      = data.digitalocean_kubernetes_versions.last_minor_version.latest_version

  maintenance_policy {
    start_time = "02:00"
    day        = "wednesday"
  }

  node_pool {
    name       = var.cluster_node_name
    size       = var.cluster_node_size
    node_count = 1
    # auto_scale = true
    # min_nodes  = 1
    # max_nodes  = 1
  }

  lifecycle {
    prevent_destroy = true
  }
}

locals {
  path_to_kubeconfig = "${path.root}/${var.rel_path_to_kubeconfig}"
}

resource "local_file" "kubeconfig" {
  depends_on = [
    resource.digitalocean_kubernetes_cluster.codebattle_cluster
  ]

  count           = var.write_kubeconfig ? 1 : 0
  content         = resource.digitalocean_kubernetes_cluster.codebattle_cluster.kube_config[0].raw_config
  filename        = local.path_to_kubeconfig
  file_permission = "0711"
}

# --------------------------------------
# DATABASES
# --------------------------------------

# K8s Postges Databases
resource "digitalocean_database_cluster" "postgres_db_cluster" {
  name       = var.postgres_db_cluster_name
  engine     = "pg"
  version    = var.postgres_version
  size       = var.postgres_db_node_size
  region     = var.cluster_region
  node_count = 1

  lifecycle {
    prevent_destroy = true
  }
}

resource "digitalocean_database_firewall" "postgres_db_firewall" {
  cluster_id = digitalocean_database_cluster.postgres_db_cluster.id

  rule {
    type  = "k8s"
    value = digitalocean_kubernetes_cluster.codebattle_cluster.id
  }
}

resource "digitalocean_database_db" "postgres_db" {
  cluster_id = digitalocean_database_cluster.postgres_db_cluster.id
  name       = var.codebattle_db_name
}

# --------------------------------------
# PROJECT
# --------------------------------------

resource "digitalocean_project" "codebattle_project" {
  name        = "Codebattle"
  description = "A project to represent Codebattle resources."
  purpose     = "Web Application"
  environment = "Production"
  resources = [
    digitalocean_kubernetes_cluster.codebattle_cluster.urn,
    digitalocean_database_cluster.postgres_db_cluster.urn,
  ]
}
