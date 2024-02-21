variable "region" {
  type = object({
    main : string
    us-east-1 : string
  })
  description = "AWS region for resources to be created"
}

variable "domain_name" {
  type        = string
  description = "Route53 web domain name the resources should be attached to"
}

variable "additional_domain_name" {
  type        = string
  default     = ""
  description = "(OPTIONAL) An additional domain name that Route53 will map to the main domain name"
}

variable "cors_origin" {
  type        = string
  description = "CORS accepted origin (use domain name or * for no restrictions)"
}

variable "emails_to_create" {
  type        = list(string)
  description = "List of email address identities to create"
}

variable "personal_emails_to_verify" {
  type        = list(string)
  description = "List of existing personal emails you own that you want to add to AWS to be verified"
}

variable "s3_email_inbox_prefix" {
  type        = string
  description = "Prefix of directory/folder in email s3 bucket that incoming emails should be stored in"
}

variable "s3_contact_form_message_prefix" {
  type        = string
  description = "Prefix of directory/folder in email s3 bucket that incoming messages from the contact form api should be stored in"
}

variable "common_tags" {
  type = object({
    application : string
  })
  description = "Common tags to be attached to created resources"
}

variable "recaptcha_verification_url" {
  type        = string
  description = "URL for verifying Google reCaptcha tokens"
}

variable "recaptcha_secret_key" {
  type        = string
  description = "Secret key for server side Google reCaptcha"
}

variable "web_dist_dir" {
  type        = string
  description = "Directory path to the static website's distribution files that will be uploaded (relative to terraform root)"
}
