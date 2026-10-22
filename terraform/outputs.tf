output "production_url" {
  value = "https://${cloudflare_workers_custom_domain.resume.hostname}"
}

output "website_url" {
  value = "https://${cloudflare_workers_custom_domain.website.hostname}"
}

output "staging_url" {
  value = "https://${cloudflare_workers_custom_domain.staging.hostname}"
}

output "demo_url" {
  value = "https://${cloudflare_workers_custom_domain.demo.hostname}"
}

output "nc_url" {
  value = "https://${cloudflare_workers_custom_domain.nc.hostname}"
}

output "dnbm_url" {
  value = "https://${cloudflare_workers_custom_domain.dnbm.hostname}"
}

output "cloudflare_nameservers" {
  value = data.cloudflare_zone.resume.name_servers
}
