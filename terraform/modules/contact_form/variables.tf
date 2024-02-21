variable "region" {
  type = object({
    main : string
    us-east-1 : string
  })
}

variable "current_aws_account_id" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "main_domain_hosted_zone_id" {
  type = string
}

variable "cors_origin" {
  type = string
}

variable "acm_ssl_certificate_arn" {
  type = string
}

variable "s3_contact_form_message_prefix" {
  type = string
}

variable "send_to_email" {
  type = string
}

variable "recaptcha_secret_key" {
  type = string
}

variable "recaptcha_verification_url" {
  type = string
}

variable "common_tags" {
  type = object({
    application : string
  })
}

