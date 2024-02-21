# common.sh
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[0;37m'
RESET='\033[0m'

QUESTION_ANSWER=0
validate_domain() {
    domain_regex="^[A-Za-z0-9]([A-Za-z0-9\\-]{0,61}[A-Za-z0-9])?\\.[A-Za-z]{2,6}$"
    if [[ ! $1 =~ $domain_regex ]]; then
        echo -e "${CYAN}Domain Name ${RED}'$1'${RESET} is ${RED}invalid${RESET}."
        exit 1
    fi
}
yes_or_no_question() {
    echo " "
    echo -e "$1"
    echo -e -n "    (enter ${GREEN}yes${RESET} or ${GREEN}no${RESET} to continue): "
    read -r question_answer
    question_answer=$(echo "$question_answer" | tr '[:upper:]' '[:lower:]')
    if [[ $question_answer ==  "yes" || $question_answer == "y" ]]; then
        QUESTION_ANSWER=1
    else
        QUESTION_ANSWER=0
    fi
}
exit_if_no() {
    if [[ $QUESTION_ANSWER == 0 ]]; then
        echo " "
        echo -e "$1"
        if [ -n "$2" ]; then
          echo -e "(see ${GREEN}README.md${RESET} for more information)"
        fi
        exit 1
    fi
}
press_to_continue() {
    while read -r -t 0; do
        read -r -n 1 -t 0.01
    done
    if [ -n "$1" ]; then
        echo " "
        echo -e "$1"
    fi
    echo " "
    echo -e "(${GREEN}Press any key to continue${RESET} or ${YELLOW}CTRL${RESET}+${YELLOW}C${RESET} to cancel)"
    read -n 1 -s -r -p ""
    echo " "
    echo "continuing ..."
}
