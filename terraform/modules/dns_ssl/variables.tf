variable "domain_name" {
  type = string
}

variable "additional_domain_name" {
  type    = string
  default = ""
}

variable "common_tags" {
  type = object({
    application : string
  })
}

