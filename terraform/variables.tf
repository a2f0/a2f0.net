variable "domain" {
  type = string
}

variable "domain_staging" {
  type = string
}

variable "github_owner" {
  type = string
}

variable "github_repository" {
  type = string
}

variable "github_token" {
  type      = string
  sensitive = true
  default   = null
}

variable "gsuite_customer_id" {
  type = string
}

variable "gsuite_impersonated_user_email" {
  type = string
}

variable "slack_webhook_url" {
  type      = string
  sensitive = true
}

variable "cloudflare_account_id" {
  type = string
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_deploy_api_token" {
  description = "Workers Scripts Edit token for deployments, without DNS permissions."
  type        = string
  sensitive   = true
}
