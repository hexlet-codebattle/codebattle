
terraform {
  backend "gcs" {
    bucket  = "codebattle-terraform-state"
    prefix  = "production"
    credentials = "google.key.json"
  }
}

provider "digitalocean" {
  token   = ""
}
