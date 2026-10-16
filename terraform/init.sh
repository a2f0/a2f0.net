#!/bin/sh
# Initialize the R2 state backend in main.tf with the state key from .secrets.
# A clone initialized for the former S3 backend passes -reconfigure once.
set -eu
cd "$(dirname "$0")"
# shellcheck source=terraform/credentials.sh
. ./credentials.sh
load_state_credentials
terraform init "$@"
