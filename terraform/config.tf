terraform {
  required_version = ">=1.0.0"

  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }

  backend "gcs" {
    bucket  = "new-codebattle-terraform-state"
    prefix  = "production"
    credentials = "~/.config/gcloud/terraform-hexlet.json"
  }
}

provider "digitalocean" {}

# NOTE При создании нового кластера данных в data.digitalocean_kubernetes_cluster.hexlet_basics_cluster_data еще не будет
provider "kubernetes" {
  host  = data.digitalocean_kubernetes_cluster.codebattle_cluster_data.endpoint
  token = data.digitalocean_kubernetes_cluster.codebattle_cluster_data.kube_config[0].token
  cluster_ca_certificate = base64decode(
    data.digitalocean_kubernetes_cluster.codebattle_cluster_data.kube_config[0].cluster_ca_certificate
  )

  # config_path = "../.kube/config"
}
