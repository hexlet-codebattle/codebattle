resource "digitalocean_kubernetes_cluster" "codebattle" {
  version = "1.16.6-do.0"

  name = "codebattle"
  region = "fra1"

  node_pool {
    name       = "codebattle-node-pool"
    size       = "s-1vcpu-2gb"
    node_count = 1
  }
}


resource "digitalocean_kubernetes_cluster" "codebattle-2" {
  version = "1.16.6-do.2"

  name = "codebattle-2"
  region = "fra1"

  node_pool {
    name       = "codebattle-node-pool"
    size       = "c-2"
    node_count = 1
  }
}
