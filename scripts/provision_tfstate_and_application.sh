#!/bin/bash

source common.sh

yes_or_no_question "Do you have ${PURPLE}Terraform installed${RESET} and ${RED}AWS CLI set up${RESET} with credentials?"
exit_if_no "Please install ${PURPLE}Terraform${RESET} and set up ${RED}AWS CLI${RESET} before continuing.`
           `\r\n(see ${GREEN}README.md${RESET} for more information)"
yes_or_no_question "Do you own a ${YELLOW}registered domain name${RESET} in ${RED}Route53${RESET}?"
exit_if_no "Sorry, you will need to have a ${YELLOW}registered domain name${RESET} in ${RED}Route53${RESET} before continuing.`
           `\r\n(see ${GREEN}README.md${RESET} for more information)"
echo " "
echo -e -n "Enter your ${CYAN}Domain Name${RESET} (i.e. example.com): "
read -r domain_name
validate_domain "$domain_name"

state_bucket_name="terraform-tfstate-$domain_name-web"
state_table_name="terraform-tfstate-${domain_name/./_}-web"
echo " "
echo -e "The following ${RED}AWS resources${RESET} will be created to manage ${PURPLE}Terraform state${RESET} remotely: "
echo " "
echo -e "    * ${RED}S3 bucket${RESET}:      ${YELLOW}$state_bucket_name${RESET}"
echo -e "    * ${BLUE}DynamoDB Table${RESET}: ${YELLOW}$state_table_name${RESET}"
press_to_continue

if (
    cd ../terraform-remote-backend || exit 1
    terraform init && terraform apply -var "domain_name=$domain_name" -auto-approve
) then
    echo " "
    echo -e "${PURPLE}Terraform state${RESET} management backend ${GREEN}successfully created${RESET}!"
else
    echo " "
    echo -e "${RED}Failed${RESET} to create backend components for Terraform state."
    echo "(Do you have existing components with the same name?)"
    exit 1
fi

if (
    cd ../terraform || exit 1
    terraform init \
          -backend-config "bucket=$state_bucket_name" \
          -backend-config "key=prod/terraform.tfstate" \
          -backend-config "region=us-east-1" \
          -backend-config "dynamodb_table=$state_table_name"
) then
    echo " "
    echo -e  "${PURPLE}Terraform project ${GREEN}successfully initialized${RESET} with remote backend!"
else
    echo " "
    echo -e "${RED}Failed${RESET} to initialize Terraform project with remote backend."
    exit 1
fi
echo " "

yes_or_no_question "Continue to provision the ${GREEN}Static Website Application${RESET} and its ${CYAN}Infrastructure${RESET}?: "
if [[ $QUESTION_ANSWER == 1 ]]; then
    ./provision_application.sh --skip-backend-prompts "$domain_name"
else
    exit 0
fi
