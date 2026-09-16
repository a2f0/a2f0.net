provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Create the zone and review its DNS inventory before moving nameservers.
data "cloudflare_zone" "resume" {
  filter = {
    account = { id = var.cloudflare_account_id }
    name    = var.domain
  }
}

# Publish both Workers with Wrangler before attaching their custom domains.
resource "cloudflare_workers_custom_domain" "production" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.resume.id
  hostname   = var.domain
  service    = "resume-prod"
}

resource "cloudflare_workers_custom_domain" "staging" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.resume.id
  hostname   = var.domain_staging
  service    = "resume-staging"
}

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = data.cloudflare_zone.resume.id
  setting_id = "always_use_https"
  value      = "on"
}

# Preserve the Google Workspace records currently managed in Route 53.
locals {
  google_workspace_mx = {
    aspmx  = { content = "aspmx.l.google.com", priority = 1 }
    alt1   = { content = "alt1.aspmx.l.google.com", priority = 5 }
    alt2   = { content = "alt2.aspmx.l.google.com", priority = 5 }
    aspmx2 = { content = "aspmx2.googlemail.com", priority = 10 }
    aspmx3 = { content = "aspmx3.googlemail.com", priority = 10 }
  }
}

resource "cloudflare_dns_record" "mx" {
  for_each = local.google_workspace_mx

  zone_id  = data.cloudflare_zone.resume.id
  name     = var.domain
  type     = "MX"
  content  = each.value.content
  priority = each.value.priority
  ttl      = 1
}

resource "cloudflare_dns_record" "google_verification" {
  zone_id = data.cloudflare_zone.resume.id
  name    = var.domain
  type    = "TXT"
  content = "google-site-verification=8z0T7bFJBKuloHIP6B-4eeWVxOozHOGoNpMwqVb_Pwc"
  ttl     = 1
}
