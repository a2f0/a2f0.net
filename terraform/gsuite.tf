provider "googleworkspace" {
  customer_id             = var.gsuite_customer_id
  credentials             = "google-credentials.json"
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
