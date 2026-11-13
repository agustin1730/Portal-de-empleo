# Portal de empleo · Mi búsqueda

A personal job tracker with Spanish UI, built with Next.js, React and Supabase. Designed for deployment from this GitHub repository to Vercel.

## Features

- Job cards with portal branding, original vacancy links, optional verified company logos and Gmail source links.
- Search, portal and work-mode filters, fit scores and recommendations.
- CRM board and table with Applied, Contacted, Interview, Offer and Rejected stages.
- Company, position, location, application dates, contact person, email, phone and notes persisted in Postgres.
- Previous saved and to-apply records remain available under Opportunities.
- JSON import/export. Analysis updates preserve existing workflow stages, notes and application dates.
- Supabase authentication, a server-side owner email allowlist and database row-level security.
- A compatible MCP endpoint at /mcp exposing list_jobs, import_jobs and update_job.

The app can track any career direction. Personal display names are loaded from the signed-in account, not committed to the repository. Fit scores are estimates of documented compatibility, never hiring probabilities. No applications are submitted automatically.

## Mi perfil

The private profile is available at `/?vista=perfil`. It supports contact details, a professional summary, experience, education, skills, languages, and a written cover letter. The CV and attached cover letter accept PDF files up to 3 MB; the profile photo accepts JPG/PNG up to 2 MB. Files and profile data are owner-only through authenticated API routes and database RLS. Bounded attachments are stored privately in Postgres. The profile starts empty, without mockup sample data.

**CV → draft → review → save → edit:** uploading a CV reads selectable PDF text locally in the browser using PDF.js, then applies deterministic Spanish/English section rules. This feature has no AI provider, API key or per-document processing fee. It accepts up to 10 pages and 80,000 characters; scanned/image-only and password-protected PDFs are unsupported. The versioned PDF worker is copied from the pinned dependency during predev/prebuild and served from the same origin.

The draft shows extracted facts, uncertain data and original text. Nothing is uploaded or persisted until the user selects sections and explicitly accepts. Cancel leaves the profile and previous CV unchanged. Saving defaults to filling empty fields only; replacing selected sections requires choosing that option. Profile changes and the original CV are saved together in one owner-scoped transaction. Photo and cover letter remain unchanged. Each saved section can then be edited normally. Year-only dates stay year-only, and do not prove exact experience duration for affinity scores until months are completed. Column layouts and unfamiliar headings can require manual corrections; no qualification or missing month is invented. Ordinary hosting/database usage remains subject to the project's existing plan.

## Panorama profesional y portfolio

`/?vista=panorama` reads the current owner-scoped profile on each visit. It shows related work areas, evidence sources, strengths, missing documentation, role families and three next actions. The qualitative bars distinguish absent evidence, declared skills/training, related work tasks and tasks supported by explicit skills. A limited keyword method is explained in the UI; it does not measure competence, seniority or hiring probability. Founder titles alone do not prove people management. Empty profiles produce an honest empty state, not sample strengths.

Mi perfil includes **Sitio web y portfolio** with up to ten editable links, each with a title, HTTP(S) URL and contribution/results description. Links and notes use the existing private profile JSON and owner-only save API; no new database migration is needed. Executable schemes and embedded credentials are rejected. External links open with noreferrer/noopener. Sites are not fetched automatically and link text does not raise evidence bars or fit scores. CV imports leave these links unchanged.

## Setup

1. Import this repository into a Vercel project. Framework: Next.js. Build: npm run build.
2. Create a Supabase project in your account (through Vercel Marketplace or Supabase). Review the plan before provisioning; this repository does not purchase resources.
3. Run the SQL files in supabase/migrations/ in filename order, once each in Supabase SQL Editor, or apply it with the Supabase migration tooling. It creates the jobs table, owner-only RLS policies and an atomic import function.
4. In Supabase Authentication → URL Configuration set Site URL to your production origin and allow the exact callback URLs listed below. The website provides Crear mi acceso, email confirmation, Olvidé mi contraseña and password recovery; the owner creates their own password on the website.
5. In Vercel Environment Variables add:

| Variable | Value |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Your Supabase project URL |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Your Supabase publishable key (legacy anon key also works) |
| OWNER_EMAIL | The email allowed to create/access this private tracker |
| SITE_URL | Your production origin, such as https://your-project.vercel.app |

6. Redeploy, open the website, and sign in with that owner account.

Without those variables, the app shows an honest setup screen. It does not pretend to save data. No database migration runs automatically during a build. Until credentials, schema and user are configured, persistence and sign-in are not ready.

## Transfer your existing records

On the existing private tracker, choose Exportar. On this app, after signing in, choose Importar and select that JSON file. A new database starts empty unless a private owner import has been staged by its administrator. Staged records remain inaccessible through the public API and move into jobs only when the matching owner email is confirmed. The trigger runs once and preserves any existing records; it never creates a password or changes credentials. The import carries over notes, stages, application dates and source links; later imports update analyses without overwriting existing decisions.

Your job records and email links must stay outside this public repository. private-data/, environment files, build output and credentials are ignored. Exported JSON files belong in private storage, never in Git.

## Local development

Requires Node.js 22+.

    npm ci
    cp .env.example .env.local

Fill the four environment values locally. Do not commit .env.local. Then:

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

## Email confirmation and recovery

Supabase Site URL must match SITE_URL. Allow these exact Redirect URLs in Supabase Authentication → URL Configuration:

- SITE_URL/auth/callback
- SITE_URL/auth/callback?next=/password

The default Supabase confirmation email works with the PKCE callback. Open the email link in the browser used to request it. The callback also supports signup/recovery token_hash links if customized templates are configured. External or arbitrary next destinations are rejected. Email delivery requires Supabase's built-in sender or a configured SMTP provider. Signup and recovery are restricted to OWNER_EMAIL; verification remains required. Recovery signs the user out after saving their new password. No passwords or tokens are logged or committed.

## Affinity per opportunity

Opportunity scores are calculated on each authenticated list request against the current structured profile. Legacy imported scores are never reused. The `rules-v1` engine compares explicit text, a limited synonym dictionary, related experience periods (without overlapping-month inflation), language levels and dated education. It does not read attached PDFs or infer undocumented abilities. Base weights are experience 40, skills 40 and education 20, redistributed only among categories the vacancy specifies. Unknown requirements receive no credit; no profile, fewer than two comparable requirements, or all-unknown evidence produces no numeric score. Mandatory unverified requirements override the favorable category.

In each opportunity detail, use **Completar aviso y requisitos** to paste source text, detect suggestions, review them, flag mandatory requirements and save. Source marked partial is always provisional. Requirements persist in the existing owner-scoped job payload; profile edits trigger fresh evaluation on load, window focus or Recalcular afinidad. Mayor afinidad sorts descending with unscored records last. The MCP import/update tools accept the same `assessment` object. Scores describe documented compatibility, never hiring probability. No external model or new service credential is required.

Legacy opportunities are evaluated on every load too; import date does not limit scoring. Before reviewed requirements exist, the engine combines available description, key requirement and substantive summary text. Generic alert placeholders and job titles do not supply requirements. Alert-only records show **Falta aviso**, distinguish missing vacancy data from a missing profile, and open the requirements editor automatically. At least two comparable requirements and some documented profile evidence are needed for a numeric score. The app does not automatically fetch vacancy links or infer company requirements from a candidate's abilities.
