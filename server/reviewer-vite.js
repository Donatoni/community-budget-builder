import { comingSoonEnabled } from './site-settings.js';
import { readFile } from 'node:fs/promises';
import { handleDashboardRequest } from './dashboard-api.js';
import { reviewerGate, publicAssets } from './reviewer-access.js';

export function reviewerAccess(env) {
  const configure = server => {
    server.middlewares.use(async (req, res, next) => {
      try {
        const headers = new Headers();
        for (const [name, value] of Object.entries(req.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
        headers.set('CF-Connecting-IP', req.socket.remoteAddress || 'local');
        const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
          method: req.method, headers,
          ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: req, duplex: 'half' }),
        });
        let response = await reviewerGate(request, env, async filename => new Response(await readFile(new URL(`../public/${filename}`, import.meta.url)), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
        if (!response && /^\/api\/(?:admin(?:\/|$)|(?:submissions|feedback)(?:\/|$))/.test(new URL(request.url).pathname)) response = await handleDashboardRequest(request, env);
        if (response) {
          const responseHeaders = Object.fromEntries(response.headers);
          if (response.headers.getSetCookie().length) responseHeaders['set-cookie'] = response.headers.getSetCookie();
          res.writeHead(response.status, responseHeaders);
          res.end(Buffer.from(await response.arrayBuffer()));
          return;
        }
        if (!publicAssets.has(new URL(request.url).pathname)) {
          res.setHeader('Cache-Control', 'private, no-store');
          if (/^\/(?:admin|api)(?:[/.]|$)/.test(new URL(request.url).pathname) || await comingSoonEnabled(env)) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        }
        next();
      } catch (error) { next(error); }
    });
  };
  return { name: 'reviewer-access', configureServer: configure, configurePreviewServer: configure };
}
