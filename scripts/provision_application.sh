#!/bin/bash

source common.sh

TERRAFORM_INITIALIZED=0
DOMAIN_NAME=$2
REGION="us-east-1"
RECAPTCHA_SITE_KEY=""
RECAPTCHA_SECRET_KEY=""
IS_EMAIL_VALID=1
NUM_CUSTOM_EMAILS=0
CUSTOM_EMAILS=()
CUSTOM_EMAILS_STR=""
PERSONAL_EMAIL_ADDRESS=""
validate_email() {
    valid_email_regex='^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if [[ $1 =~ $valid_email_regex ]]; then
        IS_EMAIL_VALID=1
    else
        echo -e "${RED}Invalid${RESET} email address: ${RED}$1${RESET}"
        IS_EMAIL_VALID=0
    fi
}
if [[ ! ($1 ==  "--skip-backend-prompts" || $1 == "--skip-all-prompts") ]]; then
    yes_or_no_question "Have you ran the ${CYAN}provision_tfstate_and_application.sh${RESET} script? (optional)"
    if [[ $QUESTION_ANSWER == 1 ]]; then
        TERRAFORM_INITIALIZED=1
    else
        yes_or_no_question "Do you have ${PURPLE}Terraform installed${RESET} and ${RED}AWS CLI set up${RESET} with credentials?"
        exit_if_no "Please install ${PURPLE}Terraform${RESET} and set up ${RED}AWS CLI${RESET} before continuing." 1
        yes_or_no_question "Do you own a ${YELLOW}registered domain name${RESET} in ${RED}Route53${RESET}?"
        exit_if_no "Sorry, you will need to have a ${YELLOW}registered domain name${RESET} in ${RED}Route53${RESET} before continuing." 1
        yes_or_no_question "Do you have a ${RED}local backend${RESET} configured?\r\n`
                           `(since ${CYAN}provision_tfstate_and_application.sh${RESET} was not used)"
        exit_if_no "Please configure the ${RED}local backend${RESET} in the ${CYAN}terraform/provider.tf${RESET} before continuing.\r\n`
                   `(uncomment ${YELLOW}'backend \"local\"'${RESET} section and comment out ${YELLOW}backend \"s3\"${RESET}`
                   ` - see ${GREEN}README.md${RESET} for more information)"
    fi
else
    TERRAFORM_INITIALIZED=1
fi

if [[ ! $1 == "--skip-all-prompts" ]]; then
    yes_or_no_question "Have you registered a ${GREEN}Google reCAPTCHA ${YELLOW}Challenge (v2)${RESET} `
                       `\"${CYAN}Invisible${RESET}\" site, and received a ${RED}SITE KEY${RESET} and a ${RED}SECRET KEY${RESET}?"
    exit_if_no "Please ${RED}register${RESET} a new ${GREEN}Google reCAPTCHA${RESET} site, with setting `
               `${YELLOW}Challenge (v2)${RESET} \"${CYAN}Invisible${RESET}\" before continuing." 1
    yes_or_no_question "Have you ${RED}configured${RESET} the following files?`
                       `\r\n    * ${YELLOW}app/${CYAN}.env${RESET}`
                       `\r\n    * ${YELLOW}terraform/${CYAN}terraform.tfvars${RESET}`
                       `\r\n    * ${YELLOW}terraform/${CYAN}secrets.tfvars${RESET}"
    if [[ $QUESTION_ANSWER == 0 ]]; then
        yes_or_no_question "Do you want ${BLUE}this script${RESET} to ${PURPLE}auto create/configure${RESET} these files?"
        exit_if_no "Please ${RED}configure${RESET} the following files before continuing:`
                           `\r\n    * ${YELLOW}app/${CYAN}.env${RESET}`
                           `\r\n    * ${YELLOW}terraform/${CYAN}terraform.tfvars${RESET}`
                           `\r\n    * ${YELLOW}terraform/${CYAN}secrets.tfvars${RESET}" 1
        QUESTION_ANSWER=0
        if [ -n "$DOMAIN_NAME" ]; then
            yes_or_no_question "Your domain name is ${CYAN}$DOMAIN_NAME${RESET}?"
        fi
        if [[ $QUESTION_ANSWER == 0 ]]; then
            echo " "
            echo -e -n "Enter your ${CYAN}Domain Name${RESET} (i.e. example.com): "
            read -r DOMAIN_NAME
        fi
        validate_domain "$DOMAIN_NAME"
        yes_or_no_question "Do you want to use ${RED}us-east-1${RESET} as the ${BLUE}region${RESET} for ${YELLOW}AWS resources${RESET}?"
        if [[ $QUESTION_ANSWER == 0 ]]; then
            echo " "
            echo -e -n "Enter the ${RED}region${RESET} you want to use: "
            read -r REGION
        fi
        echo " "
        echo -e -n "Enter your ${GREEN}Google reCAPTCHA ${YELLOW}Challenge (v2)${RESET} \"${CYAN}Invisible${RESET}\" ${RED}SITE KEY${RESET} (client key): "
        read -r RECAPTCHA_SITE_KEY
        echo " "
        echo -e -n "Enter your ${GREEN}Google reCAPTCHA ${YELLOW}Challenge (v2)${RESET} \"${CYAN}Invisible${RESET}\" ${RED}SECRET KEY${RESET} (server key): "
        read -r RECAPTCHA_SECRET_KEY
        yes_or_no_question "Do you want to create ${BLUE}default email addresses${RESET}? `
                           `(i.e. ${GREEN}mail${CYAN}@${DOMAIN_NAME}${RESET} and ${GREEN}hello${CYAN}@${DOMAIN_NAME}${RESET})`
                           `\r\nMore can be added later through ${RED}AWS SES${RESET}. Type ${GREEN}no${RESET} to define your own right now."
        if [[ $QUESTION_ANSWER == 0 ]]; then
            echo " "
            echo -e "How many ${BLUE}custom email${RESET} addresses do you want to create on ${CYAN}@${DOMAIN_NAME}${RESET}"
            echo -n "    (please enter a number): "
            read -r NUM_CUSTOM_EMAILS
            if ! [[ $NUM_CUSTOM_EMAILS =~ ^[0-9]+$ ]]; then
                echo "Error: Not a valid number. Please enter a valid number."
                exit 1
            fi
            email_num=1
            custom_email=""
            declare -A dupes
            for ((i = 1; i <= NUM_CUSTOM_EMAILS; i++)); do
                echo " "
                echo -e "Please enter ${BLUE}custom email${RESET} ${YELLOW}${email_num}${RESET}."
                echo -e -n "(enter the ${RED}local${RESET} part without the domain - ${RED}local${CYAN}@${DOMAIN_NAME}${RESET}): "
                read -r custom_email
                validate_email "$custom_email@$DOMAIN_NAME"
                if [[ $IS_EMAIL_VALID == 0 ]]; then
                    ((i--))
                elif [[ -n "${dupes[$custom_email]}" ]]; then
                    echo " "
                    echo -e "${RED}Duplicate${RESET} email found: ${RED}$custom_email@$DOMAIN_NAME${RESET}"
                    ((i--))
                else
                    CUSTOM_EMAILS+=("$custom_email")
                    dupes["$custom_email"]=1
                    ((email_num++))
                fi
            done
        fi
        echo " "
        echo -e "Please enter your ${BLUE}personal email address${RESET}, where emails will be forwarded to."
        echo -e -n "(i.e. ${BLUE}<my_email>@gmail.com${RESET}): "
        read -r PERSONAL_EMAIL_ADDRESS
        validate_email "$PERSONAL_EMAIL_ADDRESS"
        if [[ $IS_EMAIL_VALID == 0 ]]; then
          echo -e "${RED}Invalid${RESET} personal email address: ${RED}$PERSONAL_EMAIL_ADDRESS${RESET}"
          exit 1
        fi

        echo " "
        echo "Configurations with the following properties will be created: "
        echo -e "    Domain Name           : ${CYAN}${DOMAIN_NAME}${RESET}"
        echo -e "    Region                : ${RED}${REGION}${RESET}"
        echo -e "    RECAPTCHA_SITE_KEY    : ${GREEN}${RECAPTCHA_SITE_KEY}${RESET}"
        echo -e "    RECAPTCHA_SECRET_KEY  : ${GREEN}${RECAPTCHA_SECRET_KEY}${RESET}"
        if [ ${#CUSTOM_EMAILS[@]} -eq 0 ]; then
            CUSTOM_EMAILS+=("mail")
            CUSTOM_EMAILS+=("hello")
        fi
        CUSTOM_EMAILS_STR="emails_to_create = ["
        echo " "
        echo -e "Custom email addresses that will be created:"
        for identity in "${CUSTOM_EMAILS[@]}"; do
            echo -e "    * ${GREEN}$identity${CYAN}@$DOMAIN_NAME${RESET}"
            CUSTOM_EMAILS_STR+="\r\n  \"$identity@$DOMAIN_NAME\","
        done
        CUSTOM_EMAILS_STR="${CUSTOM_EMAILS_STR%?}\r\n]"
        echo " "
        echo -e "Personal email address emails will be forwarded to: ${GREEN}$PERSONAL_EMAIL_ADDRESS${RESET}"
        echo "(emails going to the custom email addresses will be forwarded to your personal address)"
        press_to_continue

        echo " "
        if (
            cd ../app && cp .env.template .env && \
            sed -i "s/https.*$/https\:\/\/api\.${DOMAIN_NAME}\/contact/g" .env && \
            sed -i "s/TEST_TOKEN$/${RECAPTCHA_SITE_KEY}/g" .env
        ) then
            echo -e "${YELLOW}app/${CYAN}.env${RESET} created successfully"
        else
            echo " "
            echo -e "${RED}Failed${RESET} to create ${YELLOW}app/${CYAN}.env${RESET}."
            exit 1
        fi
        if (
            cd ../terraform && cp secrets.tfvars.template secrets.tfvars && \
            sed -i "s/\"\"$/\"${RECAPTCHA_SECRET_KEY}\"/g" secrets.tfvars
        ) then
            echo -e "${YELLOW}terraform/${CYAN}secrets.tfvars${RESET} created successfully"
        else
            echo " "
            echo -e "${RED}Failed${RESET} to create ${YELLOW}terraform/${CYAN}secrets.tfvars${RESET}."
            exit 1
        fi
        if (
            cd ../terraform && cp terraform.tfvars.template terraform.tfvars && \
            sed -i "s/example\.com/${DOMAIN_NAME}/g" terraform.tfvars && \
            sed -i "s/^emails_to_create[[:space:]]*=[[:space:]]*\[.*\]$/${CUSTOM_EMAILS_STR}/g" terraform.tfvars && \
            sed -i "s/my_personal_email@gmail\.com/${PERSONAL_EMAIL_ADDRESS}/g" terraform.tfvars && \
            sed -i "s/^[[:space:]]*main[[:space:]]*=[[:space:]]*\"us-east-1\"$/  main = \"${REGION}\"/g" terraform.tfvars && \
            terraform fmt -recursive
        ) then
            echo -e "${YELLOW}terraform/${CYAN}terraform.tfvars${RESET} created successfully"
        else
            echo " "
            echo -e "${RED}Failed${RESET} to create ${YELLOW}terraform/${CYAN}terraform.tfvars${RESET}."
            exit 1
        fi
    fi
fi


step_num=1
if [[ $TERRAFORM_INITIALIZED == 0 ]]; then
    press_to_continue "${YELLOW}$step_num.${RESET} Initialize ${PURPLE}Terraform${RESET}"
    if (
        cd ../terraform && terraform init
    ) then
        echo " "
        ((step_num++))
    else
        echo " "
        echo -e "${RED}Failed${RESET} to initialize Terraform project with remote backend."
        exit 1
    fi
fi
if [[ ! $1 == "--skip-all-prompts" ]]; then
    press_to_continue "${YELLOW}$step_num. ${GREEN}Install${RESET} and ${GREEN}Build ${RED}AWS Lambdas${RESET}
        (this may take about ${YELLOW}~8 seconds${RESET})"
fi
if (
    cd ../lambdas && npm ci && npm run build
) then
    echo " "
    ((step_num++))
else
    echo " "
    echo -e "${RED}Failed${RESET} to NPM install and build AWS Lambda functions."
    exit 1
fi
if [[ ! $1 == "--skip-all-prompts" ]]; then
    press_to_continue "${YELLOW}$step_num. ${GREEN}Install${RESET} and ${GREEN}Build ${RED}Vite + React + TypeScript + reCAPTCHA Application${RESET}
        (this may take about ${YELLOW}~15 seconds${RESET})"
fi
if (
    cd ../app && npm ci && npm run build
) then
    echo " "
    ((step_num++))
else
    echo " "
    echo -e "${RED}Failed${RESET} to NPM install and build Vite + React + TypeScript + reCAPTCHA application."
    exit 1
fi
if [[ ! $1 == "--skip-all-prompts" ]]; then
    press_to_continue "${YELLOW}$step_num. ${GREEN}Deploy${RESET} infrastructure with ${PURPLE}Terraform apply${RESET}
        (this may take about ${RED}~10 minutes${RESET} for the first time)"
fi
if (
    cd ../terraform && terraform apply --var-file="secrets.tfvars" -auto-approve
) then
    echo " "
    echo -e "${YELLOW}Serverless${RED} Static Website ${CYAN}Application${RESET} and ${PURPLE}Infrastructure ${GREEN}successfully deployed${RESET}!"
else
    echo " "
    echo -e "${RED}Failed${RESET} to deploy serverless static website application and infrastructure."
    exit 1
fi

echo " "
if [[ ! $1 == "--skip-all-prompts" ]]; then
    echo -e "All operations ${GREEN}completed successfully${RESET}!"
    exit 0
fi
yes_or_no_question "Would you like to ${RED}invalidate${RESET} the ${PURPLE}CloudFront${RESET} caches `
                   `so you can see your changes right away?\r\n`
                   `(Please type ${GREEN}no${RESET} and ignore this if it is the first deployment)"
if [[ $QUESTION_ANSWER == 1 ]]; then
    if [ -z "$DOMAIN_NAME" ]; then
      DOMAIN_NAME=$(grep -Eo '^domain_name\s+=\s+"[^"]+"$' ../terraform/terraform.tfvars | cut -d '=' -f 2 | tr -d '"' | tr -d ' ')
    fi
    distribution_id=$(aws cloudfront list-distributions --query "DistributionList.Items[*].{id:Id,origin:Origins.Items[0].Id}[?origin=='$DOMAIN_NAME-origin'].id" --output text)
    create_invalidation_output=$(aws cloudfront create-invalidation --distribution-id "$distribution_id" --paths '/*')
    exit_status=$?
    echo "$create_invalidation_output" | tee /dev/tty
    if [ $exit_status -eq 0 ]; then
        echo " "
        echo -e "${PURPLE}CloudFront${RESET} cache invalidation ${BLUE}created${RESET}. You may need to wait a minute to see changes."
        echo " "
        echo -e "All operations ${GREEN}completed successfully${RESET}!"
    else
        echo " "
        echo -e "${RED}Error${RESET} creating CloudFront cache invalidation."
        exit 1
    fi
else
    echo " "
    echo -e "All operations ${GREEN}completed successfully${RESET}!"
fi

