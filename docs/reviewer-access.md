# Coming-soon mode and reviewer access

Before launch, the site shows a holding page to the public while invited reviewers see the full site. This page describes how that gate works and how to configure it. Setup steps for Cloudflare are in [DEPLOYMENT.md](../DEPLOYMENT.md#step-5-set-the-runtime-secrets).

## How it behaves

- **Coming-soon mode is on by default.** `migrations/0002_feedback_and_settings.sql` stores `coming_soon = true`. If the setting cannot be read (for example the database binding is missing), the code treats the site as coming soon. It fails closed.
- While it is on, `/` shows `public/coming-soon.html`. Other public pages redirect to `/login`, and public API calls (`/api/submissions`, `/api/feedback`) and other non-GET requests return 401. Shared plan links (`/share/`) also require sign-in.
- **Reviewers** sign in at `/login` with one shared username and password and then see the full budget experience at `/`, including submitting plans and feedback. The public page footer includes a **Sign out** button.
- **Staff** sign in through the same form with their own email address and password, and are sent to `/admin/`. See [staff-dashboard.md](staff-dashboard.md). The shared reviewer account cannot open the dashboard, read submissions or manage users.
- **Always readable:** `/privacy` (the privacy and public records notice), `/coming-soon` (a preview of the holding page), and a short allowlist of files the holding and login pages need (launch page CSS and JS, the seal, the launch illustration, a font, the privacy page CSS and favicons). The allowlist is `publicAssets` in `server/reviewer-access.js`; if you rename any of those files, update it.
- **Opening the site:** an administrator turns off **Show the coming-soon page** in the dashboard's **Site settings** and saves. The setting lives in D1 and is read on every request, so it takes effect immediately without a rebuild. Staff pages and APIs still require staff sign-in, and public routes then follow their built indexing settings.

Every request passes through `functions/_middleware.js` (because `public/_routes.json` routes `/*` to Functions), which calls `reviewerGate` in `server/reviewer-access.js`. In local development, `server/reviewer-vite.js` runs the same function inside Vite.

## Configuration

Server-only values. Never give them a `VITE_` prefix, which would put them in the browser bundle.

| Variable | Purpose |
| --- | --- |
| `REVIEWER_USERNAME` | Shared reviewer username. Optional; defaults to `reviewer`. |
| `REVIEWER_PASSWORD` | Shared reviewer password. |
| `REVIEWER_SESSION_SECRET` | Random signing key of at least 32 characters. Signs reviewer cookies and staff cookies. |

- **Locally:** put them in `.env.local` for `npm run dev` and `npm run preview`, and in `.dev.vars` for `npx wrangler pages dev`. Start both from [`.env.example`](../.env.example). Both files are ignored by Git and are never uploaded by a deployment.
- **On Cloudflare:** set them as encrypted secrets in your Pages project, separately for Production and Preview. Use Wrangler's hidden prompt so the values never land in shell history or command arguments:

  ```bash
  npx wrangler pages secret put REVIEWER_PASSWORD --project-name=<your-project>
  npx wrangler pages secret put REVIEWER_SESSION_SECRET --project-name=<your-project>
  ```

  Add `--env preview` for the Preview environment. `<your-project>` is the `name` in `wrangler.jsonc`. Deploy again after changing secrets.

If `REVIEWER_PASSWORD` is missing or the session secret is shorter than 32 characters, the site stays gated and reviewer sign-in reports "Reviewer access is not configured yet." Changing the password or the signing secret ends all existing reviewer sessions.

## Sessions and security

- **Reviewer sessions** last eight hours. The cookie is signed with HMAC-SHA256 using a key derived from both the signing secret and the reviewer password, and is HTTP-only, `SameSite=Lax`, and `Secure` on HTTPS. The password is only ever sent to the server and compared in constant time.
- **Staff sessions** use a separate HTTP-only cookie, check the account's current status on every request, and are revoked when the account's role, password or status changes. Signing out clears both cookies.
- **Sign-in requests** must be same-origin form posts. Redirect targets after sign-in are limited to paths on the same site. Error messages do not say which credential was wrong.
- **Throttling:** after eight failed attempts from one IP address, sign-in is refused for 15 minutes. This is kept in memory per Cloudflare isolate, so it is best-effort protection, not a global rate limit.
- **Private responses** (everything except the public allowlist) are sent with `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin` and `X-Frame-Options: DENY`. Changing the coming-soon setting therefore takes effect for visitors right away.
- **Search engines:** while coming-soon mode is on, every response carries `X-Robots-Tag: noindex, nofollow`, `robots.txt` disallows everything, and `sitemap.xml` returns 404. After launch, public pages drop that header; `/admin` and `/api` keep it.

## Testing locally

- `npm run dev` and `npm run preview` use the same access logic as Cloudflare.
- `npm run build` followed by `npx wrangler pages dev dist` runs the real Pages middleware with the values in `.dev.vars`. See [DEPLOYMENT.md](../DEPLOYMENT.md#test-the-real-functions-runtime-locally).
- `npm test` covers sign-in, route protection, cookie tampering and expiry, same-origin form posts, redirect validation, throttling and cache headers (`tests/reviewer-access.test.js`).

## Do not use a static-only host

The gate needs the Vite server or Cloudflare Pages Functions. `dist/` contains the complete budget site, so publishing it on a static-only host would make everything public immediately, with no gate, dashboard or submissions. See [DEPLOYMENT.md](../DEPLOYMENT.md#hosting-somewhere-other-than-cloudflare).
