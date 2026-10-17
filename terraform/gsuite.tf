locals {
  # The service-account key in .secrets, the gitignored link to this project's
  # matrix-secrets folder. apply.sh refuses to plan without it; the fallback
  # only lets validation run where .secrets is absent.
  google_credentials_file = "${path.module}/../.secrets/prod/google-credentials.json"
}

provider "googleworkspace" {
  customer_id             = var.gsuite_customer_id
  credentials             = fileexists(local.google_credentials_file) ? file(local.google_credentials_file) : null
  impersonated_user_email = var.gsuite_impersonated_user_email
  oauth_scopes = [
    "https://www.googleapis.com/auth/admin.directory.group",
    "https://www.googleapis.com/auth/apps.groups.settings",
    "https://www.googleapis.com/auth/admin.directory.user",
    "https://www.googleapis.com/auth/admin.directory.userschema",
    "https://www.googleapis.com/auth/admin.directory.domain"
  ]
}

resource "googleworkspace_domain" "a2f0" {
  domain_name = "a2f0.net"
}

resource "googleworkspace_group" "a2f0" {
  email = "resume@a2f0.net"
  name  = "resume@a2f0.net"
}

resource "googleworkspace_group_member" "owner" {
  group_id = googleworkspace_group.a2f0.email
  email    = var.gsuite_impersonated_user_email
  role     = "OWNER"
}

resource "googleworkspace_group" "support" {
  email = "support@a2f0.net"
  name  = "support@a2f0.net"
}

resource "googleworkspace_group_member" "support_owner" {
  group_id = googleworkspace_group.support.email
  email    = var.gsuite_impersonated_user_email
  role     = "OWNER"
}
