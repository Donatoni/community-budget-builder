import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSharedPlan, resultURL, resultDescription } from '../src/share-plan.js';
import { resultImageSVG } from '../server/result-image.js';
import { SERVICES, PROPOSED_TOTAL, fmtM } from '../src/budget.js';
import { HEADLINES, THEMES } from '../src/postcard.js';
import { nativeShare } from '../src/share.js';
import { onRequest as homepage } from '../functions/index.js';
import { escapeXML } from './support/catalog.js';

const origin = 'https://budget.example.gov/';
// A legacy budget below every department's baseline, in the one-decimal form links use.
const values = SERVICES.map(service => Math.floor(Math.min(service.max, 99.9, service.proposed * 0.8) * 10) / 10);
const b = values.map(value => value.toFixed(1)).join('_');
const themes = Object.keys(THEMES);

test('result links preserve every budget and design choice and use unique image URLs', () => {
  assert.equal(HEADLINES.length, 3, 'shared links accept headline numbers 0 to 2');
  const seen = new Set();
  const versions = new Set();
  for (const theme of themes) for (const headline of HEADLINES.keys()) for (const side of ['front', 'back']) {
    const options = { theme, headline, side };
    const url = resultURL(origin, values, options);
    const image = resultURL(origin, values, options, true);
    assert.equal(new URL(url).origin + '/', origin);
    assert.equal(new URL(url).pathname, '/share/');
    assert.equal(new URL(url).hash, '#builder');
    assert.equal(new URL(image).pathname, '/share/image.png');
    assert.equal(new URL(image).hash, '');
    assert.ok(new URL(image).searchParams.get('v'), 'image links carry a cache version');
    assert.equal(new URL(image).searchParams.get('v'), new URL(url).searchParams.get('v'));
    versions.add(new URL(image).searchParams.get('v'));
    assert.deepEqual(readSharedPlan(url), { values, ...options });
    assert.deepEqual(readSharedPlan(image), { values, ...options });
    seen.add(image);
  }
  assert.equal(seen.size, themes.length * HEADLINES.length * 2);
  assert.equal(versions.size, 1);
  assert.notEqual(resultURL(origin, values), resultURL(origin, values.map((value, i) => i ? value : value + 0.1)));
});

test('legacy links work and invalid or injected rendering inputs are rejected', () => {
  assert.deepEqual(readSharedPlan(`${origin}?b=${b}`).values, values);
  const parts = b.split('_');
  const replace = (i, part) => parts.map((value, j) => j === i ? part : value).join('_');
  const invalid = [
    '', 'b=', `b=${b}_1`, `b=${parts.slice(1).join('_')}`, `b=${replace(0, '')}`, `b=${replace(0, '100')}`,
    `b=${replace(0, '-1')}`, `b=${replace(0, '1e1')}`, `b=${replace(0, 'NaN')}`, `b=${replace(0, '1.25')}`,
    `b=${replace(0, String(Math.floor(SERVICES[0].max) + 1))}`,
    `b=${b}&theme=__proto__`, `b=${b}&h=99`, `b=${b}&h=${HEADLINES.length}`, `b=${b}&side=<script>`,
    `b=${b}&revenues=x`, `b=${b}&millage=0.5`,
  ];
  for (const query of invalid) assert.equal(readSharedPlan(`${origin}?${query}`), null, query);
});

test('legacy homepage budget links redirect crawlers to the complete personalized plan', async () => {
  const theme = themes.at(-1);
  for (const method of ['GET', 'HEAD']) {
    const response = await homepage({ request: new Request(`${origin}?b=${b}&theme=${theme}&h=2&side=back`, { method }) });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), resultURL(origin, values, { theme, headline: 2, side: 'back' }));
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, follow');
    assert.equal(await response.text(), '');
  }
});

