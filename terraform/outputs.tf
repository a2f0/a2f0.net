output "production_url" {
  value = "https://${cloudflare_workers_custom_domain.resume.hostname}"
}

output "staging_url" {
  value = "https://${cloudflare_workers_custom_domain.staging.hostname}"
}

output "cloudflare_nameservers" {
  value = data.cloudflare_zone.resume.name_servers
}
