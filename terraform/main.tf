# State lives in Cloudflare R2 (S3-compatible). The entrypoints in this folder
# load the bucket's TF_STATE_* key from .secrets/prod and map it to the AWS
# variables the backend reads; see credentials.sh.
terraform {
  backend "s3" {
    bucket = "a2f0-net-terraform-state"
    key    = "terraform.tfstate"
    region = "auto"
    endpoints = {
      s3 = "https://0be508e6c4caa573595c5f94e11900e4.r2.cloudflarestorage.com"
    }
    use_lockfile                = true
    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
