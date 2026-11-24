# Staff dashboard

The dashboard lives at `/admin/`, behind individual staff sign-in. It is built from `admin/index.html`, `src/dashboard.js`, `src/dashboard-data.js`, `src/dashboard-pdf.js`, `src/dashboard-time.js` and `src/dashboard.css`, and talks to the API in `server/dashboard-api.js`.

## What it includes

- **Overview:** submission count, average reduction, average cuts selected, reviewed count, participation over time, proportional department reductions and recent plans.
- **Submissions:** search by plan ID, department or cut; filter by review status; sort by date received or reduction; open each plan to see every saved cut, its impact and the retained funding. Administrators can mark a plan reviewed or new, or permanently delete one plan after confirming. Lists show 10 rows per page.
- **Reports & insights:** most selected cuts, median reduction, department-level average cuts and retained funding, and revenue choices, with CSV export and a printable PDF report for the selected dates. The PDF includes summary metrics, department comparisons, proportional reductions, the full ranking of selected cuts, methodology notes, timestamps and page numbers.
- **Feedback:** helpfulness totals, comments, search, status and date filters, CSV export, and administrator review and delete controls.
- **Manage users** (administrators only): add accounts, change roles, disable and re-enable access, reset passwords. No invitation email is sent; share credentials securely.
- **Site settings** (administrators only): turn the coming-soon page on or off. See [reviewer-access.md](reviewer-access.md).

**Roles.** Administrators can do everything above. Viewers can read submissions, reports and feedback and export CSV and PDF, but cannot review, delete, manage users or change settings. The shared reviewer account has no dashboard access.

## Local development

Use Node.js 22.13 or later for the built-in SQLite module. `npm run dev` and `npm run preview` create and migrate `.cache/dashboard.sqlite` automatically; it is shared by local servers started from the repository and ignored by Git. Back it up before clearing `.cache/` if you need the records. Local data never syncs to Cloudflare.

Keep `REVIEWER_SESSION_SECRET` (at least 32 random characters) in `.env.local`. Then create a local administrator:

```sh
npm run admin:create -- you@example.gov "Your Name"
```

The command prints a generated password once and refuses to overwrite an existing account. Sign in at `/login?next=%2Fadmin%2F` with that email and password. Do not put real staff passwords in source code or shell arguments.

## On Cloudflare

Data is stored in Cloudflare D1 through the `DASHBOARD_DB` binding. `wrangler.jsonc` is the source of truth for it:

| Environment | Database name in `wrangler.jsonc` | ID |
| --- | --- | --- |
| Production | `d1_databases[0].database_name` | Your production database ID |
| Preview | `env.preview.d1_databases[0].database_name` | Your preview database ID |

