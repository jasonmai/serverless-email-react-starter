variable "domain_name" {
  type = string
}

variable "additional_domain_name" {
  type    = string
  default = ""
}

variable "main_domain_hosted_zone_id" {
  type = string
}

variable "additional_domain_hosted_zone_id" {
  type = string
}

variable "acm_ssl_certificate_arn" {
  type = string
}

variable "common_tags" {
  type = object({
    application : string
  })
}
