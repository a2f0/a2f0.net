output "production_url" {
  value = "https://${cloudflare_workers_custom_domain.resume.hostname}"
}

output "website_url" {
  value = "https://${cloudflare_workers_custom_domain.website.hostname}"
}

output "staging_url" {
  value = "https://${cloudflare_workers_custom_domain.staging.hostname}"
}

output "experiment_url" {
  value = "https://${cloudflare_workers_custom_domain.experiment.hostname}"
}

output "nc_url" {
  value = "https://${cloudflare_workers_custom_domain.nc.hostname}"
}

output "cloudflare_nameservers" {
  value = data.cloudflare_zone.resume.name_servers
}
