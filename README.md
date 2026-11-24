# Community Budget Builder

An interactive civic website that explains how a change in property tax law affects a local government's budget, and lets residents build, submit and share their own plan for closing the resulting funding gap. Staff review the submitted plans in a private dashboard.

The site was built by the **City of DeLand, Florida** for Florida's 2026 property tax amendment (Amendment 3), and is shared here as a starting point for other cities and counties. DeLand's own content (name, seal, photos, videos, budget figures and wording) is left in place as a complete worked example.

**Live example:** [amendment-3.delandfl.gov](https://amendment-3.delandfl.gov)

**Screenshot:** [the full home page, as built from this code](docs/screenshot-home.jpg) (captured November 24, 2026; a large image).

## Start here

| Step | Guide |
| --- | --- |
| 1. Make it yours: replace DeLand's name, seal, photos, videos, budget data, wording and SEO details | [CUSTOMIZING.md](CUSTOMIZING.md) |
| 2. Put it online on your own Cloudflare account | [DEPLOYMENT.md](DEPLOYMENT.md) |

You can run it on your own computer first (see [Local quick start](#local-quick-start)) to see exactly what you would be adapting.

> **Before you launch:** every photo, video, the city seal, the budget figures and the service descriptions in this repository belong to and describe the City of DeLand. They are included only so the site runs out of the box. Replace all of them with your own material before another government publishes the site.

## What it does

### For residents

- **Explainer page.** A photo slideshow, plain-language overview cards (what is affected, who feels it, the Year 1 impact, what is not affected), department cards with short video playlists, a neutral summary of the amendment, a budget meeting schedule, FAQs and a sources list.
- **Budget builder.** Residents choose specific services to cut (each with its net cost and a description of the service consequence) and potential new revenue (fixed options plus a millage slider). Live department totals and a remaining-target summary show progress toward the funding gap. A plan can be submitted once it closes the gap.
- **Personalized sharing.** A postcard-style summary of the resident's plan with three color themes, selectable headlines and a flip side with the funding breakdown. Residents can save it as a PNG, use the device share sheet, or copy a link. Shared links open a page with personalized social preview metadata and a server-rendered 1200×630 preview image. See [docs/personalized-sharing.md](docs/personalized-sharing.md).
- **Feedback.** A short "was this useful?" form with an optional comment.
- **Privacy and public records page** at `/privacy`, readable even while the site is gated.

### Before launch: coming-soon page and reviewer gate

The site starts in **coming-soon mode**. Visitors see a branded holding page; invited reviewers sign in at `/login` with a shared reviewer username and password to see the full site. A staff administrator opens the site to the public from the dashboard's **Site settings**, with no rebuild or redeploy. See [docs/reviewer-access.md](docs/reviewer-access.md).

### For staff: the dashboard at `/admin/`

- **Overview:** submission count, average gap closed, participation over time, proportional department reductions, recent plans.
- **Submissions:** search, filter, sort and open each saved plan; administrators mark plans reviewed or delete individual records.
- **Reports and insights:** most selected cuts, revenue choices, department comparisons; **CSV export** and a printable **PDF report** for the selected dates, generated in the browser.
- **Feedback:** ratings and comments with search, filters and CSV export.
- **Manage users:** administrators add staff, set roles (administrator or read-only viewer), disable accounts and reset passwords.
- **Site settings:** turn the coming-soon page on or off.

Dates in the dashboard, CSVs and PDFs use Eastern Time (`America/New_York`); records are stored in UTC. See [docs/staff-dashboard.md](docs/staff-dashboard.md).

## Tech stack

### What it is built with

Versions are from [`package.json`](package.json).

| Piece | Used for |
| --- | --- |
| [Vite](https://vite.dev) 8 | Multi-page build (`index.html` and `admin/index.html`), local dev server |
| Vanilla JavaScript and CSS | All pages; there is no front-end framework |
| [GSAP](https://gsap.com) 3.15 | Scroll and panel motion (respects reduced-motion settings) |
| [Plyr](https://plyr.io) 3.8 | Department video player, loaded on demand |
| [jsPDF](https://github.com/parallax/jsPDF) 4.2 and jspdf-autotable 5.0 | Dashboard PDF reports, generated in the browser |
| [Resvg WASM](https://github.com/yisibl/resvg-js) 2.6 | Server-side rendering of personalized share images |
| [linkedom](https://github.com/WebReflection/linkedom) 0.18 | HTML parsing in the test suite |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) 4.131 | Cloudflare CLI: D1, secrets, local Pages runtime, manual deploys |
| ffmpeg-static 5.3 | Supplies the FFmpeg binary used to shrink oversized videos at deploy time |
| `node:test` | Test runner (no extra framework) |

Inter is hosted locally under `public/assets/fonts/` with its SIL Open Font License; no font CDN is used.

### How it fits together

The site is a static multi-page build plus a thin layer of edge functions and one small database.

```text
Browser
  │
  ▼
Cloudflare Pages ── public/_routes.json sends every request through Functions
  │
  ├─ functions/_middleware.js ── server/reviewer-access.js
  │     Checks the coming-soon setting (D1), reviewer and staff cookies,
  │     serves /login, /coming-soon, /privacy, robots rules; then passes on.
  │
  ├─ /api/submissions, /api/feedback, /api/admin/* ── server/dashboard-api.js
  │     Validates input, recomputes every amount on the server,
  │     reads and writes D1 through server/dashboard-store.js.
  │
  ├─ /share/ and /share/image.png ── personalized metadata and PNG preview
  ├─ /assets/videos/* ── byte-range (seekable) video delivery
  └─ everything else ── static files from dist/ (env.ASSETS)
                                   │
                         Cloudflare D1 (binding DASHBOARD_DB):
                         staff_users, submissions, feedback, site_settings
```

- **Shared code.** Budget math (`src/cost-centers.js`), share-link parsing (`src/share-plan.js`), postcard drawing (`src/postcard.js`) and SEO text (`src/seo.js`) are plain ES modules used by both the browser and the server functions, so the server recomputes exactly what the resident saw.
- **SEO at build time.** `vite.config.js` calls `src/seo.js` to write the page title, description, canonical URL, social tags, FAQ structured data, `robots.txt` and `sitemap.xml` into the built HTML.
- **Local development without Cloudflare.** `vite.config.js` plugs the same access gate and dashboard API into the Vite dev server (`server/reviewer-vite.js`), backed by Node's built-in SQLite (`server/dashboard-local.js`), which mimics the D1 API. So `npm run dev` behaves like production for sign-in, submissions and the dashboard. The share routes and video range function run only in the Pages runtime (see [DEPLOYMENT.md](DEPLOYMENT.md#test-the-real-functions-runtime-locally)).
- **The pages in `public/`** (`coming-soon.html`, `login.html`, `privacy.html`, `404.html`) are copied to the build as-is and use plain CSS and JS from `public/assets/`.

### What it runs on

- **Production:** Cloudflare Pages (static hosting), Pages Functions (edge code) and Cloudflare D1 (SQLite database). Separate D1 databases for production and preview deployments.
- **Local:** Node.js 22.13 or later (required for the built-in `node:sqlite` module, which the dev server and the test suite use), npm, and Python 3 (standard library only) for the video step in the Cloudflare build. FFmpeg comes from the `ffmpeg-static` npm package, which downloads the binary when you run `npm ci`.

## Project layout

```text
index.html                 Public site template (SEO placeholders filled in at build time)
admin/index.html           Staff dashboard page
public/                    Copied to the build as-is
  _routes.json             Sends all requests through Pages Functions
  coming-soon.html         Holding page shown during coming-soon mode
  login.html               Reviewer and staff sign-in
  privacy.html             Privacy and public records notice
  404.html                 Not-found page
  assets/                  Photos, videos, posters, seal, fonts, share artwork, launch page CSS/JS
src/                       Browser code and shared modules
  main.js                  Public page orchestration
  budget.js                Departments, funding gap target, endpoints, formatting
  cost-center-source.js    Budget source rows, kept verbatim from the budget workbook
  cost-center-data.js      Service names, descriptions, department mapping, potential revenues
  cost-centers.js          Catalog version and the plan math (cuts, revenue, gap closed)
  cost-center-builder.js   Budget builder interface
  seo.js                   Site URL, title, description, FAQs, sources, robots and sitemap
  share.js, share-plan.js, postcard.js   Share studio, share links, postcard drawing
  service-videos-data.js   Video titles, order and departments
  budget-meetings.js       Meeting schedule links to the city's public meeting portal
  dashboard*.js, dashboard.css           Staff dashboard, reports, PDF, time handling
  analytics.js             Optional funnel events, sent only if a Google Analytics tag exists
  *.css                    Styles (civic-design.css is the theme layer)
functions/                 Cloudflare Pages Functions (routes by file path)
  _middleware.js           Access gate on every request
  index.js                 Redirects old homepage share links to /share/
  api/                     Submissions, feedback, staff API
  share/                   Personalized share page and PNG image
  assets/videos/[file].js  Byte-range video responses
server/                    Server modules used by Functions and the Vite dev server
  reviewer-access.js       Coming-soon gate, reviewer sign-in, private response headers
  staff-auth.js            Staff password hashing, sessions, recovery administrator
  dashboard-api.js         Submission, feedback and staff API
  dashboard-store.js       SQL used against D1 (and local SQLite)
  dashboard-local.js       Local SQLite stand-in for D1
  site-settings.js         Reads the coming-soon setting (fails closed)
  reviewer-vite.js         Wires the gate and API into Vite
  result-image.js, svg-canvas.js         Server-rendered share image
migrations/                D1 schema (applied to each database, and automatically to local SQLite)
scripts/
  build-cloudflare.mjs     Cloudflare build: tests, Vite build, video preparation
  prepare-cloudflare.py    Re-encodes videos over 25 MiB for Pages
  deploy.mjs               Manual upload with `npm run deploy`
  create-local-admin.mjs   Creates a local dashboard administrator
  verify-sharing.mjs       HTTP checks of share pages and images against a Pages runtime
tests/                     node:test suites
docs/                      Reference docs (see below)
wrangler.jsonc             Pages project name and D1 bindings (placeholders until you fill them in)
vite.config.js             Build inputs, SEO injection, local API middleware
.env.example               Template for .env.local and .dev.vars
```

## Local quick start

Requires Node.js 22.13 or later, npm and Git. Python 3 is needed only for the Cloudflare build step.

```bash
git clone <your-copy-of-this-repository> community-budget
cd community-budget
npm ci
cp .env.example .env.local
```

Edit `.env.local` and set:

- `REVIEWER_PASSWORD`: any password you choose for local testing.
- `REVIEWER_SESSION_SECRET`: a random value of at least 32 characters. One way to make one: `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.

`REVIEWER_USERNAME` defaults to `reviewer`. Leave `ADMIN_EMAIL` and `ADMIN_PASSWORD` empty.

```bash
npm run dev
```

Open the address Vite prints (normally `http://localhost:5173`). You will see the coming-soon page; go to `/login` and sign in with the reviewer username and password to see the full site.

Create a local staff administrator for the dashboard:

```bash
npm run admin:create -- you@example.gov "Your Name"
```

The command prints a generated password once. Sign in at `/login?next=%2Fadmin%2F` with that email and password. This account exists only in the local database `.cache/dashboard.sqlite` (ignored by Git), which the dev server creates and migrates automatically.

Run the checks and a production build:

```bash
npm test           # node:test suites
npm run build      # production build into dist/
npm run preview    # serve dist/ with the same local sign-in and API middleware
```

`npm run build` uses the public address in `src/seo.js` for the canonical URL and sitemap. Add `SEO_NOINDEX=true` for a build that search engines should skip.

## How the budget exercise works

These details matter when you load your own budget.

- **Catalog.** Each choice is a "cost center": a service with a net cost (cost after existing revenue offsets). Raw rows live in `src/cost-center-source.js`; `src/cost-center-data.js` turns them into choices with readable names, descriptions and a department, and can combine or exclude rows. DeLand's example has 34 choices across five departments; the department for each row is derived from DeLand's division codes, so expect to rewrite that mapping.
- **Departments and target.** `src/budget.js` defines the departments (`SERVICES`) and the funding gap that a plan must close before it can be submitted (`REDUCTION_TARGET_M`, in millions).
- **Potential revenue.** Fixed options (five in DeLand's example) plus a millage slider (in DeLand's example, 0 to 1 mill in 0.1-mill steps at an estimated $290,000 per step). Revenue adds to the gap closed without changing department costs.
- **Exact math.** Every amount is rounded to cents once and summed in integer cents, so totals and the submission threshold are exact. Displays round to whole dollars or millions.
- **Server recalculation.** A submission sends only item IDs, revenue choices and the millage step. The server checks the catalog version and the target, then derives names, costs, descriptions, totals and the timestamp itself. It never trusts client totals.
- **Catalog version.** `COST_CENTER_VERSION` in `src/cost-centers.js` is stored with every submission and share link. Change it whenever amounts or the meaning of an item change: older share links are then rejected instead of being reinterpreted with new numbers, and saved submissions keep their original snapshot.
- **Interpreting results.** Submissions are plans, not unique residents and not a representative poll. Averages include plans with no cuts to a department; cut frequencies do not sum to 100% because one plan has many cuts. More in [docs/staff-dashboard.md](docs/staff-dashboard.md#collection-and-interpretation).

`npm test` checks the catalog totals, exclusions, revenue math and share links. The tests read the same data and settings as the site rather than DeLand's figures, so they keep passing when you load your own data, and a failure points to a real problem (see [CUSTOMIZING.md](CUSTOMIZING.md#15-how-the-tests-follow-your-data)). The Cloudflare build runs the tests and stops if any fail.

## Data handling

- **Submissions** store the selected items, revenue choices, server-computed totals, the catalog version, a review status and a server timestamp. No name, contact details, address, property data or IP address is stored.
- **Feedback** stores a rating, an optional comment of up to 500 characters, a review status and a server timestamp.
- **Retries are safe.** The browser generates a UUID for each submission and feedback response; retries with the same ID do not create duplicates, and reusing an ID for different content is rejected.
- **Staff accounts** store a name, email, role and a salted PBKDF2-SHA256 password hash. Sign-in throttling briefly keeps IP addresses in memory.
- **No silent fallback.** If the database is unavailable, submission fails visibly; nothing is kept in the browser instead.
- **Third parties.** The site ships with no analytics tag. `src/analytics.js` sends three funnel events only if you add a Google Analytics tag (see [CUSTOMIZING.md](CUSTOMIZING.md#13-add-your-own-analytics)). DeLand's example also links to its public meeting portal, fetches meeting links from that portal's public API in the browser (`src/budget-meetings.js`), and embeds a meeting recording hosted elsewhere; replace or remove these for your government.

## Documentation

- [CUSTOMIZING.md](CUSTOMIZING.md): everything city-specific and where it lives.
- [DEPLOYMENT.md](DEPLOYMENT.md): Cloudflare setup from zero to a live site, updates and troubleshooting.
- [docs/staff-dashboard.md](docs/staff-dashboard.md): dashboard features, storage, roles, metrics and how to read them.
- [docs/reviewer-access.md](docs/reviewer-access.md): coming-soon mode, reviewer sign-in and session security.
- [docs/personalized-sharing.md](docs/personalized-sharing.md): share links, social previews and server-rendered images.

## License, warranty and support

The code is released under the [MIT License](LICENSE). The license covers the software; it does not grant rights to the City of DeLand's name, seal, photographs, videos or other content included as the example, which you must replace.

This project is provided as is, without warranty of any kind. Each organization hosts, maintains and secures its own copy, so review the code, test it with your own data, and have your own staff or contractor look after your deployment.

Questions from other local governments are welcome: open an issue on this repository, or contact the City of DeLand directly. We are glad to help where we can, although we cannot promise ongoing support or updates.