Production and preview have separate databases, separate secrets and separate staff accounts; nothing is copied between them. Accounts and submissions persist across deployments. Creating the databases, applying migrations and creating the first production administrator are covered step by step in [DEPLOYMENT.md](../DEPLOYMENT.md#step-3-create-the-d1-databases).

`npm run admin:create` writes only the local SQLite file. On Cloudflare, the first administrator is created through the temporary recovery account below.

### Recovery administrator

If the optional server-only secrets `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set (together with `REVIEWER_SESSION_SECRET`), that email and password sign in as an administrator named "Site administrator". This account is not stored in D1, is not listed in **Manage users**, and cannot be disabled there. Use it only to create or restore a regular administrator, then delete both secrets and redeploy, which ends its sessions. The API refuses to create a regular account with the same email as `ADMIN_EMAIL`, so pick a different address for it.

### Schema changes

Migrations are tracked by Wrangler separately for each database. Apply new ones to preview and then production before deploying code that needs them:

```sh
npx wrangler d1 migrations apply <preview-database-name> --env preview --remote
npx wrangler d1 migrations apply <production-database-name> --remote
```

The local dev server re-runs every file in `migrations/` on each start, so write migrations that are safe to run more than once. See [DEPLOYMENT.md](../DEPLOYMENT.md#schema-migrations).

### Testing against the Pages runtime

Apply migrations to Wrangler's local database with `--local`, put test values in `.dev.vars`, and run `npx wrangler pages dev dist` after `npm run build`. Vite's SQLite file is separate from Wrangler's local database and from both remote databases.

### When storage is missing

If the binding is missing or the tables do not exist, the submission and feedback APIs return 503 and the public page shows a save failure. It never claims success and never falls back to storing data in the browser. The dashboard shows an actionable storage error.

## Passwords and sessions

- Staff passwords are stored as salted PBKDF2-SHA256 hashes (100,000 iterations, using Web Crypto so the same code runs in Workers and Node), never in plain text. New passwords must be 12 to 256 characters.
- Sign-in for unknown emails runs the same expensive hash, so response time does not reveal whether an account exists.
- Staff cookies are signed with `REVIEWER_SESSION_SECRET`, last eight hours, and are HTTP-only, `SameSite=Lax` and `Secure` on HTTPS.
- Changing an account's password, role or status increments its session version, which revokes older cookies (including after re-enabling an account). A user cannot change their own access from **Manage users**.

## Collection and interpretation

`POST /api/submissions` saves anonymous budget plans. During coming-soon mode the reviewer gate protects this endpoint too. The server checks the catalog version, that cut and revenue IDs are known and unique, and that the plan meets the funding gap target. It then derives costs, impacts, department totals and the timestamp itself instead of trusting values from the browser. No name, contact details, property search, home value or IP address is stored. A browser-generated UUID makes retries of the same plan idempotent; a different plan sent with an identifier already used is rejected.

A successful submission means the database accepted the plan. Downloading and sharing the postcard still work if saving fails. Feedback goes to `/api/feedback`, appears under **Feedback**, and does not send any email.

**Dates.** Reports default to the last 30 calendar days, inclusive, in Eastern Time (`America/New_York`), with daylight-saving changes handled by `src/dashboard-time.js`. Presets cover 7 and 90 days; custom ranges cover up to 366 days. Longer periods group the activity chart into seven-day buckets starting on the range's first date. Stored timestamps are UTC; date filters, chart days, dashboard dates and CSV and PDF exports use Eastern calendar days. To use another time zone, change `DASHBOARD_TIME_ZONE` in `src/dashboard-time.js` and the matching labels and tests.

**Statuses and filters.** All statuses count toward metrics; "reviewed" means read by staff, not approved. Search and status filters on **Submissions** apply to that list and its CSV. Overview and Reports use every plan in the date range. The Reports CSV contains the aggregate report and all cut frequencies; the Overview CSV contains every plan in range.

**Reading the numbers.**

- Averages include every plan, including plans with no cuts to a department.
- Proportional cuts divide the average cut by each department's baseline budget.
- Cut frequency divides selections by the number of plans. One plan can include many cuts, so percentages do not sum to 100%.
- Names, costs, impacts and retained funding come from each plan's saved snapshot, and cut rankings keep catalog versions apart.
- The department baseline comparison uses the current `SERVICES` baseline in `src/budget.js`. If you change that baseline (for example for a new fiscal year), report plans from each baseline separately before combining them.

These are submitted plans, not unique residents and not a representative poll. Present the budget choices as an exercise, not as decisions your government has adopted.

## Access and validation

- API routes enforce staff authentication and administrator roles on the server; the page also rejects reviewer-only sessions.
- Every change (POST, PATCH, DELETE) must come from the same origin.
- Private pages and API responses use `no-store` and `noindex`.
- CSV exports escape fields and neutralize spreadsheet formula prefixes. Feedback comments are escaped when shown.
- The dashboard never fabricates sample submissions to fill empty states.
- The current version loads all submissions in the requested (bounded) date range and aggregates them in the API and the browser. For very high response volumes, move aggregation and pagination into SQL before raising the range limit.

Run `npm test`, `npm run build`, and `npx wrangler pages functions build --outdir=.cache/functions-build` to check changes. `tests/dashboard.test.js` covers persistence, server recalculation, retry de-duplication, roles, session revocation, request validation, date boundaries, aggregates and CSV escaping. No test sends email or touches a remote database.

## Site availability and feedback storage

`migrations/0002_feedback_and_settings.sql` adds the `feedback` and `site_settings` tables and turns coming-soon mode on. Only administrators can read or change settings. Turning coming-soon off opens the public site, its assets, plan submissions and feedback; staff pages and APIs still require staff sign-in and viewer limits are unchanged. `/coming-soon` always previews the holding page.

Each feedback record has a UUID, a server timestamp, the rating (`yes`, `somewhat` or `no`), an optional comment of up to 500 characters and a review status. A hidden honeypot field rejects simple bots. No contact field, property data, IP address or browser timestamp is kept. UUID retries are idempotent, and reusing an ID with a different response is rejected.

## Deleting responses

Only administrators can delete submissions or feedback. Each deletion needs a confirmation in the dashboard and removes one record permanently; there is no bulk delete. The API checks role, origin and record ID independently. A deleted plan disappears from later reports and exports; CSVs and PDFs downloaded earlier are not affected. Remember that records may be subject to your public records retention rules before you delete them.

## PDF reports

The PDF is generated in the browser from the same date-filtered summary shown in **Reports & insights**, laid out for US Letter paper. The PDF library loads on demand and no report data is sent to an outside service. An empty date range produces a report with zero submissions.
