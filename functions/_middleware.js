import { comingSoonEnabled } from '../server/site-settings.js';
import { reviewerGate, privateResponse, publicAssets } from '../server/reviewer-access.js';

export async function onRequest(context) {
  const { request, env } = context;
  const response = await reviewerGate(request, env, filename => env.ASSETS.fetch(new Request(new URL(`/${filename.replace(/\.html$/, '')}`, request.url))));
  if (response) return response;
  const result = await context.next();
  const path = new URL(request.url).pathname;
  if (publicAssets.has(path)) return result;
  const responseHeaders = privateResponse(result, request.method);
  if (!/^\/(?:admin|api)(?:[/.]|$)/.test(path) && !await comingSoonEnabled(env)) responseHeaders.headers.delete('X-Robots-Tag');
  return responseHeaders;
}
