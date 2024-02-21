output "s3_email_bucket_name" {
  value = aws_s3_bucket.email_contents.id
}

output "s3_email_bucket_arn" {
  value = aws_s3_bucket.email_contents.arn
}

output "website_api_url" {
  value = aws_api_gateway_domain_name.store_message_api.domain_name
}

output "cloudfront_url_api" {
  value = aws_api_gateway_domain_name.store_message_api.cloudfront_domain_name
}

output "contact_form_api_invoke_raw_production_url" {
  value = aws_api_gateway_stage.store_message_api_stage_production.invoke_url
}
