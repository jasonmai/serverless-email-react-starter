module "dns_ssl" {
  source = "./modules/dns_ssl"
  providers = {
    aws.us-east-1 = aws.us-east-1
  }
  domain_name            = var.domain_name
  additional_domain_name = var.additional_domain_name
  common_tags            = var.common_tags
}

module "static_website" {
  source = "./modules/static_website"
  providers = {
    aws.us-east-1 = aws.us-east-1
  }
  domain_name                      = var.domain_name
  additional_domain_name           = var.additional_domain_name
  main_domain_hosted_zone_id       = module.dns_ssl.main_domain_hosted_zone_id
  additional_domain_hosted_zone_id = module.dns_ssl.additional_domain_hosted_zone_id
  acm_ssl_certificate_arn          = module.dns_ssl.acm_ssl_certificate_arn
  common_tags                      = var.common_tags
}

module "ses" {
  source                     = "./modules/ses"
  region                     = var.region
  domain_name                = var.domain_name
  main_domain_hosted_zone_id = module.dns_ssl.main_domain_hosted_zone_id
  emails_to_create           = var.emails_to_create
  personal_emails_to_verify  = var.personal_emails_to_verify
  common_tags                = var.common_tags
}

module "contact_form" {
  source                         = "./modules/contact_form"
  region                         = var.region
  current_aws_account_id         = data.aws_caller_identity.current.account_id
  domain_name                    = var.domain_name
  main_domain_hosted_zone_id     = module.dns_ssl.main_domain_hosted_zone_id
  cors_origin                    = var.cors_origin
  acm_ssl_certificate_arn        = module.dns_ssl.acm_ssl_certificate_arn
  s3_contact_form_message_prefix = var.s3_contact_form_message_prefix
  send_to_email                  = module.ses.first_created_email_identity
  common_tags                    = var.common_tags
  recaptcha_verification_url     = var.recaptcha_verification_url
  recaptcha_secret_key           = var.recaptcha_secret_key
}

module "email_forwarder" {
  source                                  = "./modules/email_forwarder"
  current_aws_account_id                  = data.aws_caller_identity.current.account_id
  domain_name                             = var.domain_name
  s3_email_bucket_name                    = module.contact_form.s3_email_bucket_name
  s3_email_bucket_arn                     = module.contact_form.s3_email_bucket_arn
  s3_email_inbox_prefix                   = var.s3_email_inbox_prefix
  s3_contact_form_message_prefix          = var.s3_contact_form_message_prefix
  emails_addresses_to_receive_emails_from = var.emails_to_create
  forward_emails_to                       = module.ses.first_personal_email_identity_to_verify
  from_sender_of_forwarded_emails         = module.ses.first_created_email_identity
  common_tags                             = var.common_tags
}

module "static_website_files" {
  source                        = "./modules/static_website_files"
  web_dist_dir                  = var.web_dist_dir
  s3_static_content_bucket_name = module.static_website.s3_static_content_bucket_name
}
