terraform {
  required_version = ">= 1.2.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.35.0"
    }
  }
  backend "local" {
    path = ".terraform/tfstate/terraform.tfstate"
  }
}

provider "aws" {
  region = "us-east-1"
}
