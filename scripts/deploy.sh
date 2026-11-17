#!/usr/bin/env bash

# Creates or updates the PuzzleOps CloudFormation stack. On success, stdout
# contains only the EC2 Elastic IP so Jenkins can use it as the deploy target.
set -euo pipefail

usage() {
    cat >&2 <<'USAGE'
Usage: scripts/deploy.sh --stack-name NAME --region REGION --key-name KEY_NAME --ssh-cidr CIDR [--notification-email EMAIL]

Required:
  --stack-name          CloudFormation stack name, for example puzzleops-stack
  --region              AWS region, for example ap-south-1
  --key-name            Existing EC2 key-pair name (not a .pem file path)
  --ssh-cidr            Public CIDR of the Jenkins server, for example 203.0.113.10/32

Optional:
  --notification-email  Email address for CloudWatch alarm notifications
USAGE
}

stack_name=''
region=''
key_name=''
ssh_cidr=''
notification_email=''

while [[ $# -gt 0 ]]; do
    case "$1" in
        --stack-name)
            stack_name="${2:-}"
            shift 2
            ;;
        --region)
            region="${2:-}"
            shift 2
            ;;
        --key-name)
            key_name="${2:-}"
            shift 2
            ;;
        --ssh-cidr)
            ssh_cidr="${2:-}"
            shift 2
            ;;
        --notification-email)
            notification_email="${2:-}"
            shift 2
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            printf 'Unknown argument: %s\n' "$1" >&2
            usage
            exit 2
            ;;
    esac
done

for required in stack_name region key_name ssh_cidr; do
    if [[ -z "${!required}" ]]; then
        printf 'Missing required option: %s\n' "${required//_/-}" >&2
        usage
        exit 2
    fi
done

command -v aws >/dev/null || {
    echo 'AWS CLI is required on the Jenkins agent.' >&2
    exit 1
}

template_file='infra/template.yaml'
[[ -f "$template_file" ]] || {
    printf 'CloudFormation template not found: %s\n' "$template_file" >&2
    exit 1
}

aws sts get-caller-identity --region "$region" --no-cli-pager >/dev/null
aws cloudformation validate-template \
    --region "$region" \
    --template-body "file://$template_file" \
    --no-cli-pager >/dev/null

parameters=(
    "KeyName=$key_name"
    "SshAllowedCidr=$ssh_cidr"
    "NotificationEmail=$notification_email"
)

echo "Creating or updating CloudFormation stack: $stack_name" >&2
aws cloudformation deploy \
    --region "$region" \
    --stack-name "$stack_name" \
    --template-file "$template_file" \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides "${parameters[@]}" \
    --tags Application=PuzzleOps ManagedBy=CloudFormation \
    --no-fail-on-empty-changeset \
    --no-cli-pager >&2

website_ip="$(aws cloudformation describe-stacks \
    --region "$region" \
    --stack-name "$stack_name" \
    --query "Stacks[0].Outputs[?OutputKey=='WebsiteIP'].OutputValue | [0]" \
    --output text \
    --no-cli-pager)"

if [[ -z "$website_ip" || "$website_ip" == 'None' ]]; then
    echo 'CloudFormation did not return WebsiteIP.' >&2
    exit 1
fi

printf '%s\n' "$website_ip"
