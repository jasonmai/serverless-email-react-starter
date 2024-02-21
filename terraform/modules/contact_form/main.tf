resource "aws_s3_bucket" "email_contents" {
  bucket = "${var.domain_name}-email"
  tags   = var.common_tags

  force_destroy = true
  lifecycle {
    prevent_destroy = false
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "email_contents" {
  bucket = aws_s3_bucket.email_contents.bucket
  rule {
    id     = "DeleteAfter30Days"
    status = "Enabled"
    expiration {
      days = 30
    }
  }
}

data "aws_iam_policy_document" "store_message_lambda" {
  statement {
    sid     = "AllowStoreMessage"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "store_message_lambda" {
  name               = "store-message-role-${var.domain_name}"
  assume_role_policy = data.aws_iam_policy_document.store_message_lambda.json
  tags               = var.common_tags
}

data "aws_iam_policy_document" "store_message_lambda_s3_cloudwatch_access" {
  statement {
    sid    = "AllowStoreMessageLog"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:CreateLogGroup",
      "logs:PutLogEvents"
    ]
    resources = ["*"]
  }
  statement {
    sid    = "AllowStoreMessageS3ReadWrite"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = [
      "${aws_s3_bucket.email_contents.arn}/*",
    ]
  }
}

resource "aws_iam_policy" "store_message_lambda_s3_cloudwatch_access" {
  name   = "store-message-policy-${var.domain_name}"
  policy = data.aws_iam_policy_document.store_message_lambda_s3_cloudwatch_access.json
  tags   = var.common_tags
}

resource "aws_iam_role_policy_attachment" "store_message_lambda" {
  role       = aws_iam_role.store_message_lambda.name
  policy_arn = aws_iam_policy.store_message_lambda_s3_cloudwatch_access.arn
}

data "archive_file" "store_message_lambda_zip" {
  type        = "zip"
  source_file = "${path.root}/../lambdas/dist/store-message.js"
  output_path = "${path.root}/../lambdas/dist/store-message.zip"
}

resource "aws_lambda_function" "store_message_lambda" {
  function_name    = "${replace(var.domain_name, ".", "_")}-storeMessage"
  filename         = "${path.root}/../lambdas/dist/store-message.zip"
  handler          = "store-message.handler"
  runtime          = "nodejs20.x"
  timeout          = 5
  source_code_hash = data.archive_file.store_message_lambda_zip.output_base64sha256
  publish          = true
  role             = aws_iam_role.store_message_lambda.arn
  tags             = var.common_tags
  environment {
    variables = {
      SES_REGION      = var.region.main
      DOMAIN_NAME     = var.domain_name
      S3_EMAIL_BUCKET = "${var.domain_name}-email"
      S3_EMAIL_FOLDER = var.s3_contact_form_message_prefix
      TO_EMAIL        = var.send_to_email
      RECAPTCHA_URL   = var.recaptcha_verification_url
      RECAPTCHA_KEY   = var.recaptcha_secret_key
      CORS_ORIGIN     = var.cors_origin
    }
  }
}

resource "aws_cloudwatch_log_group" "store_message_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.store_message_lambda.function_name}"
  retention_in_days = 30
  tags              = var.common_tags
}

resource "aws_api_gateway_rest_api" "store_message_api" {
  name = "store-message-s3-contact-form-api"
  tags = var.common_tags
  endpoint_configuration {
    types = ["EDGE"]
  }
}

resource "aws_api_gateway_resource" "store_message_api" {
  rest_api_id = aws_api_gateway_rest_api.store_message_api.id
  parent_id   = aws_api_gateway_rest_api.store_message_api.root_resource_id
  path_part   = "contact"
}

resource "aws_api_gateway_method" "store_message_api_post" {
  rest_api_id   = aws_api_gateway_rest_api.store_message_api.id
  resource_id   = aws_api_gateway_resource.store_message_api.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "store_message_api_post" {
  rest_api_id = aws_api_gateway_rest_api.store_message_api.id
  resource_id = aws_api_gateway_resource.store_message_api.id
  http_method = aws_api_gateway_method.store_message_api_post.http_method
  status_code = 200
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration" "store_message_api_post" {
  rest_api_id             = aws_api_gateway_rest_api.store_message_api.id
  resource_id             = aws_api_gateway_resource.store_message_api.id
  http_method             = aws_api_gateway_method.store_message_api_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.store_message_lambda.invoke_arn
}

resource "aws_api_gateway_method" "store_message_api_options" {
  rest_api_id   = aws_api_gateway_rest_api.store_message_api.id
  resource_id   = aws_api_gateway_resource.store_message_api.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method_response" "store_message_api_options" {
  rest_api_id = aws_api_gateway_rest_api.store_message_api.id
  resource_id = aws_api_gateway_resource.store_message_api.id
  http_method = aws_api_gateway_method.store_message_api_options.http_method
  status_code = 200
  response_models = {
    "application/json" = "Empty"
  }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration" "store_message_api_options" {
  rest_api_id = aws_api_gateway_rest_api.store_message_api.id
  resource_id = aws_api_gateway_resource.store_message_api.id
  http_method = aws_api_gateway_method.store_message_api_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = jsonencode(
      {
        statusCode = 200
      }
    )
  }
}

resource "aws_api_gateway_integration_response" "store_message_api_options" {
  rest_api_id = aws_api_gateway_rest_api.store_message_api.id
  resource_id = aws_api_gateway_resource.store_message_api.id
  http_method = aws_api_gateway_method.store_message_api_options.http_method
  status_code = aws_api_gateway_method_response.store_message_api_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${var.cors_origin}'"
  }
}

resource "aws_cloudwatch_log_group" "store_message_api_gw" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.store_message_api.id}/production"
  retention_in_days = 30
  tags              = var.common_tags
}

