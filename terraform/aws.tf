provider "aws" {
  region = var.aws_region
}

# Retain Route 53 throughout DNS propagation and the rollback window. These
# records stop serving traffic when the registrar delegates to Cloudflare.
data "aws_route53_zone" "zone" {
  name = var.domain
}

resource "aws_route53_record" "ns" {
  allow_overwrite = true
  name            = var.domain
  ttl             = 60
  type            = "NS"
  zone_id         = data.aws_route53_zone.zone.zone_id

  records = [
    "ns-468.awsdns-58.com",
    "ns-844.awsdns-41.net",
    "ns-1621.awsdns-10.co.uk",
    "ns-1372.awsdns-43.org"
  ]
}

resource "aws_route53_record" "txt" {
  allow_overwrite = true
  ttl             = 60
  name            = var.domain
  type            = "TXT"
  zone_id         = data.aws_route53_zone.zone.zone_id

  records = [
    "google-site-verification=8z0T7bFJBKuloHIP6B-4eeWVxOozHOGoNpMwqVb_Pwc"
  ]
}

resource "aws_route53_record" "mx" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = ""
  ttl     = 60
  type    = "MX"

  records = [
    "1 ASPMX.L.GOOGLE.COM",
    "5 ALT1.ASPMX.L.GOOGLE.COM",
    "5 ALT2.ASPMX.L.GOOGLE.COM",
    "10 ASPMX2.GOOGLEMAIL.COM",
    "10 ASPMX3.GOOGLEMAIL.COM",
  ]
}

resource "aws_route53_record" "a" {
  allow_overwrite = true
  name            = var.domain
  ttl             = 60
  type            = "A"
  zone_id         = data.aws_route53_zone.zone.zone_id

  records = [
    "76.76.21.21"
  ]
}

resource "aws_route53_record" "a-staging" {
  allow_overwrite = true
  name            = var.domain_staging
  ttl             = 60
  type            = "A"
  zone_id         = data.aws_route53_zone.zone.zone_id

  records = [
    "76.76.21.21"
  ]
}
