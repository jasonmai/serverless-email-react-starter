output "first_created_email_identity" {
  value = aws_sesv2_email_identity.main_domain_custom_email_addresses_to_create[var.emails_to_create[0]].email_identity
}

output "first_personal_email_identity_to_verify" {
  value = aws_sesv2_email_identity.main_domain_personal_email_addresses_to_verify[var.personal_emails_to_verify[0]].email_identity
}
