resource "digitalocean_database_cluster" "codebattle" {
  name = "codebattle"
  engine = "pg"
  version = "10"

  size = "db-s-1vcpu-1gb"
  region = "fra1"
  node_count = 1
}
