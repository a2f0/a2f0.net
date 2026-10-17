# shellcheck shell=sh
# Sourced by the Terraform entrypoints after they change to this folder.
#
# Every secret this stack reads lives in .secrets, the gitignored link to this
# project's folder in matrix-secrets, managed and backed up from a2f0/matrix
# (see its docs/secrets.md). Its prod tier holds the state key and Terraform's
# own inputs.
#
# The R2 state backend in main.tf reads the AWS credential variables. The tier
# files are read in a subshell, shared.env first so app.env wins, and only the
# two state values leave it. No provider in this stack uses AWS, so the key
# reaches only the backend.

secrets_tier=../.secrets/prod

# Terraform's inputs keep the names its tooling expects: apply.sh passes the
# variables file with -var-file, and gsuite.tf reads the Google Workspace
# service-account key by the same relative path.
terraform_variables=$secrets_tier/main.tfvars.json
google_credentials=$secrets_tier/google-credentials.json

read_state_value() {
  (
    set -eu
    unset TF_STATE_ACCESS_KEY_ID TF_STATE_SECRET_ACCESS_KEY
    if [ -f "$secrets_tier/shared.env" ]; then
      # shellcheck source=/dev/null
      . "$secrets_tier/shared.env"
    fi
    # shellcheck source=/dev/null
    . "$secrets_tier/app.env"
    case $1 in
      access) printf '%s' "${TF_STATE_ACCESS_KEY_ID:-}" ;;
      secret) printf '%s' "${TF_STATE_SECRET_ACCESS_KEY:-}" ;;
      *) exit 2 ;;
    esac
  )
}

# Call it as a plain command under set -e, never inside `if`, `&&` or `||`,
# so a failure while reading the tier files stops the caller.
load_state_credentials() {
  if [ ! -f "$secrets_tier/app.env" ]; then
    echo 'Missing .secrets/prod/app.env: link .secrets to the a2f0.net folder of matrix-secrets' >&2
    return 1
  fi
  state_access_key_id=$(read_state_value access)
  state_secret_access_key=$(read_state_value secret)
  if [ -z "$state_access_key_id" ] || [ -z "$state_secret_access_key" ]; then
    echo 'Set TF_STATE_ACCESS_KEY_ID and TF_STATE_SECRET_ACCESS_KEY in .secrets/prod/app.env for the R2 state backend' >&2
    return 1
  fi
  # Terraform sees the key only under the AWS names, and an ambient AWS
  # profile or session token cannot redirect the backend.
  unset AWS_PROFILE AWS_SESSION_TOKEN TF_STATE_ACCESS_KEY_ID TF_STATE_SECRET_ACCESS_KEY
  AWS_ACCESS_KEY_ID=$state_access_key_id
  AWS_SECRET_ACCESS_KEY=$state_secret_access_key
  export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
  unset state_access_key_id state_secret_access_key
}

# A plan needs both inputs. gsuite.tf falls back to no credentials only so
# that validation runs without .secrets; the guarded plan never does.
require_terraform_inputs() {
  for input in "$terraform_variables" "$google_credentials"; do
    if [ ! -f "$input" ]; then
      echo "Missing .secrets/prod/${input##*/}: link .secrets to the a2f0.net folder of matrix-secrets" >&2
      return 1
    fi
  done
}
