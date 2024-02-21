variable "current_aws_account_id" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "s3_email_bucket_name" {
  type = string
}

variable "s3_email_bucket_arn" {
  type = string
}

variable "s3_email_inbox_prefix" {
  type = string
}

variable "s3_contact_form_message_prefix" {
  type = string
}

variable "emails_addresses_to_receive_emails_from" {
  type = list(string)
}

variable "forward_emails_to" {
  type = string
}

variable "from_sender_of_forwarded_emails" {
  type = string
}

variable "common_tags" {
  type = object({
    application : string
  })
}
