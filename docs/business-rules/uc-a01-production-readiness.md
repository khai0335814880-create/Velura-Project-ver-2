# UC-A01 Production Readiness

Verified on 2026-07-01 against Supabase project `gtyuajboeffmfskofoyh` using read-only publishable-key requests.

## Implemented

- Supabase Auth login, OAuth callback, password reset/change and server-authoritative `/api/auth/me` session.
- Versioned A01 account API with active-super-admin authorization.
- Canonical account projections that exclude credentials, OTP and addresses.
- Atomic PostgreSQL RPCs for lock, unlock, role change and approval review.
- RLS, optimistic locking, last-super-admin protection and approval separation of duties.
- Audit/outbox writes, approval expiry worker and retrying outbox worker.
- Production UI never falls back to mock data; demo mode requires `DEV` plus `VELURA_CONFIG.allowDemoData=true`.
- Automated RBAC, validation, route, security and browser-source regression tests.

## Remote schema gate

The production project is **not ready for A01 release** at this verification point:

- `public.users` resolves the projected A01 columns.
- `public.approval_admin_request.target_version` is missing.
- `public.email_outbox` is missing.

Apply `database/migrations/001_uc_a01_account_rbac.sql` through an approved Supabase migration identity. Then run:

```bash
npm run verify:a01:supabase
```

Before release, also run authenticated integration tests with at least two active super admins and one member. Verify list/read, lock/unlock, non-super role change, super-admin approval/rejection, stale-version conflict, last-super-admin protection, RLS denial and outbox delivery. Do not place the service-role key in browser configuration or Git.
