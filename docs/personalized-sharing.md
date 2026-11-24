# Personalized result sharing

Residents can share the plan they built as a postcard image and as a link. Opening the link restores the exact plan, and social platforms show a preview card with that resident's numbers. This page describes how that works.

## Share links

A shared plan uses a `/share/` URL whose query string carries everything needed to rebuild it:

```text
/share/?v=8&millage=0.3&revenues=millage-rate&catalog=<catalog-version>&cuts=<id>,<id>&theme=daylight&h=0&side=front#builder
```

| Parameter | Meaning |
| --- | --- |
| `v` | Preview format version (see [Changing the preview](#changing-the-preview)) |
| `catalog` | The budget catalog version (`COST_CENTER_VERSION` in `src/cost-centers.js`) |
| `cuts` | Comma-separated IDs of the selected service cuts |
| `revenues` | Comma-separated IDs of the selected potential revenues |
| `millage` | Selected millage increase, 0 to 1 in 0.1 steps (partial steps are kept in the link and the preview) |
| `theme`, `h`, `side` | Postcard color theme, headline (0 to 2) and side (`front` or `back`) |

Links are built and parsed by `resultURL` and `readSharedPlan` in `src/share-plan.js`, which the browser and the server functions share. A link whose `catalog` does not match the current version is rejected rather than recalculated with new amounts, so change the catalog version whenever amounts or item meanings change.

**Older link formats.** Earlier versions stored only department totals in a `b=` parameter. Links in that format with the current number of departments still render a preview; the interactive builder explains that they contain only totals and starts a new plan. Very old links that put the plan on the homepage (`/?b=…`, or `/?cuts=…`) are redirected with a 302 to the matching `/share/` URL by `functions/index.js` before any HTML is served, so crawlers and browsers both get the personalized preview. Links with an unknown format or the wrong number of departments return 400.

## In the browser

- `src/postcard.js` holds the postcard's drawing commands. The on-page preview and the exported 1080×1350 PNG both use them through Canvas 2D.
- Both sides are drawn into detached canvases, and PNG files are prepared before the share button is enabled, with a revision check so a slow render cannot overwrite a newer selection.
- **Share postcard** calls `navigator.share` directly in the click handler (so the browser's user-activation rule is satisfied), attaching the PNG file when the platform supports files and otherwise sharing the link and caption only.
- **Save image** downloads the PNG on desktop. On mobile and in known in-app browsers it uses file-only native sharing when available; otherwise it shows the full-resolution image in the studio for press-and-hold saving, with a hint to reopen the link in a regular browser if the app blocks saving. It never navigates to a canvas data URL.
- **Copy preview link** and **Copy caption** keep the selected design.
- Opening a share link restores the plan, and reopening the share studio restores the theme, headline and side from the link.

A successful share-sheet result only means the platform accepted the data; it does not prove that a post was published.

## Public previews (Pages Functions)

- `functions/share/index.js` serves the normal application HTML with personalized Open Graph and Twitter metadata (title, description, URL and image) rewritten by Cloudflare's `HTMLRewriter`. Everyone gets the same response; nothing depends on the user agent. The structured-data block is removed from these pages.
- `functions/share/image.png.js` renders a 1200×630 PNG on demand: the full selected postcard on the left (fitted, not cropped) and readable totals, department funding, the change from the baseline and potential revenue on the right.
- `server/result-image.js` builds that layout as SVG. `server/svg-canvas.js` is a small Canvas-like adapter that records the same `src/postcard.js` drawing commands as SVG, and Resvg WebAssembly rasterizes the SVG to PNG. Only the edge function imports the renderer; the browser bundle does not.
- The renderer loads a fixed set of trusted files from the build: the city seal PNG, a JPEG version of the postcard illustration (cropped to the 960×576 view the canvas uses, since the server renderer needs a supported raster format), and Inter at weights 400, 600 and 800 as TTF files in `public/assets/fonts/` (instanced from the site's Inter font, under the SIL Open Font License in `OFL.txt`). The file paths are listed in `functions/share/image.png.js`; if you rename or replace these assets, update that list.
- **Inputs are constrained:** known cut and revenue IDs, the current catalog, a millage value in 0.1 steps, three themes, three headlines and two sides. No arbitrary text, images, HTML or external URLs are accepted. No upload or storage is needed: the plan can be rebuilt from its public URL alone.
- **Caching.** Finished PNGs are cached under a normalized URL key for one day (`Cache-Control: public, max-age=86400`). Share pages are cached for five minutes. Errors use `no-store`, and a failed initialization or asset load retries on the next request. WASM render objects are freed after each request; fonts and images are loaded once per warm worker.
- **Methods.** GET and HEAD are supported (HEAD returns headers only); other methods return 405. Invalid plans return 400.

## Search engines

The homepage keeps its site-wide share card and indexable canonical URL. Share pages are `noindex, follow`, use their own personalized URL as both the canonical and `og:url`, and are never listed in the sitemap. During coming-soon mode, share links require sign-in like the rest of the site.

The canonical URL, `og:url` and image URL on share pages always use `seo.url` from `src/seo.js`, even when you test on another host. Set it to your live address before launch.

## Testing

Vite alone does not run Pages Functions, so test share routes with the local Pages runtime:

```bash
npm run build
npx wrangler pages dev dist --port=5190
node scripts/verify-sharing.mjs            # in a second terminal
```

The site must be open (coming-soon mode off) in the database that runtime uses; see [DEPLOYMENT.md](../DEPLOYMENT.md#test-the-real-functions-runtime-locally) for how to set that locally. The script checks all 18 theme, headline and side combinations (each must produce a distinct 1200×630 PNG under 5 MB), the personalized metadata and canonical URLs, the homepage image, current and legacy redirects, changed budgets, invalid input, HEAD and unsupported methods. Images and a JSON report are written to `.cache/share-verification/`. Pass an origin as an argument to run the same checks against a deployed site that is open to the public.

`npm test` also covers plan parsing, every design URL, image dimensions and SVG content, file delivery to the share sheet, cancellation and link-only fallback, and route configuration.

## Changing the preview

If you change how the preview image looks, increase the `v` value set in `resultURL` in `src/share-plan.js`. New links then get new image URLs, so cached images from the old design are not reused. Social platforms decide when to fetch or refresh a card and may keep showing an older preview on posts that already exist. Some platforms' card validators require signing in, so the most reliable local check is the verification script above.

The image layout in `server/result-image.js` places one row per department at fixed positions, sized for the five departments in the example. If you have more departments, adjust the row spacing there and check the rendered PNGs.
