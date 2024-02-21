#!/bin/bash

source common.sh

DOMAIN_NAME=$(grep -Eo '^domain_name\s+=\s+"[^"]+"$' ../terraform/terraform.tfvars | cut -d '=' -f 2 | tr -d '"' | tr -d ' ')
yes_or_no_question "Are you sure you want to ${RED}destroy${RESET} ALL provisioned `
                   `${PURPLE}infrastructure${RESET} for ${CYAN}$DOMAIN_NAME${RESET}?"
retry_count=3
if [[ $QUESTION_ANSWER == 1 ]]; then
    while [ $retry_count -ge 0 ]; do
        if (
            cd ../terraform && terraform destroy --var-file="secrets.tfvars" -auto-approve
        ) then
            echo " "
            echo -e "All ${PURPLE}infrastructure${RESET} has been ${GREEN}successfully${RESET} destroyed!"
            break
        else
            ((retry_count--))
            echo " "
            if [ $retry_count -lt 0 ]; then
                echo -e "${RED}Failed${RESET} to destroy all infrastructure."
                exit 1
            else
                echo -e "Some resources could not be destroyed, ${YELLOW}retrying...${RESET}"
            fi
        fi
    done
fi

yes_or_no_question "Do you also want to ${RED}destroy${RESET} infrastructure for ${PURPLE}Terraform State${RESET}?"
if [[ $QUESTION_ANSWER == 1 ]]; then
    ./destroy_remote_tfstate.sh "$DOMAIN_NAME"
fi
