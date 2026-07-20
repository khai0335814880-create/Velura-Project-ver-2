# Deployment Runbook

## Environments

| Environment | Branch | Purpose |
| --- | --- | --- |
| local | any | Developer machine |
| staging | develop | Team integration and QA |
| production | main | Approved release |

## Required Secrets

Do not commit real secrets. Configure these in GitHub environments or the target cloud platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VELURA_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_DEPLOY_HOOK` or cloud-specific deploy credentials

## Release Flow

1. Feature branches merge into `develop`.
2. CI must pass.
3. Staging deploy runs from `develop`.
4. QA signs off.
5. Merge `develop` into `main`.
6. Production deploy is manual via `workflow_dispatch` and GitHub environment approval.

## Rollback

Use the deployment provider rollback to the previous successful artifact, then verify:

```bash
npm run smoke:api
```

For database migrations, create forward-fix migrations. Do not rewrite already-applied production migrations.
