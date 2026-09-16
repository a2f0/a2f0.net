terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.64"
    }
    googleworkspace = {
      source  = "hashicorp/googleworkspace"
      version = "~> 0.7.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.25"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
  }
  required_version = ">= 1.16.2, < 2.0"
}
