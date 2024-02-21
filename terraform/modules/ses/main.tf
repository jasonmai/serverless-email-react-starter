resource "aws_sesv2_email_identity" "main_domain_identity" {
  email_identity = var.domain_name
  tags           = var.common_tags
}

resource "aws_ses_domain_dkim" "main_domain_ses_dkim" {
  domain = var.domain_name
}

resource "aws_route53_record" "main_domain_ses_dkim_verification_record" {
  count   = 3
  zone_id = var.main_domain_hosted_zone_id
  name    = "${aws_ses_domain_dkim.main_domain_ses_dkim.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${aws_ses_domain_dkim.main_domain_ses_dkim.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_route53_record" "main_domain_ses_domain_mx" {
  zone_id = var.main_domain_hosted_zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = "600"
  records = ["10 inbound-smtp.${var.region.main}.amazonaws.com"]
}

resource "aws_route53_record" "main_domain_ses_domain_txt" {
  zone_id = var.main_domain_hosted_zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = "600"
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_sesv2_email_identity" "main_domain_custom_email_addresses_to_create" {
  depends_on = [
    aws_route53_record.main_domain_ses_dkim_verification_record,
    aws_route53_record.main_domain_ses_domain_mx,
    aws_route53_record.main_domain_ses_domain_txt,
  ]
  for_each       = toset(var.emails_to_create)
  email_identity = each.key
  tags           = var.common_tags
}

resource "aws_sesv2_email_identity" "main_domain_personal_email_addresses_to_verify" {
  depends_on = [
    aws_route53_record.main_domain_ses_dkim_verification_record,
    aws_route53_record.main_domain_ses_domain_mx,
    aws_route53_record.main_domain_ses_domain_txt,
  ]
  for_each       = toset(var.personal_emails_to_verify)
  email_identity = each.key
  tags           = var.common_tags
}

resource "aws_route53_record" "main_domain_mail_from_mx" {
  zone_id = var.main_domain_hosted_zone_id
  name    = "mail.${aws_sesv2_email_identity.main_domain_identity.email_identity}"
  type    = "MX"
  ttl     = "600"
  records = ["10 feedback-smtp.${var.region.main}.amazonses.com"]
}

resource "aws_route53_record" "main_domain_mail_from_txt" {
  zone_id = var.main_domain_hosted_zone_id
  name    = "mail.${aws_sesv2_email_identity.main_domain_identity.email_identity}"
  type    = "TXT"
  ttl     = "600"
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_sesv2_email_identity_mail_from_attributes" "main_domain_name_mail_from" {
  email_identity         = aws_sesv2_email_identity.main_domain_identity.email_identity
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
  mail_from_domain       = "mail.${aws_sesv2_email_identity.main_domain_identity.email_identity}"
}

resource "aws_sesv2_email_identity_mail_from_attributes" "main_domain_custom_email_identities_mail_from" {
  for_each               = toset(var.emails_to_create)
  email_identity         = aws_sesv2_email_identity.main_domain_custom_email_addresses_to_create[each.key].email_identity
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
  mail_from_domain       = "mail.${aws_sesv2_email_identity.main_domain_identity.email_identity}"
}
