provider "github" {
  token = var.github_token
  owner = var.github_owner
}

resource "github_actions_secret" "cloudflare_account_id" {
  repository  = var.github_repository
  secret_name = "CLOUDFLARE_ACCOUNT_ID"
  value       = var.cloudflare_account_id
}

resource "github_actions_secret" "cloudflare_api_token" {
  repository  = var.github_repository
  secret_name = "CLOUDFLARE_API_TOKEN"
  value       = var.cloudflare_deploy_api_token
}

resource "github_actions_secret" "slack_webhook_url" {
  repository  = var.github_repository
  secret_name = "SLACK_WEBHOOK_URL"
  value       = var.slack_webhook_url
}

resource "github_actions_secret" "domain_staging" {
  repository  = var.github_repository
  secret_name = "DOMAIN_STAGING"
  value       = var.domain_staging
}
