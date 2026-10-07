#!/bin/sh
set -eu

case ${1:-} in
  '') preview_only=false ;;
  --dry-run) preview_only=true ;;
  *) echo 'Usage: terraform/apply.sh [--dry-run]' >&2; exit 2 ;;
esac
[ "$#" -le 1 ] || exit 2
cd "$(dirname "$0")"

# Use the existing real S3 backend and default workspace, never a local or
# replacement backend. Missing credentials or state stop before any apply.
bun ../scripts/terraformPlan.ts backend .terraform/terraform.tfstate
[ "$(terraform workspace show)" = default ] || {
  echo 'Unexpected Terraform workspace' >&2
  exit 1
}
# No provisioners or external data programs are part of the reviewed stack.
scan_status=0
rg --quiet 'provisioner\s+"|data\s+"external"' --glob '*.tf' . || scan_status=$?
case "$scan_status" in
  1) ;;
  0) echo 'Unreviewed provisioner or external data program' >&2; exit 1 ;;
  *) echo 'Could not inspect Terraform executable configuration' >&2; exit 1 ;;
esac

umask 077
plan_directory=$(mktemp -d "${TMPDIR:-/tmp}/a2f0-terraform.XXXXXX")
trap 'rm -rf "$plan_directory"' EXIT HUP INT TERM
terraform version -json > "$plan_directory/version.json"
bun ../scripts/terraformPlan.ts version "$plan_directory/version.json"
# Read actual remote state; a matching backend file alone is insufficient.
terraform state pull > "$plan_directory/state-before.json"
bun ../scripts/terraformPlan.ts state "$plan_directory/state-before.json" main.tfvars.json
terraform plan -input=false -lock=true -var-file=main.tfvars.json -out="$plan_directory/plan"
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
