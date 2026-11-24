# Make it yours: customizing this site for your city or county

This site was built for the City of DeLand, Florida, to explain how Florida's Amendment 3 affects the City budget and to let residents build and share their own plan to close the funding gap. DeLand's content is still in every file on purpose: it is the worked example. This guide lists every DeLand-specific thing you need to replace, where it lives, and how to find it.

- For a tour of how the code is organized, read [README.md](README.md).
- For hosting, domains, databases, secrets and deployment, read [DEPLOYMENT.md](DEPLOYMENT.md). This guide does not cover those.

## How to use this guide

- Work from top to bottom. The most visible changes come first; the budget data and the technical items come later.
- Every path is relative to the repository root. "Search for" means use your editor's find (or `grep`) for that exact text.
- Line numbers are given where the files are stable. They can drift by a few lines as you edit, so trust the search string over the number.
- Tick the boxes as you go. When you are done, run the commands in [Find what is left](#16-find-what-is-left) to catch stragglers, then run `npm test`. The tests read your data and settings, so they should pass without edits; [section 15](#15-how-the-tests-follow-your-data) explains what they check and the few rules your data must meet.

**Who does what.** Sections 1 to 6 are mostly copy, photos and contact details, so communications staff can do them (with someone comfortable editing HTML). Sections 7 to 15 involve JavaScript and should go to your web developer or IT staff.

**Gather these first:** your logo or seal, favicon, a 1200 by 630 social image, hero photos, any department videos, your budget spreadsheet (one net cost per service), the list of potential revenue options, your meeting schedule and meeting portal, social media links, your privacy policy and public records contact details, and your site's final web address.

## Contents

1. [City name, wordmark and taglines](#1-city-name-wordmark-and-taglines)
2. [Logo, seal and favicons](#2-logo-seal-and-favicons)
3. [Contact details, social links and legal notices](#3-contact-details-social-links-and-legal-notices)
4. [Home page copy, section by section](#4-home-page-copy-section-by-section)
5. [Photos, illustrations and videos](#5-photos-illustrations-and-videos)
6. [Share images and social previews](#6-share-images-and-social-previews)
7. [SEO and site identity](#7-seo-and-site-identity)
8. [Budget data and math](#8-budget-data-and-math)
9. [Public meetings (CivicClerk)](#9-public-meetings-civicclerk)
10. [Amendment 3 content](#10-amendment-3-content)
11. [Staff dashboard, PDF report and time zone](#11-staff-dashboard-pdf-report-and-time-zone)
12. [Colors and fonts](#12-colors-and-fonts)
13. [Add your own analytics](#13-add-your-own-analytics)
14. [Internal names you may want to rename](#14-internal-names-you-may-want-to-rename)
15. [How the tests follow your data](#15-how-the-tests-follow-your-data)
16. [Find what is left](#16-find-what-is-left)

---

## 1. City name, wordmark and taglines

The "wordmark" is the seal plus the two lines of text in the top left of every page: **City of DeLand** and the small tagline **Budget & community priorities**. The product name used in page titles is **Build Your DeLand**.

### Pages (HTML)

| File | What it is | Search for |
| --- | --- | --- |
| [index.html](index.html) | Main site: header wordmark (line 46 to 53), header button "Build your DeLand" (line 64), mobile menu heading (line 86) and the line "Official City of DeLand resource" at the bottom of the mobile menu (line 100), hero label (line 115), video player footer (line 566), feedback form wordmark (line 621 to 624), page footer wordmark (line 678 to 680) | `City of DeLand`, `Build your DeLand`, `Budget &amp; community priorities` |
| [admin/index.html](admin/index.html) | Staff dashboard: `<title>`, sidebar wordmark, "BUILD YOUR DELAND" workspace label, top bar, footer | `DeLand`, `DELAND` |
| [public/coming-soon.html](public/coming-soon.html) | Pre-launch page shown to the public while coming-soon mode is on: `<title>`, meta description, wordmark, headline copy, illustration caption "DELAND, FLORIDA", footer line "Made for the people who call DeLand home." | `DeLand`, `DELAND` |
| [public/login.html](public/login.html) | Staff and reviewer sign-in: `<title>`, wordmark, "BUILD YOUR DELAND" panel, "Sign in to Build Your DeLand" | `DeLand`, `DELAND` |
| [public/privacy.html](public/privacy.html) | Privacy and public records notice: `<title>`, meta description, wordmark, eyebrow "BUILD YOUR DELAND", footer | `DeLand`, `DELAND` |
| [public/404.html](public/404.html) | "Page not found" page: `<title>` and the one line of body text | `DeLand`, `DELAND` |

Notes:

- `aria-label` attributes on the wordmark links also contain the city name (for example `aria-label="City of DeLand ...`). They are read aloud by screen readers, so change them too.
- Taglines and slogans you will probably want to rewrite: "A city we share. A future we shape." ([index.html](index.html) line 116), "YOUR CITY. YOUR PERSPECTIVE." (line 86), "Your city. Your choices. Our future." ([public/coming-soon.html](public/coming-soon.html) and [public/login.html](public/login.html) footer), "Small city. Shared possibilities." (coming-soon caption).

### JavaScript strings

| File | What it is | Search for |
| --- | --- | --- |
| [src/seo.js](src/seo.js) | Site name, page title and description used in search results and link previews (see [section 7](#7-seo-and-site-identity)) | `seo = {` |
| [src/postcard.js](src/postcard.js) | Text painted on the shareable postcard (see [section 6](#6-share-images-and-social-previews)) | `DELAND / FLORIDA`, `DeLand` |
| [src/share.js](src/share.js) | Share caption, share sheet title, postcard screen-reader description, image file names | `DeLand`, `my-deland` |
| [src/share-plan.js](src/share-plan.js) | Title and description of a shared plan's link preview (`resultDescription`, line 71 to 80) | `DeLand budget` |
| [server/result-image.js](server/result-image.js) | Text on the 1200 by 630 link preview image for shared plans | `MY DELAND BUDGET`, `delandfl.gov` |
| [functions/share/index.js](functions/share/index.js) | Error message for a broken share link, which names DeLand's web address (line 7) | `amendment-3.delandfl.gov` |
| [src/dashboard.js](src/dashboard.js), [src/dashboard-pdf.js](src/dashboard-pdf.js) | Staff dashboard and PDF report branding (see [section 11](#11-staff-dashboard-pdf-report-and-time-zone)) | `DeLand`, `DELAND` |
| [src/main.js](src/main.js) | Only a code comment on line 8 | `Build Your DeLand` |

- [ ] Wordmark and product name replaced in all six HTML pages
- [ ] Taglines and slogans rewritten
- [ ] JavaScript strings replaced (sections 6, 7 and 11 have the details)

---

## 2. Logo, seal and favicons

| File | Current size and format | Where it shows |
| --- | --- | --- |
| [public/assets/city-of-deland-seal.png](public/assets/city-of-deland-seal.png) | 328 by 327 px PNG | Header, footer, mobile menu, feedback form, video player, coming-soon, login, privacy and dashboard pages, and both share images. Displayed at 43 to 64 px. |
| [public/favicon.ico](public/favicon.ico) | ICO containing 48, 32 and 16 px icons | Browser tab icon on every page |
| [public/favicon.png](public/favicon.png) | 48 by 48 px PNG | Browser tab icon on the main site |

**Recommended:** a square PNG with a transparent background, at least 256 by 256 px. Keep it a **PNG**: the server that draws share preview images embeds it as `data:image/png`.

**If you keep the same file name**, just replace the file. **If you rename it** (for example to `city-of-springfield-seal.png`), search for `city-of-deland-seal.png` and update every reference:

| File | Locator |
| --- | --- |
| [index.html](index.html) | 4 `<img>` tags (lines 48, 566, 622, 679) |
| [admin/index.html](admin/index.html) | sidebar `.brand` link (line 15) |
| [public/coming-soon.html](public/coming-soon.html), [public/login.html](public/login.html), [public/privacy.html](public/privacy.html) | `.launch-brand` link |
| [src/share.js](src/share.js) | `loadSeal()` (line 26) |
| [functions/share/image.png.js](functions/share/image.png.js) | `paths` array in `assets()` (line 15) |
| [server/reviewer-access.js](server/reviewer-access.js) | `publicAssets` list (line 7 to 12). Files on this list load before sign-in. If you rename the seal and forget this list, the seal will be missing from the coming-soon and login pages. |

Favicons are referenced by `<link rel="icon">` in the `<head>` of all six HTML pages, and both favicon paths are also on the `publicAssets` list in [server/reviewer-access.js](server/reviewer-access.js). Replacing the files in place is easiest.

- [ ] Seal replaced (PNG)
- [ ] `favicon.ico` and `favicon.png` replaced
- [ ] If renamed: every reference above updated, including `publicAssets`

---

## 3. Contact details, social links and legal notices

### Footer of the main site ([index.html](index.html), `<footer id="site-footer">`, line 675 to 712)

- [ ] Location line `DeLand, Florida · Volusia County` (line 682)
- [ ] Heading `Connect with DeLand` (line 686) and the `aria-label` on `nav.footer-social`
- [ ] Social links in `nav.footer-social` (line 687 to 704): Facebook (`facebook.com/CityofDeLand`), Instagram (`instagram.com/cityofdelandfl`), YouTube (a channel URL) and X (`twitter.com/CityofDeLand`). Replace the URLs, and delete the whole `<a>...</a>` block for any network you do not use.
- [ ] Legal line `Informational resource ... not an endorsement for or against Amendment 3.` and `FY 2026/27 budget` (line 707 to 711)

### Privacy and public records page ([public/privacy.html](public/privacy.html))

This page is written around Florida public records law and DeLand's own policies. Have your clerk or attorney review the whole page. Specific items:

| Line | What | Search for |
| --- | --- | --- |
| 8 | Meta description | `name="description"` |
| 30 | "Last updated" date (both the visible text and `datetime`) | `privacy-date` |
| 43 | Paragraph about the CivicClerk meeting portal (see [section 9](#9-public-meetings-civicclerk)) | `CivicClerk` |
| 48 | Hosting provider (Cloudflare) | `hosted by Cloudflare` |
| 50 | Link to the city's general privacy policy | `deland.org/privacy` |
| 66 | Florida records retention wording | `Florida public-records` |
| 67 | City Clerk contact: public records page link, phone number (`tel:+13866267130`, shown as `386-626-7130`) and mailing address (`120 S Florida Avenue, DeLand, FL 32720`) | `Public-Records-Request`, `386-626-7130` |
| 78 | Footer: city name and city privacy policy link | `launch-footer` |

### Other contact details and legal notices

| File | What | Search for |
| --- | --- | --- |
| [index.html](index.html) line 457 | Meeting location and time: "6 p.m. at City Hall (120 S. Florida Ave., DeLand, FL)" | `meeting-where` |
| [index.html](index.html) lines 523 and 655 | Privacy notices under the Submit and feedback buttons: "may be subject to public disclosure under Florida law" | `Florida law` |
| [public/coming-soon.html](public/coming-soon.html) line 32 | "In the meantime, explore the City of DeLand" link to the city's main website | `city-link` |
| [src/seo.js](src/seo.js) line 48 to 56 | City name, website and street address in the structured data that search engines read | `GovernmentOrganization` |

- [ ] Footer location, social links and legal line updated
- [ ] Privacy page reviewed and updated, including the phone, address, links and date
- [ ] Meeting address, Florida law notices and the coming-soon link updated

---

## 4. Home page copy, section by section

Everything below is in [index.html](index.html), in page order. Dollar amounts here are typed by hand; they are not calculated from the budget data, so they must match what you enter in [section 8](#8-budget-data-and-math).

| Section (id) | Lines | What to change |
| --- | --- | --- |
| Header progress bar (`#nav-budget-progress`) | 70 to 76 | "Close a $5.2M gap", "$5.2M to go" |
| Hero (`#hero`) | 111 to 240 | Headline, intro paragraph `.hero-lede` ($5.2 million, $8.8 million, 2028), slideshow (see [section 5](#5-photos-illustrations-and-videos)), the three "journey" links in `.hero-bottom` |
| Big picture (`#overview`) | 242 to 297 | General Fund size ($54M, 2026/2027), the list of six General Fund departments, Year 1 and Year 2 gap ($5.2M, $8.8M) and the bar widths `--bar-size:59.09%` (5.2 divided by 8.8) and `100%`, and the list of fee-funded services (includes "DeLand Municipal Airport") |
| City services (`#services`) | 299 to 357 | Heading "What Makes DeLand, DeLand", intro ($41.99 million), one card per department with its description and **hand-typed total** (`.service-total`, for example `$12.57M`). The card ids (`tour-fire`, `tour-police`, `tour-streets`, `tour-parks`, `tour-planning`) must match the department ids in [src/budget.js](src/budget.js); the video buttons attach to them. The Parks card mentions "DeLand House Museum". The "See the full picture" chart and its total are filled in by JavaScript. |
| Amendment (`#amendment`) | 359 to 393 | Ballot date, exemption amounts, the five fact cards, and the link to the Volusia County Property Appraiser's FAQ (line 391). See [section 10](#10-amendment-3-content). |
| Meetings (`#meetings`) | 395 to 462 | Intro paragraph, featured recording, schedule and location. See [section 9](#9-public-meetings-civicclerk). |
| Budget builder (`#builder`) | 464 to 532 | The two intro paragraphs in `.builder-intro` ($5.2M, $8.8M, $54M, $42M, FY 26/27, FY 27/28, "five departments", Utilities and Stormwater), the gap meter (`#gap-title`, the hidden `.gap-copy-reserve` copies, `#gap-remaining`, the `#gap-progressbar` label, and the milestones `$0`, `$2.6M` halfway, `$5.2M`), the "About these figures" note `#builder-impact-content` (names DeLand's workbook and "Trailer Park"), and `.builder-storage-note` |
| FAQ and Sources | (none) | Not in this file. The `<!-- seo:resources -->` marker on line 534 is replaced at build time from [src/seo.js](src/seo.js) (see [section 7](#7-seo-and-site-identity)). |
| Feedback (`#feedback`) | 536 to 548 | Generic; review the wording |
| Share studio (`#share-modal`) | 569 to 615 | "Share your DeLand." (line 586), the three headline buttons `data-share-headline="0"` to `"2"` (line 594 to 598; they must match `HEADLINES` in [src/postcard.js](src/postcard.js)), canvas and image `aria-label`/`alt` text mentioning DeLand and "five department" |

One more hand-typed copy of the target lives in JavaScript: [src/main.js](src/main.js) line 347, `"You’ve reached the $5.2M target."` and `"Your goal: close a $5.2M gap."`. The other gap numbers on the page are calculated from `REDUCTION_TARGET_M`.

> Tip: search [index.html](index.html), [src/main.js](src/main.js) and [src/seo.js](src/seo.js) for `5.2`, `8.8`, `2.6M`, `54`, `42`, `41.99` and `FY 2` to find every hand-typed figure and fiscal year.

- [ ] Hero, overview, services, builder and share studio copy updated
- [ ] Every hand-typed dollar figure matches your budget data
- [ ] `src/main.js` target strings updated

---

## 5. Photos, illustrations and videos

All of these are DeLand's own photos, artwork and videos. Replace them; do not reuse them for your city.

### Hero slideshow (top of the home page)

- **Files:** [public/assets/hero-photos/](public/assets/hero-photos/), 21 photos, each as a pair:
  - `name.webp`: the large copy, 1920 px wide (or the original's width if smaller)
  - `name-small.webp`: the same photo 960 px wide, same proportions
  - Most are 4:3 (1920 by 1440) or 3:2 (1920 by 1280); four large copies are 1440 or 1536 px wide because the originals were smaller. WebP format.
- **Listed in:** [index.html](index.html) `.hero-slideshow` (line 127 to 191). Each photo is one `<figure class="hero-slide" data-hero-slide ...>` with:
  - `data-hero-label`: the caption shown under the slideshow (for example "Public Works", "Downtown DeLand")
  - `style="--hero-y: 55%; --hero-mobile-x: 57%"`: crop position. `--hero-y` moves the visible area up or down; `--hero-mobile-x` moves it left or right on phones.
  - `width` and `height` set to the large file's actual pixels, and `srcset` widths (`960w`, `1920w`) set to the actual widths of the two files
  - `alt` text describing the photo
- **The first slide is special:** it has `is-active`, `aria-hidden="false"`, a real `src`/`srcset` and `fetchpriority="high"`. All later slides use `data-src`/`data-srcset` so they load only when shown. The first photo is also preloaded in the `<head>` (line 11, `rel="preload" as="image"`); update that line to match your first photo.
- **Dots:** `.hero-slide-dots` (line 203 to 225) needs one `<button data-hero-slide-to="N">` per photo, numbered from 0, with a matching `aria-label`. Also update the starting text of `#hero-slide-label` (first photo's label) and `#hero-slide-count` (`01 / 21`) on lines 200 and 201; JavaScript keeps them current after that.

### Department still image and other illustrations

| File | Size | Where it shows | Referenced in |
| --- | --- | --- | --- |
| [public/assets/hero-planning-room.webp](public/assets/hero-planning-room.webp) | 1672 by 941 (16:9) | Community Development card, which has no videos | [index.html](index.html) line 339 |
| [public/assets/launch-deland-illustration.webp](public/assets/launch-deland-illustration.webp) | 1536 by 1024 (3:2) | Coming-soon and login pages | [public/coming-soon.html](public/coming-soon.html), [public/login.html](public/login.html), and the `publicAssets` list in [server/reviewer-access.js](server/reviewer-access.js) (update it if you rename the file) |
| Postcard artwork | see [section 6](#6-share-images-and-social-previews) | | |

### Department videos

- **Files:** videos in [public/assets/videos/](public/assets/videos/) as `<id>.mp4`; thumbnails in [public/assets/video-posters/](public/assets/video-posters/) as `<id>.jpg` with the **same id**. The file paths are built from the id in [src/service-videos.js](src/service-videos.js) (lines 4 and 5), so the names must match exactly.
- **Listed in:** [src/service-videos-data.js](src/service-videos-data.js), constant `SERVICE_VIDEOS`. Each key is a department id from [src/budget.js](src/budget.js) (`fire`, `police`, `streets`, `parks`), and each video is `{ id, title, duration }` with the duration in seconds (shown on the page). A department with no key gets no video button; DeLand's Community Development card uses a still image instead.
- **Format used:** 1280 by 720 H.264 video at 30 fps with AAC audio and the "faststart" flag (so playback can begin before the download finishes). Thumbnails are 720 by 406 JPEG (16:9).
- Videos play in a dialog using the Plyr player, served from this site. The player's icon sprite and blank video ([public/assets/plyr.svg](public/assets/plyr.svg), [public/assets/player-blank.mp4](public/assets/player-blank.mp4)) are not city-specific; keep them.

**File size limit (25 MiB).** Cloudflare Pages will not serve any single file larger than 25 MiB. [scripts/prepare-cloudflare.py](scripts/prepare-cloudflare.py) runs automatically after the build in `npm run build:cloudflare` (not in plain `npm run build`). What it does, and what that means for you:

- It looks at each `.mp4` in the built copy (`dist/assets/videos/`). Files at or under 25 MiB are left alone. Larger files are re-encoded to H.264 at whatever bitrate fits about 23 MiB, keeping the full length, resolution and 128 kbps audio. Your originals in `public/` are never changed.
- The bitrate depends only on length, so **keep department videos short**. A 3 minute video gets about 940 kbps (fine); a 10 minute video gets about 190 kbps (visibly poor). Host long recordings elsewhere and link to them, the way DeLand does with its commission meeting.
- Each video that needs re-encoding **must have an audio track**; the script asks ffmpeg for one and fails without it.
- The script then checks **every** file in the build, not just videos. A large photo or PDF over 25 MiB also stops the build.
- It needs Python 3 and ffmpeg. The build script supplies ffmpeg from the `ffmpeg-static` package. Encodes are cached in `.cache/cloudflare-videos/` so later builds are fast.

### Meeting recording

The featured meeting video in [index.html](index.html) (line 407 to 411, `.meeting-video-facade`) is not stored in this site. `data-meeting-video` points at an MP4 on CivicClerk's media server (`cpmedia.azureedge.net/delandfl/...`). The thumbnail is [public/assets/video-posters/commission-meeting-2026-11-09.jpg](public/assets/video-posters/commission-meeting-2026-11-09.jpg) (1280 by 720 JPEG), used in both `data-meeting-poster` and the `<img>`. Also update `data-meeting-video-label` and the "1 hr 59 min" text. See [section 9](#9-public-meetings-civicclerk).

- [ ] Hero photos replaced, `<figure>` list, dots, preload and starting labels updated
- [ ] Community Development still and coming-soon illustration replaced
- [ ] Department videos and thumbnails replaced and listed in `SERVICE_VIDEOS`
- [ ] Meeting recording, thumbnail and label updated

---

## 6. Share images and social previews

There are three different images. Know which is which before you start.

| Image | When people see it | Size | Made from |
| --- | --- | --- | --- |
| Site link preview | Someone shares the home page address on social media or in a text | 1200 by 630 JPEG | A static file you supply |
| Personal postcard | A resident finishes the builder and saves or shares their plan | 1080 by 1350 PNG, two sides | Drawn in the browser |
| Shared plan link preview | Someone shares a plan link (`/share/?...`) | 1200 by 630 PNG | Drawn on the server, one per plan |

### Site link preview (static)

- **File:** [public/assets/deland-explore-options-social.jpg](public/assets/deland-explore-options-social.jpg), 1200 by 630 px, 141 KB.
- **Referenced in:** [src/seo.js](src/seo.js), `seo.image` (line 10) and its description `seo.imageAlt` (line 11). These fill the `og:image`, `twitter:image` and structured data tags at build time; there are no hand-written image tags in the HTML.
- **Rules (checked by [tests/seo.test.js](tests/seo.test.js)):** must be a **JPEG**, exactly **1200 by 630**, and **under 500 KB**. The image type and size are written into the tags as fixed values in `renderHead()` and `structuredData()` (lines 63 and 83), so if you ever switch to PNG, change `image/jpeg` there and the JPEG checks in the test `live domain and share image agree across metadata, schema, and sitemap`.
- Rename the file to something like `your-city-social.jpg` and update `seo.image` and `seo.imageAlt`. The test reads the file name from `seo.image`.

### Personal postcard (browser)

Drawn by `paintPostcard()` in [src/postcard.js](src/postcard.js), called from `drawShareCard()` in [src/share.js](src/share.js).

- **Artwork:** [public/assets/share-deland-landmark-puzzle.webp](public/assets/share-deland-landmark-puzzle.webp), 1600 by 960 (5:3). It fills a 960 by 576 box on the front of the card, cropped to fit, so use a 5:3 image. Path set in `loadIllustration()` ([src/share.js](src/share.js) line 18).
- **Text on the card** ([src/postcard.js](src/postcard.js)):
  - `HEADLINES` (line 11): exactly **three** two-line headlines. The share studio buttons in [index.html](index.html) (line 594 to 598) must show the same words, and shared links only accept headline numbers 0 to 2 ([src/share-plan.js](src/share-plan.js) line 44).
  - Header: `'DELAND / FLORIDA'` and `'A FUTURE BUILT BY ALL OF US'` (lines 37 and 38)
  - Footer: `'What would your DeLand look like?'` and `'... Painted DeLand landmarks'` (lines 93 and 98), plus the `FY 26/27` labels (lines 91 and 98)
  - `THEMES` (line 6 to 10): the three color styles (Daylight, Blue hour, Citrus). The swatches shown in the studio are separate CSS in [src/share-studio.css](src/share-studio.css) (`.swatch-daylight` and so on, line 32 to 34); keep them in step.
  - `COLORS` (line 5): one color per department on the back of the card.
- **Back of the card:** every department bar uses a fixed **$0 to $20M scale** (`values[i] / 20` and `service.proposed / 20`, lines 84 and 86, and the label on line 91). If any of your departments is over $20M, or all are much smaller, change the `20` in all three places. The layout fits five departments comfortably (six at most).
- **Other strings** in [src/share.js](src/share.js): the screen-reader description that names DeLand's landmarks (line 40), the copied caption (line 52), the share sheet title `'My DeLand budget'` (line 63), and download names `my-deland-postcard.png` and `my-deland-${suffix}.png` (lines 56, 80, 91).

### Shared plan link preview (server)

When a plan link is shared, [functions/share/index.js](functions/share/index.js) rewrites the page's title and preview tags using `resultDescription()` in [src/share-plan.js](src/share-plan.js) (line 71 to 80), and points `og:image` at [functions/share/image.png.js](functions/share/image.png.js). That function draws [server/result-image.js](server/result-image.js) as SVG (using [server/svg-canvas.js](server/svg-canvas.js), which replays the same `paintPostcard()` drawing) and converts it to PNG.

- **Assets it loads** ([functions/share/image.png.js](functions/share/image.png.js) line 15): the seal (must be **PNG**), the artwork as **JPEG** [public/assets/share-deland-landmark-puzzle.jpg](public/assets/share-deland-landmark-puzzle.jpg) at **960 by 576** (the size is also typed in on line 21, so match it or change it), and the fonts `public/assets/fonts/inter-400.ttf`, `inter-600.ttf`, `inter-800.ttf`. Make the JPEG and WebP from the same artwork.
- **Text in [server/result-image.js](server/result-image.js):** `'MY DELAND BUDGET'` (line 39), the web address footer `'amendment-3.delandfl.gov · Personal budget proposal'` (line 62), and the frame colors (line 10 and the hex values in the `<svg>`). One department row per department (line 48 to 56); five rows fit.
- **Title and description** in [src/share-plan.js](src/share-plan.js) `resultDescription()`: "My ... DeLand budget", "across five departments", "build your own DeLand budget".
- **Refreshing cached images:** preview images are cached for a day, keyed by their URL. After you change the artwork or text, raise the `v` number in `resultURL()` ([src/share-plan.js](src/share-plan.js) line 50, currently `'8'`) so new links get new images. The tests accept any value.

- [ ] Site link preview JPEG replaced, `seo.image` and `seo.imageAlt` updated
- [ ] Postcard artwork replaced as both WebP (browser) and JPEG 960 by 576 (server)
- [ ] Postcard headlines and text replaced; studio buttons match
- [ ] Bar scale checked for your department sizes
- [ ] Server preview text and web address replaced; `v` raised

---

## 7. SEO and site identity

### [src/seo.js](src/seo.js)

| Line | Name | What it is |
| --- | --- | --- |
| 5 | `seo.url` | The site's public address, ending in `/`. Used for canonical links, preview tags, the sitemap and shared plan links. Production builds use it by default; `SITE_URL` can override it (see [.env.example](.env.example) and [DEPLOYMENT.md](DEPLOYMENT.md)). |
| 6 | `seo.name` | Site name ("Build Your DeLand") |
| 7 | `seo.title` | Browser tab and search result title |
| 8 | `seo.description` | Search result and link preview description |
| 9 | `seo.reviewed` | Date the content was last reviewed (`YYYY-MM-DD`); used as the sitemap date and in the Sources section. The visible date "November 24, 2026" on line 118 is typed separately; change both. |
| 10 and 11 | `seo.image`, `seo.imageAlt` | See [section 6](#6-share-images-and-social-previews) |
| 15 to 29 | `faqs` | Questions and answers. Each one appears on the page and in the structured data search engines read. The third answer mentions DeLand, "five departments", "three sports facilities" and "$5.2 million". |
| 48 to 56 | `structuredData()` | The publishing organization: `publisherId`, `name`, `url` and `address`. Replace with your government's name, main website and street address. |
| 66 | `spatialCoverage` | `'DeLand, Florida'` |
| 93 | `renderResources()` | FAQ heading "DeLand budget &amp; property tax FAQs" |
| 111 to 117 | Sources list | Links to the Volusia County Property Appraiser, DeLand's budget and millage pages, and the Florida Department of Revenue. Replace with your own official sources. |

### Sitemap and robots.txt

[vite.config.js](vite.config.js) builds `robots.txt` and `sitemap.xml` from `seo.url` (functions `renderRobots()` and `renderSitemap()` in [src/seo.js](src/seo.js)). You do not edit them by hand. The plugin is named `deland-static-seo` (line 15); renaming it is optional.

### [package.json](package.json)

- `name`: `community-budget-builder` (rename it for your project if you like)
- `description`: credits the City of DeLand; reword it for your site

- [ ] `seo` object, FAQs, structured data, place name and sources updated
- [ ] Both review dates updated
- [ ] `package.json` name and description updated

---

## 8. Budget data and math

This is the heart of the site. The numbers flow like this:

1. [src/cost-center-source.js](src/cost-center-source.js): raw rows copied from the budget spreadsheet
2. [src/cost-center-data.js](src/cost-center-data.js): turns raw rows into the service choices residents see (names, descriptions, ids, which department each belongs to, exclusions and merges) and the potential revenue options
3. [src/budget.js](src/budget.js): the departments, the gap target and formatting helpers
4. [src/cost-centers.js](src/cost-centers.js): the catalog version and the plan math (cuts plus revenue, target met or not)
5. Everything else (builder, postcard, dashboard, server checks) reads from these

Every department total is the sum of its service choices, and the "baseline" ($41.99M for DeLand) is the sum of the departments. Amounts are added in whole cents to avoid rounding drift.

**Keep the department ids** (`fire`, `police`, `streets`, `parks`, `planning`) even if your departments are named differently. They are internal keys used by the service cards in [index.html](index.html) (`tour-<id>`), [src/service-videos-data.js](src/service-videos-data.js) and CSS classes. Change the display `name` instead. If you need a different set of departments, see "Changing the number of departments" below.

### Step 1: raw data, [src/cost-center-source.js](src/cost-center-source.js)

The default export has this shape:

```js
export default {
  workbook: "FY 26-27 Full Cost Centers.xlsx",       // label only
  costCenters: [
    { sourceCell: "Main!B18",                         // where the number came from (for your records and the dashboard)
      division: "1117",                               // your accounting division code (used to pick the department, see step 2)
      name: "Economic Development",                   // short name as it appears in the spreadsheet
      totalCostCenter: 452669.5859785511 },           // net annual cost in dollars (cost minus the revenue it already brings in)
    // ... one row per service
  ],
  revenues: [
    { sourceCell: "Potential Revenues!B3",
      name: "Establish Fire Fee",
      amount: 3000000,                                // estimated annual revenue in dollars
      description: "A special assessment that ...",   // shown to residents
      assumption: "Preliminary Estimate" },           // shown to residents
    // ... one row per revenue option
  ],
};
```

A negative `totalCostCenter` means the service earns more than it costs; the builder explains that cutting it widens the gap.

### Step 2: service choices and revenue options, [src/cost-center-data.js](src/cost-center-data.js)

| Line | Name | What to do |
| --- | --- | --- |
| 6 to 44 | `supplied` | Approved plain-language description for each service, keyed by the spreadsheet `name`. Shown under each choice. |
| 45 | `drafts` | Descriptions not yet approved go here; they are marked as drafts on the page. Move them to `supplied` once approved. |
| 46 to 53 | `names` | Friendlier display names, keyed by spreadsheet `name` (for example `'Street Maint'` becomes `'Street Maintenance'`) |
| 54 | `ids` | Fixed ids for choices whose display name changed. Every other id is made from the department id plus the display name (for example `streets-sidewalks`). Ids appear in share links and saved submissions, so keep them stable once you launch. |
| 56 to 76 | `sportsNames`, `fieldOperationsRows`, `catalogRows` | **DeLand-only rules:** drops `'Trailer Park'` (line 61), folds `'Com Engage.'` into `'Field Ops'`, and merges three sports rows into one "Sports Facilities" choice. Delete or rewrite these for your data. |
| 77 to 79 | `serviceFor` | **DeLand-only rule:** picks the department from DeLand's division code (`11xx` is Community Development, `1222`/`1223` Fire, other `12xx` Police, `13xx` Public Works, everything else Parks). Rewrite it for your chart of accounts. Every department id in `SERVICES` must end up with at least one row, or the page will fail to load. |
| 92 | `revenueIds` | Ids for the revenue options, **in the same order** as `revenues` in the source file |
| 93 | `revenueNames` | Display names, same order |
| 94 to 100 | `POTENTIAL_REVENUES` | **DeLand-only overrides by position:** the second option (index 1, the millage increase) has its amount replaced with `2900000` and its assumption rewritten; the sixth (index 5) has its assumption rewritten. Remove or adjust these overrides to match your list. |

**The millage slider.** The option with id `millage-rate` is shown as a slider instead of a checkbox. Its `amount` is the estimated revenue of a **full 1 mill** increase (DeLand: $2.9M, or $290,000 per 0.1 mill). One mill is $1 per $1,000 of taxable value, so a rough figure is your citywide taxable value divided by 1,000, adjusted for collections. The 0 to 1 mill range in 0.1 steps is fixed in three places: the slider `min`/`max`/`step` and scale labels in [src/cost-center-builder.js](src/cost-center-builder.js) (line 63), `selectedMillageRate()` in [src/cost-centers.js](src/cost-centers.js) (line 15 to 21), and the `millage` check in `readSharedPlan()` in [src/share-plan.js](src/share-plan.js) (line 24). If your government cannot change its millage, remove the `millage-rate` option (its row in the source file, its entries in `revenueIds` and `revenueNames`, and the index 1 overrides, which then point at a different option). The plan math, share links and server check it by id and work without it, and the millage tests are skipped. The builder then shows the remaining options as checkboxes, with no slider.

### Step 3: departments and target, [src/budget.js](src/budget.js)

| Line | Name | What it is |
| --- | --- | --- |
| 3 | comment | Note about where DeLand's figures came from. Replace with your own source note. |
| 6 | `REDUCTION_TARGET_M` | **The gap residents must close, in millions** (5.2). Drives the progress bar, the Submit button and the server check. Hand-typed copies of this number are listed in [section 4](#4-home-page-copy-section-by-section). |
| 8 and 9 | `SUBMIT_ENDPOINT`, `FEEDBACK_ENDPOINT` | Not city-specific; leave them |
| 11 to 88 | `SERVICES` | One entry per department, in display order: `id`, `icon` (one of the `<symbol id="icon-...">` names at the top of [index.html](index.html): `flame`, `shield`, `road`, `tree`, `chart`, `home`, `building`), `tone` (icon color: `coral`, `blue`, `orange`, `green`, `purple` or `navy`), `name` (shown everywhere), `proposed` (calculated from the choices; do not type a number). `desc`, `cutExamples` and `max` are left from an earlier version and are not shown on the page, but `max` still limits old-style share links and the tests expect exactly four `cutExamples` per department, so update them sensibly. |

### Step 4: catalog version, [src/cost-centers.js](src/cost-centers.js)

`COST_CENTER_VERSION` (line 5, currently `'fy26-27-6'`) is stamped on every share link and saved submission. **Change it whenever amounts or the meaning of a choice change.** Old links with a different version are then rejected instead of being shown with the wrong numbers, and the server refuses submissions from a page that is out of date. For your first launch, pick a new value such as `'fy27-28-1'`.

### Step 5: department colors, [src/budget-composition.js](src/budget-composition.js)

`SERVICE_COLORS` (line 3) gives each department its color in the "See the full picture" chart and the builder cards, in `SERVICES` order. There are six colors. The postcard uses its own darker list (`COLORS` in [src/postcard.js](src/postcard.js)).

### Text that repeats the numbers

These are typed by hand and must agree with your data: the hero, overview, service card totals and builder text in [index.html](index.html) ([section 4](#4-home-page-copy-section-by-section)), the target strings in [src/main.js](src/main.js) line 347, the FAQ answer in [src/seo.js](src/seo.js), the "FY 26/27" labels on the postcard ([src/postcard.js](src/postcard.js)) and in the PDF report footnote ([src/dashboard-pdf.js](src/dashboard-pdf.js) line 70).

### Changing the number of departments

The data code works with any number of departments, but several layouts were drawn for five:

- Postcard back: one row per department, 109 px apart ([src/postcard.js](src/postcard.js) line 77); six fit.
- Shared plan preview: one row per department, 43 px apart ([server/result-image.js](server/result-image.js) line 49); five fit before the revenue line.
- Colors: six in `SERVICE_COLORS` and six in the postcard `COLORS`.
- Copy that says "five departments": [index.html](index.html) (`#share-details-canvas` label, services chart caption, builder intro), [src/share-plan.js](src/share-plan.js) `resultDescription()`, [src/seo.js](src/seo.js) FAQ.
- Service cards in [index.html](index.html) are written by hand, one `<article class="service-card" id="tour-<id>">` per department.
- Old-style share links (the `b` parameter in [src/share-plan.js](src/share-plan.js)) assume the same count; a new site has no old links, so this only matters if you change the count after launch.

- [ ] Source rows and revenue rows entered
- [ ] Descriptions, names, ids, exclusions and `serviceFor` rewritten
- [ ] Revenue ids, names and overrides match your list; millage value set
- [ ] `SERVICES` names, icons and order set; `REDUCTION_TARGET_M` set
- [ ] `COST_CENTER_VERSION` changed
- [ ] Hand-typed figures match

---

## 9. Public meetings (CivicClerk)

DeLand posts agendas and recordings on CivicClerk. [src/budget-meetings.js](src/budget-meetings.js) asks CivicClerk's public API for City Commission meetings on the scheduled dates and, when it finds a match, adds "Agenda" and "Watch recording" links under that date. It also tags the next upcoming date as "Next meeting" using the visitor's own date.

**You must change or turn this off.** Left as is, it will look up DeLand's meetings, and if any of your dates match a DeLand meeting it will show DeLand's links.

| Line | Name | What it is |
| --- | --- | --- |
| 4 | `MEETING_PORTAL` | `https://delandfl.portal.civicclerk.com` (the public portal; links point here) |
| 5 | `EVENTS_API` | `https://delandfl.api.civicclerk.com/v1/Events` |
| 6 | `BUDGET_MEETING_START` | `'T18:00'`, the usual start time (keep the `THH:MM` form), used to choose between two meetings on the same day |
| 12 and 21 | `'City Commission'` | The meeting category (your portal may call it City Council or Board of County Commissioners) |

- **If you use CivicClerk:** replace `delandfl` in both addresses with your portal's name, and update the category and start time.
- **If you do not:** delete the `initBudgetMeetings();` line in [src/main.js](src/main.js) (near the end, search for `initBudgetMeetings();`). The schedule stays as plain text, and [tests/budget-meetings.test.js](tests/budget-meetings.test.js) still passes because it tests the matching functions, not the call. You could also write a small adapter for your own portal that returns the same fields (`id`, `startDateTime`, `categoryName`, `publishedFiles`, `hasMedia`); if you change the matching rules themselves, update that test file to describe your rules.

**The schedule itself** is plain HTML in [index.html](index.html), `ol.meeting-list` (line 429 to 454). Each meeting is:

```html
<li data-meeting-date="2027-01-11" data-meeting-label="January 11">
  <time class="meeting-date" datetime="2027-01-11"><span>Jan</span> <b>11</b></time>
  <div class="meeting-body"><div class="meeting-text"><p>What will be discussed.</p></div></div>
</li>
```

Also in the meetings section: the intro paragraph (line 402), the featured past meeting `.meeting-feature` (line 405 to 422: recording, kicker, summary, and two links to CivicClerk event `909`), and the time and place `.meeting-where` (line 455 to 458). Remove `.meeting-feature` entirely if you have no recording to feature. Update the CivicClerk paragraph in [public/privacy.html](public/privacy.html) (line 43) to name your provider, or remove it.

- [ ] Meeting portal addresses and category updated, or the lookup turned off
- [ ] Schedule dates, labels and descriptions replaced
- [ ] Featured recording replaced or removed; location updated
- [ ] Privacy page paragraph updated

---

## 10. Amendment 3 content

Amendment 3 is a Florida statewide measure, so its facts are the same for every Florida city and county. **If you are in Florida**, keep the facts and replace only the local links: the Volusia County Property Appraiser FAQ link in [index.html](index.html) (line 391) and the two Volusia links in the Sources list in [src/seo.js](src/seo.js) (lines 112 and 113). **If you are outside Florida**, rewrite the `#amendment` section of [index.html](index.html), the hero intro, the FAQs in [src/seo.js](src/seo.js), the site title and description, and the "Florida law" notices ([section 3](#3-contact-details-social-links-and-legal-notices)).

- [ ] Local links replaced (Florida) or amendment content rewritten (elsewhere)

---

## 11. Staff dashboard, PDF report and time zone

The staff dashboard is at `/admin/`. Staff accounts, roles and the database are covered in [DEPLOYMENT.md](DEPLOYMENT.md); this section is only about names, labels and time.

### Branding

| File | Line | What |
| --- | --- | --- |
| [admin/index.html](admin/index.html) | 7, 8, 15, 16, 42, 46, 48, 53 | Theme color, `<title>`, sidebar wordmark and seal, "BUILD YOUR DELAND" label, placeholder avatar letter `D` (`#avatar`, replaced by the signed-in person's initials), top bar, page description, footer |
| [src/dashboard.js](src/dashboard.js) | 34 | Overview page description "See how people are shaping their DeLand budget." |
| [src/dashboard.js](src/dashboard.js) | 129 | Browser tab title suffix `| City of DeLand` |
| [src/dashboard.js](src/dashboard.js) | 220, 235 | Download names `deland-report-...pdf` and `deland-...csv` |
| [src/dashboard.js](src/dashboard.js) | 231 | Report CSV heading "Build Your DeLand ... submission analytics" |
| [src/dashboard-pdf.js](src/dashboard-pdf.js) | 5 | PDF colors `navy`, `teal`, `muted` (RGB) |
| [src/dashboard-pdf.js](src/dashboard-pdf.js) | 15 | PDF document properties: title, `author: 'City of DeLand'`, `creator: 'Build Your DeLand'` |
| [src/dashboard-pdf.js](src/dashboard-pdf.js) | 70 | Footnote naming the FY 2026/27 workbook |
| [src/dashboard-pdf.js](src/dashboard-pdf.js) | 82 and 83 | Page header `'CITY OF DELAND'` and `'BUILD YOUR DELAND / COMMUNITY INSIGHTS'` |
| [src/dashboard.css](src/dashboard.css) | 2 | Dashboard colors (`--navy`, `--teal`, `--muted`, `--line`, `--blue`) |

The PDF uses the built-in Helvetica font and has no logo, so there is no image to replace.

### Time zone

Dashboard dates, reporting days, date filters, CSV files and PDF reports all use **Eastern Time**. Records are stored in UTC, so changing the zone does not change any data, only how it is grouped and shown. The tests check day boundaries against whatever zone you set; the daylight saving test is skipped for zones without daylight saving time, such as `America/Phoenix`.

- [ ] Change `DASHBOARD_TIME_ZONE` in [src/dashboard-time.js](src/dashboard-time.js) (line 1, `'America/New_York'`) to your zone's standard name, for example `'America/Chicago'`, `'America/Denver'`, `'America/Phoenix'` or `'America/Los_Angeles'`. It is used by the dashboard in the browser and by [server/dashboard-api.js](server/dashboard-api.js) for reporting day boundaries.
- [ ] Replace the words "Eastern Time", which are typed separately: [admin/index.html](admin/index.html) line 53 (`#updated-label`), [src/dashboard.js](src/dashboard.js) lines 67, 80, 148, 149, 181, 228 and 231, [src/dashboard-data.js](src/dashboard-data.js) line 55 (CSV column heading), and [src/dashboard-pdf.js](src/dashboard-pdf.js) line 14.

The meetings code ([section 9](#9-public-meetings-civicclerk)) does not use this setting.

---

## 12. Colors and fonts

DeLand's look is a "civic blue" palette with white and soft blue surfaces. Colors are set as CSS custom properties (named values like `--blue`) where possible; a few places use fixed values.

| File | Locator | What it controls |
| --- | --- | --- |
| [src/styles.css](src/styles.css) | `:root` (line 9 to 40) | Base palette: `--navy`, `--blue`, `--sky`, `--ink`, `--muted`, the department tones (`--green`, `--orange`, `--coral`, `--purple`), borders, shadows, corner radius, and `--font` |
| [src/civic-design.css](src/civic-design.css) | `:root` (line 3 to 21) | **Overrides** many of the same values. This file loads later, so its values win. Change colors here first. |
| [src/dashboard.css](src/dashboard.css) | `:root` (line 2) | Staff dashboard palette |
| [public/assets/launch.css](public/assets/launch.css) | fixed hex values throughout | Coming-soon, login and privacy pages |
| [public/assets/privacy.css](public/assets/privacy.css) | fixed hex values | Privacy page extras |
| [public/404.html](public/404.html) | inline `<style>` | 404 page |
| [src/budget-composition.js](src/budget-composition.js) | `SERVICE_COLORS` | Department colors in charts and builder cards |
| [src/postcard.js](src/postcard.js) | `COLORS`, `THEMES` | Postcard colors and its three styles |
| [src/share-studio.css](src/share-studio.css) | `.swatch-daylight`, `.swatch-bluehour`, `.swatch-citrus` | Style swatches in the share studio (keep in step with `THEMES`) |
| [server/result-image.js](server/result-image.js) | `t = {...}` (line 10) and hex values in the SVG | Frame of the shared plan preview image |
| [src/dashboard-pdf.js](src/dashboard-pdf.js) | `navy`, `teal`, `muted` | PDF report |
| [src/service-videos.css](src/service-videos.css) | `--plyr-color-main` (line 51) | Video player accent |
| All six HTML pages | `<meta name="theme-color">` | Browser toolbar color on phones |

Many component colors in [src/styles.css](src/styles.css), [src/builder-workspace.css](src/builder-workspace.css) and [src/share-studio.css](src/share-studio.css) are also written as fixed hex values. Search for your old blue (`#2864ed`, `#326beb`) to find them.

**Fonts.** The site uses Inter, hosted in [public/assets/fonts/](public/assets/fonts/) under the SIL Open Font License ([OFL.txt](public/assets/fonts/OFL.txt)). There is no Google Fonts connection. `inter-latin.woff2` is the web font; `inter-400.ttf`, `inter-600.ttf` and `inter-800.ttf` are used by the server to draw preview images. To change fonts, replace the files and update: `@font-face` and `--font` in [src/styles.css](src/styles.css), `@font-face` in [src/dashboard.css](src/dashboard.css) and [public/assets/launch.css](public/assets/launch.css), the font `preload` links in [index.html](index.html) (line 10) and [public/coming-soon.html](public/coming-soon.html) (line 12), `inter-latin.woff2` in the `publicAssets` list in [server/reviewer-access.js](server/reviewer-access.js), the canvas font in [src/postcard.js](src/postcard.js) (`text()` helper), `font-family="Inter"` in [server/result-image.js](server/result-image.js) and [server/svg-canvas.js](server/svg-canvas.js), the font paths and `defaultFontFamily` in [functions/share/image.png.js](functions/share/image.png.js), and `--plyr-font-family` in [src/service-videos.css](src/service-videos.css).

- [ ] Palette updated in `civic-design.css` and `styles.css`
- [ ] Launch pages, dashboard, postcard and share image colors updated
- [ ] Fonts kept or replaced everywhere listed

---

## 13. Add your own analytics

The published copy has **no analytics**. To measure visits, add your own tag (for example the Google Analytics `gtag.js` snippet, or your city's preferred tool) to the `<head>` of these six pages, just before `</head>`:

| File | Where |
| --- | --- |
| [index.html](index.html) | before `</head>` (line 30), after the small inline script |
| [admin/index.html](admin/index.html) | before `</head>` (line 11). Leave it out if you do not want to track staff. |
| [public/coming-soon.html](public/coming-soon.html) | before `</head>` (line 13) |
| [public/login.html](public/login.html) | before `</head>` (line 12) |
| [public/privacy.html](public/privacy.html) | before `</head>` (line 13) |
| [public/404.html](public/404.html) | before `</head>` (line 16) |

Notes:

- The files in `public/` are copied to the site as they are; `index.html` and `admin/index.html` are processed by the build. An ordinary inline `<script>` tag works in both.
- The site sends no Content Security Policy header, so no header change is needed to load an analytics script.
- **Budget challenge funnel events.** [src/analytics.js](src/analytics.js) (`createChallengeTracker()`) sends three events through `window.gtag` **if it exists**, and does nothing if it does not: `challenge_start` (the first time a resident checks a cut, a revenue option or moves the millage slider), `challenge_target_met` (the gap is closed, only after a start) and `challenge_submit` (the plan is saved). Each is sent at most once per page load, as `gtag('event', name)` with no extra details, and a later step also sends any earlier step that was skipped, so the counts always go start, then target met, then submit. If you use Google Analytics, these appear automatically. If you use another tool, either define a small `window.gtag` function that forwards to it, or change the default `send` argument of `createChallengeTracker()`.
- The privacy page says nothing about analytics. If you add a tag, add a paragraph to [public/privacy.html](public/privacy.html) (section `#browser-storage`) that names the tool and explains what it collects.

- [ ] Analytics tag added to the pages you want to measure (or deliberately left out)
- [ ] Privacy page paragraph matches

---

## 14. Internal names you may want to rename

Visitors never see these, so renaming is optional. Each one is safe to leave.

| File | Locator | What it is | Note |
| --- | --- | --- | --- |
| [src/main.js](src/main.js) | `deland-budget-submissions` (lines 507 and 510), `deland-feedback-completed` (line 643) | Browser storage keys | Renaming only forgets earlier visits' local markers |
| [server/reviewer-access.js](server/reviewer-access.js) | `COOKIE` (line 3), `deland_reviewer` | Reviewer sign-in cookie | Renaming signs everyone out. Keep it different from the staff cookie. |
| [server/staff-auth.js](server/staff-auth.js) | `COOKIE` (line 4), `deland_staff` | Staff sign-in cookie | Same |
| [src/share.js](src/share.js), [src/dashboard.js](src/dashboard.js) | `my-deland`, `deland-report`, `deland-` | Downloaded file names | Visible in residents' and staff's downloads folders. Use letters, digits, dots, hyphens or underscores. |
| [vite.config.js](vite.config.js) | `deland-static-seo` | Build plugin name | |
| [scripts/verify-sharing.mjs](scripts/verify-sharing.mjs) | `'fire-ems'` (line 14) | Sample cut id used by the share check script | Use an id that exists in your catalog |
| [LICENSE](LICENSE) | Copyright line | MIT license | The MIT license requires keeping DeLand's notice; add your own copyright line for your changes |

---

## 15. How the tests follow your data

Run `npm test` after each round of changes. The deployment build also runs the tests and stops if any fail.

The tests do not contain DeLand's figures. They read the same data and settings the site uses (the source rows, the catalog, `SERVICES`, `REDUCTION_TARGET_M`, `COST_CENTER_VERSION`, the revenue options, `seo`, `DASHBOARD_TIME_ZONE`, the meeting settings, the cookie names and the download names) and compare the code's results with totals and dates they work out separately, in whole cents and with the browser's own time-zone rules. So when you change the things this guide lists, the tests should keep passing with no edits. **A failing test means something in your data or code needs attention; fix that rather than the test.**

### What they check

| Test file | What it checks |
| --- | --- |
| [tests/cost-centers.test.js](tests/cost-centers.test.js) | Every source row is used in at most one choice; merged choices equal the sum of their rows; rows no choice uses (your exclusions) are left out of the baseline; department totals and the baseline add up in cents; choice ids are unique and safe in links; cuts, revenue and the millage rate add up exactly; the target is met exactly when cuts plus revenue reach `REDUCTION_TARGET_M`; share links keep the exact choices and reject other catalog versions; the builder's checkboxes and totals |
| [tests/budget.test.js](tests/budget.test.js) | The baseline is the sum of the departments; service effects change at the 17%, 33.5% and 50% cut levels; money formatting |
| [tests/budget-composition.test.js](tests/budget-composition.test.js) | The budget chart keeps cuts as empty space; every department has its own color |
| [tests/share-plan.test.js](tests/share-plan.test.js) | Share links and image links keep every choice, reject bad or injected input, and redirect old links; preview images show the right totals for every department |
| [tests/share-download.test.js](tests/share-download.test.js) | Saving the postcard on phones and computers, with the same file name on both |
| [tests/seo.test.js](tests/seo.test.js) | `seo.url` is a clean HTTPS address; canonical and social tags, FAQs and structured data agree; robots and sitemap rules; the social image exists and is a JPEG, 1200 by 630, under 500 KB |
| [tests/budget-meetings.test.js](tests/budget-meetings.test.js) | The portal query asks for your category on your dates; the matcher picks the meeting at `BUDGET_MEETING_START`, ignores test events and other boards, and links nothing when unsure; your schedule's dates are valid and in order |
| [tests/dashboard-time.test.js](tests/dashboard-time.test.js) | Reporting days start at local midnight in `DASHBOARD_TIME_ZONE`; timestamps show local time; daylight saving days are 23 and 25 hours long |
| [tests/dashboard.test.js](tests/dashboard.test.js) | The server recalculates every submission and ignores totals sent by the browser; retries, conflicts and limits; sign-in, sessions and staff roles; day boundaries in your time zone; CSV safety |
| [tests/reviewer-access.test.js](tests/reviewer-access.test.js) | The reviewer gate, sign-in, session expiry and the public files allowed before sign-in |
| [tests/analytics.test.js](tests/analytics.test.js), [tests/video-ranges.test.js](tests/video-ranges.test.js) | Analytics events and video seeking; not city-specific |

### Tests that are skipped on purpose

A skipped test is not a failure; `npm test` reports it as `# SKIP` with the reason.

- Without a `millage-rate` revenue option, the three millage tests are skipped (see "The millage slider" in [section 8](#8-budget-data-and-math)).
- In a time zone without daylight saving time, the daylight saving test is skipped.
- If [index.html](index.html) has no `data-meeting-date` schedule, the schedule test is skipped.
- If your source rows do not each have their own `sourceCell`, the test that traces choices back to source rows is skipped.

### Rules your data must still follow

These are real limits of the code, so the tests enforce them:

- Every department in `SERVICES` has at least one choice, a positive net total and exactly four `cutExamples`.
- Every choice has a description (in `supplied` or `drafts`) and an id made of lowercase letters, digits and hyphens.
- Cutting every choice must be enough to close the `REDUCTION_TARGET_M` gap.
- `SERVICE_COLORS` in [src/budget-composition.js](src/budget-composition.js) needs one distinct color per department (six are provided).
- `HEADLINES` in [src/postcard.js](src/postcard.js) has exactly three entries, because share links accept headline numbers 0 to 2.
- Every department listed in [src/service-videos-data.js](src/service-videos-data.js) has a `tour-<id>` card in [index.html](index.html).
- The reviewer and staff cookies have different names.
- `DASHBOARD_TIME_ZONE` is less than 12 hours ahead of UTC, because calendar labels are drawn at noon UTC (every zone in the Americas qualifies).

The tests also check a few fixed interface phrases that come from the code rather than from your content, such as "Cut selected", "Revenue added", "No funding remains", "deducted", "No change", "Meeting details" and "Watch recording". If you reword one of those in the code, update the matching line in the test.

---

## 16. Find what is left

When you think you are done, list every remaining mention of DeLand, its county, its web addresses and its accounts. In a Git checkout:

```sh
git grep -n -i -I -e deland -e volusia -e vcgov -e civicclerk -e azureedge -e "Eastern Time" -e "America/New_York" -e "386-626" -e "120 S" -e CityofDeLand
```

Without Git (searches only the site's own folders, skipping `node_modules` and `dist`):

```sh
grep -r -n -i -I -e deland -e volusia -e vcgov -e civicclerk -e azureedge -e "Eastern Time" -e "386-626" index.html admin public src server functions scripts tests vite.config.js package.json .env.example README.md
```

Matches inside this guide are expected. Then run `npm test`, start the site with `npm run dev`, and click through every page: home, builder, share studio (save an image on both sides), feedback, `/privacy`, `/login`, `/coming-soon`, a missing page for the 404, and `/admin/`.
