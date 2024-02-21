data "aws_iam_policy_document" "forward_email_lambda" {
  statement {
    sid     = "AllowForwardEmail"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "forward_email_lambda" {
  name               = "forward-email-role-${var.domain_name}"
  assume_role_policy = data.aws_iam_policy_document.forward_email_lambda.json
  tags               = var.common_tags
}

data "aws_iam_policy_document" "forward_email_lambda_s3_ses_cloudwatch_access" {
  statement {
    sid    = "AllowForwardEmailLog"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:CreateLogGroup",
      "logs:PutLogEvents"
    ]
    resources = ["*"]
  }
  statement {
    sid    = "AllowForwardEmailS3ReadWrite"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = [
      "${var.s3_email_bucket_arn}/*",
    ]
  }
  statement {
    sid    = "AllowForwardEmailSESSendEmail"
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "forward_email_lambda_s3_ses_cloudwatch_access" {
  name   = "forward-email-policy-${var.domain_name}"
  policy = data.aws_iam_policy_document.forward_email_lambda_s3_ses_cloudwatch_access.json
  tags   = var.common_tags
}

resource "aws_iam_role_policy_attachment" "forward_email_lambda" {
  role       = aws_iam_role.forward_email_lambda.name
  policy_arn = aws_iam_policy.forward_email_lambda_s3_ses_cloudwatch_access.arn
}

data "archive_file" "forward_email_lambda_zip" {
  type        = "zip"
  source_file = "${path.root}/../lambdas/dist/forward-email.js"
  output_path = "${path.root}/../lambdas/dist/forward-email.zip"
}

resource "aws_lambda_function" "forward_email_lambda" {
  function_name    = "${replace(var.domain_name, ".", "_")}-forwardEmail"
  filename         = "${path.root}/../lambdas/dist/forward-email.zip"
  handler          = "forward-email.handler"
  runtime          = "nodejs16.x"
  memory_size      = 512
  timeout          = 30
  source_code_hash = data.archive_file.forward_email_lambda_zip.output_base64sha256
  publish          = true
  role             = aws_iam_role.forward_email_lambda.arn
  tags             = var.common_tags
  environment {
    variables = {
      DOMAIN_NAME         = var.domain_name
      S3_EMAIL_BUCKET     = "${var.domain_name}-email"
      S3_EMAIL_FOLDER     = var.s3_email_inbox_prefix
      CONTACT_FORM_FOLDER = var.s3_contact_form_message_prefix
      TO_EMAIL            = var.forward_emails_to
      FROM_EMAIL          = var.from_sender_of_forwarded_emails
    }
  }
}

resource "aws_cloudwatch_log_group" "forward_email_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.forward_email_lambda.function_name}"
  retention_in_days = 30
  tags              = var.common_tags
}

resource "aws_ses_receipt_rule_set" "forward_email" {
  rule_set_name = "ses-email-forwarder-${var.domain_name}"
}

resource "aws_ses_active_receipt_rule_set" "forward_email" {
  rule_set_name = aws_ses_receipt_rule_set.forward_email.rule_set_name
}

resource "aws_ses_receipt_rule" "forward_email_s3_lambda" {
  depends_on    = [aws_lambda_permission.forward_email_lambda_ses_permissions]
  name          = "forward-email-s3-lambda"
  rule_set_name = aws_ses_receipt_rule_set.forward_email.rule_set_name
  recipients    = var.emails_addresses_to_receive_emails_from
  enabled       = true
  scan_enabled  = true
  tls_policy    = "Require"
  s3_action {
    bucket_name       = "${var.domain_name}-email"
    object_key_prefix = var.s3_email_inbox_prefix
    position          = 1
  }
  lambda_action {
    function_arn    = aws_lambda_function.forward_email_lambda.arn
    position        = 2
    invocation_type = "Event"
  }
}

resource "aws_lambda_permission" "forward_email_lambda_ses_permissions" {
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.forward_email_lambda.function_name
  principal      = "ses.amazonaws.com"
  source_account = var.current_aws_account_id
}

resource "aws_lambda_permission" "forward_email_lambda_ses_permissions_fix" {
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.forward_email_lambda.function_name
  principal      = "ses.amazonaws.com"
  source_account = var.current_aws_account_id
  source_arn     = aws_ses_receipt_rule.forward_email_s3_lambda.arn
  depends_on = [
    aws_lambda_permission.forward_email_lambda_ses_permissions
  ]
}

resource "aws_lambda_permission" "forward_email_lambda_s3_permissions" {
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.forward_email_lambda.function_name
  principal      = "s3.amazonaws.com"
  source_account = var.current_aws_account_id
  source_arn     = var.s3_email_bucket_arn
}

data "aws_iam_policy_document" "ses_allow_s3_access" {
  statement {
    sid       = "AllowSESPutObject"
    effect    = "Allow"
    actions   = ["s3:PutObject"]
    resources = ["${var.s3_email_bucket_arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:Referer"
      values   = [var.current_aws_account_id]
    }
  }
}

resource "aws_s3_bucket_policy" "ses_allow_s3_access" {
  bucket = var.s3_email_bucket_name
  policy = data.aws_iam_policy_document.ses_allow_s3_access.json
}
resource "aws_s3_bucket_notification" "static_web_email_forwarder" {
  depends_on = [
    aws_lambda_function.forward_email_lambda,
    aws_lambda_permission.forward_email_lambda_s3_permissions,
    aws_iam_role_policy_attachment.forward_email_lambda
  ]
  bucket = var.s3_email_bucket_name
  lambda_function {
    lambda_function_arn = aws_lambda_function.forward_email_lambda.arn
    events = [
      "s3:ObjectCreated:Put",
      "s3:ObjectCreated:Post"
    ]
    filter_prefix = "${var.s3_contact_form_message_prefix}/"
  }
}
