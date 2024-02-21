resource "aws_route53_zone" "main_domain" {
  name = var.domain_name
  tags = var.common_tags
}

resource "aws_route53_zone" "additional_domain" {
  count = var.additional_domain_name != "" ? 1 : 0
  name  = var.additional_domain_name
  tags  = var.common_tags
}

resource "aws_route53domains_registered_domain" "main_domain" {
  depends_on  = [aws_route53_zone.main_domain]
  domain_name = var.domain_name
  tags        = var.common_tags
  name_server {
    name = aws_route53_zone.main_domain.name_servers.0
  }
  name_server {
    name = aws_route53_zone.main_domain.name_servers.1
  }
  name_server {
    name = aws_route53_zone.main_domain.name_servers.2
  }
  name_server {
    name = aws_route53_zone.main_domain.name_servers.3
  }
}

resource "aws_route53domains_registered_domain" "additional_domain" {
  count       = var.additional_domain_name != "" ? 1 : 0
  depends_on  = [aws_route53_zone.additional_domain]
  domain_name = var.additional_domain_name
  tags        = var.common_tags
  name_server {
    name = aws_route53_zone.additional_domain[0].name_servers.0
  }
  name_server {
    name = aws_route53_zone.additional_domain[0].name_servers.1
  }
  name_server {
    name = aws_route53_zone.additional_domain[0].name_servers.2
  }
  name_server {
    name = aws_route53_zone.additional_domain[0].name_servers.3
  }
}

resource "aws_acm_certificate" "main_ssl_certificate" {
  provider    = aws.us-east-1
  domain_name = var.domain_name
  subject_alternative_names = var.additional_domain_name != "" ? [
    "*.${var.domain_name}", var.additional_domain_name, "*.${var.additional_domain_name}"
  ] : ["*.${var.domain_name}"]
  validation_method = "DNS"
  tags              = var.common_tags
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "main_ssl_certificate_validation" {
  depends_on = [
    aws_route53domains_registered_domain.main_domain,
    aws_route53domains_registered_domain.additional_domain
  ]
  for_each = {
    for dvo in aws_acm_certificate.main_ssl_certificate.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = strcontains(each.value.name, var.domain_name) ? aws_route53_zone.main_domain.zone_id : aws_route53_zone.additional_domain[0].zone_id
}

resource "aws_acm_certificate_validation" "main_ssl_certificate_validation" {
  depends_on = [
    aws_route53domains_registered_domain.main_domain,
    aws_route53domains_registered_domain.additional_domain
  ]
  provider                = aws.us-east-1
  certificate_arn         = aws_acm_certificate.main_ssl_certificate.arn
  validation_record_fqdns = [for record in aws_route53_record.main_ssl_certificate_validation : record.fqdn]
}

