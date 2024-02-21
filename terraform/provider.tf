terraform {
  required_version = ">= 1.2.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.35.0"
    }
  }
  # Uncomment this and comment out the backend "s3" {} line if you prefer local backend.
  #  backend "local" {
  #    path = "tfstate/terraform.tfstate"
  #  }
  backend "s3" {
    # NOTE: These values are here for reference. The provision_tfstate_and_application.sh
    #       script enters these values through the CLI.
    #    bucket         = "terraform-tfstate-${var.domain_name}-web"
    #    key            = "prod/terraform.tfstate"
    #    region         = "us-east-1"
    #    dynamodb_table = "terraform-tfstate-${replace(var.domain_name, ".", "_")}-web"
  }
}

provider "aws" {
  region = var.region.main
}

provider "aws" {
  alias  = "us-east-1"
  region = var.region.us-east-1
}

data "aws_caller_identity" "current" {}

