# Define K8s Region
variable "cluster_region" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "cluster_node_name" {
  type = string
}

variable "cluster_node_size" {
  type = string
}

variable "postgres_db_node_size" {
  type = string
}

variable "postgres_version" {
  type = string
}

variable "postgres_db_cluster_name" {
  type = string
}

variable "rel_path_to_kubeconfig" {
  type        = string
  default     = "../.kube/config"
  description = "Path to kubeconfig file"
}

variable "write_kubeconfig" {
  type        = bool
  default     = true
}

variable "codebattle_port" {
  type = string
}

variable "codebattle_secret_key_base" {
  type = string
}

variable "codebattle_live_view_salt" {
  type = string
}

variable "codebattle_db_username" {
  type = string
}

variable "codebattle_db_password" {
  type = string
}

variable "codebattle_db_name" {
  type = string
}

variable "codebattle_db_port" {
  type = string
}

variable "github_client_secret" {
  type = string
}

variable "github_client_id" {
  type = string
}

variable "discord_client_secret" {
  type = string
}

variable "discord_client_id" {
  type = string
}

variable "onesignal_api_key" {
  type = string
}

variable "onesignal_app_id" {
  type = string
}

variable "firebase_api_key" {
  type = string
}

variable "firebase_sender_id" {
  type = string
}

variable "rollbar_api_key" {
  type = string
  description = "Postgres DB Cluster name"
}
