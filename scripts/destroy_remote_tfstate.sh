#!/bin/bash

source common.sh

DOMAIN_NAME=$1
yes_or_no_question "Are you sure you want to ${RED}destroy${RESET} infrastructure provisioned for ${PURPLE}Terraform State${RESET}?"
if [[ $QUESTION_ANSWER == 0 ]]; then
    exit 0
fi
press_to_continue "If you still have ${PURPLE}provisioned infrastructure${RESET} for the application, `
                  `you may need to remove these ${RED}manually${RESET} after"

destroy_cmd="terraform destroy -auto-approve"
if [ -n "$DOMAIN_NAME" ]; then
    destroy_cmd+=" -var=\"domain_name=${DOMAIN_NAME}\""
fi

if (
    cd ../terraform_remote_backend && eval "$destroy_cmd"
) then
    echo " "
    echo -e "All ${PURPLE}infrastructure${RESET} has been ${GREEN}successfully${RESET} destroyed!"
else
    echo " "
    echo -e "${RED}Failed${RESET} to destroy all infrastructure."
    exit 1
fi
