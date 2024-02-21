locals {
  common_tags = {
    application = "${var.domain_name}-web"
  }
  unique_bucket_name = "terraform-tfstate-${var.domain_name}-web"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = local.unique_bucket_name
  tags   = local.common_tags

  force_destroy = true
  lifecycle {
    prevent_destroy = false
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "terraform_state_lock" {
  name           = "terraform-tfstate-${replace(var.domain_name, ".", "_")}-web"
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "LockID"
  tags           = local.common_tags
  attribute {
    name = "LockID"
    type = "S"
  }
}
