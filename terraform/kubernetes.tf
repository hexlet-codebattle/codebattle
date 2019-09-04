resource "digitalocean_kubernetes_cluster" "codebattle" {
  version = "1.15.3-do.1"

  name = "codebattle"
  region = "fra1"

  node_pool {
    name       = "codebattle-node-pool"
    size       = "s-1vcpu-2gb"
    node_count = 1
  }
}
