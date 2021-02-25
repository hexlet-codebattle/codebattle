resource "kubernetes_secret" "codebattle_secrets" {
  depends_on = [digitalocean_kubernetes_cluster.codebattle-2]

  metadata {
    name = "codebattle-secrets"
  }

  data = {
    MIX_ENV                    = "prod"
    NODE_ENV                   = "production"
    CODEBATTLE_PORT            = "${var.codebattle_port}"
    CODEBATTLE_SECRET_KEY_BASE = "${var.codebattle_secret_key_base}"
    CODEBATTLE_LIVE_VIEW_SALT  = "${var.codebattle_live_view_salt}"
    CODEBATTLE_DB_HOSTNAME     = "${var.codebattle_db_hostname}"
    CODEBATTLE_DB_USERNAME     = "${var.codebattle_db_username}"
    CODEBATTLE_DB_PASSWORD     = "${var.codebattle_db_password}"
    CODEBATTLE_DB_NAME         = "${var.codebattle_db_name}"
    CODEBATTLE_DB_PORT         = "${var.codebattle_db_port}"
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
