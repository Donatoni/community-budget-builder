// Manual upload to Cloudflare Pages. The project name comes from wrangler.jsonc.
// Wrangler uses the account you are signed in to; if your login can reach more
// than one account, set CLOUDFLARE_ACCOUNT_ID in your shell first. Never commit it.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { seo } from '../src/seo.js';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const config = readFileSync('wrangler.jsonc', 'utf8');
const project = config.match(/^\s*"name"\s*:\s*"([^"]+)"/m)?.[1];
if (!project || config.includes('REPLACE_WITH_')) {
  console.error('Finish wrangler.jsonc first: set "name" and both D1 database IDs. See DEPLOYMENT.md.');
  process.exit(1);
}
const env = { ...process.env, SITE_URL: seo.url, SEO_NOINDEX: 'false' };
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}

run('npx', ['wrangler', 'whoami']);
run('npm', ['run', 'build:cloudflare']);
run('npx', ['wrangler', 'pages', 'deploy', 'dist', `--project-name=${project}`, '--branch=main']);
