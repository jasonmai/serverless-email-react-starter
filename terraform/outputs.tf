output "website_url" {
  description = "Website URL (HTTPS)"
  value       = "https://${var.domain_name}"
}

output "website_url_alternative" {
  description = "Website URL (HTTPS)"
  value       = var.additional_domain_name != "" ? "https://${var.additional_domain_name}" : ""
}

output "website_api_url" {
  description = "Website API URL (HTTPS)"
  value       = "https://${module.contact_form.website_api_url}"
}

output "s3_website_endpoint" {
  description = "S3 hosting URL (HTTP)"
  value       = "http://${module.static_website.s3_website_endpoint}"
}

output "cloudfront_id" {
  description = "Cloudfront ID"
  value       = module.static_website.cloudfront_id
}

output "cloudfront_url_ui" {
  description = "Cloudfront distribution front end URL (HTTPS)"
  value       = "https://${module.static_website.cloudfront_url_ui}"
}

output "cloudfront_url_api" {
  description = "Cloudfront distribution API back end URL (HTTPS)"
  value       = "https://${module.contact_form.cloudfront_url_api}"
}

output "email_address_forwarding_emails" {
  description = "Email address used to forward to personal email (from sender)"
  value       = module.ses.first_created_email_identity
}

output "email_address_receiving_forwarded_emails" {
  description = "Personal email address receiving forwarded emails"
  value       = module.ses.first_personal_email_identity_to_verify
}

output "contact_form_api_post_url" {
  description = "URL of API Gateway for the contact form"
  value       = "https://${module.contact_form.website_api_url}/contact"
}

output "contact_form_api_invoke_raw_production_url" {
  description = "URL of API Gateway for the contact form production stage"
  value       = module.contact_form.contact_form_api_invoke_raw_production_url
}
