# SISOBER — Safety Inspection Unit and Behavior Driver

Maintainable Next.js/Supabase foundation for inspection findings and verified closure. The browser never receives service-role or Google credentials; authorization is enforced with RLS and workflow changes run in row-locking database functions.

## Local setup

Requirements: Node 20+, npm, Docker Desktop, and the Supabase CLI.

```powershell
npm install
Copy-Item .env.example .env.local
npx supabase start
npx supabase db reset
npm run dev
```

Copy the local API URL, anon key, and service-role key printed by `supabase start` into `.env.local`. Create an Auth user in Supabase Studio, then bootstrap the first administrator with a service-role key kept only in the terminal/server environment:

```powershell
npx tsx scripts/bootstrap-admin.ts admin@example.com
```

Never prefix `SUPABASE_SERVICE_ROLE_KEY` or Google credentials with `NEXT_PUBLIC_`.

## Database and security

The migration creates profiles, companies, company access, categories, sections, findings, race-safe yearly counters, closure submissions, evidence, verification actions, notifications, and append-only audit logs. Every exposed table has RLS. Contractors only see assigned companies and can write their own drafts; verifier decisions and super-admin reopening use security-definer functions that lock both submission and finding rows. Audit writes use triggers and normal users receive no mutation policy.

Visible `Menunggu Verifikasi` maps to persisted `PENDING_VERIFICATION`; `CLOSING_SUBMITTED` is the atomic submission event, not a second waiting screen. Rejected attempts remain immutable, and each revision is a new numbered submission.

## Workbook import

Dry-run and inspect the report without database credentials:

```powershell
npm run import:excel -- "C:\Users\user\Downloads\DATABASE FINDING SISOBER 2026.xlsx" --dry-run
```

After local Supabase is seeded, remove `--dry-run`. Identity is `(source workbook, source row)`, so reruns skip existing rows. Possible content duplicates are reported, never silently removed. `import-report.json` records row counts, invalid dates, unknown master values, duplicates, and status issues. The source workbook is read-only and never overwritten.

## Google Drive

Development defaults to `DRIVE_STORAGE_ADAPTER=mock`, writing outside Postgres to `.sisober-storage`. Production setup:

1. Enable Google Drive API in a Google Cloud project and create a service account.
2. Create a Workspace Shared Drive and a dedicated `SISOBER Evidence` root folder.
3. Add the service account to the Shared Drive with content-manager permission.
4. Base64-encode the service-account JSON and configure the four `GOOGLE_*` variables in Vercel server environment variables.
5. Set `DRIVE_STORAGE_ADAPTER=google`. The adapter uses `supportsAllDrives=true`, creates year/company/finding/submission folders, and tags uploads with a stable idempotency key.

Evidence access goes through `/api/evidence/[id]`; its RLS lookup proves finding access before the server streams the private Drive object. Accepted content is JPEG, PNG, or PDF up to the configured limit. Extension, declared MIME, and file signatures are checked, but signature checks are not full malware/content inspection; production should add antivirus scanning and image decoding before accepting high-risk external files.

## Email and notifications

Database notifications are created in the workflow transaction. `EmailNotificationAdapter` defaults to mock. A production worker/queue should claim notifications with pending `email_status`, send using Resend/SMTP, and record success/failure separately so mail outages never roll back workflow changes.

## Tests and verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Database integration tests should run against local Supabase after `npx supabase db reset`; unit tests cover role/company rules, transitions, required evidence, adapter idempotency/failure, and import determinism.

## Vercel

Import the repository, set all `.env.example` variables for Preview/Production, use the default Next.js build command, and point the public Supabase URL/key at the production project. Apply migrations with a controlled CI/release step before promoting the deployment. Do not expose Drive JSON or service-role keys, and do not deploy until RLS/database integration tests pass against the target Supabase project.

## Current limitations

This backbone intentionally has restrained UI. Dashboard cards are live, while advanced filtered aggregations/charts should be moved into a dedicated SQL dashboard RPC before large data volumes. Mock email records adapter calls only; no external mail is sent. Google Drive code is implemented but cannot be claimed credential-tested until real Shared Drive credentials are provided.
