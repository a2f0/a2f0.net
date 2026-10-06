#!/bin/sh
set -e
cd "$(dirname "$0")"
umask 077
sops decrypt --output main.tfvars.json main.tfvars.sops.json
sops decrypt --output google-credentials.json google-credentials.sops.json