test('ordinary and invalid homepage links keep the original static response', async () => {
  for (const suffix of ['', '?utm_source=x', '?b=invalid']) {
    const request = new Request(origin + suffix);
    const response = new Response('Main site', { headers: { ETag: 'home' } });
    const env = { ASSETS: { fetch: async input => { assert.equal(input, request); return response; } } };
    assert.equal(await homepage({ request, env }), response);
  }
});

test('preview SVG includes the real postcard, complete funding, and correct totals', () => {
  const assets = { seal: { href: 'data:image/png;base64,AA==' }, illustration: { href: 'data:image/jpeg;base64,AA==', width: 960, height: 576 } };
  const plan = { values, theme: themes.at(-1), headline: 1, side: 'front' };
  const total = values.reduce((sum, value) => sum + value, 0);
  const svg = resultImageSVG(plan, assets);
  assert.ok(svg.includes('viewBox="0 0 1080 1350"'));
  assert.ok(svg.includes('data:image/jpeg'));
  assert.ok(svg.includes(escapeXML(fmtM(total))));
  assert.ok(svg.includes(escapeXML(fmtM(PROPOSED_TOTAL - total))));
  for (const line of HEADLINES[1]) assert.ok(svg.includes(escapeXML(line)), line);
  const back = resultImageSVG({ ...plan, side: 'back' }, assets);
  assert.ok(!back.includes('data:image/jpeg'));
  for (const service of SERVICES) assert.ok(back.includes(escapeXML(service.name)), service.name);
  const description = resultDescription(plan);
  assert.ok(Math.abs(description.total - total) < 1e-9);
  assert.ok(description.description.includes(`${fmtM(PROPOSED_TOTAL - total)} gap closed`));
  assert.ok(resultDescription({ ...plan, values: SERVICES.map(service => service.proposed + 1) }).description.includes(`${fmtM(SERVICES.length)} gap increase`));
});

test('department changes show exact deductions, increases, and unchanged funding', () => {
  const plan = { values, theme: themes[0], headline: 0, side: 'back' };
  const svg = resultImageSVG(plan, {});
  for (const [i, service] of SERVICES.entries()) assert.ok(svg.includes(`${escapeXML(fmtM(service.proposed - values[i]))} deducted`), service.name);
  const mixed = resultImageSVG({ ...plan, values: SERVICES.map((s, i) => i === 0 ? s.proposed + 1 : i === 1 ? 0 : s.proposed) }, {});
  assert.ok(mixed.includes(`${fmtM(1)} added`));
  if (SERVICES.length > 1) assert.ok(mixed.includes(`${escapeXML(fmtM(SERVICES[1].proposed))} deducted`));
  if (SERVICES.length > 2) assert.ok(mixed.includes('No change'));
  assert.ok(!mixed.includes(`${fmtM(0)} deducted`));
});

test('native share receives the prebuilt postcard synchronously, with personalized URL', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = globalThis.window;
  let call;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { canShare: () => true, share: args => { call = args; return Promise.resolve(); } } });
  globalThis.window = { location: { origin } };
  try {
    const file = new File(['png'], 'postcard.png', { type: 'image/png' });
    const result = nativeShare(file, values, { theme: themes.at(-1), headline: 1, side: 'back' });
    assert.equal(call.files[0], file, 'share is invoked before yielding user activation');
    assert.equal(readSharedPlan(call.url).side, 'back');
    assert.deepEqual(readSharedPlan(call.url).values, values);
    assert.equal(await result, 'shared-image');
    navigator.canShare = () => false;
    assert.equal(await nativeShare(file, values), 'shared-link');
    navigator.share = () => Promise.reject(new DOMException('Cancelled', 'AbortError'));
    assert.equal(await nativeShare(file, values), 'cancelled');
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
    if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  }
});

test('Cloudflare routes run the reviewer gate for every path, including shared HTML and PNG', () => {
  const routes = JSON.parse(readFileSync(new URL('../public/_routes.json', import.meta.url)));
  assert.ok(routes.include.includes('/*'));
  assert.deepEqual(routes.exclude, []);
});
