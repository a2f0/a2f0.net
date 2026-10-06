provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Look up the existing zone, already delegated to Cloudflare.
data "cloudflare_zone" "resume" {
  filter = {
    account = { id = var.cloudflare_account_id }
    name    = var.domain
  }
}

# Publish the Workers with Wrangler before attaching their custom domains.
moved {
  from = cloudflare_workers_custom_domain.production
  to   = cloudflare_workers_custom_domain.apex_redirect
}

moved {
  from = cloudflare_workers_custom_domain.apex_redirect
  to   = cloudflare_workers_custom_domain.website
}

resource "cloudflare_workers_custom_domain" "website" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.resume.id
  hostname   = var.domain
  service    = "resume-redirect"
}

resource "cloudflare_workers_custom_domain" "resume" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.resume.id
  hostname   = "resume.${var.domain}"
  service    = "resume-prod"
}

resource "cloudflare_workers_custom_domain" "staging" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.resume.id
  hostname   = var.domain_staging
  service    = "resume-staging"
}

# Host for packages/experiment, deployed from production CI.
resource "cloudflare_workers_custom_domain" "experiment" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.resume.id
  hostname   = "experiment.${var.domain}"
  service    = "experiment"
}

# Host for the Noise Connoisseur web app, deployed with Wrangler from a2f0/nc.
resource "cloudflare_workers_custom_domain" "nc" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.resume.id
  hostname   = "nc.${var.domain}"
  service    = "nc"
}

# Host for the dnbm drum and bass sequencer, deployed with Wrangler from a2f0/dnbm.
resource "cloudflare_workers_custom_domain" "dnbm" {
  account_id = var.cloudflare_account_id
  zone_id    = data.cloudflare_zone.resume.id
  hostname   = "dnbm.${var.domain}"
  service    = "dnbm"
}

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = data.cloudflare_zone.resume.id
  setting_id = "always_use_https"
  value      = "on"
}

# Google Workspace mail and verification records.
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
