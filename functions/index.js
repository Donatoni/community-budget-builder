import { readSharedPlan, resultURL } from '../src/share-plan.js';

// Older copied links stored the budget on the homepage. Redirect before serving
// HTML so crawlers, as well as browsers, receive the personalized share metadata.
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const plan = readSharedPlan(url);
  if (plan && ['GET', 'HEAD'].includes(request.method)) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: resultURL(url.origin, plan.values, plan),
        'Cache-Control': 'public, max-age=300',
        'X-Robots-Tag': 'noindex, follow',
      },
    });
  }
  return env.ASSETS.fetch(request);
}
