# Deployment guide

This guide takes you from a fresh copy of the repository to a live site on your own Cloudflare account. Follow the steps in order. Commands run from the repository root.

Throughout, `your-city-budget` stands for your Pages project name and `budget.example.gov` for your public address. Replace both with your own.

**Contents**

1. [What you will end up with](#what-you-will-end-up-with)
2. [Prerequisites](#prerequisites)
3. [Settings reference](#settings-reference)
4. [Step 1: Prepare your copy of the code](#step-1-prepare-your-copy-of-the-code)
5. [Step 2: Sign in to Cloudflare with Wrangler](#step-2-sign-in-to-cloudflare-with-wrangler)
6. [Step 3: Create the D1 databases](#step-3-create-the-d1-databases)
7. [Step 4: Create the Pages project](#step-4-create-the-pages-project)
8. [Step 5: Set the runtime secrets](#step-5-set-the-runtime-secrets)
9. [Step 6: Deploy](#step-6-deploy)
10. [Step 7: Create the first staff administrator](#step-7-create-the-first-staff-administrator)
11. [Step 8: Custom domain, canonical URL and search engines](#step-8-custom-domain-canonical-url-and-search-engines)
12. [Step 9: Review, then open the site to the public](#step-9-review-then-open-the-site-to-the-public)
13. [Videos and the 25 MiB limit](#videos-and-the-25-mib-limit)
14. [Test the real Functions runtime locally](#test-the-real-functions-runtime-locally)
15. [Updating the site later](#updating-the-site-later)
16. [Usage limits and cost](#usage-limits-and-cost)
17. [Security checklist](#security-checklist)
18. [Troubleshooting](#troubleshooting)
19. [Hosting somewhere other than Cloudflare](#hosting-somewhere-other-than-cloudflare)

## What you will end up with

- A **Cloudflare Pages project** that serves the built site from `dist/` and runs the code in `functions/` on every request.
- Two **Cloudflare D1 databases**, bound to the code as `DASHBOARD_DB`: one for production and one for preview deployments. They hold staff accounts, submissions, feedback and the coming-soon setting.
- **Encrypted runtime secrets** for the reviewer sign-in and the cookie signing key, set separately for Production and Preview.
- A site that starts in **coming-soon mode** until a staff administrator opens it.

## Prerequisites

- **A Cloudflare account.** The free plan is enough to start; see [Usage limits and cost](#usage-limits-and-cost).
- **A Git host** (GitHub or GitLab) if you want automatic deployments on every push. Optional: you can also upload from your computer.
- **Node.js 22.13 or later** and npm. Earlier versions lack the built-in `node:sqlite` module that the local dev server and the test suite use, and the Cloudflare build runs the tests.
- **Python 3** (standard library only). The build runs `scripts/prepare-cloudflare.py` to shrink videos that are too large for Pages.
- **FFmpeg** is not a separate install. The `ffmpeg-static` npm package downloads an FFmpeg binary during `npm ci`, and the build points the video script at it. Set `FFMPEG` only if you want to use a different binary.
- **Wrangler**, Cloudflare's CLI, is a dev dependency (version 4.131.2). Run it with `npx wrangler`; no global install is needed.
- **Your content.** Work through [CUSTOMIZING.md](CUSTOMIZING.md) before launch. You can deploy DeLand's example content first to test the setup, as long as the site stays in coming-soon mode.

Install dependencies once:

```bash
npm ci
```

## Settings reference

Everything you may need to set, in one place. "Identifier" means the value is not a credential but you may still prefer not to publish it.

| Where | Name | What it is | Secret? |
| --- | --- | --- | --- |
| `src/seo.js` | `seo.url` | The public HTTPS origin of the site, with a trailing slash and no path (for example `https://budget.example.gov/`). Used for canonical URLs, social tags, the sitemap and share links. The Cloudflare build always uses this value. | No |
| `wrangler.jsonc` | `name` | Your Pages project name. `npm run deploy` reads it from here. | No |
| `wrangler.jsonc` | `d1_databases[0].database_name` and `database_id` | Production D1 database. Replace `REPLACE_WITH_PRODUCTION_D1_DATABASE_ID`. | Identifier |
| `wrangler.jsonc` | `env.preview.d1_databases[0].database_name` and `database_id` | Preview D1 database. Replace `REPLACE_WITH_PREVIEW_D1_DATABASE_ID`. | Identifier |
| Pages runtime secret (Production and Preview) | `REVIEWER_USERNAME` | Shared reviewer username. Optional; defaults to `reviewer`. | Set it as a secret |
| Pages runtime secret (Production and Preview) | `REVIEWER_PASSWORD` | Shared reviewer password for the coming-soon period. | Yes |
| Pages runtime secret (Production and Preview) | `REVIEWER_SESSION_SECRET` | Random signing key, at least 32 characters. Signs both reviewer and staff cookies, so staff sign-in also needs it. Changing it signs everyone out. | Yes |
| Pages runtime secret (temporary) | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Optional recovery administrator, used to create the first real staff account. Remove both afterward. | Yes |
| Pages build variable | `NODE_VERSION` | Node version for Git builds. Use `22`. | No |
| Build environment | `SEO_NOINDEX` | `true` builds pages that search engines skip. Git builds of any branch other than `main` set this automatically. | No |
| Build environment (`npm run build` only) | `SITE_URL` | Overrides `seo.url` for a plain `npm run build`. Ignored by `npm run build:cloudflare` and `npm run deploy`, which always use `seo.url`. | No |
| Build environment | `FFMPEG` | Path to an FFmpeg binary. Defaults to the one from `ffmpeg-static`. | No |
| Build environment | `PYTHON` | Python command for the video step. Defaults to `python3`. | No |
| Your shell (manual deploys only) | `CLOUDFLARE_ACCOUNT_ID` | Needed only if your Wrangler login can reach more than one account. Never commit it. | Identifier |
| Your shell or CI (optional) | `CLOUDFLARE_API_TOKEN` | Lets Wrangler run without an interactive login, for example in CI. Never commit it. | Yes |
| Set by Cloudflare | `CF_PAGES`, `CF_PAGES_BRANCH` | Set automatically in Git builds; the build script uses them to detect preview branches. | No |
| Set by Cloudflare | `DASHBOARD_DB`, `ASSETS` | Bindings: the D1 database from `wrangler.jsonc`, and the static files. Nothing to configure. | No |

For local work, the same runtime values go in `.env.local` (Vite) and `.dev.vars` (Wrangler). Start both from [`.env.example`](.env.example). Both files are ignored by Git.

## Step 1: Prepare your copy of the code

1. Put the code in a repository your organization controls (a fork, or a new repository with this code pushed to it). Decide whether that repository is public or private; see the [security checklist](#security-checklist).
2. Pick a Pages project name. It becomes your default address, `https://<your-project>.pages.dev`, so use lowercase letters, numbers and hyphens. Put it in `wrangler.jsonc`:

   ```jsonc
   "name": "your-city-budget",
   ```

   You may also rename the two `database_name` values; the commands below must then use your names.
3. Set your public address in `src/seo.js`:

   ```js
   url: 'https://budget.example.gov/',
   ```

   If you do not have a custom domain yet, use `https://<your-project>.pages.dev/` for now and change it in [Step 8](#step-8-custom-domain-canonical-url-and-search-engines). The test suite asserts DeLand's address in `tests/seo.test.js`; update that assertion at the same time or the build will stop (see [Troubleshooting](#troubleshooting)).
4. Check that the tests and the build pass locally:

   ```bash
   npm test
   npm run build:cloudflare
   ```

   `npm run build:cloudflare` runs the same three steps Cloudflare runs: `npm test`, `npm run build`, then `python3 scripts/prepare-cloudflare.py`.

## Step 2: Sign in to Cloudflare with Wrangler

```bash
npx wrangler login
npx wrangler whoami
```

`wrangler login` opens a browser window to authorize Wrangler. `whoami` shows the account it will use. If your login can reach more than one account, set `CLOUDFLARE_ACCOUNT_ID` in your shell for the rest of the session (do not write it into any file in the repository):

```bash
export CLOUDFLARE_ACCOUNT_ID=<your-account-id>
```

## Step 3: Create the D1 databases

Create one database for production and one for previews. Use the names in `wrangler.jsonc`:

```bash
npx wrangler d1 create your-city-budget-dashboard
npx wrangler d1 create your-city-budget-dashboard-preview
```

Each command prints a `database_id`. If Wrangler offers to add the database to your configuration file for you, decline: the entries already exist with the right binding name. Instead, paste each ID over its placeholder in `wrangler.jsonc`:

```jsonc
"database_id": "<production-database-id>",   // top-level d1_databases
...
"database_id": "<preview-database-id>",      // env.preview.d1_databases
```

Optional: `npx wrangler d1 create --help` lists `--location` (a placement hint, such as `enam` for eastern North America) and `--jurisdiction` (to restrict where data is stored).

Apply the schema to both databases:

```bash
npx wrangler d1 migrations apply your-city-budget-dashboard --remote
npx wrangler d1 migrations apply your-city-budget-dashboard-preview --env preview --remote
```

Wrangler asks you to confirm and records which migrations each database has received. The migrations create the `staff_users`, `submissions`, `feedback` and `site_settings` tables and turn coming-soon mode on.

Commit `wrangler.jsonc` (and your `src/seo.js` change) before continuing if you will use Git deployments, because Cloudflare builds from the repository.

## Step 4: Create the Pages project

Choose one of the two ways below. A project created by direct upload cannot later be switched to Git deployments, so decide first.

### Option A: Git-connected (recommended)

Cloudflare builds and deploys every push. In the Cloudflare dashboard, create a new **Pages** application, choose to connect it to Git, authorize your Git host and select your repository. Use these build settings:

| Setting | Value |
| --- | --- |
| Project name | The same name as `"name"` in `wrangler.jsonc` |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build:cloudflare` |
| Build output directory | `dist` |
| Root directory | Leave empty (repository root) |
| Build environment variable | `NODE_VERSION` = `22` |

Notes:

- **The production branch must be `main`.** `scripts/build-cloudflare.mjs` treats every Git build whose branch is not `main` as a preview and builds it with `SEO_NOINDEX=true`. If you use another branch name for production, change that check in the script, or production will be hidden from search engines.
- **Preview deployments** are built for other branches automatically, use the preview D1 database and the Preview secrets, and are marked noindex. You can limit which branches get previews in the project's build settings.
- **Bindings come from `wrangler.jsonc`.** Because the repository has a Wrangler configuration file with `pages_build_output_dir`, Cloudflare reads the D1 binding from it. You do not add the binding in the dashboard.
- **Node version.** If the dashboard does not let you add `NODE_VERSION` (for example because it shows variables as managed by the configuration file), add a file named `.node-version` containing `22` at the repository root instead; Pages reads it during the build. Check the first build log for the Node version in use.

Creating the project starts a first build right away. That deployment will not have secrets yet; it stays in coming-soon mode and sign-in reports that reviewer access is not configured. That is expected. Continue with Step 5, then redeploy.

### Option B: Manual upload from your computer

Create an empty project, then upload builds with `npm run deploy`:

```bash
npx wrangler pages project create your-city-budget --production-branch=main
```

`npm run deploy` (`scripts/deploy.mjs`) refuses to run while any `REPLACE_WITH_` placeholder remains in `wrangler.jsonc`. It runs `wrangler whoami`, runs `npm run build:cloudflare` on your computer, and uploads `dist/` and `functions/` to the production branch. It uploads your working directory as it is, including uncommitted changes.

## Step 5: Set the runtime secrets

Set the secrets for **Production**, and again for **Preview** if you use preview deployments. Use different values for Preview so a preview link never shares credentials or sessions with production.

Use Wrangler's prompt so values never appear in shell history, Git or command arguments. `wrangler pages secret put` asks for the value with hidden input:

```bash
npx wrangler pages secret put REVIEWER_PASSWORD --project-name=your-city-budget
npx wrangler pages secret put REVIEWER_USERNAME --project-name=your-city-budget   # optional, default "reviewer"
```

For the signing key, generate a random value and pipe it straight in, so you never see or paste it:

```bash
openssl rand -base64 48 | npx wrangler pages secret put REVIEWER_SESSION_SECRET --project-name=your-city-budget
```

If `openssl` is not available, this does the same with Node:

```bash
node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))" | npx wrangler pages secret put REVIEWER_SESSION_SECRET --project-name=your-city-budget
```

Repeat for Preview by adding `--env preview` to each command (the default is `--env production`):

```bash
npx wrangler pages secret put REVIEWER_PASSWORD --project-name=your-city-budget --env preview
openssl rand -base64 48 | npx wrangler pages secret put REVIEWER_SESSION_SECRET --project-name=your-city-budget --env preview
```

You can also set them in the dashboard, in the Pages project's settings for variables and secrets, choosing the encrypted (secret) type and the Production or Preview environment.

Store the reviewer password in your organization's password manager; you will share it with reviewers. You do not need to keep a copy of `REVIEWER_SESSION_SECRET`.

Secrets apply to new deployments, so deploy again after setting or changing them (Step 6).

## Step 6: Deploy

- **Git-connected:** retry the latest deployment from the dashboard, or push a commit to `main`.
- **Manual:** run `npm run deploy`.

To check the result, open `https://<your-project>.pages.dev/`. You should see the coming-soon page. Go to `/login` and sign in with the reviewer username and password; you should see the full site.

## Step 7: Create the first staff administrator

Staff accounts live in D1. `npm run admin:create` writes only the local development database (`.cache/dashboard.sqlite`), so it cannot create a production account. Use the temporary recovery administrator instead:

1. Choose a recovery email address that you will **not** use for a regular staff account, such as a role address. The API refuses to create a staff account with the same email as `ADMIN_EMAIL`.
2. Set both values as Production secrets. Use a long random password:

   ```bash
   npx wrangler pages secret put ADMIN_EMAIL --project-name=your-city-budget
   npx wrangler pages secret put ADMIN_PASSWORD --project-name=your-city-budget
   ```

   `REVIEWER_SESSION_SECRET` must also be set (Step 5).
3. Deploy again (Step 6).
4. Open `https://<your-site>/login?next=%2Fadmin%2F&staff=1` and sign in with the recovery email and password. You land in the dashboard as "Site administrator".
5. Open **Manage users** and add your own account with the **Administrator** role and a password of at least 12 characters. Add other staff the same way (no invitation email is sent; share credentials securely).
6. Sign out, then sign in with your new account to confirm it works.
7. Remove the recovery secrets and deploy again:

   ```bash
   npx wrangler pages secret delete ADMIN_EMAIL --project-name=your-city-budget
   npx wrangler pages secret delete ADMIN_PASSWORD --project-name=your-city-budget
   ```

   Once they are gone, the recovery account and its sessions stop working. It never appears in **Manage users** and cannot be disabled there, which is why it should not stay configured.

Use the same procedure (with `--env preview`) if you want staff accounts on preview deployments; the preview database starts empty. Use it again any time you are locked out of every administrator account.

## Step 8: Custom domain, canonical URL and search engines

1. In the Pages project's custom domains settings, add your domain (for example `budget.example.gov`). If the domain's DNS is on Cloudflare, the record is created for you. Otherwise, create a `CNAME` record at your DNS provider pointing the name to `<your-project>.pages.dev`, as the dashboard instructs. Wait until the domain shows as active with a certificate.
2. Make sure `seo.url` in `src/seo.js` is exactly `https://budget.example.gov/`: HTTPS, the bare origin, a trailing slash, no path. The site must live at the root of its host; a subpath such as `https://example.gov/budget/` is rejected by the build.
3. Deploy again. The canonical URL, social tags, sitemap and share links all come from `seo.url`.

The `<your-project>.pages.dev` address keeps working. Its pages point search engines to your custom domain through the canonical tag.

**How robots and the sitemap behave:**

| Situation | `robots.txt` | `sitemap.xml` | Page indexing |
| --- | --- | --- | --- |
| Coming-soon mode on | `Disallow: /` (served by the middleware) | 404 | Every response carries `X-Robots-Tag: noindex, nofollow` |
| Site open, production build | Allows everything and lists the sitemap | One URL: `seo.url` | Public pages indexable; `/admin` and `/api` stay noindex |
| Preview build (`SEO_NOINDEX=true`) | Allows everything (so crawlers can read the noindex tag), no sitemap line | Not generated | Pages carry `noindex, follow` |
| Shared plan pages (`/share/`) | n/a | Never listed | Always `noindex, follow` |

After launch, you can submit `https://budget.example.gov/sitemap.xml` to search engine webmaster tools.

## Step 9: Review, then open the site to the public

While coming-soon mode is on:

- Visitors to `/` see `public/coming-soon.html`. Every other public path redirects to `/login`, and the public APIs (submissions and feedback) return 401.
- Reviewers sign in at `/login` with the shared reviewer credentials and see the whole site, including submitting plans. Reviewer sessions last eight hours.
- Staff sign in at the same page with their email address; staff can also see the public site.
- `/privacy` and `/coming-soon` are always readable.

To launch, a staff administrator opens the dashboard, goes to **Site settings**, turns off **Show the coming-soon page**, and selects **Save setting**. The change takes effect immediately, with no rebuild or deploy, because the setting is read from D1 on every request. Turn it back on the same way. Production and preview have separate databases, so each has its own setting.

Plans submitted by reviewers during the review period stay in the database. Delete test submissions from the dashboard before launch if you do not want them in your reports.

## Videos and the 25 MiB limit

Cloudflare Pages rejects any single file larger than 25 MiB. Department videos are kept at full quality in `public/assets/videos/`; `scripts/prepare-cloudflare.py` fixes the deployed copies:

- It runs after `npm run build` and looks at every `dist/assets/videos/*.mp4`.
- For each file over 25 MiB, it re-encodes a copy with H.264 video and 128 kbps AAC audio at a bitrate calculated to land near 23 MiB, keeping the full length and resolution, and checks that the result is under 25 MiB and within 0.2 seconds of the original duration.
- Encodes are cached in `.cache/cloudflare-videos/`, keyed by a hash of the source file, and reused on later local builds. The files in `public/` are never changed.
- Finally it fails the build if any file anywhere in `dist/` is still over 25 MiB.

Things to know:

- **Git builds start without the cache**, so every Cloudflare build re-encodes every oversized video. Six of DeLand's example videos are over the limit. To keep builds fast, encode your own videos under about 23 MiB before adding them (for example 720p H.264 with `+faststart`); then this step does nothing.
- **Oversized videos must have an audio track.** The encode command maps the first audio stream, so an oversized silent video fails to encode. Add a silent audio track or shrink the file yourself.
- **Seeking.** Pages' static responses ignore the HTTP `Range` header, so browsers could not jump ahead in a video before it downloaded. `functions/assets/videos/[file].js` answers range requests itself with `206 Partial Content`, `Accept-Ranges` and `Content-Range`, and `416` for ranges it cannot satisfy. The 25 MiB limit also bounds the memory this function uses.

## Test the real Functions runtime locally

`npm run dev` and `npm run preview` reproduce sign-in, submissions and the dashboard inside Vite, but not the share routes (`/share/`, `/share/image.png`), the old-link redirect or the video range function. To run the actual Pages Functions on your computer:

```bash
cp .env.example .dev.vars        # then fill in REVIEWER_PASSWORD and REVIEWER_SESSION_SECRET
npm run build
npx wrangler d1 migrations apply your-city-budget-dashboard --local
npx wrangler pages dev dist
```

Wrangler serves the site on `http://localhost:8788` by default and reads `.dev.vars` for the runtime values. Its local D1 database lives in `.wrangler/state/` (ignored by Git). This is separate from Vite's `.cache/dashboard.sqlite` and from both remote databases, so no real data is touched.

To get a staff account in this local runtime, put a test `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.dev.vars`, restart, and use the recovery sign-in from [Step 7](#step-7-create-the-first-staff-administrator). To open the site locally without the dashboard:

```bash
npx wrangler d1 execute your-city-budget-dashboard --local --command "UPDATE site_settings SET value = 'false' WHERE key = 'coming_soon'"
```

To check personalized sharing end to end, open the site locally as above and run the verification script against it:

```bash
npx wrangler pages dev dist --port=5190
node scripts/verify-sharing.mjs            # in a second terminal
```

It checks all 18 postcard variants, the personalized metadata, redirects and error handling, and saves the images under `.cache/share-verification/`. You can pass another origin as an argument (for example your live site once it is open).

You can also confirm that the Functions compile without deploying:

```bash
npx wrangler pages functions build --outdir=.cache/functions-build
```

## Updating the site later

- **Git-connected:** push to `main` to update production. Push any other branch for a preview deployment. Each build runs the tests, so a failing test stops the deployment and the previous version stays live.
- **Manual:** run `npm run deploy` from an up-to-date, clean working copy.
- **Rolling back:** the Pages dashboard keeps earlier deployments; you can roll production back to one of them. Database changes are not rolled back with it.
- **Budget figures:** when amounts or the meaning of a choice change, also change `COST_CENTER_VERSION` in `src/cost-centers.js`. Share links made with the old catalog then stop working instead of showing wrong numbers, and existing submissions keep their original snapshot. See [CUSTOMIZING.md](CUSTOMIZING.md).

### Schema migrations

1. Add a new numbered file to `migrations/`, such as `0003_add_something.sql`.
2. **Write it so it can run more than once.** The local dev server (`server/dashboard-local.js`) re-runs every `.sql` file in `migrations/` each time it starts. Use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` and `INSERT OR IGNORE`. A plain `ALTER TABLE ... ADD COLUMN` would fail on the second local start; if you need one, plan how the local database will handle it (for example, delete `.cache/dashboard.sqlite` after backing it up).
3. Apply it to preview first, test, then production, **before** deploying code that depends on it:

   ```bash
   npx wrangler d1 migrations list your-city-budget-dashboard-preview --env preview --remote
   npx wrangler d1 migrations apply your-city-budget-dashboard-preview --env preview --remote
   npx wrangler d1 migrations apply your-city-budget-dashboard --remote
   ```

4. Deploy the code.

To keep your own backup of production data, `npx wrangler d1 export your-city-budget-dashboard --remote --output=backup.sql` writes a SQL file. Store it somewhere safe and outside the repository, because it contains staff password hashes and every submission. D1 also offers point-in-time restore through `npx wrangler d1 time-travel`.

## Usage limits and cost

- `public/_routes.json` sends **every request** (pages, images, scripts, videos) through Pages Functions, because the access gate has to see each one. Each request counts as a Functions invocation against your Workers plan's request allowance. A busy launch day on the free plan can reach the daily limit, so check Cloudflare's current limits and consider a paid Workers plan for launch.
- D1 usage is small: one settings read per request, and a write for each submission or feedback response.
- Pages' per-file limit is 25 MiB (see [Videos](#videos-and-the-25-mib-limit)). Check Cloudflare's current documentation for build time and file count limits.

## Security checklist

- **Never commit** `.env.local`, `.dev.vars`, D1 exports, or any file with real passwords, the session secret, API tokens or account IDs. `.gitignore` already excludes `.env`, `.env.local`, `.env.*.local`, `.dev.vars`, `.dev.vars.*`, `.wrangler/` and `.cache/`.
- **No account IDs or tokens in scripts.** `scripts/deploy.mjs` uses your Wrangler login. If you need `CLOUDFLARE_ACCOUNT_ID` or `CLOUDFLARE_API_TOKEN`, set them in your shell or your CI's secret store.
- **D1 database IDs** in `wrangler.jsonc` are identifiers, not credentials: nobody can reach your data with an ID alone. Still, each government can decide whether its own working repository should be public or private.
- **Use separate secrets for Production and Preview**, and a long random `REVIEWER_SESSION_SECRET` (at least 32 characters; the code refuses shorter ones).
- **Remove `ADMIN_EMAIL` and `ADMIN_PASSWORD`** once a regular administrator exists.
- **Rotate the reviewer password** after the review period, or simply open the site. Changing `REVIEWER_PASSWORD` or `REVIEWER_SESSION_SECRET` ends existing reviewer sessions; changing the session secret also ends staff sessions.
- **Limit who can deploy.** Anyone who can push to `main` or manage the Pages project can change the live code, including code that uses the secrets and reads the database.
- **Protect preview deployments if needed.** Preview URLs are public and use the coming-soon setting in the preview database. Cloudflare Access can add a sign-in in front of them.

## Troubleshooting

**`npm run deploy` says "Finish wrangler.jsonc first".** A `REPLACE_WITH_` placeholder is still in `wrangler.jsonc`. Complete [Step 3](#step-3-create-the-d1-databases). Git deployments stop at the start of the build with a similar message ("wrangler.jsonc still has REPLACE_WITH_ placeholders"); commit `wrangler.jsonc` with both real IDs and push again.

**Sign-in says "Reviewer access is not configured yet."** The deployment does not have `REVIEWER_PASSWORD` and a `REVIEWER_SESSION_SECRET` of at least 32 characters. Set them for the right environment (Production or Preview, [Step 5](#step-5-set-the-runtime-secrets)) and deploy again; secrets do not reach deployments made before they were set. Locally, check `.env.local` (Vite) or `.dev.vars` (Wrangler).

**Staff sign-in fails even with the right password.** `REVIEWER_SESSION_SECRET` is missing or too short (it also signs staff sessions), the account is disabled, or you are signing in to a preview deployment, which uses a different database.

**Submitting a plan fails with "Submission storage is not configured" (HTTP 503), the dashboard reports a storage error, or Site settings will not save.** The `DASHBOARD_DB` binding is missing or the migrations were not applied. Without the database, the gate fails closed (coming-soon mode stays on), the submission and feedback APIs return 503 (the page shows a save failure), and only the recovery administrator can sign in. Check that `wrangler.jsonc` has the right IDs, that the deployment lists the D1 binding, and that you ran `migrations apply` against the database for that environment.

**The build stops with "Assets still exceed 25 MiB".** A file in `dist/` is larger than Pages allows. Videos over the limit are re-encoded automatically, so this usually means a large non-video file (or a video outside `assets/videos/`). Shrink it before adding it to `public/`.

**The build stops while encoding a video.** Python 3 is missing (set `PYTHON` if it has another name), FFmpeg did not download during `npm ci` (rerun `npm ci` with network access, or set `FFMPEG`), or an oversized video has no audio track (see [Videos](#videos-and-the-25-mib-limit)).

**The build fails with `No such built-in module: node:sqlite` or `Object.groupBy is not a function`.** Node is too old. Use Node 22.13 or later locally, and set `NODE_VERSION=22` (or a `.node-version` file) for Git builds.

**The build fails in `npm test` after you changed content.** The tests assert DeLand's example data, such as the site address in `tests/seo.test.js`, the share image file name, and catalog totals. Update the tests to match your data. [CUSTOMIZING.md](CUSTOMIZING.md#15-tests-that-check-delands-values) lists them.

**`SITE_URL must be the public HTTPS origin...`.** `seo.url` (or `SITE_URL`) has a path, query, `http://`, or is `localhost`. Use the bare `https://` origin with a trailing slash.

**Production pages are marked noindex.** Your production branch is not named `main` (see [Option A](#option-a-git-connected-recommended)), or `SEO_NOINDEX=true` is set in the production build environment.

**Share previews show the wrong address or old image.** Share metadata always uses `seo.url`, so set it to your live domain and redeploy. Social platforms cache previews; links shared before a change may keep the old card.

**Wrangler uses the wrong account.** Run `npx wrangler whoami`, then set `CLOUDFLARE_ACCOUNT_ID` in your shell, or `npx wrangler logout` and log in again.

## Hosting somewhere other than Cloudflare

A static-only host (GitHub Pages, an S3 bucket, a plain web server serving `dist/`) will not work. Without the Functions there is no coming-soon gate, so **the full site in `dist/` would be public immediately**, and submissions, feedback, the staff dashboard, sign-in, share previews and video seeking would all be missing.

To run it elsewhere, you would need to port:

- **The request middleware** (`functions/_middleware.js` with `server/reviewer-access.js`, `server/staff-auth.js`, `server/site-settings.js`). These use standard Web APIs (`Request`, `Response`, Web Crypto) and already run inside Vite through `server/reviewer-vite.js`, which is a useful model for a Node server.
- **The API** (`server/dashboard-api.js`) and **a database** that offers the small `prepare().bind().first()/all()/run()` interface used by `server/dashboard-store.js`. `server/dashboard-local.js` already adapts Node's SQLite to it.
- **Static file serving** in place of `env.ASSETS`.
- **The share routes** (`functions/share/`), which use Cloudflare's `HTMLRewriter` and cache API, and Resvg WASM for the image.
- **Video range responses**, which most web servers handle natively.

`npm run preview` is close to this already, but it is a development server and is not meant for production traffic.
