# Portal de empleo · Mi búsqueda

A personal job tracker with Spanish UI, built with Next.js, React and Supabase. Designed for deployment from this GitHub repository to Vercel.

## Features

- Job cards with portal branding, original vacancy links, optional verified company logos and Gmail source links.
- Search, portal and work-mode filters, fit scores and recommendations.
- Saved stages, notes and application dates persisted in Postgres.
- JSON import/export. Analysis updates preserve existing workflow stages, notes and application dates.
- Supabase authentication, a server-side owner email allowlist and database row-level security.
- A compatible MCP endpoint at /mcp exposing list_jobs, import_jobs and update_job.

The app can track any career direction. Personal display names are loaded from the signed-in account, not committed to the repository. Fit scores are estimates of documented compatibility, never hiring probabilities. No applications are submitted automatically.

## Setup

1. Import this repository into a Vercel project. Framework: Next.js. Build: npm run build.
2. Create a Supabase project in your account (through Vercel Marketplace or Supabase). Review the plan before provisioning; this repository does not purchase resources.
3. Run supabase/migrations/202611120001_jobs.sql once in Supabase SQL Editor, or apply it with the Supabase migration tooling. It creates the jobs table, owner-only RLS policies and an atomic import function.
4. In Supabase Authentication, create your owner user with an email and a strong password. Use the provider's secure UI; never commit the password.
5. In Vercel Environment Variables add:

| Variable | Value |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Your Supabase project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Your Supabase publishable key (legacy anon key also works) |
| OWNER_EMAIL | The email of your owner user |

6. Redeploy, open the website, and sign in with that owner account.

Without those variables, the app shows an honest setup screen. It does not pretend to save data. No database migration runs automatically during a build. Until credentials, schema and user are configured, persistence and sign-in are not ready.

## Transfer your existing records

On the existing private tracker, choose Exportar. On this app, after signing in, choose Importar and select that JSON file. A new database starts empty. The import carries over notes, stages, application dates and source links; later imports update analyses without overwriting existing decisions.

Your job records and email links must stay outside this public repository. private-data/, environment files, build output and credentials are ignored. Exported JSON files belong in private storage, never in Git.

## Local development

Requires Node.js 22+.

    npm ci
    cp .env.example .env.local

Fill the three environment values locally. Do not commit .env.local. Then:

    npm run typecheck
    npm test
    npm run build
    npm run dev

Keep npm's lockfile committed. Vercel deploys pushes after the Git integration is connected.

## AI integration

POST /mcp uses JSON-RPC and supports MCP 2026-07-28. Discovery and tool schemas return no private data. Reading or changing records requires a verified Supabase owner session or an owner Supabase access token in Authorization: Bearer.

The old ChatGPT Site connection continues to target the old website. It does not automatically move to Vercel. A production OAuth connection for an external MCP client still needs to be configured; do not disable authentication to make it connect. Never share or commit access tokens. The web app works without an AI connection.

## Architecture

- app/tracker.tsx: existing dashboard, filters, notes and import/export.
- app/api/jobs/route.ts: authenticated same-origin API.
- lib/jobs.ts: Postgres operations through Supabase with RLS.
- lib/job-data.ts: bounded input normalization and stable job IDs.
- lib/auth.ts, lib/supabase/server.ts and proxy.ts: verified owner identity and cookie refresh.
- supabase/migrations/: versioned, schema-only SQL.

The previous OpenAI Sites/Cloudflare hosting code and private starter dataset are not included. The original hosted tracker is unchanged. This migration replaces platform-injected identity and D1 bindings with a database/authentication project you control.

## Verification

TypeScript, input-normalization tests, the production build and SQL/RLS tests against embedded Postgres can run without a configured Supabase project. The SQL tests verify that reimports preserve notes/stages/dates, duplicate imports are idempotent, other users cannot read or alter records, and anonymous callers cannot read or import records. Full login, RLS, persistence and migration checks require the linked database and owner user. Do not describe a successful build as a completed data migration.
