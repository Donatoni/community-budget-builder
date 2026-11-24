import { defineConfig, loadEnv } from 'vite';
import { renderPage, renderRobots, renderSitemap, siteURL, seo } from './src/seo.js';
import { localDatabase } from './server/dashboard-local.js';
import { reviewerAccess } from './server/reviewer-vite.js';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (command === 'serve') env.DASHBOARD_DB = localDatabase();
  const url = siteURL(env.SITE_URL ?? (mode === 'production' ? seo.url : ''));
  const indexable = command === 'build' && Boolean(url) && env.SEO_NOINDEX !== 'true';

  return {
    appType: 'mpa', // Unknown paths must return 404, not a duplicate home page.
    plugins: [reviewerAccess(env), {
      name: 'deland-static-seo',
      transformIndexHtml: { order: 'pre', handler: (html, context) => context.path.startsWith('/admin') ? html : renderPage(html, url, indexable) },
      buildStart() {
        if (command === 'build' && !url) this.warn('SITE_URL is unset: building a noindex preview without a canonical URL or sitemap. Set the public HTTPS origin for launch.');
      },
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: renderRobots(url, indexable) });
        if (url && indexable) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap(url) });
      },
    }],
    build: { chunkSizeWarningLimit: 500, rolldownOptions: { input: { main: 'index.html', admin: 'admin/index.html' } } },
  };
});
