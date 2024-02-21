resource "aws_s3_bucket" "static_website_contents" {
  bucket = var.domain_name
  tags   = var.common_tags

  force_destroy = true
  lifecycle {
    prevent_destroy = false
  }
}

resource "aws_s3_bucket_website_configuration" "static_website_contents" {
  bucket = aws_s3_bucket.static_website_contents.bucket
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_ownership_controls" "static_website_contents" {
  bucket = aws_s3_bucket.static_website_contents.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "static_website_contents" {
  bucket                  = aws_s3_bucket.static_website_contents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_acl" "static_website_contents" {
  depends_on = [
    aws_s3_bucket_ownership_controls.static_website_contents,
    aws_s3_bucket_public_access_block.static_website_contents,
  ]
  bucket = aws_s3_bucket.static_website_contents.id
  acl    = "private"
}

data "aws_iam_policy_document" "static_website_cloudfront_lambda_edge" {
  statement {
    sid     = "AllowCloudFrontLambdaEdge"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com", "edgelambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "static_website_cloudfront_lambda_edge" {
  name               = "lambda-edge-role-${var.domain_name}"
  assume_role_policy = data.aws_iam_policy_document.static_website_cloudfront_lambda_edge.json
  tags               = var.common_tags
}

data "archive_file" "static_website_cloudfront_lambda_edge_zip" {
  type        = "zip"
  source_file = "${path.root}/../lambdas/dist/origin-response.js"
  output_path = "${path.root}/../lambdas/dist/origin-response.zip"
}

resource "aws_lambda_function" "static_website_cloudfront_lambda_edge" {
  provider         = aws.us-east-1
  function_name    = "${replace(var.domain_name, ".", "_")}-originResponse"
  filename         = "${path.root}/../lambdas/dist/origin-response.zip"
  handler          = "origin-response.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.static_website_cloudfront_lambda_edge_zip.output_base64sha256
  publish          = true
  role             = aws_iam_role.static_website_cloudfront_lambda_edge.arn
  tags             = var.common_tags
}

resource "aws_cloudfront_origin_access_control" "static_website" {
  name                              = "OAC ${aws_s3_bucket.static_website_contents.bucket}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "static_website_viewer_request" {
  name    = "${replace(var.domain_name, ".", "_")}-viewer-request"
  runtime = "cloudfront-js-2.0"
  code    = file("${path.root}/../lambdas/dist/viewer-request.js")
  publish = true
}

resource "aws_cloudfront_distribution" "static_website" {
  depends_on      = [aws_s3_bucket.static_website_contents, aws_lambda_function.static_website_cloudfront_lambda_edge]
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2and3"
  aliases = var.additional_domain_name != "" ? [
    var.domain_name, "*.${var.domain_name}", var.additional_domain_name, "*.${var.additional_domain_name}"
  ] : [var.domain_name, "*.${var.domain_name}"]
  default_root_object = "index.html"
  #  price_class = "PriceClass_100"
  price_class = "PriceClass_All"
  comment     = "${var.domain_name} distribution"
  tags        = var.common_tags
  origin {
    origin_id                = "${aws_s3_bucket.static_website_contents.id}-origin"
    domain_name              = aws_s3_bucket.static_website_contents.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.static_website.id
  }
  default_cache_behavior {
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    target_origin_id       = "${aws_s3_bucket.static_website_contents.id}-origin"
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.static_website_viewer_request.arn
    }
    lambda_function_association {
      event_type = "origin-response"
      lambda_arn = aws_lambda_function.static_website_cloudfront_lambda_edge.qualified_arn
    }
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
      locations        = []
    }
  }
  viewer_certificate {
    acm_certificate_arn      = var.acm_ssl_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  custom_error_response {
    error_code            = 400
    response_code         = 200
    error_caching_min_ttl = 10
    response_page_path    = "/index.html"
  }
  custom_error_response {
    error_code            = 403
    response_code         = 200
    error_caching_min_ttl = 10
    response_page_path    = "/index.html"
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    error_caching_min_ttl = 10
    response_page_path    = "/index.html"
  }
  custom_error_response {
    error_code            = 500
    response_code         = 200
    error_caching_min_ttl = 10
    response_page_path    = "/index.html"
  }
  custom_error_response {
    error_code            = 501
    response_code         = 200
    error_caching_min_ttl = 10
    response_page_path    = "/index.html"
  }
  custom_error_response {
    error_code            = 502
    response_code         = 200
    error_caching_min_ttl = 10
    response_page_path    = "/index.html"
  }
  custom_error_response {
    error_code            = 503
    response_code         = 200
    error_caching_min_ttl = 10
    response_page_path    = "/index.html"
  }
}

resource "aws_s3_bucket_policy" "static_website_contents" {
  bucket = aws_s3_bucket.static_website_contents.id
  policy = data.aws_iam_policy_document.static_website_content_cloudfront_access.json
}

data "aws_iam_policy_document" "static_website_content_cloudfront_access" {
  statement {
    sid     = "AllowCloudFrontServicePrincipalReadOnly"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    resources = [
      aws_s3_bucket.static_website_contents.arn,
      "${aws_s3_bucket.static_website_contents.arn}/*"
    ]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values = [
        aws_cloudfront_distribution.static_website.arn
      ]
    }
  }
}

resource "aws_route53_record" "main_domain_root_a" {
  zone_id = var.main_domain_hosted_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.static_website.domain_name
    zone_id                = aws_cloudfront_distribution.static_website.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "main_domain_www_a" {
  zone_id = var.main_domain_hosted_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.static_website.domain_name
    zone_id                = aws_cloudfront_distribution.static_website.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "additional_domain_name_root_a" {
  count   = var.additional_domain_name != "" ? 1 : 0
  zone_id = var.additional_domain_hosted_zone_id
  name    = var.additional_domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.static_website.domain_name
    zone_id                = aws_cloudfront_distribution.static_website.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "additional_domain_name_www_a" {
  count   = var.additional_domain_name != "" ? 1 : 0
  zone_id = var.additional_domain_hosted_zone_id
  name    = "www.${var.additional_domain_name}"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.static_website.domain_name
    zone_id                = aws_cloudfront_distribution.static_website.hosted_zone_id
    evaluate_target_health = false
  }
}
