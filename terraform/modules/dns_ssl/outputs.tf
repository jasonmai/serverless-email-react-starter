output "main_domain_hosted_zone_id" {
  value = aws_route53_zone.main_domain.zone_id
}

output "additional_domain_hosted_zone_id" {
  value = var.additional_domain_name != "" ? aws_route53_zone.additional_domain[0].zone_id : "none"
}

output "acm_ssl_certificate_arn" {
  value = aws_acm_certificate_validation.main_ssl_certificate_validation.certificate_arn
}
