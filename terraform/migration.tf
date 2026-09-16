# Release Vercel from Terraform without deleting the live site. Keep it available
# for DNS propagation and rollback; retire it after verifying the cutover.
removed {
  from = vercel_project.resume
  lifecycle {
    destroy = false
  }
}

removed {
  from = vercel_project_domain.resume
  lifecycle {
    destroy = false
  }
}

removed {
  from = vercel_project_domain.resume_staging
  lifecycle {
    destroy = false
  }
}

removed {
  from = github_actions_secret.vercel_org_id
  lifecycle {
    destroy = false
  }
}

removed {
  from = github_actions_secret.vercel_project_id
  lifecycle {
    destroy = false
  }
}

removed {
  from = github_actions_secret.vercel_token
  lifecycle {
    destroy = false
  }
}
