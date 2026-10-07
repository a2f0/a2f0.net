#!/bin/sh
set -eu

case ${1:-} in
  '') preview_only=false ;;
  --dry-run) preview_only=true ;;
  *) echo 'Usage: terraform/apply.sh [--dry-run]' >&2; exit 2 ;;
esac
[ "$#" -le 1 ] || exit 2
cd "$(dirname "$0")"

# Inherited Terraform arguments can change plan mode or skip provider refresh.
# This entrypoint owns every flag used for its reviewed saved plan.
if env | grep -Eq '^(TF_CLI_ARGS(=|_)|TF_DATA_DIR=|TF_WORKSPACE=|AWS_ENDPOINT_URL(=|_)|AWS_S3_ENDPOINT=)'; then
  echo 'Unset Terraform CLI, workspace and AWS endpoint overrides before the guarded plan' >&2
  exit 1
fi
# The AWS SDK must also ignore endpoint URLs in the selected credentials profile.
export AWS_IGNORE_CONFIGURED_ENDPOINT_URLS=true

# Use the existing real S3 backend and default workspace, never a local or
# replacement backend. Missing credentials or state stop before any apply.
bun ../scripts/terraformPlan.ts backend .terraform/terraform.tfstate
[ "$(terraform workspace show)" = default ] || {
  echo 'Unexpected Terraform workspace' >&2
  exit 1
}
# No provisioners or external data programs are part of the reviewed stack.
# This scans ignored overrides and JSON sources without requiring ripgrep.
bun ../scripts/terraformPlan.ts sources .

umask 077
plan_directory=$(mktemp -d "${TMPDIR:-/tmp}/a2f0-terraform.XXXXXX")
trap 'rm -rf "$plan_directory"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
terraform version -json > "$plan_directory/version.json"
bun ../scripts/terraformPlan.ts version "$plan_directory/version.json"
# Read actual remote state; a matching backend file alone is insufficient.
terraform state pull > "$plan_directory/state-before.json"
bun ../scripts/terraformPlan.ts state "$plan_directory/state-before.json" main.tfvars.json
terraform plan -input=false -lock=true -refresh=true -var-file=main.tfvars.json -out="$plan_directory/plan"
terraform show -json "$plan_directory/plan" > "$plan_directory/plan.json"
bun ../scripts/terraformPlan.ts plan "$plan_directory/plan.json"

bun ../scripts/terraformPlan.ts backend .terraform/terraform.tfstate
[ "$(terraform workspace show)" = default ] || exit 1
terraform version -json > "$plan_directory/version.json"
bun ../scripts/terraformPlan.ts version "$plan_directory/version.json"
terraform state pull > "$plan_directory/state-after.json"
bun ../scripts/terraformPlan.ts state "$plan_directory/state-after.json" main.tfvars.json
cmp -s "$plan_directory/state-before.json" "$plan_directory/state-after.json" || {
  echo 'Remote state changed during preview; generate a fresh plan' >&2
  exit 1
}

if [ "$preview_only" = false ]; then
  # Consume the exact inspected saved plan, not a new implicit plan.
  terraform apply -input=false "$plan_directory/plan"
fi