resource "aws_api_gateway_stage" "store_message_api_stage_production" {
  depends_on    = [aws_cloudwatch_log_group.store_message_api_gw]
  deployment_id = aws_api_gateway_deployment.store_message_api.id
  rest_api_id   = aws_api_gateway_rest_api.store_message_api.id
  tags          = var.common_tags
  stage_name    = "production"
}

data "aws_iam_policy_document" "store_message_cloudwatch_role" {
  statement {
    sid     = "AllowStoreMessageCloudWatch"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "store_message_cloudwatch" {
  name               = "store-message-cloudwatch-role-${var.domain_name}"
  assume_role_policy = data.aws_iam_policy_document.store_message_cloudwatch_role.json
  tags               = var.common_tags
}

resource "aws_iam_role_policy_attachment" "store_message_cloudwatch" {
  role       = aws_iam_role.store_message_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

resource "aws_api_gateway_account" "store_message_api" {
  depends_on          = [aws_iam_role_policy_attachment.store_message_cloudwatch]
  cloudwatch_role_arn = aws_iam_role.store_message_cloudwatch.arn
}

resource "aws_api_gateway_method_settings" "store_message_api" {
  depends_on  = [aws_api_gateway_account.store_message_api]
  rest_api_id = aws_api_gateway_rest_api.store_message_api.id
  stage_name  = aws_api_gateway_stage.store_message_api_stage_production.stage_name
  method_path = "*/*"
  settings {
    metrics_enabled = true
    logging_level   = "INFO"
  }
}

resource "aws_api_gateway_deployment" "store_message_api" {
  depends_on = [
    aws_api_gateway_integration.store_message_api_post,
    aws_api_gateway_integration.store_message_api_options,
    aws_api_gateway_integration_response.store_message_api_options
  ]
  rest_api_id       = aws_api_gateway_rest_api.store_message_api.id
  stage_description = md5(file("${path.module}/main.tf"))
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lambda_permission" "store_message_api_lambda" {
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.store_message_lambda.function_name
  principal      = "apigateway.amazonaws.com"
  source_account = var.current_aws_account_id
  source_arn     = "${aws_api_gateway_rest_api.store_message_api.execution_arn}/*/*"
}

resource "aws_api_gateway_domain_name" "store_message_api" {
  domain_name     = "api.${var.domain_name}"
  certificate_arn = var.acm_ssl_certificate_arn
  tags            = var.common_tags
}

resource "aws_route53_record" "store_message_api_cloudfront_edge" {
  name    = aws_api_gateway_domain_name.store_message_api.domain_name
  type    = "A"
  zone_id = var.main_domain_hosted_zone_id
  alias {
    name                   = aws_api_gateway_domain_name.store_message_api.cloudfront_domain_name
    zone_id                = aws_api_gateway_domain_name.store_message_api.cloudfront_zone_id
    evaluate_target_health = false
  }
}

resource "aws_api_gateway_base_path_mapping" "store_message_api_cloudfront_edge" {
  api_id      = aws_api_gateway_rest_api.store_message_api.id
  domain_name = aws_api_gateway_domain_name.store_message_api.domain_name
  stage_name  = aws_api_gateway_stage.store_message_api_stage_production.stage_name
}
