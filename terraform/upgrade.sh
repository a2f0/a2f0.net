#!/bin/sh
# Upgrade providers within their constraints against the R2 state backend.
set -eu
CDPATH='' cd -P -- "$(dirname -- "$0")"
# shellcheck source=terraform/credentials.sh
. ./credentials.sh
load_state_credentials
terraform init -upgrade "$@"
