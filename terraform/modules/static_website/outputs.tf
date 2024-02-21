output "s3_static_content_bucket_name" {
  value = aws_s3_bucket.static_website_contents.id
}

output "s3_website_endpoint" {
  value = aws_s3_bucket_website_configuration.static_website_contents.website_endpoint
}

output "cloudfront_id" {
  value = aws_cloudfront_distribution.static_website.id
}

output "cloudfront_url_ui" {
  value = aws_cloudfront_distribution.static_website.domain_name
}
