resource "kubernetes_secret" "codebattle_secrets" {
  depends_on = [digitalocean_kubernetes_cluster.codebattle_cluster]

  metadata {
    name = "codebattle-secrets"
  }

  data = {
    MIX_ENV                    = "prod"
    NODE_ENV                   = "production"
    CODEBATTLE_PORT            = "${var.codebattle_port}"
    CODEBATTLE_SECRET_KEY_BASE = "${var.codebattle_secret_key_base}"
    CODEBATTLE_LIVE_VIEW_SALT  = "${var.codebattle_live_view_salt}"
    CODEBATTLE_DB_HOSTNAME     = "codebattle-postgres-db-cluster-do-user-10745212-0.b.db.ondigitalocean.com"
    CODEBATTLE_DB_USERNAME     = "doadmin"
    CODEBATTLE_DB_PASSWORD     = "pumInbwWyl7fEtoX"
    CODEBATTLE_DB_NAME         = "codebattle"
    CODEBATTLE_DB_PORT         = "25060"
    GITHUB_CLIENT_SECRET       = "${var.github_client_secret}"
    GITHUB_CLIENT_ID           = "${var.github_client_id}"
    DISCORD_CLIENT_SECRET      = "${var.discord_client_secret}"
    DISCORD_CLIENT_ID          = "${var.discord_client_id}"
    ONESIGNAL_API_KEY          = "${var.onesignal_api_key}"
    ONESIGNAL_APP_ID           = "${var.onesignal_app_id}"
    FIREBASE_API_KEY           = "${var.firebase_api_key}"
    FIREBASE_SENDER_ID         = "${var.firebase_sender_id}"
    ROLLBAR_API_KEY            = "${var.rollbar_api_key}"
  }
}
