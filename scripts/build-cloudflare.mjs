import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import { seo } from '../src/seo.js';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
// On Cloudflare, stop early with a clear message if the database IDs were never filled in.
if (process.env.CF_PAGES === '1' && readFileSync('wrangler.jsonc', 'utf8').includes('REPLACE_WITH_')) {
  console.error('wrangler.jsonc still has REPLACE_WITH_ placeholders. Add both D1 database IDs and push again. See DEPLOYMENT.md.');
  process.exit(1);
}
const preview = process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH !== 'main';
const env = {
  ...process.env,
  SITE_URL: seo.url,
  SEO_NOINDEX: preview ? 'true' : (process.env.SEO_NOINDEX || 'false'),
  FFMPEG: process.env.FFMPEG || ffmpeg,
};

for (const [command, args] of [
  ['npm', ['test']],
  ['npm', ['run', 'build']],
  [process.env.PYTHON || 'python3', ['scripts/prepare-cloudflare.py']],
]) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
