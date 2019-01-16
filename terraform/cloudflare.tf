# Configure the Cloudflare provider
provider "cloudflare" {
  email = "${var.cloudflare_email}"
  token = "${var.cloudflare_token}"
}

variable "domain" {
  default = "codebattle.hexlet.io"
}

resource "cloudflare_record" "codebattle" {
  domain = "${var.domain}"
  name   = "codebattle"
  value  = "94.177.235.82"
  type   = "A"
  proxied = true
}

resource "cloudflare_zone_settings_override" "codebattle-settings" {
  name = "${var.domain}"

  settings {
    tls_1_3 = "on"
    automatic_https_rewrites = "on"
    ssl = "strict"
    # waf = "on"
  }
}
