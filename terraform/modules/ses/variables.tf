variable "region" {
  type = object({
    main : string
    us-east-1 : string
  })
}

variable "domain_name" {
  type = string
}

variable "main_domain_hosted_zone_id" {
  type = string
}

variable "emails_to_create" {
  type = list(string)
}

variable "personal_emails_to_verify" {
  type = list(string)
}

variable "common_tags" {
  type = object({
    application : string
  })
}

